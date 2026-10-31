import { beforeEach, describe, expect, it, vi } from "vitest";

let receivedData: Uint8Array | undefined;

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: ({ data }: { data: Uint8Array }) => {
    receivedData = data;
    structuredClone(data.buffer, { transfer: [data.buffer] });
    return {
      destroy: async () => undefined,
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: [{ str: "Question", hasEOL: true }] }),
        }),
      }),
    };
  },
}));

describe("PDF byte ownership", () => {
  beforeEach(() => { receivedData = undefined; });

  it("does not let PDF.js detach the caller's source bytes", async () => {
    const { extractPdfText } = await import("./extract-text");
    const source = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
    const expected = source.slice();

    const pages = await extractPdfText(source);

    expect(pages).toEqual([{ pageNumber: 1, text: "Question" }]);
    expect(source).toEqual(expected);
    expect(source.byteLength).toBe(expected.byteLength);
    expect(receivedData?.byteLength).toBe(0);
  });
});
