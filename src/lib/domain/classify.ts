import type { DocumentClassification } from "./exam-schema";

export type StructuralEvidence = {
  score: number;
  indicators: string[];
  conflicts: string[];
  answerKeyFound: boolean;
  questionCount: number;
};

export function collectStructuralEvidence(text: string): StructuralEvidence {
  const normalized = text.replace(/\s+/g, " ");
  const indicators: string[] = [];
  const conflicts: string[] = [];
  let score = 0;

  const checks: Array<[RegExp, number, string]> = [
    [/\bDECA\b/i, 2, "DECA is named in the document"],
    [/MARKETING|FINANCE|HOSPITALITY|ENTREPRENEURSHIP|BUSINESS MANAGEMENT/i, 1, "A DECA career cluster is present"],
    [/\bPERFORMANCE INDICATOR/i, 1, "Performance indicators are referenced"],
    [/\b(?:SAMPLE\s+)?EXAM\b/i, 1, "Exam labeling is present"],
    [/\b[A-D]\.\s+\S+/i, 1, "A-D answer choices were detected"],
    [/EXAM[—-]KEY|DESCRIPTIVE TEST KEY|ANSWER KEY/i, 2, "A descriptive or answer key was detected"],
    [/MBA Research/i, 2, "MBA Research is identified"],
  ];

  for (const [pattern, weight, label] of checks) {
    if (pattern.test(normalized)) {
      score += weight;
      indicators.push(label);
    }
  }

  const questionMatches = text.match(/(?:^|\n)\s*\d{1,3}\.\s+/gm) ?? [];
  const questionCount = questionMatches.length;
  if (questionCount >= 10) {
    score += 2;
    indicators.push(`${questionCount} numbered entries were detected`);
  } else {
    conflicts.push("Too few numbered exam entries were detected");
  }

  const answerKeyFound = /EXAM[—-]KEY|DESCRIPTIVE TEST KEY|ANSWER KEY/i.test(normalized);
  if (!answerKeyFound) conflicts.push("No answer key heading was found");

  return { score, indicators, conflicts, answerKeyFound, questionCount };
}

export function classifyDeterministically(text: string): DocumentClassification {
  const evidence = collectStructuralEvidence(text);
  const confidence = Math.min(0.97, Math.max(0.08, evidence.score / 11));
  const classification =
    evidence.score >= 8
      ? "deca_format_recognized"
      : evidence.score >= 4
        ? "needs_review"
        : "not_recognized";

  return {
    classification,
    confidence,
    supportingIndicators: evidence.indicators,
    conflictingIndicators: evidence.conflicts,
    reliablyParseable: evidence.questionCount >= 10,
    answerKeyFound: evidence.answerKeyFound,
  };
}

export function combineClassifications(
  structural: DocumentClassification,
  ai: DocumentClassification | null,
): DocumentClassification {
  if (!ai) return structural;
  if (structural.classification === "not_recognized" && ai.classification === "deca_format_recognized") {
    return {
      ...structural,
      classification: "needs_review",
      supportingIndicators: [...structural.supportingIndicators, ...ai.supportingIndicators],
      conflictingIndicators: [
        ...structural.conflictingIndicators,
        "AI and structural classification disagree",
      ],
    };
  }
  return {
    classification:
      structural.classification === "deca_format_recognized" &&
      ai.classification === "deca_format_recognized"
        ? "deca_format_recognized"
        : ai.classification === "not_recognized"
          ? "needs_review"
          : structural.classification,
    confidence: (structural.confidence + ai.confidence) / 2,
    supportingIndicators: [...new Set([...structural.supportingIndicators, ...ai.supportingIndicators])],
    conflictingIndicators: [...new Set([...structural.conflictingIndicators, ...ai.conflictingIndicators])],
    reliablyParseable: structural.reliablyParseable && ai.reliablyParseable,
    answerKeyFound: structural.answerKeyFound || ai.answerKeyFound,
  };
}
