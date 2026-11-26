"use client";

import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";

export interface AnswerAttempt {
  id: string;
  questionId: string;
  companySlug: string;
  category: string;
  score: number;
  verdict: string;
  gradedBy: "ai" | "heuristic";
  createdAt: string;
  source: "practice" | "mock";
}

export interface MockTestResult {
  id: string;
  companySlug: string;
  startedAt: string;
  durationSec: number;
  usedSec: number;
  percent: number;
  items: {
    questionId: string;
    category: string;
    score: number;
    answered: boolean;
  }[];
}

export interface CodingSolve {
  slug: string;
  language: "javascript" | "python";
  solvedAt: string;
}

export interface PrepState {
  version: 1;
  practiced: string[];
  attempts: AnswerAttempt[];
  mockTests: MockTestResult[];
  codingSolved: Record<string, CodingSolve>;
  notes?: Record<string, string>;
  updatedAt: string;
}

export interface SyncStatusState {
  status: "idle" | "syncing" | "synced" | "error";
  lastSyncedAt: string | null;
}

const STORAGE_KEY = "learnsync.prep.v1";
const LEGACY_PRACTICED_KEY = "learnsync.companyPrep.practiced";
const AUTH_TOKEN_KEY = "learnsync.auth.token";

export const EMPTY_PREP_STATE: PrepState = {
  version: 1,
  practiced: [],
  attempts: [],
  mockTests: [],
  codingSolved: {},
  notes: {},
  updatedAt: "1970-01-01T00:00:00.000Z",
};

const SERVER_SYNC_STATUS: SyncStatusState = {
  status: "idle",
  lastSyncedAt: null,
};

const prepListeners = new Set<() => void>();
const syncListeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedState: PrepState = EMPTY_PREP_STATE;
let migratedLegacy = false;

let syncStatusState: SyncStatusState = SERVER_SYNC_STATUS;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let storageListenerAttached = false;

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeState(rawObj: unknown): PrepState {
  if (!rawObj || typeof rawObj !== "object") {
    return EMPTY_PREP_STATE;
  }
  const obj = rawObj as Partial<PrepState>;
  const practiced = Array.isArray(obj.practiced)
    ? Array.from(
        new Set(obj.practiced.filter((x): x is string => typeof x === "string"))
      )
    : [];

  const attempts = Array.isArray(obj.attempts)
    ? obj.attempts
        .filter(
          (a): a is AnswerAttempt =>
            Boolean(a && typeof a === "object" && typeof a.id === "string" && typeof a.questionId === "string")
        )
        .slice(0, 500)
    : [];

  const mockTests = Array.isArray(obj.mockTests)
    ? obj.mockTests
        .filter(
          (m): m is MockTestResult =>
            Boolean(m && typeof m === "object" && typeof m.id === "string" && typeof m.companySlug === "string")
        )
        .slice(0, 50)
    : [];

  const codingSolved: Record<string, CodingSolve> = {};
  if (obj.codingSolved && typeof obj.codingSolved === "object") {
    for (const [k, v] of Object.entries(obj.codingSolved)) {
      if (
        v &&
        typeof v === "object" &&
        typeof v.slug === "string" &&
        (v.language === "javascript" || v.language === "python") &&
        typeof v.solvedAt === "string"
      ) {
        codingSolved[k] = v;
      }
    }
  }

  const notes: Record<string, string> = {};
  if (obj.notes && typeof obj.notes === "object") {
    for (const [k, v] of Object.entries(obj.notes)) {
      if (typeof v === "string" && v.trim()) {
        notes[k] = v;
      }
    }
  }

  return {
    version: 1,
    practiced,
    attempts,
    mockTests,
    codingSolved,
    notes,
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

function ensureStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") return;
  storageListenerAttached = true;
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      notifyPrepListeners();
    }
  });
}

function notifyPrepListeners() {
  for (const listener of prepListeners) {
    listener();
  }
}

function notifySyncListeners() {
  for (const listener of syncListeners) {
    listener();
  }
}

export function setSyncStatus(next: SyncStatusState) {
  syncStatusState = next;
  notifySyncListeners();
}

export function getPrepSnapshot(): PrepState {
  if (typeof window === "undefined") {
    return EMPTY_PREP_STATE;
  }
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw && !migratedLegacy) {
      migratedLegacy = true;
      const legacyRaw = window.localStorage.getItem(LEGACY_PRACTICED_KEY);
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy)) {
          const initial: PrepState = {
            ...EMPTY_PREP_STATE,
            practiced: Array.from(
              new Set(
                parsedLegacy.filter((x): x is string => typeof x === "string")
              )
            ),
            updatedAt: new Date().toISOString(),
          };
          raw = JSON.stringify(initial);
          window.localStorage.setItem(STORAGE_KEY, raw);
        }
      }
    } else {
      migratedLegacy = true;
    }

    if (raw === cachedRaw) {
      return cachedState;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedState = EMPTY_PREP_STATE;
      return cachedState;
    }
    cachedState = sanitizeState(JSON.parse(raw));
    return cachedState;
  } catch {
    return cachedState;
  }
}

function getPrepServerSnapshot(): PrepState {
  return EMPTY_PREP_STATE;
}

function subscribePrep(callback: () => void) {
  ensureStorageListener();
  prepListeners.add(callback);
  return () => {
    prepListeners.delete(callback);
  };
}

export function usePrepState(): PrepState {
  return useSyncExternalStore(
    subscribePrep,
    getPrepSnapshot,
    getPrepServerSnapshot
  );
}

function subscribeSync(callback: () => void) {
  syncListeners.add(callback);
  return () => {
    syncListeners.delete(callback);
  };
}

function getSyncSnapshot(): SyncStatusState {
  return syncStatusState;
}

