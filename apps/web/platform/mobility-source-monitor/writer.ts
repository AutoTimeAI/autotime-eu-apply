import { classifySourceChange, type SourceObservation } from "shared"

export interface SourceChangeWriteClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{
    data: unknown
    error: { message?: string } | null
  }>
}

export async function recordSourceObservationChange({
  client, sourceDocumentId, previousVersionId, observedVersionId,
  countryCode, previous, current, observedAt = new Date().toISOString(),
  observedVersion,
}: {
  client: SourceChangeWriteClient
  sourceDocumentId: string
  previousVersionId: string | null
  observedVersionId: string | null
  countryCode: string
  previous: SourceObservation
  current: SourceObservation
  observedAt?: string
  observedVersion?: { version: number; language: string; snapshotUri: string; redirectChain: unknown[] }
}): Promise<{ eventId: string; classification: ReturnType<typeof classifySourceChange> }> {
  const classification = classifySourceChange(previous, current)
  const result = await client.rpc("record_and_propagate_mobility_source_change", {
    p_source_document_id: sourceDocumentId,
    p_previous_version_id: previousVersionId,
    p_observed_version_id: observedVersionId,
    p_observed_version: observedVersion ? {
      ...observedVersion,
      httpStatus: current.httpStatus,
      rawSha256: current.rawSha256,
      normalizedSha256: current.normalizedSha256,
      parserVersion: current.parserVersion,
      normalizerVersion: current.normalizerVersion,
    } : null,
    p_country_code: countryCode.trim().toUpperCase(),
    p_classification: classification.classification,
    p_quarantine: classification.quarantine,
    p_review_required: classification.reviewRequired,
    p_reason_codes: classification.reasonCodes,
    p_observed_at: observedAt,
  })
  if (result.error) throw new Error("Mobility source-change event could not be recorded")
  if (typeof result.data !== "string") throw new Error("Mobility source-change event returned no identifier")
  return { eventId: result.data, classification }
}

export async function recordInitialSourceBaseline({ client, sourceDocumentId, countryCode, observation, snapshotUri, language, redirectChain, observedAt = new Date().toISOString() }: {
  client: SourceChangeWriteClient; sourceDocumentId: string; countryCode: string;
  observation: SourceObservation; snapshotUri: string; language: string; redirectChain: unknown[]; observedAt?: string
}): Promise<string> {
  if (!observation.available || !observation.rawSha256 || !observation.normalizedSha256 || observation.httpStatus === null)
    throw new Error("Initial mobility source baseline is incomplete")
  const result = await client.rpc("record_and_propagate_mobility_source_change", {
    p_source_document_id: sourceDocumentId,
    p_previous_version_id: null,
    p_observed_version_id: null,
    p_observed_version: { version: 1, language, snapshotUri, redirectChain, httpStatus: observation.httpStatus, rawSha256: observation.rawSha256, normalizedSha256: observation.normalizedSha256, parserVersion: observation.parserVersion, normalizerVersion: observation.normalizerVersion },
    p_country_code: countryCode.trim().toUpperCase(),
    p_classification: "pipeline_changed",
    p_quarantine: true,
    p_review_required: true,
    p_reason_codes: ["INITIAL_SOURCE_BASELINE_REVIEW_REQUIRED"],
    p_observed_at: observedAt,
  })
  if (result.error) throw new Error("Initial mobility source baseline could not be recorded")
  if (typeof result.data !== "string") throw new Error("Initial mobility source baseline returned no identifier")
  return result.data
}

export async function recordUnavailableInitialSource({ client, sourceDocumentId, countryCode, observedAt = new Date().toISOString() }: {
  client: SourceChangeWriteClient
  sourceDocumentId: string
  countryCode: string
  observedAt?: string
}): Promise<string> {
  const result = await client.rpc("record_and_propagate_mobility_source_change", {
    p_source_document_id: sourceDocumentId,
    p_previous_version_id: null,
    p_observed_version_id: null,
    p_observed_version: null,
    p_country_code: countryCode.trim().toUpperCase(),
    p_classification: "unavailable",
    p_quarantine: true,
    p_review_required: true,
    p_reason_codes: ["INITIAL_SOURCE_UNAVAILABLE"],
    p_observed_at: observedAt,
  })
  if (result.error) throw new Error("Initial unavailable source observation could not be recorded")
  if (typeof result.data !== "string") throw new Error("Initial unavailable source observation returned no identifier")
  return result.data
}
