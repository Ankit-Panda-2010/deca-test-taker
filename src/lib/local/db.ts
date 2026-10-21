"use client";

import Dexie, { type EntityTable } from "dexie";
import type { LocalAttempt, LocalExam } from "./types";

class DecaPrepDatabase extends Dexie {
  exams!: EntityTable<LocalExam, "id">;
  attempts!: EntityTable<LocalAttempt, "id">;

  constructor() {
    super("deca-prep-local");
    this.version(1).stores({
      exams: "&id, &sha256, title, category, createdAt, updatedAt",
      attempts: "&id, examId, status, startedAt, submittedAt",
    });
  }
}

export const db = new DecaPrepDatabase();

export async function deleteLocalExam(examId: string) {
  await db.transaction("rw", db.exams, db.attempts, async () => {
    await db.attempts.where("examId").equals(examId).delete();
    await db.exams.delete(examId);
  });
}

export async function clearLocalData() {
  await db.transaction("rw", db.exams, db.attempts, async () => {
    await db.attempts.clear();
    await db.exams.clear();
  });
}
