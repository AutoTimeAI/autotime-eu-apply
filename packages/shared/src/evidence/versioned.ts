import { z } from "zod"

const identifierSchema = z.string().trim().min(1).max(160)
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/)
const timestampSchema = z.string().datetime({ offset: true })

export const mobilitySourceClassSchema = z.enum([
  "legislation",
  "administrative_guidance",
  "amount_or_statistic",
  "register_or_list",
  "official_form",
  "other_official"
])

export const mobilitySourceDocumentSchema = z.object({
  id: identifierSchema,
  canonicalUrl: z.string().url(),
  publisher: z.string().trim().min(1).max(240),
  jurisdiction: z.string().trim().min(1).max(120),
  sourceClass: mobilitySourceClassSchema
})

export const mobilitySourceVersionSchema = z
  .object({
    id: identifierSchema,
    sourceDocumentId: identifierSchema,
    version: z.number().int().positive(),
    retrievedAt: timestampSchema,
    publishedAt: timestampSchema.optional(),
    effectiveFrom: timestampSchema.optional(),
    effectiveTo: timestampSchema.optional(),
    expiresAt: timestampSchema.optional(),
    language: z.string().trim().min(2).max(35),
    httpStatus: z.number().int().min(100).max(599),
    rawSha256: sha256Schema,
    normalizedSha256: sha256Schema,
    snapshotUri: z.string().url(),
    redirectChain: z.array(z.string().url()).default([]),
    parserVersion: identifierSchema,
    normalizerVersion: identifierSchema
  })
  .superRefine((value, context) => {
    if (
      value.effectiveFrom &&
      value.effectiveTo &&
      Date.parse(value.effectiveTo) <= Date.parse(value.effectiveFrom)
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "effectiveTo must be later than effectiveFrom"
      })
    }
  })

export const mobilityClaimStateSchema = z.enum([
  "draft",
  "review_required",
  "approved",
  "quarantined",
  "superseded",
  "withdrawn"
])

export const mobilityClaimVersionSchema = z
  .object({
    id: identifierSchema,
    claimId: identifierSchema,
    version: z.number().int().positive(),
    statement: z.string().trim().min(1).max(20_000),
    claimType: z.enum(["fact", "derived_fact", "interpretation"]),
    sourceSpanIds: z.array(identifierSchema).min(1),
    effectiveFrom: timestampSchema.optional(),
    effectiveTo: timestampSchema.optional(),
    confidence: z.enum(["high", "medium", "low"]),
    state: mobilityClaimStateSchema,
    predecessorVersionId: identifierSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.version === 1 && value.predecessorVersionId) {
      context.addIssue({
        code: "custom",
        path: ["predecessorVersionId"],
        message: "a first version cannot have a predecessor"
      })
    }
    if (value.version > 1 && !value.predecessorVersionId) {
      context.addIssue({
        code: "custom",
        path: ["predecessorVersionId"],
        message: "successor claim versions require a predecessor"
      })
    }
  })

export const mobilityRuleBundleStateSchema = z.enum([
  "draft",
  "review_required",
  "approved",
  "active",
  "quarantined",
  "superseded",
  "withdrawn"
])

export const mobilityRuleBundleVersionSchema = z.object({
  id: identifierSchema,
  bundleId: identifierSchema,
  version: z.number().int().positive(),
  jurisdiction: z.string().trim().min(1).max(120),
  route: z.string().trim().min(1).max(240),
  state: mobilityRuleBundleStateSchema,
  effectiveFrom: timestampSchema.optional(),
  effectiveTo: timestampSchema.optional(),
  criticalClaimVersionIds: z.array(identifierSchema).min(1),
  evaluationCaseIds: z.array(identifierSchema).min(1)
})

export type MobilitySourceDocument = z.infer<
  typeof mobilitySourceDocumentSchema
>
export type MobilitySourceVersion = z.infer<typeof mobilitySourceVersionSchema>
export type MobilityClaimVersion = z.infer<typeof mobilityClaimVersionSchema>
export type MobilityRuleBundleVersion = z.infer<
  typeof mobilityRuleBundleVersionSchema
>
