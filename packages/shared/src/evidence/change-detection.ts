import { z } from "zod"

export const sourceObservationSchema = z.object({
  available: z.boolean(), httpStatus: z.number().int().min(100).max(599).nullable(),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), normalizedSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  parserVersion: z.string().trim().min(1), normalizerVersion: z.string().trim().min(1)
})
export type SourceObservation = z.infer<typeof sourceObservationSchema>
export type SourceChangeClass = "unavailable" | "unchanged" | "transport_only" | "material_content" | "pipeline_changed"
export interface SourceChangeResult { classification: SourceChangeClass; quarantine: boolean; reviewRequired: boolean; reasonCodes: string[] }

export function classifySourceChange(previousRaw: SourceObservation, currentRaw: SourceObservation): SourceChangeResult {
  const previous = sourceObservationSchema.parse(previousRaw)
  const current = sourceObservationSchema.parse(currentRaw)
  if (!current.available || current.httpStatus === null || current.httpStatus >= 400 || !current.rawSha256 || !current.normalizedSha256)
    return { classification: "unavailable", quarantine: true, reviewRequired: true, reasonCodes: [current.available ? "SOURCE_CAPTURE_INCOMPLETE" : "SOURCE_UNAVAILABLE"] }
  if (previous.parserVersion !== current.parserVersion || previous.normalizerVersion !== current.normalizerVersion)
    return { classification: "pipeline_changed", quarantine: true, reviewRequired: true, reasonCodes: ["EXTRACTION_PIPELINE_CHANGED"] }
  if (previous.normalizedSha256 !== current.normalizedSha256)
    return { classification: "material_content", quarantine: true, reviewRequired: true, reasonCodes: ["NORMALIZED_CONTENT_CHANGED"] }
  if (previous.rawSha256 !== current.rawSha256)
    return { classification: "transport_only", quarantine: false, reviewRequired: false, reasonCodes: ["RAW_CHANGED_NORMALIZED_STABLE"] }
  return { classification: "unchanged", quarantine: false, reviewRequired: false, reasonCodes: [] }
}
