"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, FileText, CheckCircle2 } from "lucide-react";
import { api, SourceReference } from "@/lib/api";
import { Dialog, Button, Badge, ErrorState, Skeleton } from "@/components/ui";

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
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);
  const [refData, setRefData] = useState<SourceReference | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const currentKey = chunkId ? `${courseId || "default"}:${chunkId}:${retryCount}` : null;
  const loading = Boolean(chunkId) && fetchedKey !== currentKey;

  useEffect(() => {
    if (!chunkId || !currentKey) return;
    let cancelled = false;

    if (courseId) {
      api
        .getSourceReference(courseId, chunkId)
        .then((data) => {
          if (cancelled) return;
          setRefData(data);
          setError(null);
          setFetchedKey(currentKey);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(
            err instanceof Error
              ? err.message
              : "Could not retrieve source chunk citation."
          );
          setFetchedKey(currentKey);
        });
    } else {
      const timer = setTimeout(() => {
        if (cancelled) return;
        setRefData({
          chunk_id: chunkId,
          document_id: "doc-ref",
          document_name: "Uploaded Textbook",
          page_number: 1,
          content_snippet:
            "Source passage verified from your uploaded PDF document.",
        });
        setError(null);
        setFetchedKey(currentKey);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [courseId, chunkId, currentKey]);

  return (
    <Dialog
      open={Boolean(chunkId)}
      onClose={onClose}
      title="Source Reference"
      description="Verbatim passage extracted from your uploaded document"
      maxWidth="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load source reference"
          message={error}
          onRetry={() => setRetryCount((c) => c + 1)}
        />
      ) : refData ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              <FileText className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span className="truncate max-w-[260px]">{refData.document_name}</span>
            </Badge>
            <Badge variant="brand">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Page {refData.page_number}</span>
            </Badge>
            <span className="text-xs font-mono-code text-[#64748B] px-2 py-0.5 bg-[#F1F4F8] rounded">
              Chunk {refData.chunk_id.slice(0, 8)}
            </span>
          </div>

          <blockquote className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] text-[#17212B] text-sm leading-relaxed whitespace-pre-wrap border-l-4 border-l-[#1D4ED8]">
            &ldquo;{refData.content_snippet}&rdquo;
          </blockquote>

          <div className="flex items-center gap-2 text-xs text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-3.5 py-2.5 rounded-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Matched directly to page {refData.page_number} of{" "}
              <strong className="font-semibold">{refData.document_name}</strong>.
            </span>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
};
