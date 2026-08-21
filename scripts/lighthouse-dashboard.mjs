// Authenticated Lighthouse run against /dashboard, using the same QA
// session-bootstrap mechanism as the production Playwright suite
// (docs/qa-test-account.md). Skips cleanly (exit 0) when QA_SESSION_URL
// isn't set, instead of failing - this is a best-effort, optional check,
// not a required gate. Never logs QA_SESSION_URL's value.

import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const qaSessionUrl = process.env.QA_SESSION_URL?.trim();

if (!qaSessionUrl) {
  console.log(
    "QA_SESSION_URL is not set - skipping the authenticated dashboard Lighthouse run. " +
      "See docs/quality-assurance.md for how to obtain it.",
  );
  process.exit(0);
}

const origin = new URL(qaSessionUrl).origin;

// The bootstrap route sets session cookies and redirects to /dashboard in
// the same response - we only need this first hop's Set-Cookie headers.
const bootstrapResponse = await fetch(qaSessionUrl, { redirect: "manual" });
const cookies = bootstrapResponse.headers
  .getSetCookie()
  .map((cookie) => cookie.split(";")[0])
  .join("; ");

if (!cookies) {
  console.error(
    "QA session bootstrap did not return any cookies - cannot run an authenticated Lighthouse check.",
  );
  process.exit(1);
}

// Realistic starting budgets, softer than the public-page thresholds since
// an authenticated dashboard ships more client-side data/JS - see
// docs/quality-assurance.md for the rationale.
const budgets = {
  performance: 0.6,
  accessibility: 0.9,
  "best-practices": 0.8,
};

const chrome = await launch({ chromeFlags: ["--headless=new"] });
try {
  const result = await lighthouse(
    `${origin}/dashboard`,
    {
      port: chrome.port,
      extraHeaders: { Cookie: cookies },
      onlyCategories: ["performance", "accessibility", "best-practices"],
      formFactor: "desktop",
      screenEmulation: { disabled: true },
    },
    undefined,
  );

  const scores = Object.fromEntries(
    Object.entries(result.lhr.categories).map(([id, category]) => [
      id,
      category.score,
    ]),
  );
  console.log("Authenticated /dashboard Lighthouse scores:", scores);

  const failures = Object.entries(budgets).filter(
    ([id, minScore]) => (scores[id] ?? 0) < minScore,
  );

  if (failures.length) {
    console.error(
      "Below budget:",
      failures.map(([id, minScore]) => `${id} (min ${minScore})`).join(", "),
    );
    process.exitCode = 1;
  }
} finally {
  await chrome.kill();
}
