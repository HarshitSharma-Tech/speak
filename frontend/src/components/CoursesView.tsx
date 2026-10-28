"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  HelpCircle,
  FileText,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Layers,
  ChevronRight
} from "lucide-react";
import { CourseItem, DocumentItem, ModuleItem, QuizItem, api } from "@/lib/api";
import { QuizRunner } from "./QuizRunner";
import { CheatSheetView } from "./CheatSheetView";

interface CoursesViewProps {
  courses: CourseItem[];
  documents: DocumentItem[];
  onRefresh: () => void;
  onOpenCitation: (chunkId: string) => void;
  selectedCourseId?: string | null;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  documents,
  onRefresh,
  onOpenCitation,
  selectedCourseId: initialSelectedCourseId,
}) => {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(initialSelectedCourseId || null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Subview states: "module" | "quiz" | "cheat_sheet"
  const [subView, setSubView] = useState<"module" | "quiz" | "cheat_sheet">("module");
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // New course generator modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [courseTitleInput, setCourseTitleInput] = useState<string>("");
  const [moduleCountInput, setModuleCountInput] = useState<number>(4);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || null;
  const currentModule = activeCourse?.modules.find((m) => m.id === selectedModuleId) || activeCourse?.modules[0] || null;

  const handleLaunchGenerateModal = () => {
    const textbook = documents.find((d) => d.file_type === "textbook") || documents[0];
    if (textbook) {
      setSelectedDocId(textbook.id);
      setCourseTitleInput(textbook.original_name.replace(".pdf", "").replace(/_/g, " "));
    }
    setShowGenerateModal(true);
  };

  const handleCreateCourse = async () => {
    if (!selectedDocId) {
      setGenerationError("Please select an uploaded textbook document.");
      return;
    }

    setGenerating(true);
    setGenerationError(null);

    try {
      const newCourse = await api.generateCourse(selectedDocId, courseTitleInput, moduleCountInput);
      onRefresh();
      setShowGenerateModal(false);
      setActiveCourseId(newCourse.id);
      setSelectedModuleId(newCourse.modules[0]?.id || null);
      setSubView("module");
    } catch (err: any) {
      setGenerationError(err.message || "Failed to generate course outline.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!confirm(`Delete course "${title}" and all its modules, quizzes, and cheat sheets?`)) return;

    try {
      await api.deleteCourse(courseId);
      if (activeCourseId === courseId) {
        setActiveCourseId(null);
        setSelectedModuleId(null);
      }
      onRefresh();
    } catch (err: any) {
      alert("Error deleting course: " + err.message);
    }
  };

  const handleStartQuiz = async (moduleId: string) => {
    setLoadingQuiz(true);
    try {
      const quiz = await api.generateQuiz(moduleId);
      setActiveQuiz(quiz);
      setSubView("quiz");
    } catch (err: any) {
      alert("Error generating quiz: " + err.message);
    } finally {
      setLoadingQuiz(false);
    }
  };

  // 1. If currently running a Quiz
  if (activeCourse && subView === "quiz" && activeQuiz) {
    return (
      <div className="p-8">
        <QuizRunner
          quiz={activeQuiz}
          courseId={activeCourse.id}
          onOpenSourceCitation={onOpenCitation}
          onRetake={() => handleStartQuiz(activeQuiz.module_id)}
          onClose={() => setSubView("module")}
        />
      </div>
    );
  }

  // 2. If viewing Cheat Sheet
  if (activeCourse && subView === "cheat_sheet" && activeCourse.cheat_sheets[0]) {
    return (
      <div className="p-8">
        <CheatSheetView
          cheatSheet={activeCourse.cheat_sheets[0]}
          courseTitle={activeCourse.title}
          onOpenCitation={onOpenCitation}
          onBack={() => setSubView("module")}
        />
      </div>
    );
  }

  // 3. If a course is selected: Course Details & Learning Page
  if (activeCourse) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Top navigation row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => setActiveCourseId(null)}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Courses</span>
          </button>

          <div className="flex items-center space-x-3">
            {activeCourse.cheat_sheets[0] && (
              <button
                onClick={() => setSubView("cheat_sheet")}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/20 flex items-center space-x-1.5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Cheat Sheet</span>
              </button>
            )}
            <button
              onClick={() => handleDeleteCourse(activeCourse.id, activeCourse.title)}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Delete Course"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Course Title Banner */}
        <div className="p-6 rounded-3xl glass-panel border border-indigo-500/20 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Grounded Course Engine
            </span>
            <span className="text-xs text-slate-400">{activeCourse.modules.length} Modules</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{activeCourse.title}</h2>
          {activeCourse.description && (
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{activeCourse.description}</p>
          )}
        </div>

        {/* Two Columns: Modules List (Left) + Selected Module Learning Content (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Module Selector Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block px-1">
              Modules & Topics
            </span>
            <div className="space-y-1.5">
              {activeCourse.modules.map((mod) => {
                const isSelected = (currentModule?.id === mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setSelectedModuleId(mod.id);
                      setSubView("module");
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <div className="truncate space-y-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                        Module {mod.module_order}
                      </span>
                      <h4 className="text-xs font-bold truncate">{mod.title}</h4>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? "text-white" : "text-slate-600 group-hover:text-slate-300"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module Learning Workspace */}
          <div className="lg:col-span-3">
            {currentModule ? (
              <div className="p-8 rounded-3xl glass-panel space-y-6">
                {/* Module Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-indigo-400">
                      Module {currentModule.module_order} Learning Studio
                    </span>
                    <h3 className="text-xl font-extrabold text-white">{currentModule.title}</h3>
                    {currentModule.summary && (
                      <p className="text-xs text-slate-300 italic">{currentModule.summary}</p>
                    )}
                  </div>

                  {/* 5-Question Quiz Launch CTA */}
                  <button
                    onClick={() => handleStartQuiz(currentModule.id)}
                    disabled={loadingQuiz}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0 transition-all self-start sm:self-auto"
                  >
                    {loadingQuiz ? (
                      <>
                        <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating 5 Qs...</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="h-4 w-4" />
                        <span>Launch 5-Question Quiz</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Key Topics Tag Cloud */}
                {currentModule.key_topics?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Key Topics Covered:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentModule.key_topics.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Learning Content */}
                <div className="space-y-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Core Learning Text:
                  </span>
                  <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans space-y-3">
                    {currentModule.learning_content}
                  </div>
                </div>

                {/* Grounding Source Verification Panel */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>
                      Grounded in {currentModule.source_chunk_ids?.length || 1} verified textbook chunk(s)
                    </span>
                  </div>
                  {currentModule.source_chunk_ids?.[0] && (
                    <button
                      onClick={() => onOpenCitation(currentModule.source_chunk_ids[0])}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline self-start sm:self-auto"
                    >
                      View Source Evidence
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-500">Select a module to view learning content.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Default: Courses Catalog List
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 studio-grid-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono-code text-[11px] uppercase tracking-widest text-amber-400 block mb-1">
            CHANNEL 03 // CURRICULUM SYNTHESIS LAB
          </span>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
            Curriculum Lab &{" "}
            <span className="font-editorial italic font-normal text-amber-300">
              Grounded Quizzes
            </span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Structured textbook curriculums with page-cited 5-question quizzes and rapid-revision cheat decks.
          </p>
        </div>

        <button
          onClick={handleLaunchGenerateModal}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Synthesize New Curriculum</span>
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="py-16 text-center rounded-3xl glass-panel space-y-4">
          <GraduationCap className="h-10 w-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No courses generated yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Select an uploaded PDF textbook to automatically formulate an outline, grounded quiz questions, and cheat sheets.
            </p>
          </div>
          <button
            onClick={handleLaunchGenerateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
          >
            Generate Course Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {c.modules?.length || 0} Modules
                  </span>
                  <button
                    onClick={() => handleDeleteCourse(c.id, c.title)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete Course"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-white line-clamp-1">{c.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {c.description || "Course outline generated from textbook chunks."}
                </p>

                {c.modules?.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Modules Outline:
                    </span>
                    <div className="space-y-1">
                      {c.modules.slice(0, 3).map((m) => (
                        <div key={m.id} className="text-xs text-slate-300 truncate flex items-center space-x-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setActiveCourseId(c.id);
                    setSelectedModuleId(c.modules[0]?.id || null);
                    setSubView("module");
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-800 flex items-center justify-center space-x-2 transition-all shadow-sm group"
                >
                  <span>Open Course Studio</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Course Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Generate Course Curriculum</h3>
              <p className="text-xs text-slate-400">
                Transforms textbook chunks into modules, grounded quizzes, and cheat sheets.
              </p>
            </div>

            <div className="space-y-4">
              {/* Select Document */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Textbook Document</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {documents.length === 0 ? (
                    <option value="">No documents uploaded. Please upload a PDF first.</option>
                  ) : (
                    documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.original_name} ({d.page_count} pages, {d.chunk_count} chunks)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Title Hint */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Course Title (Optional)</label>
                <input
                  type="text"
                  value={courseTitleInput}
                  onChange={(e) => setCourseTitleInput(e.target.value)}
                  placeholder="e.g. Operating Systems Mastery"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Target Modules Count */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">Target Modules</span>
                  <span className="text-indigo-400 font-bold">{moduleCountInput} Modules</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={moduleCountInput}
                  onChange={(e) => setModuleCountInput(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {generationError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {generationError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCourse}
                disabled={generating || !selectedDocId}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center space-x-2"
              >
                {generating ? (
                  <>
                    <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Chunks & Formulating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate Course</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
