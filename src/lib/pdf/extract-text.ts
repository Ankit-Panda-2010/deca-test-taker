import path from "node:path";
import { pathToFileURL } from "node:url";
import type { TextPage } from "@/lib/domain/parser";

export async function extractPdfText(data: Uint8Array): Promise<TextPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ).href;
  const document = await pdfjs.getDocument({ data }).promise;
  const pages: TextPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      text += item.str;
      text += item.hasEOL ? "\n" : " ";
    }
    pages.push({ pageNumber, text: text.replace(/[ \t]+\n/g, "\n") });
  }

  return pages;
}
