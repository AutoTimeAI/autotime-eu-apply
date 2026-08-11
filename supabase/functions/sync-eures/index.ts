import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EURES_URL = "https://europa.eu/eures/api/jv-searchengine/public/jv-search/search";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const normalise = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
async function hash(value: string) { const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(data)].map((v) => v.toString(16).padStart(2, "0")).join(""); }
function detectATS(url: string) { const patterns: Array<[string, RegExp]> = [["greenhouse", /greenhouse\.io/i], ["lever", /jobs\.lever\.co/i], ["workday", /myworkdayjobs\.com/i], ["personio", /jobs\.personio\.(de|com)/i], ["ashby", /jobs\.ashbyhq\.com/i]]; return patterns.find(([, regex]) => regex.test(url))?.[0] ?? "unknown"; }

async function requestPage(page: number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(EURES_URL, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ page, resultsPerPage: 100, locationCodes: [] }) });
    if (response.ok) return response.json();
    if (response.status < 500 && response.status !== 429) throw new Error(`EURES request failed (${response.status})`);
    await sleep(1000 * 2 ** attempt);
  }
  throw new Error("EURES request failed after retries");
}

Deno.serve(async (request) => {
  if (request.headers.get("authorization") !== `Bearer ${Deno.env.get("CRON_SECRET")}`) return new Response("Unauthorized", { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let page = 1, synced = 0;
  while (page <= 100) {
    const payload = await requestPage(page) as Record<string, unknown>;
    const items = (payload.results ?? payload.items ?? payload.jvs ?? []) as Array<Record<string, unknown>>;
    if (!items.length) break;
    const rows = await Promise.all(items.map(async (item) => {
      const title = clean(item.title ?? item.positionTitle), company = clean(item.employer ?? item.organisationName), url = clean(item.url ?? item.redirectUrl);
      const identityHash = await hash(`${normalise(title)}|${normalise(company)}`);
      return { title, company, location: clean(item.location ?? item.locationName), url, posted_date: clean(item.postedDate ?? item.publicationDate).slice(0, 10) || null,
        source: "eures", ats_platform: detectATS(url), description_raw: clean(item.description), dedup_hash: await hash(url || identityHash), identity_hash: identityHash };
    }));
    const valid = [...new Map(rows.filter((row) => row.title && row.company && row.url).map((row) => [row.identity_hash, row])).values()];
    const { error } = await supabase.from("job_listings").upsert(valid, { onConflict: "identity_hash" });
    if (error) throw error; synced += valid.length;
    if (items.length < 100) break; page++; await sleep(500);
  }
  return Response.json({ synced });
});
