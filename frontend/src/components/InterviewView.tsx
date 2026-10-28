"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Radio,
  AlertCircle,
  Sliders,
  Briefcase,
  ArrowUpRight
} from "lucide-react";
import {
  InterviewSessionItem,
  AnswerEvaluationResult,
  DocumentItem,
  api
} from "@/lib/api";

interface InterviewViewProps {
  documents: DocumentItem[];
  onRefresh: () => void;
}

const ROLE_PRESETS = [
  {
    title: "Full Stack AI Engineer",
    desc: "Looking for a full stack engineer skilled in Next.js, FastAPI, Python, PostgreSQL, and LLM integrations. Responsible for architecting scalable distributed APIs, vector search pipelines, and responsive web interfaces.",
  },
  {
    title: "Distributed Systems Architect",
    desc: "Designing fault-tolerant microservices, high-throughput event streaming with Kafka, distributed caching with Redis, and low-latency database sharding.",
  },
  {
    title: "Frontend Design Engineer",
    desc: "Crafting 60fps interactive web applications with React, TypeScript, WebGL/Canvas animations, design systems, and accessibility architecture.",
  },
];

export const InterviewView: React.FC<InterviewViewProps> = ({
  documents,
  onRefresh,
}) => {
  // Session states
  const [activeSession, setActiveSession] = useState<InterviewSessionItem | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [latestEval, setLatestEval] = useState<AnswerEvaluationResult | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Setup form states
  const [jobTitle, setJobTitle] = useState(ROLE_PRESETS[0].title);
  const [jobDescription, setJobDescription] = useState(ROLE_PRESETS[0].desc);
  const [resumeDocId, setResumeDocId] = useState("");
  const [targetQuestions, setTargetQuestions] = useState(5);
  const [persona, setPersona] = useState("Principal Systems Architect");
  const [starting, setStarting] = useState(false);

  // Live answer interaction states
  const [answerText, setAnswerText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setAnswerText((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  const speakQuestion = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window && voiceSpeechEnabled) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 0.98;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartInterview = async () => {
    setStarting(true);
    setErrorBanner(null);
    try {
      const session = await api.startInterview({
        job_title: jobTitle,
        job_description: jobDescription,
        resume_document_id: resumeDocId || undefined,
        total_questions: targetQuestions,
      });
      setActiveSession(session);
      setLatestEval(null);
      setAnswerText("");
      onRefresh();

      if (session.questions?.[0]) {
        speakQuestion(session.questions[0].question_text);
      }
    } catch (err: any) {
      setErrorBanner(
        err.message === "Failed to fetch"
          ? "Cannot reach backend server on port 8000. Ensure the FastAPI server is running."
          : err.message || "Failed to initialize interview session."
      );
    } finally {
      setStarting(false);
    }
  };

  const toggleRecording = () => {
    if (!speechSupported) {
      setErrorBanner("Web Speech API dictation is not supported in this browser. Please type your response below.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setErrorBanner(null);
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        setIsRecording(false);
      }
    }
  };

  const currentQuestion =
    activeSession?.questions?.find(
      (q) => q.question_index === activeSession.current_question_index
    ) || activeSession?.questions?.[activeSession.questions.length - 1];

  const handleSubmitAnswer = async () => {
    if (!activeSession || !currentQuestion || answerText.trim().length < 5) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setEvaluating(true);
    setErrorBanner(null);
    try {
      const evalRes = await api.submitInterviewAnswer(
        activeSession.id,
        currentQuestion.id,
        answerText,
        isRecording
      );
      setLatestEval(evalRes);
      setAnswerText("");

      const updated = await api.getInterview(activeSession.id);
      setActiveSession(updated);
      onRefresh();

      if (!evalRes.is_session_complete && updated.questions) {
        const nextQ = updated.questions.find(
          (q) => q.question_index === updated.current_question_index
        );
        if (nextQ) {
          speakQuestion(nextQ.question_text);
        }
      }
    } catch (err: any) {
      setErrorBanner("Error evaluating response: " + (err.message || "Network error"));
    } finally {
      setEvaluating(false);
    }
  };

  // 1. Session Completed: Executive Dossier Report Card
  if (activeSession?.state === "COMPLETED" && activeSession.report) {
    const report = activeSession.report;

    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8 studio-grid-bg">
        {/* Executive Dossier Header */}
        <div className="p-8 rounded-[28px] bg-gradient-to-r from-[#140d14] via-[#0c0e14] to-[#0a0f12] border border-amber-500/30 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-5">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Award className="h-9 w-9 text-amber-400" />
              </div>
              <div>
                <span className="font-mono-code text-[11px] uppercase tracking-widest text-amber-400">
                  EXECUTIVE INTERVIEW DOSSIER
                </span>
                <h2 className="font-display text-3xl font-extrabold text-white">
                  Readiness Index: {report.overall_score}%
                </h2>
                <p className="text-xs text-zinc-400">
                  Target Role: <span className="text-zinc-200 font-semibold">{activeSession.job_title}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveSession(null);
                setLatestEval(null);
              }}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all self-start sm:self-auto"
            >
              <RotateCcw className="h-4 w-4" />
              <span>New Broadcast Session</span>
            </button>
          </div>

          {/* Core Metrics Triad with visual bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              { label: "Technical Depth", val: report.technical_score, color: "bg-amber-400" },
              { label: "Communication & Clarity", val: report.communication_score, color: "bg-emerald-400" },
              { label: "Role Alignment", val: report.relevance_score, color: "bg-rose-400" },
            ].map((m) => (
              <div key={m.label} className="p-4 rounded-2xl bg-black/50 border border-white/[0.07] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">{m.label}</span>
                  <span className="font-mono-code text-base font-bold text-white">{m.val} / 5.0</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${m.color} rounded-full`}
                    style={{ width: `${(m.val / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Improvement Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl glass-panel space-y-4 border border-emerald-500/25">
            <div className="flex items-center space-x-2 text-emerald-400 font-display font-bold text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Demonstrated Strengths</span>
            </div>
            <div className="space-y-2.5">
              {report.strengths.map((str, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#080a10] border border-white/[0.06] text-xs text-zinc-200 leading-relaxed flex items-start space-x-2.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{str}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl glass-panel space-y-4 border border-amber-500/25">
            <div className="flex items-center space-x-2 text-amber-400 font-display font-bold text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>High-Leverage Growth Areas</span>
            </div>
            <div className="space-y-2.5">
              {report.improvements.map((imp, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#080a10] border border-white/[0.06] text-xs text-zinc-200 leading-relaxed flex items-start space-x-2.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{imp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Narrative Summary */}
        <div className="p-6 rounded-3xl glass-panel space-y-3">
          <span className="font-mono-code text-[10px] font-bold uppercase tracking-widest text-amber-400">
            INTERVIEWER DEBRIEF NOTES
          </span>
          <div className="p-5 rounded-2xl bg-[#080a10] border border-white/[0.06] text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {report.detailed_summary}
          </div>
        </div>

        {/* Question-by-Question Progression History */}
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <h3 className="font-display text-base font-bold text-white">Transcript & Round-by-Round Scoring</h3>
          <div className="space-y-3">
            {activeSession.questions.map((q) => (
              <div key={q.id} className="p-4 rounded-2xl bg-[#080a10] border border-white/[0.06] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono-code font-bold text-amber-400">
                    ROUND 0{q.question_index} // {q.category.toUpperCase()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono-code text-[10px]">
                      {q.difficulty}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono-code font-bold">
                      {q.score || "N/A"} / 5
                    </span>
                  </div>
                </div>
                <p className="text-white font-semibold">{q.question_text}</p>
                {q.candidate_answer && (
                  <div className="p-3 rounded-xl bg-black/60 text-zinc-300 italic border border-white/[0.05]">
                    &ldquo;{q.candidate_answer}&rdquo;
                  </div>
                )}
                {q.feedback && (
                  <p className="text-zinc-400 leading-relaxed">
                    <span className="font-semibold text-emerald-400">Coach Note: </span>
                    {q.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Live Broadcast Interview Booth (In Progress)
  if (activeSession && currentQuestion) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 studio-grid-bg">
        {/* Broadcast Booth Header */}
        <div className="p-6 rounded-[26px] glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-rose-500/30">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 font-mono-code text-[10px] font-bold border border-rose-500/40 flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span>ON AIR // BOOTH 05</span>
              </span>
              <span className="text-xs text-zinc-400 font-medium">{activeSession.job_title}</span>
            </div>
            <h2 className="font-display text-xl font-extrabold text-white">
              Round 0{currentQuestion.question_index} of 0{activeSession.total_target_questions}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Audio Equalizer Visualizer */}
            <div className="hidden sm:flex items-end space-x-1 h-6 px-3 py-1 rounded-xl bg-black/60 border border-white/[0.07]">
              {[0.3, 0.8, 0.5, 1, 0.4, 0.9, 0.6, 0.7, 0.35, 0.85].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full ${
                    isRecording ? "bg-rose-400 animate-eq-bar" : "bg-amber-400/50"
                  }`}
                  style={{
                    height: isRecording ? `${h * 100}%` : "30%",
                    animationDelay: `${i * 0.09}s`,
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => {
                setVoiceSpeechEnabled(!voiceSpeechEnabled);
                if (voiceSpeechEnabled && typeof window !== "undefined") {
                  window.speechSynthesis?.cancel();
                }
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                voiceSpeechEnabled
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-zinc-900 border-white/[0.08] text-zinc-500"
              }`}
              title="Toggle Voice Synthesis"
            >
              {voiceSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <span className="px-3 py-2 rounded-xl bg-[#080a10] border border-white/[0.08] font-mono-code text-xs text-zinc-300">
              TIER: <span className="text-amber-400 font-bold">{currentQuestion.difficulty.toUpperCase()}</span>
            </span>
          </div>
        </div>

        {/* Question Prompt Monitor */}
        <div className="p-8 rounded-[28px] bg-gradient-to-b from-[#10131c] to-[#090b10] border border-white/[0.1] space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-mono-code text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {currentQuestion.category}Prompt
            </span>
            <button
              onClick={() => speakQuestion(currentQuestion.question_text)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1.5 font-medium"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Replay Voice Prompt</span>
            </button>
          </div>

          <p className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
            &ldquo;{currentQuestion.question_text}&rdquo;
          </p>
        </div>

        {/* Candidate Microphone & Transcript Desk */}
        <div className="p-6 rounded-[28px] glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono-code text-xs font-bold text-zinc-300 uppercase tracking-wider">
                CANDIDATE TRANSCRIPT
              </span>
              {isRecording && (
                <span className="text-xs text-rose-400 font-mono-code flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span>MIC LIVE — SPEAK CLEARLY</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={toggleRecording}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                isRecording
                  ? "bg-rose-500 text-white mic-recording shadow-lg shadow-rose-500/40"
                  : "bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/[0.1]"
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  <span>Stop Dictation</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-rose-400" />
                  <span>Dictate via Microphone</span>
                </>
              )}
            </button>
          </div>

          <textarea
            rows={4}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Speak into your microphone or compose your technical response here..."
            className="w-full p-4 rounded-2xl bg-[#07080c] border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 leading-relaxed"
          />

          {errorBanner && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <span className="font-mono-code">
              {answerText.trim().split(/\s+/).filter(Boolean).length} WORDS LOGGED
            </span>
            <button
              onClick={handleSubmitAnswer}
              disabled={evaluating || answerText.trim().length < 5}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all"
            >
              {evaluating ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Grading & Preparing Next Round...</span>
                </>
              ) : (
                <>
                  <span>Submit Response</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instant Round Feedback */}
        {latestEval && (
          <div className="p-6 rounded-3xl glass-panel space-y-2 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="font-mono-code text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>PREVIOUS ROUND SCORE: {latestEval.score} / 5</span>
              </span>
              <span className="font-mono-code text-[11px] px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                NEXT TIER: {latestEval.next_difficulty.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{latestEval.feedback}</p>
          </div>
        )}
      </div>
    );
  }

  // 3. Default: Broadcast Booth Setup Screen
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 studio-grid-bg">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-[11px] font-mono-code uppercase tracking-widest text-rose-400 mb-1">
            <Radio className="h-3.5 w-3.5" />
            <span>CHANNEL 05 // VOICE INTERVIEW STUDIO</span>
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
            Broadcast Mock Mentor{" "}
            <span className="font-editorial italic font-normal text-amber-300">
              Live Simulation
            </span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Extracts your technical profile from an uploaded PDF and conducts a real-time adaptive voice & text interview with parallel instant grading.
          </p>
        </div>

        {/* Role Quick Presets */}
        <div className="flex flex-wrap gap-1.5">
          {ROLE_PRESETS.map((preset) => (
            <button
              key={preset.title}
              onClick={() => {
                setJobTitle(preset.title);
                setJobDescription(preset.desc);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                jobTitle === preset.title
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-[#0c0e14] border-white/[0.07] text-zinc-400 hover:text-white"
              }`}
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {errorBanner && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      <div className="p-8 rounded-[28px] glass-panel space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Role */}
          <div className="space-y-2">
            <label className="font-mono-code text-[11px] uppercase tracking-wider text-zinc-400 block">
              Target Position Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full p-3.5 rounded-2xl bg-[#07080c] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Interviewer Persona */}
          <div className="space-y-2">
            <label className="font-mono-code text-[11px] uppercase tracking-wider text-zinc-400 block">
              Interviewer Persona
            </label>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#07080c] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="Principal Systems Architect">Principal Systems Architect (Deep Technical)</option>
              <option value="VP of Engineering">VP of Engineering (Architecture & Leadership)</option>
              <option value="Staff AI Engineer">Staff AI Engineer (LLMs, RAG & Production Scale)</option>
            </select>
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <label className="font-mono-code text-[11px] uppercase tracking-wider text-zinc-400 block">
            Role Specifications & Stack Requirements
          </label>
          <textarea
            rows={3}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full p-3.5 rounded-2xl bg-[#07080c] border border-white/[0.08] text-xs text-zinc-100 focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Resume Selection */}
          <div className="space-y-2">
            <label className="font-mono-code text-[11px] uppercase tracking-wider text-zinc-400 block">
              Candidate Resume / Portfolio PDF (Optional)
            </label>
            <select
              value={resumeDocId}
              onChange={(e) => setResumeDocId(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#07080c] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">Fast Start (No PDF parsing overhead)</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_name} ({d.file_type})
                </option>
              ))}
            </select>
          </div>

          {/* Total Questions */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-zinc-400">
                Interview Depth
              </span>
              <span className="font-mono-code text-amber-400 font-bold">{targetQuestions} ROUNDS</span>
            </div>
            <input
              type="range"
              min="3"
              max="8"
              value={targetQuestions}
              onChange={(e) => setTargetQuestions(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/[0.07]">
          <div className="flex items-center space-x-3 text-xs text-zinc-400">
            <span className="flex items-end space-x-0.5 h-3.5">
              {[0.5, 1, 0.6, 0.9, 0.4].map((v, i) => (
                <span
                  key={i}
                  className="w-0.5 bg-rose-400 rounded-full animate-eq-bar"
                  style={{ height: `${v * 100}%`, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            <span>Web Speech API voice dictation + parallel turbo question synthesis</span>
          </div>

          <button
            onClick={handleStartInterview}
            disabled={starting || !jobTitle.trim()}
            className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-40 text-black font-extrabold text-xs shadow-xl shadow-amber-500/20 flex items-center space-x-2.5 transition-all"
          >
            {starting ? (
              <>
                <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Initializing Booth & Question 1...</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span>Enter Live Broadcast Booth</span>
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
