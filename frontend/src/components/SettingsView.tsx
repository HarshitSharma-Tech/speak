"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Database,
  Server,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Terminal,
  KeyRound,
  Zap,
  Sliders
} from "lucide-react";
import { api } from "@/lib/api";

export const SettingsView: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pingTime, setPingTime] = useState<number | null>(null);

  // Live API Key Vault form state
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [savingKeys, setSavingKeys] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const data = await api.checkHealth();
      setHealthData(data);
      setPingTime(Math.round(performance.now() - start));
    } catch (err) {
      setHealthData({ status: "disconnected", error: "Cannot reach backend server" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    setSaveMessage(null);
    try {
      const payload: Record<string, string> = {};
      if (groqKey.trim()) payload.groq_api_key = groqKey.trim();
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
      if (nvidiaKey.trim()) payload.nvidia_api_key = nvidiaKey.trim();

      const updated = await api.updateApiKeys(payload);
      setHealthData(updated);
      setGroqKey("");
      setGeminiKey("");
      setNvidiaKey("");
      setSaveMessage("API provider keys hot-reloaded in backend memory.");
    } catch (err: any) {
      setSaveMessage("Failed to update keys: " + (err.message || "Backend unreachable"));
    } finally {
      setSavingKeys(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 studio-grid-bg">
      <div>
        <div className="inline-flex items-center space-x-2 text-[11px] font-mono-code uppercase tracking-widest text-amber-400 mb-1">
          <Sliders className="h-3.5 w-3.5" />
          <span>CHANNEL 06 // ENGINE ROOM & TELEMETRY</span>
        </div>
        <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
          Engine Room &{" "}
          <span className="font-editorial italic font-normal text-amber-300">
            Live Key Vault
          </span>
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Real-time API health diagnostics, parallel inference routing, and hot-reloadable provider credentials.
        </p>
      </div>

      {/* Backend Health Diagnostics */}
      <div className="p-6 rounded-[28px] glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">FastAPI Core Engine</h3>
              <p className="text-xs text-zinc-400">Concurrent ThreadPoolExecutor & Persistent HTTP/2 Pool</p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-white flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${loading ? "animate-spin" : ""}`} />
            <span>Ping Server</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-[#07080c] border border-white/[0.06] space-y-1">
            <span className="font-mono-code text-[10px] text-zinc-500 uppercase">API STATUS</span>
            <div className="flex items-center space-x-2 text-xs font-bold">
              <span
                className={`h-2 w-2 rounded-full ${
                  healthData?.status === "healthy" ? "bg-emerald-400" : "bg-rose-500"
                }`}
              />
              <span className={healthData?.status === "healthy" ? "text-emerald-400" : "text-rose-400"}>
                {healthData?.status === "healthy" ? "ONLINE (200 OK)" : "OFFLINE"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#07080c] border border-white/[0.06] space-y-1">
            <span className="font-mono-code text-[10px] text-zinc-500 uppercase">ROUNDTRIP PING</span>
            <div className="font-mono-code text-sm font-bold text-white">
              {pingTime !== null ? `${pingTime} ms` : "Measuring..."}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#07080c] border border-white/[0.06] space-y-1">
            <span className="font-mono-code text-[10px] text-zinc-500 uppercase">EXECUTION PIPELINE</span>
            <div className="font-mono-code text-xs font-bold text-amber-400">
              TURBO NON-THINKING + PARALLEL
            </div>
          </div>
        </div>
      </div>

      {/* Live Hot-Reload API Key Vault */}
      <form onSubmit={handleSaveKeys} className="p-7 rounded-[28px] glass-panel space-y-5 border border-amber-500/25">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Live API Key Vault (Optional Sub-Second Upgrade)
              </h3>
              <p className="text-xs text-zinc-400">
                NVIDIA NIM is already active and optimized. Paste a Groq or Gemini key below to hot-swap providers at runtime without restarting.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="font-mono-code text-[10px] uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Groq API Key (0.4s Ultra-Fast)</span>
              <span className={healthData?.groq_configured ? "text-emerald-400" : "text-zinc-500"}>
                {healthData?.groq_configured ? "ACTIVE" : "OPTIONAL"}
              </span>
            </label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full p-3 rounded-xl bg-[#07080c] border border-white/[0.08] text-xs text-white font-mono-code focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono-code text-[10px] uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <span className={healthData?.gemini_configured ? "text-emerald-400" : "text-zinc-500"}>
                {healthData?.gemini_configured ? "ACTIVE" : "OPTIONAL"}
              </span>
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 rounded-xl bg-[#07080c] border border-white/[0.08] text-xs text-white font-mono-code focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono-code text-[10px] uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>NVIDIA NIM Key</span>
              <span className={healthData?.nvidia_configured ? "text-emerald-400" : "text-zinc-500"}>
                {healthData?.nvidia_configured ? "CONFIGURED" : "STANDBY"}
              </span>
            </label>
            <input
              type="password"
              value={nvidiaKey}
              onChange={(e) => setNvidiaKey(e.target.value)}
              placeholder="nvapi-..."
              className="w-full p-3 rounded-xl bg-[#07080c] border border-white/[0.08] text-xs text-white font-mono-code focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {saveMessage ? (
            <span className="text-xs text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>{saveMessage}</span>
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500">
              Keys are applied immediately in memory and prioritized automatically (Groq &rarr; NVIDIA NIM &rarr; Gemini &rarr; Grounded Parser).
            </span>
          )}

          <button
            type="submit"
            disabled={savingKeys || (!groqKey.trim() && !geminiKey.trim() && !nvidiaKey.trim())}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs flex items-center space-x-2 transition-all self-start sm:self-auto"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{savingKeys ? "Activating..." : "Hot-Swap & Activate Keys"}</span>
          </button>
        </div>
      </form>

      {/* Configured AI Providers Matrix */}
      <div className="p-6 rounded-[28px] glass-panel space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white">Inference Routing Hierarchy</h3>
            <p className="text-xs text-zinc-400">Multi-provider failover with zero-latency deterministic backup</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-[#07080c] border border-emerald-500/35 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-white">NVIDIA NIM (Turbo Mode)</span>
              <span className="font-mono-code text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {healthData?.nvidia_configured ? "ACTIVE" : "STANDBY"}
              </span>
            </div>
            <p className="text-xs text-amber-400 font-mono-code truncate">
              {healthData?.nvidia_model || "nvidia/nemotron-3.5-lightning-30b-a3b"}
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Configured with <code className="text-zinc-200">enable_thinking=False</code> and persistent HTTP connection pooling for 5x faster JSON responses.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#07080c] border border-white/[0.07] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-white">Groq LPU Engine</span>
              <span className="font-mono-code text-[10px] font-semibold px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400">
                {healthData?.groq_configured ? "ACTIVE" : "READY"}
              </span>
            </div>
            <p className="text-xs text-amber-400 font-mono-code">llama-3.3-70b-versatile</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Sub-second LPU inference for instant 5-question quiz formulation and interview grading.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#07080c] border border-white/[0.07] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-white">Google Gemini 2.0</span>
              <span className="font-mono-code text-[10px] font-semibold px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400">
                {healthData?.gemini_configured ? "ACTIVE" : "READY"}
              </span>
            </div>
            <p className="text-xs text-amber-400 font-mono-code">gemini-2.0-flash</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Long-context syllabus synthesis, semantic topic comparison, and coaching feedback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
