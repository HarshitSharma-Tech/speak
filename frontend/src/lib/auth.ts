"use client";

import { useSyncExternalStore } from "react";
import { api, AuthUser } from "@/lib/api";
import {
  getPrepSnapshot,
  mergeStates,
  replaceState,
  setSyncStatus,
} from "@/lib/prepStore";

const TOKEN_KEY = "learnsync.auth.token";
const USER_KEY = "learnsync.auth.user";

export interface AuthSnapshot {
  user: AuthUser | null;
  token: string | null;
}

const SERVER_AUTH_SNAPSHOT: AuthSnapshot = {
  user: null,
  token: null,
};

const authListeners = new Set<() => void>();
let cachedTokenRaw: string | null = null;
let cachedUserRaw: string | null = null;
let cachedSnapshot: AuthSnapshot = SERVER_AUTH_SNAPSHOT;
let storageListenerAttached = false;
let sessionVerifiedOnce = false;

function notifyAuthListeners() {
  for (const listener of authListeners) {
    listener();
  }
}

function ensureAuthStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") return;
  storageListenerAttached = true;
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY || e.key === USER_KEY || e.key === null) {
      notifyAuthListeners();
    }
  });
}

export function getAuthSnapshot(): AuthSnapshot {
  if (typeof window === "undefined") {
    return SERVER_AUTH_SNAPSHOT;
  }
  try {
    const tokenRaw = window.localStorage.getItem(TOKEN_KEY);
    const userRaw = window.localStorage.getItem(USER_KEY);
    if (tokenRaw === cachedTokenRaw && userRaw === cachedUserRaw) {
      return cachedSnapshot;
    }
    cachedTokenRaw = tokenRaw;
    cachedUserRaw = userRaw;
    if (!tokenRaw || !userRaw) {
      cachedSnapshot = SERVER_AUTH_SNAPSHOT;
      return cachedSnapshot;
    }
    const parsedUser = JSON.parse(userRaw) as AuthUser;
    if (!parsedUser || typeof parsedUser.id !== "string") {
      cachedSnapshot = SERVER_AUTH_SNAPSHOT;
      return cachedSnapshot;
    }
    cachedSnapshot = {
      token: tokenRaw,
      user: parsedUser,
    };
    return cachedSnapshot;
  } catch {
    cachedSnapshot = SERVER_AUTH_SNAPSHOT;
    return cachedSnapshot;
  }
}

function getAuthServerSnapshot(): AuthSnapshot {
  return SERVER_AUTH_SNAPSHOT;
}

function subscribeAuth(callback: () => void) {
  ensureAuthStorageListener();
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
}

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot
  );
}

export function getAuthToken(): string | null {
  return getAuthSnapshot().token;
}

function storeAuth(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  const userJson = JSON.stringify(user);
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, userJson);
  cachedTokenRaw = token;
  cachedUserRaw = userJson;
  cachedSnapshot = { token, user };
  notifyAuthListeners();
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  cachedTokenRaw = null;
  cachedUserRaw = null;
  cachedSnapshot = SERVER_AUTH_SNAPSHOT;
  setSyncStatus({ status: "idle", lastSyncedAt: null });
  notifyAuthListeners();
}

export async function pullAndMerge(tokenOverride?: string): Promise<void> {
  const token = tokenOverride || getAuthToken();
  if (!token) return;

  setSyncStatus({ status: "syncing", lastSyncedAt: null });
  try {
    const server = await api.getProgress(token);
    const local = getPrepSnapshot();
    const merged = mergeStates(local, server.data);
    replaceState(merged, false);
    const saved = await api.putProgress(token, merged);
    setSyncStatus({
      status: "synced",
      lastSyncedAt: saved.updated_at || new Date().toISOString(),
    });
  } catch {
    setSyncStatus({ status: "error", lastSyncedAt: null });
  }
}

export async function loginWith(
  email: string,
  password: string
): Promise<AuthUser> {
  const res = await api.login(email, password);
  storeAuth(res.access_token, res.user);
  await pullAndMerge(res.access_token);
  return res.user;
}

export async function registerWith(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const res = await api.register(email, name, password);
  storeAuth(res.access_token, res.user);
  await pullAndMerge(res.access_token);
  return res.user;
}

export function verifySessionOnce() {
  if (sessionVerifiedOnce || typeof window === "undefined") return;
  const { token } = getAuthSnapshot();
  if (!token) return;
  sessionVerifiedOnce = true;

  api
    .me(token)
    .then((freshUser) => {
      storeAuth(token, freshUser);
    })
    .catch((err: unknown) => {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        logout();
      }
    });
}
