"use client";

import React from "react";
import { BookOpen, Sparkles, FileText, CheckCircle2, Sigma, ArrowLeft } from "lucide-react";
import { CheatSheetItem } from "@/lib/api";

interface CheatSheetViewProps {
  cheatSheet: CheatSheetItem;
  courseTitle: string;
  onOpenCitation: (chunkId: string) => void;
  onBack: () => void;
}

export const CheatSheetView: React.FC<CheatSheetViewProps> = ({
  cheatSheet,
  courseTitle,
  onOpenCitation,
  onBack,
}) => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-indigo-500/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>High-Yield Revision Deck</span>
            </span>
            <span className="text-xs text-slate-400">{courseTitle}</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">{cheatSheet.title}</h2>
          {cheatSheet.summary && (
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{cheatSheet.summary}</p>
          )}
        </div>

        <button
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Course</span>
        </button>
      </div>

      {/* Grid of Cheat Sheet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Definitions */}
        <div className="p-6 rounded-3xl glass-panel space-y-4 border border-indigo-500/20">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <BookOpen className="h-4 w-4" />
            <span>Essential Definitions & Axioms</span>
          </div>
          <div className="space-y-3">
            {cheatSheet.key_definitions.map((def, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="h-5 w-5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold inline-flex items-center justify-center mr-2">
                  #{idx + 1}
                </span>
                <span className="text-xs text-slate-200 leading-relaxed font-sans">{def}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Formulas & Core Relationships */}
        <div className="p-6 rounded-3xl glass-panel space-y-4 border border-violet-500/20">
          <div className="flex items-center space-x-2 text-violet-400 font-bold text-sm">
            <Sigma className="h-4 w-4" />
            <span>Important Formulas & Principles</span>
          </div>
          <div className="space-y-3">
            {cheatSheet.important_formulas.map((formula, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="h-5 w-5 rounded-md bg-violet-500/10 text-violet-400 text-[10px] font-bold inline-flex items-center justify-center mr-2">
                  #{idx + 1}
                </span>
                <span className="text-xs text-slate-200 leading-relaxed font-sans">{formula}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High-Yield Revision Points Card */}
      <div className="p-6 rounded-3xl glass-panel space-y-4 border border-emerald-500/20">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>High-Yield Exam Takeaways</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cheatSheet.high_yield_revision_points.map((point, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-start space-x-2.5 text-xs text-slate-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span className="leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source Grounding Footnote */}
      {cheatSheet.source_chunk_ids.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span>Grounded in {cheatSheet.source_chunk_ids.length} supporting textbook chunks</span>
          </div>
          <button
            onClick={() => onOpenCitation(cheatSheet.source_chunk_ids[0])}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline"
          >
            Verify Citations
          </button>
        </div>
      )}
    </div>
  );
};
