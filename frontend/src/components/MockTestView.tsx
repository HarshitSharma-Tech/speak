"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Timer,
  Play,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Gauge,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  COMPANIES,
  Company,
  CompanyQuestion,
  getCompany,
} from "@/data/companyQuestions";
import { api, PyqEvaluation } from "@/lib/api";
import {
  usePrepState,
  addAttempt,
  addMockTest,
  setPracticed,
  newId,
} from "@/lib/prepStore";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Select,
  Textarea,
  ConfirmDialog,
  FormField,
} from "@/components/ui";

function subscribeNoop() {
  return () => {};
}

function pickDiverseQuestions(
  company: Company,
  count: number
): CompanyQuestion[] {
  const byCat = new Map<string, CompanyQuestion[]>();
  for (const q of company.questions) {
    const list = byCat.get(q.category) || [];
    list.push(q);
    byCat.set(q.category, list);
  }
  for (const list of byCat.values()) {
    list.sort(() => Math.random() - 0.5);
  }

  const picked: CompanyQuestion[] = [];
  const categories = Array.from(byCat.keys());
  let added = true;
  while (picked.length < count && added) {
    added = false;
    for (const cat of categories) {
      const list = byCat.get(cat);
      if (list && list.length > 0 && picked.length < count) {
        const next = list.shift();
        if (next) {
          picked.push(next);
          added = true;
        }
      }
    }
  }
  return picked;
}

