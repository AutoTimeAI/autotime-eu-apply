import type { CVEnrichment } from "../types";

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

export async function enrichCvFromLinkedInZip(file: File): Promise<CVEnrichment> {
  if (file.size > 25 * 1024 * 1024) throw new Error("LinkedIn export must be 25 MB or smaller.");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const find = (pattern: RegExp) => Object.values(zip.files).find((entry) => !entry.dir && pattern.test(entry.name));
  const positionsFile = find(/(^|\/)positions\.csv$/i);
  const educationFile = find(/(^|\/)education\.csv$/i);
  const skillsFile = find(/(^|\/)skills\.csv$/i);
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
