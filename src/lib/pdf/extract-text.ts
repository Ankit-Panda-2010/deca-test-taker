import path from "node:path";
import { pathToFileURL } from "node:url";
import type { TextPage } from "@/lib/domain/parser";

type PdfTextItem = { str: string; hasEOL: boolean };

export function joinPdfTextItems(items: PdfTextItem[]) {
  let text = "";

  for (const item of items) {
    text += item.str;
    if (item.hasEOL && !text.endsWith("\n")) text += "\n";
  }

  return text.replace(/[ \t]+\n/g, "\n").trimEnd();
}

export async function extractPdfText(data: Uint8Array): Promise<TextPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ).href;
  const standardFontDataUrl = pathToFileURL(
    `${path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts")}${path.sep}`,
  ).href;
  const document = await pdfjs.getDocument({ data, standardFontDataUrl }).promise;
  const pages: TextPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item): item is typeof item & PdfTextItem => "str" in item);
    pages.push({ pageNumber, text: joinPdfTextItems(items) });
  }

  return pages;
}
