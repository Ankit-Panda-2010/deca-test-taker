import { describe, expect, it } from "vitest";
import { parseDecaExam } from "../parser";

const questionPage = `Test 1322\nMARKETING EXAM\n1\n1. A wrapped question asks which answer is best\nfor the intended audience?\nA. First option\nB. Second option\nC. Third option\nD. Fourth option\n2. Another question?\nA. Alpha\nB. Beta\nC. Gamma\nD. Delta\nCopyright © 2026 by MBA Research and Curriculum Center®, Columbus, Ohio`;
const keyPage = `Test 1322\nMARKETING EXAM—KEY\n1\n1. D\nFourth option. This rationale wraps onto\nanother line.\nSOURCE: CO:031 Write persuasive messages\nSOURCE: LAP-CO-031\n2. B\nBeta. Supporting explanation.\nSOURCE: IM:001 Explain information management`;
const questionBankPage = `Question ID: 22a41819
Assessment Test Domain Skill Difficulty
SAT Reading and Writing Craft and Structure Words in Context Hard
Question
A completely different question from this PDF asks for the best answer.
Answer
A. First choice
B. Second choice
C. Third choice
D. Fourth choice
Correct Answer: C
Rationale
Choice C is the best answer for this question.`;

describe("DECA parser", () => {
  it("maps keys, rationales, and indicators by question number", () => {
    const exam = parseDecaExam([{ pageNumber: 1, text: "SAMPLE EXAM MARKETING CAREER CLUSTER Test 1322" }, { pageNumber: 2, text: questionPage }, { pageNumber: 3, text: keyPage }]);
    expect(exam.questions).toHaveLength(2);
    expect(exam.questions[0]).toMatchObject({ number: 1, correctAnswer: "D", sourcePage: 2, keySourcePage: 3, performanceIndicator: { code: "CO:031" } });
    expect(exam.questions[0].text).toContain("intended audience");
    expect(exam.questions[0].explanation).toContain("another line");
    expect(exam.questions[1].correctAnswer).toBe("B");
  });

  it("extracts answer choices arranged in two PDF text columns", () => {
    const exam = parseDecaExam([
      { pageNumber: 1, text: `Test 1226 MARKETING CLUSTER EXAM 1
1. Which option is correct?
A. First choice C. Third choice
B. Second choice D. Fourth choice` },
      { pageNumber: 2, text: `Test 1226 MARKETING CLUSTER EXAM—KEY 1
1. C
Third choice. Supporting explanation.
SOURCE: MK:001 Explain marketing concepts` },
    ]);

    expect(exam.questions[0]).toMatchObject({
      number: 1,
      options: [
        { id: "A", text: "First choice" },
        { id: "B", text: "Second choice" },
        { id: "C", text: "Third choice" },
        { id: "D", text: "Fourth choice" },
      ],
      correctAnswer: "C",
    });
  });

  it("marks missing answer keys unresolved instead of guessing", () => {
    const exam = parseDecaExam([{ pageNumber: 1, text: questionPage }]);
    expect(exam.questions.every((question) => question.correctAnswer === null)).toBe(true);
    expect(exam.questions.every((question) => question.extractionStatus === "unresolved")).toBe(true);
  });

  it("parses question-bank exports from their own page content", () => {
    const exam = parseDecaExam([{ pageNumber: 1, text: questionBankPage }]);
    expect(exam.title).toBe("SAT Reading and Writing Question Bank");
    expect(exam.questions).toHaveLength(1);
    expect(exam.questions[0]).toMatchObject({
      number: 1,
      text: "A completely different question from this PDF asks for the best answer.",
      correctAnswer: "C",
      sourcePage: 1,
      keySourcePage: 1,
      extractionStatus: "validated",
    });
    expect(exam.questions[0].options.map((option) => option.text)).toEqual([
      "First choice",
      "Second choice",
      "Third choice",
      "Fourth choice",
    ]);
    expect(exam.questions[0].explanation).toContain("Choice C");
  });

  it("keeps question-bank content when answers are omitted", () => {
    const withoutKey = questionBankPage.replace(/\nCorrect Answer: C[\s\S]*/, "");
    const exam = parseDecaExam([{ pageNumber: 4, text: withoutKey }]);
    expect(exam.questions[0]).toMatchObject({
      correctAnswer: null,
      extractionStatus: "unresolved",
      sourcePage: 4,
    });
    expect(exam.questions[0].warnings).toContain("No correct answer was included in the PDF");
  });

  it("joins continuation pages belonging to the same question", () => {
    const splitAt = questionBankPage.indexOf("Correct Answer");
    const exam = parseDecaExam([
      { pageNumber: 7, text: questionBankPage.slice(0, splitAt) },
      { pageNumber: 8, text: questionBankPage.slice(splitAt) },
    ]);
    expect(exam.questions).toHaveLength(1);
    expect(exam.questions[0].correctAnswer).toBe("C");
    expect(exam.questions[0].explanation).toContain("best answer");
  });

  it("supports older DECA punctuation and descriptive-key headings", () => {
    const oldQuestionPage = `Test 999 BUSINESS ADMINISTRATION CORE EXAM 1
1) Which choice matches the older exam layout?
A) First
B) Second
C) Third
D) Fourth`;
    const oldKeyPage = `DESCRIPTIVE TEST KEY
1) B.
Second. Older rationale text.
SOURCE: CO:001 Older performance indicator`;
    const exam = parseDecaExam([
      { pageNumber: 1, text: oldQuestionPage },
      { pageNumber: 2, text: oldKeyPage },
    ]);
    expect(exam.title).toBe("BUSINESS ADMINISTRATION Core Exam");
    expect(exam.questions[0]).toMatchObject({
      text: "Which choice matches the older exam layout?",
      correctAnswer: "B",
      keySourcePage: 2,
      performanceIndicator: { code: "CO:001" },
    });
    expect(exam.questions[0].options.map((option) => option.text)).toEqual(["First", "Second", "Third", "Fourth"]);
  });

  it.each([
    ["BUSINESS ADMINISTRATION CORE", "BUSINESS ADMINISTRATION", "BUSINESS ADMINISTRATION Core Exam"],
    ["BUSINESS MANAGEMENT AND ADMINISTRATION", "BUSINESS MANAGEMENT AND ADMINISTRATION", "BUSINESS MANAGEMENT AND ADMINISTRATION Career Cluster Exam"],
    ["ENTREPRENEURSHIP", "ENTREPRENEURSHIP", "ENTREPRENEURSHIP Exam"],
    ["FINANCE", "FINANCE", "FINANCE Career Cluster Exam"],
    ["HOSPITALITY & TOURISM", "HOSPITALITY AND TOURISM", "HOSPITALITY AND TOURISM Career Cluster Exam"],
    ["MARKETING", "MARKETING", "MARKETING Career Cluster Exam"],
    ["PERSONAL FINANCIAL LITERACY", "PERSONAL FINANCIAL LITERACY", "PERSONAL FINANCIAL LITERACY Exam"],
  ])("identifies the official %s exam header", (header, category, title) => {
    const exam = parseDecaExam([{ pageNumber: 1, text: `Test 2468 ${header} EXAM 1
1. Which option is correct?
A. First
B. Second
C. Third
D. Fourth` }]);
    expect(exam).toMatchObject({ category, title, testCode: "2468" });
  });

  it("does not treat a wrapped numeric sentence as a new question", () => {
    const exam = parseDecaExam([{
      pageNumber: 12,
      text: `Test 1323 HOSPITALITY & TOURISM EXAM 12
80. Which chart shows a part-to-whole relationship?
A. Scatter plot
B. Bar chart
C. Line graph
D. Pie chart
81. John ordered office supplies. The supplier sent the wrong amount even though John requested
100. What could John have done to prevent this miscommunication?
A. Completed a purchase order
B. Asked for less
C. Waited longer
D. Sent an invoice`,
    }, {
      pageNumber: 30,
      text: `HOSPITALITY & TOURISM EXAM—KEY
80. D. Pie chart.
81. A. Completed a purchase order.`,
    }]);

    expect(exam.questions.map(({ number }) => number)).toEqual([80, 81]);
    expect(exam.questions[1]).toMatchObject({
      text: "John ordered office supplies. The supplier sent the wrong amount even though John requested 100. What could John have done to prevent this miscommunication?",
      correctAnswer: "A",
    });
  });
});