function getSyncServerSnapshot(): SyncStatusState {
  return SERVER_SYNC_STATUS;
}

export function useSyncStatus(): SyncStatusState {
  return useSyncExternalStore(
    subscribeSync,
    getSyncSnapshot,
    getSyncServerSnapshot
  );
}

function writePrepState(next: PrepState, shouldSync = true) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(next);
    cachedRaw = raw;
    cachedState = next;
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Ignore quota errors
  }
  notifyPrepListeners();
  if (shouldSync) {
    scheduleCloudSync();
  }
}

export function scheduleCloudSync() {
  if (typeof window === "undefined") return;
  let token: string | null = null;
  try {
    token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    token = null;
  }
  if (!token) return;

  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  setSyncStatus({
    status: "syncing",
    lastSyncedAt: syncStatusState.lastSyncedAt,
  });

  const activeToken = token;
  syncTimer = setTimeout(() => {
    const state = getPrepSnapshot();
    api
      .putProgress(activeToken, state)
      .then((res) => {
        setSyncStatus({
          status: "synced",
          lastSyncedAt: res.updated_at || new Date().toISOString(),
        });
      })
      .catch(() => {
        setSyncStatus({
          status: "error",
          lastSyncedAt: syncStatusState.lastSyncedAt,
        });
      });
  }, 1200);
}

export function togglePracticed(questionId: string) {
  const curr = getPrepSnapshot();
  const exists = curr.practiced.includes(questionId);
  const practiced = exists
    ? curr.practiced.filter((id) => id !== questionId)
    : [...curr.practiced, questionId];
  writePrepState({
    ...curr,
    practiced,
    updatedAt: new Date().toISOString(),
  });
}

export function setPracticed(questionId: string, practicedValue = true) {
  const curr = getPrepSnapshot();
  const exists = curr.practiced.includes(questionId);
  if (practicedValue && exists) return;
  if (!practicedValue && !exists) return;
  const practiced = practicedValue
    ? [...curr.practiced, questionId]
    : curr.practiced.filter((id) => id !== questionId);
  writePrepState({
    ...curr,
    practiced,
    updatedAt: new Date().toISOString(),
  });
}

export function addAttempt(attempt: AnswerAttempt) {
  const curr = getPrepSnapshot();
  const attempts = [attempt, ...curr.attempts.filter((a) => a.id !== attempt.id)].slice(
    0,
    500
  );
  writePrepState({
    ...curr,
    attempts,
    updatedAt: new Date().toISOString(),
  });
}

export function addMockTest(result: MockTestResult) {
  const curr = getPrepSnapshot();
  const mockTests = [
    result,
    ...curr.mockTests.filter((m) => m.id !== result.id),
  ].slice(0, 50);
  writePrepState({
    ...curr,
    mockTests,
    updatedAt: new Date().toISOString(),
  });
}

export function markCodingSolved(
  slug: string,
  language: "javascript" | "python"
) {
  const curr = getPrepSnapshot();
  const existing = curr.codingSolved[slug];
  const solvedAt = existing?.solvedAt || new Date().toISOString();
  writePrepState({
    ...curr,
    codingSolved: {
      ...curr.codingSolved,
      [slug]: { slug, language, solvedAt },
    },
    updatedAt: new Date().toISOString(),
  });
}

export function setQuestionNote(questionId: string, noteText: string) {
  const curr = getPrepSnapshot();
  const nextNotes = { ...(curr.notes || {}) };
  if (noteText.trim()) {
    nextNotes[questionId] = noteText.trim();
  } else {
    delete nextNotes[questionId];
  }
  writePrepState({
    ...curr,
    notes: nextNotes,
    updatedAt: new Date().toISOString(),
  });
}

export function replaceState(next: PrepState, shouldSync = false) {
  writePrepState(sanitizeState(next), shouldSync);
}

export function mergeStates(
  a: PrepState,
  b: Partial<PrepState> | Record<string, unknown> | null | undefined
): PrepState {
  const cleanA = sanitizeState(a);
  const cleanB = sanitizeState(b);

  const practiced = Array.from(
    new Set([...cleanA.practiced, ...cleanB.practiced])
  );

  const attemptsMap = new Map<string, AnswerAttempt>();
  for (const item of [...cleanA.attempts, ...cleanB.attempts]) {
    attemptsMap.set(item.id, item);
  }
  const attempts = Array.from(attemptsMap.values())
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    .slice(0, 500);

  const mockMap = new Map<string, MockTestResult>();
  for (const item of [...cleanA.mockTests, ...cleanB.mockTests]) {
    mockMap.set(item.id, item);
  }
  const mockTests = Array.from(mockMap.values())
    .sort((x, y) => y.startedAt.localeCompare(x.startedAt))
    .slice(0, 50);

  const codingSolved: Record<string, CodingSolve> = { ...cleanB.codingSolved };
  for (const [slug, solveA] of Object.entries(cleanA.codingSolved)) {
    const solveB = codingSolved[slug];
    if (!solveB || solveA.solvedAt <= solveB.solvedAt) {
      codingSolved[slug] = solveA;
    }
  }

  const notes: Record<string, string> = {
    ...(cleanB.notes || {}),
    ...(cleanA.notes || {}),
  };

  return {
    version: 1,
    practiced,
    attempts,
    mockTests,
    codingSolved,
    notes,
    updatedAt: new Date().toISOString(),
  };
}

export function latestAttemptByQuestion(
  state: PrepState
): Map<string, AnswerAttempt> {
  const map = new Map<string, AnswerAttempt>();
  for (const attempt of state.attempts) {
    const existing = map.get(attempt.questionId);
    if (!existing || attempt.createdAt > existing.createdAt) {
      map.set(attempt.questionId, attempt);
    }
  }
  return map;
}
