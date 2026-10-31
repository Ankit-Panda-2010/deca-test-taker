import { describe, expect, it } from "vitest";
import { assertMatchingPdfHash, importedExamTitle, questionsMatchPdf, sha256Blob } from "./pdf-identity";

describe("PDF import identity", () => {
  it("gives different files different identities", async () => {
    const first = await sha256Blob(new Blob(["district exam one"]));
    const second = await sha256Blob(new Blob(["district exam two"]));

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
  });

  it("rejects extracted data belonging to another PDF", () => {
    const first = "a".repeat(64);
    const second = "b".repeat(64);

    expect(() => assertMatchingPdfHash(first, first)).not.toThrow();
    expect(() => assertMatchingPdfHash(first, second)).toThrow(/did not match the PDF/);
  });

  it("distinguishes DECA exams that otherwise share the same title", () => {
    expect(importedExamTitle({ title: "MARKETING Career Cluster Exam", testCode: "1322" }, "districts_1.pdf"))
      .toBe("MARKETING Career Cluster Exam · Test 1322");
    expect(importedExamTitle({ title: "MARKETING Career Cluster Exam", testCode: "1302" }, "districts_2.pdf"))
      .toBe("MARKETING Career Cluster Exam · Test 1302");
  });

  it("detects a stale saved extraction for the same PDF", () => {
    const first = [{ number: 1, text: "First test question", options: [{ id: "A" as const, text: "One" }], correctAnswer: "A" as const }];
    const second = [{ number: 1, text: "Second test question", options: [{ id: "A" as const, text: "One" }], correctAnswer: "A" as const }];

    expect(questionsMatchPdf(first, first)).toBe(true);
    expect(questionsMatchPdf(first, second)).toBe(false);
  });
});
