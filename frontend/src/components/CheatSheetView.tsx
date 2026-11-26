"use client";

import React from "react";
import {
  BookOpen,
  FileText,
  CheckCircle2,
  Sigma,
  ArrowLeft,
} from "lucide-react";
import { CheatSheetItem } from "@/lib/api";
import { Card, Button, Badge } from "@/components/ui";

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
    <div className="space-y-6">
      {/* Cheat Sheet Header Card */}
      <Card className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">Revision cheat sheet</Badge>
            <span className="text-xs text-[#526170]">{courseTitle}</span>
          </div>
          <h2 className="text-xl font-bold text-[#17212B] tracking-tight">
            {cheatSheet.title}
          </h2>
          {cheatSheet.summary && (
            <p className="text-sm text-[#526170] leading-relaxed">
              {cheatSheet.summary}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back to module notes
        </Button>
      </Card>

      {/* Definitions & Formulas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Core Definitions */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#17212B] pb-3 border-b border-[#E2E7ED]">
            <BookOpen className="h-4 w-4 text-[#1D4ED8]" />
            <h3>Key Definitions & Concepts</h3>
          </div>
          {cheatSheet.key_definitions.length === 0 ? (
            <p className="text-xs text-[#526170]">No definitions listed.</p>
          ) : (
            <ol className="space-y-3">
              {cheatSheet.key_definitions.map((def, idx) => (
                <li
                  key={idx}
                  className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E2E7ED] flex items-start gap-3 text-sm text-[#17212B]"
                >
                  <span className="h-5 w-5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] font-mono-code text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{def}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Important Formulas & Relationships */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#17212B] pb-3 border-b border-[#E2E7ED]">
            <Sigma className="h-4 w-4 text-[#B45309]" />
            <h3>Formulas & Core Relationships</h3>
          </div>
          {cheatSheet.important_formulas.length === 0 ? (
            <p className="text-xs text-[#526170]">No formulas listed.</p>
          ) : (
            <ol className="space-y-3">
              {cheatSheet.important_formulas.map((formula, idx) => (
                <li
                  key={idx}
                  className="p-3.5 rounded-lg bg-[#FFFBEB]/60 border border-[#FDE68A] flex items-start gap-3 text-sm text-[#17212B]"
                >
                  <span className="h-5 w-5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono-code text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="font-mono-code text-xs sm:text-sm leading-relaxed">
                    {formula}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* High-Yield Revision Points */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#17212B] pb-3 border-b border-[#E2E7ED]">
          <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
          <h3>High-Yield Revision Takeaways</h3>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cheatSheet.high_yield_revision_points.map((point, idx) => (
            <li
              key={idx}
              className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E2E7ED] flex items-start gap-2.5 text-sm text-[#17212B]"
            >
              <span className="h-2 w-2 rounded-full bg-[#1D4ED8] mt-2 shrink-0" />
              <span className="leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Source Grounding Citations */}
      {cheatSheet.source_chunk_ids.length > 0 && (
        <Card className="p-4 bg-[#F7F8FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#526170]">
            <FileText className="h-4 w-4 text-[#1D4ED8] shrink-0" />
            <span>
              Compiled from {cheatSheet.source_chunk_ids.length} source textbook{" "}
              {cheatSheet.source_chunk_ids.length === 1 ? "section" : "sections"}.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cheatSheet.source_chunk_ids.slice(0, 4).map((cid, index) => (
              <Button
                key={cid}
                variant="outline"
                size="sm"
                onClick={() => onOpenCitation(cid)}
                icon={<BookOpen className="h-3.5 w-3.5 text-[#1D4ED8]" />}
              >
                Source #{index + 1}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
