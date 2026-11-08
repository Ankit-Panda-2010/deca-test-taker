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

  it("names DECA exams by category, competition level, and year", () => {
    expect(importedExamTitle({
      title: "MARKETING Career Cluster Exam",
      category: "MARKETING",
      testCode: "1322",
      competitionLevel: "District",
      examYear: 2026,
    }, "districts_1.pdf")).toBe("Marketing - District - 2026");

    expect(importedExamTitle({
      title: "HOSPITALITY AND TOURISM Career Cluster Exam",
      category: "HOSPITALITY AND TOURISM",
      testCode: "1323",
      competitionLevel: "ICDC",
      examYear: 2025,
    }, "icdc.pdf")).toBe("Hospitality and Tourism - ICDC - 2025");
  });

  it("keeps the prior unique-title fallback when cover metadata is incomplete", () => {
    expect(importedExamTitle({ title: "MARKETING Career Cluster Exam", testCode: "1322" }, "districts_1.pdf"))
      .toBe("MARKETING Career Cluster Exam · Test 1322");
  });

  it("detects a stale saved extraction for the same PDF", () => {
    const first = [{ number: 1, text: "First test question", options: [{ id: "A" as const, text: "One" }], correctAnswer: "A" as const }];
    const second = [{ number: 1, text: "Second test question", options: [{ id: "A" as const, text: "One" }], correctAnswer: "A" as const }];

    expect(questionsMatchPdf(first, first)).toBe(true);
    expect(questionsMatchPdf(first, second)).toBe(false);
  });
});
