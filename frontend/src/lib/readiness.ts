import {
  COMPANIES,
  ALL_CATEGORIES,
  QCategory,
} from "@/data/companyQuestions";
import { CODING_PROBLEMS } from "@/data/codingProblems";
import {
  PrepState,
  latestAttemptByQuestion,
  AnswerAttempt,
  MockTestResult,
} from "@/lib/prepStore";
import { InterviewSessionItem } from "@/lib/api";

export interface CategoryReadiness {
  category: QCategory;
  practicedCount: number;
  totalCount: number;
  avgScore10: number;
  score: number;
}

export interface CompanyReadinessItem {
  slug: string;
  name: string;
  color: string;
  tier: string;
  practicedCount: number;
  totalCount: number;
  percentPracticed: number;
  bestMockPercent: number | null;
}

export interface ActivityFeedItem {
  id: string;
  kind: "attempt" | "mock";
  title: string;
  subtitle: string;
  scoreLabel: string;
  timestamp: string;
  href: string;
}

export interface ReadinessSummary {
  overall: number;
  level: "Getting started" | "Building momentum" | "Interview ready";
  practicedCount: number;
  totalQuestions: number;
  coveragePct: number;
  qualityPct: number;
  avgAttemptScore10: number;
  attemptedQuestionsCount: number;
  codingPct: number;
  solvedCodingCount: number;
  totalCodingCount: number;
  mockPct: number;
  mockCount: number;
  interviewPct: number;
  completedInterviewsCount: number;
  categories: CategoryReadiness[];
  focusNext: CategoryReadiness[];
  companies: CompanyReadinessItem[];
  recentActivity: ActivityFeedItem[];
}

