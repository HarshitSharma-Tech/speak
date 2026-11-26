"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Award,
  ArrowLeft,
} from "lucide-react";
import { QuizItem, QuizResult, api } from "@/lib/api";
import { Card, Button, Badge, InlineBanner } from "@/components/ui";

interface QuizRunnerProps {
  quiz: QuizItem;
  courseId: string;
  onOpenSourceCitation: (chunkId: string) => void;
  onRetake: () => void;
  onClose: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  quiz,
  onOpenSourceCitation,
  onRetake,
  onClose,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (quizResult || submitting) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleOptionKeyDown = (
    e: React.KeyboardEvent,
    questionId: string,
    currentOptionIdx: number,
    totalOptions: number
  ) => {
    if (quizResult || submitting) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = (currentOptionIdx + 1) % totalOptions;
      handleSelectOption(questionId, next);
      const nextEl = document.getElementById(`quiz-opt-${questionId}-${next}`);
      nextEl?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (currentOptionIdx - 1 + totalOptions) % totalOptions;
      handleSelectOption(questionId, prev);
      const prevEl = document.getElementById(`quiz-opt-${questionId}-${prev}`);
      prevEl?.focus();
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = quiz.questions.length;
  const isAllAnswered =
    totalQuestions > 0 &&
    quiz.questions.every((q) => selectedAnswers[q.id] !== undefined);

  const handleSubmit = async () => {
    if (!isAllAnswered || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = Object.entries(selectedAnswers).map(
        ([question_id, selected_option_index]) => ({
          question_id,
          selected_option_index,
        })
      );

      const result = await api.submitQuiz(quiz.id, payload);
      setQuizResult(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not evaluate quiz answers. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Quiz Header */}
      <Card className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{totalQuestions} questions</Badge>
            <span className="text-xs text-[#526170]">
              Every question includes a textbook source citation
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#17212B] tracking-tight">
            {quiz.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetake}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            New quiz set
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            icon={<ArrowLeft className="h-3.5 w-3.5" />}
          >
            Back to module
          </Button>
        </div>
      </Card>

      {/* Graded Result Summary */}
      {quizResult && (
        <Card className="p-6 bg-[#EFF6FF] border-[#BFDBFE] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[#1D4ED8]">
                  Quiz graded
                </span>
                <h3 className="text-2xl font-bold text-[#17212B]">
                  {quizResult.score} of {quizResult.total_questions} correct (
                  {quizResult.percentage}%)
                </h3>
                <p className="text-xs text-[#526170]">
                  Review the explanations and textbook source citations for each question below.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuizResult(null);
                setSelectedAnswers({});
              }}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Retry this quiz
            </Button>
          </div>
        </Card>
      )}

      {submitError && (
        <InlineBanner
          variant="error"
          title="Could not grade quiz"
          onDismiss={() => setSubmitError(null)}
        >
          {submitError}
        </InlineBanner>
      )}

      {/* Questions List */}
      <div className="space-y-5">
        {quiz.questions.map((q, qIndex) => {
          const feedback = quizResult?.feedback?.find(
            (f) => f.question_id === q.id
          );
          const selectedOption = selectedAnswers[q.id];
          const questionTitleId = `question-title-${q.id}`;

          return (
            <Card
              key={q.id}
              className={`p-6 space-y-4 ${
                feedback
                  ? feedback.is_correct
                    ? "border-[#BBF7D0]"
                    : "border-[#FECACA]"
                  : ""
              }`}
            >
              {/* Question Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code font-semibold text-[#1D4ED8] px-2 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE]">
                      Question {qIndex + 1} of {totalQuestions}
                    </span>
                    {feedback && (
                      <Badge
                        variant={feedback.is_correct ? "success" : "error"}
                      >
                        {feedback.is_correct ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Incorrect</span>
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                  <h3
                    id={questionTitleId}
                    className="text-base font-bold text-[#17212B] leading-snug pt-0.5"
                  >
                    {q.question_text}
                  </h3>
                </div>

                {/* Source Citation Trigger */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenSourceCitation(q.source_chunk_id)}
                  icon={<BookOpen className="h-3.5 w-3.5 text-[#1D4ED8]" />}
                  title="Inspect verbatim textbook passage"
                >
                  View source
                </Button>
              </div>

              {/* 4 Answer Options with Keyboard Support */}
              <div
                role="radiogroup"
                aria-labelledby={questionTitleId}
                className="space-y-2.5 pt-1"
              >
                {q.options.map((optionText, optIndex) => {
                  const isSelected = selectedOption === optIndex;
                  const isCorrect = feedback?.correct_option_index === optIndex;
                  const isWrongSelected =
                    Boolean(feedback) && isSelected && !feedback?.is_correct;

                  let optionClasses =
                    "bg-white border-[#E2E7ED] hover:bg-[#F7F8FA] text-[#17212B]";
                  let badgeClasses =
                    "bg-[#F1F4F8] border-[#E2E7ED] text-[#526170]";

                  if (isSelected && !feedback) {
                    optionClasses =
                      "bg-[#EFF6FF] border-[#1D4ED8] ring-1 ring-[#1D4ED8] text-[#17212B] font-medium";
                    badgeClasses =
                      "bg-[#1D4ED8] border-[#1D4ED8] text-white";
                  }

                  if (feedback) {
                    if (isCorrect) {
                      optionClasses =
                        "bg-[#F0FDF4] border-[#15803D] text-[#15803D] font-medium";
                      badgeClasses =
                        "bg-[#15803D] border-[#15803D] text-white";
                    } else if (isWrongSelected) {
                      optionClasses =
                        "bg-[#FEF2F2] border-[#B91C1C] text-[#B91C1C]";
                      badgeClasses =
                        "bg-[#B91C1C] border-[#B91C1C] text-white";
                    } else {
                      optionClasses =
                        "bg-[#F7F8FA] border-[#E2E7ED] text-[#64748B]";
                    }
                  }

                  const letter = String.fromCharCode(65 + optIndex);

                  return (
                    <button
                      key={optIndex}
                      id={`quiz-opt-${q.id}-${optIndex}`}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={Boolean(quizResult) || submitting}
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      onKeyDown={(e) =>
                        handleOptionKeyDown(
                          e,
                          q.id,
                          optIndex,
                          q.options.length
                        )
                      }
                      className={`w-full p-3.5 rounded-xl border text-left text-sm flex items-center justify-between gap-3 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] disabled:cursor-default ${optionClasses}`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`h-6 w-6 rounded-md border font-mono-code font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5 ${badgeClasses}`}
                        >
                          {letter}
                        </span>
                        <span className="leading-relaxed">{optionText}</span>
                      </div>

                      {feedback && isCorrect && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D] shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Correct answer</span>
                        </span>
                      )}
                      {feedback && isWrongSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] shrink-0">
                          <XCircle className="h-4 w-4" />
                          <span>Your selection</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Grounded Excerpt after grading */}
              {feedback && (
                <div className="mt-3 p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E7ED] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-semibold flex items-center gap-1.5 ${
                        feedback.is_correct
                          ? "text-[#15803D]"
                          : "text-[#B91C1C]"
                      }`}
                    >
                      {feedback.is_correct ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Correct — Explanation</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 shrink-0" />
                          <span>
                            Incorrect — Option{" "}
                            {String.fromCharCode(
                              65 + feedback.correct_option_index
                            )}{" "}
                            is correct
                          </span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onOpenSourceCitation(feedback.source_chunk_id)
                      }
                      className="text-[#1D4ED8] font-semibold hover:underline cursor-pointer"
                    >
                      Inspect page citation &rarr;
                    </button>
                  </div>

                  <p className="text-sm text-[#17212B] leading-relaxed">
                    {feedback.explanation}
                  </p>

                  {feedback.source_text_snippet && (
                    <blockquote className="p-3 rounded-lg bg-white border border-[#E2E7ED] border-l-4 border-l-[#1D4ED8] text-[#526170] italic leading-relaxed">
                      &ldquo;{feedback.source_text_snippet}&rdquo;
                    </blockquote>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Sticky Submission Footer */}
      {!quizResult && (
        <Card className="sticky bottom-4 p-4 shadow-md border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-xs">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-[#17212B] block">
              {answeredCount} of {totalQuestions} questions answered
            </span>
            <span className="text-xs text-[#526170]">
              {isAllAnswered
                ? "All questions answered. Submit to view your score and source explanations."
                : "Select one option for each question before submitting."}
            </span>
          </div>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isAllAnswered}
            loading={submitting}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            {submitting ? "Grading answers..." : "Submit quiz"}
          </Button>
        </Card>
      )}
    </div>
  );
};
