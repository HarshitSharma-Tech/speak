"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Trash2,
  ArrowRight,
  Plus,
  ChevronRight,
  FileText,
  Upload,
} from "lucide-react";
import { CourseItem, QuizItem, api } from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import { QuizRunner } from "./QuizRunner";
import { CheatSheetView } from "./CheatSheetView";
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
  Select,
  Skeleton,
} from "@/components/ui";

/**
 * Renders inline markdown bold (**bold**) and inline code (`code`)
 */
function renderInlineText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[#17212B]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="font-mono-code text-xs px-1.5 py-0.5 rounded bg-[#F1F4F9] text-[#1D4ED8] border border-[#E2E7ED]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Formats module learning_content into readable paragraphs, headings, lists, and formula/code blocks
 * within a constrained reading width (max-w-[68ch]).
 */
function FormattedLearningContent({ content }: { content: string }) {
  if (!content) return null;
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="reading-prose space-y-4">
      {blocks.map((rawBlock, idx) => {
        const block = rawBlock.trim();
        if (!block) return null;

        // Heading detection
        if (block.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-base font-bold text-[#17212B] pt-2">
              {block.replace(/^###\s+/, "")}
            </h4>
          );
        }
        if (block.startsWith("## ") || block.startsWith("# ")) {
          return (
            <h3 key={idx} className="text-lg font-bold text-[#17212B] pt-3">
              {block.replace(/^#{1,2}\s+/, "")}
            </h3>
          );
        }
        if (
          /^\*\*[^*]+:?\*\*$/.test(block) &&
          !block.includes("\n") &&
          block.length < 90
        ) {
          return (
            <h4 key={idx} className="text-base font-bold text-[#17212B] pt-2">
              {block.replace(/^\*\*/, "").replace(/\*\*$/, "")}
            </h4>
          );
        }

        // Code block detection
        if (block.startsWith("```") && block.endsWith("```")) {
          const code = block.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
          return (
            <pre
              key={idx}
              className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] font-mono-code text-xs text-[#17212B] overflow-x-auto leading-relaxed"
            >
              <code>{code}</code>
            </pre>
          );
        }

        // Bullet or numbered list detection
        const lines = block.split("\n").map((l) => l.trim());
        const isBulletList =
          lines.length > 1 &&
          lines.every((l) => /^[-*•]\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1.5 text-[#17212B]">
              {lines.map((l, i) => (
                <li key={i} className="leading-relaxed">
                  {renderInlineText(l.replace(/^[-*•]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        const isNumberedList =
          lines.length > 1 &&
          lines.every((l) => /^\d+[.)]\s+/.test(l));
        if (isNumberedList) {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1.5 text-[#17212B]">
              {lines.map((l, i) => (
                <li key={i} className="leading-relaxed">
                  {renderInlineText(l.replace(/^\d+[.)]\s+/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        // Formula-like single line
        if (
          lines.length === 1 &&
          block.includes("=") &&
          block.length < 120 &&
          /[+\-*/^()]/.test(block)
        ) {
          return (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-[#FFFBEB]/60 border border-[#FDE68A] font-mono-code text-sm text-[#17212B]"
            >
              {block}
            </div>
          );
        }

        return (
          <p key={idx} className="text-[#17212B] leading-[1.75] whitespace-pre-line">
            {renderInlineText(block)}
          </p>
        );
      })}
    </div>
  );
}

/* ============================================================================
   COURSE DETAIL VIEW (/app/courses/[courseId])
============================================================================ */

export const CourseDetailView: React.FC<{ courseId: string }> = ({
  courseId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialModuleParam = searchParams.get("module");

  const {
    courses,
    loading: workspaceLoading,
    refreshCourses,
    notify,
    openCitation,
  } = useWorkspace();

  const [fetchedCourse, setFetchedCourse] = useState<CourseItem | null>(null);
  const [checkedCourseId, setCheckedCourseId] = useState<string | null>(null);

  const inContextCourse = courses.find((c) => c.id === courseId) || null;
  const course =
    inContextCourse ||
    (fetchedCourse?.id === courseId ? fetchedCourse : null);

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    initialModuleParam
  );
  const [subView, setSubView] = useState<"module" | "quiz" | "cheat_sheet">(
    "module"
  );
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (inContextCourse || workspaceLoading) return;
    let cancelled = false;
    api
      .getCourse(courseId)
      .then((data) => {
        if (cancelled) return;
        setFetchedCourse(data);
        setCheckedCourseId(courseId);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedCourse(null);
        setCheckedCourseId(courseId);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, inContextCourse, workspaceLoading]);

  const fetchingDetail =
    !inContextCourse && !workspaceLoading && checkedCourseId !== courseId;
  const notFound =
    !inContextCourse &&
    !workspaceLoading &&
    checkedCourseId === courseId &&
    !course;

  const currentModule =
    course?.modules.find((m) => m.id === selectedModuleId) ||
    course?.modules[0] ||
    null;

  const handleStartQuiz = async (moduleId: string) => {
    setLoadingQuiz(true);
    setQuizError(null);
    try {
      const quiz = await api.generateQuiz(moduleId);
      setActiveQuiz(quiz);
      setSubView("quiz");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setQuizError(
        err instanceof Error ? err.message : "Could not generate quiz."
      );
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;
    setDeleting(true);
    try {
      await api.deleteCourse(course.id);
      await refreshCourses();
      notify("success", `Deleted course "${course.title}".`);
      router.push("/app/courses");
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not delete course."
      );
      setDeleting(false);
    }
  };

  if (workspaceLoading || fetchingDetail) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-4 h-72" />
          <Skeleton className="lg:col-span-8 h-96" />
        </div>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Course not found"
          breadcrumbs={[
            { label: "Courses", href: "/app/courses" },
            { label: "Not found" },
          ]}
        />
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="This course is unavailable or was deleted"
          description="The course ID in the link could not be found. Return to the courses catalog to open an existing course or generate a new one."
          action={
            <Link
              href="/app/courses"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-medium"
            >
              Back to Courses
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={course.title}
        description={course.description}
        breadcrumbs={[
          { label: "Courses", href: "/app/courses" },
          { label: course.title },
        ]}
        badge={<Badge variant="brand">{course.modules.length} modules</Badge>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {course.cheat_sheets[0] && (
              <Button
                variant={subView === "cheat_sheet" ? "primary" : "outline"}
                size="sm"
                onClick={() =>
                  setSubView(
                    subView === "cheat_sheet" ? "module" : "cheat_sheet"
                  )
                }
                icon={<FileText className="h-4 w-4" />}
              >
                {subView === "cheat_sheet"
                  ? "View module notes"
                  : "Revision cheat sheet"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              icon={<Trash2 className="h-4 w-4 text-[#B91C1C]" />}
              title="Delete course"
            >
              Delete
            </Button>
          </div>
        }
      />

      {quizError && (
        <InlineBanner
          variant="error"
          title="Could not generate quiz"
          onDismiss={() => setQuizError(null)}
        >
          {quizError}
        </InlineBanner>
      )}

      {subView === "quiz" && activeQuiz ? (
        <QuizRunner
          quiz={activeQuiz}
          courseId={course.id}
          onOpenSourceCitation={(chunkId) => openCitation(chunkId, course.id)}
          onRetake={() => handleStartQuiz(activeQuiz.module_id)}
          onClose={() => setSubView("module")}
        />
      ) : subView === "cheat_sheet" && course.cheat_sheets[0] ? (
        <CheatSheetView
          cheatSheet={course.cheat_sheets[0]}
          courseTitle={course.title}
          onOpenCitation={(chunkId) => openCitation(chunkId, course.id)}
          onBack={() => setSubView("module")}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Module Navigator (4 cols) */}
          <nav
            aria-label="Course modules"
            className="lg:col-span-4 space-y-3 lg:sticky lg:top-20"
          >
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#526170]">
                  Modules ({course.modules.length})
                </h2>
              </div>

              <div className="space-y-1.5">
                {course.modules.map((mod) => {
                  const isSelected = currentModule?.id === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setSelectedModuleId(mod.id);
                        setSubView("module");
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                        isSelected
                          ? "bg-[#EFF6FF] border-[#1D4ED8] text-[#17212B]"
                          : "bg-white border-[#E2E7ED] hover:bg-[#F7F8FA] text-[#526170]"
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <span
                          className={`text-[11px] font-mono-code font-semibold block ${
                            isSelected ? "text-[#1D4ED8]" : "text-[#64748B]"
                          }`}
                        >
                          Module {mod.module_order}
                        </span>
                        <span className="text-xs font-semibold text-[#17212B] truncate block">
                          {mod.title}
                        </span>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? "text-[#1D4ED8]" : "text-[#64748B]"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {course.cheat_sheets[0] && (
                <div className="pt-3 border-t border-[#E2E7ED]">
                  <button
                    type="button"
                    onClick={() => setSubView("cheat_sheet")}
                    className="w-full p-3 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] text-left flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-[#B45309] shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-[#17212B] block">
                          1-Page Cheat Sheet
                        </span>
                        <span className="text-[11px] text-[#B45309]">
                          Definitions, formulas & key points
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#B45309] shrink-0" />
                  </button>
                </div>
              )}
            </Card>
          </nav>

          {/* Right Reading Area (8 cols) */}
          <div className="lg:col-span-8">
            {currentModule ? (
              <Card className="p-6 sm:p-8 space-y-6">
                {/* Module Header & Quiz Trigger */}
                <div className="pb-5 border-b border-[#E2E7ED] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <Badge variant="brand">
                      Module {currentModule.module_order} of{" "}
                      {course.modules.length}
                    </Badge>
                    <h2 className="text-2xl font-bold text-[#17212B] tracking-tight pt-1">
                      {currentModule.title}
                    </h2>
                    {currentModule.summary && (
                      <p className="text-sm text-[#526170] leading-relaxed">
                        {currentModule.summary}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => handleStartQuiz(currentModule.id)}
                    loading={loadingQuiz}
                    icon={<HelpCircle className="h-4 w-4" />}
                  >
                    {loadingQuiz ? "Preparing quiz..." : "Take 5-question quiz"}
                  </Button>
                </div>

                {/* Key Topics Chips */}
                {currentModule.key_topics?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-[#526170] block">
                      Key topics covered
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentModule.key_topics.map((topic, idx) => (
                        <Badge key={idx} variant="default">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constrained Long-form Reading Content */}
                <div className="pt-2">
                  <FormattedLearningContent
                    content={currentModule.learning_content}
                  />
                </div>

                {/* Grounded Source Citations Footer */}
                <div className="pt-6 border-t border-[#E2E7ED] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#17212B]">
                      <BookOpen className="h-4 w-4 text-[#1D4ED8]" />
                      <span>Textbook source references</span>
                    </div>
                    <p className="text-xs text-[#526170]">
                      Inspect the exact page and passage from your uploaded PDF.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {currentModule.source_chunk_ids?.length > 0 ? (
                      currentModule.source_chunk_ids
                        .slice(0, 4)
                        .map((chunkId, idx) => (
                          <Button
                            key={chunkId}
                            variant="outline"
                            size="sm"
                            onClick={() => openCitation(chunkId, course.id)}
                            icon={<BookOpen className="h-3.5 w-3.5 text-[#1D4ED8]" />}
                          >
                            Source passage #{idx + 1}
                          </Button>
                        ))
                    ) : (
                      <span className="text-xs text-[#64748B]">
                        Derived from uploaded document
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteCourse}
        title="Delete course?"
        description={`Are you sure you want to delete "${course.title}"? This removes its modules, cheat sheet, and generated quizzes. Your original uploaded PDF document will remain in Documents.`}
        confirmLabel="Delete course"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

/* ============================================================================
   COURSES CATALOG VIEW (/app/courses)
============================================================================ */

export const CoursesView: React.FC<{ selectedCourseId?: string | null }> = ({
  selectedCourseId,
}) => {
  const router = useRouter();
  const {
    courses,
    documents,
    loading,
    errors,
    refreshCourses,
    refreshAll,
    notify,
  } = useWorkspace();

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [courseTitleInput, setCourseTitleInput] = useState<string>("");
  const [moduleCountInput, setModuleCountInput] = useState<number>(4);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (selectedCourseId) {
    return <CourseDetailView courseId={selectedCourseId} />;
  }

  const handleLaunchGenerateModal = () => {
    const defaultDoc =
      documents.find((d) => d.file_type === "textbook") || documents[0];
    if (defaultDoc) {
      setSelectedDocId(defaultDoc.id);
      setCourseTitleInput(
        defaultDoc.original_name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ")
      );
    } else {
      setSelectedDocId("");
      setCourseTitleInput("");
    }
    setModuleCountInput(4);
    setGenerationError(null);
    setShowGenerateModal(true);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      setGenerationError("Please select an uploaded PDF document first.");
      return;
    }

    setGenerating(true);
    setGenerationError(null);

    try {
      const newCourse = await api.generateCourse(
        selectedDocId,
        courseTitleInput.trim() || undefined,
        moduleCountInput
      );
      await refreshAll();
      setShowGenerateModal(false);
      notify("success", `Course "${newCourse.title}" is ready.`);
      router.push(`/app/courses/${newCourse.id}`);
    } catch (err: unknown) {
      setGenerationError(
        err instanceof Error ? err.message : "Could not generate course."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      await api.deleteCourse(courseToDelete.id);
      await refreshCourses();
      notify("success", `Deleted course "${courseToDelete.title}".`);
      setCourseToDelete(null);
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not delete course."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Courses"
        description="Structured study courses generated from your uploaded textbooks and notes, complete with module summaries, cheat sheets, and cited quizzes."
        actions={
          <Button
            variant="primary"
            onClick={handleLaunchGenerateModal}
            icon={<Plus className="h-4 w-4" />}
          >
            Create course
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : errors.courses ? (
        <ErrorState
          title="Could not load courses"
          message={errors.courses}
          onRetry={refreshCourses}
        />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="No courses created yet"
          description={
            documents.length > 0
              ? "Select one of your uploaded PDF documents to generate structured modules, a 1-page formula cheat sheet, and 5-question quizzes."
              : "Upload a textbook or study notes PDF first, then generate a structured course from it."
          }
          action={
            documents.length > 0 ? (
              <Button
                variant="primary"
                onClick={handleLaunchGenerateModal}
                icon={<Plus className="h-4 w-4" />}
              >
                Create your first course
              </Button>
            ) : (
              <Link
                href="/app/documents"
                className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-medium gap-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload a PDF document</span>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map((c) => {
            const sourceDoc = documents.find((d) => d.id === c.document_id);
            return (
              <Card
                key={c.id}
                className="p-6 flex flex-col justify-between gap-5 hover:border-[#CBD5E1] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="brand">
                        {c.modules?.length || 0} modules
                      </Badge>
                      {c.cheat_sheets?.length > 0 && (
                        <Badge variant="amber">Cheat sheet included</Badge>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCourseToDelete(c)}
                      aria-label={`Delete course ${c.title}`}
                      title="Delete course"
                      className="p-1.5 rounded-lg text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-[#17212B]">
                      <Link
                        href={`/app/courses/${c.id}`}
                        className="hover:text-[#1D4ED8] transition-colors focus-visible:outline-none focus-visible:underline"
                      >
                        {c.title}
                      </Link>
                    </h2>
                    <p className="text-xs text-[#526170] line-clamp-2 leading-relaxed">
                      {c.description ||
                        "Structured study modules, revision cheat sheet, and cited 5-question quizzes."}
                    </p>
                  </div>

                  {sourceDoc && (
                    <div className="text-xs text-[#64748B] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        Source: {sourceDoc.original_name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#E2E7ED] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#64748B]">
                    Created {new Date(c.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/app/courses/${c.id}`}
                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium transition-colors gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2"
                  >
                    <span>Open course</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Course Modal */}
      <Dialog
        open={showGenerateModal}
        onClose={() => !generating && setShowGenerateModal(false)}
        title="Create course"
        description="Select an uploaded PDF document to generate study modules, a cheat sheet, and quizzes."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowGenerateModal(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="create-course-form"
              disabled={!selectedDocId}
              loading={generating}
            >
              {generating ? "Generating course..." : "Generate course"}
            </Button>
          </>
        }
      >
        {documents.length === 0 ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-[#526170]">
              You need at least one uploaded PDF document before generating a course.
            </p>
            <Link
              href="/app/documents"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-medium gap-2"
            >
              <Upload className="h-4 w-4" />
              <span>Go to Documents</span>
            </Link>
          </div>
        ) : (
          <form
            id="create-course-form"
            onSubmit={handleCreateCourse}
            className="space-y-4"
          >
            <FormField
              label="Source PDF document"
              htmlFor="course-doc-select"
              required
            >
              <Select
                id="course-doc-select"
                value={selectedDocId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedDocId(id);
                  const found = documents.find((d) => d.id === id);
                  if (found) {
                    setCourseTitleInput(
                      found.original_name
                        .replace(/\.pdf$/i, "")
                        .replace(/[_-]+/g, " ")
                    );
                  }
                }}
                disabled={generating}
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_name} ({d.page_count} pages)
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Course title"
              htmlFor="course-title-input"
              hint="Descriptive title for your course."
              required
            >
              <Input
                id="course-title-input"
                value={courseTitleInput}
                onChange={(e) => setCourseTitleInput(e.target.value)}
                placeholder="e.g. Computer Networks — Transport Layer"
                required
                disabled={generating}
              />
            </FormField>

            <FormField
              label={`Target number of modules: ${moduleCountInput}`}
              htmlFor="course-module-count"
              hint="Organizes the material into 2 to 8 progressive study modules."
            >
              <input
                id="course-module-count"
                type="range"
                min={2}
                max={8}
                value={moduleCountInput}
                onChange={(e) => setModuleCountInput(Number(e.target.value))}
                disabled={generating}
                className="w-full accent-[#1D4ED8] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#64748B] font-mono-code">
                <span>2 modules</span>
                <span>4 modules</span>
                <span>8 modules</span>
              </div>
            </FormField>

            {generationError && (
              <InlineBanner variant="error">{generationError}</InlineBanner>
            )}
          </form>
        )}
      </Dialog>

      {/* Delete Course Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(courseToDelete)}
        onClose={() => !deleting && setCourseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete course?"
        description={
          courseToDelete
            ? `Are you sure you want to delete "${courseToDelete.title}"? This removes its modules, cheat sheet, and quizzes. Your source PDF document will remain in Documents.`
            : ""
        }
        confirmLabel="Delete course"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
