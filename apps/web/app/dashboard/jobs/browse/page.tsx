import { createServerClient } from "../../../../lib/supabase/server";
import AggregatedJobsBrowser from "../../../../components/AggregatedJobsBrowser";

export const dynamic = "force-dynamic";
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
