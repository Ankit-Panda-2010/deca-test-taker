"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Search } from "lucide-react";
import { ExamCard } from "@/components/exam-card";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/local/db";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const data = useLiveQuery(async () => ({ exams: await db.exams.orderBy("createdAt").reverse().toArray(), attempts: await db.attempts.toArray() }), []);
  const exams = (data?.exams ?? []).filter((exam) => !query || exam.title.toLowerCase().includes(query.toLowerCase()) || exam.category?.toLowerCase().includes(query.toLowerCase()));
  return <div><div className="flex items-end justify-between"><div><p className="text-sm font-semibold text-primary">On this device</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Exam library</h1></div><BookOpen className="size-7 text-muted-foreground" /></div><div className="relative mt-7 max-w-lg"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder="Search local exams…" /></div><div className="mt-6 grid gap-4 lg:grid-cols-2">{exams.map((exam) => { const attempts = (data?.attempts ?? []).filter((attempt) => attempt.examId === exam.id); const latest = attempts.filter((attempt) => attempt.status !== "in_progress").sort((a,b) => b.startedAt.localeCompare(a.startedAt))[0]; return <ExamCard key={exam.id} id={exam.id} title={exam.title} category={exam.category} questionCount={exam.questions.length} createdAt={exam.createdAt} unresolved={exam.questions.some((question) => question.extractionStatus !== "validated")} latestScore={latest?.percentage ?? null} attempts={attempts.length} />; })}</div>{data && !exams.length && <p className="mt-12 text-center text-sm text-muted-foreground">No local exams match this search.</p>}</div>;
}
