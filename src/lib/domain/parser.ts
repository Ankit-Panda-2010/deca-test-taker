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

const HEADER_LINE = /^(?:Test\s+\d+.*\bEXAM(?:\s*[—–-]\s*KEY)?\s*\d*|(?:\d{4}\s+HS\s+ICDC\s+)?[A-Z &-]+(?:CLUSTER|CORE)\s+EXAM(?:\s*[—–-]\s*KEY)?\s*\d*|Copyright ©.*|\d{1,3})$/i;
const QUESTION_START = /(?:^|\n)\s*(\d{1,3})[.)]\s+/g;
const OPTION_START = /(?:^|\n)\s*([A-D])[.)]\s+/g;
const KEY_START = /(?:^|\n)\s*(\d{1,3})[.)]\s*([A-D])\.?\s+/g;
const KEY_HEADING = /EXAM\s*[—–-]\s*KEY|^\s*(?:ANSWER|DESCRIPTIVE(?:\s+TEST)?)\s+KEY\s*$/im;

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

function findSequentialQuestionBlocks(text: string) {
  const candidates = [...text.matchAll(QUESTION_START)]
    .filter((match) => Number(match[1]) >= 1 && Number(match[1]) <= 100);
  if (candidates.length <= 1) {
    return candidates.map((match, index) => ({
      match,
      body: text.slice(match.index! + match[0].length, candidates[index + 1]?.index ?? text.length).trim(),
    }));
  }

  // Numeric values can begin a wrapped sentence inside a question (for
  // example, "100. What could John..."). Select the longest consecutive
  // question-number run on the page before using matches as block boundaries.
  let selected: RegExpMatchArray[] = [];
  for (let start = 0; start < candidates.length; start += 1) {
    const run = [candidates[start]];
    let expected = Number(candidates[start][1]) + 1;
    for (let index = start + 1; index < candidates.length; index += 1) {
      if (Number(candidates[index][1]) === expected) {
        run.push(candidates[index]);
        expected += 1;
      }
    }
    if (run.length > selected.length) selected = run;
  }

  return selected.map((match, index) => ({
    match,
    body: text.slice(match.index! + match[0].length, selected[index + 1]?.index ?? text.length).trim(),
  }));
}

