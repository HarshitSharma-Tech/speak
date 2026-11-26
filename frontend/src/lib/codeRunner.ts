"use client";

import { useSyncExternalStore } from "react";
import { CodingProblem } from "@/data/codingProblems";

export interface SingleTestResult {
  index: number;
  passed: boolean;
  input: unknown[];
  expected: unknown;
  output?: unknown;
  error?: string;
  ms: number;
}

export interface RunResult {
  results: SingleTestResult[];
  stdout: string;
  fatalError?: string;
  timedOut?: boolean;
}

export type PythonRuntimeStatus = "idle" | "loading" | "ready";

let pythonStatus: PythonRuntimeStatus = "idle";
const pyStatusListeners = new Set<() => void>();

function setPythonStatus(next: PythonRuntimeStatus) {
  pythonStatus = next;
  for (const l of pyStatusListeners) {
    l();
  }
}

export function usePythonStatus(): PythonRuntimeStatus {
  return useSyncExternalStore(
    (cb) => {
      pyStatusListeners.add(cb);
      return () => pyStatusListeners.delete(cb);
    },
    () => pythonStatus,
    () => "idle"
  );
}

function normalizeValue(val: unknown, orderInsensitive?: boolean): unknown {
  if (val === undefined) return "__undefined__";
  try {
    const cloned = JSON.parse(JSON.stringify(val));
    if (orderInsensitive && Array.isArray(cloned)) {
      return [...cloned].sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
      );
    }
    return cloned;
  } catch {
    return String(val);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function runJavaScriptTests(
  problem: CodingProblem,
  code: string
): Promise<RunResult> {
  return new Promise((resolve) => {
    const workerSource = `
      self.onmessage = function(e) {
        const { code, fnName, tests } = e.data;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => {
          logs.push(args.map(a => {
            try { return typeof a === 'string' ? a : JSON.stringify(a); }
            catch { return String(a); }
          }).join(' '));
        };

        let fn;
        try {
          const factory = new Function(code + "\\nreturn typeof " + fnName + " === 'function' ? " + fnName + " : undefined;");
          fn = factory();
        } catch (err) {
          self.postMessage({
            fatalError: err && err.message ? err.message : String(err),
            stdout: logs.join("\\n"),
            rawResults: []
          });
          return;
        }

        if (typeof fn !== "function") {
          self.postMessage({
            fatalError: "Function '" + fnName + "' was not found. Make sure its name matches.",
            stdout: logs.join("\\n"),
            rawResults: []
          });
          return;
        }

        const rawResults = [];
        for (let i = 0; i < tests.length; i++) {
          const t = tests[i];
          const clonedInput = JSON.parse(JSON.stringify(t.input));
          const t0 = performance.now();
          try {
            const out = fn(...clonedInput);
            const ms = Math.max(0, Math.round((performance.now() - t0) * 100) / 100);
            rawResults.push({ index: i, output: out, ms });
          } catch (err) {
            const ms = Math.max(0, Math.round((performance.now() - t0) * 100) / 100);
            rawResults.push({
              index: i,
              error: err && err.message ? err.message : String(err),
              ms
            });
          }
        }
        console.log = origLog;
        self.postMessage({
          stdout: logs.join("\\n"),
          rawResults
        });
      };
    `;

    const blob = new Blob([workerSource], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({
        results: [],
        stdout: "",
        timedOut: true,
        fatalError: "Execution timed out after 4000 ms (check for infinite loops).",
      });
    }, 4000);

    worker.onmessage = (e) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);

      const { fatalError, stdout, rawResults } = e.data as {
        fatalError?: string;
        stdout: string;
        rawResults: {
          index: number;
          output?: unknown;
          error?: string;
          ms: number;
        }[];
      };

      if (fatalError) {
        resolve({ results: [], stdout: stdout || "", fatalError });
        return;
      }

      const results: SingleTestResult[] = problem.tests.map((t, idx) => {
        const raw = rawResults[idx];
        if (!raw || raw.error) {
          return {
            index: idx,
            passed: false,
            input: t.input,
            expected: t.expected,
            error: raw?.error || "No output",
            ms: raw?.ms || 0,
          };
        }
        const normOut = normalizeValue(raw.output, problem.orderInsensitive);
        const normExp = normalizeValue(t.expected, problem.orderInsensitive);
        return {
          index: idx,
          passed: deepEqual(normOut, normExp),
          input: t.input,
          expected: t.expected,
          output: raw.output,
          ms: raw.ms,
        };
      });

      resolve({ results, stdout: stdout || "" });
    };

    worker.onerror = (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({
        results: [],
        stdout: "",
        fatalError: err.message || "Worker runtime error",
      });
    };

    worker.postMessage({
      code,
      fnName: problem.functionName,
      tests: problem.tests,
    });
  });
}

let pyWorker: Worker | null = null;
let pyWorkerReady = false;

