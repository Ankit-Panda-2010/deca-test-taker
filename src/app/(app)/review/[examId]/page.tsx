"use client";

import { use } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, CheckCircle2, HardDrive, Info, ShieldAlert } from "lucide-react";
import { QuestionReview } from "@/components/question-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/local/db";

export default function ReviewPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params); const exam = useLiveQuery(() => db.exams.get(examId), [examId]);
  if (exam === undefined) return <p className="text-sm text-muted-foreground">Loading local exam…</p>;
  if (!exam) return <div className="rounded-2xl border bg-card p-8 text-center"><h1 className="text-xl font-semibold">Exam not found on this device</h1><Button asChild className="mt-5"><Link href="/library">Back to library</Link></Button></div>;
  const unresolved = exam.questions.some((question) => question.extractionStatus !== "validated" || !question.correctAnswer); const recognized = exam.verification.classification === "deca_format_recognized";
  return <div><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant={recognized ? "success" : "warning"}>{recognized ? "DECA format recognized" : "Needs review"}</Badge><Badge variant="secondary">{exam.questions.length} questions</Badge>{exam.verification.answerKeyFound && <Badge variant="secondary">Answer key located</Badge>}<Badge variant="secondary"><HardDrive className="mr-1 size-3" />Local only</Badge></div><h1 className="mt-4 text-3xl font-bold tracking-tight">Review {exam.title}</h1><p className="mt-2 text-muted-foreground">Confirm flagged content before starting a scored session.</p></div>{unresolved ? <Button disabled>Resolve issues to continue</Button> : <Button asChild><Link href={`/setup/${exam.id}`}>Continue to setup<ArrowRight className="size-4" /></Link></Button>}</div>
    <Card className="mt-7"><CardContent className="p-5"><div className="flex gap-3">{recognized ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />}<div><p className="font-semibold">{recognized ? "DECA exam format recognized" : "Manual review recommended"}</p><p className="mt-1 text-sm text-muted-foreground">Local structural checks found {exam.verification.supportingIndicators.length} supporting signals. This identifies compatible formatting; it does not prove official provenance.</p><details className="mt-3 text-sm"><summary className="cursor-pointer font-medium text-primary">Verification details</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="font-medium">Supporting signals</p><ul className="mt-1 text-muted-foreground">{exam.verification.supportingIndicators.map((item) => <li key={item}>· {item}</li>)}</ul></div><div><p className="font-medium">Missing or conflicting</p><ul className="mt-1 text-muted-foreground">{exam.verification.conflictingIndicators.length ? exam.verification.conflictingIndicators.map((item) => <li key={item}>· {item}</li>) : <li>· None detected</li>}</ul></div></div><p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Info className="size-3.5" />No AI or external verification service was used.</p></details></div></div></CardContent></Card>
    <div className="mt-10"><QuestionReview exam={exam} /></div>
  </div>;
}
