import { createHash } from "node:crypto"

type WriteResult = PromiseLike<{ data: unknown; error: { message?: string } | null }>
export interface ExternalAssessmentWriteClient {
  from(table: string): {
    insert(value: Record<string, unknown>): {
      select(columns: string): { single(): WriteResult }
    }
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export async function recordExternalAssessmentSnapshot({
  client, provider, endpoint, request, response, httpStatus, covered, retrievedAt = new Date().toISOString(),
}: {
  client: ExternalAssessmentWriteClient
  provider: string
  endpoint: string
  request: unknown
  response: Record<string, unknown> | null
  httpStatus: number
  covered: boolean
  retrievedAt?: string
}): Promise<{ snapshotId: string } | null> {
  const insert = await client.from("mobility_external_assessment_snapshots").insert({
    provider,
    endpoint,
    request_sha256: sha256(stable(request)),
    response_sha256: sha256(stable(response)),
    http_status: httpStatus,
    covered,
    assessment: covered ? response : null,
    retrieved_at: retrievedAt,
  }).select("id").single()
  if (insert.error) return null
  const snapshotId = (insert.data as { id?: unknown } | null)?.id
  return typeof snapshotId === "string" ? { snapshotId } : null
}
