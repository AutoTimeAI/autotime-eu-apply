import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  analyseJob,
  extractJob,
} from "../apps/web/lib/job-application-workflow.ts";
import { realVacancyCases } from "./real-vacancy-evaluation-cases.mjs";

// Item B of docs/reference/landwell-master-execution-plan.md §5.3: the
// first blind-reviewer labeling cycle doesn't need the (not-yet-built)
// expert-signoff/rule-bundle admin UI - an offline artifact is enough.
// This script produces that artifact as a CSV.
//
// "Blind" here means: the reviewer-facing columns contain only the
// vacancy text and candidate evidence, never the engine's own decision,
// reasoning, or confidence. The engine's output is written to a SEPARATE
// file (not handed to the reviewer) so it can be compared against the
// reviewer's independent label afterwards without anchoring their
// judgement. Mixing these two files before scoring agreement defeats the
// entire point of a blind review.
//
// Usage: node --experimental-strip-types scripts/export-blind-review-artifact.mjs

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows, columns) {
  const header = columns.map(csvEscape).join(",");
  const lines = rows.map((row) => columns.map((col) => csvEscape(row[col])).join(","));
  return [header, ...lines].join("\n") + "\n";
}

const outDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../docs/investigations");

const blindColumns = [
  "case_id",
  "source_url",
  "captured_at",
  "vacancy_text",
  "candidate_evidence",
  "reviewer_label",
  "reviewer_reasoning",
  "reviewer_name",
];

const blindRows = realVacancyCases.map((scenario) => ({
  case_id: scenario.id,
  source_url: scenario.sourceUrl,
  captured_at: scenario.capturedAt,
  vacancy_text: scenario.vacancyText,
  candidate_evidence: scenario.candidateEvidence,
  reviewer_label: "",
  reviewer_reasoning: "",
  reviewer_name: "",
}));

const engineColumns = [
  "case_id",
  "engine_decision",
  "engine_reason",
  "engine_confidence",
  "engine_unknowns",
  "engine_critical_risk",
];

const engineRows = realVacancyCases.map((scenario) => {
  const job = extractJob({ description: scenario.vacancyText });
  const result = analyseJob(job, scenario.candidateEvidence, {});
  return {
    case_id: scenario.id,
    engine_decision: result.decision,
    engine_reason: result.reason,
    engine_confidence: result.confidence,
    engine_unknowns: (result.unknowns ?? []).join("; "),
    engine_critical_risk: result.criticalRisk ?? "",
  };
});

const blindPath = path.join(outDir, "blind-review-artifact.csv");
const enginePath = path.join(outDir, "blind-review-artifact-engine-output.csv");

writeFileSync(blindPath, toCsv(blindRows, blindColumns), "utf8");
writeFileSync(enginePath, toCsv(engineRows, engineColumns), "utf8");

console.log(`Wrote ${blindRows.length} rows to ${blindPath} (hand to reviewer)`);
console.log(`Wrote ${engineRows.length} rows to ${enginePath} (keep separate until reviewer labels are in)`);
console.log("Do not open the engine-output file until every reviewer_label cell in the blind artifact is filled in.");
