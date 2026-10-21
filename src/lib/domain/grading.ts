import type { AnswerLetter } from "./exam-schema";

export type GradingQuestion = { id: string; correctAnswer: AnswerLetter };
export type SubmittedResponse = { questionId: string; selectedAnswer: AnswerLetter | null };

export function gradeAttempt(questions: GradingQuestion[], responses: SubmittedResponse[]) {
  const responseMap = new Map(responses.map((response) => [response.questionId, response.selectedAnswer]));
  const items = questions.map((question) => {
    const selectedAnswer = responseMap.get(question.id) ?? null;
    return {
      questionId: question.id,
      selectedAnswer,
      correct: selectedAnswer === question.correctAnswer,
      unanswered: selectedAnswer === null,
    };
  });
  const correct = items.filter((item) => item.correct).length;
  const unanswered = items.filter((item) => item.unanswered).length;
  const total = questions.length;
  return {
    total,
    correct,
    incorrect: total - correct - unanswered,
    unanswered,
    percentage: total ? Math.round((correct / total) * 10000) / 100 : 0,
    items,
  };
}

export function serverTimerExpired(dueAt: string | null, now = new Date()) {
  return dueAt ? new Date(dueAt).getTime() <= now.getTime() : false;
}
