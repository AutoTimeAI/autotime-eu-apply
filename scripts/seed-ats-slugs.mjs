import { readFile } from "node:fs/promises";

const platforms = new Set(["greenhouse", "lever", "ashby", "personio"]);
const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: node scripts/seed-ats-slugs.mjs <companies.json>");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const parsed = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Input must be a non-empty JSON array");

const entries = parsed.map((entry, index) => {
  const company_name = typeof entry.company_name === "string" ? entry.company_name.trim() : "";
  const ats_platform = typeof entry.ats_platform === "string" ? entry.ats_platform.trim().toLowerCase() : "";
  const ats_slug = typeof entry.ats_slug === "string" ? entry.ats_slug.trim() : "";
  if (!company_name || !platforms.has(ats_platform) || !ats_slug) throw new Error(`Invalid entry at index ${index}`);
  if (/[:/?#]/.test(ats_slug)) throw new Error(`ats_slug must be a slug, not a URL (index ${index})`);
  return { company_name, ats_platform, ats_slug };
});

const endpoint = new URL("/rest/v1/company_ats_slugs", url);
endpoint.searchParams.set("on_conflict", "company_name,ats_platform");
endpoint.searchParams.set("select", "company_name,ats_platform,ats_slug");
const response = await fetch(endpoint, {
  method: "POST",
  headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify(entries),
});
if (!response.ok) throw new Error(`company_ats_slugs (${response.status}): ${await response.text()}`);
const data = await response.json();
console.log(`Seeded ${Array.isArray(data) ? data.length : entries.length} ATS company slugs.`);
