"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Award,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { QuizItem, QuizResult, api } from "@/lib/api";

interface QuizRunnerProps {
  quiz: QuizItem;
  courseId: string;
  onOpenSourceCitation: (chunkId: string) => void;
  onRetake: () => void;
  onClose: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  quiz,
  courseId,
  onOpenSourceCitation,
  onRetake,
  onClose,
}) => {
  // Store selected answers per question index: { [questionId]: optionIndex }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (quizResult) return; // Prevent change after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const isAllAnswered = quiz.questions.every((q) => selectedAnswers[q.id] !== undefined);

  const handleSubmit = async () => {
    if (!isAllAnswered) return;

    setSubmitting(true);
    try {
      const payload = Object.entries(selectedAnswers).map(([question_id, selected_option_index]) => ({
        question_id,
        selected_option_index,
      }));

      const result = await api.submitQuiz(quiz.id, payload);
      setQuizResult(result);
    } catch (err: any) {
      alert("Error evaluating quiz: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Quiz Header */}
      <div className="p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-indigo-500/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/30">
              5 Grounded Questions
            </span>
            <span className="text-xs text-slate-400">Instant Evaluation & Evidence Citations</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">{quiz.title}</h2>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={onRetake}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Regenerate Quiz</span>
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold transition-colors border border-slate-800"
          >
            Back to Module
          </button>
        </div>
      </div>

      {/* Result Score Banner */}
      {quizResult && (
        <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Award className="h-8 w-8 text-indigo-400" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Quiz Performance</span>
                <h3 className="text-2xl font-black text-white">
                  Score: {quizResult.score} / {quizResult.total_questions} ({quizResult.percentage}%)
                </h3>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>100% Grounded Source Evidence</span>
              </div>
              <p className="text-[11px] text-slate-400">Review detailed explanations and citations below.</p>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {quiz.questions.map((q, qIndex) => {
          const feedback = quizResult?.feedback?.find((f) => f.question_id === q.id);
          const selectedOption = selectedAnswers[q.id];

          return (
            <div
              key={q.id}
              className={`p-6 rounded-3xl glass-panel space-y-4 transition-all ${
                feedback
                  ? feedback.is_correct
                    ? "border-emerald-500/40 bg-emerald-950/10"
                    : "border-rose-500/40 bg-rose-950/10"
                  : "border-slate-800"
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <span className="h-7 w-7 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-500/30">
                    Q{qIndex + 1}
                  </span>
                  <h3 className="text-base font-semibold text-slate-100 leading-snug">
                    {q.question_text}
                  </h3>
                </div>

                {/* Grounded Citation Button */}
                <button
                  onClick={() => onOpenSourceCitation(q.source_chunk_id)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/20 flex items-center space-x-1 shrink-0 transition-colors"
                  title="View verbatim textbook source evidence"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Source Citation</span>
                </button>
              </div>

              {/* 4 Answer Options */}
              <div className="grid grid-cols-1 gap-2.5 pt-2">
                {q.options.map((optionText, optIndex) => {
                  const isSelected = selectedOption === optIndex;
                  const isCorrect = feedback?.correct_option_index === optIndex;
                  const isWrongSelected = feedback && isSelected && !feedback.is_correct;

                  let cardStyle = "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300";

                  if (isSelected && !quizResult) {
                    cardStyle = "bg-indigo-600/20 border-indigo-500 text-white shadow-sm";
                  }

                  if (feedback) {
                    if (isCorrect) {
                      cardStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-200 font-medium";
                    } else if (isWrongSelected) {
                      cardStyle = "bg-rose-500/20 border-rose-500 text-rose-200 line-through";
                    } else {
                      cardStyle = "bg-slate-900/40 border-slate-800/60 text-slate-500";
                    }
                  }

                  const letter = String.fromCharCode(65 + optIndex);

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      disabled={!!quizResult}
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      className={`w-full p-4 rounded-2xl border text-left text-sm flex items-center justify-between transition-all ${cardStyle}`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <span className="h-6 w-6 rounded-lg bg-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                          {letter}
                        </span>
                        <span className="leading-relaxed">{optionText}</span>
                      </div>

                      {feedback && isCorrect && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      )}
                      {feedback && isWrongSelected && (
                        <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Feedback & Explanation Box */}
              {feedback && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 font-bold">
                    {feedback.is_correct ? (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Correct Answer</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center space-x-1">
                        <XCircle className="h-4 w-4" />
                        <span>Incorrect Choice</span>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">{feedback.explanation}</p>
                  {feedback.source_text_snippet && (
                    <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800/60 flex items-start space-x-2">
                      <span className="font-semibold text-indigo-400 shrink-0">Grounded Text:</span>
                      <span className="italic">&ldquo;{feedback.source_text_snippet}&rdquo;</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submission Footer */}
      {!quizResult && (
        <div className="sticky bottom-6 p-4 rounded-2xl glass-panel flex items-center justify-between shadow-2xl border border-indigo-500/30">
          <span className="text-xs text-slate-300">
            {Object.keys(selectedAnswers).length} of {quiz.questions.length} questions answered
          </span>
          <button
            onClick={handleSubmit}
            disabled={!isAllAnswered || submitting}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all"
          >
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Grading Answers...</span>
              </>
            ) : (
              <>
                <span>Submit Quiz for Instant Evaluation</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
