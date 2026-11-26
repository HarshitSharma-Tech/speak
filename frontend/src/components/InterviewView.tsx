"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Award,
  TrendingUp,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Trash2,
  ArrowLeft,
  Play,
  AlertTriangle,
  Brain,
  Target,
  Sparkles,
  MessageSquareWarning,
  Layers,
} from "lucide-react";
import {
  InterviewSessionItem,
  InterviewQuestionItem,
  AnswerEvaluationResult,
  api,
} from "@/lib/api";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  ConfirmDialog,
  InlineBanner,
  FormField,
  Input,
  Select,
  Textarea,
  ErrorState,
} from "@/components/ui";

const ROLE_PRESETS = [
  {
    title: "Full Stack Software Engineer",
    desc: "Building web applications with React, Next.js, TypeScript, Python, FastAPI, and relational databases. Focus on API design, data modeling, and system reliability.",
  },
  {
    title: "Backend & Distributed Systems Engineer",
    desc: "Designing scalable APIs, asynchronous task processing, database indexing, caching strategies, and fault-tolerant service architectures.",
  },
  {
    title: "Frontend & UI Engineer",
    desc: "Developing accessible, responsive interfaces with React, TypeScript, CSS architecture, component design systems, and state management.",
  },
];

const FILLER_REGEXES: { label: string; regex: RegExp }[] = [
  { label: "um", regex: /\bum+\b/gi },
  { label: "uh", regex: /\buh+\b/gi },
  { label: "like", regex: /\blike\b/gi },
  { label: "you know", regex: /\byou know\b/gi },
  { label: "basically", regex: /\bbasically\b/gi },
  { label: "actually", regex: /\bactually\b/gi },
  { label: "literally", regex: /\bliterally\b/gi },
  { label: "kind of", regex: /\bkind of\b/gi },
  { label: "sort of", regex: /\bsort of\b/gi },
  { label: "i mean", regex: /\bi mean\b/gi },
  { label: "i guess", regex: /\bi guess\b/gi },
];

interface LiveAnswerDiagnostics {
  wordCount: number;
  totalFillers: number;
  fillerBreakdown: { word: string; count: number }[];
  hasComplexity: boolean;
  hasTradeoffs: boolean;
  hasStructure: boolean;
}