function getOrCreatePyWorker(): Worker {
  if (pyWorker) return pyWorker;
  const workerSource = `
    let pyodideReadyPromise = null;
    let stdoutBuffer = [];

    async function ensurePyodide() {
      if (!pyodideReadyPromise) {
        self.postMessage({ type: "status", status: "loading" });
        importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
        pyodideReadyPromise = self.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
        }).then((py) => {
          py.setStdout({ batched: (s) => stdoutBuffer.push(s) });
          self.postMessage({ type: "status", status: "ready" });
          return py;
        });
      }
      return pyodideReadyPromise;
    }

    self.onmessage = async function(e) {
      const { code, fnName, testsJson } = e.data;
      stdoutBuffer = [];
      try {
        const py = await ensurePyodide();
        py.globals.set("__user_code", code);
        py.globals.set("__fn_name", fnName);
        py.globals.set("__tests_json", testsJson);

        const harness = \`
import json, copy, time

__res_payload = {"fatalError": None, "rawResults": []}
__ns = {}
try:
    exec(__user_code, __ns)
except Exception as e:
    __res_payload["fatalError"] = f"{type(e).__name__}: {e}"

if not __res_payload["fatalError"]:
    __fn = __ns.get(__fn_name)
    if not callable(__fn):
        __res_payload["fatalError"] = f"Function '{__fn_name}' was not found."
    else:
        __tests = json.loads(__tests_json)
        for __idx, __t in enumerate(__tests):
            __inp = copy.deepcopy(__t["input"])
            __t0 = time.perf_counter()
            try:
                __out = __fn(*__inp)
                __ms = round((time.perf_counter() - __t0) * 1000, 2)
                __res_payload["rawResults"].append({"index": __idx, "output": __out, "ms": __ms})
            except Exception as e:
                __ms = round((time.perf_counter() - __t0) * 1000, 2)
                __res_payload["rawResults"].append({"index": __idx, "error": f"{type(e).__name__}: {e}", "ms": __ms})

json.dumps(__res_payload)
\`;
        const jsonOut = await py.runPythonAsync(harness);
        const parsed = JSON.parse(jsonOut);
        self.postMessage({
          type: "result",
          stdout: stdoutBuffer.join("\\n"),
          fatalError: parsed.fatalError || undefined,
          rawResults: parsed.rawResults || []
        });
      } catch (err) {
        self.postMessage({
          type: "result",
          stdout: stdoutBuffer.join("\\n"),
          fatalError: err && err.message ? err.message : String(err),
          rawResults: []
        });
      }
    };
  `;

  const blob = new Blob([workerSource], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  pyWorker = new Worker(url);
  return pyWorker;
}

function runPythonTests(
  problem: CodingProblem,
  code: string
): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = getOrCreatePyWorker();
    const timeoutMs = pyWorkerReady ? 5000 : 12000;
    if (!pyWorkerReady) {
      setPythonStatus("loading");
    }

    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      worker.terminate();
      pyWorker = null;
      pyWorkerReady = false;
      setPythonStatus("idle");
      resolve({
        results: [],
        stdout: "",
        timedOut: true,
        fatalError: `Python execution timed out after ${timeoutMs / 1000}s.`,
      });
    }, timeoutMs);

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "status") {
        if (msg.status === "loading") setPythonStatus("loading");
        if (msg.status === "ready") {
          pyWorkerReady = true;
          setPythonStatus("ready");
        }
        return;
      }

      if (finished) return;
      finished = true;
      clearTimeout(timer);
      pyWorkerReady = true;
      setPythonStatus("ready");

      const { fatalError, stdout, rawResults } = msg as {
        fatalError?: string;
        stdout: string;
        rawResults: {
          index: number;
          output?: unknown;
          error?: string;
          ms: number;
        }[];
      };

      if (fatalError) {
        resolve({ results: [], stdout: stdout || "", fatalError });
        return;
      }

      const results: SingleTestResult[] = problem.tests.map((t, idx) => {
        const raw = rawResults[idx];
        if (!raw || raw.error) {
          return {
            index: idx,
            passed: false,
            input: t.input,
            expected: t.expected,
            error: raw?.error || "No output",
            ms: raw?.ms || 0,
          };
        }
        const normOut = normalizeValue(raw.output, problem.orderInsensitive);
        const normExp = normalizeValue(t.expected, problem.orderInsensitive);
        return {
          index: idx,
          passed: deepEqual(normOut, normExp),
          input: t.input,
          expected: t.expected,
          output: raw.output,
          ms: raw.ms,
        };
      });

      resolve({ results, stdout: stdout || "" });
    };

    worker.onerror = (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      pyWorker = null;
      pyWorkerReady = false;
      setPythonStatus("idle");
      resolve({
        results: [],
        stdout: "",
        fatalError:
          err.message ||
          "Failed to load Python runtime from CDN. Check internet connection.",
      });
    };

    worker.postMessage({
      code,
      fnName: problem.functionName,
      testsJson: JSON.stringify(problem.tests),
    });
  });
}

export function runTests(
  problem: CodingProblem,
  language: "javascript" | "python",
  code: string
): Promise<RunResult> {
  if (language === "python") {
    return runPythonTests(problem, code);
  }
  return runJavaScriptTests(problem, code);
}
