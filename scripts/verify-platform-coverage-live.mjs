import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { PLATFORM_COVERAGE, getCoveragePlatform } from "../packages/shared/src/platform-coverage.ts";

const outputDir = new URL("../coverage-report/", import.meta.url);
await mkdir(outputDir, { recursive: true });
const checkedAt = new Date().toISOString();
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const entry of PLATFORM_COVERAGE) {
    const page = await browser.newPage({ javaScriptEnabled: true });
    let result;
    try {
      const response = await page.goto(entry.liveCheckUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const finalUrl = page.url();
      const fields = await page.evaluate(() => {
        const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].some((node) => node.textContent?.includes("JobPosting"));
        return { title: Boolean(text("h1") || document.title), company: Boolean(text('[class*="company"], [data-testid*="company"]')), location: Boolean(text('[class*="location"], [data-testid*="location"]')), description: Boolean(text('[class*="description"], [data-testid*="description"]') || jsonLd) };
      });
      const isNativeFeedCheck = entry.nativeFeed === "verified";
      const bodyText = isNativeFeedCheck ? await page.locator("body").innerText() : "";
      const detected = isNativeFeedCheck ? entry.platform : getCoveragePlatform(finalUrl) ?? getCoveragePlatform(entry.liveCheckUrl);
      const reachable = Boolean(response && response.status() < 400);
      const feedPattern = ({ Greenhouse:/"jobs"\s*:|"title"\s*:/, Lever:/"text"\s*:|"hostedUrl"\s*:/, Ashby:/"jobs"\s*:|"jobUrl"\s*:/, SmartRecruiters:/"content"\s*:|"releasedDate"\s*:/, Personio:/<position>|<workzag-jobs>/ })[entry.platform];
      const feedPayloadPresent = !isNativeFeedCheck || Boolean(feedPattern?.test(bodyText));
      const blocked = [401, 403, 405, 429].includes(response?.status() ?? 0);
      const outcome = blocked ? "inconclusive" : reachable && detected === entry.platform && feedPayloadPresent ? "pass" : "fail";
      const passed = outcome === "pass";
      result = { platform: entry.platform, sourceUrl: entry.liveCheckUrl, finalUrl, statusCode: response?.status() ?? null, detected, fields, passed, outcome, failureReason: passed ? null : blocked ? "access_blocked" : !reachable ? "page_unreachable" : detected !== entry.platform ? "platform_not_detected" : "feed_payload_missing" };
    } catch (error) {
      result = { platform: entry.platform, sourceUrl: entry.liveCheckUrl, finalUrl: page.url(), statusCode: null, detected: null, fields: { title:false, company:false, location:false, description:false }, passed:false, outcome:"inconclusive", failureReason: error instanceof Error ? error.message.slice(0, 300) : "live_check_failed" };
    } finally { await page.close(); }
    results.push(result);
  }
} finally { await browser.close(); }

const report = { checkedAt, commit: process.env.GITHUB_SHA ?? "local", extensionVersion: process.env.npm_package_version ?? "0.0.4", readOnly: true, results };
await writeFile(new URL("platform-coverage.json", outputDir), JSON.stringify(report, null, 2));
const rows = results.map((item) => `<tr><td>${item.platform}</td><td>${item.outcome.toUpperCase()}</td><td>${item.statusCode ?? "—"}</td><td>${item.detected ?? "—"}</td><td>${Object.entries(item.fields).filter(([,value])=>value).map(([key])=>key).join(", ") || "none"}</td><td>${item.failureReason ?? ""}</td></tr>`).join("");
await writeFile(new URL("platform-coverage.html", outputDir), `<!doctype html><html lang="en"><meta charset="utf-8"><title>AutoTime platform coverage</title><body><h1>Read-only platform coverage</h1><p>Checked ${checkedAt}; commit ${report.commit}. No forms were filled or submitted.</p><table border="1"><thead><tr><th>Platform</th><th>Result</th><th>HTTP</th><th>Detected</th><th>Fields</th><th>Failure</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
await writeFile(new URL("registry-update.json", outputDir), JSON.stringify({ checkedAt: checkedAt.slice(0,10), verifiedPlatforms: results.filter((item)=>item.passed).map((item)=>item.platform) }, null, 2));
if (results.some((item) => item.outcome === "fail")) process.exitCode = 1;
