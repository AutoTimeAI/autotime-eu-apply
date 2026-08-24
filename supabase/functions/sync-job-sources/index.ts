import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Constant-time comparison for the cron secret - a plain !== leaks a timing
// signal proportional to the matching prefix length, which a remote
// attacker could in principle use to recover CRON_SECRET one character at a
// time. Written portably (no node:crypto dependency) rather than relying on
// Deno's Node-compat layer for a security-sensitive primitive.
function safeEqual(a: string, b: string): boolean { const bufferA=new TextEncoder().encode(a); const bufferB=new TextEncoder().encode(b); if(bufferA.length!==bufferB.length)return false; let mismatch=0; for(let i=0;i<bufferA.length;i+=1)mismatch|=bufferA[i]^bufferB[i]; return mismatch===0; }
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";
const norm = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
async function hash(v: string) { const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)); return [...new Uint8Array(data)].map((n) => n.toString(16).padStart(2,"0")).join(""); }
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
async function retry(url: string, init?: RequestInit) { for (let i=0;i<3;i++) { const response=await fetch(url,init); if(response.ok)return response; if(response.status<500&&response.status!==429)throw new Error(`${response.status} ${url}`); await new Promise((r)=>setTimeout(r,1000*2**i)); } throw new Error(`Retries exhausted: ${url}`); }
// Personio's XML feed is parsed with regex below, unlike the JSON feeds in
// this file (JSON.parse cost doesn't scale exponentially with size) - an
// unbounded response would scale regex-scan cost with input length for no
// bound, so this caps it the same way apps/web/lib/ats-feeds/personio.ts
// does. Far beyond any realistic careers feed; only bites in a pathological case.
const MAX_PERSONIO_XML_LENGTH = 5_000_000;
type Job = { title:string; company:string; location:string; url:string; postedDate:string|null; descriptionRaw:string; atsPlatform:string; source:string };
// identity_hash must include location, not just title+company - the same
// role advertised concurrently in two different cities is two genuinely
// distinct, still-open postings for an EU cross-country job search app,
// not one listing that "moved". Without this, the second one silently
// overwrites the first via the identity_hash upsert (see job_listings
// upsert calls below).
const uniqueByIdentity = <T extends { identity_hash:string }>(rows:T[]):T[] => [...new Map(rows.map((row)=>[row.identity_hash,row])).values()];
const errorMessage = (value:unknown):string => value instanceof Error ? value.message : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
async function feed(platform:string, slug:string, company:string): Promise<Job[]> {
  if(platform==="greenhouse") { const d=await (await retry(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`)).json(); return (d.jobs??[]).map((j:Record<string,unknown>)=>({title:clean(j.title),company,location:clean((j.location as Record<string,unknown>)?.name),url:clean(j.absolute_url),postedDate:clean(j.updated_at)||null,descriptionRaw:clean(j.content),atsPlatform:platform,source:platform})); }
  if(platform==="lever") { const d=await (await retry(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`)).json(); return d.map((j:Record<string,unknown>)=>({title:clean(j.text),company,location:clean((j.categories as Record<string,unknown>)?.location),url:clean(j.hostedUrl),postedDate:null,descriptionRaw:clean(j.descriptionPlain),atsPlatform:platform,source:platform})); }
  if(platform==="ashby") { const d=await (await retry(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`)).json(); return (d.jobs??[]).map((j:Record<string,unknown>)=>({title:clean(j.title),company,location:clean(j.location),url:clean(j.jobUrl),postedDate:clean(j.publishedAt)||null,descriptionRaw:clean(j.descriptionPlain),atsPlatform:platform,source:platform})); }
  if(platform==="personio") { const xml=(await (await retry(`https://${encodeURIComponent(slug)}.jobs.personio.de/xml`)).text()).slice(0,MAX_PERSONIO_XML_LENGTH); const text=(n:string,t:string)=>n.match(new RegExp(`<${t}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`,"i"))?.[1]?.trim()??""; return [...xml.matchAll(/<position(?:\s[^>]*)?>([\s\S]*?)<\/position>/gi)].map((m)=>({title:text(m[1],"name"),company,location:text(m[1],"office"),url:text(m[1],"url")||`https://${slug}.jobs.personio.de/job/${text(m[1],"id")}`,postedDate:text(m[1],"createdAt")||null,descriptionRaw:text(m[1],"jobDescriptions"),atsPlatform:platform,source:platform})); }
  if(platform==="smartrecruiters") { const d=await (await retry(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=100&destination=PUBLIC`)).json(); return (d.content??[]).map((j:Record<string,unknown>)=>{const location=(j.location??{}) as Record<string,unknown>;const organisation=(j.company??{}) as Record<string,unknown>;return{title:clean(j.name),company:clean(organisation.name)||company,location:[clean(location.city),clean(location.region),clean(location.country)].filter(Boolean).join(", "),url:j.id?`https://jobs.smartrecruiters.com/${slug}/${encodeURIComponent(String(j.id))}`:"",postedDate:clean(j.releasedDate)||null,descriptionRaw:"",atsPlatform:platform,source:platform};}); }
  return [];
}
async function aggregatorJobs(): Promise<{ jobs: Job[]; providers: Record<string,string> }> { const jobs:Job[]=[]; const providers:Record<string,string>={}; const queries=(Deno.env.get("JOB_SYNC_QUERIES")??"software engineer,data engineer").split(",").map((v)=>v.trim()).filter(Boolean); const countries=(Deno.env.get("JOB_SYNC_COUNTRIES")??"gb,ie,de,nl,fr").split(",").map((v)=>v.trim()).filter(Boolean); const adzunaId=Deno.env.get("ADZUNA_APP_ID"),adzunaKey=Deno.env.get("ADZUNA_APP_KEY");
  if(adzunaId&&adzunaKey){providers.adzuna="configured";for(const country of countries)for(const query of queries){const u=new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);u.search=new URLSearchParams({app_id:adzunaId,app_key:adzunaKey,what:query,results_per_page:"50"}).toString();const d=await (await retry(u.toString())).json();jobs.push(...(d.results??[]).map((j:Record<string,unknown>)=>({title:clean(j.title),company:clean((j.company as Record<string,unknown>)?.display_name),location:clean((j.location as Record<string,unknown>)?.display_name),url:clean(j.redirect_url),postedDate:clean(j.created)||null,descriptionRaw:clean(j.description),atsPlatform:"unknown",source:"adzuna"})));await new Promise((r)=>setTimeout(r,500));}}else providers.adzuna="disabled_missing_credentials";
  const jooble=Deno.env.get("JOOBLE_API_KEY");if(jooble){providers.jooble="configured";for(const query of queries){const d=await (await retry(`https://jooble.org/api/${encodeURIComponent(jooble)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({keywords:query,location:Deno.env.get("JOB_SYNC_JOOBLE_LOCATION")??"European Union",page:1,ResultOnPage:50})})).json();jobs.push(...(d.jobs??[]).map((j:Record<string,unknown>)=>({title:clean(j.title),company:clean(j.company),location:clean(j.location),url:clean(j.link),postedDate:clean(j.updated)||null,descriptionRaw:clean(j.snippet),atsPlatform:"unknown",source:"jooble"})));await new Promise((r)=>setTimeout(r,500));}}else providers.jooble="disabled_missing_credentials";return{jobs,providers}; }
Deno.serve(async (request) => { const cronSecret=Deno.env.get("CRON_SECRET"); if(!cronSecret||!safeEqual(request.headers.get("x-cron-secret")??"",cronSecret))return new Response("Unauthorized",{status:401}); const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); const {data:slugs,error}=await db.from("company_ats_slugs").select("company_name,ats_platform,ats_slug"); if(error)throw error; const failures:string[]=[]; let synced=0;
  for(const item of slugs??[]) { try { const jobs=await feed(item.ats_platform,item.ats_slug,item.company_name); const rows=uniqueByIdentity(await Promise.all(jobs.filter((j)=>j.title&&j.url).map(async(j)=>{const identity=await hash(`${norm(j.title)}|${norm(j.company)}|${norm(j.location)}`);return{title:j.title,company:j.company,location:j.location||null,url:j.url,posted_date:j.postedDate?.slice(0,10)||null,source:j.source,ats_platform:j.atsPlatform,description_raw:j.descriptionRaw,dedup_hash:await hash(canonicalJobUrl(j.url)),identity_hash:identity};}))); if(rows.length){const result=await db.from("job_listings").upsert(rows,{onConflict:"identity_hash"});if(result.error)throw result.error;synced+=rows.length;} } catch(e){failures.push(`${item.company_name}/${item.ats_platform}: ${errorMessage(e)}`);} await new Promise((r)=>setTimeout(r,300)); }
  let providers:Record<string,string>={};try{const aggregated=await aggregatorJobs();providers=aggregated.providers;const rows=uniqueByIdentity(await Promise.all(aggregated.jobs.filter((j)=>j.title&&j.company&&j.url).map(async(j)=>{const identity=await hash(`${norm(j.title)}|${norm(j.company)}|${norm(j.location)}`);return{title:j.title,company:j.company,location:j.location||null,url:j.url,posted_date:j.postedDate?.slice(0,10)||null,source:j.source,ats_platform:j.atsPlatform,description_raw:j.descriptionRaw,dedup_hash:await hash(canonicalJobUrl(j.url)),identity_hash:identity};})));if(rows.length){const result=await db.from("job_listings").upsert(rows,{onConflict:"identity_hash"});if(result.error)throw result.error;synced+=rows.length;}}catch(e){failures.push(`aggregators: ${errorMessage(e)}`);}
  let classified=0;const classification=await db.rpc("classify_job_listings_esco",{p_limit:100});if(classification.error)failures.push(`ESCO classification: ${classification.error.message}`);else classified=classification.data??0;
  return Response.json({synced,classified,companies:slugs?.length??0,failures,providers},{status:failures.length?207:200}); });
