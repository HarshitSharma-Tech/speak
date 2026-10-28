"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  GraduationCap,
  CalendarDays,
  Mic,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  Waves,
  Compass,
  CheckCircle2,
  Clock,
  Award,
  Flame,
  Radio,
  Layers
} from "lucide-react";
import { DocumentItem, CourseItem, SprintItem, InterviewSessionItem } from "@/lib/api";
import { NavTab } from "./Navigation";

interface DashboardViewProps {
  documents: DocumentItem[];
  courses: CourseItem[];
  sprints: SprintItem[];
  interviews: InterviewSessionItem[];
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
  onNavigate,
  onSelectCourse,
  onSelectSprint,
  onStartInterview,
}) => {
  // Hero Showcase Mode: "cinema" | "canvas" | "blueprint"
  const [heroMode, setHeroMode] = useState<"cinema" | "canvas" | "blueprint">("cinema");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [activeTourStep, setActiveTourStep] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Aggregate metrics
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
  const totalPages = documents.reduce((acc, d) => acc + (d.page_count || 0), 0);
  const totalModules = courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0);

  const activeSprint = sprints[0];
  const sprintProgress = activeSprint ? activeSprint.progress_percentage : 0;

  const completedInterviews = interviews.filter((i) => i.state === "COMPLETED" && i.report);
  const lastInterview = completedInterviews[0] || interviews[0];

  // Toggle video play/pause
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

  // Interactive 60FPS Neural & Harmonic Canvas when in "canvas" mode (or ambient overlay)
  useEffect(() => {
    if (heroMode !== "canvas") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const nodes = Array.from({ length: 38 }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
      r: 2 + Math.random() * 2.5,
      hue: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#10b981" : "#f43f5e",
    }));

    let mouse = { x: w / 2, y: h / 2 };
    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", handleMove);

    let tick = 0;
    const render = () => {
      tick += 0.025;
      ctx.clearRect(0, 0, w, h);

      // Draw harmonic wave lines in background
      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        ctx.strokeStyle =
          wave === 0
            ? "rgba(245, 158, 11, 0.16)"
            : wave === 1
            ? "rgba(16, 185, 129, 0.12)"
            : "rgba(244, 63, 94, 0.12)";
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= w; x += 12) {
          const y =
            h * 0.55 +
            Math.sin(x * 0.008 + tick + wave * 1.4) * (28 + wave * 12) +
            Math.cos(x * 0.004 - tick) * 14;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Update & connect nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        // Subtle attraction to cursor
        const dxMouse = mouse.x - n.x;
        const dyMouse = mouse.y - n.y;
        const distMouse = Math.hypot(dxMouse, dyMouse);
        if (distMouse < 160) {
          n.x += dxMouse * 0.008;
          n.y += dyMouse * 0.008;
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - d / 120) * 0.22})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.fillStyle = n.hue;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", handleMove);
    };
  }, [heroMode]);

  const tourSteps = [
    {
      step: "01",
      title: "Source Archive & PDF Indexing",
      caption: "Drop any textbook, past question paper, or resume. Every page is indexed with verbatim page & chunk citations.",
      actionLabel: "Open Source Archive",
      tab: "documents" as NavTab,
      accent: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    },
    {
      step: "02",
      title: "Curriculum & Grounded 5-Q Quizzes",
      caption: "Synthesize structured learning modules, rapid-revision decks, and 5-question quizzes verified against exact textbook pages.",
      actionLabel: "Open Curriculum Lab",
      tab: "courses" as NavTab,
      accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    },
    {
      step: "03",
      title: "Exam Frequency Roadmap",
      caption: "Cross-reference past exam papers against your syllabus to rank high-yield topics and build an adaptive daily calendar.",
      actionLabel: "Open Exam Roadmap",
      tab: "sprints" as NavTab,
      accent: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    },
    {
      step: "04",
      title: "Live Voice Interview Booth",
      caption: "Step into an adaptive technical & behavioral interview tailored to your resume with Web Speech voice recognition.",
      actionLabel: "Enter Voice Booth",
      tab: "interviews" as NavTab,
      accent: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto studio-grid-bg">
      {/* =====================================================================
          CINEMATIC VIDEO HERO SECTION
      ===================================================================== */}
      <section className="relative rounded-[28px] overflow-hidden border border-white/[0.1] bg-[#080a0f] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)]">
        {/* Background Media Layer */}
        <div className="relative min-h-[460px] lg:min-h-[500px] w-full flex flex-col justify-between p-7 lg:p-10">
          {/* 1. Cinema Video Reel Layer */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              heroMode === "cinema" ? "opacity-100" : "opacity-20 pointer-events-none"
            }`}
          >
            <video
              ref={videoRef}
              src="/videos/hero-reel.mp4"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current && videoRef.current.duration) {
                  setVideoProgress(
                    (videoRef.current.currentTime / videoRef.current.duration) * 100
                  );
                }
              }}
              className="w-full h-full object-cover object-center scale-[1.02] filter saturate-[1.15] contrast-[1.08]"
            />
            {/* Multi-stop editorial vignette & gradient masks */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-[#06070a]/85 to-[#06070a]/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-transparent to-[#06070a]/50" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(245,158,11,0.14),transparent_55%)]" />
          </div>

          {/* 2. Interactive Harmonic Canvas Layer */}
          {heroMode === "canvas" && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full z-0 cursor-crosshair"
            />
          )}

          {/* Top Bar inside Hero: Scene Switcher & Live Telemetry */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.12]">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-mono-code text-[11px] uppercase tracking-[0.16em] text-amber-300 font-semibold">
                LEARNSYNC STUDIO // REEL 01
              </span>
            </div>

            {/* Interactive Scene Switcher Pills */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/[0.1]">
              <button
                onClick={() => setHeroMode("cinema")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  heroMode === "cinema"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                <span>01 Cinema Reel</span>
              </button>
              <button
                onClick={() => setHeroMode("canvas")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  heroMode === "canvas"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Waves className="h-3.5 w-3.5" />
                <span>02 Harmonic Field</span>
              </button>
              <button
                onClick={() => setHeroMode("blueprint")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  heroMode === "blueprint"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>03 Studio Tour</span>
              </button>
            </div>
          </div>

          {/* Center / Main Hero Content */}
          {heroMode !== "blueprint" ? (
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end my-auto py-6">
              {/* Left Editorial Copy */}
              <div className="lg:col-span-7 space-y-5">
                <h2 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-white tracking-tight leading-[1.06]">
                  Where raw textbooks become{" "}
                  <span className="font-editorial italic font-normal text-amber-300 underline decoration-amber-500/40 decoration-wavy underline-offset-8">
                    living mastery.
                  </span>
                </h2>

                <p className="text-sm sm:text-base text-zinc-300/90 leading-relaxed max-w-xl font-normal">
                  An editorial study workspace engineered for deep comprehension. Distill dense PDFs into page-verified modules, rank exam questions by empirical frequency, and rehearse in a live voice interview booth.
                </p>

                {/* Primary Studio Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={() => onNavigate("documents")}
                    className="group px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs tracking-wide transition-all shadow-[0_12px_30px_-8px_rgba(245,158,11,0.55)] flex items-center space-x-2.5"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Ingest PDF to Archive</span>
                    <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={onStartInterview}
                    className="px-5 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-md text-white font-semibold text-xs border border-white/[0.14] transition-all flex items-center space-x-2.5"
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <Radio className="h-4 w-4 text-rose-400" />
                    <span>Enter Live Voice Booth</span>
                  </button>

                  <button
                    onClick={() => onNavigate("courses")}
                    className="px-4 py-3.5 rounded-2xl bg-black/50 hover:bg-black/70 text-zinc-300 hover:text-white font-semibold text-xs border border-white/[0.08] transition-all flex items-center space-x-2"
                  >
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                    <span>Explore Curriculums ({courses.length})</span>
                  </button>
                </div>
              </div>

              {/* Right Floating Glass Monitor Card */}
              <div className="lg:col-span-5">
                <div className="p-5 rounded-3xl bg-black/65 backdrop-blur-2xl border border-white/[0.12] shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-mono-code text-[11px] uppercase tracking-wider text-zinc-300">
                        LIVE WORKSPACE TELEMETRY
                      </span>
                    </div>
                    <span className="font-mono-code text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      GROUNDED RAG
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                      <span className="font-mono-code text-[10px] text-zinc-400 block">INDEXED</span>
                      <span className="font-display text-xl font-bold text-white">{totalPages}</span>
                      <span className="text-[10px] text-zinc-500 block">PDF Pages</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                      <span className="font-mono-code text-[10px] text-zinc-400 block">VECTORS</span>
                      <span className="font-display text-xl font-bold text-amber-400">{totalChunks}</span>
                      <span className="text-[10px] text-zinc-500 block">Cited Chunks</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                      <span className="font-mono-code text-[10px] text-zinc-400 block">MODULES</span>
                      <span className="font-display text-xl font-bold text-emerald-400">{totalModules}</span>
                      <span className="text-[10px] text-zinc-500 block">Active Units</span>
                    </div>
                  </div>

                  {/* Mini waveform / status bar */}
                  <div className="p-3 rounded-2xl bg-zinc-950/90 border border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex items-end space-x-0.5 h-4">
                        {[0.4, 0.9, 0.6, 1, 0.5, 0.8, 0.3, 0.7].map((h, idx) => (
                          <span
                            key={idx}
                            className="w-1 bg-amber-400 rounded-full animate-eq-bar"
                            style={{
                              height: `${h * 100}%`,
                              animationDelay: `${idx * 0.12}s`,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-zinc-300 font-medium">
                        {heroMode === "cinema"
                          ? "Cinema Reel Stream Active"
                          : "Interactive Harmonic Field — Move Cursor"}
                      </span>
                    </div>
                    <span className="font-mono-code text-[10px] text-zinc-500">60 FPS</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 3. Interactive Blueprint Walkthrough Mode */
            <div className="relative z-10 my-auto py-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              {tourSteps.map((st, idx) => {
                const isSelected = activeTourStep === idx;
                return (
                  <div
                    key={st.step}
                    onClick={() => setActiveTourStep(idx)}
                    className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-5 ${
                      isSelected
                        ? "bg-black/85 border-amber-400/50 shadow-2xl scale-[1.01]"
                        : "bg-black/55 border-white/[0.08] hover:border-white/[0.2]"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono-code text-xs px-2.5 py-0.5 rounded-md border ${st.accent}`}>
                          STAGE {st.step}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-zinc-500" />
                      </div>
                      <h3 className="font-display text-base font-bold text-white">{st.title}</h3>
                      <p className="text-xs text-zinc-300 leading-relaxed">{st.caption}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(st.tab);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-amber-500 hover:text-black text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>{st.actionLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Cinema Controls & Scrubber Bar */}
          <div className="relative z-10 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlay}
                className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-xs font-semibold text-white flex items-center space-x-1.5 transition-colors"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-amber-400" />}
                <span>{isPlaying ? "Pause Reel" : "Play Reel"}</span>
              </button>
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-zinc-300 hover:text-white transition-colors"
                title={isMuted ? "Unmute Ambient Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-amber-400" />}
              </button>
              <span className="font-mono-code text-[11px] text-zinc-400 hidden sm:inline">
                HD 1080P // ZERO-HALLUCINATION CITATION ENGINE
              </span>
            </div>

            {/* Video Scrubber Progress */}
            <div className="flex items-center space-x-3 w-full sm:w-64">
              <span className="font-mono-code text-[10px] text-zinc-400">REEL</span>
              <div className="flex-1 h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-200"
                  style={{ width: `${Math.max(8, videoProgress)}%` }}
                />
              </div>
              <span className="font-mono-code text-[10px] text-amber-400">
                {Math.round(videoProgress)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ASYMMETRIC EDITORIAL BENTO GRID
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Active Curriculums & Source Archive */}
        <div className="lg:col-span-8 space-y-6">
          {/* Curriculums Bento Panel */}
          <div className="p-7 rounded-[26px] glass-panel space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono-code text-[10px] uppercase tracking-widest text-amber-400">
                    CHANNEL 03 // CURRICULUM LAB
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-white tracking-tight mt-0.5">
                  Synthesized Study Curriculums
                </h3>
              </div>
              <button
                onClick={() => onNavigate("courses")}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs font-semibold text-amber-300 flex items-center space-x-1.5 self-start sm:self-auto transition-all"
              >
                <span>Open Curriculum Lab</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="py-12 px-6 text-center rounded-2xl bg-[#07080c]/90 border border-dashed border-white/[0.1] space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-400">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="font-display text-base font-bold text-white">
                    No curriculums synthesized yet
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Upload a textbook PDF in the Source Archive or build a course from your existing documents in seconds.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate(documents.length > 0 ? "courses" : "documents")}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
                >
                  {documents.length > 0 ? "Build Course from Uploaded PDF" : "Upload First Textbook PDF"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.slice(0, 4).map((c, index) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCourse(c.id)}
                    className="p-5 rounded-2xl bg-[#080a10] border border-white/[0.07] hover:border-amber-500/40 cursor-pointer transition-all hover:-translate-y-1 group flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-code text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25">
                          VOL 0{index + 1} &bull; {c.modules?.length || 0} MODULES
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                      </div>
                      <h4 className="font-display text-base font-bold text-zinc-100 group-hover:text-white line-clamp-1">
                        {c.title}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {c.description || "Structured curriculum grounded in verified textbook pages."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500">
                      <span>5-Question Quizzes + Cheat Deck</span>
                      <span className="text-amber-400 font-semibold group-hover:underline">Enter Studio &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empirical PYQ Sprint Banner */}
          <div className="p-7 rounded-[26px] bg-gradient-to-r from-[#0d1218] via-[#0d1514] to-[#0a0d14] border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center space-x-2 text-[10px] font-mono-code uppercase tracking-widest text-emerald-400">
                <Flame className="h-3.5 w-3.5" />
                <span>EMPIRICAL EXAM FREQUENCY ENGINE</span>
              </div>
              <h4 className="font-display text-lg font-bold text-white">
                Align Past Question Papers with Your Textbook Syllabus
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Computes semantic cosine similarity between PYQ papers and textbook chapters to prioritize high-weight exam topics and build an adaptive daily schedule.
              </p>
            </div>
            <button
              onClick={() => onNavigate("sprints")}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all shrink-0 flex items-center space-x-2"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Launch Exam Roadmap</span>
            </button>
          </div>
        </div>

        {/* Right 4 Columns: Exam Roadmap Snapshot & Broadcast Voice Booth */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Exam Sprint Card */}
          <div className="p-6 rounded-[26px] glass-panel space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
              <div>
                <span className="font-mono-code text-[10px] text-emerald-400 uppercase tracking-wider block">
                  CHANNEL 04
                </span>
                <h3 className="font-display text-base font-bold text-white">
                  Active Exam Roadmap
                </h3>
              </div>
              {activeSprint && (
                <button
                  onClick={() => onSelectSprint(activeSprint.id)}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  Open Plan &rarr;
                </button>
              )}
            </div>

            {activeSprint ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#07080c] border border-white/[0.06] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white truncate">{activeSprint.title}</span>
                    <span className="font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                      {activeSprint.daily_study_hours}H / DAY
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${sprintProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400 font-mono-code">
                    <span>{activeSprint.progress_percentage}% COMPLETE</span>
                    <span>EXAM: {new Date(activeSprint.exam_date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-mono-code text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Next Scheduled Blocks
                  </span>
                  <div className="space-y-2">
                    {activeSprint.tasks.slice(0, 3).map((tk) => (
                      <div
                        key={tk.id}
                        onClick={() => onSelectSprint(activeSprint.id)}
                        className="p-3 rounded-xl bg-[#080a10] border border-white/[0.06] hover:border-white/[0.15] cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              tk.is_completed ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          <span
                            className={`truncate ${
                              tk.is_completed ? "line-through text-zinc-500" : "text-zinc-200 font-medium"
                            }`}
                          >
                            {tk.title}
                          </span>
                        </div>
                        <span className="font-mono-code text-[10px] text-zinc-500 shrink-0 ml-2">
                          {tk.estimated_minutes}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3 text-xs text-zinc-400">
                <CalendarDays className="h-7 w-7 text-zinc-600 mx-auto" />
                <p>No active exam sprint configured.</p>
                <button
                  onClick={() => onNavigate("sprints")}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold border border-white/[0.08]"
                >
                  Create Exam Schedule
                </button>
              </div>
            )}
          </div>

          {/* Voice Broadcast Booth Card */}
          <div className="p-6 rounded-[26px] bg-gradient-to-b from-[#140c14] to-[#0a0c12] border border-rose-500/25 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-mono-code text-[10px] uppercase tracking-widest text-rose-400 font-semibold">
                  ON AIR // VOICE BOOTH
                </span>
              </div>
              {lastInterview?.report && (
                <span className="font-mono-code text-xs font-bold text-emerald-400">
                  LAST: {lastInterview.report.overall_score}%
                </span>
              )}
            </div>

            <h3 className="font-display text-lg font-bold text-white">
              Adaptive Mock Mentor Studio
            </h3>

            <p className="text-xs text-zinc-300/90 leading-relaxed">
              Rehearse technical, system design, and behavioral rounds tailored to your resume PDF. Real-time speech-to-text dictation & multi-dimensional 1–5 grading.
            </p>

            <button
              onClick={onStartInterview}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black text-xs font-extrabold tracking-wide shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <Mic className="h-4 w-4" />
              <span>Start Voice Interview Session</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
