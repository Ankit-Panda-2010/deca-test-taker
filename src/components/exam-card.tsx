"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db, deleteLocalExam } from "@/lib/local/db";

type ExamCardProps = {
  id: string; title: string; category: string | null; questionCount: number; createdAt: string;
  unresolved: boolean; latestScore?: number | null; attempts?: number;
};

export function ExamCard({ id, title, category, questionCount, createdAt, unresolved, latestScore, attempts = 0 }: ExamCardProps) {
  const router = useRouter();
  async function rename() { const next = prompt("Rename this exam", title)?.trim(); if (!next || next === title) return; await db.exams.update(id, { title: next.slice(0, 120), updatedAt: new Date().toISOString() }); toast.success("Exam renamed"); router.refresh(); }
  async function remove() { if (!confirm(`Delete “${title}” and all attempts from this browser? This cannot be undone.`)) return; await deleteLocalExam(id); toast.success("Local exam deleted"); router.refresh(); }
  return <Card className="group"><CardContent className="p-5"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><FileText className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{category ?? "Uncategorized"} · {questionCount} questions</p></div><div className="flex"><Button variant="ghost" size="icon" onClick={rename} aria-label="Rename exam"><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={remove} aria-label="Delete exam" className="text-destructive"><Trash2 className="size-4" /></Button></div></div><div className="mt-4 flex flex-wrap items-center gap-2"><Badge variant={unresolved ? "warning" : "success"}>{unresolved ? "Needs review" : "Ready"}</Badge>{latestScore != null && <Badge variant="secondary">Last score {latestScore}%</Badge>}<span className="text-xs text-muted-foreground">{attempts} attempt{attempts === 1 ? "" : "s"} · {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span></div></div></div><div className="mt-5 flex gap-2"><Button asChild size="sm"><Link href={unresolved ? `/review/${id}` : `/setup/${id}`}>{unresolved ? "Review extraction" : "Start exam"}<ArrowRight className="size-3.5" /></Link></Button><Button asChild variant="outline" size="sm"><Link href={`/review/${id}`}>View questions</Link></Button></div></CardContent></Card>;
}
