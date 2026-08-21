import "server-only";

import { extractText } from "unpdf";

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXT = new Set([".pdf", ".txt", ".md", ".markdown"]);

export type ExtractedUpload = {
  text: string;
  titleHint: string;
  mimeType: string;
  originalFilename: string;
};

function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "");
  const withoutExt = base.replace(/\.[^.]+$/, "");
  return withoutExt.replace(/[_-]+/g, " ").trim() || base;
}

export function assertAllowedUpload(file: File): {
  ext: string;
  mimeType: string;
} {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Choose a file to upload.");
  }
  if (file.size <= 0) {
    throw new Error("File is empty.");
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new Error("File exceeds the 10MB limit.");
  }

  const originalFilename = file.name || "upload";
  const ext = extensionOf(originalFilename);
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Allowed types: PDF, TXT, and Markdown (.md).");
  }

  const mimeType = (file.type || "application/octet-stream").toLowerCase();
  return {
    ext,
    mimeType:
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".md" || ext === ".markdown"
          ? "text/markdown"
          : mimeType.includes("text")
            ? mimeType
            : "text/plain",
  };
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const result = await extractText(bytes, { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract plain text from an uploaded PDF, TXT, or Markdown file.
 */
export async function extractUploadText(file: File): Promise<ExtractedUpload> {
  const { ext, mimeType } = assertAllowedUpload(file);
  const originalFilename = file.name || `upload${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  let text = "";
  if (ext === ".pdf" || mimeType === "application/pdf") {
    text = await extractPdfText(buffer);
  } else {
    text = new TextDecoder("utf-8", { fatal: false })
      .decode(buffer)
      .replace(/\r\n/g, "\n")
      .trim();
  }

  if (text.length < 40) {
    throw new Error(
      "Could not extract enough text from this file. Try a text-based PDF, TXT, or Markdown export.",
    );
  }

  return {
    text,
    titleHint: titleFromFilename(originalFilename),
    mimeType: ext === ".pdf" ? "application/pdf" : mimeType || "text/plain",
    originalFilename,
  };
}