function formatMMSS(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const m = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const s = (clamped % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export const MockTestView: React.FC = () => {
  const searchParams = useSearchParams();
  const initialCompanySlug =
    (searchParams.get("company") &&
      getCompany(searchParams.get("company") || "")?.slug) ||
    "google";

  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const prepState = usePrepState();

  // Setup state
  const [companySlug, setCompanySlug] = useState(initialCompanySlug);
  const [questionCount, setQuestionCount] = useState<5 | 8>(5);
  const [durationMin, setDurationMin] = useState<15 | 25 | 40>(25);

  // Stage state
  const [stage, setStage] = useState<
    "setup" | "in_progress" | "grading" | "results"
  >("setup");
  const [questions, setQuestions] = useState<CompanyQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSec, setRemainingSec] = useState(0);
  const [usedSec, setUsedSec] = useState(0);
  const [confirmUnansweredOpen, setConfirmUnansweredOpen] = useState(false);

  // Grading & results state
  const [gradedCount, setGradedCount] = useState(0);
  const [evaluations, setEvaluations] = useState<
    Record<string, PyqEvaluation>
  >({});
  const [expandedResultIds, setExpandedResultIds] = useState<
    Record<string, boolean>
  >({});

  const startTimeRef = useRef<number>(0);
  const startedIsoRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);

  const selectedCompany = useMemo(
    () => getCompany(companySlug) || COMPANIES[0],
    [companySlug]
  );

  const runGrading = useCallback(
    async (
      testQuestions: CompanyQuestion[],
      currentAnswers: Record<string, string>,
      comp: Company,
      durSec: number
    ) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const elapsed = Math.min(
        durSec,
        Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
      );
      setUsedSec(elapsed);
      setStage("grading");
      setGradedCount(0);

      const evalMap: Record<string, PyqEvaluation> = {};
      const answeredQueue = testQuestions.filter(
        (q) => (currentAnswers[q.id] || "").trim().length > 0
      );

      for (const q of testQuestions) {
        if (!(currentAnswers[q.id] || "").trim()) {
          evalMap[q.id] = {
            score: 0,
            verdict: "Weak",
            covered_points: [],
            missing_points: ["Question was left unanswered."],
            feedback: "No answer submitted during the timed mock test.",
            improved_answer: q.approach,
            graded_by: "heuristic",
          };
        }
      }

      let cursor = 0;
      let done = testQuestions.length - answeredQueue.length;
      setGradedCount(done);

      async function worker() {
        while (cursor < answeredQueue.length) {
          const q = answeredQueue[cursor++];
          const text = (currentAnswers[q.id] || "").trim();
          try {
            const res = await api.evaluatePyqAnswer({
              question: q.question,
              model_approach: q.approach,
              category: q.category,
              difficulty: q.difficulty,
              company: comp.name,
              answer_text: text,
            });
            evalMap[q.id] = res;
            addAttempt({
              id: newId(),
              questionId: q.id,
              companySlug: comp.slug,
              category: q.category,
              score: res.score,
              verdict: res.verdict,
              gradedBy: res.graded_by,
              createdAt: new Date().toISOString(),
              source: "mock",
            });
            setPracticed(q.id, true);
          } catch {
            evalMap[q.id] = {
              score: 5,
              verdict: "Needs work",
              covered_points: [],
              missing_points: [],
              feedback: "Answer recorded (offline fallback score).",
              improved_answer: q.approach,
              graded_by: "heuristic",
            };
          }
          done++;
          setGradedCount(done);
        }
      }

      await Promise.all([worker(), worker()]);

      const totalScore = testQuestions.reduce(
        (sum, q) => sum + (evalMap[q.id]?.score || 0),
        0
      );
      const percent =
        testQuestions.length > 0
          ? Math.round((totalScore / (testQuestions.length * 10)) * 100)
          : 0;

      addMockTest({
        id: newId(),
        companySlug: comp.slug,
        startedAt: startedIsoRef.current || new Date().toISOString(),
        durationSec: durSec,
        usedSec: elapsed,
        percent,
        items: testQuestions.map((q) => ({
          questionId: q.id,
          category: q.category,
          score: evalMap[q.id]?.score || 0,
          answered: (currentAnswers[q.id] || "").trim().length > 0,
        })),
      });

      setEvaluations(evalMap);
      setStage("results");
      submittingRef.current = false;
    },
    []
  );

  useEffect(() => {
    if (stage !== "in_progress") return;
    const totalSec = durationMin * 60;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const left = Math.max(0, totalSec - elapsed);
      setRemainingSec(left);
      if (left <= 0) {
        runGrading(questions, answers, selectedCompany, totalSec);
      }
    }, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stage, durationMin, questions, answers, selectedCompany, runGrading]);

  const handleStartTest = () => {
    const picked = pickDiverseQuestions(selectedCompany, questionCount);
    const totalSec = durationMin * 60;
    setQuestions(picked);
    setAnswers({});
    setCurrentIdx(0);
    setEvaluations({});
    setExpandedResultIds({});
    setRemainingSec(totalSec);
    startTimeRef.current = Date.now();
    startedIsoRef.current = new Date().toISOString();
    submittingRef.current = false;
    setStage("in_progress");
  };

  const handleRequestSubmit = () => {
    const unanswered = questions.filter(
      (q) => !(answers[q.id] || "").trim()
    ).length;
    if (unanswered > 0) {
      setConfirmUnansweredOpen(true);
      return;
    }
    runGrading(questions, answers, selectedCompany, durationMin * 60);
  };

  const currentQuestion = questions[currentIdx];

  const totalPercent = useMemo(() => {
    if (questions.length === 0) return 0;
    const sum = questions.reduce(
      (acc, q) => acc + (evaluations[q.id]?.score || 0),
      0
    );
    return Math.round((sum / (questions.length * 10)) * 100);
  }, [questions, evaluations]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const q of questions) {
      const entry = map.get(q.category) || { sum: 0, count: 0 };
      entry.sum += evaluations[q.id]?.score || 0;
      entry.count += 1;
      map.set(q.category, entry);
    }
    return Array.from(map.entries()).map(([cat, { sum, count }]) => ({
      category: cat,
      percent: Math.round((sum / (count * 10)) * 100),
      count,
    }));
  }, [questions, evaluations]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Timed Company Mock Test"
        description="Simulate an authentic online assessment or technical round under a strict timer and receive a full rubric breakdown."
        badge={<Badge variant="brand">OA &amp; Technical Simulation</Badge>}
      />

      {stage === "setup" && (
        <div className="space-y-8">
          <Card className="p-6 sm:p-8 space-y-6 max-w-2xl" elevated>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#17212B]">
                Configure your mock assessment
              </h2>
              <p className="text-xs text-[#526170] leading-relaxed">
                Questions are sampled round-robin across DSA, System Design, CS Fundamentals, SQL, OOP, Aptitude, and Behavioral categories for balanced coverage.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Target company" htmlFor="mock-company">
                <Select
                  id="mock-company"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                >
                  {COMPANIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Questions" htmlFor="mock-count">
                <Select
                  id="mock-count"
                  value={String(questionCount)}
                  onChange={(e) =>
                    setQuestionCount(Number(e.target.value) as 5 | 8)
                  }
                >
                  <option value="5">5 questions</option>
                  <option value="8">8 questions</option>
                </Select>
              </FormField>

              <FormField label="Time limit" htmlFor="mock-duration">
                <Select
                  id="mock-duration"
                  value={String(durationMin)}
                  onChange={(e) =>
                    setDurationMin(Number(e.target.value) as 15 | 25 | 40)
                  }
                >
                  <option value="15">15 minutes</option>
                  <option value="25">25 minutes</option>
                  <option value="40">40 minutes</option>
                </Select>
              </FormField>
            </div>

            <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF] space-y-1">
              <div className="font-bold">Assessment rules</div>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>
                  The countdown runs continuously and auto-submits when time reaches 00:00.
                </li>
                <li>
                  You can freely jump between questions using the navigator bar before submitting.
                </li>
                <li>
                  Every submitted answer is graded out of 10 and saved to your placement readiness score.
                </li>
              </ul>
            </div>

            <div>
              <Button
                variant="primary"
                size="md"
                icon={<Play className="h-4 w-4" />}
                onClick={handleStartTest}
              >
                Start test
              </Button>
            </div>
          </Card>

          {/* Past Mock Tests History */}
          {hydrated && prepState.mockTests.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-[#17212B]">
                Recent mock test attempts
              </h3>
              <Card className="divide-y divide-[#E2E7ED]">
                {prepState.mockTests.slice(0, 5).map((m) => {
                  const comp = getCompany(m.companySlug);
                  return (
                    <div
                      key={m.id}
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-[#17212B]">
                          {comp?.name || m.companySlug}
                        </div>
                        <div className="text-xs text-[#526170]">
                          {new Date(m.startedAt).toLocaleDateString()} &bull;{" "}
                          {m.items.length} questions &bull;{" "}
                          {formatMMSS(m.usedSec)} used
                        </div>
                      </div>
                      <Badge
                        variant={
                          m.percent >= 70
                            ? "success"
                            : m.percent >= 45
                            ? "amber"
                            : "error"
                        }
                      >
                        {m.percent}% score
                      </Badge>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}
        </div>
      )}

      {stage === "in_progress" && currentQuestion && (
        <div className="space-y-6">
          {/* Sticky Timer & Submit Bar */}
          <div className="sticky top-14 z-10 p-4 rounded-xl bg-white/95 backdrop-blur-md border border-[#E2E7ED] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-[#1D4ED8]" />
              <div>
                <div className="text-sm font-bold text-[#17212B]">
                  {selectedCompany.name} Mock Test
                </div>
                <div className="text-xs text-[#526170]">
                  Question {currentIdx + 1} of {questions.length}
                </div>
              </div>
            </div>

            {/* Question Navigator Dots */}
            <div className="flex items-center gap-1.5">
              {questions.map((q, idx) => {
                const answered = (answers[q.id] || "").trim().length > 0;
                const isCurr = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    aria-label={`Go to question ${idx + 1}`}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isCurr
                        ? "ring-2 ring-[#1D4ED8] ring-offset-1 bg-[#1D4ED8] text-white"
                        : answered
                        ? "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]"
                        : "bg-[#F1F4F8] text-[#526170]"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1.5 rounded-lg border font-mono-code text-sm font-bold flex items-center gap-1.5 ${
                  remainingSec < 60
                    ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                    : remainingSec < 300
                    ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                    : "bg-[#F7F8FA] text-[#17212B] border-[#E2E7ED]"
                }`}
              >
                <Timer className="h-4 w-4" />
                <span>{formatMMSS(remainingSec)}</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestSubmit}
              >
                Submit test
              </Button>
            </div>
          </div>

          {/* Active Question Card */}
          <Card className="p-6 space-y-5" elevated>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{currentQuestion.category}</Badge>
              <Badge
                variant={
                  currentQuestion.difficulty === "Easy"
                    ? "success"
                    : currentQuestion.difficulty === "Medium"
                    ? "amber"
                    : "error"
                }
              >
                {currentQuestion.difficulty}
              </Badge>
              <span className="text-xs text-[#526170] bg-[#F1F4F8] px-2.5 py-0.5 rounded-md border border-[#E2E7ED]">
                {currentQuestion.round}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[#17212B] leading-snug">
              {currentQuestion.question}
            </h3>

            <Textarea
              rows={8}
              value={answers[currentQuestion.id] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: e.target.value,
                }))
              }
              placeholder="Write your detailed approach, data structures, complexity, or behavioral STAR response…"
              aria-label="Mock test answer"
            />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                icon={<ArrowLeft className="h-3.5 w-3.5" />}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              >
                Previous
              </Button>

              {currentIdx < questions.length - 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={() =>
                    setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                  }
                >
                  Next question
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  onClick={handleRequestSubmit}
                >
                  Finish &amp; grade test
                </Button>
              )}
            </div>
          </Card>

          <ConfirmDialog
            open={confirmUnansweredOpen}
            onClose={() => setConfirmUnansweredOpen(false)}
            onConfirm={() => {
              setConfirmUnansweredOpen(false);
              runGrading(
                questions,
                answers,
                selectedCompany,
                durationMin * 60
              );
            }}
            title="Submit with unanswered questions?"
            description="Some questions in this mock test are still blank and will receive 0/10. Are you sure you want to submit now?"
            confirmLabel="Submit anyway"
            variant="primary"
          />
        </div>
      )}

      {stage === "grading" && (
        <Card className="p-10 text-center max-w-lg mx-auto space-y-4" elevated>
          <div className="text-base font-bold text-[#17212B]">
            Grading {gradedCount}/{questions.length}…
          </div>
          <p className="text-xs text-[#526170]">
            Evaluating your answers against {selectedCompany.name} interview criteria.
          </p>
          <div className="w-full h-2.5 bg-[#F1F4F8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1D4ED8] rounded-full transition-all duration-300"
              style={{
                width: `${
                  questions.length > 0
                    ? Math.round((gradedCount / questions.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </Card>
      )}

      {stage === "results" && (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6" elevated>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* SVG Score Ring */}
              <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
                <div className="relative h-36 w-36 flex items-center justify-center">
                  <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#E2E7ED"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#1D4ED8"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(totalPercent / 100) * 314.16} 314.16`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-[#17212B]">
                      {totalPercent}%
                    </span>
                    <span className="text-[11px] text-[#526170] font-medium">
                      Overall Score
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[#526170] mt-2">
                  Time used: {formatMMSS(usedSec)} of {durationMin}:00
                </span>
              </div>

              {/* Per-Category Breakdown Bars */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[#17212B]">
                    {selectedCompany.name} Mock Test Scorecard
                  </h2>
                  <p className="text-xs text-[#526170]">
                    Category performance breakdown across {questions.length} questions
                  </p>
                </div>

                <div className="space-y-2.5">
                  {categoryBreakdown.map((cb) => (
                    <div key={cb.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#17212B]">
                          {cb.category} ({cb.count})
                        </span>
                        <span className="font-mono-code font-bold text-[#1D4ED8]">
                          {cb.percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F1F4F8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1D4ED8] rounded-full"
                          style={{ width: `${cb.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    onClick={() => setStage("setup")}
                  >
                    Retake
                  </Button>
                  <Link
                    href={`/app/company-prep?company=${encodeURIComponent(
                      selectedCompany.slug
                    )}`}
                    className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#F1F4F8] hover:bg-[#E2E7ED] text-[#17212B] text-xs font-medium transition-colors"
                  >
                    Review company questions
                  </Link>
                  <Link
                    href="/app/readiness"
                    className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-xs font-medium gap-1.5 transition-colors"
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    <span>Readiness dashboard</span>
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* Per-Question Accordion */}
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const ev = evaluations[q.id];
              const isOpen = Boolean(expandedResultIds[q.id]);
              return (
                <Card key={q.id} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono-code font-bold text-[#64748B]">
                        Q{idx + 1}
                      </span>
                      <Badge variant="brand">{q.category}</Badge>
                      <Badge
                        variant={
                          (ev?.score || 0) >= 8
                            ? "success"
                            : (ev?.score || 0) >= 5
                            ? "amber"
                            : "error"
                        }
                      >
                        {ev?.score ?? 0}/10 &bull; {ev?.verdict || "Weak"}
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedResultIds((prev) => ({
                          ...prev,
                          [q.id]: !prev[q.id],
                        }))
                      }
                      className="text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isOpen ? "Hide details" : "View feedback"}</span>
                      {isOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="text-sm font-semibold text-[#17212B]">
                    {q.question}
                  </div>

                  {isOpen && ev && (
                    <div className="pt-3 border-t border-[#E2E7ED] space-y-3 text-xs">
                      <p className="text-[#17212B] leading-relaxed">
                        {ev.feedback}
                      </p>
                      {ev.missing_points.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-bold text-[#B45309]">
                            Key points to add:
                          </div>
                          <ul className="space-y-1">
                            {ev.missing_points.map((mp) => (
                              <li
                                key={mp}
                                className="flex items-start gap-1.5 text-[#526170]"
                              >
                                <AlertCircle className="h-3.5 w-3.5 text-[#B45309] shrink-0 mt-0.5" />
                                <span>{mp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-[#EFF6FF]/60 border border-[#BFDBFE] text-[#17212B] space-y-1">
                        <div className="font-bold text-[#1D4ED8]">
                          Reference approach
                        </div>
                        <p className="leading-relaxed">{ev.improved_answer}</p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
