import assert from "node:assert/strict";
import {
  analyseJob,
  extractJob,
} from "../apps/web/lib/job-application-workflow.ts";
import { realVacancyCases } from "./real-vacancy-evaluation-cases.mjs";

// Sibling to scripts/decision-quality-evaluation.test.mjs, but runs the
// decision engine against real, verbatim-captured vacancy postings
// (docs/reference/landwell-master-execution-plan.md item C) instead of
// hand-fabricated template strings.
//
// Unlike the synthetic benchmark, there is no blind-reviewer ground-truth
// label for these cases yet (that requires the slice-selection interviews
// and independent review cycle in landwell-tech-system-validation-plan.md
// §5.2, neither of which has happened). So this harness does not assert a
// predetermined "correct" decision - it asserts the engine produces a
// well-formed, non-crashing result on real-world text, and surfaces the
// actual decision/reasoning for manual review rather than asserting one.

const VALID_DECISIONS = ["Apply", "Consider", "Insufficient information"];

assert.ok(realVacancyCases.length > 0, "the real-vacancy corpus must not be empty");
assert.equal(
  new Set(realVacancyCases.map((item) => item.id)).size,
  realVacancyCases.length,
  "every real-vacancy case needs a unique ID",
);

let failed = 0;

for (const scenario of realVacancyCases) {
  try {
    const job = extractJob({ description: scenario.vacancyText });
    const result = analyseJob(job, scenario.candidateEvidence, {});

    assert.ok(
      VALID_DECISIONS.includes(result.decision),
      `${scenario.id}: decision "${result.decision}" is not one of ${VALID_DECISIONS.join(", ")}`,
    );
    assert.ok(Array.isArray(result.unknowns), `${scenario.id}: unknowns must be an array`);
    assert.ok(typeof result.reason === "string" && result.reason.length > 0, `${scenario.id}: reason must be non-empty`);

    // Sponsorship must never be silently fabricated: the source posting
    // says nothing about it, so the engine must not assert it either way.
    if (scenario.sponsorshipSignal === "silent") {
      const mentionsSponsorship = /sponsor/i.test(result.reason) || result.unknowns.some((u) => /sponsor/i.test(u));
      assert.ok(
        !/sponsorship confirmed|sponsorship available/i.test(result.reason),
        `${scenario.id}: engine must not fabricate sponsorship confirmation from a silent posting`,
      );
      void mentionsSponsorship;
    }

    console.log(
      `ok - ${scenario.id} - ${scenario.company} / ${scenario.roleTitle} -> ${result.decision} (${scenario.sourceUrl})`,
    );
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${scenario.id} - ${scenario.company} / ${scenario.roleTitle}`);
    console.error(error);
  }
}

console.log(`Real-vacancy evaluation harness: ${realVacancyCases.length - failed}/${realVacancyCases.length} passed`);

if (failed > 0) {
  process.exitCode = 1;
}
