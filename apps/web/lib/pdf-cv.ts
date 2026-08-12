export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("This file is not a valid PDF.");
  }

  const canvas = await import("@napi-rs/canvas");
  Object.assign(globalThis, {
    DOMMatrix: globalThis.DOMMatrix ?? canvas.DOMMatrix,
    ImageData: globalThis.ImageData ?? canvas.ImageData,
    Path2D: globalThis.Path2D ?? canvas.Path2D,
  });
  const [{ PDFParse }, { getData }] = await Promise.all([
    import("pdf-parse"),
    import("pdf-parse/worker"),
  ]);
  PDFParse.setWorker(getData());
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = result.text.replace(/\0/g, "").trim();
    if (text.length < 50) {
      throw new Error(
        "This PDF contains little or no selectable text. Upload a text-based PDF or DOCX; scanned PDFs require OCR.",
      );
    }
    return text;
  } finally {
    await parser.destroy();
  }
}
