"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navigation, NavTab } from "@/components/Navigation";
import { DashboardView } from "@/components/DashboardView";
import { DocumentsView } from "@/components/DocumentsView";
import { CoursesView } from "@/components/CoursesView";
import { SprintView } from "@/components/SprintView";
import { InterviewView } from "@/components/InterviewView";
import { SettingsView } from "@/components/SettingsView";
import { SourceReferenceModal } from "@/components/SourceReferenceModal";
import { CheckCircle2, AlertCircle, X, BookOpen } from "lucide-react";
import {
  DocumentItem,
  CourseItem,
  SprintItem,
  InterviewSessionItem,
  api
} from "@/lib/api";

const TAB_BACKGROUNDS: Record<NavTab, string> = {
  dashboard: "/media/photo-library.jpg",
  documents: "/media/photo-notes.jpg",
  courses: "/media/photo-courses.jpg",
  sprints: "/media/photo-exam.jpg",
  interviews: "/media/photo-interview.jpg",
  settings: "/media/photo-hero-desk.jpg",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  // Scroll tracking for parallax & progress bar
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Core application data collections
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [interviews, setInterviews] = useState<InterviewSessionItem[]>([]);

  // Navigation context state
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  // Course building state
  const [buildingCourseForDoc, setBuildingCourseForDoc] = useState<string | null>(null);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Citation Modal state
  const [citationChunkId, setCitationChunkId] = useState<string | null>(null);
  const [citationCourseId, setCitationCourseId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(1, y / maxScroll));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  }, []);

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

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== "courses") setSelectedCourseId(null);
    if (tab !== "sprints") setSelectedSprintId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGenerateCourse = async (docId: string, title?: string) => {
    setBuildingCourseForDoc(title || "your document");
    try {
      const newCourse = await api.generateCourse(docId, title, 4);
      await loadData();
      setSelectedCourseId(newCourse.id);
      setActiveTab("courses");
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast("success", `Course "${newCourse.title}" is ready!`);
    } catch (err: any) {
      const msg =
        err.message === "Failed to fetch"
          ? "Could not connect to the server. Make sure the backend is running."
          : err.message || "Could not create course.";
      showToast("error", msg);
    } finally {
      setBuildingCourseForDoc(null);
    }
  };

  const handleOpenCitation = (chunkId: string, courseId?: string) => {
    setCitationChunkId(chunkId);
    setCitationCourseId(courseId || selectedCourseId || undefined);
  };

  return (
    <div className="min-h-screen w-full relative text-white selection:bg-amber-400 selection:text-black">
      {/* =====================================================================
          DYNAMIC FULL-VIEWPORT PHOTO & VIDEO PARALLAX BACKDROP
      ===================================================================== */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <img
          src={TAB_BACKGROUNDS[activeTab]}
          alt="Ambient Study Backdrop"
          className="w-full h-full object-cover transition-all duration-1000 ease-out"
          style={{
            transform: `scale(${1.06 + scrollProgress * 0.08}) translateY(${scrollY * -0.04}px)`,
            filter: "brightness(0.32) saturate(1.2) contrast(1.08)",
          }}
        />
        {/* Warm atmospheric color wash & vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/80 via-[#050608]/65 to-[#050608]/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.14),transparent_50%),radial-gradient(circle_at_80%_75%,rgba(244,63,94,0.12),transparent_50%)]" />
      </div>

      {/* Floating Top Glass Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        documentCount={documents.length}
        courseCount={courses.length}
        sprintCount={sprints.length}
        isOnline={isOnline}
        scrollProgress={scrollProgress}
      />

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
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
            <button onClick={() => setToast(null)} className="text-zinc-400 hover:text-white p-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Course Creation Progress Overlay */}
      {buildingCourseForDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="p-8 rounded-3xl glass-panel border border-amber-400/40 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="h-14 w-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-300">
              <BookOpen className="h-7 w-7 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-white">
                Creating Your Study Course...
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Reading <span className="text-amber-300 font-semibold">{buildingCourseForDoc}</span> and writing easy chapter summaries & cheat sheets.
              </p>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Main Scrollable Viewport */}
      <main className="pt-20 pb-24">
        {loading ? (
          <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-4">
            <div className="h-10 w-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-300 font-medium">Opening your study space...</p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <DashboardView
                documents={documents}
                courses={courses}
                sprints={sprints}
                interviews={interviews}
                scrollY={scrollY}
                onNavigate={handleSelectTab}
                onSelectCourse={(courseId) => {
                  setSelectedCourseId(courseId);
                  setActiveTab("courses");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectSprint={(sprintId) => {
                  setSelectedSprintId(sprintId);
                  setActiveTab("sprints");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onStartInterview={() => {
                  setActiveTab("interviews");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
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

      {/* Source Citation Modal */}
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
