import extensionConnectionConfig from "../../../config/monitoring/extension-connection-flow.json"
import loggingConfig from "../../../config/monitoring/logging.json"
import { getEnvReadiness } from "./diagnostics"
import { createAdminClient } from "./supabase/admin"

type StatusTone = "healthy" | "warning" | "critical"

type HealthCard = {
  detail: string
  label: string
  status: StatusTone
  value: string
}

type CountCard = {
  label: string
  value: number | null
}

type QueryResult<T> = {
  data: T
  error: string | null
}

export type AdminOverview = {
  checkedAt: string
  config: {
    extensionConnection: typeof extensionConnectionConfig
    logging: typeof loggingConfig
  }
  counts: CountCard[]
  health: HealthCard[]
  recentAiUsage: Array<{
    costUsd: number
    createdAt: string
    feature: string
    model: string
    tokens: number
  }>
  recentExtensionConnections: Array<{
    browserLabel: string | null
    extensionId: string | null
    lastConnectedAt: string
    lastSyncedAt: string | null
    revokedAt: string | null
    userId: string
  }>
  recentSyncEvents: Array<{
    action: string
    createdAt: string
    entityId: string
    entityType: string
    message: string
    sourceSurface: string
    userId: string
  }>
  logs: Array<{
    area: string
    event: string
    message: string
    severity: "severe" | "warn" | "info"
    timestamp: string
  }>
  warnings: string[]
}

async function safeQuery<T>(
  fallback: T,
  query: () => Promise<T>
): Promise<QueryResult<T>> {
  try {
    return {
      data: await query(),
      error: null
    }
  } catch (error: unknown) {
    return {
      data: fallback,
      error: error instanceof Error ? error.message : "Unknown admin query error"
    }
  }
}

