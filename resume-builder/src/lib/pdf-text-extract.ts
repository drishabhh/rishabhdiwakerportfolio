import path from "node:path";
import { pathToFileURL } from "node:url";

let pdfWorkerConfigured = false;

async function getPdfParseClass() {
  const { PDFParse } = await import("pdf-parse");

  if (!pdfWorkerConfigured) {
    const workerPath = path.join(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    );
    PDFParse.setWorker(pathToFileURL(workerPath).href);
    pdfWorkerConfigured = true;
  }

  return PDFParse;
}

export async function extractPdfText(pdfBase64: string): Promise<string> {
  const PDFParse = await getPdfParseClass();
  const buffer = Buffer.from(pdfBase64, "base64");
  const parser = new PDFParse({ data: buffer });

  try {
    const data = await parser.getText();
    const text = String(data.text || "").trim();
    if (text.length < 80) {
      throw new Error("Could not extract text from PDF. Use a text-based PDF (not a scanned image).");
    }
    return text.slice(0, 28000);
  } finally {
    await parser.destroy();
  }
}
