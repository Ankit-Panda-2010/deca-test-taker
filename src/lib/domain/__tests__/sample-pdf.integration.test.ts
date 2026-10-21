import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { parseDecaExam } from "../parser";

const samplePath = process.env.DECA_SAMPLE_PDF_PATH;

describe.skipIf(!samplePath)("attached DECA sample PDF", () => {
  it("extracts all 100 questions and descriptive-key answers", async () => {
    const buffer = await readFile(samplePath!);
    const pages = await extractPdfText(new Uint8Array(buffer));
    const exam = parseDecaExam(pages);
    expect(pages).toHaveLength(39);
    expect(exam.questions).toHaveLength(100);
    expect(new Set(exam.questions.map((question) => question.number)).size).toBe(100);
    expect(exam.questions.every((question) => question.options.length === 4)).toBe(true);
    expect(exam.questions.every((question) => question.correctAnswer)).toBe(true);
    expect(exam.questions[0].correctAnswer).toBe("D");
    expect(exam.questions[99].correctAnswer).toBe("D");
  }, 30_000);
});
