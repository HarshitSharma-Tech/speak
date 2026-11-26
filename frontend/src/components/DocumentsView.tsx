"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  BookOpen,
  FileQuestion,
  Briefcase,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { DocumentItem, DocumentChunk, api } from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Dialog,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  InlineBanner,
  FormField,
  Input,
  Skeleton,
} from "@/components/ui";

type DocType = "textbook" | "pyq" | "resume" | "other";

const FILE_TYPE_META: Record<
  DocType,
  {
    label: string;
    shortLabel: string;
    description: string;
    badgeVariant: "brand" | "amber" | "default" | "success";
    icon: React.FC<{ className?: string }>;
  }
> = {
  textbook: {
    label: "Textbook or lecture notes",
    shortLabel: "Textbook",
    description: "Used to generate structured courses, cheat sheets, quizzes, and exam schedules.",
    badgeVariant: "brand",
    icon: BookOpen,
  },
  pyq: {
    label: "Question paper (PYQ)",
    shortLabel: "Question paper",
    description: "Used in Exam plans to count recurring exam questions and rank topics.",
    badgeVariant: "amber",
    icon: FileQuestion,
  },
  resume: {
    label: "Resume or CV",
    shortLabel: "Resume",
    description: "Used in Interview practice to tailor technical questions to your skills.",
    badgeVariant: "success",
    icon: Briefcase,
  },
  other: {
    label: "Other reference PDF",
    shortLabel: "Reference",
    description: "General reference material for text extraction and courses.",
    badgeVariant: "default",
    icon: FileText,
  },
};

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export const DocumentsView: React.FC = () => {
  const router = useRouter();
  const {
    documents,
    loading,
    errors,
    refreshDocuments,
    refreshAll,
    notify,
  } = useWorkspace();

  // Upload state
  const [selectedType, setSelectedType] = useState<DocType>("textbook");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<"all" | DocType>("all");

  // Preview chunks modal state
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create Course modal state
  const [courseDoc, setCourseDoc] = useState<DocumentItem | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [targetModules, setTargetModules] = useState(4);
  const [generatingCourse, setGeneratingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  const validateAndUploadFile = async (file: File) => {
    setUploadError(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Unsupported file format. Please select a PDF file (.pdf).");
      return;
    }

    if (file.size === 0) {
      setUploadError("The selected PDF file is empty (0 bytes).");
      return;
    }

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `File exceeds the 50 MB backend size limit (${formatFileSize(file.size)}).`
      );
      return;
    }

    setUploading(true);
    setUploadingFileName(file.name);

    try {
      const uploaded = await api.uploadDocument(file, selectedType);
      await refreshDocuments();
      notify(
        "success",
        `Uploaded "${uploaded.original_name}" (${uploaded.page_count} pages, ${uploaded.chunk_count} sections).`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to upload PDF document.";
      setUploadError(msg);
    } finally {
      setUploading(false);
      setUploadingFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUploadFile(file);
    }
  };

  const handleOpenPreview = async (doc: DocumentItem) => {
    setInspectDoc(doc);
    setLoadingChunks(true);
    setChunksError(null);
    setChunks([]);
    try {
      const detailed = await api.getDocument(doc.id);
      setChunks(detailed.chunks || []);
    } catch (err: unknown) {
      setChunksError(
        err instanceof Error ? err.message : "Could not load extracted text sections."
      );
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await api.deleteDocument(docToDelete.id);
      await refreshAll();
      notify("success", `Deleted "${docToDelete.original_name}".`);
      setDocToDelete(null);
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not delete document."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenCreateCourse = (doc: DocumentItem) => {
    setCourseDoc(doc);
    setCourseTitle(doc.original_name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "));
    setTargetModules(4);
    setCourseError(null);
  };

  const handleGenerateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseDoc) return;
    setGeneratingCourse(true);
    setCourseError(null);
    try {
      const created = await api.generateCourse(
        courseDoc.id,
        courseTitle.trim() || courseDoc.original_name,
        targetModules
      );
      await refreshAll();
      notify("success", `Course "${created.title}" created.`);
      setCourseDoc(null);
      router.push(`/app/courses/${created.id}`);
    } catch (err: unknown) {
      setCourseError(
        err instanceof Error ? err.message : "Could not generate course."
      );
    } finally {
      setGeneratingCourse(false);
    }
  };

  const filteredDocuments =
    typeFilter === "all"
      ? documents
      : documents.filter((d) => d.file_type === typeFilter);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Upload textbooks, past exam papers, and resumes. Extracted pages are indexed for courses, quizzes, exam plans, and mock interviews."
        actions={
          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            icon={<UploadCloud className="h-4 w-4" />}
          >
            Select PDF to upload
          </Button>
        }
      />

      {/* Upload Section */}
      <Card className="p-6 space-y-5">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-semibold text-[#17212B]">
              1. Choose document category
            </label>
            <span className="text-xs text-[#526170]">
              Supported format: PDF (.pdf) &bull; Maximum size: 50 MB
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Document category"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {(Object.keys(FILE_TYPE_META) as DocType[]).map((typeKey) => {
              const meta = FILE_TYPE_META[typeKey];
              const Icon = meta.icon;
              const isSelected = selectedType === typeKey;
              return (
                <button
                  key={typeKey}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={uploading}
                  onClick={() => setSelectedType(typeKey)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                    isSelected
                      ? "bg-[#EFF6FF] border-[#1D4ED8] ring-1 ring-[#1D4ED8]"
                      : "bg-white border-[#E2E7ED] hover:bg-[#F7F8FA]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? "text-[#1D4ED8]" : "text-[#17212B]"
                      }`}
                    >
                      {meta.label}
                    </span>
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? "text-[#1D4ED8]" : "text-[#64748B]"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-[#526170] leading-normal">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accessible Dropzone + File Picker */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!uploading) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
            isDragging
              ? "border-[#1D4ED8] bg-[#EFF6FF]"
              : "border-[#CBD5E1] bg-[#F7F8FA] hover:border-[#1D4ED8]/60"
          }`}
        >
          <input
            ref={fileInputRef}
            id="pdf-upload-input"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileInputChange}
            disabled={uploading}
            className="sr-only"
          />

          {uploading ? (
            <div className="py-2 space-y-3 max-w-md mx-auto" role="status" aria-live="polite">
              <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#17212B]">
                  Uploading and extracting text from &ldquo;{uploadingFileName}&rdquo;...
                </p>
                <p className="text-xs text-[#526170]">
                  Validating PDF header, reading pages, and indexing text sections. Please wait.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-w-md mx-auto">
              <div className="h-11 w-11 rounded-xl bg-white border border-[#E2E7ED] text-[#1D4ED8] flex items-center justify-center mx-auto shadow-2xs">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#17212B]">
                  Drag and drop your PDF here, or{" "}
                  <label
                    htmlFor="pdf-upload-input"
                    className="text-[#1D4ED8] underline cursor-pointer hover:text-[#1E40AF]"
                  >
                    browse from your device
                  </label>
                </p>
                <p className="text-xs text-[#526170]">
                  Uploading as:{" "}
                  <strong className="font-semibold text-[#17212B]">
                    {FILE_TYPE_META[selectedType].label}
                  </strong>{" "}
                  &bull; Must contain extractable text (up to 50 MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {uploadError && (
          <InlineBanner
            variant="error"
            title="Upload failed"
            onDismiss={() => setUploadError(null)}
          >
            {uploadError}
          </InlineBanner>
        )}
      </Card>

      {/* Document Library List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#17212B]">
            Uploaded library ({filteredDocuments.length})
          </h2>

          {/* Category Filter Pills */}
          <div
            role="tablist"
            aria-label="Filter documents by type"
            className="flex flex-wrap items-center gap-1.5"
          >
            {(
              [
                { id: "all", label: `All (${documents.length})` },
                {
                  id: "textbook",
                  label: `Textbooks (${documents.filter((d) => d.file_type === "textbook").length})`,
                },
                {
                  id: "pyq",
                  label: `Question papers (${documents.filter((d) => d.file_type === "pyq").length})`,
                },
                {
                  id: "resume",
                  label: `Resumes (${documents.filter((d) => d.file_type === "resume").length})`,
                },
              ] as const
            ).map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                    active
                      ? "bg-[#1D4ED8] text-white"
                      : "bg-white border border-[#E2E7ED] text-[#526170] hover:text-[#17212B]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : errors.documents ? (
          <ErrorState
            title="Could not load documents"
            message={errors.documents}
            onRetry={refreshDocuments}
          />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title={
              documents.length === 0
                ? "No PDF documents uploaded yet"
                : "No documents in this category"
            }
            description={
              documents.length === 0
                ? "Upload a textbook, lecture notes, past exam paper, or resume above to begin."
                : "Switch to 'All' or upload a document in this category."
            }
            action={
              documents.length === 0 ? (
                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<UploadCloud className="h-4 w-4" />}
                >
                  Select PDF file
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setTypeFilter("all")}>
                  Show all documents
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocuments.map((doc) => {
              const meta =
                FILE_TYPE_META[doc.file_type as DocType] || FILE_TYPE_META.other;
              const Icon = meta.icon;

              return (
                <Card
                  key={doc.id}
                  className="p-5 flex flex-col justify-between gap-4 hover:border-[#CBD5E1] transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={meta.badgeVariant}>
                          <Icon className="h-3.5 w-3.5" />
                          <span>{meta.shortLabel}</span>
                        </Badge>
                        <span className="text-xs text-[#64748B]">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        aria-label={`Delete ${doc.original_name}`}
                        title="Delete document"
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h3
                        className="text-base font-bold text-[#17212B] line-clamp-1"
                        title={doc.original_name}
                      >
                        {doc.original_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#526170]">
                        <span>{doc.page_count} pages</span>
                        <span>&bull;</span>
                        <span>{doc.chunk_count} text sections</span>
                        <span>&bull;</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E2E7ED] flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPreview(doc)}
                      icon={<Eye className="h-3.5 w-3.5" />}
                    >
                      Preview text
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenCreateCourse(doc)}
                      icon={<BookOpen className="h-3.5 w-3.5" />}
                    >
                      Create course
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Extracted Chunks Dialog */}
      <Dialog
        open={Boolean(inspectDoc)}
        onClose={() => setInspectDoc(null)}
        title={inspectDoc?.original_name || "Document preview"}
        description={
          inspectDoc
            ? `${inspectDoc.page_count} pages • ${inspectDoc.chunk_count} extracted text sections`
            : undefined
        }
        maxWidth="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={() => {
                const doc = inspectDoc;
                setInspectDoc(null);
                if (doc) handleOpenCreateCourse(doc);
              }}
              icon={<BookOpen className="h-4 w-4" />}
            >
              Create course from this PDF
            </Button>
            <Button variant="secondary" onClick={() => setInspectDoc(null)}>
              Close
            </Button>
          </div>
        }
      >
        {loadingChunks ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : chunksError ? (
          <ErrorState
            title="Could not load extracted text"
            message={chunksError}
            onRetry={() => inspectDoc && handleOpenPreview(inspectDoc)}
          />
        ) : chunks.length === 0 ? (
          <p className="text-sm text-[#526170] py-8 text-center">
            No extracted text sections found for this document.
          </p>
        ) : (
          <div className="space-y-3">
            {chunks.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-code font-semibold text-[#1D4ED8]">
                    Section #{c.chunk_index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Page {c.page_number}</Badge>
                    <span className="text-[#64748B] font-mono-code">
                      ~{c.token_count} tokens
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#17212B] leading-relaxed whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </Dialog>

      {/* Create Course Modal */}
      <Dialog
        open={Boolean(courseDoc)}
        onClose={() => !generatingCourse && setCourseDoc(null)}
        title="Create course from PDF"
        description={
          courseDoc
            ? `Generate structured modules and a revision cheat sheet from "${courseDoc.original_name}".`
            : undefined
        }
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCourseDoc(null)}
              disabled={generatingCourse}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="doc-create-course-form"
              loading={generatingCourse}
            >
              {generatingCourse ? "Generating course..." : "Generate course"}
            </Button>
          </>
        }
      >
        <form
          id="doc-create-course-form"
          onSubmit={handleGenerateCourseSubmit}
          className="space-y-4"
        >
          <FormField
            label="Course title"
            htmlFor="doc-course-title"
            hint="You can customize the title or keep the document name."
            required
          >
            <Input
              id="doc-course-title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Introduction to Operating Systems"
              required
              disabled={generatingCourse}
            />
          </FormField>

          <FormField
            label={`Number of modules: ${targetModules}`}
            htmlFor="doc-course-modules"
            hint="Splits the textbook into 2 to 8 sequential study modules."
          >
            <input
              id="doc-course-modules"
              type="range"
              min={2}
              max={8}
              value={targetModules}
              onChange={(e) => setTargetModules(Number(e.target.value))}
              disabled={generatingCourse}
              className="w-full accent-[#1D4ED8] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#64748B] font-mono-code">
              <span>2 modules</span>
              <span>4 modules</span>
              <span>8 modules</span>
            </div>
          </FormField>

          {courseError && (
            <InlineBanner variant="error">{courseError}</InlineBanner>
          )}
        </form>
      </Dialog>

      {/* Destructive Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(docToDelete)}
        onClose={() => !deleting && setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete document?"
        description={
          docToDelete
            ? `Are you sure you want to delete "${docToDelete.original_name}"? This permanently removes the PDF file, its ${docToDelete.chunk_count} extracted text sections, vector embeddings, and any courses or exam plans generated from this document.`
            : ""
        }
        confirmLabel="Delete permanently"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
