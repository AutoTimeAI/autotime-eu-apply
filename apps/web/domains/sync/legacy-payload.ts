export function normalizeLegacyApplicationStatus(status: unknown) {
  return status === "Applying"
    ? "Ready to apply"
    : status === "Closed"
      ? "Archived"
      : status
}

export function normalizeLegacyDashboardPayload(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    return value
  }

  const record = value as Record<string, unknown>
  const normalizeItems = (items: unknown) =>
    Array.isArray(items)
      ? items.map((item) =>
          typeof item === "object" && item !== null
            ? {
                ...item,
                status: normalizeLegacyApplicationStatus(
                  (item as Record<string, unknown>).status,
                ),
              }
            : item,
        )
      : items

  return {
    ...record,
    applications: normalizeItems(record.applications),
    outcomeRecords: normalizeItems(record.outcomeRecords),
  }
}
