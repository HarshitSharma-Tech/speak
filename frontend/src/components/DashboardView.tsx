"use client";

import React, { useState, useRef, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Upload,
  BookOpen,
  Calendar,
  Mic,
  ArrowRight,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  Video,
  Play,
  Pause,
  X,
  Sparkles,
  Building2,
  Gauge,
  Code2,
  Timer,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { usePrepState, EMPTY_PREP_STATE } from "@/lib/prepStore";
import { computeReadiness } from "@/lib/readiness";
import {
  PageHeader,
  Card,
  Badge,
  ErrorState,
  Skeleton,
} from "@/components/ui";
import { api } from "@/lib/api";

export const DashboardView: React.FC = () => {
  const {
    documents,
    courses,
    sprints,
    interviews,
    loading,
    errors,
    refreshDocuments,
    refreshCourses,
    refreshSprints,
    refreshInterviews,
    notify,
  } = useWorkspace();

  const isEmptyAccount =
    !loading &&
    !errors.documents &&
    !errors.courses &&
    !errors.sprints &&
    !errors.interviews &&
    documents.length === 0 &&
    courses.length === 0 &&
    sprints.length === 0 &&
    interviews.length === 0;

  const latestCourse = courses[0] || null;
  const activeSprint = sprints[0] || null;
  const upcomingTasks =
    activeSprint?.tasks.filter((t) => !t.is_completed).slice(0, 3) || [];

  const [showAmbience, setShowAmbience] = useState(false);
  const [ambientPlaying, setAmbientPlaying] = useState(true);
  const ambientVideoRef = useRef<HTMLVideoElement>(null);

  const toggleAmbientPlay = () => {
    if (!ambientVideoRef.current) return;
    if (ambientPlaying) {
      ambientVideoRef.current.pause();
      setAmbientPlaying(false);
    } else {
      ambientVideoRef.current.play().catch(() => {});
      setAmbientPlaying(true);
    }
  };

  const handleToggleQuickTask = async (
    sprintId: string,
    taskId: string,
    currentCompleted: boolean
  ) => {
    try {
      await api.toggleSprintTask(sprintId, taskId, !currentCompleted);
      await refreshSprints();
      notify(
        "success",
        !currentCompleted ? "Task marked as completed." : "Task reopened."
      );
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not update task status."
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="pb-6 border-b border-[#E2E7ED] space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-56" />
          <Skeleton className="lg:col-span-5 h-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Resume your recent courses, check upcoming exam tasks, or upload new study material."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAmbience(!showAmbience)}
              className={`inline-flex items-center justify-center h-10 px-3.5 rounded-lg border text-xs font-medium transition-colors gap-2 cursor-pointer ${
                showAmbience
                  ? "bg-[#1D4ED8] border-[#1D4ED8] text-white"
                  : "bg-white border-[#E2E7ED] hover:bg-[#F7F8FA] text-[#17212B]"
              }`}
            >
              <Video className="h-4 w-4 text-amber-500" />
              <span>{showAmbience ? "Hide ambience" : "Study ambience"}</span>
            </button>
            <Link
              href="/app/documents"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-medium transition-colors shadow-xs gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload PDF</span>
            </Link>
          </div>
        }
      />

      {/* Optional Serene Study Ambience Video Banner */}
      {showAmbience && (
        <div className="relative rounded-2xl overflow-hidden border border-[#E2E7ED] bg-[#0E1318] shadow-lg animate-in fade-in duration-300">
          <div className="p-4 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold">Study Ambience — Serene Library Loop</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAmbientPlay}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors flex items-center gap-1.5 px-2.5 cursor-pointer"
              >
                {ambientPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Play</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAmbience(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close ambient video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative h-64 sm:h-80 w-full overflow-hidden">
            <video
              ref={ambientVideoRef}
              src="/media/study-ambient.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
              <span className="font-mono text-sky-400">Deep focus mode active</span>
              <span className="text-zinc-300 italic hidden sm:inline">Calm visual environment for focused study</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty Account Onboarding Sequence */}
      {isEmptyAccount ? (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="max-w-xl space-y-2">
            <Badge variant="brand">Getting started</Badge>
            <h2 className="text-xl font-bold text-[#17212B]">
              Welcome to your study workspace
            </h2>
            <p className="text-sm text-[#526170] leading-relaxed">
              You have not uploaded any PDF documents yet. Start by adding a textbook, lecture notes, past question paper, or resume to unlock courses, exam schedules, and mock interviews.
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <li className="p-5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-mono-code font-semibold text-[#1D4ED8]">
                  Step 1 (Recommended first step)
                </span>
                <h3 className="text-sm font-bold text-[#17212B]">
                  Upload a PDF document
                </h3>
                <p className="text-xs text-[#526170] leading-relaxed">
                  Add a textbook, past exam paper, or resume (up to 50 MB).
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/app/documents"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  <span>Go to Documents</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>

            <li className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-mono-code font-semibold text-[#526170]">
                  Step 2
                </span>
                <h3 className="text-sm font-bold text-[#17212B]">
                  Generate a course or exam plan
                </h3>
                <p className="text-xs text-[#526170] leading-relaxed">
                  Turn your uploaded PDF into structured modules, a formula cheat sheet, or a daily exam study schedule.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/app/courses"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#526170] hover:text-[#17212B]"
                >
                  <span>Explore Courses</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>

            <li className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-mono-code font-semibold text-[#526170]">
                  Step 3
                </span>
                <h3 className="text-sm font-bold text-[#17212B]">
                  Practice quizzes or interviews
                </h3>
                <p className="text-xs text-[#526170] leading-relaxed">
                  Test your comprehension with 5-question cited quizzes or run a role-focused mock interview.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/app/interviews"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#526170] hover:text-[#17212B]"
                >
                  <span>Start Interview Practice</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          </ol>
        </Card>
      ) : (
        <>
          {/* Primary Row: Continue Course & Upcoming Exam Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left (7 cols): Continue Studying Course */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#17212B] flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Continue studying</span>
                </h2>
                {courses.length > 0 && (
                  <Link
                    href="/app/courses"
                    className="text-xs font-medium text-[#1D4ED8] hover:underline flex items-center gap-1"
                  >
                    <span>All courses ({courses.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {errors.courses ? (
                <ErrorState
                  title="Could not load courses"
                  message={errors.courses}
                  onRetry={refreshCourses}
                />
              ) : latestCourse ? (
                <Card className="p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="brand">
                          {latestCourse.modules?.length || 0} modules
                        </Badge>
                        {latestCourse.cheat_sheets?.length > 0 && (
                          <Badge variant="default">Cheat sheet ready</Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-[#17212B] pt-1">
                        {latestCourse.title}
                      </h3>
                      {latestCourse.description && (
                        <p className="text-xs text-[#526170] leading-relaxed line-clamp-2">
                          {latestCourse.description}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/app/courses/${latestCourse.id}`}
                      className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium transition-colors gap-1.5 shrink-0"
                    >
                      <span>Resume course</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {latestCourse.modules?.length > 0 && (
                    <div className="pt-4 border-t border-[#E2E7ED] space-y-2">
                      <span className="text-xs font-medium text-[#526170] block">
                        Course modules
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {latestCourse.modules.slice(0, 4).map((m) => (
                          <Link
                            key={m.id}
                            href={`/app/courses/${latestCourse.id}?module=${m.id}`}
                            className="p-3 rounded-lg bg-[#F7F8FA] hover:bg-[#EFF6FF] border border-[#E2E7ED] hover:border-[#BFDBFE] transition-colors flex items-center justify-between gap-2 group"
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] font-mono-code text-[#64748B] block">
                                Module {m.module_order}
                              </span>
                              <span className="text-xs font-medium text-[#17212B] group-hover:text-[#1D4ED8] truncate block">
                                {m.title}
                              </span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#1D4ED8] shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="p-6 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#17212B]">
                      No courses generated yet
                    </h3>
                    <p className="text-xs text-[#526170] leading-relaxed">
                      {documents.length > 0
                        ? "You have uploaded PDF documents ready to be converted into structured courses."
                        : "Upload a textbook or study notes PDF to generate a course with modules and quizzes."}
                    </p>
                  </div>
                  <div>
                    <Link
                      href={documents.length > 0 ? "/app/courses" : "/app/documents"}
                      className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>
                        {documents.length > 0 ? "Create a course" : "Upload a PDF"}
                      </span>
                    </Link>
                  </div>
                </Card>
              )}
            </div>

            {/* Right (5 cols): Upcoming Exam Plan & Task Progress */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#17212B] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Upcoming exam plan</span>
                </h2>
                {sprints.length > 0 && (
                  <Link
                    href="/app/sprints"
                    className="text-xs font-medium text-[#1D4ED8] hover:underline flex items-center gap-1"
                  >
                    <span>All plans ({sprints.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {errors.sprints ? (
                <ErrorState
                  title="Could not load exam plans"
                  message={errors.sprints}
                  onRetry={refreshSprints}
                />
              ) : activeSprint ? (
                <Card className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Badge variant="amber">
                        Exam: {new Date(activeSprint.exam_date).toLocaleDateString()}
                      </Badge>
                      <h3 className="text-base font-bold text-[#17212B] pt-0.5">
                        {activeSprint.title}
                      </h3>
                    </div>
                    <Link
                      href={`/app/sprints/${activeSprint.id}`}
                      className="text-xs font-semibold text-[#1D4ED8] hover:underline shrink-0"
                    >
                      Open plan &rarr;
                    </Link>
                  </div>

                  {/* Real Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#526170]">
                        {activeSprint.completed_tasks_count} of{" "}
                        {activeSprint.tasks.length} tasks completed
                      </span>
                      <span className="font-mono-code font-semibold text-[#17212B]">
                        {activeSprint.progress_percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F1F4F8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1D4ED8] rounded-full transition-all"
                        style={{ width: `${activeSprint.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Next Pending Tasks */}
                  {upcomingTasks.length > 0 ? (
                    <div className="pt-2 space-y-2">
                      <span className="text-xs font-medium text-[#526170] block">
                        Next scheduled tasks
                      </span>
                      <div className="space-y-2">
                        {upcomingTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E7ED] flex items-start justify-between gap-2.5"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleQuickTask(
                                  activeSprint.id,
                                  task.id,
                                  task.is_completed
                                )
                              }
                              className="flex items-start gap-2.5 text-left group min-w-0 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4 text-[#64748B] group-hover:text-[#1D4ED8] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-xs font-medium text-[#17212B] group-hover:text-[#1D4ED8] block truncate">
                                  {task.title}
                                </span>
                                <span className="text-[11px] text-[#526170]">
                                  Day {task.day_number} &bull; {task.task_type}
                                </span>
                              </div>
                            </button>
                            <span className="text-[11px] font-mono-code text-[#64748B] shrink-0 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimated_minutes}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>All scheduled tasks in this plan are complete.</span>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="p-6 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#17212B]">
                      No exam plans scheduled
                    </h3>
                    <p className="text-xs text-[#526170] leading-relaxed">
                      Build a daily preparation checklist prioritized by past question paper frequency and textbook match.
                    </p>
                  </div>
                  <div>
                    <Link
                      href="/app/sprints"
                      className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#F1F4F8] hover:bg-[#E2E7ED] text-[#17212B] text-xs font-medium gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create exam plan</span>
                    </Link>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Secondary Row: Recent Documents & Interview Practice Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left (7 cols): Recent Documents */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#17212B] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Recent documents</span>
                </h2>
                <Link
                  href="/app/documents"
                  className="text-xs font-medium text-[#1D4ED8] hover:underline flex items-center gap-1"
                >
                  <span>Manage library ({documents.length})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {errors.documents ? (
                <ErrorState
                  title="Could not load documents"
                  message={errors.documents}
                  onRetry={refreshDocuments}
                />
              ) : documents.length > 0 ? (
                <Card className="divide-y divide-[#E2E7ED] overflow-hidden">
                  {documents.slice(0, 4).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8FA] transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <h3 className="text-sm font-semibold text-[#17212B] truncate">
                            {doc.original_name}
                          </h3>
                          <p className="text-xs text-[#526170]">
                            <span className="capitalize">
                              {doc.file_type === "pyq"
                                ? "Question paper"
                                : doc.file_type}
                            </span>{" "}
                            &bull; {doc.page_count} pages &bull; {doc.chunk_count}{" "}
                            text sections
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/app/documents"
                        className="text-xs font-medium text-[#1D4ED8] hover:underline shrink-0 self-end sm:self-center"
                      >
                        View in library
                      </Link>
                    </div>
                  ))}
                </Card>
              ) : (
                <Card className="p-6 text-xs text-[#526170] flex items-center justify-between gap-4">
                  <span>No PDF documents uploaded yet.</span>
                  <Link
                    href="/app/documents"
                    className="font-semibold text-[#1D4ED8] hover:underline shrink-0"
                  >
                    Upload PDF &rarr;
                  </Link>
                </Card>
              )}
            </div>

            {/* Right (5 cols): Interview Practice Sessions */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#17212B] flex items-center gap-2">
                  <Mic className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Interview practice</span>
                </h2>
                <Link
                  href="/app/interviews"
                  className="text-xs font-medium text-[#1D4ED8] hover:underline flex items-center gap-1"
                >
                  <span>Practice studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {errors.interviews ? (
                <ErrorState
                  title="Could not load interview sessions"
                  message={errors.interviews}
                  onRetry={refreshInterviews}
                />
              ) : interviews.length > 0 ? (
                <Card className="divide-y divide-[#E2E7ED] overflow-hidden">
                  {interviews.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-[#F7F8FA] transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#17212B] truncate">
                            {session.job_title}
                          </span>
                          <Badge
                            variant={
                              session.state === "COMPLETED" ? "success" : "brand"
                            }
                          >
                            {session.state === "COMPLETED"
                              ? session.report
                                ? `${session.report.overall_score}% score`
                                : "Completed"
                              : `Q${session.current_question_index}/${session.total_target_questions}`}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#526170]">
                          {new Date(session.created_at).toLocaleDateString()} &bull;{" "}
                          {session.total_target_questions} questions
                        </p>
                      </div>
                      <Link
                        href={`/app/interviews?session=${session.id}`}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline shrink-0"
                      >
                        {session.state === "COMPLETED" ? "Report" : "Resume"} &rarr;
                      </Link>
                    </div>
                  ))}
                </Card>
              ) : (
                <Card className="p-6 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#17212B]">
                      No practice interviews yet
                    </h3>
                    <p className="text-xs text-[#526170] leading-relaxed">
                      Practice answering role-specific technical questions using voice dictation or typed responses.
                    </p>
                  </div>
                  <div>
                    <Link
                      href="/app/interviews"
                      className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#F1F4F8] hover:bg-[#E2E7ED] text-[#17212B] text-xs font-medium gap-1.5"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Start interview session</span>
                    </Link>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* Company PYQs Quick Action Banner */}
      <Card className="overflow-hidden border-[#E2E7ED]">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center">
          <div className="md:col-span-4 relative h-44 md:h-full min-h-[160px]">
            <Image
              src="/media/photo-coding-prep.jpg"
              alt="Preparing for company technical interview rounds"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/30 to-transparent" />
          </div>
          <div className="md:col-span-8 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="amber">2025 hiring season</Badge>
                <span className="text-xs font-medium text-[#526170]">
                  12 companies &bull; 130+ questions
                </span>
              </div>
              <h3 className="text-base font-bold text-[#17212B] flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#1D4ED8]" />
                <span>Company PYQs &amp; Interview Preparation</span>
              </h3>
              <p className="text-xs text-[#526170] leading-relaxed">
                Practice last year&apos;s DSA, System Design, SQL, Aptitude, and behavioral rounds for Google, Amazon, Microsoft, TCS, Infosys, and more—with one-click mock interview launches.
              </p>
            </div>
            <Link
              href="/app/company-prep"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors gap-1.5 shrink-0"
            >
              <span>Browse Company PYQs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Compact Placement Readiness Card */}
      <DashboardReadinessCard interviews={interviews} />
    </div>
  );
};

function subscribeNoop() {
  return () => {};
}

const DashboardReadinessCard: React.FC<{
  interviews: ReturnType<typeof useWorkspace>["interviews"];
}> = ({ interviews }) => {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const prepState = usePrepState();
  const readiness = useMemo(
    () =>
      computeReadiness(
        hydrated ? prepState : EMPTY_PREP_STATE,
        hydrated ? interviews : []
      ),
    [hydrated, prepState, interviews]
  );

  return (
    <Card className="p-5 sm:p-6 border-[#E2E7ED] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div className="flex items-start sm:items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex flex-col items-center justify-center shrink-0">
          <span className="text-lg font-bold leading-none">
            {readiness.overall}%
          </span>
          <span className="text-[9px] font-mono-code uppercase mt-0.5">
            Ready
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-[#17212B] flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-[#1D4ED8]" />
              <span>Placement Readiness</span>
            </h3>
            <Badge
              variant={
                readiness.level === "Interview ready"
                  ? "success"
                  : readiness.level === "Building momentum"
                  ? "brand"
                  : "amber"
              }
            >
              {readiness.level}
            </Badge>
          </div>
          <p className="text-xs text-[#526170] leading-relaxed">
            {readiness.practicedCount}/{readiness.totalQuestions} PYQs practiced &bull;{" "}
            {readiness.solvedCodingCount}/{readiness.totalCodingCount} Coding Lab solved &bull;{" "}
            {readiness.mockCount} timed mock test(s)
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <Link
          href="/app/coding"
          className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#F1F4F8] hover:bg-[#E2E7ED] text-[#17212B] text-xs font-medium gap-1.5 transition-colors"
        >
          <Code2 className="h-3.5 w-3.5 text-[#1D4ED8]" />
          <span>Coding Lab</span>
        </Link>
        <Link
          href="/app/company-prep/test"
          className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#F1F4F8] hover:bg-[#E2E7ED] text-[#17212B] text-xs font-medium gap-1.5 transition-colors"
        >
          <Timer className="h-3.5 w-3.5 text-[#1D4ED8]" />
          <span>Mock test</span>
        </Link>
        <Link
          href="/app/readiness"
          className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-xs font-semibold gap-1.5 transition-colors"
        >
          <span>View readiness</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
};
