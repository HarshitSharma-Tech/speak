"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  FileText,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Target,
  BarChart3,
  Trash2,
  Plus
} from "lucide-react";
import { SprintItem, DocumentItem, SprintTopic, SprintTask, api } from "@/lib/api";

interface SprintViewProps {
  sprints: SprintItem[];
  documents: DocumentItem[];
  onRefresh: () => void;
  selectedSprintId?: string | null;
}

export const SprintView: React.FC<SprintViewProps> = ({
  sprints,
  documents,
  onRefresh,
  selectedSprintId: initialSelectedSprintId,
}) => {
  const [activeSprintId, setActiveSprintId] = useState<string | null>(initialSelectedSprintId || null);

  // New Sprint Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sprintTitle, setSprintTitle] = useState("Final Semester Exam Sprint");
  const [textbookId, setTextbookId] = useState("");
  const [pyqId, setPyqId] = useState("");
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split("T")[0];
  });
  const [dailyHours, setDailyHours] = useState(3.0);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Regeneration Modal State
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenDate, setRegenDate] = useState(examDate);
  const [regenHours, setRegenHours] = useState(dailyHours);
  const [regenerating, setRegenerating] = useState(false);

  // Task filter
  const [taskFilter, setTaskFilter] = useState<"All" | "Topic Study" | "Revision" | "Practice Questions" | "Mock Test">("All");

  const activeSprint = sprints.find((s) => s.id === activeSprintId) || sprints[0] || null;

  const handleCreateSprint = async () => {
    if (!textbookId) {
      setErrorMsg("Please select a textbook document.");
      return;
    }

    setCreating(true);
    setErrorMsg(null);

    try {
      const created = await api.createSprint({
        title: sprintTitle,
        textbook_document_id: textbookId,
        pyq_document_id: pyqId || undefined,
        exam_date: new Date(examDate).toISOString(),
        daily_study_hours: dailyHours,
      });
      onRefresh();
      setShowCreateModal(false);
      setActiveSprintId(created.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create sprint planner.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleTask = async (sprintId: string, taskId: string, currentStatus: boolean) => {
    try {
      await api.toggleSprintTask(sprintId, taskId, !currentStatus);
      onRefresh();
    } catch (err: any) {
      alert("Error updating task: " + err.message);
    }
  };

  const handleRegenerateSprint = async () => {
    if (!activeSprint) return;

    setRegenerating(true);
    try {
      await api.regenerateSprint(activeSprint.id, {
        exam_date: new Date(regenDate).toISOString(),
        daily_study_hours: regenHours,
      });
      onRefresh();
      setShowRegenModal(false);
    } catch (err: any) {
      alert("Error regenerating schedule: " + err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteSprint = async (sprintId: string, title: string) => {
    if (!confirm(`Delete sprint planner "${title}"?`)) return;
    try {
      await api.deleteSprint(sprintId);
      if (activeSprintId === sprintId) setActiveSprintId(null);
      onRefresh();
    } catch (err: any) {
      alert("Error deleting sprint: " + err.message);
    }
  };

  const filteredTasks = activeSprint?.tasks.filter((t) => taskFilter === "All" || t.task_type === taskFilter) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
      {/* Photo Hero Banner */}
      <div className="relative rounded-[32px] overflow-hidden border border-white/15 shadow-2xl p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <img
          src="/media/photo-exam.jpg"
          alt="Exam planning desk"
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.38] saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />

        <div className="relative z-10 max-w-xl space-y-3">
          <span className="px-3 py-1 rounded-full bg-sky-400/20 border border-sky-400/40 text-sky-300 text-xs font-bold">
            Step 3 • Daily Exam Planner
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Your Daily{" "}
            <span className="font-editorial italic font-normal text-amber-300">
              Exam Plan
            </span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
            Tell us your exam date and study hours. We find the most repeated exam topics and give you a simple day-by-day checklist.
          </p>
        </div>

        <button
          onClick={() => {
            const tb = documents.find((d) => d.file_type === "textbook") || documents[0];
            const pyq = documents.find((d) => d.file_type === "pyq");
            if (tb) setTextbookId(tb.id);
            if (pyq) setPyqId(pyq.id);
            setShowCreateModal(true);
          }}
          className="relative z-10 px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black text-xs sm:text-sm font-extrabold shadow-xl shadow-amber-400/25 flex items-center space-x-2 shrink-0 self-start sm:self-auto transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Create Exam Plan</span>
        </button>
      </div>

      {!activeSprint ? (
        <div className="py-16 text-center rounded-3xl glass-panel space-y-4">
          <CalendarDays className="h-10 w-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No Exam Sprints Created</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create an exam sprint to rank syllabus topics by previous-year question frequency and generate a day-by-day study plan until your exam.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
          >
            Create Sprint Plan
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Sprint Overview Card */}
          <div className="p-6 rounded-3xl glass-panel border border-indigo-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Exam: {new Date(activeSprint.exam_date).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-slate-400">{activeSprint.daily_study_hours} hrs daily target</span>
                </div>
                <h3 className="text-2xl font-black text-white">{activeSprint.title}</h3>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => {
                    setRegenDate(activeSprint.exam_date.split("T")[0]);
                    setRegenHours(activeSprint.daily_study_hours);
                    setShowRegenModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Regenerate (Preserve Progress)</span>
                </button>
                <button
                  onClick={() => handleDeleteSprint(activeSprint.id, activeSprint.title)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete Sprint"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar & Stats */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">
                  Sprint Completion: {activeSprint.completed_tasks_count} of {activeSprint.tasks.length} tasks
                </span>
                <span className="text-emerald-400 font-bold">{activeSprint.progress_percentage}% Completed</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${activeSprint.progress_percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section 1: Ranked Syllabus Topics from PYQ & Cosine Similarity */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                  <span>Topic Priority & Frequency Ranking</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Calculated from observed question frequency in PYQs matched against textbook chunks via cosine similarity.
                </p>
              </div>
              {/* Methodological Transparency Disclaimer */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center space-x-2 self-start">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Notice: High past frequency indicates historical emphasis, not guaranteed future appearance.</span>
              </div>
            </div>

            {/* Topics Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Topic Name</th>
                    <th className="py-2.5 px-3">PYQ Frequency</th>
                    <th className="py-2.5 px-3">Textbook Match</th>
                    <th className="py-2.5 px-3">Priority Level</th>
                    <th className="py-2.5 px-3">Calculation Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activeSprint.topics.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-indigo-400">#{t.priority_rank}</td>
                      <td className="py-3 px-3 font-semibold text-slate-100">{t.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {t.observed_frequency} paper(s)
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 font-semibold">
                          {(t.similarity_confidence * 100).toFixed(0)}% Match
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.priority_level === "High"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : t.priority_level === "Medium"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {t.priority_level} Priority
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate" title={t.calculation_notes}>
                        {t.calculation_notes || "Priority weighted by frequency & cosine relevance."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Day-by-Day Interactive Schedule Timeline */}
          <div className="p-6 rounded-3xl glass-panel space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <CalendarDays className="h-4 w-4 text-emerald-400" />
                  <span>Day-by-Day Preparation Timeline</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Topic Study, Speed Practice, Revision Sessions, and Full Mock-Test days.
                </p>
              </div>

              {/* Task Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {(["All", "Topic Study", "Revision", "Practice Questions", "Mock Test"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      taskFilter === filter
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Task Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((tk) => {
                const isCompleted = tk.is_completed;
                const taskDate = new Date(tk.scheduled_date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

                let badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                if (tk.task_type === "Revision") badgeColor = "bg-violet-500/10 text-violet-400 border-violet-500/20";
                if (tk.task_type === "Practice Questions") badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                if (tk.task_type === "Mock Test") badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                return (
                  <div
                    key={tk.id}
                    onClick={() => handleToggleTask(activeSprint.id, tk.id, isCompleted)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isCompleted
                        ? "bg-slate-900/40 border-slate-800/50 opacity-60"
                        : "bg-slate-900/90 border-slate-800 hover:border-indigo-500/50"
                    }`}
                  >
                    <div className="flex items-start space-x-3 truncate">
                      <div className="mt-0.5 shrink-0">
                        <CheckCircle2
                          className={`h-5 w-5 transition-colors ${
                            isCompleted ? "text-emerald-500" : "text-slate-600 hover:text-slate-400"
                          }`}
                        />
                      </div>
                      <div className="space-y-1 truncate">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-slate-500">Day {tk.day_number} &bull; {taskDate}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeColor}`}>
                            {tk.task_type}
                          </span>
                        </div>
                        <h4 className={`text-xs font-bold truncate ${isCompleted ? "line-through text-slate-500" : "text-slate-100"}`}>
                          {tk.title}
                        </h4>
                        {tk.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {tk.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-medium text-slate-500 flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{tk.estimated_minutes} min</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Create Exam Preparation Sprint</h3>
              <p className="text-xs text-slate-400">
                Aligns textbook syllabus with previous question papers to build your prioritized study calendar.
              </p>
            </div>

            <div className="space-y-4">
              {/* Sprint Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Sprint Title</label>
                <input
                  type="text"
                  value={sprintTitle}
                  onChange={(e) => setSprintTitle(e.target.value)}
                  placeholder="e.g. Midterm Algorithms Prep"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Textbook Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Textbook / Study Notes (Required)</label>
                <select
                  value={textbookId}
                  onChange={(e) => setTextbookId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select an uploaded textbook</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.original_name} ({d.file_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* PYQ Select (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Previous Year Question Paper (PYQ - Optional)</label>
                <select
                  value={pyqId}
                  onChange={(e) => setPyqId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None (pure textbook curriculum mode)</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.original_name} ({d.file_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Exam Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Daily Hours */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">Daily Study Hours</span>
                  <span className="text-indigo-400 font-bold">{dailyHours} hours/day</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSprint}
                disabled={creating}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center space-x-2"
              >
                {creating ? (
                  <>
                    <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Frequency & Ranking...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate Sprint Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regeneration Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Regenerate Study Schedule</h3>
              <p className="text-xs text-slate-400">
                Recalibrate future study days while strictly preserving all completed tasks.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Adjusted Exam Date</label>
                <input
                  type="date"
                  value={regenDate}
                  onChange={(e) => setRegenDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">Adjusted Daily Study Hours</span>
                  <span className="text-indigo-400 font-bold">{regenHours} hours/day</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={regenHours}
                  onChange={(e) => setRegenHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateSprint}
                disabled={regenerating}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center space-x-2"
              >
                {regenerating ? (
                  <>
                    <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Recalibrating Plan...</span>
                  </>
                ) : (
                  <span>Recalibrate Schedule</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
