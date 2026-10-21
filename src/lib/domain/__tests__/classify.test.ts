import { describe, expect, it } from "vitest";
import { classifyDeterministically } from "../classify";

describe("DECA document classification", () => {
  it("recognizes strong exam structure without claiming official provenance", () => {
    const questions = Array.from({ length: 12 }, (_, index) => `${index + 1}. Question?\nA. One\nB. Two\nC. Three\nD. Four`).join("\n");
    const result = classifyDeterministically(`DECA SAMPLE EXAM MARKETING CAREER CLUSTER MBA Research PERFORMANCE INDICATOR\n${questions}\nMARKETING EXAM—KEY`);
    expect(result.classification).toBe("deca_format_recognized");
    expect(result.classification).not.toBe("verified_official_source");
    expect(result.answerKeyFound).toBe(true);
  });

  it("rejects an unrelated document", () => {
    const result = classifyDeterministically("Quarterly gardening newsletter. Tomatoes prefer full sun and regular watering.");
    expect(result.classification).toBe("not_recognized");
    expect(result.answerKeyFound).toBe(false);
  });
});
