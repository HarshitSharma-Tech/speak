"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Gauge,
  ArrowRight,
  Target,
  Building2,
  Code2,
  Timer,
  Mic,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { usePrepState, EMPTY_PREP_STATE } from "@/lib/prepStore";
import { useWorkspace } from "@/context/WorkspaceContext";
import { computeReadiness, CategoryReadiness } from "@/lib/readiness";
import { PageHeader, Card, Badge } from "@/components/ui";

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

const CategoryRadarChart: React.FC<{ categories: CategoryReadiness[] }> = ({
  categories,
}) => {
  const cx = 150;
  const cy = 150;
  const maxR = 95;
  const count = categories.length;

  const angleFor = (idx: number) =>
    -Math.PI / 2 + (idx * 2 * Math.PI) / Math.max(1, count);

  const pointFor = (idx: number, ratio: number) => {
    const a = angleFor(idx);
    const r = maxR * Math.max(0.06, Math.min(1, ratio));
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(
      cy +
      r * Math.sin(a)
    ).toFixed(1)}`;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPolygon = categories
    .map((c, idx) => pointFor(idx, c.score / 100))
    .join(" ");

  return (
    <svg
      viewBox="0 0 300 300"
      className="w-full max-w-[300px] h-[300px] mx-auto"
      role="img"
      aria-label="Category readiness radar chart"
    >
      {/* Concentric Grid Polygons */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={categories.map((_, idx) => pointFor(idx, r)).join(" ")}
          fill="none"
          stroke="#E2E7ED"
          strokeWidth="1"
        />
      ))}

      {/* Axis Spokes */}
      {categories.map((c, idx) => {
        const a = angleFor(idx);
        const x2 = cx + maxR * Math.cos(a);
        const y2 = cy + maxR * Math.sin(a);
        return (
          <line
            key={c.category}
            x1={cx}
            y1={cy}
            x2={x2}
            y2={y2}
            stroke="#E2E7ED"
            strokeWidth="1"
          />
        );
      })}

      {/* Filled Readiness Data Polygon */}
      <polygon
        points={dataPolygon}
        fill="#1D4ED8"
        fillOpacity={0.18}
        stroke="#1D4ED8"
        strokeWidth="2"
      />

      {/* Vertex Dots & Axis Labels */}
      {categories.map((c, idx) => {
        const a = angleFor(idx);
        const rDot = maxR * Math.max(0.06, c.score / 100);
        const dx = cx + rDot * Math.cos(a);
        const dy = cy + rDot * Math.sin(a);
        const lx = cx + (maxR + 28) * Math.cos(a);
        const ly = cy + (maxR + 22) * Math.sin(a);

        return (
          <g key={c.category}>
            <circle cx={dx} cy={dy} r="3.5" fill="#1D4ED8" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[#17212B] text-[10px] font-semibold"
            >
              {c.category.replace(" / Behavioral", "")} ({c.score}%)
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const ReadinessView: React.FC = () => {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const prepState = usePrepState();
  const { interviews } = useWorkspace();

  const summary = useMemo(
    () =>
      computeReadiness(
        hydrated ? prepState : EMPTY_PREP_STATE,
        hydrated ? interviews : []
      ),
    [hydrated, prepState, interviews]
  );

  const tiles = [
    {
      label: "PYQ coverage",
      weight: "25% weight",
      pct: summary.coveragePct,
      detail: `${summary.practicedCount}/${summary.totalQuestions} questions practiced`,
      emptyHint: "No PYQs marked practiced yet",
      ctaLabel: "Practice PYQs",
      href: "/app/company-prep",
      icon: Building2,
    },
    {
      label: "Answer quality",
      weight: "25% weight",
      pct: summary.qualityPct,
      detail:
        summary.attemptedQuestionsCount > 0
          ? `${summary.avgAttemptScore10}/10 avg across ${summary.attemptedQuestionsCount} graded`
          : "No written answers graded yet",
      emptyHint: "Grade an answer in Company PYQs",
      ctaLabel: "Check an answer",
      href: "/app/company-prep",
      icon: CheckCircle2,
    },
    {
      label: "Coding lab",
      weight: "20% weight",
      pct: summary.codingPct,
      detail: `${summary.solvedCodingCount}/${summary.totalCodingCount} problems solved`,
      emptyHint: "No coding problems solved yet",
      ctaLabel: "Open Coding Lab",
      href: "/app/coding",
      icon: Code2,
    },
    {
      label: "Mock tests",
      weight: "15% weight",
      pct: summary.mockPct,
      detail:
        summary.mockCount > 0
          ? `Avg of last ${Math.min(5, summary.mockCount)} timed test(s)`
          : "No timed mock tests taken yet",
      emptyHint: "Run a 15-min company simulation",
      ctaLabel: "Start mock test",
      href: "/app/company-prep/test",
      icon: Timer,
    },
    {
      label: "Voice interviews",
      weight: "15% weight",
      pct: summary.interviewPct,
      detail:
        summary.completedInterviewsCount > 0
          ? `${summary.completedInterviewsCount} completed session(s)`
          : "No completed mock interviews yet",
      emptyHint: "Complete a voice interview session",
      ctaLabel: "Practice interview",
      href: "/app/interviews",
      icon: Mic,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Placement Readiness Dashboard"
        description="Unified readiness index combining your Company PYQ coverage, graded answer quality, Coding Lab solutions, timed mock tests, and voice interviews."
        badge={
          <Badge
            variant={
              summary.level === "Interview ready"
                ? "success"
                : summary.level === "Building momentum"
                ? "brand"
                : "amber"
            }
          >
            {summary.level}
          </Badge>
        }
      />

      {/* Hero Score Card + 5 Weighted Component Tiles */}
      <Card className="p-6 sm:p-8 space-y-6" elevated>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E2E7ED]">
          <div className="flex items-center gap-6">
            <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#E2E7ED"
                  strokeWidth="9"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#1D4ED8"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${(summary.overall / 100) * 263.89} 263.89`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[#17212B]">
                  {summary.overall}%
                </span>
                <span className="text-[10px] text-[#526170] uppercase font-mono-code">
                  Readiness
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#17212B]">
                  {summary.level}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#526170] max-w-xl leading-relaxed">
                Your readiness score weights PYQ coverage (25%), graded answer quality (25%), Coding Lab solutions (20%), timed mock tests (15%), and completed voice mock interviews (15%).
              </p>
            </div>
          </div>

          <Link
            href="/app/company-prep/test"
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold gap-2 transition-colors shrink-0"
          >
            <Timer className="h-4 w-4" />
            <span>Take a timed mock test</span>
          </Link>
        </div>

        {/* 5 Component Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#17212B] flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-[#1D4ED8]" />
                      <span>{t.label}</span>
                    </span>
                    <span className="text-[10px] font-mono-code text-[#64748B]">
                      {t.weight}
                    </span>
                  </div>

                  <div className="text-xl font-bold text-[#1D4ED8]">
                    {t.pct}%
                  </div>

                  <div className="w-full h-1.5 bg-[#E2E7ED] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1D4ED8] rounded-full transition-all"
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-[#526170] leading-snug">
                    {t.pct === 0 ? t.emptyHint : t.detail}
                  </p>
                </div>

                <Link
                  href={t.href}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline inline-flex items-center gap-1"
                >
                  <span>{t.ctaLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Radar Chart & Focus Next Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <Card className="lg:col-span-6 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#17212B] flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#1D4ED8]" />
              <span>7-Category Skill Radar</span>
            </h3>
            <span className="text-xs text-[#526170]">
              Coverage + graded accuracy
            </span>
          </div>
          <CategoryRadarChart categories={summary.categories} />
        </Card>

        <Card className="lg:col-span-6 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#17212B] flex items-center gap-2">
                <Target className="h-4 w-4 text-[#EA580C]" />
                <span>Focus next (lowest 3 categories)</span>
              </h3>
              <p className="text-xs text-[#526170]">
                Targeted practice in these areas will raise your placement readiness fastest.
              </p>
            </div>

            <div className="space-y-3">
              {summary.focusNext.map((cat) => (
                <div
                  key={cat.category}
                  className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#17212B]">
                        {cat.category}
                      </span>
                      <Badge
                        variant={
                          cat.score >= 60
                            ? "brand"
                            : cat.score >= 30
                            ? "amber"
                            : "error"
                        }
                      >
                        {cat.score}% ready
                      </Badge>
                    </div>
                    <p className="text-xs text-[#526170]">
                      {cat.practicedCount}/{cat.totalCount} practiced &bull;{" "}
                      {cat.avgScore10 > 0
                        ? `${cat.avgScore10}/10 avg grade`
                        : "No graded answers yet"}
                    </p>
                  </div>

                  <Link
                    href={`/app/company-prep?category=${encodeURIComponent(
                      cat.category
                    )}`}
                    className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-xs font-semibold gap-1.5 shrink-0"
                  >
                    <span>Practice {cat.category}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#B45309] flex items-center justify-between gap-3">
            <span>
              Want to practice DSA execution? Solve the 14 curated problems in Coding Lab.
            </span>
            <Link
              href="/app/coding"
              className="font-bold underline shrink-0 hover:text-[#78350F]"
            >
              Coding Lab &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Company Readiness Table & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-7 overflow-hidden">
          <div className="p-5 border-b border-[#E2E7ED] flex items-center justify-between">
            <h3 className="text-base font-bold text-[#17212B]">
              Company-by-Company Progress
            </h3>
            <span className="text-xs text-[#526170]">12 companies</span>
          </div>
          <div className="divide-y divide-[#E2E7ED]">
            {summary.companies.map((c) => (
              <div
                key={c.slug}
                className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-[#F7F8FA]"
              >
                <div className="flex items-center gap-3 min-w-[180px]">
                  <div
                    className="h-8 w-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0"
                    style={{ backgroundColor: c.color }}
                  >
                    {getMonogram(c.name)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#17212B]">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-[#526170]">
                      {c.practicedCount}/{c.totalCount} practiced
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 hidden sm:block">
                    <div className="w-full h-1.5 bg-[#E2E7ED] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1D4ED8] rounded-full"
                        style={{ width: `${c.percentPracticed}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-mono-code text-[#526170]">
                    {c.bestMockPercent !== null
                      ? `Best mock: ${c.bestMockPercent}%`
                      : "No mock test"}
                  </span>
                  <Link
                    href={`/app/company-prep?company=${encodeURIComponent(
                      c.slug
                    )}`}
                    className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                  >
                    Open &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#17212B] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#1D4ED8]" />
              <span>Recent prep activity</span>
            </h3>
          </div>

          {summary.recentActivity.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#526170] space-y-2">
              <p>
                No graded answers or timed mock tests recorded yet.
              </p>
              <Link
                href="/app/company-prep"
                className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:underline"
              >
                <span>Grade your first PYQ answer</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E7ED]">
              {summary.recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={act.href}
                      className="text-xs font-bold text-[#17212B] hover:text-[#1D4ED8] line-clamp-1"
                    >
                      {act.title}
                    </Link>
                    <p className="text-[11px] text-[#526170]">
                      {act.subtitle} &bull;{" "}
                      {new Date(act.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="brand" className="shrink-0">
                    {act.scoreLabel}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
