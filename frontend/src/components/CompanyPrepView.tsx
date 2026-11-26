"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Shuffle,
  Flame,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Mic,
  Lightbulb,
  Briefcase,
  Layers,
  Info,
  RotateCcw,
  PenLine,
  Timer,
  Code2,
  AlertCircle,
  Check,
  Sparkles,
  ExternalLink,
  StickyNote,
} from "lucide-react";
import {
  COMPANIES,
  ALL_CATEGORIES,
  getCompany,
  Company,
  CompanyQuestion,
  Difficulty,
  QCategory,
} from "@/data/companyQuestions";
import { getProblemForQuestion } from "@/data/codingProblems";
import {
  usePrepState,
  togglePracticed,
  setPracticed,
  addAttempt,
  setQuestionNote,
  latestAttemptByQuestion,
  newId,
} from "@/lib/prepStore";
import { api, PyqEvaluation } from "@/lib/api";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  EmptyState,
  InlineBanner,
} from "@/components/ui";

function subscribeNoop() {
  return () => {};
}

function getMonogram(name: string): string {
  const clean = name.replace(/\([^)]*\)/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getDifficultyVariant(
  difficulty: Difficulty
): "success" | "amber" | "error" {
  if (difficulty === "Easy") return "success";
  if (difficulty === "Medium") return "amber";
  return "error";
}

function getVerdictBadgeVariant(
  verdict: string
): "success" | "brand" | "amber" | "error" {
  if (verdict === "Strong") return "success";
  if (verdict === "Good") return "brand";
  if (verdict === "Needs work") return "amber";
  return "error";
}

function getVerdictScoreClasses(verdict: string): string {
  if (verdict === "Strong") {
    return "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
  }
  if (verdict === "Good") {
    return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
  }
  if (verdict === "Needs work") {
    return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
  }
  return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
}

export const CompanyPrepView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyParam = searchParams.get("company");

  const activeCompany: Company = useMemo(() => {
    return (companyParam && getCompany(companyParam)) || COMPANIES[0];
  }, [companyParam]);

  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const prepState = usePrepState();
  const latestAttempts = useMemo(
    () => latestAttemptByQuestion(prepState),
    [prepState]
  );

  const practicedSet = useMemo(
    () => new Set(prepState.practiced),
    [prepState.practiced]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<QCategory | "All">(
    () => {
      const catParam = searchParams.get("category");
      if (catParam && ALL_CATEGORIES.includes(catParam as QCategory)) {
        return catParam as QCategory;
      }
      return "All";
    }
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    Difficulty | "All"
  >("All");
  const [hidePracticed, setHidePracticed] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(35);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Per-question AI answer checker state
  const [checkerOpenIds, setCheckerOpenIds] = useState<Record<string, boolean>>(
    {}
  );
  const [noteOpenIds, setNoteOpenIds] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [gradingIds, setGradingIds] = useState<Record<string, boolean>>({});
  const [evaluations, setEvaluations] = useState<
    Record<string, PyqEvaluation>
  >({});
  const [evalErrors, setEvalErrors] = useState<Record<string, string | null>>(
    {}
  );
  const [showImprovedIds, setShowImprovedIds] = useState<
    Record<string, boolean>
  >({});

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totalQuestionsCount = useMemo(
    () => COMPANIES.reduce((acc, company) => acc + company.questions.length, 0),
    []
  );

  const toggleExpanded = (questionId: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const toggleChecker = (questionId: string) => {
    setCheckerOpenIds((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const toggleNoteEditor = (questionId: string) => {
    setNoteOpenIds((prev) => {
      const nextOpen = !prev[questionId];
      if (nextOpen && noteDrafts[questionId] === undefined) {
        const existing = prepState.notes?.[questionId] || "";
        setNoteDrafts((d) => ({ ...d, [questionId]: existing }));
      }
      return { ...prev, [questionId]: nextOpen };
    });
  };

  const handleSaveNote = (questionId: string) => {
    const text = (noteDrafts[questionId] ?? "").trim();
    setQuestionNote(questionId, text);
  };

  const handleGradeAnswer = async (item: CompanyQuestion) => {
    const draft = (answerDrafts[item.id] || "").trim();
    if (!draft) {
      setEvalErrors((prev) => ({
        ...prev,
        [item.id]: "Please write an answer before grading.",
      }));
      return;
    }

    setGradingIds((prev) => ({ ...prev, [item.id]: true }));
    setEvalErrors((prev) => ({ ...prev, [item.id]: null }));

    try {
      const result = await api.evaluatePyqAnswer({
        question: item.question,
        model_approach: item.approach,
        category: item.category,
        difficulty: item.difficulty,
        company: activeCompany.name,
        answer_text: draft,
      });

      setEvaluations((prev) => ({ ...prev, [item.id]: result }));
      addAttempt({
        id: newId(),
        questionId: item.id,
        companySlug: activeCompany.slug,
        category: item.category,
        score: result.score,
        verdict: result.verdict,
        gradedBy: result.graded_by,
        createdAt: new Date().toISOString(),
        source: "practice",
      });
      setPracticed(item.id, true);
    } catch (err: unknown) {
      setEvalErrors((prev) => ({
        ...prev,
        [item.id]:
          err instanceof Error
            ? err.message
            : "Could not grade answer right now.",
      }));
    } finally {
      setGradingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleSelectCompany = (slug: string) => {
    setHighlightedId(null);
    setVisibleLimit(35);
    router.replace(`/app/company-prep?company=${encodeURIComponent(slug)}`, {
      scroll: false,
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedDifficulty("All");
    setHidePracticed(false);
    setVisibleLimit(35);
  };

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return activeCompany.questions.filter((item) => {
      if (selectedCategory !== "All" && item.category !== selectedCategory) {
        return false;
      }
      if (
        selectedDifficulty !== "All" &&
        item.difficulty !== selectedDifficulty
      ) {
        return false;
      }
      if (hidePracticed && practicedSet.has(item.id)) {
        return false;
      }
      if (qLower) {
        const haystack = [
          item.question,
          item.round,
          item.category,
          item.approach,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(qLower)) {
          return false;
        }
      }
      return true;
    });
  }, [
    activeCompany,
    searchQuery,
    selectedCategory,
    selectedDifficulty,
    hidePracticed,
    practicedSet,
  ]);

  const displayedQuestions = useMemo(
    () => filteredQuestions.slice(0, visibleLimit),
    [filteredQuestions, visibleLimit]
  );

  const handleRandomQuestion = () => {
    const pool = filteredQuestions.filter((q) => !practicedSet.has(q.id));
    const fallbackPool =
      pool.length > 0
        ? pool
        : filteredQuestions.length > 0
        ? filteredQuestions
        : activeCompany.questions;

    if (fallbackPool.length === 0) return;

    const chosen =
      fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    const chosenIdx = filteredQuestions.findIndex((q) => q.id === chosen.id);
    if (chosenIdx >= visibleLimit) {
      setVisibleLimit(chosenIdx + 10);
    }
    setExpandedIds((prev) => ({ ...prev, [chosen.id]: true }));
    setHighlightedId(chosen.id);

    setTimeout(() => {
      const el = questionRefs.current[chosen.id];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
  };

  const buildMockInterviewHref = (q: CompanyQuestion) => {
    const role = activeCompany.roles[0] || "Software Engineer";
    const topics = `${q.category} (${q.tags.join(", ")}) — Sample PYQ: ${q.question}`;
    const jd = `${activeCompany.name} interview: ${topics}`;
    return `/app/interviews?role=${encodeURIComponent(role)}&jd=${encodeURIComponent(jd)}`;
  };

  const activePracticedCount = activeCompany.questions.filter((q) =>
    practicedSet.has(q.id)
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Company PYQs"
        description="Targeted previous-year technical, LeetCode hiring sheet, aptitude, and behavioral interview questions organized by company and round."
        badge={<Badge variant="amber">2025 hiring season</Badge>}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/app/company-prep/test?company=${encodeURIComponent(
                activeCompany.slug
              )}`}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white hover:bg-[#F7F8FA] text-[#17212B] border border-[#E2E7ED] hover:border-[#CBD5E1] text-sm font-medium gap-2 transition-colors"
            >
              <Timer className="h-4 w-4 text-[#1D4ED8]" />
              <span>Start mock test</span>
            </Link>
            <Button
              variant="primary"
              size="md"
              icon={<Shuffle className="h-4 w-4" />}
              onClick={handleRandomQuestion}
            >
              Random question
            </Button>
          </div>
        }
      />

      {/* Hero Banner Card with Photography */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E2E7ED] bg-[#0B1220] text-white shadow-sm">
        <div className="absolute inset-0">
          <Image
            src="/media/photo-interview.jpg"
            alt="Candidates preparing for company technical interviews"
            fill
            sizes="(max-width: 1280px) 100vw, 1152px"
            className="object-cover object-center opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/95 via-[#0B1220]/80 to-[#0B1220]/45" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-medium">
              <Building2 className="h-3.5 w-3.5" />
              <span>Expanded company-wise interview &amp; LeetCode bank</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Last year&apos;s company interview questions
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Includes the full 216-problem TCS LeetCode sheet plus expanded DSA, SQL, System Design, and Behavioral archives across all 12 companies with personal notes and AI grading.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-xs text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {COMPANIES.length}
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">
                Companies
              </div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-xs text-center">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {totalQuestionsCount}
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">
                Questions
              </div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-xs text-center">
              <div className="text-xl sm:text-2xl font-bold text-amber-300">
                {hydrated ? prepState.practiced.length : 0}
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">
                Practiced
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF]">
        <Info className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />
        <span>
          Compiled from publicly shared candidate experiences and company LeetCode tags (2025 hiring season). Questions vary by role and location.
        </span>
      </div>

      {/* Company Selection Grid */}
      <section aria-label="Select a company" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#17212B]">
            Choose a target company ({COMPANIES.length})
          </h3>
          <span className="text-xs text-[#526170]">
            Click any company to load its rounds and questions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {COMPANIES.map((company) => {
            const isSelected = company.slug === activeCompany.slug;
            const companyDone = company.questions.filter((q) =>
              practicedSet.has(q.id)
            ).length;
            const pct =
              company.questions.length > 0
                ? Math.round((companyDone / company.questions.length) * 100)
                : 0;

            return (
              <button
                key={company.slug}
                type="button"
                onClick={() => handleSelectCompany(company.slug)}
                aria-pressed={isSelected}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                  isSelected
                    ? "bg-[#EFF6FF] border-[#1D4ED8] ring-1 ring-[#1D4ED8] shadow-xs"
                    : "bg-white border-[#E2E7ED] hover:border-[#CBD5E1] hover:bg-[#F7F8FA]"
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-10 rounded-lg text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: company.color }}
                      aria-hidden="true"
                    >
                      {getMonogram(company.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#17212B] truncate">
                        {company.name}
                      </div>
                      <div className="text-xs text-[#526170]">
                        {company.questions.length} questions
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      company.tier === "Product"
                        ? "brand"
                        : company.tier === "Finance"
                        ? "amber"
                        : "default"
                    }
                  >
                    {company.tier}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#526170]">
                    <span>
                      {hydrated ? companyDone : 0}/{company.questions.length}{" "}
                      practiced
                    </span>
                    <span className="font-mono-code font-medium text-[#17212B]">
                      {hydrated ? pct : 0}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E2E7ED] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1D4ED8] rounded-full transition-all duration-300"
                      style={{ width: `${hydrated ? pct : 0}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Company Details Panel */}
      <Card className="p-6 space-y-6" elevated>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E7ED]">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-xl text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs"
              style={{ backgroundColor: activeCompany.color }}
              aria-hidden="true"
            >
              {getMonogram(activeCompany.name)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-[#17212B]">
                  {activeCompany.name}
                </h2>
                <Badge variant="brand">{activeCompany.tier}</Badge>
                <Badge variant="default">
                  Season {activeCompany.hiringSeason}
                </Badge>
              </div>
              <p className="text-xs text-[#526170] mt-1">
                {hydrated ? activePracticedCount : 0} of{" "}
                {activeCompany.questions.length} questions marked practiced
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href={`/app/company-prep/test?company=${encodeURIComponent(
                activeCompany.slug
              )}`}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-xs font-semibold gap-2 transition-colors"
            >
              <Timer className="h-4 w-4" />
              <span>Timed mock test</span>
            </Link>
            <Link
              href={`/app/interviews?role=${encodeURIComponent(
                activeCompany.roles[0] || "Software Engineer"
              )}&jd=${encodeURIComponent(
                `${activeCompany.name} interview preparation covering ${activeCompany.process.join(", ")}`
              )}`}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold gap-2 transition-colors"
            >
              <Mic className="h-4 w-4" />
              <span>Mock interview for {activeCompany.name}</span>
            </Link>
          </div>
        </div>

        {/* Roles & Hiring Process Stepper */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#526170] flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>Typical hiring roles</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {activeCompany.roles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1 rounded-lg bg-[#F7F8FA] border border-[#E2E7ED] text-xs font-medium text-[#17212B]"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#526170] flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>Hiring process</span>
            </h3>
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {activeCompany.process.map((round, idx) => (
                <li
                  key={round}
                  className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] flex flex-col gap-1"
                >
                  <span className="text-[11px] font-mono-code font-semibold text-[#1D4ED8]">
                    Round {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-[#17212B] leading-snug">
                    {round}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Preparation Tips */}
        <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#B45309]">
            <Lightbulb className="h-4 w-4 shrink-0" />
            <span>Candidate preparation notes for {activeCompany.name}</span>
          </div>
          <ul className="space-y-1.5 text-xs text-[#78350F] list-disc pl-5">
            {activeCompany.tips.map((tip) => (
              <li key={tip} className="leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Filter Bar */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleLimit(35);
              }}
              placeholder={`Search ${activeCompany.name} questions, LeetCode titles, tags...`}
              aria-label="Search company interview questions"
              className="pl-9"
            />
          </div>

          <div className="md:col-span-3">
            <Select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value as Difficulty | "All");
                setVisibleLimit(35);
              }}
              aria-label="Filter by difficulty"
            >
              <option value="All">All difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </Select>
          </div>

          <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#17212B] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hidePracticed}
                onChange={(e) => {
                  setHidePracticed(e.target.checked);
                  setVisibleLimit(35);
                }}
                className="h-4 w-4 rounded border-[#CBD5E1] text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer"
              />
              <span>Hide practiced</span>
            </label>

            {(searchQuery ||
              selectedCategory !== "All" ||
              selectedDifficulty !== "All" ||
              hidePracticed) && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={resetFilters}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div
          className="flex flex-wrap items-center gap-2 pt-1"
          role="group"
          aria-label="Filter by category"
        >
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("All");
              setVisibleLimit(35);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedCategory === "All"
                ? "bg-[#1D4ED8] text-white"
                : "bg-[#F1F4F8] text-[#526170] hover:text-[#17212B] hover:bg-[#E2E7ED]"
            }`}
          >
            All ({activeCompany.questions.length})
          </button>
          {ALL_CATEGORIES.map((category) => {
            const count = activeCompany.questions.filter(
              (q) => q.category === category
            ).length;
            if (count === 0) return null;
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setVisibleLimit(35);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-[#1D4ED8] text-white"
                    : "bg-[#F1F4F8] text-[#526170] hover:text-[#17212B] hover:bg-[#E2E7ED]"
                }`}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Question List */}
      <section aria-label="Interview questions" className="space-y-3.5">
        <div className="flex items-center justify-between text-xs text-[#526170]">
          <span>
            Showing{" "}
            <strong className="text-[#17212B]">
              {displayedQuestions.length}
            </strong>{" "}
            of{" "}
            <strong className="text-[#17212B]">
              {filteredQuestions.length}
            </strong>{" "}
            matching questions for {activeCompany.name}
          </span>
        </div>

        {filteredQuestions.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No matching questions"
            description="No questions matched your active filters or all remaining questions are marked as practiced."
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {displayedQuestions.map((item, idx) => {
              const isExpanded = Boolean(expandedIds[item.id]);
              const isCheckerOpen = Boolean(checkerOpenIds[item.id]);
              const isNoteOpen = Boolean(noteOpenIds[item.id]);
              const savedNote = hydrated
                ? prepState.notes?.[item.id] || ""
                : "";
              const isPracticed = hydrated && practicedSet.has(item.id);
              const isHighlighted = highlightedId === item.id;
              const lastAttempt = hydrated
                ? latestAttempts.get(item.id)
                : undefined;
              const relatedProblem = getProblemForQuestion(item.id);
              const evalResult = evaluations[item.id];
              const evalErr = evalErrors[item.id];
              const isGrading = Boolean(gradingIds[item.id]);
              const isImprovedOpen = Boolean(showImprovedIds[item.id]);

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    questionRefs.current[item.id] = el;
                  }}
                >
                  <Card
                    className={`p-5 transition-all ${
                      isHighlighted
                        ? "border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25"
                        : isPracticed
                        ? "bg-[#F7F8FA]/80 border-[#E2E7ED]"
                        : "hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex flex-col gap-3.5">
                      {/* Top Meta Badges & Practiced Checkbox */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono-code font-semibold text-[#64748B]">
                            #{idx + 1}
                          </span>
                          <Badge variant={getDifficultyVariant(item.difficulty)}>
                            {item.difficulty}
                          </Badge>
                          <Badge variant="brand">{item.category}</Badge>
                          <span className="text-xs text-[#526170] bg-[#F1F4F8] px-2.5 py-0.5 rounded-md border border-[#E2E7ED]">
                            {item.round}
                          </span>
                          {item.frequency === "Very common" ? (
                            <Badge variant="amber">
                              <Flame className="h-3 w-3 text-[#EA580C]" />
                              <span>Very common</span>
                            </Badge>
                          ) : (
                            <span className="text-[11px] font-medium text-[#64748B] px-2 py-0.5 rounded-md bg-[#F7F8FA]">
                              {item.frequency}
                            </span>
                          )}
                          {item.leetcodeUrl && (
                            <a
                              href={item.leetcodeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-xs font-semibold transition-colors"
                            >
                              <span>LeetCode</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {lastAttempt && (
                            <Badge
                              variant={getVerdictBadgeVariant(
                                lastAttempt.verdict
                              )}
                            >
                              Last score: {lastAttempt.score}/10 (
                              {lastAttempt.verdict})
                            </Badge>
                          )}
                        </div>

                        <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isPracticed}
                            onChange={() => togglePracticed(item.id)}
                            className="sr-only"
                          />
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                              isPracticed
                                ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]"
                                : "bg-white border-[#E2E7ED] text-[#526170] hover:bg-[#F7F8FA]"
                            }`}
                          >
                            {isPracticed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-[#64748B]" />
                            )}
                            <span>
                              {isPracticed ? "Practiced" : "Mark practiced"}
                            </span>
                          </span>
                        </label>
                      </div>

                      {/* Question Prompt */}
                      <h4
                        className={`text-sm sm:text-base font-semibold leading-snug ${
                          isPracticed ? "text-[#526170]" : "text-[#17212B]"
                        }`}
                      >
                        {item.question}
                      </h4>

                      {/* Saved Personal Note Preview */}
                      {savedNote && !isNoteOpen && (
                        <div className="p-3 rounded-lg bg-[#FFFBEB]/70 border border-[#FDE68A] text-xs text-[#78350F] flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <StickyNote className="h-3.5 w-3.5 text-[#B45309] shrink-0 mt-0.5" />
                            <span className="whitespace-pre-wrap">
                              {savedNote}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNoteEditor(item.id)}
                            className="text-[11px] font-semibold text-[#B45309] hover:underline shrink-0 cursor-pointer"
                          >
                            Edit note
                          </button>
                        </div>
                      )}

                      {/* Tags + Action Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] font-mono-code text-[#526170] bg-[#F1F4F8] px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant={isNoteOpen ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => toggleNoteEditor(item.id)}
                            icon={<StickyNote className="h-3.5 w-3.5" />}
                          >
                            {savedNote ? "Edit Note" : "+ Add Note"}
                          </Button>

                          <Button
                            variant={isCheckerOpen ? "secondary" : "outline"}
                            size="sm"
                            aria-expanded={isCheckerOpen}
                            onClick={() => toggleChecker(item.id)}
                            icon={<PenLine className="h-3.5 w-3.5" />}
                          >
                            Check my answer
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            aria-expanded={isExpanded}
                            onClick={() => toggleExpanded(item.id)}
                            icon={
                              isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )
                            }
                          >
                            {isExpanded ? "Hide approach" : "Show approach"}
                          </Button>

                          {relatedProblem && (
                            <Link
                              href={`/app/coding?problem=${encodeURIComponent(
                                relatedProblem.slug
                              )}`}
                              className="inline-flex items-center justify-center h-9 px-3 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-xs font-medium gap-1.5 transition-colors"
                            >
                              <Code2 className="h-3.5 w-3.5" />
                              <span>Solve in Coding Lab</span>
                            </Link>
                          )}

                          <Link
                            href={buildMockInterviewHref(item)}
                            className="inline-flex items-center justify-center h-9 px-3 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-xs font-medium gap-1.5 transition-colors"
                          >
                            <Mic className="h-3.5 w-3.5" />
                            <span>Practice in mock interview</span>
                          </Link>
                        </div>
                      </div>

                      {/* Personal Note Editor */}
                      {isNoteOpen && (
                        <div className="mt-1 p-4 rounded-xl bg-[#FFFBEB]/60 border border-[#FDE68A] space-y-2.5">
                          <div className="text-xs font-bold text-[#B45309] flex items-center gap-1.5">
                            <StickyNote className="h-3.5 w-3.5" />
                            <span>Personal revision note (saved &amp; synced)</span>
                          </div>
                          <Textarea
                            rows={3}
                            value={
                              noteDrafts[item.id] !== undefined
                                ? noteDrafts[item.id]
                                : savedNote
                            }
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Jot down your time complexity trick, edge case, or SQL syntax reminder..."
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setNoteOpenIds((prev) => ({
                                  ...prev,
                                  [item.id]: false,
                                }))
                              }
                            >
                              Close
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                handleSaveNote(item.id);
                                setNoteOpenIds((prev) => ({
                                  ...prev,
                                  [item.id]: false,
                                }));
                              }}
                            >
                              Save note
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Expandable AI Answer Checker Panel */}
                      {isCheckerOpen && (
                        <div className="mt-2 p-4 sm:p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#17212B] flex items-center gap-1.5">
                              <PenLine className="h-3.5 w-3.5 text-[#1D4ED8]" />
                              <span>Write your answer for evaluation</span>
                            </span>
                            <span className="text-[11px] text-[#526170]">
                              Graded on technical coverage, depth &amp; clarity
                            </span>
                          </div>

                          <Textarea
                            rows={6}
                            value={answerDrafts[item.id] || ""}
                            onChange={(e) =>
                              setAnswerDrafts((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Write your answer as you would say it in the interview…"
                            aria-label={`Your answer for ${item.question}`}
                          />

                          {evalErr && (
                            <InlineBanner
                              variant="error"
                              onDismiss={() =>
                                setEvalErrors((prev) => ({
                                  ...prev,
                                  [item.id]: null,
                                }))
                              }
                            >
                              {evalErr}
                            </InlineBanner>
                          )}

                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              loading={isGrading}
                              icon={<Sparkles className="h-3.5 w-3.5" />}
                              onClick={() => handleGradeAnswer(item)}
                            >
                              Grade answer
                            </Button>
                          </div>

                          {/* Evaluation Result Card */}
                          {evalResult && (
                            <div className="p-4 rounded-xl bg-white border border-[#E2E7ED] space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E7ED]">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`px-3 py-1.5 rounded-lg border font-mono-code text-lg font-bold ${getVerdictScoreClasses(
                                      evalResult.verdict
                                    )}`}
                                  >
                                    {evalResult.score}/10
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={getVerdictBadgeVariant(
                                          evalResult.verdict
                                        )}
                                      >
                                        {evalResult.verdict}
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] text-[#526170]">
                                      {evalResult.graded_by === "ai"
                                        ? "Graded by AI"
                                        : "Quick keyword check (add an API key in Settings for AI grading)"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <p className="text-xs sm:text-sm text-[#17212B] leading-relaxed">
                                {evalResult.feedback}
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <div className="text-xs font-bold text-[#15803D]">
                                    Covered points
                                  </div>
                                  {evalResult.covered_points.length > 0 ? (
                                    <ul className="space-y-1 text-xs text-[#17212B]">
                                      {evalResult.covered_points.map((pt) => (
                                        <li
                                          key={pt}
                                          className="flex items-start gap-2"
                                        >
                                          <Check className="h-3.5 w-3.5 text-[#15803D] shrink-0 mt-0.5" />
                                          <span>{pt}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-[#64748B]">
                                      No key concepts matched yet.
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-1.5">
                                  <div className="text-xs font-bold text-[#B45309]">
                                    Missing or to expand
                                  </div>
                                  {evalResult.missing_points.length > 0 ? (
                                    <ul className="space-y-1 text-xs text-[#17212B]">
                                      {evalResult.missing_points.map((pt) => (
                                        <li
                                          key={pt}
                                          className="flex items-start gap-2"
                                        >
                                          <AlertCircle className="h-3.5 w-3.5 text-[#B45309] shrink-0 mt-0.5" />
                                          <span>{pt}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-[#15803D]">
                                      All major reference points covered!
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-[#E2E7ED]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowImprovedIds((prev) => ({
                                      ...prev,
                                      [item.id]: !prev[item.id],
                                    }))
                                  }
                                  className="text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>
                                    {isImprovedOpen
                                      ? "Hide improved answer"
                                      : "Show improved answer"}
                                  </span>
                                  {isImprovedOpen ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                {isImprovedOpen && (
                                  <p className="mt-2 p-3 rounded-lg bg-[#EFF6FF]/60 border border-[#BFDBFE] text-xs sm:text-sm text-[#17212B] leading-relaxed">
                                    {evalResult.improved_answer}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expandable Model Approach */}
                      {isExpanded && (
                        <div className="mt-1 p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-1.5">
                          <div className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider">
                            Model approach &amp; key points
                          </div>
                          <p className="text-sm text-[#17212B] leading-relaxed">
                            {item.approach}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}

            {/* Pagination Load More Bar */}
            {filteredQuestions.length > visibleLimit && (
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setVisibleLimit((v) => v + 40)}
                >
                  Show 40 more questions ({filteredQuestions.length - visibleLimit} remaining)
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setVisibleLimit(filteredQuestions.length)}
                >
                  Show all {filteredQuestions.length}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
