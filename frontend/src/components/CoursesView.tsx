"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Trash2,
  ArrowRight,
  Plus,
  ArrowLeft,
  ChevronRight,
  FileText
} from "lucide-react";
import { CourseItem, DocumentItem, QuizItem, api } from "@/lib/api";
import { QuizRunner } from "./QuizRunner";
import { CheatSheetView } from "./CheatSheetView";

interface CoursesViewProps {
  courses: CourseItem[];
  documents: DocumentItem[];
  onRefresh: () => void;
  onOpenCitation: (chunkId: string) => void;
  selectedCourseId?: string | null;
}

const COURSE_PHOTOS = [
  "/media/photo-courses.jpg",
  "/media/photo-library.jpg",
  "/media/photo-notes.jpg",
  "/media/photo-hero-desk.jpg",
];

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  documents,
  onRefresh,
  onOpenCitation,
  selectedCourseId: initialSelectedCourseId,
}) => {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(initialSelectedCourseId || null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [subView, setSubView] = useState<"module" | "quiz" | "cheat_sheet">("module");
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [courseTitleInput, setCourseTitleInput] = useState<string>("");
  const [moduleCountInput, setModuleCountInput] = useState<number>(4);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || null;
  const currentModule =
    activeCourse?.modules.find((m) => m.id === selectedModuleId) || activeCourse?.modules[0] || null;

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
      setGenerationError("Please choose an uploaded PDF first.");
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
      setGenerationError(err.message || "Could not create course.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!confirm(`Delete course "${title}"?`)) return;
    try {
      await api.deleteCourse(courseId);
      if (activeCourseId === courseId) {
        setActiveCourseId(null);
        setSelectedModuleId(null);
      }
      onRefresh();
    } catch (err: any) {
      alert("Could not delete course: " + err.message);
    }
  };

  const handleStartQuiz = async (moduleId: string) => {
    setLoadingQuiz(true);
    try {
      const quiz = await api.generateQuiz(moduleId);
      setActiveQuiz(quiz);
      setSubView("quiz");
    } catch (err: any) {
      alert("Could not start quiz: " + err.message);
    } finally {
      setLoadingQuiz(false);
    }
  };

  if (activeCourse && subView === "quiz" && activeQuiz) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
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

  if (activeCourse && subView === "cheat_sheet" && activeCourse.cheat_sheets[0]) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <CheatSheetView
          cheatSheet={activeCourse.cheat_sheets[0]}
          courseTitle={activeCourse.title}
          onOpenCitation={onOpenCitation}
          onBack={() => setSubView("module")}
        />
      </div>
    );
  }

  // Course Reader View
  if (activeCourse) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => setActiveCourseId(null)}
            className="inline-flex items-center space-x-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Courses</span>
          </button>

          <div className="flex items-center space-x-3">
            {activeCourse.cheat_sheets[0] && (
              <button
                onClick={() => setSubView("cheat_sheet")}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold flex items-center space-x-2 shadow-lg shadow-amber-400/20 transition-all"
              >
                <FileText className="h-4 w-4" />
                <span>Open 1-Page Cheat Sheet</span>
              </button>
            )}
            <button
              onClick={() => handleDeleteCourse(activeCourse.id, activeCourse.title)}
              className="p-2.5 rounded-xl bg-white/10 text-zinc-300 hover:text-rose-400 transition-colors"
              title="Delete Course"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Course Photo Banner */}
        <div className="relative rounded-[32px] overflow-hidden border border-white/15 p-8 sm:p-10 shadow-2xl">
          <img
            src="/media/photo-courses.jpg"
            alt={activeCourse.title}
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.35]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          <div className="relative z-10 space-y-2 max-w-3xl">
            <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
              {activeCourse.modules.length} Chapters
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {activeCourse.title}
            </h2>
            {activeCourse.description && (
              <p className="text-sm text-zinc-200 leading-relaxed">{activeCourse.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chapters Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <span className="text-xs font-bold text-zinc-300 block px-1">Chapters</span>
            <div className="space-y-2">
              {activeCourse.modules.map((mod) => {
                const isSelected = currentModule?.id === mod.id;
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setSelectedModuleId(mod.id);
                      setSubView("module");
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                      isSelected
                        ? "bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/20"
                        : "glass-panel text-zinc-200 hover:border-white/30"
                    }`}
                  >
                    <div className="truncate space-y-0.5">
                      <span
                        className={`text-[10px] font-bold uppercase block ${
                          isSelected ? "text-black/70" : "text-amber-300"
                        }`}
                      >
                        Chapter {mod.module_order}
                      </span>
                      <h4 className="text-xs font-bold truncate">{mod.title}</h4>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chapter Content */}
          <div className="lg:col-span-3">
            {currentModule ? (
              <div className="p-6 sm:p-8 rounded-[32px] glass-panel space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-white/10">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-amber-300">
                      Chapter {currentModule.module_order}
                    </span>
                    <h3 className="font-display text-2xl font-extrabold text-white">
                      {currentModule.title}
                    </h3>
                    {currentModule.summary && (
                      <p className="text-sm text-zinc-300">{currentModule.summary}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartQuiz(currentModule.id)}
                    disabled={loadingQuiz}
                    className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black text-xs font-extrabold shadow-lg shadow-amber-400/25 flex items-center space-x-2 shrink-0 transition-all"
                  >
                    {loadingQuiz ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Making Quiz...</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="h-4 w-4" />
                        <span>Take 5-Question Quiz</span>
                      </>
                    )}
                  </button>
                </div>

                {currentModule.key_topics?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentModule.key_topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-amber-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="p-6 rounded-2xl bg-black/55 border border-white/10 text-zinc-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {currentModule.learning_content}
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-zinc-200">
                    <BookOpen className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Verified from your uploaded PDF</span>
                  </div>
                  {currentModule.source_chunk_ids?.[0] && (
                    <button
                      onClick={() => onOpenCitation(currentModule.source_chunk_ids[0])}
                      className="text-xs font-bold text-amber-300 hover:underline"
                    >
                      See Exact Page in PDF &rarr;
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Courses Catalog
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
      {/* Photo Hero Banner */}
      <div className="relative rounded-[32px] overflow-hidden border border-white/15 shadow-2xl p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <img
          src="/media/photo-courses.jpg"
          alt="Students studying"
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.38] saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />

        <div className="relative z-10 max-w-xl space-y-3">
          <span className="px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
            Step 2 • Study & Test Yourself
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            My Study{" "}
            <span className="font-editorial italic font-normal text-amber-300">
              Courses
            </span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
            Read simple chapter summaries, review your 1-page formula cheat sheet, and test yourself with a 5-question quiz.
          </p>
        </div>

        <button
          onClick={handleLaunchGenerateModal}
          className="relative z-10 px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black text-xs sm:text-sm font-extrabold shadow-xl shadow-amber-400/25 flex items-center space-x-2 shrink-0 self-start sm:self-auto transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Course</span>
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="py-16 text-center rounded-[32px] glass-panel space-y-4">
          <GraduationCap className="h-12 w-12 text-amber-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display text-xl font-bold text-white">No courses created yet</h3>
            <p className="text-sm text-zinc-300 max-w-md mx-auto">
              Pick one of your uploaded PDFs to turn it into easy chapters, a cheat sheet, and quizzes.
            </p>
          </div>
          <button
            onClick={handleLaunchGenerateModal}
            className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold transition-all shadow-lg"
          >
            Create Your First Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c, idx) => (
            <div
              key={c.id}
              className="rounded-3xl overflow-hidden glass-panel glass-panel-hover flex flex-col justify-between"
            >
              {/* Photo Header */}
              <div className="relative h-44 overflow-hidden">
                <img
                  src={COURSE_PHOTOS[idx % COURSE_PHOTOS.length]}
                  alt={c.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-black/35 to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-bold text-amber-300 border border-white/15">
                  {c.modules?.length || 0} Chapters
                </span>
                <button
                  onClick={() => handleDeleteCourse(c.id, c.title)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-zinc-300 hover:text-rose-400 transition-colors"
                  title="Delete Course"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-bold text-white line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                    {c.description || "Simple chapter notes, cheat sheet, and quizzes."}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setActiveCourseId(c.id);
                    setSelectedModuleId(c.modules[0]?.id || null);
                    setSubView("module");
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-md"
                >
                  <span>Start Studying</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-white">Create a Study Course</h3>
              <p className="text-xs text-zinc-300">
                Choose a PDF to generate simple chapters, quizzes, and a cheat sheet.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">Choose Your PDF</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {documents.length === 0 ? (
                    <option value="">No PDFs uploaded yet — upload a PDF first</option>
                  ) : (
                    documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.original_name} ({d.page_count} pages)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200">Course Name</label>
                <input
                  type="text"
                  value={courseTitleInput}
                  onChange={(e) => setCourseTitleInput(e.target.value)}
                  placeholder="e.g. Biology Midterm Notes"
                  className="w-full p-3 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-zinc-200">Number of Chapters</span>
                  <span className="text-amber-300 font-bold">{moduleCountInput} Chapters</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={moduleCountInput}
                  onChange={(e) => setModuleCountInput(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {generationError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
                  {generationError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCourse}
                disabled={generating || !selectedDocId}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black text-xs font-extrabold flex items-center space-x-2"
              >
                {generating ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Building Course...</span>
                  </>
                ) : (
                  <span>Create Course</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
