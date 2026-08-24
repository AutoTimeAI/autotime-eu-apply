import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Constant-time comparison for the cron secret - a plain !== leaks a timing
// signal proportional to the matching prefix length, which a remote
// attacker could in principle use to recover CRON_SECRET one character at a
// time. Written portably (no node:crypto dependency) rather than relying on
// Deno's Node-compat layer for a security-sensitive primitive.
function safeEqual(a: string, b: string): boolean {
  const bufferA = new TextEncoder().encode(a);
  const bufferB = new TextEncoder().encode(b);
  if (bufferA.length !== bufferB.length) return false;
  let mismatch = 0;
  for (let i = 0; i < bufferA.length; i += 1) mismatch |= bufferA[i] ^ bufferB[i];
  return mismatch === 0;
}
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const normalise = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
async function hash(value: string) { const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(data)].map((v) => v.toString(16).padStart(2, "0")).join(""); }
// Mirrors apps/web/lib/dedup.ts's canonicalJobUrl - kept as a separate copy
// since this Deno edge function can't import a Next.js workspace module.
// Without this, dedup_hash was computed from the raw URL, so the same
// posting re-fetched with a different utm_/ref tracking parameter hashed
// differently every time.
function canonicalJobUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|source$|ref$|referrer$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/$/, "");
    url.searchParams.sort();
    return url.toString();
  } catch {
    return value.trim();
  }
}
function detectATS(url: string) { const patterns: Array<[string, RegExp]> = [["greenhouse", /greenhouse\.io/i], ["lever", /jobs\.lever\.co/i], ["workday", /myworkdayjobs\.com/i], ["personio", /jobs\.personio\.(de|com)/i], ["ashby", /jobs\.ashbyhq\.com/i]]; return patterns.find(([, regex]) => regex.test(url))?.[0] ?? "unknown"; }

async function requestPage(page: number) {
  const endpoint = Deno.env.get("EURES_PARTNER_API_URL");
  const token = Deno.env.get("EURES_PARTNER_API_TOKEN");
  if (!endpoint || !token) throw new Error("Authorized EURES partner API access is not configured");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ page, resultsPerPage: 100, locationCodes: [] }) });
    if (response.ok) return response.json();
    if (response.status < 500 && response.status !== 429) throw new Error(`EURES request failed (${response.status})`);
    await sleep(1000 * 2 ** attempt);
  }
  throw new Error("EURES request failed after retries");
}

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || !safeEqual(request.headers.get("x-cron-secret") ?? "", cronSecret)) return new Response("Unauthorized", { status: 401 });
  if (!Deno.env.get("EURES_PARTNER_API_URL") || !Deno.env.get("EURES_PARTNER_API_TOKEN")) {
    return Response.json({ synced: 0, status: "disabled_missing_authorized_partner_access" }, { status: 503 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let page = 1, synced = 0;
  while (page <= 100) {
    const payload = await requestPage(page) as Record<string, unknown>;
    const items = (payload.results ?? payload.items ?? payload.jvs ?? []) as Array<Record<string, unknown>>;
    if (!items.length) break;
    const rows = await Promise.all(items.map(async (item) => {
      const title = clean(item.title ?? item.positionTitle), company = clean(item.employer ?? item.organisationName), url = clean(item.url ?? item.redirectUrl);
      const location = clean(item.location ?? item.locationName);
      // Location must be part of the identity, not just title+company - the
      // same role advertised concurrently in two different cities is two
      // genuinely distinct, still-open postings for an EU cross-country job
      // search app, not one listing that "moved". Without this, the second
      // one silently overwrites the first via the identity_hash upsert.
      const identityHash = await hash(`${normalise(title)}|${normalise(company)}|${normalise(location)}`);
      return { title, company, location, url, posted_date: clean(item.postedDate ?? item.publicationDate).slice(0, 10) || null,
        source: "eures", ats_platform: detectATS(url), description_raw: clean(item.description), dedup_hash: await hash(canonicalJobUrl(url) || identityHash), identity_hash: identityHash };
    }));
    const valid = [...new Map(rows.filter((row) => row.title && row.company && row.url).map((row) => [row.identity_hash, row])).values()];
    const { error } = await supabase.from("job_listings").upsert(valid, { onConflict: "identity_hash" });
    if (error) throw error; synced += valid.length;
    if (items.length < 100) break; page++; await sleep(500);
  }
  return Response.json({ synced });
});
