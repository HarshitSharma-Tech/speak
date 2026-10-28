"use client";

import React, { useState, useEffect } from "react";
import {
  Home,
  Upload,
  BookOpen,
  Calendar,
  Mic,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Timer
} from "lucide-react";

export type NavTab = "dashboard" | "documents" | "courses" | "sprints" | "interviews" | "settings";

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  documentCount?: number;
  courseCount?: number;
  sprintCount?: number;
  isOnline?: boolean;
  scrollProgress?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  documentCount = 0,
  courseCount = 0,
  sprintCount = 0,
  isOnline = true,
  scrollProgress = 0,
}) => {
  // Simple Study Timer (25 min)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const navItems = [
    { id: "dashboard" as NavTab, label: "Home", icon: Home },
    {
      id: "documents" as NavTab,
      label: "Upload PDF",
      icon: Upload,
      badge: documentCount > 0 ? documentCount : undefined,
    },
    {
      id: "courses" as NavTab,
      label: "My Courses",
      icon: BookOpen,
      badge: courseCount > 0 ? courseCount : undefined,
    },
    {
      id: "sprints" as NavTab,
      label: "Exam Plan",
      icon: Calendar,
      badge: sprintCount > 0 ? sprintCount : undefined,
    },
    { id: "interviews" as NavTab, label: "Voice Interview", icon: Mic },
    { id: "settings" as NavTab, label: "Settings", icon: Settings },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      {/* Top Scroll Progress Ribbon */}
      <div className="h-[3px] w-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-150"
          style={{ width: `${Math.min(100, Math.max(2, scrollProgress * 100))}%` }}
        />
      </div>

      {/* Floating Glass Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
        <div className="px-4 py-2.5 rounded-2xl bg-black/65 backdrop-blur-2xl border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <button
            onClick={() => onSelectTab("dashboard")}
            className="flex items-center space-x-2.5 text-left group shrink-0"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <span className="font-display font-extrabold text-black text-sm">LS</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-base font-bold text-white tracking-tight block leading-none">
                LearnSync
              </span>
              <span className="text-[10px] text-amber-300/90 font-medium">
                Smart Study Space
              </span>
            </div>
          </button>

          {/* Center Navigation Pills */}
          <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                    isActive
                      ? "bg-amber-400 text-black shadow-lg shadow-amber-400/25 scale-[1.02]"
                      : "text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? "bg-black/20 text-black" : "bg-white/15 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Study Timer & Status */}
          <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.07] border border-white/[0.1] text-xs">
              <Timer className={`h-3.5 w-3.5 ${timerRunning ? "text-amber-400 animate-spin" : "text-zinc-400"}`} />
              <span className="font-mono-code font-bold text-white">{formatTimer(secondsLeft)}</span>
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="p-1 rounded-lg hover:bg-white/10 text-amber-400"
                title={timerRunning ? "Pause Study Timer" : "Start 25m Study Timer"}
              >
                {timerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(25 * 60);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                title="Reset Timer"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[11px]">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-amber-400"
                }`}
              />
              <span className="text-zinc-200 font-medium">{isOnline ? "Live" : "Offline"}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
