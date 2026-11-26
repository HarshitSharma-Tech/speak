"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  RefreshCw,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Cpu,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  InlineBanner,
  FormField,
  Input,
  ErrorState,
} from "@/components/ui";

interface HealthResponse {
  status: "healthy" | "disconnected";
  service?: string;
  version?: string;
  nvidia_configured?: boolean;
  nvidia_model?: string;
  groq_configured?: boolean;
  groq_model?: string;
  gemini_configured?: boolean;
  gemini_model?: string;
  error?: string;
}

export const SettingsView: React.FC = () => {
  const { refreshAll, notify } = useWorkspace();

  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pingTime, setPingTime] = useState<number | null>(null);

  // Expandable Advanced Settings
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Runtime Provider Key Update Form State
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [savingKeys, setSavingKeys] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const runHealthCheck = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const data = await api.checkHealth();
      setHealthData(data);
      setPingTime(Math.round(performance.now() - start));
    } catch {
      setHealthData({
        status: "disconnected",
        error:
          "Could not reach the backend API server. Verify that the FastAPI server is running on port 8000.",
      });
      setPingTime(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    api
      .checkHealth()
      .then((data) => {
        if (cancelled) return;
        setHealthData(data);
        setPingTime(Math.round(performance.now() - start));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setHealthData({
          status: "disconnected",
          error:
            "Could not reach the backend API server. Verify that the FastAPI server is running on port 8000.",
        });
        setPingTime(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groqKey.trim() && !geminiKey.trim() && !nvidiaKey.trim()) return;

    setSavingKeys(true);
    setSaveStatus(null);
    try {
      const payload: {
        groq_api_key?: string;
        gemini_api_key?: string;
        nvidia_api_key?: string;
      } = {};
      if (groqKey.trim()) payload.groq_api_key = groqKey.trim();
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
      if (nvidiaKey.trim()) payload.nvidia_api_key = nvidiaKey.trim();

      const updated = await api.updateApiKeys(payload);
      setHealthData(updated);
      setGroqKey("");
      setGeminiKey("");
      setNvidiaKey("");
      setSaveStatus({
        type: "success",
        message: "Provider API keys updated for the current backend session.",
      });
      notify("success", "Provider configuration updated.");
      await refreshAll();
    } catch (err: unknown) {
      setSaveStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not update provider keys. Check that the backend server is reachable.",
      });
    } finally {
      setSavingKeys(false);
    }
  };

  const isHealthy = healthData?.status === "healthy";
  const isDisconnected = healthData?.status === "disconnected";

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Check backend service connectivity and configure optional AI provider settings."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthCheck}
            loading={loading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh status
          </Button>
        }
      />

      {/* Primary Section: Service Connection Status */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-[#17212B]">
                Backend API service
              </h2>
              <p className="text-xs text-[#526170]">
                Handles PDF text extraction, local database storage, courses, exam schedules, and mock interviews.
              </p>
            </div>
          </div>

          <Badge
            variant={
              loading
                ? "default"
                : isHealthy
                ? "success"
                : "error"
            }
          >
            {loading
              ? "Checking connection..."
              : isHealthy
              ? "Connected"
              : "Unavailable"}
          </Badge>
        </div>

        {isDisconnected && healthData?.error ? (
          <ErrorState
            title="Backend service is unreachable"
            message={healthData.error}
            onRetry={runHealthCheck}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-1">
              <span className="text-xs text-[#526170] block">
                Connection status
              </span>
              <span className="text-sm font-bold text-[#17212B]">
                {loading
                  ? "Checking..."
                  : isHealthy
                  ? "Online (HTTP 200)"
                  : "Offline"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-1">
              <span className="text-xs text-[#526170] block">
                Response time
              </span>
              <span className="text-sm font-mono-code font-bold text-[#17212B]">
                {pingTime !== null
                  ? `${pingTime} ms`
                  : isDisconnected
                  ? "Unavailable"
                  : "Measuring..."}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-1">
              <span className="text-xs text-[#526170] block">
                Service version
              </span>
              <span className="text-sm font-mono-code font-bold text-[#17212B]">
                {healthData?.version
                  ? `v${healthData.version}`
                  : isDisconnected
                  ? "Unavailable"
                  : "v1.0.0"}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Expandable Advanced Settings Section */}
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvancedOpen((prev) => !prev)}
          aria-expanded={advancedOpen}
          aria-controls="advanced-settings-panel"
          className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-[#F7F8FA] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1D4ED8]"
        >
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#17212B]">
              Advanced settings
            </h2>
            <p className="text-xs text-[#526170]">
              Technical diagnostics, AI model routing status, and runtime provider API key configuration.
            </p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-[#F1F4F8] text-[#526170] flex items-center justify-center shrink-0">
            {advancedOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </button>

        {advancedOpen && (
          <div
            id="advanced-settings-panel"
            className="p-6 pt-2 border-t border-[#E2E7ED] space-y-8 bg-white"
          >
            {/* 1. AI Model Providers Status */}
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-2.5">
                <Cpu className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[#17212B]">
                    Configured AI providers
                  </h3>
                  <p className="text-xs text-[#526170]">
                    When external provider keys are not configured, the backend automatically uses its built-in grounded text parser so all study tools continue to work offline.
                  </p>
                </div>
              </div>

              {isDisconnected ? (
                <InlineBanner variant="warning">
                  Provider configuration status is unavailable while the backend server is offline.
                </InlineBanner>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#17212B]">
                        Groq API
                      </span>
                      <Badge
                        variant={
                          healthData?.groq_configured ? "success" : "default"
                        }
                      >
                        {healthData?.groq_configured
                          ? "Configured"
                          : "Not configured"}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono-code text-[#1D4ED8] truncate">
                      {healthData?.groq_model || "llama-3.3-70b-versatile"}
                    </p>
                    <p className="text-[11px] text-[#526170]">
                      Used for course outlines, quizzes, and interview question generation when configured.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#17212B]">
                        NVIDIA NIM
                      </span>
                      <Badge
                        variant={
                          healthData?.nvidia_configured ? "success" : "default"
                        }
                      >
                        {healthData?.nvidia_configured
                          ? "Configured"
                          : "Not configured"}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono-code text-[#1D4ED8] truncate">
                      {healthData?.nvidia_model ||
                        "nvidia/nemotron-3.5-lightning-30b-a3b"}
                    </p>
                    <p className="text-[11px] text-[#526170]">
                      Secondary LLM provider for structured JSON generation and evaluation.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#17212B]">
                        Google Gemini
                      </span>
                      <Badge
                        variant={
                          healthData?.gemini_configured ? "success" : "default"
                        }
                      >
                        {healthData?.gemini_configured
                          ? "Configured"
                          : "Not configured"}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono-code text-[#1D4ED8] truncate">
                      {healthData?.gemini_model || "gemini-2.0-flash"}
                    </p>
                    <p className="text-[11px] text-[#526170]">
                      Supported provider for long-document synthesis and topic analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Runtime Provider API Key Form */}
            <form
              onSubmit={handleSaveKeys}
              className="pt-6 border-t border-[#E2E7ED] space-y-4"
            >
              <div className="flex items-start gap-2.5">
                <KeyRound className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[#17212B]">
                    Update provider API keys (current server session)
                  </h3>
                  <p className="text-xs text-[#526170]">
                    Keys submitted here are sent to the backend and held in server memory until the backend restarts. For persistent configuration across restarts, set them in <code className="font-mono-code bg-[#F1F4F8] px-1.5 py-0.5 rounded">backend/.env</code>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Groq API key" htmlFor="settings-groq-key">
                  <Input
                    id="settings-groq-key"
                    type="password"
                    autoComplete="off"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="Enter Groq key..."
                    disabled={savingKeys || isDisconnected}
                  />
                </FormField>

                <FormField
                  label="Google Gemini API key"
                  htmlFor="settings-gemini-key"
                >
                  <Input
                    id="settings-gemini-key"
                    type="password"
                    autoComplete="off"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Enter Gemini key..."
                    disabled={savingKeys || isDisconnected}
                  />
                </FormField>

                <FormField
                  label="NVIDIA NIM API key"
                  htmlFor="settings-nvidia-key"
                >
                  <Input
                    id="settings-nvidia-key"
                    type="password"
                    autoComplete="off"
                    value={nvidiaKey}
                    onChange={(e) => setNvidiaKey(e.target.value)}
                    placeholder="Enter NVIDIA key..."
                    disabled={savingKeys || isDisconnected}
                  />
                </FormField>
              </div>

              {saveStatus && (
                <InlineBanner
                  variant={saveStatus.type}
                  onDismiss={() => setSaveStatus(null)}
                >
                  {saveStatus.message}
                </InlineBanner>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-[#526170]">
                  <Info className="h-4 w-4 text-[#64748B] shrink-0" />
                  <span>
                    Existing keys are never returned or displayed in the browser.
                  </span>
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={
                    savingKeys ||
                    isDisconnected ||
                    (!groqKey.trim() && !geminiKey.trim() && !nvidiaKey.trim())
                  }
                  loading={savingKeys}
                >
                  {savingKeys ? "Saving keys..." : "Save provider keys"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
};
