"use client";

import { use } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ExamRunner } from "@/components/exam-runner";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/local/db";

export default function ExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const data = useLiveQuery(async () => { const attempt = await db.attempts.get(attemptId); const exam = attempt ? await db.exams.get(attempt.examId) : undefined; return { attempt, exam }; }, [attemptId]);
  if (!data) return <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading local attempt…</main>;
  if (!data.attempt || !data.exam) return <main className="grid min-h-screen place-items-center"><div className="text-center"><h1 className="text-xl font-semibold">Attempt not found</h1><Button asChild className="mt-4"><Link href="/dashboard">Open dashboard</Link></Button></div></main>;
  if (data.attempt.status !== "in_progress") return <main className="grid min-h-screen place-items-center"><div className="text-center"><h1 className="text-xl font-semibold">This attempt is complete</h1><Button asChild className="mt-4"><Link href={`/results/${attemptId}`}>View results</Link></Button></div></main>;
  const byId = new Map(data.exam.questions.map((question) => [question.id, question]));
  const questions = data.attempt.questionOrder.flatMap((id) => { const question = byId.get(id); return question ? [{ id: question.id, number: question.number, text: question.text, answer_choices: question.options.map((option) => ({ label: option.id, text: option.text })), performance_indicators: question.performanceIndicator, correctAnswer: question.correctAnswer, explanation: question.explanation }] : []; });
  const responses = Object.entries(data.attempt.responses).map(([questionId, response]) => ({ question_id: questionId, selected_answer: response.selectedAnswer, is_checked: response.isChecked, is_correct: response.isCorrect }));
  const feedback = Object.fromEntries(Object.entries(data.attempt.responses).flatMap(([questionId, response]) => { const question = byId.get(questionId); if (!response.isChecked || !question?.correctAnswer) return []; return [[questionId, { correct: Boolean(response.isCorrect), correctAnswer: question.correctAnswer, explanation: question.explanation, explanationOrigin: question.explanation ? "source_pdf" : null }]]; }));
  return <ExamRunner attemptId={attemptId} examTitle={data.exam.title} mode={data.attempt.config.mode} config={data.attempt.config} dueAt={data.attempt.dueAt} initialIndex={data.attempt.currentIndex} initialFlagged={data.attempt.flaggedQuestions} questions={questions} initialResponses={responses} initialFeedback={feedback} />;
}
