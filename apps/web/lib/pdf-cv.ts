export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("This file is not a valid PDF.");
  }

  const { extractText } = await import("unpdf");
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
  const text = String(result.text).replace(/\0/g, "").trim();
  if (text.length < 50) {
    throw new Error(
      "This PDF contains little or no selectable text. Upload a text-based PDF or DOCX; scanned PDFs require OCR.",
    );
  }
  return text;
}
