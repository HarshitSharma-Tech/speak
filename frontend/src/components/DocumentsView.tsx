"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  BookOpen,
  X,
  ArrowRight
} from "lucide-react";
import { DocumentItem, DocumentChunk, api } from "@/lib/api";

interface DocumentsViewProps {
  documents: DocumentItem[];
  onRefresh: () => void;
  onGenerateCourse: (documentId: string, title?: string) => void;
}

const DOC_PHOTOS: Record<string, string> = {
  textbook: "/media/photo-library.jpg",
  pyq: "/media/photo-exam.jpg",
  resume: "/media/photo-interview.jpg",
  other: "/media/photo-notes.jpg",
};

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  onRefresh,
  onGenerateCourse,
}) => {
  const [fileType, setFileType] = useState<"textbook" | "pyq" | "resume" | "other">("textbook");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Please choose a PDF file (.pdf).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("File size must be under 50 MB.");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadProgress("Reading pages and organizing your notes...");

    try {
      const doc = await api.uploadDocument(file, fileType);
      setSuccessMsg(`"${doc.original_name}" is ready! (${doc.page_count} pages read)`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Could not upload PDF.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.deleteDocument(docId);
      onRefresh();
    } catch (err: any) {
      setErrorMsg("Could not delete file: " + err.message);
    }
  };

  const handleInspectChunks = async (doc: DocumentItem) => {
    setInspectDoc(doc);
    setLoadingChunks(true);
    try {
      const detailed = await api.getDocument(doc.id);
      setChunks(detailed.chunks || []);
    } catch {
      setChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
      {/* Photo Hero Banner */}
      <div className="relative rounded-[32px] overflow-hidden border border-white/15 shadow-2xl p-8 sm:p-12">
        <img
          src="/media/photo-library.jpg"
          alt="Bookshelf and study desk"
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.4] saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />

        <div className="relative z-10 max-w-xl space-y-3">
          <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
            Step 1 • Add Your Study Material
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Upload Your{" "}
            <span className="font-editorial italic font-normal text-amber-300">
              PDF Notes
            </span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
            Upload a textbook, class notes, past question paper, or resume. Once uploaded, click <strong>Create Course</strong> to get instant study chapters and quizzes.
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <div className="p-6 sm:p-8 rounded-[32px] glass-panel space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-white">What kind of PDF is this?</h3>
            <p className="text-xs text-zinc-300">Pick a label so we know how to use it</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { id: "textbook", label: "Textbook / Notes" },
              { id: "pyq", label: "Past Exam Paper" },
              { id: "resume", label: "My Resume" },
              { id: "other", label: "Other PDF" },
            ] as const).map((item) => (
              <button
                key={item.id}
                onClick={() => setFileType(item.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  fileType === item.id
                    ? "bg-amber-400 text-black shadow-lg shadow-amber-400/25"
                    : "bg-white/5 text-zinc-300 border border-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clickable Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer py-12 px-6 rounded-3xl bg-black/50 hover:bg-black/70 border-2 border-dashed border-white/20 hover:border-amber-400/60 flex flex-col items-center justify-center space-y-3 transition-all group"
        >
          <div className="h-16 w-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UploadCloud className="h-8 w-8 text-amber-300" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-display text-base font-bold text-white">
              {uploading ? "Uploading & Reading PDF..." : "Click here to choose a PDF file"}
            </p>
            <p className="text-xs text-zinc-400">Works with any PDF up to 50 MB</p>
          </div>
          {uploadProgress && (
            <div className="flex items-center space-x-2 text-xs text-amber-300 pt-2 font-semibold">
              <span className="h-3.5 w-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>{uploadProgress}</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-center space-x-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center space-x-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Uploaded Files Grid with Photo Headers */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-white">
            Your Uploaded PDFs ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="py-14 text-center rounded-3xl glass-panel space-y-2">
            <FileText className="h-10 w-10 text-zinc-500 mx-auto" />
            <p className="text-sm text-zinc-300 font-medium">No PDFs uploaded yet. Choose a file above to start!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-3xl overflow-hidden glass-panel glass-panel-hover flex flex-col justify-between"
              >
                {/* Matching Photo Cover */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={DOC_PHOTOS[doc.file_type] || DOC_PHOTOS.other}
                    alt={doc.original_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-black/40 to-transparent" />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold capitalize text-amber-300 border border-white/15">
                    {doc.file_type === "pyq" ? "Past Paper" : doc.file_type}
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id, doc.original_name)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-zinc-300 hover:text-rose-400 transition-colors"
                    title="Delete PDF"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="font-display text-base font-bold text-white line-clamp-2" title={doc.original_name}>
                      {doc.original_name}
                    </h4>
                    <p className="text-xs text-zinc-300">
                      {doc.page_count} Pages &bull; {doc.chunk_count} Text Sections
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center gap-2.5">
                    <button
                      onClick={() => handleInspectChunks(doc)}
                      className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview Text</span>
                    </button>
                    <button
                      onClick={() => onGenerateCourse(doc.id, doc.original_name)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-extrabold text-black flex items-center justify-center space-x-1.5 transition-all shadow-lg shadow-amber-400/20"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Create Course</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text Preview Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white truncate max-w-md">
                  {inspectDoc.original_name}
                </h3>
                <p className="text-xs text-zinc-400">Extracted Pages & Notes</p>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {loadingChunks ? (
                <div className="py-12 text-center text-xs text-zinc-300">Loading pages...</div>
              ) : chunks.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-300">No text found.</div>
              ) : (
                chunks.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300">Section #{c.chunk_index + 1}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-200">
                        Page {c.page_number}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
