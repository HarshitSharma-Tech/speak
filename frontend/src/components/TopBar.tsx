"use client";

import React, { useState, useEffect } from "react";
import { Radio, Activity, Layers, ArrowUpRight } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  onQuickAction?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  isOnline = true,
  onQuickAction,
}) => {
  const [clock, setClock] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-16 border-b border-white/[0.07] bg-[#06070a]/85 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="font-display text-lg font-bold text-white tracking-tight flex items-center space-x-2.5">
            <span>{title}</span>
          </h1>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 font-normal tracking-wide">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Live Studio Timecode */}
        {clock && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0c0e14] border border-white/[0.06] font-mono-code text-[11px] text-zinc-400">
            <span className="text-amber-400">TC</span>
            <span className="text-zinc-200">{clock}</span>
          </div>
        )}

        {/* Fast Mode Indicator */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 font-medium">
          <Activity className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-mono-code text-[11px]">TURBO PARALLEL ENGINE</span>
        </div>

        {/* Connection status indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0c0e14] border border-white/[0.07] text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                : "bg-amber-400"
            }`}
          />
          <span className="font-mono-code text-[11px] text-zinc-300">
            {isOnline ? "STUDIO ONLINE" : "OFFLINE CACHE"}
          </span>
        </div>
      </div>
    </header>
  );
};
