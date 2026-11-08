"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle, RotateCcw, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { db } from "@/lib/local/db";
import { assertMatchingPdfHash, importedExamTitle, questionsMatchPdf, sha256Blob } from "@/lib/import/pdf-identity";
import type { DocumentClassification, ExtractedExam } from "@/lib/domain/exam-schema";
import type { LocalExam } from "@/lib/local/types";

const MAX_BYTES = 4 * 1024 * 1024;

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const requestRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<"idle" | "preparing" | "uploading" | "processing" | "error">("idle");
  const [error, setError] = useState("");

  function choose(candidate?: File) {
    if (!candidate) return;
    if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file."); setState("error"); return;
    }
    if (candidate.size > MAX_BYTES) { setError("This PDF is larger than the 4 MB upload limit."); setState("error"); return; }
    xhrRef.current?.abort(); requestRef.current += 1;
    setFile(candidate); setError(""); setState("idle"); setProgress(0);
  }

  async function upload() {
    if (!file) return;
    const selectedFile = file;
    const requestId = ++requestRef.current;
    setState("preparing"); setError(""); setProgress(0);
    let selectedSha256: string;
    let existingExam: LocalExam | undefined;
    try {
      selectedSha256 = await sha256Blob(selectedFile);
      if (requestRef.current !== requestId) return;
      existingExam = await db.exams.where("sha256").equals(selectedSha256).first();
      if (requestRef.current !== requestId) return;
    } catch (cause) {
      if (requestRef.current !== requestId) return;
      setState("error");
      setError(cause instanceof Error ? cause.message : "The PDF could not be identified.");
      return;
    }
    setState("uploading");
    const body = new FormData(); body.set("file", selectedFile);
    const xhr = new XMLHttpRequest(); xhrRef.current = xhr;
    xhr.open("POST", `/api/local-extract?sha256=${selectedSha256}`);
    xhr.setRequestHeader("Cache-Control", "no-cache");
    xhr.upload.onprogress = (event) => event.lengthComputable && setProgress(Math.round((event.loaded / event.total) * 100));
    xhr.onerror = () => { if (requestRef.current === requestId) { setState("error"); setError("The upload was interrupted. Try again."); } };
    xhr.onload = async () => {
      if (requestRef.current !== requestId) return;
      let payload: { exam?: ExtractedExam; verification?: DocumentClassification; sha256?: string; error?: string } = {};
      try { payload = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && payload.exam && payload.verification && payload.sha256) {
        try {
          assertMatchingPdfHash(selectedSha256, payload.sha256);
          setState("processing");
          if (existingExam && questionsMatchPdf(existingExam.questions, payload.exam.questions)) {
            const updatedTitle = importedExamTitle(payload.exam, selectedFile.name);
            await db.exams.update(existingExam.id, {
              title: updatedTitle,
              competitionLevel: payload.exam.competitionLevel,
              examYear: payload.exam.examYear,
              updatedAt: new Date().toISOString(),
            });
            setError(`This exact PDF is already saved as “${updatedTitle}”. Opening the verified copy…`);
            setTimeout(() => router.push(`/review/${existingExam.id}`), 600);
            return;
          }
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const importedExam = {
            id,
            title: importedExamTitle(payload.exam, selectedFile.name),
            originalTitle: payload.exam.title,
            category: payload.exam.category,
            testCode: payload.exam.testCode,
            competitionLevel: payload.exam.competitionLevel,
            examYear: payload.exam.examYear,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileBlob: selectedFile,
            sha256: payload.sha256,
            pageCount: payload.exam.pageCount,
            questions: payload.exam.questions.map((question) => ({ ...question, id: crypto.randomUUID() })),
            warnings: payload.exam.warnings,
            verification: payload.verification,
            createdAt: now,
            updatedAt: now,
          };
          if (existingExam) {
            await db.transaction("rw", db.exams, async () => {
              await db.exams.update(existingExam.id, {
                title: `${existingExam.title} (previous import)`,
                sha256: `superseded:${existingExam.id}:${existingExam.sha256}`,
                updatedAt: now,
              });
              await db.exams.add(importedExam);
            });
          } else {
            await db.exams.add(importedExam);
          }
          router.push(`/review/${id}`);
        } catch (cause) {
          setState("error");
          setError(cause instanceof Error ? cause.message : "The PDF could not be saved.");
        }
      } else { setState("error"); setError(payload.error || "The PDF could not be processed."); }
    };
    xhr.send(body);
  }

  function cancel() { requestRef.current += 1; xhrRef.current?.abort(); setState("idle"); setProgress(0); }

  return <div>
    {!file ? <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }} className={`group grid w-full place-items-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}><span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><UploadCloud className="size-7" /></span><span className="mt-5 text-lg font-semibold">Drop your exam PDF here</span><span className="mt-2 text-sm text-muted-foreground">or click to browse · PDF only · up to 4 MB</span></button> : <div className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="size-6" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{file.name}</p><p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p></div>{state !== "preparing" && state !== "uploading" && state !== "processing" && <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file"><X className="size-4" /></Button>}</div>{state === "preparing" && <div className="mt-5 flex items-center gap-3 rounded-xl bg-primary/5 p-4 text-sm font-medium"><LoaderCircle className="size-5 animate-spin text-primary" />Identifying this exact PDF…</div>}{state === "uploading" && <div className="mt-5"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Sending for PDF parsing</span><span>{progress}%</span></div><Progress value={progress} /></div>}{state === "processing" && <div className="mt-5 flex items-center gap-3 rounded-xl bg-primary/5 p-4 text-sm font-medium"><LoaderCircle className="size-5 animate-spin text-primary" />Saving the extracted exam on this device…</div>}<div className="mt-5 flex gap-2">{state === "preparing" || state === "uploading" ? <Button variant="outline" onClick={cancel}>Cancel</Button> : state === "processing" ? null : <><Button onClick={upload}>{state === "error" ? <RotateCcw className="size-4" /> : <UploadCloud className="size-4" />}{state === "error" ? "Retry" : "Analyze PDF"}</Button><Button variant="ghost" onClick={() => inputRef.current?.click()}>Choose another</Button></>}</div></div>}
    <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => choose(event.target.files?.[0])} />
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
  </div>;
}