function parseQuestionPage(page: TextPage): Omit<ExtractedQuestion, "correctAnswer" | "explanation" | "performanceIndicator" | "keySourcePage">[] {
  const text = cleanPage(page.text);
  const blocks = findSequentialQuestionBlocks(text);

  return blocks.flatMap(({ match, body }) => {
    const number = Number(match[1]);
    const optionMatches = [...body.matchAll(OPTION_START)];
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

const EXAM_LABELS = [
  { pattern: /^BUSINESS ADMINISTRATION(?: CORE)?$/, category: "BUSINESS ADMINISTRATION", title: "BUSINESS ADMINISTRATION Core Exam" },
  { pattern: /^BUSINESS MANAGEMENT AND ADMINISTRATION$/, category: "BUSINESS MANAGEMENT AND ADMINISTRATION", title: "BUSINESS MANAGEMENT AND ADMINISTRATION Career Cluster Exam" },
  { pattern: /^ENTREPRENEURSHIP$/, category: "ENTREPRENEURSHIP", title: "ENTREPRENEURSHIP Exam" },
  { pattern: /^FINANCE$/, category: "FINANCE", title: "FINANCE Career Cluster Exam" },
  { pattern: /^HOSPITALITY AND TOURISM$/, category: "HOSPITALITY AND TOURISM", title: "HOSPITALITY AND TOURISM Career Cluster Exam" },
  { pattern: /^MARKETING$/, category: "MARKETING", title: "MARKETING Career Cluster Exam" },
  { pattern: /^PERSONAL FINANCIAL LITERACY$/, category: "PERSONAL FINANCIAL LITERACY", title: "PERSONAL FINANCIAL LITERACY Exam" },
] as const;

function normalizeExamLabel(label: string) {
  return label
    .toUpperCase()
    .replace(/[&+]/g, " AND ")
    .replace(/\b(?:CAREER\s+)?CLUSTER\b/g, " ")
    .replace(/^THE\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function identifyExam(fullText: string) {
  const header = fullText.match(/(?:^|\n)Test\s+(\d+)\s+([^\n]+?)\s+EXAM\b/im);
  const normalized = header ? normalizeExamLabel(header[2]) : null;
  const known = normalized ? EXAM_LABELS.find(({ pattern }) => pattern.test(normalized)) : null;
  return {
    testCode: header?.[1] ?? fullText.match(/Test\s+(\d+)/i)?.[1] ?? null,
    category: known?.category ?? null,
    title: known?.title ?? null,
  };
}

function parseKeyPage(page: TextPage): Map<number, KeyEntry> {
  const text = cleanPage(page.text);
  const blocks = findBlocks(text, KEY_START);
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

function parseQuestionBankPage(page: TextPage): Omit<ExtractedQuestion, "number"> | null {
  const text = cleanPage(page.text);
  const questionHeading = text.match(/(?:^|\n)\s*Question\s*(?:\n|$)/i);
  const answerHeading = text.match(/(?:^|\n)\s*Answer\s*(?:\n|$)/i);
  const correctAnswerMatch = text.match(/(?:^|\n)\s*Correct\s+Answer\s*:\s*([A-D])\s*(?:\n|$)/i);
  const rationaleMatch = text.match(/(?:^|\n)\s*Rationale\s*(?:\n|$)/i);
  if (questionHeading?.index === undefined || answerHeading?.index === undefined) return null;
  if (answerHeading.index <= questionHeading.index) return null;

  const questionStart = questionHeading.index + questionHeading[0].length;
  const questionText = text
    .slice(questionStart, answerHeading.index)
    .replace(/\s*\n\s*/g, " ")
    .trim();
  const answerEnd = correctAnswerMatch?.index ?? rationaleMatch?.index ?? text.length;
  const answerText = text.slice(answerHeading.index + answerHeading[0].length, answerEnd);
  const optionMatches = [...answerText.matchAll(/(?:^|\n)\s*([A-D])\s*\.\s+/g)];
  if (!questionText || optionMatches.length !== 4) return null;

  const options = optionMatches.map((option, index) => ({
    id: option[1] as AnswerLetter,
    text: answerText
      .slice(option.index! + option[0].length, optionMatches[index + 1]?.index ?? answerText.length)
      .replace(/\s*\n\s*/g, " ")
      .trim(),
  }));
  if (options.some((option) => !option.text)) return null;

  const explanation = rationaleMatch?.index !== undefined
    ? text.slice(rationaleMatch.index + rationaleMatch[0].length).replace(/\s*\n\s*/g, " ").trim() || null
    : null;

  return {
    text: questionText,
    options,
    correctAnswer: correctAnswerMatch ? correctAnswerMatch[1].toUpperCase() as AnswerLetter : null,
    explanation,
    performanceIndicator: null,
    sourcePage: page.pageNumber,
    keySourcePage: correctAnswerMatch ? page.pageNumber : null,
    extractionStatus: correctAnswerMatch ? "validated" : "unresolved",
    warnings: correctAnswerMatch ? [] : ["No correct answer was included in the PDF"],
  };
}

function parseQuestionBank(pages: TextPage[]) {
  const groupedPages: TextPage[] = [];
  for (const page of pages) {
    if (/(?:^|\n)\s*Question\s*(?:\n|$)/i.test(page.text)) {
      groupedPages.push({ ...page });
    } else if (groupedPages.length > 0) {
      groupedPages[groupedPages.length - 1].text += `\n${page.text}`;
    }
  }

  return groupedPages
    .map(parseQuestionBankPage)
    .filter((question): question is NonNullable<typeof question> => question !== null)
    .map((question, index) => ({ ...question, number: index + 1 }));
}

export function parseDecaExam(pages: TextPage[]): ExtractedExam {
  const fullText = pages.map((page) => page.text).join("\n");
  const questionBankQuestions = parseQuestionBank(pages);
  if (questionBankQuestions.length > 0) {
    const assessmentMatch = fullText.match(/(?:^|\n)\s*(SAT|PSAT|ACT)\s+(Reading\s+and\s+Writing|Math(?:ematics)?)\b/i);
    const title = assessmentMatch
      ? `${assessmentMatch[1].toUpperCase()} ${assessmentMatch[2].replace(/\s+/g, " ")} Question Bank`
      : "Practice Question Bank";
    const questionCount = pages.filter((page) => /(?:^|\n)\s*Question\s*(?:\n|$)/i.test(page.text)).length;
    const incompletePages = questionCount - questionBankQuestions.length;

    return extractedExamSchema.parse({
      title,
      category: assessmentMatch?.[2]?.replace(/\s+/g, " ") ?? null,
      testCode: null,
      pageCount: pages.length,
      questions: questionBankQuestions,
      warnings: incompletePages > 0 ? [`${incompletePages} question page${incompletePages === 1 ? "" : "s"} could not be extracted completely`] : [],
    });
  }

  const keyStart = pages.findIndex((page) => KEY_HEADING.test(page.text));
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

  const identified = identifyExam(fullText);
  const careerClusterMatch = fullText.match(/(?:SAMPLE\s+EXAM\s+)?([A-Z &+-]+CAREER CLUSTER)/i);
  const clusterExamMatch = fullText.match(/(?:^|\n)(?:Test\s+\d+\s+|\d{4}\s+HS\s+ICDC\s+)?([A-Z][A-Z &-]+?)\s+(?:CLUSTER|CORE)\s+EXAM\b/im);
  const fallbackCategory = careerClusterMatch?.[1]?.replace(/\s+CAREER CLUSTER/i, "").trim()
    ?? clusterExamMatch?.[1]?.trim()
    ?? null;
  const category = identified.category ?? fallbackCategory;

  return extractedExamSchema.parse({
    title: identified.title ?? (category ? `${category} Career Cluster Exam` : "DECA Practice Exam"),
    category,
    testCode: identified.testCode,
    pageCount: pages.length,
    questions,
    warnings,
  });
}
