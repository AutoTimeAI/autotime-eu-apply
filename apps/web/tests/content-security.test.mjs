import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { boundedCvSchema, escapeHtml, safeHttpUrl } from "../lib/content-security.ts";

const payloads = ["<script>alert('xss')</script>", "<img src=x onerror=alert('xss')>", "**bold** <b># heading</b>", "'; DROP TABLE profiles; --"];
for (const payload of payloads) {
  const escaped = escapeHtml(payload);
  assert.equal(/<(script|img|b)[ >]/i.test(escaped), false);
}
assert.equal(safeHttpUrl("javascript:alert('xss')"), null);
assert.equal(safeHttpUrl("data:text/html,<script>alert(1)</script>"), null);
assert.equal(safeHttpUrl("https://example.com/profile")?.startsWith("https://"), true);

const cv = { contact: { name: "A", email: "a@example.com", phone: "1", location: "EU" }, summary: payloads[0], experience: [], education: [], skills: [payloads[1]] };
assert.equal(boundedCvSchema.safeParse(cv).success, true, "markup remains literal data");
assert.equal(boundedCvSchema.safeParse({ ...cv, summary: "x".repeat(10_001) }).success, false, "oversized CV text is rejected");
assert.equal(boundedCvSchema.safeParse({ ...cv, skills: Array.from({ length: 101 }, () => "x") }).success, false, "oversized CV lists are rejected");

const renderer = readFileSync(new URL("../components/cv/CVRenderer.tsx", import.meta.url), "utf8");
assert.equal(renderer.includes("dangerouslySetInnerHTML"), false, "CV uses React text rendering");
const email = readFileSync(new URL("../../../supabase/functions/sync-job-alerts/index.ts", import.meta.url), "utf8");
for (const dynamic of ["match.title", "match.company", "profile.full_name"]) assert.match(email, new RegExp(`escapeHtml\\([^)]*${dynamic.replace(".", "\\.")}`));
const outreach = readFileSync(new URL("../app/api/outreach/route.ts", import.meta.url), "utf8");
assert.match(outreach, /draftBody: z\.string\(\)\.min\(1\)\.max\(20_000\)/);

console.log("content security: HTML escaping, URL schemes, CV bounds, email interpolation, and outreach bounds passed");
