import { describe, expect, it } from "vitest";
import { joinPdfTextItems } from "./extract-text";

describe("PDF text reconstruction", () => {
  it("does not invent spaces between PDF text fragments", () => {
    expect(joinPdfTextItems([
      { str: "SA", hasEOL: false },
      { str: "T", hasEOL: false },
      { str: " ", hasEOL: false },
      { str: "Read", hasEOL: false },
      { str: "ing", hasEOL: true },
      { str: "Question", hasEOL: true },
    ])).toBe("SAT Reading\nQuestion");
  });
});
