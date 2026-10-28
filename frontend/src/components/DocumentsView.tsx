"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  BookOpen,
  X
} from "lucide-react";
import { DocumentItem, DocumentChunk, api } from "@/lib/api";

interface DocumentsViewProps {
  documents: DocumentItem[];
  onRefresh: () => void;
  onGenerateCourse: (documentId: string, title?: string) => void;
}

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

  // Chunk inspection state
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side quick validation
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Only PDF files (.pdf) are supported.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("File size exceeds maximum limit of 50 MB.");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadProgress(`Extracting pages with PyMuPDF and computing embeddings...`);

    try {
      const doc = await api.uploadDocument(file, fileType);
      setSuccessMsg(`Document "${doc.original_name}" successfully indexed into ChromaDB! (${doc.page_count} pages, ${doc.chunk_count} chunks)`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process and index PDF.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will delete all associated chunks and ChromaDB vector collections.`)) {
      return;
    }

    try {
      await api.deleteDocument(docId);
      onRefresh();
    } catch (err: any) {
      alert("Error deleting document: " + err.message);
    }
  };

  const handleInspectChunks = async (doc: DocumentItem) => {
    setInspectDoc(doc);
    setLoadingChunks(true);
    try {
      const detailed = await api.getDocument(doc.id);
      setChunks(detailed.chunks || []);
    } catch (err) {
      alert("Failed to load chunks");
    } finally {
      setLoadingChunks(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 studio-grid-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono-code text-[11px] uppercase tracking-widest text-amber-400 block mb-1">
            CHANNEL 02 // SOURCE ARCHIVE & VECTOR VAULT
          </span>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
            Source Archive &{" "}
            <span className="font-editorial italic font-normal text-amber-300">
              Verbatim Indexing
            </span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Drop PDF textbooks, past question papers, or resumes. Every page is parsed via PyMuPDF and indexed with exact page & chunk provenance.
          </p>
        </div>
      </div>

      {/* Upload Dropzone Card */}
      <div className="p-8 rounded-[28px] glass-panel border-dashed border-2 border-white/[0.12] hover:border-amber-500/50 transition-colors space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display text-sm font-bold text-white">Select Document Classification</h3>
            <p className="text-xs text-zinc-400">Routes document chunks to curriculum, exam frequency, or interview pipelines</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["textbook", "pyq", "resume", "other"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFileType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  fileType === type
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "bg-[#07080c] text-zinc-400 border border-white/[0.08] hover:text-white"
                }`}
              >
                {type === "pyq" ? "Past Exam Paper (PYQ)" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer py-12 px-6 rounded-2xl bg-[#07080c]/90 hover:bg-[#0c0e14] border border-white/[0.08] flex flex-col items-center justify-center space-y-3 transition-all group"
        >
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UploadCloud className="h-7 w-7 text-amber-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-display text-sm font-bold text-zinc-100">
              {uploading ? "Extracting Pages & Indexing Chunks..." : "Click or drag a PDF volume into the Archive"}
            </p>
            <p className="text-xs text-zinc-500">
              Supports .pdf textbooks, lecture notes, question papers, and resumes up to 50 MB
            </p>
          </div>
          {uploadProgress && (
            <div className="flex items-center space-x-2 text-xs text-amber-400 pt-2 font-mono-code">
              <span className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
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

        {/* Feedback banners */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight">
            Ingested Documents ({documents.length})
          </h3>
          <span className="text-xs text-slate-400">All chunks grounded with chunk IDs and page numbers</span>
        </div>

        {documents.length === 0 ? (
          <div className="py-12 text-center rounded-2xl glass-panel space-y-2">
            <FileText className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No documents uploaded yet. Upload a PDF above to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="font-mono-code text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {doc.file_type}
                    </span>
                    <button
                      onClick={() => handleDelete(doc.id, doc.original_name)}
                      className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg hover:bg-zinc-900 transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h4 className="font-display text-sm font-bold text-white line-clamp-2" title={doc.original_name}>
                    {doc.original_name}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div className="p-2.5 rounded-xl bg-[#07080c] border border-white/[0.06]">
                      <span className="block font-mono-code text-[10px] text-zinc-500">PAGES</span>
                      <span className="font-mono-code font-bold text-zinc-100">{doc.page_count}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#07080c] border border-white/[0.06]">
                      <span className="block font-mono-code text-[10px] text-zinc-500">CHUNKS</span>
                      <span className="font-mono-code font-bold text-amber-400">{doc.chunk_count}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleInspectChunks(doc)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#07080c] hover:bg-zinc-900 text-xs font-semibold text-zinc-300 border border-white/[0.08] flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Inspect</span>
                  </button>
                  <button
                    onClick={() => onGenerateCourse(doc.id, doc.original_name)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-extrabold text-black flex items-center justify-center space-x-1.5 transition-colors shadow-md shadow-amber-500/15"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Build Course</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chunk Inspector Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-md">{inspectDoc.original_name}</h3>
                  <p className="text-xs text-slate-400">ChromaDB Collection: {inspectDoc.chroma_collection_name}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {loadingChunks ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading vector chunks...</div>
              ) : chunks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No chunks recorded.</div>
              ) : (
                chunks.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-indigo-400">Chunk #{c.chunk_index}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Page {c.page_number}</span>
                      <span className="font-mono text-[11px] text-slate-500">ID: {c.id}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setInspectDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
