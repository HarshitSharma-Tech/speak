"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  RotateCcw,
  BarChart3,
  Trash2,
  Plus,
  ArrowRight,
  Info,
  Upload,
  BookOpen,
} from "lucide-react";
import { SprintItem, api } from "@/lib/api";
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
  Select,
  Skeleton,
} from "@/components/ui";

type TaskFilterType =
  | "All"
  | "Topic Study"
  | "Revision"
  | "Practice Questions"
  | "Mock Test";

/* ============================================================================
   EXAM PLAN DETAIL VIEW (/app/sprints/[sprintId])
============================================================================ */

export const SprintDetailView: React.FC<{ sprintId: string }> = ({
  sprintId,
}) => {
  const router = useRouter();
  const {
    sprints,
    loading: workspaceLoading,
    refreshSprints,
    notify,
    openCitation,
  } = useWorkspace();

  const [fetchedSprint, setFetchedSprint] = useState<SprintItem | null>(null);
  const [checkedSprintId, setCheckedSprintId] = useState<string | null>(null);

  const inContextSprint = sprints.find((s) => s.id === sprintId) || null;
  const sprint =
    inContextSprint ||
    (fetchedSprint?.id === sprintId ? fetchedSprint : null);

  const [taskFilter, setTaskFilter] = useState<TaskFilterType>("All");
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  // Regeneration Modal State
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenDate, setRegenDate] = useState("");
  const [regenHours, setRegenHours] = useState(3.0);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (inContextSprint || workspaceLoading) return;
    let cancelled = false;
    api
      .getSprint(sprintId)
      .then((data) => {
        if (cancelled) return;
        setFetchedSprint(data);
        setCheckedSprintId(sprintId);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedSprint(null);
        setCheckedSprintId(sprintId);
      });
    return () => {
      cancelled = true;
    };
  }, [sprintId, inContextSprint, workspaceLoading]);

  const fetchingDetail =
    !inContextSprint && !workspaceLoading && checkedSprintId !== sprintId;
  const notFound =
    !inContextSprint &&
    !workspaceLoading &&
    checkedSprintId === sprintId &&
    !sprint;

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    if (!sprint) return;
    setTogglingTaskId(taskId);
    try {
      await api.toggleSprintTask(sprint.id, taskId, !currentStatus);
      await refreshSprints();
      if (fetchedSprint) {
        const updated = await api.getSprint(sprint.id);
        setFetchedSprint(updated);
      }
      notify(
        "success",
        !currentStatus ? "Task marked as completed." : "Task marked as incomplete."
      );
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not update task status."
      );
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleOpenRegenModal = () => {
    if (!sprint) return;
    setRegenDate(sprint.exam_date.split("T")[0]);
    setRegenHours(sprint.daily_study_hours);
    setRegenError(null);
    setShowRegenModal(true);
  };

  const handleRegenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprint) return;
    setRegenerating(true);
    setRegenError(null);

    try {
      const updated = await api.regenerateSprint(sprint.id, {
        exam_date: new Date(regenDate).toISOString(),
        daily_study_hours: regenHours,
      });
      await refreshSprints();
      setFetchedSprint(updated);
      setShowRegenModal(false);
      notify(
        "success",
        `Schedule regenerated. ${updated.completed_tasks_count} completed tasks were preserved.`
      );
    } catch (err: unknown) {
      setRegenError(
        err instanceof Error ? err.message : "Could not regenerate schedule."
      );
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteSprint = async () => {
    if (!sprint) return;
    setDeleting(true);
    try {
      await api.deleteSprint(sprint.id);
      await refreshSprints();
      notify("success", `Deleted exam plan "${sprint.title}".`);
      router.push("/app/sprints");
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not delete exam plan."
      );
      setDeleting(false);
    }
  };

  if (workspaceLoading || fetchingDetail) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (notFound || !sprint) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Exam plan not found"
          breadcrumbs={[
            { label: "Exam plans", href: "/app/sprints" },
            { label: "Not found" },
          ]}
        />
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="This exam plan is unavailable or was deleted"
          description="Return to the exam plans list to open an active schedule or create a new one."
          action={
            <Link
              href="/app/sprints"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-medium"
            >
              Back to Exam plans
            </Link>
          }
        />
      </div>
    );
  }

  const filteredTasks = sprint.tasks.filter(
    (t) => taskFilter === "All" || t.task_type === taskFilter
  );

  const allCompleted =
    sprint.tasks.length > 0 &&
    sprint.completed_tasks_count === sprint.tasks.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={sprint.title}
        description={`Target exam date: ${new Date(
          sprint.exam_date
        ).toLocaleDateString()} • ${sprint.daily_study_hours} hours/day allocation`}
        breadcrumbs={[
          { label: "Exam plans", href: "/app/sprints" },
          { label: sprint.title },
        ]}
        badge={
          <Badge variant={allCompleted ? "success" : "brand"}>
            {sprint.progress_percentage}% complete
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenRegenModal}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Adjust schedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              icon={<Trash2 className="h-3.5 w-3.5 text-[#B91C1C]" />}
              title="Delete exam plan"
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* Progress Summary Card */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#17212B]">
              Preparation progress
            </h2>
            <p className="text-xs text-[#526170]">
              {sprint.completed_tasks_count} of {sprint.tasks.length} scheduled
              study tasks completed across {sprint.total_days} study days.
            </p>
          </div>
          <span className="font-mono-code text-lg font-bold text-[#1D4ED8]">
            {sprint.progress_percentage}%
          </span>
        </div>

        <div className="w-full h-2.5 bg-[#F1F4F8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1D4ED8] rounded-full transition-all duration-300"
            style={{ width: `${sprint.progress_percentage}%` }}
          />
        </div>

        {allCompleted && (
          <InlineBanner variant="success" title="All scheduled tasks completed">
            You have completed every task in this exam preparation schedule. You can still review individual topics or adjust the schedule if your exam date changes.
          </InlineBanner>
        )}
      </Card>

      {/* Section 1: Daily Preparation Agenda */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#17212B] flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#1D4ED8]" />
              <span>Daily study agenda ({filteredTasks.length})</span>
            </h2>
            <p className="text-xs text-[#526170]">
              Check off tasks as you finish them. Completed tasks are preserved if you regenerate the schedule.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter tasks by type"
            className="flex flex-wrap gap-1.5"
          >
            {(
              [
                "All",
                "Topic Study",
                "Revision",
                "Practice Questions",
                "Mock Test",
              ] as const
            ).map((filter) => {
              const active = taskFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTaskFilter(filter)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                    active
                      ? "bg-[#1D4ED8] text-white"
                      : "bg-white border border-[#E2E7ED] text-[#526170] hover:text-[#17212B]"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[#526170]">
            No tasks match the selected filter ({taskFilter}).
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTasks.map((tk) => {
              const isCompleted = tk.is_completed;
              const isUpdating = togglingTaskId === tk.id;
              const taskDate = new Date(tk.scheduled_date).toLocaleDateString(
                undefined,
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }
              );

              const typeBadgeVariant: Record<
                string,
                "brand" | "amber" | "default" | "success"
              > = {
                "Topic Study": "brand",
                Revision: "default",
                "Practice Questions": "amber",
                "Mock Test": "success",
              };

              return (
                <Card
                  key={tk.id}
                  className={`p-4 transition-colors ${
                    isCompleted ? "bg-[#F7F8FA]" : "bg-white hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleTask(tk.id, isCompleted)}
                      aria-pressed={isCompleted}
                      className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-lg"
                    >
                      <span
                        className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isCompleted
                            ? "bg-[#15803D] border-[#15803D] text-white"
                            : "bg-white border-[#CBD5E1] text-transparent hover:border-[#1D4ED8]"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono-code font-semibold text-[#526170]">
                            Day {tk.day_number} &bull; {taskDate}
                          </span>
                          <Badge
                            variant={typeBadgeVariant[tk.task_type] || "default"}
                          >
                            {tk.task_type}
                          </Badge>
                        </div>

                        <h3
                          className={`text-sm font-semibold leading-snug ${
                            isCompleted
                              ? "line-through text-[#64748B]"
                              : "text-[#17212B]"
                          }`}
                        >
                          {tk.title}
                        </h3>

                        {tk.description && (
                          <p className="text-xs text-[#526170] leading-relaxed">
                            {tk.description}
                          </p>
                        )}
                      </div>
                    </button>

                    <span className="text-xs font-mono-code text-[#64748B] flex items-center gap-1 shrink-0 pt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      {tk.estimated_minutes}m
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Topic Priority, Observed Frequency, and Textbook Match */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-base font-bold text-[#17212B] flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#1D4ED8]" />
              <span>Topic priority & syllabus breakdown</span>
            </h2>
            <p className="text-xs text-[#526170] leading-relaxed">
              Each topic is ranked by combining its <strong>observed question frequency</strong> (how many times it appeared in your uploaded past papers) and its <strong>textbook match confidence</strong> (semantic similarity to your textbook chapters).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#B45309] flex items-start gap-2 max-w-md">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Note on priority rankings:</strong> Observed frequency reflects recurring emphasis in past papers, not a guaranteed prediction of future exam questions.
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-[#E2E7ED] text-[#526170] bg-[#F7F8FA]">
                <th className="py-3 px-3 font-semibold">Priority rank</th>
                <th className="py-3 px-3 font-semibold">Topic</th>
                <th className="py-3 px-3 font-semibold">
                  Observed question frequency
                </th>
                <th className="py-3 px-3 font-semibold">
                  Textbook match confidence
                </th>
                <th className="py-3 px-3 font-semibold">Rationale & source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E7ED]">
              {sprint.topics.map((t) => {
                const priorityVariant =
                  t.priority_level === "High"
                    ? "amber"
                    : t.priority_level === "Medium"
                    ? "brand"
                    : "default";

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-[#F7F8FA] transition-colors"
                  >
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code font-bold text-[#17212B]">
                          #{t.priority_rank}
                        </span>
                        <Badge variant={priorityVariant}>
                          {t.priority_level}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-[#17212B]">
                      {t.name}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[#F1F4F8] text-[#17212B] font-mono-code">
                        {t.observed_frequency}{" "}
                        {t.observed_frequency === 1 ? "occurrence" : "occurrences"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-mono-code font-semibold text-[#1D4ED8]">
                        {Math.round(t.similarity_confidence * 100)}% match
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[#526170] max-w-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate" title={t.calculation_notes}>
                          {t.calculation_notes ||
                            "Weighted by observed frequency and textbook similarity."}
                        </span>
                        {t.source_chunk_ids?.[0] && (
                          <button
                            type="button"
                            onClick={() => openCitation(t.source_chunk_ids[0])}
                            className="text-[#1D4ED8] font-medium hover:underline shrink-0 cursor-pointer"
                          >
                            Source
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Regenerate Schedule Modal (With Clear Explanation Before Submission) */}
      <Dialog
        open={showRegenModal}
        onClose={() => !regenerating && setShowRegenModal(false)}
        title="Adjust & regenerate schedule"
        description="Update your target exam date or daily study hours."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowRegenModal(false)}
              disabled={regenerating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="regen-sprint-form"
              loading={regenerating}
            >
              {regenerating ? "Recalibrating..." : "Regenerate schedule"}
            </Button>
          </>
        }
      >
        <form
          id="regen-sprint-form"
          onSubmit={handleRegenerateSubmit}
          className="space-y-4"
        >
          <InlineBanner variant="info" title="What happens when you regenerate">
            Your <strong>{sprint.completed_tasks_count} completed tasks</strong>{" "}
            and completion history are strictly preserved. All remaining
            incomplete tasks will be recalculated and redistributed between today
            and your updated exam date.
          </InlineBanner>

          <FormField
            label="Updated exam date"
            htmlFor="regen-exam-date"
            required
          >
            <Input
              id="regen-exam-date"
              type="date"
              value={regenDate}
              onChange={(e) => setRegenDate(e.target.value)}
              required
              disabled={regenerating}
            />
          </FormField>

          <FormField
            label={`Daily study hours: ${regenHours} hours/day`}
            htmlFor="regen-daily-hours"
          >
            <input
              id="regen-daily-hours"
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={regenHours}
              onChange={(e) => setRegenHours( parseFloat(e.target.value) )}
              disabled={regenerating}
              className="w-full accent-[#1D4ED8] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#64748B] font-mono-code">
              <span>1 hr/day</span>
              <span>4 hrs/day</span>
              <span>8 hrs/day</span>
            </div>
          </FormField>

          {regenError && <InlineBanner variant="error">{regenError}</InlineBanner>}
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteSprint}
        title="Delete exam plan?"
        description={`Are you sure you want to delete "${sprint.title}"? This removes the topic rankings and task checklist. Your uploaded PDF documents will remain untouched.`}
        confirmLabel="Delete exam plan"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

/* ============================================================================
   EXAM PLANS LIST & CREATION VIEW (/app/sprints)
============================================================================ */

export const SprintView: React.FC<{ selectedSprintId?: string | null }> = ({
  selectedSprintId,
}) => {
  const router = useRouter();
  const {
    sprints,
    documents,
    loading,
    errors,
    refreshSprints,
    notify,
  } = useWorkspace();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sprintTitle, setSprintTitle] = useState("");
  const [textbookId, setTextbookId] = useState("");
  const [pyqId, setPyqId] = useState("");
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split("T")[0];
  });
  const [dailyHours, setDailyHours] = useState(3.0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [sprintToDelete, setSprintToDelete] = useState<SprintItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (selectedSprintId) {
    return <SprintDetailView sprintId={selectedSprintId} />;
  }

  const handleOpenCreateModal = () => {
    const tb =
      documents.find((d) => d.file_type === "textbook") || documents[0];
    const pyq = documents.find((d) => d.file_type === "pyq");
    setTextbookId(tb?.id || "");
    setPyqId(pyq?.id || "");
    setSprintTitle(
      tb
        ? `${tb.original_name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ")} Exam Plan`
        : "Final Exam Preparation Plan"
    );
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleCreateSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textbookId) {
      setCreateError("Please select an uploaded textbook or notes PDF.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const created = await api.createSprint({
        title: sprintTitle.trim() || "Exam Preparation Plan",
        textbook_document_id: textbookId,
        pyq_document_id: pyqId || undefined,
        exam_date: new Date(examDate).toISOString(),
        daily_study_hours: dailyHours,
      });
      await refreshSprints();
      setShowCreateModal(false);
      notify("success", `Created exam plan "${created.title}".`);
      router.push(`/app/sprints/${created.id}`);
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Could not create exam plan."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!sprintToDelete) return;
    setDeleting(true);
    try {
      await api.deleteSprint(sprintToDelete.id);
      await refreshSprints();
      notify("success", `Deleted exam plan "${sprintToDelete.title}".`);
      setSprintToDelete(null);
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Could not delete exam plan."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Exam plans"
        description="Build a day-by-day preparation schedule ranked by observed question frequency in past papers and semantic match against your textbook."
        actions={
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            icon={<Plus className="h-4 w-4" />}
          >
            Create exam plan
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : errors.sprints ? (
        <ErrorState
          title="Could not load exam plans"
          message={errors.sprints}
          onRetry={refreshSprints}
        />
      ) : sprints.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No exam plans created yet"
          description={
            documents.length > 0
              ? "Select a textbook PDF and an optional past question paper (PYQ) to rank topics and generate a daily checklist until your exam date."
              : "Upload a textbook PDF in Documents first, then create your daily exam plan here."
          }
          action={
            documents.length > 0 ? (
              <Button
                variant="primary"
                onClick={handleOpenCreateModal}
                icon={<Plus className="h-4 w-4" />}
              >
                Create your first exam plan
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
          {sprints.map((s) => {
            const tbDoc = documents.find(
              (d) => d.id === s.textbook_document_id
            );
            return (
              <Card
                key={s.id}
                className="p-6 flex flex-col justify-between gap-5 hover:border-[#CBD5E1] transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="amber">
                        Exam: {new Date(s.exam_date).toLocaleDateString()}
                      </Badge>
                      <Badge variant="default">
                        {s.daily_study_hours} hrs/day
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSprintToDelete(s)}
                      aria-label={`Delete exam plan ${s.title}`}
                      title="Delete exam plan"
                      className="p-1.5 rounded-lg text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-[#17212B]">
                      <Link
                        href={`/app/sprints/${s.id}`}
                        className="hover:text-[#1D4ED8] transition-colors focus-visible:outline-none focus-visible:underline"
                      >
                        {s.title}
                      </Link>
                    </h2>
                    {tbDoc && (
                      <p className="text-xs text-[#526170] flex items-center gap-1.5 truncate">
                        <BookOpen className="h-3.5 w-3.5 text-[#1D4ED8] shrink-0" />
                        <span className="truncate">
                          Textbook: {tbDoc.original_name}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#526170]">
                        {s.completed_tasks_count} of {s.tasks.length} tasks
                        completed ({s.topics.length} ranked topics)
                      </span>
                      <span className="font-mono-code font-semibold text-[#17212B]">
                        {s.progress_percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F1F4F8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1D4ED8] rounded-full"
                        style={{ width: `${s.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E7ED] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#64748B]">
                    {s.total_days} scheduled days
                  </span>
                  <Link
                    href={`/app/sprints/${s.id}`}
                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium transition-colors gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2"
                  >
                    <span>Open schedule</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Exam Plan Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => !creating && setShowCreateModal(false)}
        title="Create exam plan"
        description="Rank syllabus topics and build a daily study checklist up to your exam date."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="create-sprint-form"
              disabled={!textbookId}
              loading={creating}
            >
              {creating ? "Building schedule..." : "Create exam plan"}
            </Button>
          </>
        }
      >
        {documents.length === 0 ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-[#526170]">
              Please upload a textbook or notes PDF before creating an exam plan.
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
            id="create-sprint-form"
            onSubmit={handleCreateSprintSubmit}
            className="space-y-4"
          >
            <FormField
              label="Plan title"
              htmlFor="sprint-title-input"
              required
            >
              <Input
                id="sprint-title-input"
                value={sprintTitle}
                onChange={(e) => setSprintTitle(e.target.value)}
                placeholder="e.g. Algorithms Midterm Plan"
                required
                disabled={creating}
              />
            </FormField>

            <FormField
              label="Textbook or study notes PDF"
              htmlFor="sprint-textbook-select"
              hint="Primary syllabus source used to match and schedule topics."
              required
            >
              <Select
                id="sprint-textbook-select"
                value={textbookId}
                onChange={(e) => setTextbookId(e.target.value)}
                disabled={creating}
              >
                <option value="">Select an uploaded document</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_name} ({d.file_type})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Past question paper PDF (optional)"
              htmlFor="sprint-pyq-select"
              hint="If provided, observed question frequency is calculated from this paper."
            >
              <Select
                id="sprint-pyq-select"
                value={pyqId}
                onChange={(e) => setPyqId(e.target.value)}
                disabled={creating}
              >
                <option value="">None — rank from textbook structure only</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_name} ({d.file_type})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Target exam date"
              htmlFor="sprint-exam-date"
              required
            >
              <Input
                id="sprint-exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                required
                disabled={creating}
              />
            </FormField>

            <FormField
              label={`Daily study hours: ${dailyHours} hours/day`}
              htmlFor="sprint-daily-hours"
            >
              <input
                id="sprint-daily-hours"
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={dailyHours}
                onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                disabled={creating}
                className="w-full accent-[#1D4ED8] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#64748B] font-mono-code">
                <span>1 hr/day</span>
                <span>4 hrs/day</span>
                <span>8 hrs/day</span>
              </div>
            </FormField>

            {createError && (
              <InlineBanner variant="error">{createError}</InlineBanner>
            )}
          </form>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(sprintToDelete)}
        onClose={() => !deleting && setSprintToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete exam plan?"
        description={
          sprintToDelete
            ? `Are you sure you want to delete "${sprintToDelete.title}"? This removes the topic rankings and task checklist.`
            : ""
        }
        confirmLabel="Delete exam plan"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
