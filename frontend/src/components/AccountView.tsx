"use client";

import React, { useState } from "react";
import {
  UserCircle,
  Cloud,
  RefreshCw,
  LogOut,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  useAuth,
  loginWith,
  registerWith,
  logout,
  pullAndMerge,
} from "@/lib/auth";
import { usePrepState, useSyncStatus } from "@/lib/prepStore";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  FormField,
  Input,
  InlineBanner,
} from "@/components/ui";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "U";
}

export const AccountView: React.FC = () => {
  const { user } = useAuth();
  const prepState = usePrepState();
  const syncStatus = useSyncStatus();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await loginWith(trimmedEmail, password);
        setInfoMsg("Signed in and synced your preparation progress.");
      } else {
        await registerWith(name.trim(), trimmedEmail, password);
        setInfoMsg("Account created and local progress merged to cloud.");
      }
      setPassword("");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncingNow(true);
    setErrorMsg(null);
    try {
      await pullAndMerge();
      setInfoMsg("Progress synchronized with server.");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not sync right now."
      );
    } finally {
      setSyncingNow(false);
    }
  };

  const solvedCodingCount = Object.keys(prepState.codingSolved).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Account & Cloud Sync"
        description="Sign in to back up and synchronize your Company PYQ progress, answer evaluations, mock tests, and Coding Lab solutions."
        badge={
          user ? (
            <Badge variant="success">Signed in</Badge>
          ) : (
            <Badge variant="default">Local mode</Badge>
          )
        }
      />

      {infoMsg && (
        <InlineBanner variant="success" onDismiss={() => setInfoMsg(null)}>
          {infoMsg}
        </InlineBanner>
      )}
      {errorMsg && (
        <InlineBanner variant="error" onDismiss={() => setErrorMsg(null)}>
          {errorMsg}
        </InlineBanner>
      )}

      {!user ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-7 p-6 sm:p-8 space-y-6" elevated>
            <div className="flex items-center gap-2 p-1 rounded-xl bg-[#F1F4F8] w-fit">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === "login"
                    ? "bg-white text-[#17212B] shadow-xs"
                    : "text-[#526170] hover:text-[#17212B]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === "register"
                    ? "bg-white text-[#17212B] shadow-xs"
                    : "text-[#526170] hover:text-[#17212B]"
                }`}
              >
                Create account
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#17212B]">
                {mode === "login"
                  ? "Sign in to your LearnSync account"
                  : "Create a free LearnSync account"}
              </h2>
              <p className="text-xs text-[#526170] leading-relaxed">
                Sign in to sync your practiced questions, answer scores, mock tests, and coding progress across devices. Your existing local progress is merged automatically.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <FormField label="Full name" htmlFor="account-name" required>
                  <Input
                    id="account-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Candidate"
                    autoComplete="name"
                    required
                  />
                </FormField>
              )}

              <FormField label="Email address" htmlFor="account-email" required>
                <Input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="account-password"
                hint="Minimum 8 characters"
                required
              >
                <Input
                  id="account-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={8}
                  required
                />
              </FormField>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  icon={<UserCircle className="h-4 w-4" />}
                >
                  {mode === "login" ? "Sign in & sync" : "Create account & sync"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="lg:col-span-5 p-6 space-y-4 bg-[#F7F8FA]">
            <div className="flex items-center gap-2.5 text-sm font-bold text-[#17212B]">
              <ShieldCheck className="h-5 w-5 text-[#1D4ED8]" />
              <span>Local progress ready to merge</span>
            </div>
            <p className="text-xs text-[#526170] leading-relaxed">
              Everything you practice while signed out is stored in your browser and automatically merged when you sign in.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white border border-[#E2E7ED]">
                <div className="text-lg font-bold text-[#17212B]">
                  {prepState.practiced.length}
                </div>
                <div className="text-[11px] text-[#526170]">
                  Practiced PYQs
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E7ED]">
                <div className="text-lg font-bold text-[#17212B]">
                  {prepState.attempts.length}
                </div>
                <div className="text-[11px] text-[#526170]">
                  Graded answers
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E7ED]">
                <div className="text-lg font-bold text-[#17212B]">
                  {prepState.mockTests.length}
                </div>
                <div className="text-[11px] text-[#526170]">
                  Mock tests
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E7ED]">
                <div className="text-lg font-bold text-[#17212B]">
                  {solvedCodingCount}
                </div>
                <div className="text-[11px] text-[#526170]">
                  Coding solved
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6" elevated>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E7ED]">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-white font-bold text-lg flex items-center justify-center shadow-sm">
                  {getInitials(user.name)}
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-bold text-[#17212B]">
                    {user.name}
                  </h2>
                  <p className="text-xs text-[#526170]">{user.email}</p>
                  <p className="text-[11px] text-[#64748B]">
                    Member since{" "}
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  loading={syncingNow}
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                  onClick={handleManualSync}
                >
                  Sync now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<LogOut className="h-3.5 w-3.5" />}
                  onClick={() => {
                    logout();
                    setInfoMsg("Signed out. Local progress remains on this device.");
                  }}
                >
                  Sign out
                </Button>
              </div>
            </div>

            {/* Cloud Sync Status Line */}
            <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-medium text-[#1E40AF]">
                <Cloud className="h-4 w-4 text-[#1D4ED8]" />
                <span>
                  {syncStatus.status === "syncing"
                    ? "Syncing your latest progress to cloud…"
                    : syncStatus.status === "error"
                    ? "Last sync encountered an issue — click Sync now to retry."
                    : "Cloud sync active — changes back up automatically."}
                </span>
              </div>
              {syncStatus.lastSyncedAt && (
                <span className="text-[11px] font-mono-code text-[#1D4ED8] flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
                  <span>
                    Synced{" "}
                    {new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}
                  </span>
                </span>
              )}
            </div>

            {/* Synced Items Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED]">
                <div className="text-2xl font-bold text-[#1D4ED8]">
                  {prepState.practiced.length}
                </div>
                <div className="text-xs font-medium text-[#526170] mt-0.5">
                  Practiced PYQs
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED]">
                <div className="text-2xl font-bold text-[#1D4ED8]">
                  {prepState.attempts.length}
                </div>
                <div className="text-xs font-medium text-[#526170] mt-0.5">
                  Answer evaluations
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED]">
                <div className="text-2xl font-bold text-[#1D4ED8]">
                  {prepState.mockTests.length}
                </div>
                <div className="text-xs font-medium text-[#526170] mt-0.5">
                  Completed mock tests
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED]">
                <div className="text-2xl font-bold text-[#1D4ED8]">
                  {solvedCodingCount}
                </div>
                <div className="text-xs font-medium text-[#526170] mt-0.5">
                  Coding problems solved
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
