import { z } from "zod";

export const answerLetterSchema = z.enum(["A", "B", "C", "D"]);
export type AnswerLetter = z.infer<typeof answerLetterSchema>;

export const answerChoiceSchema = z.object({
  id: answerLetterSchema,
  text: z.string().min(1),
});

export const extractedQuestionSchema = z.object({
  number: z.number().int().positive(),
  text: z.string().min(1),
  options: z.array(answerChoiceSchema).length(4),
  correctAnswer: answerLetterSchema.nullable(),
  explanation: z.string().nullable(),
  performanceIndicator: z
    .object({ code: z.string().min(2), title: z.string().min(2) })
    .nullable(),
  sourcePage: z.number().int().positive(),
  keySourcePage: z.number().int().positive().nullable(),
  extractionStatus: z.enum(["validated", "warning", "unresolved"]),
  warnings: z.array(z.string()),
});

export const extractedExamSchema = z.object({
  title: z.string().min(1),
  category: z.string().nullable(),
  testCode: z.string().nullable(),
  pageCount: z.number().int().positive(),
  questions: z.array(extractedQuestionSchema).min(1),
  warnings: z.array(z.string()),
});

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;
export type ExtractedExam = z.infer<typeof extractedExamSchema>;

export const classificationSchema = z.object({
  classification: z.enum([
    "verified_official_source",
    "deca_format_recognized",
    "needs_review",
    "not_recognized",
  ]),
  confidence: z.number().min(0).max(1),
  supportingIndicators: z.array(z.string()),
  conflictingIndicators: z.array(z.string()),
  reliablyParseable: z.boolean(),
  answerKeyFound: z.boolean(),
});

export type DocumentClassification = z.infer<typeof classificationSchema>;

export const attemptConfigSchema = z.object({
  mode: z.enum(["practice", "exam"]),
  order: z.enum(["original", "randomized"]),
  questionCount: z.number().int().positive().max(200),
  timerMinutes: z.number().int().positive().max(360).nullable(),
  showNavigator: z.boolean(),
  showRunningScore: z.boolean(),
  autoAdvance: z.boolean(),
});

export type AttemptConfig = z.infer<typeof attemptConfigSchema>;
