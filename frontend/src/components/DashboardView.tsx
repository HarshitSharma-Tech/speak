"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  BookOpen,
  Calendar,
  Mic,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle2,
  ChevronDown,
  FileText,
  Award,
  Clock
} from "lucide-react";
import { DocumentItem, CourseItem, SprintItem, InterviewSessionItem } from "@/lib/api";
import { NavTab } from "./Navigation";

interface DashboardViewProps {
  documents: DocumentItem[];
  courses: CourseItem[];
  sprints: SprintItem[];
  interviews: InterviewSessionItem[];
  scrollY?: number;
  onNavigate: (tab: NavTab) => void;
  onSelectCourse: (courseId: string) => void;
  onSelectSprint: (sprintId: string) => void;
  onStartInterview: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  documents,
  courses,
  sprints,
  interviews,
  scrollY = 0,
  onNavigate,
  onSelectCourse,
  onSelectSprint,
  onStartInterview,
}) => {
  const [activeVideo, setActiveVideo] = useState<"study" | "cinema">("study");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Scroll-reveal IntersectionObserver for all `.reveal-on-scroll` sections
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal-on-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [courses.length, sprints.length, documents.length]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const activeSprint = sprints[0];
  const lastInterview = interviews.find((i) => i.state === "COMPLETED" && i.report) || interviews[0];

  const featureStories = [
    {
      num: "01",
      tag: "PDF TO EASY NOTES",
      title: "Turn thick textbooks into clear, simple notes.",
      desc: "Drop any PDF textbook, class handout, or resume. We break it into clean chapters and keep track of every page number for you.",
      image: "/media/photo-library.jpg",
      secondaryImage: "/media/photo-notes.jpg",
      buttonText: "Upload a PDF",
      tab: "documents" as NavTab,
      stat: `${documents.length} PDFs Uploaded`,
      accent: "from-amber-400 to-orange-500",
    },
    {
      num: "02",
      tag: "COURSES & QUIZZES",
      title: "Learn key ideas fast and test yourself in 2 minutes.",
      desc: "Get bite-sized lessons, a 1-page formula cheat sheet, and a quick 5-question quiz for every chapter so you actually remember what you read.",
      image: "/media/photo-courses.jpg",
      secondaryImage: "/media/photo-hero-desk.jpg",
      buttonText: "Explore My Courses",
      tab: "courses" as NavTab,
      stat: `${courses.length} Active Courses`,
      accent: "from-emerald-400 to-teal-500",
    },
    {
      num: "03",
      tag: "DAILY EXAM PLANNER",
      title: "Know exactly what to study every single day.",
      desc: "Pick your exam date and how many hours you have. We check past question papers to find the most important topics and build your daily checklist.",
      image: "/media/photo-exam.jpg",
      secondaryImage: "/media/photo-notes.jpg",
      buttonText: "Build My Exam Plan",
      tab: "sprints" as NavTab,
      stat: activeSprint ? `${activeSprint.progress_percentage}% Done` : "Ready to Plan",
      accent: "from-sky-400 to-indigo-500",
    },
    {
      num: "04",
      tag: "VOICE INTERVIEW COACH",
      title: "Practice real interviews out loud with your voice.",
      desc: "Pick your dream job and speak your answers into the mic. Get friendly, instant feedback and a clear score out of 5 after every question.",
      image: "/media/photo-interview.jpg",
      secondaryImage: "/media/photo-courses.jpg",
      buttonText: "Start Voice Interview",
      tab: "interviews" as NavTab,
      stat: lastInterview?.report ? `Best Score: ${lastInterview.report.overall_score}%` : "Voice & Text Ready",
      accent: "from-rose-400 to-pink-600",
    },
  ];

  return (
    <div className="space-y-24">
      {/* =====================================================================
          1. FULL-BLEED PARALLAX VIDEO & PHOTO HERO SECTION
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">
        <div className="relative rounded-[36px] overflow-hidden border border-white/[0.15] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] min-h-[560px] lg:min-h-[620px] flex flex-col justify-between p-6 sm:p-10 lg:p-14">
          {/* Parallax Video & Photo Background Layer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translateY(${scrollY * 0.18}px) scale(${1 + Math.min(0.12, scrollY * 0.0002)})`,
            }}
          >
            <video
              ref={videoRef}
              key={activeVideo}
              src={activeVideo === "study" ? "/media/study-ambient.mp4" : "/videos/hero-reel.mp4"}
              poster="/media/photo-hero-desk.jpg"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover object-center filter brightness-[0.65] contrast-[1.08] saturate-[1.15]"
            />
            {/* Warm cinematic gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-transparent to-black/40" />
          </div>

          {/* Top Bar inside Hero: Simple Video Switcher */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-200 tracking-wide">
                Your Personal AI Study Partner
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/15">
              <button
                onClick={() => setActiveVideo("study")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeVideo === "study"
                    ? "bg-amber-400 text-black shadow"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Study Desk Video
              </button>
              <button
                onClick={() => setActiveVideo("cinema")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeVideo === "cinema"
                    ? "bg-amber-400 text-black shadow"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Visual Reel
              </button>
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                title={isPlaying ? "Pause Video" : "Play Video"}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-amber-300" />}
              </button>
            </div>
          </div>

          {/* Center Hero Content + Floating Parallax Photo Cards */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center my-auto py-8">
            {/* Left Simple & Clear Headline */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="font-display text-4xl sm:text-6xl lg:text-[64px] font-extrabold text-white tracking-tight leading-[1.04]">
                Study Less.{" "}
                <span className="font-editorial italic font-normal text-amber-300 block sm:inline">
                  Score Higher.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-200 leading-relaxed max-w-xl font-normal">
                Upload your textbook or notes. Get simple chapter summaries, quick 5-question quizzes, a daily exam plan, and live voice interview practice.
              </p>

              {/* Big Simple Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => onNavigate("documents")}
                  className="group px-7 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm shadow-[0_15px_35px_-8px_rgba(251,191,36,0.6)] flex items-center space-x-2.5 transition-all hover:scale-[1.02]"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload PDF Notes</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={onStartInterview}
                  className="px-6 py-4 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-xl text-white font-bold text-sm border border-white/25 flex items-center space-x-2.5 transition-all hover:scale-[1.02]"
                >
                  <Mic className="h-4 w-4 text-rose-400" />
                  <span>Practice Voice Interview</span>
                </button>
              </div>
            </div>

            {/* Right Overlapping Floating Photo Collage */}
            <div className="lg:col-span-5 hidden lg:block relative h-[340px]">
              {/* Primary Photo Card */}
              <div
                className="absolute right-4 top-2 w-72 rounded-3xl overflow-hidden border-2 border-white/25 shadow-2xl animate-float"
                style={{ transform: `translateY(${scrollY * -0.06}px)` }}
              >
                <img
                  src="/media/photo-courses.jpg"
                  alt="Study group and notes"
                  className="w-full h-44 object-cover"
                />
                <div className="p-4 bg-black/80 backdrop-blur-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Instant Course Builder
                  </span>
                  <p className="text-xs font-bold text-white">
                    Chapter summaries, cheat sheets & 5-question quizzes
                  </p>
                </div>
              </div>

              {/* Secondary Overlapping Photo Card */}
              <div
                className="absolute left-0 bottom-0 w-64 rounded-3xl overflow-hidden border-2 border-white/25 shadow-2xl animate-float-delayed"
                style={{ transform: `translateY(${scrollY * 0.05}px)` }}
              >
                <img
                  src="/media/photo-interview.jpg"
                  alt="Voice interview microphone"
                  className="w-full h-36 object-cover"
                />
                <div className="p-3.5 bg-black/85 backdrop-blur-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-400 block">Voice Coach</span>
                    <span className="text-xs font-bold text-white">Speak & Get Scored</span>
                  </div>
                  <span className="h-8 w-8 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
                    <Mic className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Scroll Prompt & Quick Stats */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-200">
            <div className="flex flex-wrap items-center gap-6">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                <span><strong>{documents.length}</strong> PDFs Uploaded</span>
              </span>
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span><strong>{courses.length}</strong> Study Courses</span>
              </span>
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-sky-400" />
                <span><strong>{sprints.length}</strong> Exam Plans</span>
              </span>
            </div>

            <a
              href="#explore-features"
              className="inline-flex items-center space-x-1.5 text-amber-300 hover:text-amber-200 font-semibold"
            >
              <span>Scroll down to explore</span>
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. INFINITE SCROLLING MARQUEE RIBBON
      ===================================================================== */}
      <div className="w-full overflow-hidden border-y border-white/10 bg-black/45 backdrop-blur-md py-4">
        <div className="animate-marquee flex items-center space-x-10 text-sm font-display font-bold text-zinc-300">
          {[
            "✦ Upload Any Textbook PDF",
            "✦ Simple Chapter Summaries",
            "✦ 1-Page Formula Cheat Sheets",
            "✦ 5-Question Chapter Quizzes",
            "✦ Exact Page Number Proof",
            "✦ Daily Exam Countdown Plan",
            "✦ Past Question Paper Analyzer",
            "✦ Live Voice Mock Interviews",
            "✦ Upload Any Textbook PDF",
            "✦ Simple Chapter Summaries",
            "✦ 1-Page Formula Cheat Sheets",
            "✦ 5-Question Chapter Quizzes",
            "✦ Exact Page Number Proof",
            "✦ Daily Exam Countdown Plan",
            "✦ Past Question Paper Analyzer",
            "✦ Live Voice Mock Interviews",
          ].map((item, i) => (
            <span key={i} className="whitespace-nowrap tracking-wide hover:text-amber-300 transition-colors">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* =====================================================================
          3. SCROLL-DRIVEN PHOTO & VIDEO FEATURE SHOWCASE
      ===================================================================== */}
      <section id="explore-features" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 reveal-on-scroll">
          <span className="px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            Everything You Need in One Place
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            How LearnSync Helps You{" "}
            <span className="font-editorial italic font-normal text-amber-300">
              Win Every Exam
            </span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-300">
            Four simple tools designed to save you hours of reading and help you walk into every test or interview with confidence.
          </p>
        </div>

        <div className="space-y-16">
          {featureStories.map((story, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <div
                key={story.num}
                className="reveal-on-scroll grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center p-6 sm:p-10 rounded-[36px] glass-panel glass-panel-hover"
              >
                {/* Photo Collage Side */}
                <div className={`lg:col-span-6 relative ${isEven ? "lg:order-2" : ""}`}>
                  <div className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl group">
                    <img
                      src={story.image}
                      alt={story.title}
                      className="w-full h-[280px] sm:h-[340px] object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Floating Badge on Photo */}
                    <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-bold text-white flex items-center space-x-2">
                      <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${story.accent}`} />
                      <span>{story.stat}</span>
                    </div>

                    {/* Secondary Inset Photo Thumbnail */}
                    <div className="hidden sm:block absolute bottom-4 right-4 w-36 h-24 rounded-2xl overflow-hidden border-2 border-white/40 shadow-xl">
                      <img
                        src={story.secondaryImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Simple Copy & CTA Side */}
                <div className={`lg:col-span-6 space-y-5 ${isEven ? "lg:order-1" : ""}`}>
                  <div className="inline-flex items-center space-x-2">
                    <span className={`font-display text-sm font-black px-3 py-1 rounded-xl bg-gradient-to-r ${story.accent} text-black`}>
                      {story.num}
                    </span>
                    <span className="text-xs font-bold tracking-widest uppercase text-amber-300">
                      {story.tag}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                    {story.title}
                  </h3>

                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                    {story.desc}
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => onNavigate(story.tab)}
                      className="group px-6 py-3.5 rounded-2xl bg-white text-black hover:bg-amber-300 font-extrabold text-xs sm:text-sm shadow-xl flex items-center space-x-2.5 transition-all"
                    >
                      <span>{story.buttonText}</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          4. YOUR RECENT COURSES & STUDY PLANS (PHOTO-BACKED CARDS)
      ===================================================================== */}
      {(courses.length > 0 || sprints.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8 reveal-on-scroll">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Jump Right Back In
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                Your Active Study Space
              </h2>
            </div>
            <button
              onClick={() => onNavigate("courses")}
              className="text-xs font-bold text-amber-300 hover:underline flex items-center space-x-1"
            >
              <span>See all courses</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((c, i) => {
              const cardPhotos = [
                "/media/photo-courses.jpg",
                "/media/photo-library.jpg",
                "/media/photo-notes.jpg",
              ];
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCourse(c.id)}
                  className="group rounded-3xl overflow-hidden glass-panel glass-panel-hover cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={cardPhotos[i % cardPhotos.length]}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-black/30 to-transparent" />
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-white/15">
                      {c.modules?.length || 0} Chapters
                    </span>
                  </div>

                  <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h4 className="font-display text-lg font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {c.title}
                      </h4>
                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                        {c.description || "Interactive chapters, cheat sheet, and 5-question quizzes."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-amber-300">
                      <span>Open Course</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