async function getTableCount(table: Parameters<ReturnType<typeof createAdminClient>["from"]>[0]) {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

function formatLatency(startedAt: number): string {
  return `${Date.now() - startedAt}ms`
}

function mapStatusToLogSeverity(status: StatusTone): AdminOverview["logs"][number]["severity"] {
  if (status === "critical") {
    return "severe"
  }

  if (status === "warning") {
    return "warn"
  }

  return "info"
}

function buildAdminLogs({
  checkedAt,
  health,
  recentAiUsage,
  recentExtensionConnections,
  recentSyncEvents,
  warnings
}: {
  checkedAt: string
  health: HealthCard[]
  recentAiUsage: AdminOverview["recentAiUsage"]
  recentExtensionConnections: AdminOverview["recentExtensionConnections"]
  recentSyncEvents: AdminOverview["recentSyncEvents"]
  warnings: string[]
}): AdminOverview["logs"] {
  const warningLogs = warnings.map((warning, index) => ({
    area: "admin",
    event: "admin-query-warning",
    message: warning,
    severity: loggingConfig.rules.fallback as AdminOverview["logs"][number]["severity"],
    timestamp: new Date(Date.now() - index).toISOString()
  }))
  const healthLogs = health.map((item, index) => ({
    area: "health",
    event: item.label,
    message: item.detail,
    severity: mapStatusToLogSeverity(item.status),
    timestamp: new Date(Date.parse(checkedAt) - index).toISOString()
  }))
  const extensionLogs = recentExtensionConnections.map((item) => ({
    area: "extension",
    event: item.revokedAt ? "extension-revoked" : "extension-connected",
    message: item.revokedAt
      ? "Extension connection is revoked."
      : item.lastSyncedAt
        ? "Extension connected and sync timestamp exists."
        : "Extension connected; no sync timestamp yet.",
    severity: item.revokedAt ? ("warn" as const) : ("info" as const),
    timestamp: item.revokedAt ?? item.lastSyncedAt ?? item.lastConnectedAt
  }))
  const syncLogs = recentSyncEvents.map((item) => ({
    area: "sync",
    event: `${item.entityType}.${item.action}`,
    message: item.message,
    severity: "info" as const,
    timestamp: item.createdAt
  }))
  const aiLogs = recentAiUsage.map((item) => ({
    area: "ai",
    event: item.feature,
    message: `${item.model} used ${item.tokens} tokens.`,
    severity: "info" as const,
    timestamp: item.createdAt
  }))

  return [
    ...warningLogs,
    ...healthLogs,
    ...extensionLogs,
    ...syncLogs,
    ...aiLogs
  ]
    .sort(
      (left, right) =>
        Date.parse(right.timestamp) - Date.parse(left.timestamp)
    )
    .slice(0, 30)
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const env = getEnvReadiness()
  const requiredEnvReady = env
    .filter((item) => item.required)
    .every((item) => item.configured)
  const warnings: string[] = []

  const counts = await safeQuery<CountCard[]>([], async () =>
    Promise.all([
      getTableCount("user_accounts").then((value) => ({
        label: "Accounts",
        value
      })),
      getTableCount("subscriptions").then((value) => ({
        label: "Subscriptions",
        value
      })),
      getTableCount("applications").then((value) => ({
        label: "Tracked jobs",
        value
      })),
      getTableCount("sync_events").then((value) => ({
        label: "Sync events",
        value
      })),
      getTableCount("extension_connections").then((value) => ({
        label: "Extension connects",
        value
      })),
      getTableCount("ai_usage").then((value) => ({
        label: "AI usage rows",
        value
      }))
    ])
  )

  const dbProbe = await safeQuery("not checked", async () => {
    const startedAt = Date.now()
    await getTableCount("user_accounts")
    return formatLatency(startedAt)
  })

  const supabase = createAdminClient()

  const recentExtensionConnections = await safeQuery([], async () => {
    const { data, error } = await supabase
      .from("extension_connections")
      .select(
        "user_id, extension_id, browser_label, last_connected_at, last_synced_at, revoked_at"
      )
      .order("last_connected_at", { ascending: false })
      .limit(8)

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map((row) => ({
      browserLabel: row.browser_label,
      extensionId: row.extension_id,
      lastConnectedAt: row.last_connected_at,
      lastSyncedAt: row.last_synced_at,
      revokedAt: row.revoked_at,
      userId: row.user_id
    }))
  })

  const recentSyncEvents = await safeQuery([], async () => {
    const { data, error } = await supabase
      .from("sync_events")
      .select(
        "user_id, entity_type, entity_id, source_surface, action, message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(12)

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map((row) => ({
      action: row.action,
      createdAt: row.created_at,
      entityId: row.entity_id,
      entityType: row.entity_type,
      message: row.message,
      sourceSurface: row.source_surface,
      userId: row.user_id
    }))
  })

  const recentAiUsage = await safeQuery([], async () => {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("feature, model, prompt_tokens, completion_tokens, cost_usd, created_at")
      .order("created_at", { ascending: false })
      .limit(8)

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map((row) => ({
      costUsd: row.cost_usd,
      createdAt: row.created_at,
      feature: row.feature,
      model: row.model,
      tokens: row.prompt_tokens + row.completion_tokens
    }))
  })

  for (const result of [
    counts,
    dbProbe,
    recentExtensionConnections,
    recentSyncEvents,
    recentAiUsage
  ]) {
    if (result.error) {
      warnings.push(result.error)
    }
  }

  const activeExtensionConnections = recentExtensionConnections.data.filter(
    (item) => !item.revokedAt
  ).length

  const health: HealthCard[] = [
    {
      detail: requiredEnvReady
        ? "Required runtime variables are configured."
        : "One or more required runtime variables are missing.",
      label: "Web runtime",
      status: requiredEnvReady ? "healthy" : "critical",
      value: requiredEnvReady ? "Ready" : "Missing config"
    },
    {
      detail: dbProbe.error
        ? dbProbe.error
        : `Service role database probe completed in ${dbProbe.data}.`,
      label: "Database",
      status: dbProbe.error ? "critical" : "healthy",
      value: dbProbe.error ? "Failed" : "Reachable"
    },
    {
      detail:
        activeExtensionConnections > 0
          ? "At least one active extension connection exists."
          : "No active extension connections have been recorded yet.",
      label: "Extension",
      status: activeExtensionConnections > 0 ? "healthy" : "warning",
      value: `${activeExtensionConnections} active`
    },
    {
      detail: "Connection events and failure meanings are loaded from config.",
      label: "Monitoring config",
      status: "healthy",
      value: extensionConnectionConfig.flowId
    }
  ]
  const checkedAt = new Date().toISOString()

  return {
    checkedAt,
    config: {
      extensionConnection: extensionConnectionConfig,
      logging: loggingConfig
    },
    counts: counts.data,
    health,
    logs: buildAdminLogs({
      checkedAt,
      health,
      recentAiUsage: recentAiUsage.data,
      recentExtensionConnections: recentExtensionConnections.data,
      recentSyncEvents: recentSyncEvents.data,
      warnings
    }),
    recentAiUsage: recentAiUsage.data,
    recentExtensionConnections: recentExtensionConnections.data,
    recentSyncEvents: recentSyncEvents.data,
    warnings
  }
}