export function computeReadiness(
  state: PrepState,
  interviews: InterviewSessionItem[]
): ReadinessSummary {
  const allQuestions = COMPANIES.flatMap((c) =>
    c.questions.map((q) => ({ ...q, companySlug: c.slug, companyName: c.name }))
  );
  const totalQuestions = allQuestions.length;

  const latestMap = latestAttemptByQuestion(state);
  const practicedSet = new Set<string>([
    ...state.practiced,
    ...Array.from(latestMap.keys()),
  ]);

  const coverage =
    totalQuestions > 0 ? practicedSet.size / totalQuestions : 0;

  const latestAttempts = Array.from(latestMap.values());
  const avgAttemptScore10 =
    latestAttempts.length > 0
      ? latestAttempts.reduce((acc, a) => acc + a.score, 0) /
        latestAttempts.length
      : 0;
  const quality = avgAttemptScore10 / 10;

  const solvedCodingCount = Object.keys(state.codingSolved).length;
  const totalCodingCount = CODING_PROBLEMS.length;
  const coding =
    totalCodingCount > 0 ? solvedCodingCount / totalCodingCount : 0;

  const recentMocks = state.mockTests.slice(0, 5);
  const mock =
    recentMocks.length > 0
      ? recentMocks.reduce((acc, m) => acc + m.percent, 0) /
        (recentMocks.length * 100)
      : 0;

  const completedInterviews = interviews.filter(
    (i) => i.state === "COMPLETED" && i.report
  );
  const interview =
    completedInterviews.length > 0
      ? completedInterviews.reduce(
          (acc, i) => acc + (i.report?.overall_score || 0),
          0
        ) /
        (completedInterviews.length * 100)
      : 0;

  const overall = Math.round(
    100 *
      (0.25 * coverage +
        0.25 * quality +
        0.2 * coding +
        0.15 * mock +
        0.15 * interview)
  );

  const level: ReadinessSummary["level"] =
    overall < 40
      ? "Getting started"
      : overall < 70
      ? "Building momentum"
      : "Interview ready";

  const categories: CategoryReadiness[] = ALL_CATEGORIES.map((category) => {
    const qs = allQuestions.filter((q) => q.category === category);
    const totalCount = qs.length;
    const practicedInCat = qs.filter((q) => practicedSet.has(q.id)).length;
    const covC = totalCount > 0 ? practicedInCat / totalCount : 0;

    const scoresInCat = qs
      .map((q) => latestMap.get(q.id)?.score)
      .filter((s): s is number => typeof s === "number");
    const avgScore10 =
      scoresInCat.length > 0
        ? scoresInCat.reduce((a, b) => a + b, 0) / scoresInCat.length
        : 0;
    const qualC = avgScore10 / 10;

    const score = Math.round(100 * (0.5 * covC + 0.5 * qualC));
    return {
      category,
      practicedCount: practicedInCat,
      totalCount,
      avgScore10: Math.round(avgScore10 * 10) / 10,
      score,
    };
  });

  const focusNext = [...categories]
    .sort((a, b) => a.score - b.score || a.practicedCount - b.practicedCount)
    .slice(0, 3);

  const companies: CompanyReadinessItem[] = COMPANIES.map((c) => {
    const practicedInComp = c.questions.filter((q) =>
      practicedSet.has(q.id)
    ).length;
    const totalCount = c.questions.length;
    const percentPracticed =
      totalCount > 0 ? Math.round((practicedInComp / totalCount) * 100) : 0;
    const companyMocks = state.mockTests.filter(
      (m) => m.companySlug === c.slug
    );
    const bestMockPercent =
      companyMocks.length > 0
        ? Math.max(...companyMocks.map((m) => m.percent))
        : null;
    return {
      slug: c.slug,
      name: c.name,
      color: c.color,
      tier: c.tier,
      practicedCount: practicedInComp,
      totalCount,
      percentPracticed,
      bestMockPercent,
    };
  });

  const questionLookup = new Map(allQuestions.map((q) => [q.id, q]));

  const attemptFeed: ActivityFeedItem[] = state.attempts
    .slice(0, 10)
    .map((a: AnswerAttempt) => {
      const qInfo = questionLookup.get(a.questionId);
      return {
        id: `attempt-${a.id}`,
        kind: "attempt",
        title: qInfo
          ? `${qInfo.companyName}: ${qInfo.question.slice(0, 72)}${
              qInfo.question.length > 72 ? "…" : ""
            }`
          : `Question ${a.questionId}`,
        subtitle: `${a.category} • ${
          a.source === "mock" ? "Mock test answer" : "PYQ answer check"
        }`,
        scoreLabel: `${a.score}/10 (${a.verdict})`,
        timestamp: a.createdAt,
        href: `/app/company-prep?company=${encodeURIComponent(a.companySlug)}`,
      };
    });

  const mockFeed: ActivityFeedItem[] = state.mockTests
    .slice(0, 10)
    .map((m: MockTestResult) => {
      const comp = COMPANIES.find((c) => c.slug === m.companySlug);
      return {
        id: `mock-${m.id}`,
        kind: "mock",
        title: `${comp?.name || m.companySlug} Timed Mock Test`,
        subtitle: `${m.items.length} questions • ${Math.max(
          1,
          Math.round(m.usedSec / 60)
        )} min used`,
        scoreLabel: `${m.percent}%`,
        timestamp: m.startedAt,
        href: `/app/company-prep/test?company=${encodeURIComponent(
          m.companySlug
        )}`,
      };
    });

  const recentActivity = [...attemptFeed, ...mockFeed]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  return {
    overall,
    level,
    practicedCount: practicedSet.size,
    totalQuestions,
    coveragePct: Math.round(coverage * 100),
    qualityPct: Math.round(quality * 100),
    avgAttemptScore10: Math.round(avgAttemptScore10 * 10) / 10,
    attemptedQuestionsCount: latestAttempts.length,
    codingPct: Math.round(coding * 100),
    solvedCodingCount,
    totalCodingCount,
    mockPct: Math.round(mock * 100),
    mockCount: state.mockTests.length,
    interviewPct: Math.round(interview * 100),
    completedInterviewsCount: completedInterviews.length,
    categories,
    focusNext,
    companies,
    recentActivity,
  };
}
