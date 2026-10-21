"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { HardDrive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearLocalData, db } from "@/lib/local/db";

export default function SettingsPage() {
  const stats = useLiveQuery(async () => { const exams = await db.exams.toArray(); return { exams: exams.length, attempts: await db.attempts.count(), bytes: exams.reduce((sum, exam) => sum + exam.fileSize, 0) }; }, []);
  async function clear() { if (!confirm("Delete every local exam, PDF, and attempt from this browser? This cannot be undone.")) return; await clearLocalData(); toast.success("Local DECA Prep data cleared"); }
  return <div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Browser storage</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Local settings</h1><Card className="mt-6"><CardHeader><CardTitle className="flex items-center gap-2"><HardDrive className="size-5" />This device</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-6 text-muted-foreground">DECA Prep stores PDFs, extracted questions, edits, and attempts in IndexedDB. Nothing is synced to an account or cloud database. Data is available only in this browser profile.</p><div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-muted p-4"><p className="text-2xl font-bold">{stats?.exams ?? 0}</p><p className="text-xs text-muted-foreground">Exams</p></div><div className="rounded-xl bg-muted p-4"><p className="text-2xl font-bold">{stats?.attempts ?? 0}</p><p className="text-xs text-muted-foreground">Attempts</p></div><div className="rounded-xl bg-muted p-4"><p className="text-2xl font-bold">{stats?.bytes ? `${(stats.bytes/1024/1024).toFixed(1)}` : "0"}</p><p className="text-xs text-muted-foreground">MB stored</p></div></div><div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"><p className="font-medium">Danger zone</p><p className="mt-1 text-sm text-muted-foreground">Clearing data cannot be undone. Keep your original PDFs as backups.</p><Button className="mt-4" variant="destructive" onClick={clear}><Trash2 className="size-4" />Clear all local data</Button></div></CardContent></Card></div>;
}
