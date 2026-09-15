import { type NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { classifySourceChange } from "shared"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { captureOfficialSourceArtifact, isAllowedOfficialSource } from "../../../../platform/mobility-source-monitor/capture"
import { archiveOfficialSource } from "../../../../platform/mobility-source-monitor/archive"
import { resolveSourceJurisdictionCode } from "../../../../platform/mobility-source-monitor/jurisdiction"
import { recordInitialSourceBaseline, recordSourceObservationChange, recordUnavailableInitialSource } from "../../../../platform/mobility-source-monitor/writer"

export const maxDuration = 60
type UntypedClient = SupabaseClient<any>
const sourceBatchSize = 20
const sourceConcurrency = 4

function authorised(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!expected || !actual) return false
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(actual)
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes)
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const requestId = request.headers.get("x-vercel-id")
  console.info(JSON.stringify({ level: "info", event: "mobility_source_monitor_started", requestId }))
  if (!authorised(request)) {
    console.warn(JSON.stringify({ level: "warn", event: "mobility_source_monitor_rejected", requestId, reason: "unauthorised" }))
    return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 })
  }
  const allowedHosts = new Set((process.env.MOBILITY_SOURCE_HOST_ALLOWLIST ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean))
  if (!allowedHosts.size) {
    console.error(JSON.stringify({ level: "error", event: "mobility_source_monitor_failed", requestId, reason: "allowlist_missing", durationMs: Date.now() - startedAt }))
    return NextResponse.json({ ok: false, error: "Source host allowlist is not configured" }, { status: 503 })
  }

  const db = createAdminClient() as unknown as UntypedClient
  const sourceCountResult = await db.from("mobility_source_documents").select("id", { count: "exact", head: true })
  if (sourceCountResult.error || sourceCountResult.count === null) {
    console.error(JSON.stringify({ level: "error", event: "mobility_source_monitor_failed", requestId, reason: "source_registry_unavailable", durationMs: Date.now() - startedAt }))
    return NextResponse.json({ ok: false, error: "Source registry unavailable" }, { status: 503 })
  }
  const sourceCount = sourceCountResult.count
  const utcDay = Math.floor(Date.now() / 86_400_000)
  const batchOffset = sourceCount > 0 ? (utcDay * sourceBatchSize) % sourceCount : 0
  const firstBatchEnd = Math.min(batchOffset + sourceBatchSize, sourceCount) - 1
  const firstBatch = firstBatchEnd >= batchOffset
    ? await db.from("mobility_source_documents").select("id,canonical_url,jurisdiction").order("id").range(batchOffset, firstBatchEnd)
    : { data: [], error: null }
  if (firstBatch.error) {
    console.error(JSON.stringify({ level: "error", event: "mobility_source_monitor_failed", requestId, reason: "source_registry_unavailable", durationMs: Date.now() - startedAt }))
    return NextResponse.json({ ok: false, error: "Source registry unavailable" }, { status: 503 })
  }
  const remaining = Math.min(sourceBatchSize, sourceCount) - (firstBatch.data?.length ?? 0)
  const wrappedBatch = remaining > 0
    ? await db.from("mobility_source_documents").select("id,canonical_url,jurisdiction").order("id").range(0, remaining - 1)
    : { data: [], error: null }
  if (wrappedBatch.error) {
    console.error(JSON.stringify({ level: "error", event: "mobility_source_monitor_failed", requestId, reason: "source_registry_unavailable", durationMs: Date.now() - startedAt }))
    return NextResponse.json({ ok: false, error: "Source registry unavailable" }, { status: 503 })
  }
  const documents = [...(firstBatch.data ?? []), ...(wrappedBatch.data ?? [])]
  const results = new Array<{ sourceDocumentId: string; status: string }>(documents.length)
  let nextSourceIndex = 0
  async function processSources() {
    while (nextSourceIndex < documents.length) {
      const sourceIndex = nextSourceIndex
      nextSourceIndex += 1
      const document = documents[sourceIndex]
    const url = String(document.canonical_url)
    const sourceDocumentId = String(document.id)
    try {
      const countryCode = resolveSourceJurisdictionCode(document.jurisdiction)
      if (!countryCode || !isAllowedOfficialSource(url, allowedHosts)) {
        results[sourceIndex] = { sourceDocumentId, status: "skipped_not_allowlisted" }
        continue
      }
      const previousResult = await db.from("mobility_source_versions")
        .select("id,version,language,http_status,raw_sha256,normalized_sha256,parser_version,normalizer_version")
        .eq("source_document_id", sourceDocumentId).order("version", { ascending: false }).limit(1).maybeSingle()
      if (previousResult.error || !previousResult.data) {
        const capturedAt = new Date().toISOString()
        const artifact = await captureOfficialSourceArtifact(url, allowedHosts)
        if (!artifact.content || !artifact.observation.rawSha256 || !artifact.observation.normalizedSha256) {
          await recordUnavailableInitialSource({ client: db, sourceDocumentId, countryCode, observedAt: capturedAt })
          results[sourceIndex] = { sourceDocumentId, status: "baseline_capture_failed" }
          continue
        }
        const snapshotUri = await archiveOfficialSource({ client: db, sourceDocumentId, content: artifact.content, contentType: artifact.contentType, rawSha256: artifact.observation.rawSha256, capturedAt })
        await recordInitialSourceBaseline({ client: db, sourceDocumentId, countryCode, observation: artifact.observation, snapshotUri, language: artifact.language, observedAt: capturedAt })
        results[sourceIndex] = { sourceDocumentId, status: "baseline_quarantined_for_review" }
        continue
      }
      const previous = {
        available: Number(previousResult.data.http_status) < 400,
        httpStatus: Number(previousResult.data.http_status),
        rawSha256: String(previousResult.data.raw_sha256),
        normalizedSha256: String(previousResult.data.normalized_sha256),
        parserVersion: String(previousResult.data.parser_version),
        normalizerVersion: String(previousResult.data.normalizer_version),
      }
      const capturedAt = new Date().toISOString()
      const artifact = await captureOfficialSourceArtifact(url, allowedHosts)
      const current = artifact.observation
      const classification = classifySourceChange(previous, current)
      let observedVersion: { version: number; language: string; snapshotUri: string } | undefined
      if (classification.classification !== "unchanged" && current.rawSha256 && current.normalizedSha256 && artifact.content) {
        const snapshotUri = await archiveOfficialSource({
          client: db, sourceDocumentId, content: artifact.content,
          contentType: artifact.contentType, rawSha256: current.rawSha256,
          capturedAt,
        })
        observedVersion = { version: Number(previousResult.data.version) + 1, language: artifact.language === "und" ? String(previousResult.data.language) : artifact.language, snapshotUri }
      }
      const recorded = await recordSourceObservationChange({
        client: db, sourceDocumentId, previousVersionId: String(previousResult.data.id),
        observedVersionId: classification.classification === "unchanged" ? String(previousResult.data.id) : null,
        observedVersion, countryCode, previous, current, observedAt: capturedAt,
      })
      results[sourceIndex] = { sourceDocumentId, status: recorded.classification.classification }
    } catch {
      console.error(JSON.stringify({ level: "error", event: "mobility_source_monitor_source_failed", requestId, sourceDocumentId }))
      results[sourceIndex] = { sourceDocumentId, status: "source_monitor_failed" }
    }
    }
  }
  await Promise.all(Array.from({ length: Math.min(sourceConcurrency, documents.length) }, () => processSources()))
  const statusCounts = results.reduce<Record<string, number>>((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1
    return counts
  }, {})
  console.info(JSON.stringify({
    level: "info",
    event: "mobility_source_monitor_completed",
    requestId,
    checked: results.length,
    registered: sourceCount,
    batchOffset,
    statusCounts,
    durationMs: Date.now() - startedAt,
  }))
  const failed = results.filter((result) => result.status === "source_monitor_failed" || result.status === "baseline_capture_failed").length
  return NextResponse.json({ ok: failed === 0, checked: results.length, failed, results }, { status: failed === 0 ? 200 : 503 })
}
