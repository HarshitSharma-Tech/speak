"use client";

import React from "react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  isOnline = true,
}) => {
  return (
    <header className="h-14 border-b border-[#E2E7ED] bg-white px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-sm font-semibold text-[#17212B]">{title}</h1>
        {subtitle && <p className="text-xs text-[#526170]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F7F8FA] border border-[#E2E7ED] text-xs text-[#526170]">
        <span
          className={`h-2 w-2 rounded-full ${
            isOnline ? "bg-[#15803D]" : "bg-[#B45309]"
          }`}
        />
        <span>{isOnline ? "API connected" : "API offline"}</span>
      </div>
    </header>
  );
};
