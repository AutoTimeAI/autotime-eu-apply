"use client";

// Search/browse UI for the aggregated public job feed (distinct from the
// user's own tracked-job workspace in JobApplicationWorkspace). Lets the
// user filter fetched listings client-side and "Track" one, which copies it
// into their private job-workflow storage so it becomes an owned, editable
// job record. Owns only transient search/pagination state — the listings
// themselves are passed in from the server route that queried them.

import { useEffect, useMemo, useState } from "react";
import { useDashboardPlan } from "./UserNav";
import { extractJob, duplicateJob } from "../lib/job-application-workflow";
import { loadJobWorkflow, saveJobWorkflow } from "../lib/job-workflow-storage";
import { ProductEmptyState, ProductPageHeader, ProductStatusBadge } from "./product-ui";

type Listing = { id: string; title: string; company: string; location: string | null; url: string; posted_date: string | null; source: string; ats_platform: string; description_raw: string | null };

/**
 * Client component that renders a searchable list of aggregated public job
 * listings with client-side filtering (title/company/location) and
 * incremental "Load 25 more" pagination. Tracking a listing extracts it into
 * a `JobRecord` via `extractJob` and appends it to the signed-in user's
 * job-workflow storage (skipping it if `duplicateJob` finds a match).
 *
 * @param listings - Pre-fetched aggregated listings from the server.
 * @param unavailable - When non-null, the listings source could not be
 *   read (e.g. missing Supabase migration); an empty state is shown instead.
 */
export default function AggregatedJobsBrowser({ listings, unavailable }: { listings: Listing[]; unavailable: string | null }) {
  const { userId } = useDashboardPlan();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [visibleCount, setVisibleCount] = useState(25);
  const visible = useMemo(() => listings.filter((item) => `${item.title} ${item.company} ${item.location ?? ""}`.toLowerCase().includes(query.toLowerCase())), [listings, query]);

  useEffect(() => setVisibleCount(25), [query]);

  return <main className="workflow-page phase-two-jobs">
    <ProductPageHeader eyebrow="EU job feed" title="Browse verified job sources" description="Listings come from approved public or licensed feeds. Tracking copies a listing into your private workflow." />
    <a className="text-link" href="/dashboard/jobs">← Tracked jobs</a>
    <label>Search listings<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Role, employer or location" /></label>
    <p role="status">{status}</p>
    {unavailable ? <ProductEmptyState title="Job feed unavailable" description="The listings database is not ready. Apply the latest Supabase migration and run a sync." /> : visible.length ? <section className="workflow-list" aria-label="Aggregated job listings">
      <p className="supporting-copy">Showing {Math.min(visibleCount, visible.length)} of {visible.length} matching listings</p>
      {visible.slice(0, visibleCount).map((item) => <article className="workflow-list-row" key={item.id}><div><p className="product-eyebrow">{item.source} · {item.posted_date ?? "Date unavailable"}</p><h2>{item.title}</h2><p>{item.company} · {item.location || "Location unavailable"}</p></div><ProductStatusBadge status="confirmed">{item.ats_platform === "unknown" ? "ATS unknown" : item.ats_platform}</ProductStatusBadge><button className="button-primary" onClick={() => {
        try { const state = loadJobWorkflow(userId); const job = extractJob({ title: item.title, employer: item.company, description: item.description_raw || `${item.title} at ${item.company}. Location: ${item.location ?? "not supplied"}.`, sourceUrl: item.url });
          if (duplicateJob(state.jobs, job)) { setStatus("This job is already tracked."); return; }
          saveJobWorkflow(userId, { ...state, jobs: [{ ...job, atsPlatform: item.ats_platform, source: "Saved job" }, ...state.jobs] }); setStatus(`${item.title} is now tracked.`);
        } catch (error) { setStatus(error instanceof Error ? error.message : "Could not track this job."); }
      }}>Track this job</button></article>)}
      {visibleCount < visible.length ? <button className="button-secondary" type="button" onClick={() => setVisibleCount((count) => count + 25)}>Load 25 more</button> : null}
    </section> : <ProductEmptyState title="No matching listings" description="Try a broader role, employer or location." />}
  </main>;
}
