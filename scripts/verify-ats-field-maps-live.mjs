import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { ATS_FIELD_MAPS } from "../packages/shared/src/atsFieldMaps.ts";

// Live-checks the candidate selectors in atsFieldMaps.ts against a real,
// currently-open application form for each mapped ATS. Read-only: it only
// asks whether a selector resolves to a visible, fillable input - it never
// types into or submits a form. Fixture URLs are maintained separately in
// scripts/ats-field-map-fixtures.json since they go stale as postings
// close; a missing/placeholder/dead URL is reported as "skipped", not
// treated as a field-map failure.
//
// Selector matching runs as a single in-page evaluate() per platform
// (document.querySelector, synchronous) rather than one Playwright
// locator.evaluate() per candidate selector - the latter auto-waits up to
// its default ~30s timeout for every selector that doesn't match, which
// across several fields x several fallback selectors x six platforms risks
// blowing the CI job's timeout on a routine run where most fallbacks are
// expected to miss.
const fixturesUrl = new URL("./ats-field-map-fixtures.json", import.meta.url);
const fixtures = JSON.parse(await readFile(fixturesUrl, "utf8"));

const outputDir = new URL("../coverage-report/", import.meta.url);
await mkdir(outputDir, { recursive: true });
const checkedAt = new Date().toISOString();
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [ats, fieldMap] of Object.entries(ATS_FIELD_MAPS)) {
    const jobUrl = fixtures[ats];
    const isPlaceholder = !jobUrl || jobUrl.includes("REPLACE_WITH_LIVE");
    if (isPlaceholder) {
      results.push({ ats, jobUrl: jobUrl ?? null, outcome: "skipped", reason: "no live fixture URL set", fields: {} });
      continue;
    }

    const page = await browser.newPage({ javaScriptEnabled: true });
    let result;
    try {
      const response = await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const blocked = [401, 403, 405, 429].includes(response?.status() ?? 0);
      const reachable = Boolean(response && response.status() < 400);

      const fields = reachable
        ? await page.evaluate((fieldMap) => {
            const isFillable = (el) =>
              Boolean(el) && !el.disabled && !el.readOnly && el.getClientRects().length > 0;
            const found = {};
            for (const [field, selectors] of Object.entries(fieldMap)) {
              let matchedSelector = null;
              for (const selector of selectors) {
                if (isFillable(document.querySelector(selector))) {
                  matchedSelector = selector;
                  break;
                }
              }
              found[field] = { matched: Boolean(matchedSelector), selector: matchedSelector };
            }
            return found;
          }, fieldMap)
        : {};

      const anyFieldMatched = Object.values(fields).some((f) => f.matched);
      const outcome = blocked ? "inconclusive" : !reachable ? "fail" : anyFieldMatched ? "pass" : "fail";
      result = {
        ats, jobUrl, statusCode: response?.status() ?? null, outcome, fields,
        failureReason: outcome === "pass" ? null : blocked ? "access_blocked" : !reachable ? "page_unreachable" : "no_mapped_selector_matched"
      };
    } catch (error) {
      result = {
        ats, jobUrl, statusCode: null, outcome: "inconclusive", fields: {},
        failureReason: error instanceof Error ? error.message.slice(0, 300) : "live_check_failed"
      };
    } finally {
      await page.close();
    }
    results.push(result);
  }
} finally {
  await browser.close();
}

const report = { checkedAt, commit: process.env.GITHUB_SHA ?? "local", results };
await writeFile(new URL("ats-field-maps.json", outputDir), JSON.stringify(report, null, 2));

const rows = results
  .map((item) => {
    const fieldSummary = Object.entries(item.fields)
      .map(([field, state]) => `${field}: ${state.matched ? "✓" : "✗"}`)
      .join(", ") || "—";
    return `<tr><td>${item.ats}</td><td>${item.outcome.toUpperCase()}</td><td>${item.statusCode ?? "—"}</td><td>${fieldSummary}</td><td>${item.failureReason ?? ""}</td></tr>`;
  })
  .join("");
await writeFile(
  new URL("ats-field-maps.html", outputDir),
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>AutoTime ATS field map check</title><body><h1>Read-only ATS field map check</h1><p>Checked ${checkedAt}. No forms were filled or submitted - selector presence only.</p><table border="1"><thead><tr><th>ATS</th><th>Result</th><th>HTTP</th><th>Fields</th><th>Failure</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
);

if (results.some((item) => item.outcome === "fail")) process.exitCode = 1;
