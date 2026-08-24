/**
 * Builds the admin overview dashboard's headline metrics by counting rows
 * across several tables (beta users, workflow activity events, provider
 * failures, unresolved feedback), while explicitly marking metrics with no
 * canonical current data source as "Not instrumented" rather than guessing.
 * Fails closed per-metric: any single count query failing degrades that one
 * metric instead of the whole overview.
 */
import "server-only";
import { createAdminClient } from "./supabase/admin";

export type AdminMetric = {
  label: string;
  note: string;
  source: string;
  value: string;
};

export type AdminOverview = {
  checkedAt: string;
  metrics: AdminMetric[];
  recentActions: {
    status: "available" | "unauthorised" | "unavailable";
    items: Array<{
      action: string;
      createdAt: string;
      targetType: string;
    }>;
  };
  warnings: string[];
};

/**
 * Runs a head-only exact-count query against `table`, optionally narrowed
 * by `configure`. Returns null (not a thrown error) if the query errors or
 * the table/RPC throws, so a missing/unavailable table degrades its metric
 * to "Not instrumented" instead of failing the whole overview.
 */
async function countRows(
  table: Parameters<ReturnType<typeof createAdminClient>["from"]>[0],
  configure?: (query: any) => any,
): Promise<number | null> {
  try {
    let query = createAdminClient()
      .from(table)
      .select("*", { count: "exact", head: true });
    if (configure) query = configure(query);
    const { count, error } = await query;
    return error ? null : count;
  } catch {
    return null;
  }
}

const displayCount = (value: number | null) =>
  value === null ? "Not instrumented" : String(value);

/**
 * Assembles the full admin overview: instrumented metrics (or "Not
 * instrumented" placeholders where no canonical source exists yet),
 * optionally the 10 most recent audit-log actions, and a warnings list that
 * flags when one or more metrics failed to load. `includeAudit` should only
 * be true when the caller has already checked the "audit:read" permission -
 * this function does not check it itself, it only reports
 * "unauthorised"/"unavailable" status for the recentActions block based on
 * the flag and query outcome.
 */
export async function getAdminOverview(
  includeAudit = false,
): Promise<AdminOverview> {
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [
    betaUsers,
    analysedEvents,
    preparedEvents,
    submittedEvents,
    providerFailures,
    unresolvedFeedback,
  ] = await Promise.all([
    countRows("beta_access"),
    countRows("workflow_operational_events", (query) =>
      query.eq("event", "job_analysed"),
    ),
    countRows("workflow_operational_events", (query) =>
      query.eq("event", "application_prepared"),
    ),
    countRows("workflow_operational_events", (query) =>
      query.eq("event", "application_submitted"),
    ),
    countRows("operational_logs", (query) =>
      query
        .eq("area", "ai")
        .in("level", ["warn", "severe"])
        .gte("created_at", dayAgo),
    ),
    countRows("beta_feedback", (query) =>
      query.in("status", ["New", "Reviewing", "Planned"]),
    ),
  ]);

  const { data: recentActions, error: actionsError } = includeAudit
    ? await createAdminClient()
        .from("admin_audit_events")
        .select("action, target_type, created_at")
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: null, error: null };

  const eventNote =
    "Privacy-safe workflow activity events; these are not durable job or application records.";
  const unavailable = (label: string, note: string): AdminMetric => ({
    label,
    note,
    source: "No canonical current source",
    value: "Not instrumented",
  });
  const metric = (
    label: string,
    value: number | null,
    source: string,
    note: string,
  ): AdminMetric => ({ label, note, source, value: displayCount(value) });

  return {
    checkedAt: new Date().toISOString(),
    metrics: [
      metric(
        "Beta users",
        betaUsers,
        "beta_access",
        "Current beta-access rows.",
      ),
      unavailable(
        "Onboarding completed",
        "Onboarding currently lives in versioned browser development storage.",
      ),
      unavailable(
        "Users with a career lane",
        "Career lanes currently live in versioned browser development storage.",
      ),
      metric(
        "Jobs analysed",
        analysedEvents,
        "workflow_operational_events",
        eventNote,
      ),
      metric(
        "Applications prepared",
        preparedEvents,
        "workflow_operational_events",
        eventNote,
      ),
      metric(
        "Applications marked submitted",
        submittedEvents,
        "workflow_operational_events",
        eventNote,
      ),
      unavailable(
        "Interviews recorded",
        "No canonical current interview-event source exists.",
      ),
      metric(
        "Recent provider failures",
        providerFailures,
        "operational_logs (last 24 hours)",
        "Privacy-safe warning and severe AI operation logs.",
      ),
      unavailable(
        "Market-data freshness",
        "No governed refresh has produced canonical freshness metadata.",
      ),
      metric(
        "Unresolved feedback",
        unresolvedFeedback,
        "beta_feedback",
        "New, Reviewing, or Planned feedback rows.",
      ),
    ],
    recentActions: !includeAudit
      ? { status: "unauthorised", items: [] }
      : actionsError
        ? { status: "unavailable", items: [] }
        : {
            status: "available",
            items: (recentActions ?? []).map((row) => ({
              action: row.action,
              createdAt: row.created_at,
              targetType: row.target_type,
            })),
          },
    warnings: [
      betaUsers,
      analysedEvents,
      preparedEvents,
      submittedEvents,
      providerFailures,
      unresolvedFeedback,
    ].some((value) => value === null)
      ? [
          "One or more review-only schemas are not available. Metrics fail closed as Not instrumented.",
        ]
      : [],
  };
}
