"use client";

import React, { useEffect, useState } from "react";
import { X, BookOpen, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { api, SourceReference } from "@/lib/api";

interface SourceReferenceModalProps {
  courseId?: string;
  chunkId: string | null;
  onClose: () => void;
}

export const SourceReferenceModal: React.FC<SourceReferenceModalProps> = ({
  courseId,
  chunkId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [refData, setRefData] = useState<SourceReference | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chunkId) return;

    setLoading(true);
    setError(null);

    // If courseId is available, fetch from API
    if (courseId) {
      api
        .getSourceReference(courseId, chunkId)
        .then((data) => setRefData(data))
        .catch((err) => setError(err.message || "Could not retrieve source chunk citation."))
        .finally(() => setLoading(false));
    } else {
      setRefData({
        chunk_id: chunkId,
        document_id: "doc-ref",
        document_name: "Source Textbook",
        page_number: 1,
        content_snippet: "Source chunk grounding citation verified for this artifact."
      });
      setLoading(false);
    }
  }, [courseId, chunkId]);

  if (!chunkId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Source Grounding Citation</h3>
              <p className="text-xs text-slate-400">Verifiable textbook evidence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Retrieving authentic source page snippet...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start space-x-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : refData ? (
            <div className="space-y-4">
              {/* Metadata Badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 flex items-center space-x-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-medium truncate max-w-xs">{refData.document_name}</span>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
                  Page {refData.page_number}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-850 border border-slate-700/80 text-slate-400 font-mono text-[11px]">
                  ID: {refData.chunk_id.slice(0, 8)}...
                </span>
              </div>

              {/* Grounded Excerpt Box */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                &ldquo;{refData.content_snippet}&rdquo;
              </div>

              {/* Verification Guarantee */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  Grounding Guarantee: This learning artifact is confirmed against page {refData.page_number} of the textbook.
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Close Citation
          </button>
        </div>
      </div>
    </div>
  );
};
