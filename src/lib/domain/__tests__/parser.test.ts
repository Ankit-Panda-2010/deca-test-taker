import { describe, expect, it } from "vitest";
import { parseDecaExam } from "../parser";

const questionPage = `Test 1322\nMARKETING EXAM\n1\n1. A wrapped question asks which answer is best\nfor the intended audience?\nA. First option\nB. Second option\nC. Third option\nD. Fourth option\n2. Another question?\nA. Alpha\nB. Beta\nC. Gamma\nD. Delta\nCopyright © 2026 by MBA Research and Curriculum Center®, Columbus, Ohio`;
const keyPage = `Test 1322\nMARKETING EXAM—KEY\n1\n1. D\nFourth option. This rationale wraps onto\nanother line.\nSOURCE: CO:031 Write persuasive messages\nSOURCE: LAP-CO-031\n2. B\nBeta. Supporting explanation.\nSOURCE: IM:001 Explain information management`;

describe("DECA parser", () => {
  it("maps keys, rationales, and indicators by question number", () => {
    const exam = parseDecaExam([{ pageNumber: 1, text: "SAMPLE EXAM MARKETING CAREER CLUSTER Test 1322" }, { pageNumber: 2, text: questionPage }, { pageNumber: 3, text: keyPage }]);
    expect(exam.questions).toHaveLength(2);
    expect(exam.questions[0]).toMatchObject({ number: 1, correctAnswer: "D", sourcePage: 2, keySourcePage: 3, performanceIndicator: { code: "CO:031" } });
    expect(exam.questions[0].text).toContain("intended audience");
    expect(exam.questions[0].explanation).toContain("another line");
    expect(exam.questions[1].correctAnswer).toBe("B");
  });

  it("marks missing answer keys unresolved instead of guessing", () => {
    const exam = parseDecaExam([{ pageNumber: 1, text: questionPage }]);
    expect(exam.questions.every((question) => question.correctAnswer === null)).toBe(true);
    expect(exam.questions.every((question) => question.extractionStatus === "unresolved")).toBe(true);
  });
});
