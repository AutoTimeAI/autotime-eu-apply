import { z } from "zod"
import type { ReadinessResult } from "shared"

type QueryResult = PromiseLike<{ data: unknown; error: { message?: string } | null }>
export interface MobilityGovernanceClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        order(column: string, options: { ascending: boolean }): {
          limit(count: number): { maybeSingle(): QueryResult }
        }
      }
    }
  }
}

const rowSchema = z.object({
  id: z.string().uuid(), rule_bundle_version_id: z.string().uuid(),
  expert_signoff_id: z.string().uuid().nullable(),
  state: z.enum(["quarantined", "research", "information_only", "conditional", "approved"]),
  score: z.number().int().min(0).max(100),
  output_permission: z.enum(["blocked", "information_only", "conditional", "definitive"]),
  reason_codes: z.array(z.string()), evaluated_at: z.string().datetime(),
  mobility_rule_bundle_versions: z.union([
    z.object({ rules: z.unknown() }),
    z.array(z.object({ rules: z.unknown() })).length(1),
  ]).optional(),
})
export interface GovernedReadiness { snapshotId: string; ruleBundleVersionId: string; expertSignoffId: string | null; evaluatedAt: string; executableRules: unknown | null; readiness: ReadinessResult }
const aliases: Record<string, string> = { germany: "DE", deutschland: "DE", netherlands: "NL", nederland: "NL", ireland: "IE", "united kingdom": "GB", uk: "GB", france: "FR" }
export function resolveGovernanceCountryCode(country: string): string | null {
  const key = country.trim().toLowerCase()
  return /^[a-z]{2}$/.test(key) ? key.toUpperCase() : (aliases[key] ?? null)
}
export async function loadCurrentMobilityReadiness(client: MobilityGovernanceClient, country: string): Promise<GovernedReadiness | null> {
  const countryCode = resolveGovernanceCountryCode(country)
  if (!countryCode) return null
  const { data, error } = await client.from("mobility_country_readiness_snapshots")
    .select("id,rule_bundle_version_id,expert_signoff_id,state,score,output_permission,reason_codes,evaluated_at,mobility_rule_bundle_versions!rule_bundle_version_id(rules)")
    .eq("country_code", countryCode).order("evaluated_at", { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error("Mobility governance readiness could not be loaded")
  if (!data) return null
  const row = rowSchema.parse(data)
  const relatedBundle = Array.isArray(row.mobility_rule_bundle_versions)
    ? row.mobility_rule_bundle_versions[0]
    : row.mobility_rule_bundle_versions
  return { snapshotId: row.id, ruleBundleVersionId: row.rule_bundle_version_id, expertSignoffId: row.expert_signoff_id, evaluatedAt: row.evaluated_at,
    executableRules: relatedBundle?.rules ?? null,
    readiness: { state: row.state, score: row.score, outputPermission: row.output_permission, reasonCodes: row.reason_codes } }
}
export const missingGovernanceReadiness: ReadinessResult = { state: "research", score: 0, outputPermission: "blocked", reasonCodes: ["GOVERNED_READINESS_NOT_AVAILABLE"] }

export function isMobilityGovernanceEnforcementEnabled(
  value = process.env.MOBILITY_GOVERNANCE_ENFORCEMENT_ENABLED,
): boolean {
  return value === "true"
}

/**
 * Separate from enforcement on purpose: this only controls whether a real
 * decision gets written to mobility_decision_records for the validation
 * pilot's evaluation corpus. It never feeds into orchestrateJobDecision and
 * can never change what a candidate sees - only isMobilityGovernanceEnforcementEnabled
 * does that, by design (see docs/reference/landwell-master-execution-plan.md §4).
 */
export function isMobilityDecisionRecordingEnabled(
  value = process.env.MOBILITY_DECISION_RECORDING_ENABLED,
): boolean {
  return value === "true"
}

/**
 * Recorded decisions require a real, existing mobility_rule_bundle_version
 * row (a NOT NULL foreign key on mobility_decision_records). This bundle is
 * deliberately staged in 'draft' state - never activated, never used by
 * loadCurrentMobilityReadiness/mobility_country_readiness_snapshots - so
 * recording pilot decisions can never affect the real governance/enforcement
 * path. See supabase/migrations/20260916120000_seed_pilot_observation_rule_bundle.sql.
 */
export const PILOT_OBSERVATION_RULE_BUNDLE_ID = "pilot-observation"

export interface RuleBundleVersionLookupClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: number): { maybeSingle(): QueryResult }
      }
    }
  }
}

export async function loadPilotObservationRuleBundleVersionId(
  client: RuleBundleVersionLookupClient,
): Promise<string | null> {
  const { data, error } = await client.from("mobility_rule_bundle_versions")
    .select("id")
    .eq("bundle_id", PILOT_OBSERVATION_RULE_BUNDLE_ID)
    .eq("version", 1)
    .maybeSingle()
  if (error || !data) return null
  const id = (data as { id?: unknown }).id
  return typeof id === "string" ? id : null
}
