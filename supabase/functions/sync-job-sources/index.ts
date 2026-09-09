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
// Same discipline for Jobvite's two fetched documents - a careers page
// (small listing page, capped lower) and its XML feed (capped the same as
// Personio's, since it's the same "every open posting in one response" shape).
const MAX_JOBVITE_CAREERS_PAGE_LENGTH = 2_000_000;
const MAX_JOBVITE_XML_LENGTH = 5_000_000;
// Workday's CXS API rejects any page limit above 20 (HTTP 400, confirmed
// live); iCIMS's Jibe API pages at a fixed 10 regardless of request.
// Both capped at 25 pages per company - defensive, matching the discipline
// above, not expected to bite for a normal employer.
const WORKDAY_PAGE_LIMIT = 20;
const MAX_WORKDAY_PAGES = 25;
const ICIMS_PAGE_SIZE = 10;
const MAX_ICIMS_PAGES = 25;
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
  // Recruitee was added to company_ats_slugs's allowed platform list
  // (20260818160000_add_recruitee_feed.sql) and to platform-coverage.ts's
  // nativeFeed:"verified" claim, but this dispatcher never got a matching
  // branch - meaning any configured Recruitee company would silently sync
  // zero jobs forever, with no error surfaced. Mirrors
  // apps/web/lib/ats-feeds/recruitee.ts's shape.
  if(platform==="recruitee") { const d=await (await retry(`https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`)).json(); return (d.offers??[]).map((j:Record<string,unknown>)=>{const loc=(j.locations as Record<string,unknown>[]|undefined)?.[0];return{title:clean(j.title),company,location:[clean(j.city)||clean(loc?.city),clean(j.country)||clean(loc?.country)].filter(Boolean).join(", "),url:clean(j.careers_url)||clean(j.careers_apply_url),postedDate:clean(j.created_at)||null,descriptionRaw:clean(j.description),atsPlatform:platform,source:platform};}); }
  // BambooHR and Teamtailor: undocumented-but-stable public endpoints, not
  // officially published APIs - allowed here only as the deliberate,
  // logged exception in docs/reference/job-aggregation-compliance.md
  // ("Reverse-engineered feed exception", 2026-09-08). Mirrors
  // apps/web/lib/ats-feeds/bamboohr.ts and teamtailor.ts.
  if(platform==="bamboohr") { const d=await (await retry(`https://${encodeURIComponent(slug)}.bamboohr.com/careers/list`)).json(); return (d.result??[]).map((j:Record<string,unknown>)=>{const location=(j.location??{}) as Record<string,unknown>;return{title:clean(j.jobOpeningName),company,location:[clean(location.city),clean(location.state)].filter(Boolean).join(", "),url:j.id!=null?`https://${slug}.bamboohr.com/careers/${j.id}`:"",postedDate:null,descriptionRaw:"",atsPlatform:platform,source:platform};}); }
  if(platform==="teamtailor") { const d=await (await retry(`https://${encodeURIComponent(slug)}.teamtailor.com/jobs.json`)).json(); return (d.items??[]).map((j:Record<string,unknown>)=>{const posting=(j._jobposting??{}) as Record<string,unknown>;const address=((posting.jobLocation as Record<string,unknown>[]|undefined)?.[0]?.address??{}) as Record<string,unknown>;return{title:clean(j.title),company,location:[clean(address.addressLocality),clean(address.addressRegion)||clean(address.addressCountry)].filter(Boolean).join(", "),url:clean(j.url),postedDate:typeof j.date_published==="string"?j.date_published:null,descriptionRaw:clean(j.content_html),atsPlatform:platform,source:platform};}); }
  // Jobvite: same reverse-engineered-endpoint exception as BambooHR/
  // Teamtailor above, plus its own two-step fetch - the real feed needs an
  // opaque companyEId that isn't the public careers-page slug, discovered
  // by scanning that page's own embedded JS (`companyEId: '<id>'`). The old
  // JSON endpoint (api/company/{slug}/jobs) is confirmed dead. Mirrors
  // apps/web/lib/ats-feeds/jobvite.ts.
  if(platform==="jobvite") { const careersHtml=(await (await retry(`https://jobs.jobvite.com/${encodeURIComponent(slug)}/jobs`)).text()).slice(0,MAX_JOBVITE_CAREERS_PAGE_LENGTH); const companyEId=careersHtml.match(/companyEId:\s*'([^']+)'/)?.[1]; if(!companyEId) throw new Error(`Jobvite careers page for ${slug} has no discoverable companyEId`); const xml=(await (await retry(`https://app.jobvite.com/CompanyJobs/Xml.aspx?c=${encodeURIComponent(companyEId)}`)).text()).slice(0,MAX_JOBVITE_XML_LENGTH); const text=(n:string,t:string)=>n.match(new RegExp(`<${t}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`,"i"))?.[1]?.trim()??""; return [...xml.matchAll(/<job>([\s\S]*?)<\/job>/gi)].map((m)=>({title:text(m[1],"title"),company,location:text(m[1],"location"),url:text(m[1],"detail-url"),postedDate:text(m[1],"date")||null,descriptionRaw:text(m[1],"description"),atsPlatform:platform,source:platform})); }
  // Workday: same reverse-engineered-endpoint exception as above. `slug` is
  // "{tenantHost}:{site}" (e.g. "ubc.wd10:ubcstaffjobs") - Workday needs
  // both the numbered tenant host (not guessable from the company name) and
  // the site path segment, both read off the real public careers URL. The
  // CXS API rejects any page limit above 20 (HTTP 400, confirmed live), so
  // real employers need pagination. Mirrors apps/web/lib/ats-feeds/workday.ts.
  if(platform==="workday") { const [tenantHost,site]=slug.split(":"); if(!tenantHost||!site) throw new Error(`Workday company slug must be "tenantHost:site", got "${slug}"`); const tenant=tenantHost.split(".")[0]; const baseUrl=`https://${tenantHost}.myworkdayjobs.com`; const jobs:Job[]=[]; for(let page=0;page<MAX_WORKDAY_PAGES;page+=1){ const offset=page*WORKDAY_PAGE_LIMIT; const d=await (await retry(`${baseUrl}/wday/cxs/${tenant}/${site}/jobs`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({appliedFacets:{},limit:WORKDAY_PAGE_LIMIT,offset,searchText:""})})).json(); const postings=(d.jobPostings??[]) as Record<string,unknown>[]; if(postings.length===0)break; for(const j of postings){ if(!j.title||!j.externalPath)continue; jobs.push({title:clean(j.title),company:tenant,location:clean(j.locationsText),url:`${baseUrl}/${site}${j.externalPath}`,postedDate:null,descriptionRaw:"",atsPlatform:platform,source:platform}); } if(postings.length<WORKDAY_PAGE_LIMIT)break; } return jobs; }
  // iCIMS: same exception, plus NOT universal - only "Jibe-powered" iCIMS
  // deployments expose this /api/jobs endpoint; "classic" ones (confirmed
  // live: VHB, Applied Systems, Quest) return their normal HTML page for
  // this same path instead of a real 404, which makes response.json() throw
  // a SyntaxError - the correct, honest per-company failure (surfaced in
  // this function's `failures` array), not a silent zero-result. `slug` is
  // the exact host of the real career site (custom domain or *.icims.com
  // subdomain - both work identically when Jibe-powered). Mirrors
  // apps/web/lib/ats-feeds/icims.ts.
  if(platform==="icims") { const jobs:Job[]=[]; for(let page=1;page<=MAX_ICIMS_PAGES;page+=1){ const d=await (await retry(`https://${slug}/api/jobs?page=${page}&sortBy=relevance&descending=false&internal=false`)).json(); const postings=(d.jobs??[]) as { data?: Record<string,unknown> }[]; if(postings.length===0)break; for(const entry of postings){ const j=entry.data??{}; const metaData=(j.meta_data??{}) as Record<string,unknown>; const url=clean(metaData.canonical_url); if(!j.title||!url)continue; jobs.push({title:clean(j.title),company,location:clean(j.short_location),url,postedDate:clean(j.posted_date)||null,descriptionRaw:"",atsPlatform:platform,source:platform}); } if(postings.length<ICIMS_PAGE_SIZE)break; } return jobs; }
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
