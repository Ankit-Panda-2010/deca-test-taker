import type { ExtractedExam, ExtractedQuestion } from "@/lib/domain/exam-schema";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export async function sha256Blob(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function assertMatchingPdfHash(expected: string, received: string) {
  if (!SHA256_PATTERN.test(expected) || !SHA256_PATTERN.test(received) || expected !== received) {
    throw new Error("The extracted questions did not match the PDF you selected. Nothing was saved; please try the upload again.");
  }
}

export function importedExamTitle(exam: Pick<ExtractedExam, "title" | "testCode">, fileName: string) {
  const fallback = fileName.replace(/\.pdf$/i, "").trim() || "Imported exam";
  const title = exam.title.trim() || fallback;
  return exam.testCode && !new RegExp(`\\bTest\\s+${exam.testCode}\\b`, "i").test(title)
    ? `${title} · Test ${exam.testCode}`
    : title;
}

type ComparableQuestion = Pick<ExtractedQuestion, "number" | "text" | "options" | "correctAnswer">;

export function questionsMatchPdf(saved: ComparableQuestion[], extracted: ComparableQuestion[]) {
  if (saved.length !== extracted.length) return false;
  return saved.every((question, index) => {
    const next = extracted[index];
    return question.number === next.number
      && question.text === next.text
      && question.correctAnswer === next.correctAnswer
      && question.options.length === next.options.length
      && question.options.every((option, optionIndex) => (
        option.id === next.options[optionIndex]?.id && option.text === next.options[optionIndex]?.text
      ));
  });
}
