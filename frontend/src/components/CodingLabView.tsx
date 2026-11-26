"use client";

import React, { useState, useMemo, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Search,
  Terminal,
  Loader2,
} from "lucide-react";
import {
  CODING_PROBLEMS,
  CodingProblem,
  getProblem,
} from "@/data/codingProblems";
import { COMPANIES } from "@/data/companyQuestions";
import { runTests, RunResult, usePythonStatus } from "@/lib/codeRunner";
import { usePrepState, markCodingSolved } from "@/lib/prepStore";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  InlineBanner,
} from "@/components/ui";

function subscribeNoop() {
  return () => {};
}

interface FallbackTextareaProps {
  value: string;
  onChange: (next: string) => void;
}

const FallbackCodeTextarea: React.FC<FallbackTextareaProps> = ({
  value,
  onChange,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = `${value.slice(0, start)}    ${value.slice(end)}`;
      onChange(updated);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      aria-label="Code editor"
      className="w-full h-[360px] p-4 font-mono-code text-sm bg-white text-[#17212B] focus:outline-none resize-none leading-relaxed"
    />
  );
};

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] w-full bg-[#F7F8FA] flex items-center justify-center text-xs font-mono-code text-[#526170] gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" />
      <span>Loading code editor…</span>
    </div>
  ),
});

function getStorageKey(slug: string, lang: "javascript" | "python"): string {
  return `learnsync.code.${slug}.${lang}`;
}

function loadInitialCode(
  problem: CodingProblem,
  lang: "javascript" | "python"
): string {
  if (typeof window === "undefined") {
    return problem.starter[lang];
  }
  try {
    const saved = window.localStorage.getItem(getStorageKey(problem.slug, lang));
    return saved !== null ? saved : problem.starter[lang];
  } catch {
    return problem.starter[lang];
  }
}

function getDifficultyVariant(
  difficulty: CodingProblem["difficulty"]
): "success" | "amber" | "error" {
  if (difficulty === "Easy") return "success";
  if (difficulty === "Medium") return "amber";
  return "error";
}

interface WorkspaceRunnerProps {
  problem: CodingProblem;
  language: "javascript" | "python";
  onLanguageChange: (lang: "javascript" | "python") => void;
}

