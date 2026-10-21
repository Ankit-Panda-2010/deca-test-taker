"use client";

import type { AttemptConfig } from "@/lib/domain/exam-schema";
import { gradeAttempt } from "@/lib/domain/grading";
import { db } from "./db";
import type { LocalAttempt, LocalExam } from "./types";

function shuffled<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export async function createLocalAttempt(exam: LocalExam, config: AttemptConfig, onlyQuestionIds?: string[]) {
  let questions = onlyQuestionIds
    ? exam.questions.filter((question) => onlyQuestionIds.includes(question.id))
    : exam.questions;
  if (config.order === "randomized") questions = shuffled(questions);
  questions = questions.slice(0, Math.min(config.questionCount, questions.length));
  const startedAt = new Date();
  const attempt: LocalAttempt = {
    id: crypto.randomUUID(),
    examId: exam.id,
    status: "in_progress",
    config: { ...config, questionCount: questions.length },
    questionOrder: questions.map((question) => question.id),
    currentIndex: 0,
    flaggedQuestions: [],
    responses: {},
    startedAt: startedAt.toISOString(),
    dueAt: config.timerMinutes ? new Date(startedAt.getTime() + config.timerMinutes * 60_000).toISOString() : null,
    submittedAt: null,
    score: null,
    percentage: null,
    durationSeconds: null,
  };
  await db.attempts.add(attempt);
  return attempt;
}

export async function submitLocalAttempt(attempt: LocalAttempt, exam: LocalExam) {
  const questions = attempt.questionOrder.flatMap((id) => {
    const question = exam.questions.find((item) => item.id === id);
    return question?.correctAnswer ? [{ id, correctAnswer: question.correctAnswer }] : [];
  });
  if (questions.length !== attempt.questionOrder.length) throw new Error("One or more answer keys are unresolved.");
  const grade = gradeAttempt(
    questions,
    attempt.questionOrder.map((questionId) => ({ questionId, selectedAnswer: attempt.responses[questionId]?.selectedAnswer ?? null })),
  );
  const submittedAt = new Date();
  const next: LocalAttempt = {
    ...attempt,
    status: attempt.dueAt && new Date(attempt.dueAt).getTime() <= submittedAt.getTime() ? "expired" : "submitted",
    responses: Object.fromEntries(grade.items.map((item) => [item.questionId, {
      selectedAnswer: item.selectedAnswer,
      isChecked: true,
      isCorrect: item.correct,
      answeredAt: attempt.responses[item.questionId]?.answeredAt ?? submittedAt.toISOString(),
    }])),
    submittedAt: submittedAt.toISOString(),
    score: grade.correct,
    percentage: grade.percentage,
    durationSeconds: Math.max(0, Math.round((submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000)),
  };
  await db.attempts.put(next);
  return next;
}
