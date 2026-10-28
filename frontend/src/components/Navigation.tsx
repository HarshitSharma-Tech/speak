"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  FolderKanban,
  BookMarked,
  CalendarClock,
  Radio,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Flame
} from "lucide-react";

export type NavTab = "dashboard" | "documents" | "courses" | "sprints" | "interviews" | "settings";

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  documentCount?: number;
  courseCount?: number;
  sprintCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  documentCount = 0,
  courseCount = 0,
  sprintCount = 0,
}) => {
  // Built-in Deep Work Focus Timer (25 min Pomodoro)
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
    {
      id: "dashboard" as NavTab,
      code: "01",
      label: "Studio Overview",
      icon: Compass,
      description: "Cinema reel & live telemetry",
    },
    {
      id: "documents" as NavTab,
      code: "02",
      label: "Source Archive",
      icon: FolderKanban,
      badge: documentCount > 0 ? documentCount : undefined,
      description: "Textbooks, PYQs & resumes",
    },
    {
      id: "courses" as NavTab,
      code: "03",
      label: "Curriculum Lab",
      icon: BookMarked,
      badge: courseCount > 0 ? courseCount : undefined,
      description: "Modules, quizzes & decks",
    },
    {
      id: "sprints" as NavTab,
      code: "04",
      label: "Exam Roadmap",
      icon: CalendarClock,
      badge: sprintCount > 0 ? sprintCount : undefined,
      description: "Topic weights & daily plan",
    },
    {
      id: "interviews" as NavTab,
      code: "05",
      label: "Voice Booth",
      icon: Radio,
      description: "Live mock interview studio",
    },
    {
      id: "settings" as NavTab,
      code: "06",
      label: "Engine Room",
      icon: Sliders,
      description: "API keys & system status",
    },
  ];

  return (
    <aside className="w-[280px] bg-[#07080c] border-r border-white/[0.07] flex flex-col justify-between shrink-0 select-none relative z-20">
      <div>
        {/* Editorial Brand Mark */}
        <div className="p-6 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300/40">
              <span className="font-display font-extrabold text-black text-base tracking-tighter">LS</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#07080c]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display text-base font-bold tracking-tight text-white">
                  LearnSync
                </span>
                <span className="font-mono-code text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 uppercase tracking-wider">
                  STUDIO
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium tracking-wide">
                Editorial Study OS v2.4
              </p>
            </div>
          </div>
        </div>

        {/* Studio Channels */}
        <nav className="p-4 space-y-1">
          <div className="px-3 py-2 flex items-center justify-between text-[10px] font-mono-code font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            <span>Workspace Channels</span>
            <span>CH 01–06</span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent text-white border border-amber-500/30 shadow-lg shadow-black/40"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-amber-400" />
                )}
                <div className="flex items-center space-x-3 truncate">
                  <span
                    className={`font-mono-code text-[10px] font-semibold transition-colors ${
                      isActive ? "text-amber-400" : "text-zinc-600 group-hover:text-zinc-400"
                    }`}
                  >
                    {item.code}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-amber-500 text-black"
                        : "bg-zinc-900/80 text-zinc-400 group-hover:text-zinc-200 border border-white/[0.05]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold tracking-tight truncate">{item.label}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{item.description}</div>
                  </div>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`font-mono-code text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                      isActive
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                        : "bg-zinc-900 text-zinc-400 border border-white/[0.06]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tactile Deep Focus Pomodoro Widget */}
      <div className="p-4 border-t border-white/[0.07] space-y-3">
        <div className="p-4 rounded-2xl bg-[#0c0e14] border border-white/[0.07] space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5 text-[10px] font-mono-code uppercase tracking-wider text-zinc-400">
              <Flame className={`h-3.5 w-3.5 ${timerRunning ? "text-amber-400 animate-pulse" : "text-zinc-500"}`} />
              <span>Deep Focus Clock</span>
            </span>
            <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
              25M SPRINT
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-mono-code text-2xl font-bold tracking-tight text-white">
              {formatTimer(secondsLeft)}
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={`p-2 rounded-xl text-xs font-semibold transition-all ${
                  timerRunning
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
                title={timerRunning ? "Pause Focus Timer" : "Start Focus Timer"}
              >
                {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(25 * 60);
                }}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.05] transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
