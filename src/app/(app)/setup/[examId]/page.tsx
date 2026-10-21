"use client";

import { use } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ExamSetupForm } from "@/components/exam-setup-form";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/local/db";

export default function SetupPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params); const exam = useLiveQuery(() => db.exams.get(examId), [examId]);
  if (exam === undefined) return <p className="text-sm text-muted-foreground">Loading setup…</p>;
  if (!exam) return <div className="rounded-2xl border bg-card p-8 text-center"><h1 className="text-xl font-semibold">Exam not found</h1><Button asChild className="mt-4"><Link href="/library">Open library</Link></Button></div>;
  const unresolved = exam.questions.some((question) => !question.correctAnswer || question.extractionStatus !== "validated");
  if (unresolved) return <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8"><h1 className="text-xl font-semibold">Review required</h1><p className="mt-2 text-sm text-muted-foreground">Resolve missing keys or extraction warnings before starting a scored attempt.</p><Button asChild className="mt-5"><Link href={`/review/${exam.id}`}>Review questions</Link></Button></div>;
  return <div><p className="text-sm font-semibold text-primary">Local session setup</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{exam.title}</h1><p className="mt-2 text-muted-foreground">Tune the session. Progress will save automatically in this browser.</p><div className="mt-9"><ExamSetupForm examId={exam.id} questionCount={exam.questions.length} /></div></div>;
}
