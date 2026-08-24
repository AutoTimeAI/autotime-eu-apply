/** Converts a user-provided LinkedIn data-export ZIP into structured CV enrichment. */
import type { CVEnrichment } from "../types";

// The overall zip is capped at 25MB compressed, but that only bounds the
// compressed size - deflate's compression ratio can exceed 1000:1 on
// crafted repetitive input, so a single attacker-controlled CSV entry
// inside the zip could otherwise decompress to several GB and OOM the
// function (the same zip-bomb shape already fixed for docx-cv.ts). JSZip
// exposes each entry's declared uncompressed size (read from the zip's
// central directory, before any inflate happens) via a documented-but-
// unofficial internal field - checking it here rejects a bomb before
// `.async()` ever decompresses it. Any real LinkedIn export CSV is a small
// fraction of this; 20MB is far beyond any legitimate positions/education/
// skills export.
const maxDecompressedEntryBytes = 20 * 1024 * 1024;

type JSZipCompressedData = { uncompressedSize?: number };

function assertSafeEntrySize(entry: { name: string; _data?: JSZipCompressedData }) {
  const uncompressedSize = entry._data?.uncompressedSize;
  if (typeof uncompressedSize === "number" && uncompressedSize > maxDecompressedEntryBytes) {
    throw new Error(`${entry.name} is too large to process.`);
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = "";
    } else value += char;
  }
  row.push(value); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function records(text: string): Record<string, string>[] {
  const [headers = [], ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header.trim().toLowerCase(), (row[index] || "").trim()])));
}

function value(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) if (row[key]) return row[key];
  return "";
}

/** Parses bounded LinkedIn CSV exports without contacting LinkedIn directly. */
export async function enrichCvFromLinkedInZip(file: File): Promise<CVEnrichment> {
  if (file.size > 25 * 1024 * 1024) throw new Error("LinkedIn export must be 25 MB or smaller.");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const find = (pattern: RegExp) => Object.values(zip.files).find((entry) => !entry.dir && pattern.test(entry.name));
  const positionsFile = find(/(^|\/)positions\.csv$/i);
  const educationFile = find(/(^|\/)education\.csv$/i);
  const skillsFile = find(/(^|\/)skills\.csv$/i);
  for (const entry of [positionsFile, educationFile, skillsFile]) {
    if (entry) assertSafeEntrySize(entry);
  }
  const [positions, education, skills] = await Promise.all([
    positionsFile?.async("string").then(records) ?? [],
    educationFile?.async("string").then(records) ?? [],
    skillsFile?.async("string").then(records) ?? [],
  ]);
  if (!positions.length && !education.length && !skills.length) throw new Error("No Positions.csv, Education.csv, or Skills.csv was found in this export.");
  return {
    sourceLabel: "LinkedIn data export",
    experience: positions.map((row) => ({
      title: value(row, "title"), company: value(row, "company name", "company"),
      dates: [value(row, "started on", "start date"), value(row, "finished on", "end date")].filter(Boolean).join(" – "),
      bullets: value(row, "description").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    })).filter((item) => item.title || item.company),
    education: education.map((row) => ({
      degree: [value(row, "degree name", "degree"), value(row, "notes")].filter(Boolean).join(" — "),
      institution: value(row, "school name", "school"),
      dates: [value(row, "start date", "started on"), value(row, "end date", "finished on")].filter(Boolean).join(" – "),
    })).filter((item) => item.degree || item.institution),
    skills: skills.map((row) => value(row, "name", "skill name", "skill")).filter(Boolean),
    notes: ["Parsed only the positions, education, and skills files from your own LinkedIn export."],
  };
}
