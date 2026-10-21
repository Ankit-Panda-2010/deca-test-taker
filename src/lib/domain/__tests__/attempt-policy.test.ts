import { describe, expect, it } from "vitest";
import { canChangeAnswer, canRevealAnswer } from "../attempt-policy";

describe("answer visibility policy", () => {
  it("reveals practice feedback only after checking and locks the response", () => {
    expect(canRevealAnswer("practice", false, false)).toBe(false);
    expect(canRevealAnswer("practice", false, true)).toBe(true);
    expect(canChangeAnswer("practice", false, true)).toBe(false);
  });

  it("keeps exam-mode answers hidden and editable until submission", () => {
    expect(canRevealAnswer("exam", false, true)).toBe(false);
    expect(canChangeAnswer("exam", false, true)).toBe(true);
    expect(canRevealAnswer("exam", true, false)).toBe(true);
    expect(canChangeAnswer("exam", true, false)).toBe(false);
  });
});
