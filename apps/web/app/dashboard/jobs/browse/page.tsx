/**
 * /dashboard/jobs/browse — aggregated job listings browser, separate from
 * the user's own tracked jobs workspace.
 *
 * Server component (`force-dynamic`, so it is never statically cached) that
 * queries the `job_listings` table for the 200 most recently posted rows
 * and renders them via `AggregatedJobsBrowser`. Any Supabase query error is
 * passed down as an `unavailable` message instead of throwing, so the page
 * still renders (with an empty list) if the query fails.
 */
import { createServerClient } from "../../../../lib/supabase/server";
import AggregatedJobsBrowser from "../../../../components/AggregatedJobsBrowser";

export const dynamic = "force-dynamic";

/**
 * Loads up to 200 aggregated job listings (newest `posted_date` first) from
 * Supabase and hands them, along with any query error message, to
 * `AggregatedJobsBrowser`.
 */
export default async function AggregatedJobsPage() {
  const client = await createServerClient();
  const { data, error } = await client
    .from("job_listings")
    .select(
      "id,title,company,location,url,posted_date,source,ats_platform,description_raw",
    )
    .order("posted_date", { ascending: false })
    .limit(200);
  return (
    <AggregatedJobsBrowser
      listings={data ?? []}
      unavailable={error?.message ?? null}
    />
  );
}
