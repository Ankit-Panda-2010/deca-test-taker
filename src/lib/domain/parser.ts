import {
  extractedExamSchema,
  type AnswerLetter,
  type ExtractedExam,
  type ExtractedQuestion,
} from "./exam-schema";

export type TextPage = { pageNumber: number; text: string };

type KeyEntry = {
  answer: AnswerLetter;
  explanation: string | null;
  performanceIndicator: { code: string; title: string } | null;
  sourcePage: number;
};

const HEADER_LINE = /^(?:Test\s+\d+.*MARKETING EXAM(?:\s*[—-]\s*KEY)?\s*\d*|MARKETING EXAM(?:\s*[—-]\s*KEY)?|Copyright ©.*|\d{1,2})$/i;

function cleanPage(text: string) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !HEADER_LINE.test(line.trim()))
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findBlocks(text: string, pattern: RegExp) {
  const matches = [...text.matchAll(pattern)];
  return matches.map((match, index) => ({
    match,
    body: text.slice(match.index! + match[0].length, matches[index + 1]?.index ?? text.length).trim(),
  }));
}

function parseQuestionPage(page: TextPage): Omit<ExtractedQuestion, "correctAnswer" | "explanation" | "performanceIndicator" | "keySourcePage">[] {
  const text = cleanPage(page.text);
  const blocks = findBlocks(text, /(?:^|\n)\s*(\d{1,3})\.\s+/g);

  return blocks.flatMap(({ match, body }) => {
    const number = Number(match[1]);
    const optionMatches = [...body.matchAll(/(?:^|\n)\s*([A-D])\.\s+/g)];
    if (!number || optionMatches.length === 0) return [];
    const stem = body.slice(0, optionMatches[0].index).replace(/\s*\n\s*/g, " ").trim();
    const options = optionMatches.map((option, index) => ({
      id: option[1] as AnswerLetter,
      text: body
        .slice(option.index! + option[0].length, optionMatches[index + 1]?.index ?? body.length)
        .replace(/\s*\n\s*/g, " ")
        .trim(),
    }));
    const warnings: string[] = [];
    if (options.length !== 4) warnings.push(`Expected 4 choices; found ${options.length}`);
    if (!stem) warnings.push("Question text is empty");
    if (options.some((option) => !option.text)) warnings.push("One or more answer choices are empty");

    return [{
      number,
      text: stem,
      options,
      sourcePage: page.pageNumber,
      extractionStatus: warnings.length ? "warning" as const : "validated" as const,
      warnings,
    }];
  });
}

function parseKeyPage(page: TextPage): Map<number, KeyEntry> {
  const text = cleanPage(page.text);
  const blocks = findBlocks(text, /(?:^|\n)\s*(\d{1,3})\.\s*([A-D])(?:\s+|\n+)/g);
  const entries = new Map<number, KeyEntry>();

  for (const { match, body } of blocks) {
    const number = Number(match[1]);
    const sourceIndex = body.search(/(?:^|\n)\s*SOURCE:\s*/m);
    const explanationRaw = sourceIndex >= 0 ? body.slice(0, sourceIndex) : body;
    const explanation = explanationRaw.replace(/\s*\n\s*/g, " ").trim() || null;
    const sourceText = sourceIndex >= 0 ? body.slice(sourceIndex) : "";
    const performanceMatch = sourceText.match(/SOURCE:\s*([A-Z]{2,4}:\d{3})\s+([^\n]+)/);
    entries.set(number, {
      answer: match[2] as AnswerLetter,
      explanation,
      performanceIndicator: performanceMatch
        ? { code: performanceMatch[1], title: performanceMatch[2].trim() }
        : null,
      sourcePage: page.pageNumber,
    });
  }
  return entries;
}

export function parseDecaExam(pages: TextPage[]): ExtractedExam {
  const fullText = pages.map((page) => page.text).join("\n");
  const keyStart = pages.findIndex((page) => /EXAM\s*[—-]\s*KEY|^\s*ANSWER KEY\s*$/im.test(page.text));
  const questionPages = keyStart >= 0 ? pages.slice(0, keyStart) : pages;
  const keyPages = keyStart >= 0 ? pages.slice(keyStart) : [];
  const rawQuestions = questionPages.flatMap(parseQuestionPage);
  const keys = new Map<number, KeyEntry>();
  for (const page of keyPages) {
    for (const [number, entry] of parseKeyPage(page)) keys.set(number, entry);
  }

  const seen = new Set<number>();
  const questions: ExtractedQuestion[] = rawQuestions.map((question) => {
    const key = keys.get(question.number);
    const warnings = [...question.warnings];
    if (seen.has(question.number)) warnings.push("Duplicate question number");
    seen.add(question.number);
    if (!key) warnings.push("No correct answer was found in the source key");
    return {
      ...question,
      correctAnswer: key?.answer ?? null,
      explanation: key?.explanation ?? null,
      performanceIndicator: key?.performanceIndicator ?? null,
      keySourcePage: key?.sourcePage ?? null,
      extractionStatus: !key ? "unresolved" : warnings.length ? "warning" : "validated",
      warnings,
    };
  });

  const warnings: string[] = [];
  const numbers = questions.map((question) => question.number).sort((a, b) => a - b);
  if (!questions.length) warnings.push("No complete multiple-choice questions were extracted");
  for (let i = 1; i <= (numbers.at(-1) ?? 0); i += 1) {
    if (!seen.has(i)) warnings.push(`Question ${i} is missing`);
  }
  for (const number of keys.keys()) {
    if (!seen.has(number)) warnings.push(`Answer key ${number} has no matching question`);
  }

  const titleMatch = fullText.match(/(?:SAMPLE\s+EXAM\s+)?([A-Z &-]+CAREER CLUSTER)/i);
  const testCodeMatch = fullText.match(/Test\s+(\d+)/i);
  const category = titleMatch?.[1]?.replace(/\s+CAREER CLUSTER/i, "").trim() ?? null;

  return extractedExamSchema.parse({
    title: category ? `${category} Career Cluster Exam` : "DECA Practice Exam",
    category,
    testCode: testCodeMatch?.[1] ?? null,
    pageCount: pages.length,
    questions,
    warnings,
  });
}