const ProblemEditorRunner: React.FC<WorkspaceRunnerProps> = ({
  problem,
  language,
  onLanguageChange,
}) => {
  const [code, setCode] = useState<string>(() =>
    loadInitialCode(problem, language)
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [allPassedBanner, setAllPassedBanner] = useState(false);
  const [useFallbackEditor, setUseFallbackEditor] = useState(false);

  const pythonStatus = usePythonStatus();

  const handleCodeChange = (nextVal: string) => {
    setCode(nextVal);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          getStorageKey(problem.slug, language),
          nextVal
        );
      } catch {
        // Ignore quota error
      }
    }
  };

  const handleReset = () => {
    const starter = problem.starter[language];
    setCode(starter);
    setResult(null);
    setAllPassedBanner(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(getStorageKey(problem.slug, language));
      } catch {
        // Ignore
      }
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setAllPassedBanner(false);
    try {
      const res = await runTests(problem, language, code);
      setResult(res);
      if (
        !res.fatalError &&
        res.results.length > 0 &&
        res.results.every((r) => r.passed)
      ) {
        markCodingSolved(problem.slug, language);
        setAllPassedBanner(true);
      }
    } finally {
      setRunning(false);
    }
  };

  const passedCount = result
    ? result.results.filter((r) => r.passed).length
    : 0;
  const totalCount = problem.tests.length;

  return (
    <div className="space-y-5">
      {/* Editor Header Bar */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 bg-[#F7F8FA] border-b border-[#E2E7ED] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select
                value={language}
                onChange={(e) =>
                  onLanguageChange(e.target.value as "javascript" | "python")
                }
                aria-label="Select programming language"
              >
                <option value="javascript">JavaScript (Worker)</option>
                <option value="python">Python (Pyodide)</option>
              </Select>
            </div>
            <span className="text-xs font-mono-code text-[#526170] hidden sm:inline">
              fn: <strong className="text-[#17212B]">{problem.functionName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseFallbackEditor((v) => !v)}
              className="text-xs text-[#526170] hover:text-[#17212B] px-2 py-1 rounded cursor-pointer"
            >
              {useFallbackEditor ? "Use Monaco" : "Simple editor"}
            </button>
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleReset}
            >
              Reset code
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={running}
              icon={<Play className="h-3.5 w-3.5" />}
              onClick={handleRun}
            >
              Run tests
            </Button>
          </div>
        </div>

        {/* Python first-load notice */}
        {language === "python" && running && pythonStatus === "loading" && (
          <div className="px-4 py-2.5 bg-[#EFF6FF] border-b border-[#BFDBFE] text-xs text-[#1E40AF] flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1D4ED8]" />
            <span>
              Loading Python runtime (first run takes a few seconds)…
            </span>
          </div>
        )}

        {/* Code Editor Body */}
        <div className="h-[360px] w-full bg-white">
          {useFallbackEditor ? (
            <FallbackCodeTextarea value={code} onChange={handleCodeChange} />
          ) : (
            <MonacoEditor
              height="360px"
              language={language}
              theme="vs"
              value={code}
              onChange={(val) => handleCodeChange(val ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
              }}
            />
          )}
        </div>
      </Card>

      {allPassedBanner && (
        <InlineBanner
          variant="success"
          title="All test cases passed!"
          onDismiss={() => setAllPassedBanner(false)}
        >
          Problem marked as solved in your placement readiness profile.
        </InlineBanner>
      )}

      {/* Test Execution Results */}
      {result && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E7ED]">
            <div className="flex items-center gap-2.5">
              {!result.fatalError && passedCount === totalCount ? (
                <CheckCircle2 className="h-5 w-5 text-[#15803D]" />
              ) : (
                <XCircle className="h-5 w-5 text-[#B91C1C]" />
              )}
              <h3 className="text-sm font-bold text-[#17212B]">
                {result.fatalError
                  ? result.timedOut
                    ? "Execution timed out"
                    : "Runtime or syntax error"
                  : `${passedCount}/${totalCount} tests passed`}
              </h3>
            </div>
            {!result.fatalError && (
              <Badge
                variant={passedCount === totalCount ? "success" : "error"}
              >
                {passedCount === totalCount ? "Accepted" : "Wrong Answer"}
              </Badge>
            )}
          </div>

          {result.fatalError && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] font-mono-code text-xs text-[#B91C1C] whitespace-pre-wrap">
              {result.fatalError}
            </div>
          )}

          {result.results.length > 0 && (
            <div className="space-y-2.5">
              {result.results.map((r) => (
                <div
                  key={r.index}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    r.passed
                      ? "bg-[#F0FDF4]/60 border-[#BBF7D0]"
                      : "bg-[#FEF2F2]/60 border-[#FECACA]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17212B] flex items-center gap-1.5">
                      {r.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#B91C1C]" />
                      )}
                      <span>Test #{r.index + 1}</span>
                    </span>
                    <span className="font-mono-code text-[11px] text-[#526170]">
                      {r.ms} ms
                    </span>
                  </div>

                  <div className="font-mono-code text-[11px] text-[#526170] space-y-0.5 break-all">
                    <div>
                      <strong className="text-[#17212B]">Input:</strong>{" "}
                      {JSON.stringify(r.input)}
                    </div>
                    <div>
                      <strong className="text-[#17212B]">Expected:</strong>{" "}
                      {JSON.stringify(r.expected)}
                    </div>
                    {r.error ? (
                      <div className="text-[#B91C1C]">
                        <strong>Error:</strong> {r.error}
                      </div>
                    ) : (
                      <div>
                        <strong className="text-[#17212B]">Output:</strong>{" "}
                        {JSON.stringify(r.output)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.stdout.trim() && (
            <div className="space-y-1.5 pt-2 border-t border-[#E2E7ED]">
              <div className="text-xs font-bold text-[#526170] flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" />
                <span>Standard output (console.log / print)</span>
              </div>
              <pre className="p-3 rounded-lg bg-[#0B1220] text-slate-200 font-mono-code text-xs overflow-x-auto max-h-40">
                {result.stdout}
              </pre>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export const CodingLabView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const problemParam = searchParams.get("problem");

  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const prepState = usePrepState();

  const activeProblem: CodingProblem = useMemo(() => {
    return (problemParam && getProblem(problemParam)) || CODING_PROBLEMS[0];
  }, [problemParam]);

  const [language, setLanguage] = useState<"javascript" | "python">(
    "javascript"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<
    CodingProblem["difficulty"] | "All"
  >("All");
  const [companyFilter, setCompanyFilter] = useState<string>("All");

  const filteredProblems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CODING_PROBLEMS.filter((p) => {
      if (difficultyFilter !== "All" && p.difficulty !== difficultyFilter) {
        return false;
      }
      if (companyFilter !== "All" && !p.companies.includes(companyFilter)) {
        return false;
      }
      if (q && !p.title.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [searchQuery, difficultyFilter, companyFilter]);

  const companyNameMap = useMemo(
    () => new Map(COMPANIES.map((c) => [c.slug, c])),
    []
  );

  const solvedCount = hydrated ? Object.keys(prepState.codingSolved).length : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Coding Lab"
        description="Solve high-frequency company DSA problems directly in your browser with automated test cases in JavaScript or Python."
        badge={
          <Badge variant="brand">
            {solvedCount}/{CODING_PROBLEMS.length} solved
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Problem Directory */}
        <Card className="lg:col-span-4 p-4 space-y-4">
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problems..."
                aria-label="Search coding problems"
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={difficultyFilter}
                onChange={(e) =>
                  setDifficultyFilter(
                    e.target.value as CodingProblem["difficulty"] | "All"
                  )
                }
                aria-label="Filter problems by difficulty"
              >
                <option value="All">All difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </Select>

              <Select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                aria-label="Filter problems by company"
              >
                <option value="All">All companies</option>
                {COMPANIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name.split(" ")[0]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="divide-y divide-[#E2E7ED] max-h-[540px] overflow-y-auto -mx-2 px-2">
            {filteredProblems.map((prob) => {
              const isSelected = prob.slug === activeProblem.slug;
              const isSolved =
                hydrated && Boolean(prepState.codingSolved[prob.slug]);
              return (
                <button
                  key={prob.slug}
                  type="button"
                  onClick={() =>
                    router.replace(
                      `/app/coding?problem=${encodeURIComponent(prob.slug)}`,
                      { scroll: false }
                    )
                  }
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-[#EFF6FF] text-[#1D4ED8]"
                      : "hover:bg-[#F7F8FA] text-[#17212B]"
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                      {isSolved ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D] shrink-0" />
                      ) : (
                        <Code2 className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                      )}
                      <span className="truncate">{prob.title}</span>
                    </div>
                    <div className="text-[11px] text-[#526170] truncate">
                      {prob.companies
                        .slice(0, 3)
                        .map(
                          (s) =>
                            companyNameMap.get(s)?.name.split(" ")[0] || s
                        )
                        .join(", ")}
                    </div>
                  </div>
                  <Badge variant={getDifficultyVariant(prob.difficulty)}>
                    {prob.difficulty}
                  </Badge>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right Active Problem Statement & Editor */}
        <div className="lg:col-span-8 space-y-5">
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-[#17212B]">
                  {activeProblem.title}
                </h2>
                <Badge variant={getDifficultyVariant(activeProblem.difficulty)}>
                  {activeProblem.difficulty}
                </Badge>
                {hydrated && prepState.codingSolved[activeProblem.slug] && (
                  <Badge variant="success">Solved</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {activeProblem.companies.map((cSlug) => {
                  const comp = companyNameMap.get(cSlug);
                  return (
                    <span
                      key={cSlug}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F7F8FA] border border-[#E2E7ED] text-xs font-medium text-[#17212B]"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: comp?.color || "#1D4ED8" }}
                      />
                      <span>{comp?.name.split(" ")[0] || cSlug}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-[#17212B] leading-relaxed">
              {activeProblem.description}
            </p>

            {/* Sample Examples */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {activeProblem.tests.slice(0, 2).map((t, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] font-mono-code text-xs space-y-1"
                >
                  <div className="text-[11px] font-bold text-[#526170] uppercase">
                    Example {i + 1}
                  </div>
                  <div className="text-[#17212B] break-all">
                    <span className="text-[#526170]">Input:</span>{" "}
                    {JSON.stringify(t.input)}
                  </div>
                  <div className="text-[#1D4ED8] break-all">
                    <span className="text-[#526170]">Output:</span>{" "}
                    {JSON.stringify(t.expected)}
                  </div>
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div className="space-y-1 pt-1">
              <div className="text-xs font-bold text-[#526170] uppercase tracking-wider">
                Constraints
              </div>
              <ul className="list-disc pl-5 text-xs font-mono-code text-[#526170] space-y-0.5">
                {activeProblem.constraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </Card>

          <ProblemEditorRunner
            key={`${activeProblem.slug}-${language}`}
            problem={activeProblem}
            language={language}
            onLanguageChange={setLanguage}
          />
        </div>
      </div>
    </div>
  );
};
