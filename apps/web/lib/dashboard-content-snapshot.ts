import { applicationContentSnapshotSchema, type ApplicationContentSnapshot } from "shared"

// A row's content_snapshot can be present but incomplete - e.g. seeded or
// written before applicationContentSnapshotSchema required every field.
// Parsed separately from the rest of the row so one bad snapshot drops
// just that field (logged for follow-up) instead of failing the whole
// application - and by extension the whole GET /api/sync/dashboard
// response, since every application in the account is read in one call.
export function parseContentSnapshot(
  applicationId: string,
  value: unknown,
): ApplicationContentSnapshot | undefined {
  if (value == null) return undefined
  const parsed = applicationContentSnapshotSchema.safeParse(value)
  if (!parsed.success) {
    console.warn(
      `autotime_diagnostic: dropping unparseable content_snapshot for application ${applicationId}`,
      parsed.error.issues,
    )
    return undefined
  }
  return parsed.data
}
