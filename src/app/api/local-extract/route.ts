import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { classifyDeterministically } from "@/lib/domain/classify";
import { parseDecaExam } from "@/lib/domain/parser";
import { extractPdfText } from "@/lib/pdf/extract-text";

export const runtime = "nodejs";
export const maxDuration = 300;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF file." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "PDFs must be smaller than 4 MB." }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return NextResponse.json({ error: "This file does not have a valid PDF signature." }, { status: 415 });
    const pages = await extractPdfText(bytes);
    if (pages.length > 200) return NextResponse.json({ error: "PDFs are limited to 200 pages." }, { status: 413 });
    const text = pages.map((page) => page.text).join("\n\n");
    if (text.replace(/\s/g, "").length < 500) return NextResponse.json({ error: "This looks like a scanned PDF. Use a text-based copy for the fully local version." }, { status: 422 });
    const verification = classifyDeterministically(text);
    if (verification.classification === "not_recognized") return NextResponse.json({ error: "This PDF was not recognized as a DECA-style exam.", verification }, { status: 422 });
    const exam = parseDecaExam(pages);
    return NextResponse.json({ exam, verification, sha256: createHash("sha256").update(bytes).digest("hex") });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The PDF could not be processed." }, { status: 500 });
  }
}
