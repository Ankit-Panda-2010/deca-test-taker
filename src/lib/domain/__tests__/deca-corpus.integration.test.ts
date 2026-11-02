import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/local-extract/route";
import { assertMatchingPdfHash, questionsMatchPdf, sha256Blob } from "@/lib/import/pdf-identity";
import type { ExtractedExam, ExtractedQuestion } from "../exam-schema";

type CorpusSource = {
  name: string;
  source: string;
  expectedTestCode?: string;
  expectedCategory?: string;
  allowMissingAnswerKey?: boolean;
};

type ExtractResponse = {
  exam: ExtractedExam;
  sha256: string;
  error?: string;
};

const officialSources: CorpusSource[] = [
  {
    name: "Business Administration Core",
    source: "https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/69a1ed502b052b24e81259ae_BA%20Core-District%20Exam.pdf",
    expectedTestCode: "1321",
    expectedCategory: "BUSINESS ADMINISTRATION",
  },
  {
    name: "Business Management and Administration",
    source: "https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/69a1edebf57b826a8b7b652a_BMA-District%20Exam.pdf",
    expectedTestCode: "1325",
    expectedCategory: "BUSINESS MANAGEMENT AND ADMINISTRATION",
  },
  {
    name: "Entrepreneurship",
    source: "https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/69a1ee11b265a7940d828561_Entre-District%20Exam.pdf",
    expectedTestCode: "1327",
    expectedCategory: "ENTREPRENEURSHIP",
  },
  {
    name: "Finance",
    source: "https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/69a1ee4294aedcb145dba6c1_Finance-District%20Exam.pdf",
    expectedTestCode: "1324",
    expectedCategory: "FINANCE",
  },
  {
    name: "Hospitality and Tourism",
    source: "https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/69a1ee5b3ca1c1f9ba6535bf_Hospitality-District%20Exam.pdf",
    expectedTestCode: "1323",
    expectedCategory: "HOSPITALITY AND TOURISM",
  },
  {
    name: "Marketing",
    source: "https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/69a1eeab6e1e15a9025b6321_Marketing-District%20Exam.pdf",
    expectedTestCode: "1322",
    expectedCategory: "MARKETING",
  },
  {
    name: "Personal Financial Literacy",
    source: "https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/69a1ee31bd1b037f801c8b16_PFL-District%20Exam.pdf",
    expectedTestCode: "1326",
    expectedCategory: "PERSONAL FINANCIAL LITERACY",
  },
];

function extraSources(): CorpusSource[] {
  const keylessBasenames = new Set((process.env.DECA_CORPUS_KEYLESS_BASENAMES ?? "").split(",").filter(Boolean));
  return (process.env.DECA_EXTRA_PDF_PATHS ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((source) => ({
      name: path.basename(source),
      source,
      allowMissingAnswerKey: keylessBasenames.has(path.basename(source)),
    }));
}

async function sourceBytes(source: CorpusSource) {
  if (/^https:\/\//.test(source.source)) {
    const response = await fetch(source.source);
    if (!response.ok) throw new Error(`${source.name} download failed with HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  return new Uint8Array(await readFile(source.source));
}

function questionFingerprint(exam: ExtractedExam) {
  return createHash("sha256").update(JSON.stringify(exam.questions.map((question) => ({
    number: question.number,
    text: question.text,
    options: question.options,
    correctAnswer: question.correctAnswer,
  })))).digest("hex");
}

describe.skipIf(process.env.RUN_DECA_CORPUS !== "1")("DECA PDF corpus", () => {
  it("keeps every document and question set distinct through the real upload route", async () => {
    const sources = [
      ...(process.env.DECA_CORPUS_ONLY_EXTRA === "1" ? [] : officialSources),
      ...extraSources(),
    ];
    const expectedSize = Number(process.env.DECA_CORPUS_EXPECTED_SIZE ?? sources.length);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources).toHaveLength(expectedSize);

    const summaries = [];
    const parsedQuestionSets: ExtractedQuestion[][] = [];
    for (const source of sources) {
      const bytes = await sourceBytes(source);
      const localSha256 = createHash("sha256").update(bytes).digest("hex");
      const browserSha256 = await sha256Blob(new Blob([bytes]));
      expect(browserSha256, `${source.name}: browser hash`).toBe(localSha256);
      const form = new FormData();
      form.set("file", new File([bytes], `${source.name}.pdf`, { type: "application/pdf" }));
      const request = new Request(`http://localhost/api/local-extract?sha256=${localSha256}`, { method: "POST", body: form });
      const response = await POST(request);
      const payload = await response.json() as ExtractResponse;

      expect(response.status, `${source.name}: ${payload.error ?? "unexpected response"}`).toBe(200);
      expect(payload.sha256, source.name).toBe(localSha256);
      expect(() => assertMatchingPdfHash(browserSha256, payload.sha256), source.name).not.toThrow();
      expect(payload.sha256, source.name).not.toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
      expect(payload.exam.questions, source.name).toHaveLength(100);
      expect(payload.exam.questions.map(({ number }) => number), source.name).toEqual(
        Array.from({ length: 100 }, (_, index) => index + 1),
      );
      expect(payload.exam.questions.every(({ options }) => (
        options.length === 4 && options.map(({ id }) => id).join("") === "ABCD"
      )), `${source.name}: choices`).toBe(true);
      if (source.allowMissingAnswerKey) {
        expect(payload.exam.questions.every(({ correctAnswer, keySourcePage }) => (
          correctAnswer === null && keySourcePage === null
        )), `${source.name}: intentionally separate answer key`).toBe(true);
      } else {
        expect(payload.exam.questions.every(({ correctAnswer, keySourcePage }) => (
          correctAnswer !== null && keySourcePage !== null
        )), `${source.name}: answer keys`).toBe(true);
      }
      expect(payload.exam.questions.every(({ sourcePage, keySourcePage }) => (
        sourcePage >= 1 && sourcePage <= payload.exam.pageCount
        && (keySourcePage === null || (keySourcePage >= 1 && keySourcePage <= payload.exam.pageCount))
      )), `${source.name}: source pages`).toBe(true);
      expect(payload.exam.warnings, source.name).toEqual([]);
      if (source.expectedTestCode) expect(payload.exam.testCode, source.name).toBe(source.expectedTestCode);
      if (source.expectedCategory) expect(payload.exam.category, source.name).toBe(source.expectedCategory);
      if (process.env.DECA_CORPUS_EXPECTED_CATEGORY) {
        expect(payload.exam.category, source.name).toBe(process.env.DECA_CORPUS_EXPECTED_CATEGORY);
      }

      parsedQuestionSets.push(payload.exam.questions);
      summaries.push({
        name: source.name,
        sha256: payload.sha256,
        questionFingerprint: questionFingerprint(payload.exam),
        testCode: payload.exam.testCode,
        category: payload.exam.category,
        firstQuestion: payload.exam.questions[0].text,
      });
    }

    expect(new Set(summaries.map(({ sha256 }) => sha256)).size).toBe(summaries.length);
    expect(new Set(summaries.map(({ questionFingerprint }) => questionFingerprint)).size).toBe(summaries.length);
    for (let first = 0; first < parsedQuestionSets.length; first += 1) {
      for (let second = first + 1; second < parsedQuestionSets.length; second += 1) {
        expect(
          questionsMatchPdf(parsedQuestionSets[first], parsedQuestionSets[second]),
          `${summaries[first].name} must not deduplicate to ${summaries[second].name}`,
        ).toBe(false);
      }
    }
    console.table(summaries);
  }, 120_000);
});
