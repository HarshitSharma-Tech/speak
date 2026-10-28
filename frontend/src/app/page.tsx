"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navigation, NavTab } from "@/components/Navigation";
import { TopBar } from "@/components/TopBar";
import { DashboardView } from "@/components/DashboardView";
import { DocumentsView } from "@/components/DocumentsView";
import { CoursesView } from "@/components/CoursesView";
import { SprintView } from "@/components/SprintView";
import { InterviewView } from "@/components/InterviewView";
import { SettingsView } from "@/components/SettingsView";
import { SourceReferenceModal } from "@/components/SourceReferenceModal";
import { CheckCircle2, AlertCircle, X, BookMarked } from "lucide-react";
import {
  DocumentItem,
  CourseItem,
  SprintItem,
  InterviewSessionItem,
  api
} from "@/lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  // Core application data collections
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [interviews, setInterviews] = useState<InterviewSessionItem[]>([]);

  // Navigation context state
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  // Course building state from archive
  const [buildingCourseForDoc, setBuildingCourseForDoc] = useState<string | null>(null);

  // Studio Toast Notification state (replaces ugly browser alerts)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Grounding Citation Modal state
  const [citationChunkId, setCitationChunkId] = useState<string | null>(null);
  const [citationCourseId, setCitationCourseId] = useState<string | undefined>(undefined);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  }, []);

  // Load all application data
  const loadData = useCallback(async () => {
    try {
      const [docsData, coursesData, sprintsData, interviewsData] = await Promise.allSettled([
        api.listDocuments(),
        api.listCourses(),
        api.listSprints(),
        api.listInterviews(),
      ]);

      if (docsData.status === "fulfilled") setDocuments(docsData.value);
      if (coursesData.status === "fulfilled") setCourses(coursesData.value);
      if (sprintsData.status === "fulfilled") setSprints(sprintsData.value);
      if (interviewsData.status === "fulfilled") setInterviews(interviewsData.value);

      const anyFulfilled =
        docsData.status === "fulfilled" ||
        coursesData.status === "fulfilled" ||
        sprintsData.status === "fulfilled";
      setIsOnline(anyFulfilled);
    } catch (err) {
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateCourse = async (docId: string, title?: string) => {
    setBuildingCourseForDoc(title || "Textbook");
    try {
      const newCourse = await api.generateCourse(docId, title, 4);
      await loadData();
      setSelectedCourseId(newCourse.id);
      setActiveTab("courses");
      showToast("success", `Curriculum "${newCourse.title}" synthesized with 4 modules & cheat deck.`);
    } catch (err: any) {
      const msg =
        err.message === "Failed to fetch"
          ? "Backend server connection interrupted or unreachable on port 8000. Please verify the backend is running."
          : err.message || "Could not synthesize course.";
      showToast("error", `Course Synthesis Error: ${msg}`);
    } finally {
      setBuildingCourseForDoc(null);
    }
  };

  const handleOpenCitation = (chunkId: string, courseId?: string) => {
    setCitationChunkId(chunkId);
    setCitationCourseId(courseId || selectedCourseId || undefined);
  };

  const getPageTitle = (): { title: string; subtitle: string } => {
    switch (activeTab) {
      case "dashboard":
        return {
          title: "LearnSync Studio // Overview",
          subtitle: "Interactive cinema showcase, telemetry & grounded study channels",
        };
      case "documents":
        return {
          title: "02 // Source Archive & PDF Indexing",
          subtitle: "PyMuPDF extraction, recursive chunking & verifiable page citations",
        };
      case "courses":
        return {
          title: "03 // Curriculum Lab & Grounded Quizzes",
          subtitle: "Structured learning modules, 5-question quizzes & rapid-revision decks",
        };
      case "sprints":
        return {
          title: "04 // Exam Frequency Roadmap",
          subtitle: "PYQ topic frequency ranking, semantic matching & adaptive day calendar",
        };
      case "interviews":
        return {
          title: "05 // Broadcast Voice Interview Booth",
          subtitle: "Web Speech live dictation, adaptive difficulty & multi-axis 1–5 scorecard",
        };
      case "settings":
        return {
          title: "06 // Engine Room & Live API Vault",
          subtitle: "Instant API key configuration, model routing & system diagnostics",
        };
      default:
        return { title: "LearnSync Studio", subtitle: "Editorial Study OS" };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#06070a]">
      {/* Sidebar Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== "courses") setSelectedCourseId(null);
          if (tab !== "sprints") setSelectedSprintId(null);
        }}
        documentCount={documents.length}
        courseCount={courses.length}
        sprintCount={sprints.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopBar title={title} subtitle={subtitle} isOnline={isOnline} />

        {/* Studio Toast Notification Banner */}
        {toast && (
          <div className="fixed top-20 right-8 z-50 max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
            <div
              className={`p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl flex items-start space-x-3 ${
                toast.type === "error"
                  ? "bg-rose-950/90 border-rose-500/40 text-rose-200"
                  : "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
              }`}
            >
              {toast.type === "error" ? (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed flex-1 font-medium">{toast.message}</div>
              <button
                onClick={() => setToast(null)}
                className="text-zinc-400 hover:text-white p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Live Course Synthesis Progress Overlay */}
        {buildingCourseForDoc && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="p-8 rounded-3xl bg-[#0c0e14] border border-amber-500/30 max-w-md w-full text-center space-y-5 shadow-2xl">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <BookMarked className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-2">
                <span className="font-mono-code text-[10px] uppercase tracking-widest text-amber-400">
                  PARALLEL CURRICULUM SYNTHESIS
                </span>
                <h3 className="font-display text-lg font-bold text-white">
                  Building Course & Cheat Deck...
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Extracting verified modules and high-yield formulas from{" "}
                  <span className="text-zinc-200 font-semibold">{buildingCourseForDoc}</span>.
                </p>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="h-9 w-9 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-mono-code text-xs text-zinc-400 uppercase tracking-widest">
                INITIALIZING LEARNSYNC STUDIO...
              </p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <DashboardView
                  documents={documents}
                  courses={courses}
                  sprints={sprints}
                  interviews={interviews}
                  onNavigate={setActiveTab}
                  onSelectCourse={(courseId) => {
                    setSelectedCourseId(courseId);
                    setActiveTab("courses");
                  }}
                  onSelectSprint={(sprintId) => {
                    setSelectedSprintId(sprintId);
                    setActiveTab("sprints");
                  }}
                  onStartInterview={() => setActiveTab("interviews")}
                />
              )}

              {activeTab === "documents" && (
                <DocumentsView
                  documents={documents}
                  onRefresh={loadData}
                  onGenerateCourse={handleGenerateCourse}
                />
              )}

              {activeTab === "courses" && (
                <CoursesView
                  courses={courses}
                  documents={documents}
                  onRefresh={loadData}
                  onOpenCitation={handleOpenCitation}
                  selectedCourseId={selectedCourseId}
                />
              )}

              {activeTab === "sprints" && (
                <SprintView
                  sprints={sprints}
                  documents={documents}
                  onRefresh={loadData}
                  selectedSprintId={selectedSprintId}
                />
              )}

              {activeTab === "interviews" && (
                <InterviewView
                  documents={documents}
                  onRefresh={loadData}
                />
              )}

              {activeTab === "settings" && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Global Grounding Citation Modal */}
      <SourceReferenceModal
        chunkId={citationChunkId}
        courseId={citationCourseId}
        onClose={() => {
          setCitationChunkId(null);
          setCitationCourseId(undefined);
        }}
      />
    </div>
  );
}
