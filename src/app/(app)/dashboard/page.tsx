"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, BookOpen, Clock3, HardDrive, Target, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExamCard } from "@/components/exam-card";
import { db } from "@/lib/local/db";

export default function DashboardPage() {
  const data = useLiveQuery(async () => {
    const exams = await db.exams.orderBy("createdAt").reverse().toArray();
    const attempts = await db.attempts.orderBy("startedAt").reverse().toArray();
    return { exams, attempts };
  }, []);
  const exams = data?.exams ?? []; const attempts = data?.attempts ?? [];
  const submitted = attempts.filter((attempt) => attempt.status !== "in_progress");
  const average = submitted.length ? Math.round(submitted.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) / submitted.length) : null;
  const totalBytes = exams.reduce((sum, exam) => sum + exam.fileSize, 0);
  return <div><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">Local study space</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Ready when you are.</h1><p className="mt-2 text-muted-foreground">Everything here is stored in this browser—no account required.</p></div><Button asChild><Link href="/upload"><Upload className="size-4" />Import an exam</Link></Button></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-4"><Card><CardContent className="flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-5" /></span><div><p className="text-2xl font-bold">{exams.length}</p><p className="text-sm text-muted-foreground">Local exams</p></div></CardContent></Card><Card><CardContent className="flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-700"><Clock3 className="size-5" /></span><div><p className="text-2xl font-bold">{attempts.filter((a) => a.status === "in_progress").length}</p><p className="text-sm text-muted-foreground">In progress</p></div></CardContent></Card><Card><CardContent className="flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700"><Target className="size-5" /></span><div><p className="text-2xl font-bold">{average == null ? "—" : `${average}%`}</p><p className="text-sm text-muted-foreground">Avg. accuracy</p></div></CardContent></Card><Card><CardContent className="flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-sky-500/10 text-sky-700"><HardDrive className="size-5" /></span><div><p className="text-2xl font-bold">{totalBytes ? `${(totalBytes/1024/1024).toFixed(1)} MB` : "0 MB"}</p><p className="text-sm text-muted-foreground">Device storage</p></div></CardContent></Card></div>
    <div className="mt-10 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Recent exams</h2><p className="text-sm text-muted-foreground">Saved in IndexedDB on this device.</p></div><Button asChild variant="ghost" size="sm"><Link href="/library">View library <ArrowRight className="size-4" /></Link></Button></div>
    {!data ? <p className="mt-8 text-sm text-muted-foreground">Loading local library…</p> : !exams.length ? <Card className="mt-4 border-dashed"><CardContent className="grid place-items-center px-6 py-14 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-secondary"><Upload className="size-5" /></span><h3 className="mt-4 font-semibold">Your first exam starts with a PDF</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">Import a DECA practice exam. No signup or database setup needed.</p><Button asChild className="mt-5"><Link href="/upload">Choose PDF</Link></Button></CardContent></Card> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{exams.slice(0,4).map((exam) => { const examAttempts = attempts.filter((attempt) => attempt.examId === exam.id); const latest = examAttempts.find((attempt) => attempt.status !== "in_progress"); return <ExamCard key={exam.id} id={exam.id} title={exam.title} category={exam.category} questionCount={exam.questions.length} createdAt={exam.createdAt} unresolved={exam.questions.some((question) => question.extractionStatus !== "validated")} latestScore={latest?.percentage ?? null} attempts={examAttempts.length} />; })}</div>}
  </div>;
}
