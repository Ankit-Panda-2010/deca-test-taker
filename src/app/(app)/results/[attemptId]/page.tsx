"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ResultsDashboard } from "@/components/results-dashboard";
import { db } from "@/lib/local/db";

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const data = useLiveQuery(async () => {
    const attempt = await db.attempts.get(attemptId);
    if (!attempt) return null;
    const exam = await db.exams.get(attempt.examId);
    if (!exam) return null;
    const history = await db.attempts.where("examId").equals(exam.id).sortBy("startedAt");
    return { attempt, exam, history };
  }, [attemptId]);

  useEffect(() => {
    if (data?.attempt.status === "in_progress") router.replace(`/exam/${attemptId}`);
  }, [attemptId, data, router]);

  if (data === undefined) return <p className="py-16 text-center text-sm text-muted-foreground">Loading local results…</p>;
  if (data === null) return <p className="py-16 text-center text-sm text-muted-foreground">These results are not available in this browser.</p>;
  if (data.attempt.status === "in_progress") return null;

  const { attempt, exam, history } = data;
  const questions = new Map(exam.questions.map((question) => [question.id, question]));
  const flagged = new Set(attempt.flaggedQuestions);
  const items = attempt.questionOrder.flatMap((id) => {
    const question = questions.get(id);
    if (!question?.correctAnswer) return [];
    const response = attempt.responses[id];
    return [{
      id,
      number: question.number,
      text: question.text,
      sourcePage: question.sourcePage,
      choices: question.options.map((option) => ({ label: option.id, text: option.text })),
      selected: response?.selectedAnswer ?? null,
      correctAnswer: question.correctAnswer,
      correct: response?.isCorrect ?? false,
      explanation: question.explanation ?? null,
      explanationOrigin: question.explanation ? ("source_pdf" as const) : null,
      performanceIndicator: question.performanceIndicator ?? null,
      flagged: flagged.has(id),
    }];
  });
  const total = attempt.questionOrder.length;
  const score = attempt.score ?? 0;
  const unanswered = items.filter((item) => item.selected === null).length;

  return <ResultsDashboard
    examId={exam.id}
    fileBlob={exam.fileBlob}
    examTitle={exam.title}
    summary={{
      score,
      total,
      percentage: attempt.percentage ?? 0,
      incorrect: Math.max(0, total - score - unanswered),
      unanswered,
      duration: attempt.durationSeconds ?? 0,
      mode: attempt.config.mode,
      completedAt: attempt.submittedAt ?? new Date().toISOString(),
    }}
    items={items}
    trend={history.flatMap((item) => item.percentage == null ? [] : [item.percentage])}
  />;
}
