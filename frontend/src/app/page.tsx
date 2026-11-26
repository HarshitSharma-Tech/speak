"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Mic,
  CheckCircle2,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Building2,
  ChevronRight,
  ChevronDown,
  Check,
  Flame,
  Menu,
  X,
  FileCheck,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { COMPANIES, Company } from "@/data/companyQuestions";

const FEATURED_SLUGS = ["google", "amazon", "tcs", "microsoft"] as const;

function getMonogram(name: string): string {
  const clean = name.replace(/\([^)]*\)/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const raf = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function RevealSection({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <section
      id={id}
      ref={ref}
      className={`${className} transition-opacity duration-500 ${
        visible ? "animate-fade-up opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "Are generated notes, cheat sheets, and quizzes grounded in my uploaded PDFs?",
    a: "Yes. LearnSync extracts text page-by-page from your uploaded PDF textbooks and lecture notes, stores chunk embeddings in a vector index, and attaches explicit source page citations to quiz questions and explanations.",
  },
  {
    q: "Which companies and rounds are covered in Company PYQs?",
    a: "The 2025 hiring season bank spans 12 companies across product, finance, startup, and service tracks—including Google, Amazon, Microsoft, Meta, Adobe, Flipkart, Goldman Sachs, Atlassian, TCS, Infosys, Accenture, and Deloitte—covering DSA, System Design, CS Fundamentals, SQL, OOP, Aptitude, and Behavioral rounds.",
  },
  {
    q: "Is LearnSync free to use locally?",
    a: "Yes. You can launch the study workspace directly with no credit card or subscription paywall, upload PDFs up to 50 MB, build exam plans, and practice company questions immediately.",
  },
  {
    q: "Does voice mock interview work in every browser?",
    a: "Typed responses and structured scoring work in every modern browser. Live voice dictation (Web Speech recognition) and spoken interviewer playback work best in Chromium-based browsers such as Google Chrome and Microsoft Edge.",
  },
  {
    q: "How is my uploaded study data handled?",
    a: "Your PDFs, courses, exam sprints, and interview sessions persist in your configured backend database and local Chroma vector store, while Company PYQ practice checkmarks are saved locally in your browser.",
  },
];

export default function PublicHomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeCompanySlug, setActiveCompanySlug] = useState<string>("google");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalQuestions = COMPANIES.reduce(
    (sum, c) => sum + c.questions.length,
    0
  );

  const featuredCompanies: Company[] = FEATURED_SLUGS.map(
    (slug) => COMPANIES.find((c) => c.slug === slug) || COMPANIES[0]
  );

  const activePreviewCompany =
    featuredCompanies.find((c) => c.slug === activeCompanySlug) ||
    featuredCompanies[0];

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0B1220] flex flex-col selection:bg-[#1D4ED8] selection:text-white overflow-x-hidden">
      {/* 1. Sticky Header */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E2E7ED] shadow-xs text-[#0B1220]"
            : "bg-transparent text-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-xl"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-white flex items-center justify-center shadow-md shadow-[#1D4ED8]/25">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight leading-none">
                LearnSync
              </span>
              <span
                className={`text-[10px] font-mono-code tracking-widest uppercase mt-0.5 ${
                  scrolled ? "text-[#526170]" : "text-slate-300"
                }`}
              >
                Study Workspace
              </span>
            </div>
          </Link>

          <nav
            aria-label="Primary navigation"
            className={`hidden md:flex items-center gap-8 text-sm font-medium ${
              scrolled ? "text-[#526170]" : "text-slate-200"
            }`}
          >
            <a
              href="#features"
              className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded px-1 ${
                scrolled ? "hover:text-[#0B1220]" : "hover:text-white"
              }`}
            >
              Features
            </a>
            <a
              href="#company-pyqs"
              className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded px-1 ${
                scrolled ? "hover:text-[#0B1220]" : "hover:text-white"
              }`}
            >
              Company PYQs
            </a>
            <a
              href="#how-it-works"
              className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded px-1 ${
                scrolled ? "hover:text-[#0B1220]" : "hover:text-white"
              }`}
            >
              How it works
            </a>
            <a
              href="#stories"
              className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded px-1 ${
                scrolled ? "hover:text-[#0B1220]" : "hover:text-white"
              }`}
            >
              Stories
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/app"
              className="hidden sm:inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1E3A8A] text-white text-sm font-semibold transition-all shadow-md shadow-[#1D4ED8]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2 gap-2 group"
            >
              <span>Open workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className={`md:hidden p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                scrolled
                  ? "text-[#0B1220] hover:bg-[#E2E7ED]/60"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FAF8F5] text-[#0B1220] border-b border-[#E2E7ED] px-4 py-4 space-y-3 shadow-lg">
            <div className="flex flex-col space-y-2 text-sm font-medium">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-[#EFF6FF]"
              >
                Features
              </a>
              <a
                href="#company-pyqs"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-[#EFF6FF]"
              >
                Company PYQs
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-[#EFF6FF]"
              >
                How it works
              </a>
              <a
                href="#stories"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-[#EFF6FF]"
              >
                Stories
              </a>
            </div>
            <Link
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center h-10 px-4 rounded-xl bg-[#1D4ED8] text-white text-sm font-semibold gap-2"
            >
              <span>Open workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* 2. Full-Bleed Video Hero */}
        <section className="relative min-h-[92vh] bg-[#0B1220] text-white flex items-center overflow-hidden">
          <video
            ref={videoRef}
            src="/videos/hero-reel.mp4"
            poster="/media/photo-hero-desk.jpg"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Ink Gradient Overlays for Legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/95 via-[#0B1220]/75 to-[#0B1220]/45 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-transparent to-[#0B1220]/50 pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left-aligned Hero Content */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-amber-300 text-xs font-semibold backdrop-blur-sm">
                  <Flame className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>2025 company questions now inside</span>
                </div>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-white">
                  Crack your exams and your dream company interview.
                </h1>

                <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl">
                  Turn PDF textbooks into structured courses with page-cited quizzes, map past papers into daily exam sprints, and rehearse last year&apos;s top company interview questions with live voice coaching.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link
                    href="/app"
                    className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1E3A8A] text-white text-sm sm:text-base font-semibold transition-all shadow-lg shadow-[#1D4ED8]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] gap-2"
                  >
                    <span>Start preparing</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/app/company-prep"
                    className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm sm:text-base font-medium backdrop-blur-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] gap-2"
                  >
                    <Building2 className="h-4 w-4 text-amber-300" />
                    <span>Browse company questions</span>
                  </Link>
                </div>

                <div className="pt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#60A5FA]" />
                    <span>{COMPANIES.length} companies</span>
                  </span>
                  <span className="text-slate-500" aria-hidden="true">
                    &bull;
                  </span>
                  <span>{totalQuestions} real questions</span>
                  <span className="text-slate-500" aria-hidden="true">
                    &bull;
                  </span>
                  <span>Cited answers</span>
                </div>
              </div>

              {/* Right Floating Glass Preview Card */}
              <div className="hidden lg:block lg:col-span-5">
                <div className="p-6 rounded-2xl bg-[#0B1220]/75 border border-white/15 backdrop-blur-md shadow-2xl space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-[#D97706] text-white font-bold text-sm flex items-center justify-center">
                        A
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Amazon &bull; SDE-1
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Technical Round 1
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-amber-300 text-[11px] font-semibold">
                      <Flame className="h-3 w-3 text-[#F59E0B]" />
                      Very common
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-base font-bold text-white leading-snug">
                      Design and implement an LRU Cache supporting O(1) get and put operations.
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pair a HashMap pointing to doubly linked list nodes so lookups, promotions, and tail evictions stay strictly constant time.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {["DSA", "HashMap", "Doubly Linked List", "Caching"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-mono-code px-2 py-0.5 rounded bg-white/10 text-slate-200"
                        >
                          {tag}
                        </span>
                      )
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <Link
                      href="/app/company-prep?company=amazon"
                      className="text-xs font-semibold text-[#60A5FA] hover:text-white inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Open Amazon PYQ bank</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/app/interviews?role=SDE-1&jd=Amazon+LRU+Cache+and+Leadership+Principles"
                      className="text-xs font-medium text-amber-300 hover:text-amber-200 inline-flex items-center gap-1"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Practice aloud</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom-right Video Playback Controls */}
          <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause background video" : "Play background video"}
              className="h-9 px-3 rounded-lg bg-[#0B1220]/75 hover:bg-[#0B1220] border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span className="hidden sm:inline">Play</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute background video" : "Mute background video"}
              className="h-9 w-9 rounded-lg bg-[#0B1220]/75 hover:bg-[#0B1220] border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA]"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4 text-[#60A5FA]" />
              )}
            </button>
          </div>
        </section>

        {/* 3. Company Marquee Strip */}
        <section
          aria-label="Companies included in interview question bank"
          className="bg-white border-y border-[#E2E7ED] py-5 overflow-hidden"
        >
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[...COMPANIES, ...COMPANIES].map((company, index) => (
              <Link
                key={`${company.slug}-${index}`}
                href={`/app/company-prep?company=${company.slug}`}
                className="mx-3 inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EFF6FF] border border-[#E2E7ED] hover:border-[#BFDBFE] transition-colors shrink-0"
              >
                <span
                  className="h-7 w-7 rounded-md text-white text-xs font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: company.color }}
                  aria-hidden="true"
                >
                  {getMonogram(company.name)}
                </span>
                <span className="text-sm font-semibold text-[#0B1220]">
                  {company.name}
                </span>
                <span className="text-[11px] font-mono-code text-[#526170]">
                  {company.questions.length} Qs
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Features (4 Alternating Image/Text Rows) */}
        <RevealSection
          id="features"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 scroll-mt-20 space-y-20"
        >
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Four focused workflows
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1220] tracking-tight">
              Built for deep study, exam weeks, and placement season
            </h2>
            <p className="text-sm sm:text-base text-[#526170]">
              Every module works from your real documents and curated hiring archives without guesswork.
            </p>
          </div>

          {/* Row 1: Courses & Cited Quizzes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="h-11 w-11 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1220] tracking-tight">
                Structured courses and page-cited quizzes
              </h3>
              <p className="text-sm sm:text-base text-[#526170] leading-relaxed">
                Upload dense PDF textbooks or lecture slides. LearnSync breaks chapters into readable modules, distills formula cheat sheets, and verifies every quiz question against its source passage.
              </p>
              <ul className="space-y-2.5 text-sm text-[#17212B]">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Direct PDF page citations inside every quiz explanation</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>High-yield definitions and formulas organized into cheat sheets</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Source modal viewer to inspect original textbook context</span>
                </li>
              </ul>
              <div>
                <Link
                  href="/app/courses"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
                >
                  <span>Explore courses</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#E2E7ED] shadow-md">
                <Image
                  src="/media/photo-courses.jpg"
                  alt="Student studying structured textbook course notes"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto p-3.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E2E7ED] shadow-lg flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1220]">
                      5-Question Active Recall Quiz
                    </div>
                    <div className="text-[11px] text-[#526170] font-mono-code">
                      Verified source: Page 142 &bull; Chunk #18
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Exam Sprints (image left) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#E2E7ED] shadow-md">
                <Image
                  src="/media/photo-exam.jpg"
                  alt="Exam sprint preparation calendar and notes"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto p-3.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E2E7ED] shadow-lg flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#FFFBEB] text-[#B45309] flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1220]">
                      Priority Score: 0.91 High Yield
                    </div>
                    <div className="text-[11px] text-[#526170] font-mono-code">
                      PYQ frequency &times; syllabus match
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
              <div className="h-11 w-11 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1220] tracking-tight">
                Exam sprints driven by past question papers
              </h3>
              <p className="text-sm sm:text-base text-[#526170] leading-relaxed">
                Pair your past exam papers with your syllabus and target date. The sprint engine scores topic recurrence separately from textbook similarity and builds a day-by-day study schedule.
              </p>
              <ul className="space-y-2.5 text-sm text-[#17212B]">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Transparent priority weights combining frequency and text match</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Balanced daily tasks: topic study, revision, PYQs, and mocks</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Interactive checklist tracking overall exam readiness</span>
                </li>
              </ul>
              <div>
                <Link
                  href="/app/sprints"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
                >
                  <span>Build an exam sprint</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Row 3: Mock Interviews */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="h-11 w-11 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center">
                <Mic className="h-5 w-5" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1220] tracking-tight">
                Speech-enabled mock interviews tailored to your role
              </h3>
              <p className="text-sm sm:text-base text-[#526170] leading-relaxed">
                Practice answering technical and behavioral prompts aloud using browser speech recognition and audio playback, then review rubric scores on technical depth and clarity.
              </p>
              <ul className="space-y-2.5 text-sm text-[#17212B]">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Optional resume PDF grounding for personalized follow-ups</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Voice dictation plus clean typed response fallback</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Detailed scorecards with concrete improvement advice</span>
                </li>
              </ul>
              <div>
                <Link
                  href="/app/interviews"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
                >
                  <span>Start interview practice</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#E2E7ED] shadow-md">
                <Image
                  src="/media/photo-company-interview.jpg"
                  alt="Candidate practicing in a bright conference room interview"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto p-3.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E2E7ED] shadow-lg flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1220]">
                      Adaptive Q&amp;A Rubric
                    </div>
                    <div className="text-[11px] text-[#526170] font-mono-code">
                      Clarity 4.5/5 &bull; Role Relevance 5/5
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Company PYQs (image left) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#E2E7ED] shadow-md">
                <Image
                  src="/media/photo-coding-prep.jpg"
                  alt="Student practicing company interview coding problems at a desk"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto p-3.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E2E7ED] shadow-lg flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#FFFBEB] text-[#EA580C] flex items-center justify-center shrink-0">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1220]">
                      2025 Company Interview Bank
                    </div>
                    <div className="text-[11px] text-[#526170] font-mono-code">
                      {COMPANIES.length} companies &bull; {totalQuestions} questions
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
              <div className="h-11 w-11 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#EA580C] flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1220] tracking-tight">
                Prepare directly from last year&apos;s company questions
              </h3>
              <p className="text-sm sm:text-base text-[#526170] leading-relaxed">
                Browse curated 2025 hiring season questions across product, finance, and service companies—complete with hiring round breakdowns, candidate tips, model approaches, and one-click mock interview launches.
              </p>
              <ul className="space-y-2.5 text-sm text-[#17212B]">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Filter by DSA, System Design, SQL, OOP, Aptitude &amp; HR</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Track practiced questions locally with per-company progress</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                  <span>Send any company question straight into a voice mock interview</span>
                </li>
              </ul>
              <div>
                <Link
                  href="/app/company-prep"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
                >
                  <span>Browse all {COMPANIES.length} companies</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* 5. Company PYQs Preview (Dark Ink Section) */}
        <RevealSection
          id="company-pyqs"
          className="bg-[#0B1220] text-white py-20 sm:py-24 scroll-mt-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-amber-300 text-xs font-semibold">
                  <Building2 className="h-3.5 w-3.5" />
                  2025 Hiring Season Archive
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Inspect what top companies asked last year
                </h2>
                <p className="text-sm sm:text-base text-slate-300">
                  Switch between companies to preview real rounds, difficulty balance, and frequently repeated prompts.
                </p>
              </div>

              {/* Company Tabs */}
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Preview company interview questions"
              >
                {featuredCompanies.map((company) => {
                  const active = company.slug === activePreviewCompany.slug;
                  return (
                    <button
                      key={company.slug}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveCompanySlug(company.slug)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] ${
                        active
                          ? "bg-[#1D4ED8] text-white shadow-md shadow-[#1D4ED8]/30"
                          : "bg-white/[0.07] text-slate-300 hover:bg-white/[0.14] hover:text-white border border-white/10"
                      }`}
                    >
                      <span
                        className="h-5 w-5 rounded text-[10px] font-bold text-white flex items-center justify-center"
                        style={{ backgroundColor: company.color }}
                        aria-hidden="true"
                      >
                        {getMonogram(company.name)}
                      </span>
                      <span>{company.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Sample Questions List */}
              <div className="lg:col-span-7 space-y-3.5">
                {activePreviewCompany.questions.slice(0, 4).map((q) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-[#3B82F6]/60 transition-colors space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                            q.difficulty === "Easy"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : q.difficulty === "Medium"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[#1D4ED8]/25 text-[#93C5FD] border border-[#3B82F6]/30">
                          {q.category}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {q.round}
                        </span>
                      </div>

                      {q.frequency === "Very common" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                          <Flame className="h-3 w-3 text-[#F59E0B]" />
                          Very common
                        </span>
                      )}
                    </div>

                    <p className="text-sm sm:text-base font-medium text-white leading-snug">
                      {q.question}
                    </p>
                  </div>
                ))}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <Link
                    href={`/app/company-prep?company=${activePreviewCompany.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-colors"
                  >
                    <span>
                      See all {activePreviewCompany.questions.length} questions
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-xs text-slate-400">
                    {activePreviewCompany.process.length} hiring rounds mapped
                  </span>
                </div>
              </div>

              {/* Side Whiteboard Photo */}
              <div className="lg:col-span-5">
                <div className="relative h-full min-h-[320px] rounded-2xl overflow-hidden border border-white/15">
                  <Image
                    src="/media/photo-whiteboard.jpg"
                    alt="Engineers discussing system design diagram on whiteboard"
                    fill
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/30 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 space-y-2">
                    <span className="text-[11px] font-mono-code uppercase tracking-wider text-amber-300">
                      {activePreviewCompany.name} Rounds
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      From online screening to system design &amp; bar raiser
                    </h3>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activePreviewCompany.process.map((step, i) => (
                        <span
                          key={step}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0B1220]/80 border border-white/15 text-slate-200"
                        >
                          {i + 1}. {step}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* 6. How It Works (3 Numbered Steps with Connector Line) */}
        <RevealSection
          id="how-it-works"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 scroll-mt-20"
        >
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-semibold">
              Simple workflow
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1220] tracking-tight">
              Three steps from raw material to interview readiness
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Desktop Connector Line */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-11 left-[16%] right-[16%] h-0.5 bg-[#BFDBFE]"
            />

            {[
              {
                num: "01",
                icon: FileCheck,
                title: "Upload PDFs or pick a company",
                desc: "Add textbooks, lecture notes, past exam papers, or choose a target company from the 2025 interview bank.",
              },
              {
                num: "02",
                icon: Layers,
                title: "Generate plans & study guides",
                desc: "Build module notes, formula cheat sheets, or a daily exam sprint ranked by observed past paper frequency.",
              },
              {
                num: "03",
                icon: Mic,
                title: "Test recall & speak answers aloud",
                desc: "Verify comprehension with 5-question page-cited quizzes or rehearse real company prompts in voice mock interviews.",
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="relative bg-white p-7 rounded-2xl border border-[#E2E7ED] shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono-code text-2xl font-bold text-[#BFDBFE]">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1220]">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#526170] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </RevealSection>

        {/* 7. Honest Feature Stats Band */}
        <section className="bg-[#EFF6FF] border-y border-[#BFDBFE] py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div className="space-y-1">
                <div className="font-display text-3xl sm:text-4xl font-bold text-[#1D4ED8]">
                  {COMPANIES.length}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[#0B1220]">
                  Target companies covered
                </div>
                <div className="text-xs text-[#526170]">
                  Product, finance, startup &amp; service
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-display text-3xl sm:text-4xl font-bold text-[#1D4ED8]">
                  {totalQuestions}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[#0B1220]">
                  2025 company PYQs
                </div>
                <div className="text-xs text-[#526170]">
                  With round tags &amp; model approaches
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-display text-3xl sm:text-4xl font-bold text-[#1D4ED8]">
                  5-question
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[#0B1220]">
                  Page-cited quizzes
                </div>
                <div className="text-xs text-[#526170]">
                  Linked back to PDF chunk pages
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-display text-3xl sm:text-4xl font-bold text-[#1D4ED8]">
                  24/7
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[#0B1220]">
                  Voice interview practice
                </div>
                <div className="text-xs text-[#526170]">
                  Speech playback &amp; structured rubrics
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Example Student Scenarios */}
        <RevealSection
          id="stories"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 scroll-mt-20 space-y-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-semibold">
                Example student scenarios
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1220] tracking-tight">
                How students structure a semester or placement sprint
              </h2>
              <p className="text-sm sm:text-base text-[#526170] leading-relaxed">
                Representative study workflows designed around finals week, campus technical placements, and off-campus software interviews.
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-60 sm:h-68 rounded-2xl overflow-hidden border border-[#E2E7ED] shadow-sm">
                <Image
                  src="/media/photo-group-study.jpg"
                  alt="University students studying together around a library table"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                initials: "AR",
                label: "Final-year CS placement prep",
                track: "Company PYQs + Mock Interviews",
                quote:
                  "Uses the Amazon and Flipkart tabs to review LRU Cache, Splitwise LLD, and Leadership Principles, then launches a 5-question voice mock interview before the actual technical screen.",
              },
              {
                initials: "PK",
                label: "7-day OS & DBMS exam sprint",
                track: "Exam Sprints + Cited Quizzes",
                quote:
                  "Uploads three past university question papers alongside a textbook PDF so high-frequency deadlock and normalization topics jump to Day 1 of the daily agenda.",
              },
              {
                initials: "SN",
                label: "Service-track aptitude & SQL polish",
                track: "TCS / Infosys / Deloitte Bank",
                quote:
                  "Practices NQT time-and-work shortcuts, Infosys recursion tracing, and SQL window-function joins while checking off each completed prompt in the browser.",
              },
            ].map((item) => (
              <div
                key={item.initials}
                className="p-6 rounded-2xl bg-white border border-[#E2E7ED] shadow-xs flex flex-col justify-between gap-5"
              >
                <p className="text-sm text-[#17212B] leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-[#E2E7ED]">
                  <div className="h-10 w-10 rounded-full bg-[#1D4ED8] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1220]">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-[#526170]">
                      {item.track}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RevealSection>

        {/* 9. FAQ Accordion */}
        <section
          id="faq"
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-24 space-y-8"
        >
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl font-bold text-[#0B1220] tracking-tight">
              Frequently asked questions
            </h2>
            <p className="text-sm text-[#526170]">
              Quick answers on source citations, company coverage, and browser support.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-xl bg-white border border-[#E2E7ED] overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-[#F7F8FA] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                  >
                    <span className="text-sm sm:text-base font-semibold text-[#0B1220]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[#526170] shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#1D4ED8]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-[#526170] leading-relaxed border-t border-[#E2E7ED] pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 10. Final CTA with photo-success.jpg */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#1E3A8A]/20">
            <Image
              src="/media/photo-success.jpg"
              alt="Smiling graduate holding an offer folder on campus"
              fill
              sizes="(max-width: 1280px) 100vw, 1216px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/90 via-[#1E3A8A]/85 to-[#1D4ED8]/75" />

            <div className="relative z-10 p-8 sm:p-14 lg:p-16 max-w-2xl space-y-5 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-medium text-white backdrop-blur-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
                <span>Ready immediately — no account wall</span>
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
                Turn tonight&apos;s prep into your strongest interview yet.
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                Upload your study PDFs, map out your exam sprint, or jump straight into last year&apos;s company interview rounds.
              </p>
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#1D4ED8] font-bold text-sm sm:text-base transition-colors shadow-lg gap-2"
                >
                  <span>Open workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/app/company-prep"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold text-sm transition-colors backdrop-blur-xs"
                >
                  Explore Company PYQs
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 11. Footer */}
      <footer className="bg-[#0B1220] text-slate-300 border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/10">
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-white flex items-center justify-center">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="font-display font-bold text-lg text-white">
                LearnSync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              Grounded academic and technical interview workspace built around your real textbooks, exam papers, and company hiring rounds.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
            <div className="space-y-2.5">
              <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
                Product
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/app" className="hover:text-white transition-colors">
                    Workspace
                  </Link>
                </li>
                <li>
                  <Link href="/app/documents" className="hover:text-white transition-colors">
                    Documents
                  </Link>
                </li>
                <li>
                  <Link href="/app/courses" className="hover:text-white transition-colors">
                    Courses
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
                Preparation
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/app/sprints" className="hover:text-white transition-colors">
                    Exam plans
                  </Link>
                </li>
                <li>
                  <Link href="/app/interviews" className="hover:text-white transition-colors">
                    Interview practice
                  </Link>
                </li>
                <li>
                  <Link href="/app/company-prep" className="hover:text-white transition-colors">
                    Company PYQs
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
                System
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/app/settings" className="hover:text-white transition-colors">
                    Settings
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>&copy; 2026 LearnSync. Grounded Study &amp; Interview Workspace.</span>
          <span>12 companies &bull; 2025 hiring season archive</span>
        </div>
      </footer>
    </div>
  );
}
