import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
};
const localDatabase = readFileSync(path.join(root, "src/lib/local/db.ts"), "utf8");
const extractionRoute = readFileSync(path.join(root, "src/app/api/local-extract/route.ts"), "utf8");

describe("local-first boundaries", () => {
  it("has no cloud database, authentication, or AI SDK dependency", () => {
    expect(Object.keys(packageJson.dependencies)).not.toContain("@supabase/ssr");
    expect(Object.keys(packageJson.dependencies)).not.toContain("@supabase/supabase-js");
    expect(Object.keys(packageJson.dependencies)).not.toContain("openai");
  });

  it("persists exams and attempts in an IndexedDB database", () => {
    expect(localDatabase).toContain('super("deca-prep-local")');
    expect(localDatabase).toContain("exams:");
    expect(localDatabase).toContain("attempts:");
  });

  it("extracts with deterministic local code and rejects scanned PDFs", () => {
    expect(extractionRoute).toContain("extractPdfText(bytes)");
    expect(extractionRoute).toContain("parseDecaExam(pages)");
    expect(extractionRoute).toContain("scanned PDF");
    expect(extractionRoute).not.toContain("fetch(");
  });
});
