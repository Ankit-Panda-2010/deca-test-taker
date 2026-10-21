import type { AttemptConfig, DocumentClassification, ExtractedQuestion } from "@/lib/domain/exam-schema";

export type LocalQuestion = ExtractedQuestion & { id: string };

export type LocalExam = {
  id: string;
  title: string;
  originalTitle: string;
  category: string | null;
  testCode: string | null;
  fileName: string;
  fileSize: number;
  fileBlob: Blob;
  sha256: string;
  pageCount: number;
  questions: LocalQuestion[];
  warnings: string[];
  verification: DocumentClassification;
  createdAt: string;
  updatedAt: string;
};

export type LocalResponse = {
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  isChecked: boolean;
  isCorrect: boolean | null;
  answeredAt: string;
};

export type LocalAttempt = {
  id: string;
  examId: string;
  status: "in_progress" | "submitted" | "expired";
  config: AttemptConfig;
  questionOrder: string[];
  currentIndex: number;
  flaggedQuestions: string[];
  responses: Record<string, LocalResponse>;
  startedAt: string;
  dueAt: string | null;
  submittedAt: string | null;
  score: number | null;
  percentage: number | null;
  durationSeconds: number | null;
};