function analyzeAnswerText(text: string): LiveAnswerDiagnostics {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const fillerBreakdown: { word: string; count: number }[] = [];
  let totalFillers = 0;
  for (const item of FILLER_REGEXES) {
    const matches = trimmed.match(item.regex);
    if (matches && matches.length > 0) {
      fillerBreakdown.push({ word: item.label, count: matches.length });
      totalFillers += matches.length;
    }
  }
  fillerBreakdown.sort((a, b) => b.count - a.count);

  const hasComplexity =
    /\bo\s*\(|time complexity|space complexity|latency|throughput|logarithmic|linear|amortized/i.test(
      trimmed
    );
  const hasTradeoffs =
    /trade-?off|edge case|bottleneck|fallback|failover|consistency|concurrency|index|cache|lock/i.test(
      trimmed
    );
  const hasStructure =
    /first|second|finally|for example|because|result|measured|improved|reduced/i.test(
      trimmed
    );

  return {
    wordCount,
    totalFillers,
    fillerBreakdown,
    hasComplexity,
    hasTradeoffs,
    hasStructure,
  };
}

interface CoachingPillar {
  number: number;
  title: string;
  status: "Strong" | "Improving" | "Needs focus";
  scorePct: number;
  metricSummary: string;
  finding: string;
  actionDrill: string;
}

function buildFiveCoachingPillars(
  questions: InterviewQuestionItem[],
  jobTitle: string
): {
  pillars: CoachingPillar[];
  weakQuestions: InterviewQuestionItem[];
} {
  const answered = questions.filter(
    (q) => (q.candidate_answer || "").trim().length > 0
  );
  const n = Math.max(1, answered.length);

  let totalWords = 0;
  let totalFillers = 0;
  const fillerTotals = new Map<string, number>();
  let complexityHits = 0;
  let tradeoffHits = 0;
  let structureHits = 0;

  for (const q of answered) {
    const d = analyzeAnswerText(q.candidate_answer || "");
    totalWords += d.wordCount;
    totalFillers += d.totalFillers;
    for (const f of d.fillerBreakdown) {
      fillerTotals.set(f.word, (fillerTotals.get(f.word) || 0) + f.count);
    }
    if (d.hasComplexity) complexityHits++;
    if (d.hasTradeoffs) tradeoffHits++;
    if (d.hasStructure) structureHits++;
  }

  const weakQuestions = answered.filter((q) => (q.score ?? 3) <= 3);
  const avgScore5 =
    answered.length > 0
      ? answered.reduce((acc, q) => acc + (q.score ?? 3), 0) / answered.length
      : 3;

  // 1. Filler Words & Speech Fluency
  const fillerRatio = totalWords > 0 ? totalFillers / totalWords : 0;
  const fluencyScore =
    answered.length === 0
      ? 50
      : Math.max(15, Math.min(100, Math.round(100 - fillerRatio * 900)));
  const topFillers = Array.from(fillerTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w, c]) => `"${w}" (${c}×)`)
    .join(", ");

  // 2. Knowledge Gaps & Previous Mistakes
  const mistakeFreeRatio =
    answered.length > 0
      ? (answered.length - weakQuestions.length) / answered.length
      : 0.5;
  const knowledgeScore = Math.round(mistakeFreeRatio * 100);

  // 3. Technical Depth & Complexity Bounds
  const depthRatio = (complexityHits + tradeoffHits) / (2 * n);
  const depthScore = Math.round(depthRatio * 100);

  // 4. Answer Structure & Pacing (STAR)
  const avgWords = Math.round(totalWords / n);
  const wordLenScore =
    avgWords >= 65 && avgWords <= 165
      ? 100
      : avgWords >= 35
      ? 72
      : avgWords > 0
      ? 40
      : 0;
  const structureScore = Math.round(
    0.5 * wordLenScore + 0.5 * ((structureHits / n) * 100)
  );

  // 5. Role & Rubric Alignment
  const roleScore = Math.round((avgScore5 / 5) * 100);

  const statusFor = (pct: number): CoachingPillar["status"] =>
    pct >= 75 ? "Strong" : pct >= 50 ? "Improving" : "Needs focus";

  const pillars: CoachingPillar[] = [
    {
      number: 1,
      title: "Filler Words & Speech Fluency",
      status: statusFor(fluencyScore),
      scorePct: fluencyScore,
      metricSummary:
        totalFillers === 0
          ? `0 fillers across ${totalWords} words`
          : `${totalFillers} filler(s) (${topFillers})`,
      finding:
        totalFillers === 0
          ? "Clean, deliberate delivery with zero filler words detected."
          : `Detected ${totalFillers} hedging/filler phrase(s) across ${totalWords} words (${(
              fillerRatio * 100
            ).toFixed(1)}% density).`,
      actionDrill:
        "Pause silently for 1 full second before answering or switching clauses instead of bridging with 'like', 'um', 'basically', or 'you know'.",
    },
    {
      number: 2,
      title: "Knowledge Gaps & Mistake Memory",
      status: statusFor(knowledgeScore),
      scorePct: knowledgeScore,
      metricSummary: `${weakQuestions.length} of ${answered.length} answer(s) had mistakes (score ≤ 3/5)`,
      finding:
        weakQuestions.length === 0
          ? "No low-scoring answers (≤ 3/5) in this set—strong baseline accuracy."
          : `Weakest topic(s): ${weakQuestions
              .slice(0, 2)
              .map(
                (q) =>
                  `Q${q.question_index} (${q.category}: "${q.question_text.slice(
                    0,
                    55
                  )}…")`
              )
              .join("; ")}.`,
      actionDrill:
        "The interviewer now remembers these exact mistakes and automatically probes them in follow-up questions. Use the 'Re-test my mistakes' button to drill them.",
    },
    {
      number: 3,
      title: "Technical Depth & Complexity Bounds",
      status: statusFor(depthScore),
      scorePct: depthScore,
      metricSummary: `Complexity in ${complexityHits}/${answered.length} • Trade-offs in ${tradeoffHits}/${answered.length}`,
      finding:
        depthScore >= 70
          ? "Consistently backed technical choices with complexity and architectural trade-offs."
          : "Several answers stated what tool/algorithm to use without proving Time/Space O(...) bounds or failure modes.",
      actionDrill:
        "End every technical answer with a 2-sentence checklist: (1) Time & Space complexity or p99 latency, and (2) what breaks first at 10× load.",
    },
    {
      number: 4,
      title: "Answer Structure & Pacing (STAR)",
      status: statusFor(structureScore),
      scorePct: structureScore,
      metricSummary: `Avg ${avgWords} words/answer • Signposts in ${structureHits}/${answered.length}`,
      finding:
        avgWords < 40
          ? `Responses averaged ${avgWords} words, which is too brief to demonstrate senior engineering depth.`
          : `Responses averaged ${avgWords} words with structured transitions in ${structureHits} of ${answered.length} answers.`,
      actionDrill:
        "Target 75–140 words per answer using 4 explicit signposts: 'First, the core constraint...' -> 'My approach...' -> 'The trade-off...' -> 'The measurable result...'.",
    },
    {
      number: 5,
      title: `Role & Rubric Alignment (${jobTitle})`,
      status: statusFor(roleScore),
      scorePct: roleScore,
      metricSummary: `Average rubric score ${avgScore5.toFixed(1)} / 5.0`,
      finding:
        roleScore >= 75
          ? `Examples and terminology aligned closely with ${jobTitle} expectations.`
          : `Connect your project examples more directly to production reliability and core ${jobTitle} responsibilities.`,
      actionDrill:
        "Anchor every example in a real system metric (e.g., 'cut query latency by 40%', 'eliminated race conditions under concurrent writes').",
    },
  ];

  return { pillars, weakQuestions };
}

function isMistakeFollowUpQuestion(questionText: string): boolean {
  return /following up on|building on your previous|earlier we touched on|revisiting the gap|to dig deeper into|previous answer/i.test(
    questionText
  );
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionErrorEvent {
  error?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

type SessionStageState = "ready" | "listening" | "submitting" | "feedback";

const FivePillarsCoachingCard: React.FC<{
  questions: InterviewQuestionItem[];
  jobTitle: string;
  onRetestMistakes?: (weakSummary: string) => void;
}> = ({ questions, jobTitle, onRetestMistakes }) => {
  const { pillars, weakQuestions } = useMemo(
    () => buildFiveCoachingPillars(questions, jobTitle),
    [questions, jobTitle]
  );

  return (
    <Card className="p-6 sm:p-8 space-y-6 border-[#BFDBFE] bg-white" elevated>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E7ED]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="brand">5-Pillar Action Plan</Badge>
            <Badge variant="amber">Mistake Memory Enabled</Badge>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#17212B] flex items-center gap-2 pt-1">
            <Brain className="h-5 w-5 text-[#1D4ED8]" />
            <span>5 Things You Can Work On (Speech, Mistakes &amp; Depth)</span>
          </h3>
          <p className="text-xs text-[#526170] leading-relaxed">
            Diagnostic breakdown of your filler words, remembered knowledge gaps, complexity analysis, STAR structure, and role fit.
          </p>
        </div>

        {weakQuestions.length > 0 && onRetestMistakes && (
          <Button
            variant="primary"
            size="sm"
            icon={<Target className="h-4 w-4" />}
            onClick={() => {
              const summary = weakQuestions
                .slice(0, 3)
                .map((q) => `${q.category}: ${q.question_text}`)
                .join(" | ");
              onRetestMistakes(summary);
            }}
          >
            Re-test my {weakQuestions.length} mistake(s) now
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {pillars.map((p) => (
          <div
            key={p.number}
            className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] flex flex-col justify-between gap-3"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono-code font-bold text-[#1D4ED8]">
                  #{p.number}
                </span>
                <Badge
                  variant={
                    p.status === "Strong"
                      ? "success"
                      : p.status === "Improving"
                      ? "brand"
                      : "amber"
                  }
                >
                  {p.status}
                </Badge>
              </div>

              <h4 className="text-sm font-bold text-[#17212B] leading-snug">
                {p.title}
              </h4>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#526170] truncate">
                    {p.metricSummary}
                  </span>
                  <span className="font-mono-code font-bold text-[#17212B]">
                    {p.scorePct}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E7ED] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      p.status === "Strong"
                        ? "bg-[#15803D]"
                        : p.status === "Improving"
                        ? "bg-[#1D4ED8]"
                        : "bg-[#D97706]"
                    }`}
                    style={{ width: `${p.scorePct}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-[#526170] leading-relaxed">
                {p.finding}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#E2E7ED] text-[11px] text-[#17212B] leading-relaxed">
              <strong className="text-[#1D4ED8] block mb-0.5">
                How to improve:
              </strong>
              {p.actionDrill}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const InterviewView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const {
    documents,
    interviews,
    errors,
    refreshInterviews,
    notify,
  } = useWorkspace();

  // Active session state
  const [selectedSession, setSelectedSession] =
    useState<InterviewSessionItem | null>(null);
  const [closedParamId, setClosedParamId] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [latestEval, setLatestEval] =
    useState<AnswerEvaluationResult | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Setup form state
  const [jobTitle, setJobTitle] = useState(
    () => searchParams.get("role") || ROLE_PRESETS[0].title
  );
  const [jobDescription, setJobDescription] = useState(
    () => searchParams.get("jd") || ROLE_PRESETS[0].desc
  );
  const [resumeDocId, setResumeDocId] = useState("");
  const [targetQuestions, setTargetQuestions] = useState(5);
  const [starting, setStarting] = useState(false);

  // Answer & speech state
  const [answerText, setAnswerText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported] = useState<boolean>(() =>
    Boolean(getSpeechRecognitionConstructor())
  );
  const [ttsSupported] = useState<boolean>(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  );
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);
  const [speechStatusMsg, setSpeechStatusMsg] = useState<string | null>(null);

  // Confirm leaving an active session
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Confirm deleting a past session
  const [sessionToDelete, setSessionToDelete] =
    useState<InterviewSessionItem | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const paramSession =
    sessionParam && closedParamId !== sessionParam
      ? interviews.find((i) => i.id === sessionParam) || null
      : null;

  const activeSession = selectedSession || paramSession;
  const setActiveSession = (next: InterviewSessionItem | null) => {
    if (!next && sessionParam) {
      setClosedParamId(sessionParam);
    }
    setSelectedSession(next);
  };

  // All historically answered questions across past sessions for cross-session coaching & mistake memory
  const allHistoricalAnsweredQuestions = useMemo(
    () =>
      interviews.flatMap((s) =>
        (s.questions || []).filter(
          (q) => (q.candidate_answer || "").trim().length > 0
        )
      ),
    [interviews]
  );

  // Load session from query param if provided
  useEffect(() => {
    if (!sessionParam || closedParamId === sessionParam || paramSession) return;
    let cancelled = false;
    api
      .getInterview(sessionParam)
      .then((data) => {
        if (!cancelled) setSelectedSession(data);
      })
      .catch(() => {
        // Ignore invalid query param and stay on setup
      });
    return () => {
      cancelled = true;
    };
  }, [sessionParam, closedParamId, paramSession]);

  // Initialize browser speech capabilities
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let transcriptSegment = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcriptSegment += event.results[i][0].transcript + " ";
        }
      }
      const cleaned = transcriptSegment.trim();
      if (cleaned) {
        setAnswerText((prev) => (prev ? `${prev.trim()} ${cleaned}` : cleaned));
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      const errCode = event?.error;
      if (errCode === "not-allowed" || errCode === "service-not-allowed") {
        setSpeechStatusMsg(
          "Microphone access was denied by your browser. Grant microphone permission in your browser settings or type your answer below."
        );
      } else if (errCode === "no-speech") {
        setSpeechStatusMsg(
          "No speech was detected. Click 'Start voice input' to try again, or type your answer."
        );
      } else {
        setSpeechStatusMsg(
          "Voice recognition stopped due to an audio error. Your typed text is preserved."
        );
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakQuestion = (text: string) => {
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      ttsSupported &&
      voiceSpeechEnabled
    ) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopAudioPlayback = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || starting) return;

    setStarting(true);
    setErrorBanner(null);
    setSpeechStatusMsg(null);

    try {
      const session = await api.startInterview({
        job_title: jobTitle.trim(),
        job_description: jobDescription.trim(),
        resume_document_id: resumeDocId || undefined,
        total_questions: targetQuestions,
      });
      setActiveSession(session);
      setLatestEval(null);
      setAnswerText("");
      await refreshInterviews();

      if (session.questions?.[0]) {
        speakQuestion(session.questions[0].question_text);
      }
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : "Could not start interview session."
      );
    } finally {
      setStarting(false);
    }
  };

  const handleRetestMistakes = (weakSummary: string) => {
    const role = activeSession?.job_title || jobTitle || ROLE_PRESETS[0].title;
    setActiveSession(null);
    setLatestEval(null);
    setJobTitle(role);
    setJobDescription(
      `Targeted Mistake-Recovery Session for ${role}. Focus specifically on previous weak areas and missed concepts: ${weakSummary}`
    );
    if (sessionParam) {
      router.replace("/app/interviews");
    }
    notify(
      "info",
      "Pre-filled setup with your previous mistakes. Click 'Start practice session' to drill them!"
    );
  };

  const toggleRecording = () => {
    if (!speechSupported) {
      setSpeechStatusMsg(
        "Browser voice dictation is not supported in this browser (try Chrome or Edge). You can type your response directly below."
      );
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }
      setIsRecording(false);
    } else {
      setSpeechStatusMsg(null);
      stopAudioPlayback();
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
        setSpeechStatusMsg(
          "Could not start microphone recording. Check browser permissions or type your response."
        );
      }
    }
  };

  const currentQuestion =
    activeSession?.questions?.find(
      (q) => q.question_index === activeSession.current_question_index
    ) || activeSession?.questions?.[activeSession.questions.length - 1];

  const handleSubmitAnswer = async () => {
    if (
      !activeSession ||
      !currentQuestion ||
      evaluating ||
      answerText.trim().length < 5
    ) {
      return;
    }

    const usedVoice = isRecording;
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }
      setIsRecording(false);
    }

    setEvaluating(true);
    setErrorBanner(null);

    try {
      const evalRes = await api.submitInterviewAnswer(
        activeSession.id,
        currentQuestion.id,
        answerText.trim(),
        usedVoice
      );
      setLatestEval(evalRes);
      setAnswerText("");

      const updated = await api.getInterview(activeSession.id);
      setActiveSession(updated);
      await refreshInterviews();

      if (!evalRes.is_session_complete && updated.questions) {
        const nextQ = updated.questions.find(
          (q) => q.question_index === updated.current_question_index
        );
        if (nextQ) {
          speakQuestion(nextQ.question_text);
        }
      }
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? `Submission failed: ${err.message}. Your draft answer has been preserved below.`
          : "Network error while submitting your answer. Your draft answer has been preserved."
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleConfirmLeaveSession = () => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }
      setIsRecording(false);
    }
    stopAudioPlayback();
    setConfirmLeaveOpen(false);
    setActiveSession(null);
    setLatestEval(null);
    setErrorBanner(null);
    if (sessionParam) {
      router.replace("/app/interviews");
    }
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeletingSession(true);
    try {
      await api.deleteInterview(sessionToDelete.id);
      await refreshInterviews();
      notify(
        "success",
        `Deleted interview session "${sessionToDelete.job_title}".`
      );
      setSessionToDelete(null);
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not delete interview session."
      );
    } finally {
      setDeletingSession(false);
    }
  };

  const currentStage: SessionStageState = evaluating
    ? "submitting"
    : isRecording
    ? "listening"
    : latestEval && answerText.trim().length === 0
    ? "feedback"
    : "ready";

  const stageMeta: Record<
    SessionStageState,
    { label: string; badgeVariant: "brand" | "amber" | "success" | "default" }
  > = {
    ready: { label: "Ready for your answer", badgeVariant: "default" },
    listening: { label: "Listening via microphone", badgeVariant: "amber" },
    submitting: {
      label: "Evaluating mistakes & adapting next question",
      badgeVariant: "brand",
    },
    feedback: {
      label: "Previous answer scored — Follow-up ready",
      badgeVariant: "success",
    },
  };

  /* ==========================================================================
     VIEW 1: COMPLETED INTERVIEW REPORT VIEW
  ========================================================================== */
  if (activeSession?.state === "COMPLETED" && activeSession.report) {
    const report = activeSession.report;

    return (
      <div className="space-y-8">
        <PageHeader
          title="Interview practice report"
          description={`Role: ${activeSession.job_title} • Completed ${new Date(
            report.created_at
          ).toLocaleDateString()}`}
          breadcrumbs={[
            { label: "Interview practice", href: "/app/interviews" },
            { label: "Session report" },
          ]}
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setActiveSession(null);
                setLatestEval(null);
                if (sessionParam) router.replace("/app/interviews");
              }}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              Start new session
            </Button>
          }
        />

        {/* Educational Disclaimer */}
        <InlineBanner variant="info" title="Practice feedback notice">
          Scores and coaching notes are generated by AI to help you structure and refine your technical explanations during self-study. They do not represent an objective hiring decision or formal assessment.
        </InlineBanner>

        {/* 5 THINGS TO WORK ON — PERSONAL COACHING PLAN */}
        <FivePillarsCoachingCard
          questions={activeSession.questions}
          jobTitle={activeSession.job_title}
          onRetestMistakes={handleRetestMistakes}
        />

        {/* Score Overview Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E7ED]">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                <Award className="h-7 w-7" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[#526170]">
                  Overall practice score
                </span>
                <h2 className="text-3xl font-bold text-[#17212B]">
                  {report.overall_score}%
                </h2>
                <p className="text-xs text-[#526170]">
                  Across {activeSession.questions.length} questions for{" "}
                  <strong className="text-[#17212B]">
                    {activeSession.job_title}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* 3 Category Scores (1-5 Scale) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Technical depth",
                val: report.technical_score,
                desc: "Accuracy and specificity of concepts",
              },
              {
                label: "Communication clarity",
                val: report.communication_score,
                desc: "Structure and conciseness of explanation",
              },
              {
                label: "Role relevance",
                val: report.relevance_score,
                desc: "Alignment with target job requirements",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#17212B]">
                    {metric.label}
                  </span>
                  <span className="font-mono-code text-sm font-bold text-[#1D4ED8]">
                    {metric.val} / 5.0
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E2E7ED] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1D4ED8] rounded-full"
                    style={{
                      width: `${Math.min(100, (metric.val / 5) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[#526170]">{metric.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Strengths & Improvement Suggestions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#17212B] pb-3 border-b border-[#E2E7ED]">
              <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
              <h3>Demonstrated strengths</h3>
            </div>
            <ul className="space-y-2.5">
              {report.strengths.map((str, idx) => (
                <li
                  key={idx}
                  className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#17212B] leading-relaxed flex items-start gap-2.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#17212B] pb-3 border-b border-[#E2E7ED]">
              <TrendingUp className="h-4 w-4 text-[#B45309]" />
              <h3>5 Actionable coaching takeaways</h3>
            </div>
            <ul className="space-y-2.5">
              {report.improvements.map((imp, idx) => (
                <li
                  key={idx}
                  className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#17212B] leading-relaxed flex items-start gap-2.5"
                >
                  <span className="h-2 w-2 rounded-full bg-[#B45309] mt-1.5 shrink-0" />
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Summary & Recommended Follow-Up Topics */}
        <Card className="p-6 space-y-5">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#17212B]">
              Session summary
            </h3>
            <p className="text-sm text-[#526170] leading-relaxed whitespace-pre-wrap">
              {report.detailed_summary}
            </p>
          </div>

          {report.recommended_topics?.length > 0 && (
            <div className="pt-4 border-t border-[#E2E7ED] space-y-2">
              <span className="text-xs font-semibold text-[#17212B] flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[#1D4ED8]" />
                <span>Recommended topics for follow-up study</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {report.recommended_topics.map((topic, i) => (
                  <Badge key={i} variant="brand">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Question-by-Question Transcript with Per-Answer Filler & Mistake Audit */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-[#17212B]">
            Question-by-question review &amp; filler-word audit
          </h3>
          <div className="space-y-4">
            {activeSession.questions.map((q) => {
              const diag = analyzeAnswerText(q.candidate_answer || "");
              const isFollowUp = isMistakeFollowUpQuestion(q.question_text);
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-code text-xs font-bold text-[#1D4ED8]">
                        Question {q.question_index}
                      </span>
                      <Badge variant="default">{q.category}</Badge>
                      <Badge variant="default">{q.difficulty} difficulty</Badge>
                      {isFollowUp && (
                        <Badge variant="amber">
                          Follow-up on previous mistake
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {diag.totalFillers > 0 ? (
                        <Badge variant="amber">
                          {diag.totalFillers} filler(s):{" "}
                          {diag.fillerBreakdown
                            .slice(0, 2)
                            .map((f) => `${f.word} (${f.count}×)`)
                            .join(", ")}
                        </Badge>
                      ) : (
                        <Badge variant="success">0 filler words</Badge>
                      )}
                      <Badge variant="brand">
                        Score: {q.score ?? "N/A"} / 5
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-[#17212B]">
                    {q.question_text}
                  </p>

                  {q.candidate_answer && (
                    <div className="p-3 rounded-lg bg-white border border-[#E2E7ED] text-xs text-[#526170] space-y-1">
                      <span className="font-semibold text-[#17212B] block">
                        Your response ({diag.wordCount} words):
                      </span>
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {q.candidate_answer}
                      </p>
                    </div>
                  )}

                  {q.feedback && (
                    <div className="text-xs text-[#17212B] leading-relaxed">
                      <strong className="font-semibold text-[#1D4ED8]">
                        Feedback:{" "}
                      </strong>
                      {q.feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  /* ==========================================================================
     VIEW 2: ACTIVE INTERVIEW SESSION VIEW
  ========================================================================== */
  if (activeSession && currentQuestion) {
    const liveDiag = analyzeAnswerText(answerText);
    const isFollowUp = isMistakeFollowUpQuestion(currentQuestion.question_text);

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Session Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E7ED]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={stageMeta[currentStage].badgeVariant}>
                {stageMeta[currentStage].label}
              </Badge>
              <Badge variant="brand">Mistake Memory Active</Badge>
              <span className="text-xs text-[#526170]">
                {activeSession.job_title}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#17212B]">
              Question {currentQuestion.question_index} of{" "}
              {activeSession.total_target_questions}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ttsSupported && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = !voiceSpeechEnabled;
                  setVoiceSpeechEnabled(next);
                  if (!next) stopAudioPlayback();
                }}
                icon={
                  voiceSpeechEnabled ? (
                    <Volume2 className="h-4 w-4 text-[#1D4ED8]" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-[#64748B]" />
                  )
                }
              >
                {voiceSpeechEnabled ? "Audio on" : "Audio muted"}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmLeaveOpen(true)}
              icon={<ArrowLeft className="h-3.5 w-3.5" />}
            >
              End or leave session
            </Button>
          </div>
        </div>

        {/* Previous Question Evaluation Banner (When available) */}
        {latestEval && (
          <Card
            className={`p-5 space-y-2 ${
              latestEval.score <= 3
                ? "bg-[#FFFBEB] border-[#FDE68A]"
                : "bg-[#F0FDF4] border-[#BBF7D0]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  latestEval.score <= 3 ? "text-[#B45309]" : "text-[#15803D]"
                }`}
              >
                {latestEval.score <= 3 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>
                  Previous question feedback — Score: {latestEval.score} / 5
                </span>
              </span>
              <div className="flex items-center gap-2 text-xs text-[#17212B]">
                <span>Technical: {latestEval.technical_score}/5</span>
                <span>&bull;</span>
                <span>Clarity: {latestEval.clarity_score}/5</span>
                <span>&bull;</span>
                <span>
                  Next difficulty: <strong>{latestEval.next_difficulty}</strong>
                </span>
              </div>
            </div>
            <p className="text-xs text-[#17212B] leading-relaxed">
              {latestEval.feedback}
            </p>
            {latestEval.ideal_points && (
              <p className="text-[11px] text-[#526170] pt-1 border-t border-black/10">
                <strong className="text-[#17212B]">
                  Remembered gaps / ideal points:
                </strong>{" "}
                {latestEval.ideal_points}
              </p>
            )}
          </Card>
        )}

        {/* Primary Visual Focus: Current Question Card */}
        <Card
          elevated
          className="p-6 sm:p-8 space-y-4 border-l-4 border-l-[#1D4ED8]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{currentQuestion.category}</Badge>
              <Badge variant="default">
                Difficulty: {currentQuestion.difficulty}
              </Badge>
              {isFollowUp && (
                <Badge variant="amber">
                  <Brain className="h-3 w-3 text-[#B45309]" />
                  <span>Probing your previous mistake / omission</span>
                </Badge>
              )}
            </div>

            {ttsSupported && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speakQuestion(currentQuestion.question_text)}
                icon={<Volume2 className="h-3.5 w-3.5 text-[#1D4ED8]" />}
              >
                Read question aloud
              </Button>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-[#17212B] leading-relaxed">
            {currentQuestion.question_text}
          </h2>
        </Card>

        {/* Answer Input & Microphone Controls + Live 5-Pillar Coach Bar */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label
                htmlFor="interview-answer-textarea"
                className="text-sm font-bold text-[#17212B] block"
              >
                Your response
              </label>
              <p className="text-xs text-[#526170]">
                Type your answer directly or use microphone voice dictation. Live filler-word &amp; depth coach runs below.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {speechSupported ? (
                <Button
                  variant={isRecording ? "danger" : "outline"}
                  size="sm"
                  onClick={toggleRecording}
                  disabled={evaluating}
                  icon={
                    isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4 text-[#1D4ED8]" />
                    )
                  }
                >
                  {isRecording ? "Stop listening" : "Start voice input"}
                </Button>
              ) : (
                <Badge variant="default">
                  Voice dictation unavailable in this browser
                </Badge>
              )}
            </div>
          </div>

          {isRecording && (
            <div
              role="status"
              aria-live="polite"
              className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#B45309] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B45309] animate-ping" />
                <span>
                  Listening via microphone — speak clearly. Recognized phrases will appear in the text box below.
                </span>
              </div>
            </div>
          )}

          {speechStatusMsg && (
            <InlineBanner
              variant="warning"
              onDismiss={() => setSpeechStatusMsg(null)}
            >
              {speechStatusMsg}
            </InlineBanner>
          )}

          <Textarea
            id="interview-answer-textarea"
            rows={6}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            disabled={evaluating}
            placeholder="Explain your approach, Time/Space O(...) complexity, key trade-offs, and concrete examples..."
          />

          {/* Live Speech Filler & Technical Depth Coach Bar */}
          <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#17212B] flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[#1D4ED8]" />
                <span>Live Coach:</span>
              </span>

              {liveDiag.totalFillers === 0 ? (
                <Badge variant="success">0 filler words</Badge>
              ) : (
                <Badge variant="amber">
                  <MessageSquareWarning className="h-3 w-3" />
                  <span>
                    {liveDiag.totalFillers} filler(s):{" "}
                    {liveDiag.fillerBreakdown
                      .slice(0, 3)
                      .map((f) => `"${f.word}" (${f.count}×)`)
                      .join(", ")}
                  </span>
                </Badge>
              )}

              <Badge variant={liveDiag.hasComplexity ? "success" : "default"}>
                {liveDiag.hasComplexity
                  ? "✓ Complexity/Latency stated"
                  : "+ Add O(...) / latency"}
              </Badge>

              <Badge variant={liveDiag.hasTradeoffs ? "success" : "default"}>
                {liveDiag.hasTradeoffs
                  ? "✓ Trade-offs/Edge cases"
                  : "+ Add trade-offs / edge cases"}
              </Badge>

              <Badge variant={liveDiag.hasStructure ? "success" : "default"}>
                {liveDiag.hasStructure
                  ? "✓ Structured signposts"
                  : "+ Use STAR / step signposts"}
              </Badge>
            </div>

            <span className="font-mono-code text-[#64748B]">
              {liveDiag.wordCount}{" "}
              {liveDiag.wordCount === 1 ? "word" : "words"} (target 75–140)
            </span>
          </div>

          {errorBanner && (
            <InlineBanner
              variant="error"
              title="Could not submit response"
              onDismiss={() => setErrorBanner(null)}
            >
              {errorBanner}
            </InlineBanner>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-xs text-[#526170]">
              If you miss a concept or edge case, the interviewer will remember and follow up on it in the next question.
            </span>

            <Button
              variant="primary"
              onClick={handleSubmitAnswer}
              disabled={evaluating || answerText.trim().length < 5}
              loading={evaluating}
              icon={<Send className="h-4 w-4" />}
            >
              {evaluating
                ? "Evaluating response..."
                : currentQuestion.question_index >=
                  activeSession.total_target_questions
                ? "Submit final answer & view report"
                : "Submit answer"}
            </Button>
          </div>
        </Card>

        {/* Deliberate Leave Session Confirmation Dialog */}
        <ConfirmDialog
          open={confirmLeaveOpen}
          onClose={() => setConfirmLeaveOpen(false)}
          onConfirm={handleConfirmLeaveSession}
          title="Leave active interview session?"
          description="Your completed questions in this session are saved and you can resume from the Interview practice list later. Any unsubmitted text in the current answer box will be discarded."
          confirmLabel="Leave session"
          cancelLabel="Continue interview"
          variant="primary"
        />
      </div>
    );
  }

  /* ==========================================================================
     VIEW 3: INTERVIEW SETUP & PAST SESSIONS VIEW
  ========================================================================== */
  return (
    <div className="space-y-8">
      <PageHeader
        title="Interview practice"
        description="Mistake-aware adaptive mock interviewer that remembers your weak areas across questions and sessions, audits filler words, and builds a 5-point personal coaching plan."
        badge={<Badge variant="brand">Mistake Memory &amp; 5-Pillar Coach</Badge>}
      />

      {errorBanner && (
        <InlineBanner
          variant="error"
          title="Could not start interview"
          onDismiss={() => setErrorBanner(null)}
        >
          {errorBanner}
        </InlineBanner>
      )}

      {/* Cross-Session 5-Pillar Coaching Overview if past answered questions exist */}
      {allHistoricalAnsweredQuestions.length > 0 && (
        <FivePillarsCoachingCard
          questions={allHistoricalAnsweredQuestions}
          jobTitle={jobTitle}
          onRetestMistakes={handleRetestMistakes}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left (7 cols): Setup Form */}
        <Card className="lg:col-span-7 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#17212B]">
              Configure new practice session
            </h2>
            <p className="text-xs text-[#526170]">
              Choose a role preset, re-test your past mistakes, or enter a custom job description.
            </p>
          </div>

          {/* Role Presets */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#526170] block">
              Quick role presets
            </span>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((preset) => {
                const isSelected = jobTitle === preset.title;
                return (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => {
                      setJobTitle(preset.title);
                      setJobDescription(preset.desc);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                      isSelected
                        ? "bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8] font-semibold"
                        : "bg-white border-[#E2E7ED] text-[#526170] hover:text-[#17212B]"
                    }`}
                  >
                    {preset.title}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleStartInterview} className="space-y-4">
            <FormField
              label="Target job title"
              htmlFor="interview-job-title"
              required
            >
              <Input
                id="interview-job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                required
                disabled={starting}
              />
            </FormField>

            <FormField
              label="Job description & key topics"
              htmlFor="interview-job-desc"
              hint="Describe the technologies, responsibilities, or previous mistakes you want the interviewer to probe."
              required
            >
              <Textarea
                id="interview-job-desc"
                rows={4}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
                disabled={starting}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Resume PDF (optional)"
                htmlFor="interview-resume-select"
                hint="Tailors questions to your experience."
              >
                <Select
                  id="interview-resume-select"
                  value={resumeDocId}
                  onChange={(e) => setResumeDocId(e.target.value)}
                  disabled={starting}
                >
                  <option value="">None — use job description only</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.original_name} ({d.file_type})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label={`Number of questions: ${targetQuestions}`}
                htmlFor="interview-question-count"
                hint="3 to 8 adaptive questions."
              >
                <div className="pt-2">
                  <input
                    id="interview-question-count"
                    type="range"
                    min={3}
                    max={8}
                    value={targetQuestions}
                    onChange={(e) =>
                      setTargetQuestions(Number(e.target.value))
                    }
                    disabled={starting}
                    className="w-full accent-[#1D4ED8] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-[#64748B] font-mono-code">
                    <span>3 questions</span>
                    <span>5 questions</span>
                    <span>8 questions</span>
                  </div>
                </div>
              </FormField>
            </div>

            <div className="pt-3 border-t border-[#E2E7ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#526170]">
                <Layers className="h-4 w-4 text-[#1D4ED8] shrink-0" />
                <span>
                  Automatically remembers low-scoring concepts from past sessions and follows up on them.
                </span>
              </div>

              <Button
                variant="primary"
                type="submit"
                disabled={!jobTitle.trim()}
                loading={starting}
                icon={<Play className="h-4 w-4" />}
              >
                {starting ? "Starting session..." : "Start practice session"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Right (5 cols): Previous Sessions */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold text-[#17212B]">
            Recent sessions ({interviews.length})
          </h2>

          {errors.interviews ? (
            <ErrorState
              title="Could not load sessions"
              message={errors.interviews}
              onRetry={refreshInterviews}
            />
          ) : interviews.length === 0 ? (
            <Card className="p-6 text-center space-y-2">
              <Mic className="h-6 w-6 text-[#64748B] mx-auto" />
              <p className="text-sm font-semibold text-[#17212B]">
                No interview sessions yet
              </p>
              <p className="text-xs text-[#526170] leading-relaxed">
                Start a session on the left to practice answering technical questions and receive a 5-pillar coaching report card.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {interviews.map((session) => {
                const isCompleted = session.state === "COMPLETED";
                return (
                  <Card
                    key={session.id}
                    className="p-4 flex flex-col justify-between gap-3 hover:border-[#CBD5E1] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={isCompleted ? "success" : "brand"}>
                            {isCompleted
                              ? session.report
                                ? `Completed • ${session.report.overall_score}%`
                                : "Completed"
                              : `In progress (${session.current_question_index}/${session.total_target_questions})`}
                          </Badge>
                          <span className="text-xs text-[#64748B]">
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#17212B] truncate">
                          {session.job_title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSessionToDelete(session)}
                        aria-label={`Delete interview session ${session.job_title}`}
                        title="Delete session"
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[#E2E7ED] flex items-center justify-between">
                      <span className="text-xs text-[#526170]">
                        {session.total_target_questions} questions
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveSession(session);
                          setLatestEval(null);
                          setErrorBanner(null);
                        }}
                      >
                        {isCompleted ? "View report" : "Resume session"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Session Confirmation */}
      <ConfirmDialog
        open={Boolean(sessionToDelete)}
        onClose={() => !deletingSession && setSessionToDelete(null)}
        onConfirm={handleConfirmDeleteSession}
        title="Delete interview session?"
        description={
          sessionToDelete
            ? `Are you sure you want to delete the interview session for "${sessionToDelete.job_title}" and its evaluation report?`
            : ""
        }
        confirmLabel="Delete session"
        variant="danger"
        loading={deletingSession}
      />
    </div>
  );
};
