import { describe, expect, it } from "vitest";
import { gradeAttempt, serverTimerExpired } from "../grading";

describe("deterministic grading", () => {
  it("separates correct, incorrect, and unanswered responses", () => {
    const result = gradeAttempt([{ id: "1", correctAnswer: "A" }, { id: "2", correctAnswer: "B" }, { id: "3", correctAnswer: "C" }], [{ questionId: "1", selectedAnswer: "A" }, { questionId: "2", selectedAnswer: "D" }]);
    expect(result).toMatchObject({ total: 3, correct: 1, incorrect: 1, unanswered: 1, percentage: 33.33 });
  });

  it("validates timer deadlines on the server clock", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    expect(serverTimerExpired("2026-10-20T11:59:59Z", now)).toBe(true);
    expect(serverTimerExpired("2026-10-20T12:00:01Z", now)).toBe(false);
  });
});
