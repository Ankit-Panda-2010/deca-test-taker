"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Pencil, Trash2, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/local/db";
import type { LocalExam, LocalQuestion } from "@/lib/local/types";
import type { AnswerLetter } from "@/lib/domain/exam-schema";

export function QuestionReview({ exam }: { exam: LocalExam }) {
  const [issuesOnly, setIssuesOnly] = useState(false); const [editing, setEditing] = useState<LocalQuestion | null>(null); const [saving, setSaving] = useState(false);
  const visible = useMemo(() => issuesOnly ? exam.questions.filter((question) => question.extractionStatus !== "validated") : exam.questions, [issuesOnly, exam.questions]);
  function sourcePage(page: number) { const url = URL.createObjectURL(exam.fileBlob); window.open(`${url}#page=${page}`, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setSaving(true); const form = new FormData(event.currentTarget); const correctAnswer = String(form.get("correctAnswer") || "") as AnswerLetter | "";
    const questions = exam.questions.map((question) => question.id === editing.id ? {
      ...question,
      text: String(form.get("text")),
      options: (["A","B","C","D"] as AnswerLetter[]).map((id) => ({ id, text: String(form.get(id)) })),
      correctAnswer: correctAnswer || null,
      explanation: String(form.get("explanation") || "") || null,
      extractionStatus: correctAnswer ? "validated" as const : "unresolved" as const,
      warnings: correctAnswer ? [] : ["No correct answer has been assigned"],
    } : question);
    await db.exams.update(exam.id, { questions, updatedAt: new Date().toISOString() }); setSaving(false); setEditing(null); toast.success("Question saved locally");
  }
  async function remove(question: LocalQuestion) { if (!confirm(`Remove question ${question.number} from this local exam?`)) return; await db.exams.update(exam.id, { questions: exam.questions.filter((item) => item.id !== question.id), updatedAt: new Date().toISOString() }); toast.success("Question removed"); }
  return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Extracted questions</h2><p className="text-sm text-muted-foreground">{exam.questions.length} questions · {exam.questions.filter((q) => q.extractionStatus !== "validated").length} need attention</p></div><Button variant={issuesOnly ? "default" : "outline"} size="sm" onClick={() => setIssuesOnly((value) => !value)}><TriangleAlert className="size-4" />{issuesOnly ? "Showing issues" : "Issues only"}</Button></div>
    <div className="mt-5 space-y-3">{visible.map((question) => <div key={question.id} className="rounded-2xl border bg-card p-5"><div className="flex items-start gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold">{question.number}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><p className="max-w-3xl font-medium leading-6">{question.text}</p><Badge variant={question.extractionStatus === "validated" ? "success" : "warning"}>{question.extractionStatus === "validated" ? <><CheckCircle2 className="mr-1 size-3" />Ready</> : "Review"}</Badge></div>{question.warnings.length > 0 && <ul className="mt-3 text-sm text-amber-700 dark:text-amber-300">{question.warnings.map((warning) => <li key={warning}>· {warning}</li>)}</ul>}<div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((choice) => <div key={choice.id} className={`rounded-lg border px-3 py-2 text-sm ${question.correctAnswer === choice.id ? "border-emerald-500/30 bg-emerald-500/8" : "bg-background"}`}><strong className="mr-2">{choice.id}</strong>{choice.text}</div>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setEditing(question)}><Pencil className="size-3.5" />Edit</Button><Button variant="ghost" size="sm" onClick={() => sourcePage(question.sourcePage)}><ExternalLink className="size-3.5" />PDF page {question.sourcePage}</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(question)}><Trash2 className="size-3.5" />Remove</Button></div></div></div></div>)}</div>
    <Dialog.Root open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>{editing && <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-[#09101d]/60 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between"><div><Dialog.Title className="text-xl font-semibold">Edit question {editing.number}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">This change stays in this browser.</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon"><X className="size-4" /></Button></Dialog.Close></div><form onSubmit={save} className="mt-6 space-y-4"><label className="block text-sm font-medium">Question text<textarea name="text" defaultValue={editing.text} className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" required /></label>{editing.options.map((choice) => <label key={choice.id} className="flex items-center gap-3 text-sm font-semibold"><span className="w-5">{choice.id}</span><Input name={choice.id} defaultValue={choice.text} required /></label>)}<label className="block text-sm font-medium">Correct answer<select name="correctAnswer" defaultValue={editing.correctAnswer ?? ""} className="mt-2 h-11 w-full rounded-lg border bg-background px-3"><option value="">Unresolved</option>{["A","B","C","D"].map((letter) => <option key={letter}>{letter}</option>)}</select></label><label className="block text-sm font-medium">Explanation<textarea name="explanation" defaultValue={editing.explanation ?? ""} className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><div className="flex justify-end gap-2"><Dialog.Close asChild><Button variant="ghost">Cancel</Button></Dialog.Close><Button disabled={saving}>{saving ? "Saving…" : "Save locally"}</Button></div></form></Dialog.Content></Dialog.Portal>}</Dialog.Root>
  </div>;
}
