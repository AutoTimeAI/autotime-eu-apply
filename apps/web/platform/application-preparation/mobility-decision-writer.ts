import { createHash } from "node:crypto"
import type { ApplicationDecisionResult, ApplicationPreparationInput } from "../../domains/application-preparation/prepare-application-kit.ts"

export interface MobilityDecisionWriteClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{
    data: unknown
    error: { message?: string } | null
  }>
}

/**
 * References only - never a second copy of candidate data. Empty arrays are
 * valid and expected today: the live decision path does not yet track which
 * specific candidate-evidence versions or external-assessment snapshots it
 * evaluated (see the replay-worker investigation, 2026-09-12), so every
 * envelope currently records "no tracked inputs" rather than omitting the
 * envelope. That keeps one envelope per decision from day one, ready to be
 * populated as claim-aware decision logic lands, without a schema change.
 */
export interface ReplayInputReferences {
  candidateEvidenceVersionIds?: string[]
  externalAssessmentSnapshotIds?: string[]
}

type CandidateDecisionFact = {
  subject: string
  sourceKind: "candidate_profile" | "cv"
  sourceLabel: string
  sensitivity: "ordinary" | "sensitive"
  value: unknown
}

/**
 * The complete non-identity profile surface read by the fit and mobility
 * engines. Values are used only to produce hashes; plaintext is never written
 * to the provenance tables.
 */
export function candidateDecisionFacts(input: ApplicationPreparationInput): CandidateDecisionFact[] {
  const { profile } = input
  return [
    { subject: "current_country", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: current country", sensitivity: "sensitive", value: profile.currentCountry },
    { subject: "target_countries", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: target countries", sensitivity: "ordinary", value: profile.targetCountries },
    { subject: "target_roles", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: target roles", sensitivity: "ordinary", value: profile.targetRoles },
    { subject: "work_right_details", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: work-right details", sensitivity: "sensitive", value: profile.workRightDetails },
    { subject: "sponsorship_needed", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: sponsorship need", sensitivity: "sensitive", value: profile.sponsorshipNeeded },
    { subject: "relocation_willingness", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: relocation willingness", sensitivity: "ordinary", value: profile.relocationWillingness },
    { subject: "salary_expectation", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: salary expectation", sensitivity: "sensitive", value: profile.salaryExpectation },
    { subject: "notice_period", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: notice period", sensitivity: "ordinary", value: profile.noticePeriod },
    { subject: "base_cv", sourceKind: "cv", sourceLabel: "Canonical CV supplied by candidate", sensitivity: "sensitive", value: profile.baseCvText },
    { subject: "project_summaries", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: project summaries", sensitivity: "ordinary", value: profile.projectSummaries },
    { subject: "experience_highlights", sourceKind: "candidate_profile", sourceLabel: "Candidate profile: experience highlights", sensitivity: "ordinary", value: profile.experienceHighlights },
  ]
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

function mobilityState(decision: ApplicationDecisionResult["decision"]) {
  if (decision === "Skip") return "not_supported"
  if (decision === "Investigate first" || decision === "Insufficient evidence") return "insufficient_evidence"
  return "potential_match"
}

export async function appendGovernedMobilityDecision({ client, userId, input, decision, recordedAt = new Date().toISOString(), replayInputs = {} }: {
  client: MobilityDecisionWriteClient; userId: string; input: ApplicationPreparationInput;
  decision: ApplicationDecisionResult; recordedAt?: string; replayInputs?: ReplayInputReferences;
}): Promise<{ vacancySnapshotId: string; decisionRecordId: string } | null> {
  if (!decision.governance) return null
  const vacancyPayload = {
    title: input.job.jobTitle,
    company: input.job.company,
    location: input.job.location,
    description: input.job.jobDescription,
  }
  const reasonCodes = [...new Set([
    ...decision.governance.reasonCodes,
    ...decision.blockers.map((_, index) => `DECISION_BLOCKER_${index + 1}`),
    ...decision.missingEvidence.map((_, index) => `MISSING_EVIDENCE_${index + 1}`),
  ])]
  if (!reasonCodes.length) reasonCodes.push("GOVERNED_ASSESSMENT_COMPLETE")
  const canonicalOutput = {
    decision: decision.decision,
    blockers: [...decision.blockers].sort(),
    missingEvidence: [...decision.missingEvidence].sort(),
    readinessSnapshotId: decision.governance.readinessSnapshotId,
    readinessState: decision.governance.readinessState,
    targetCountry: decision.governance.targetCountry,
    executableEvaluation: decision.governance.executableEvaluation ?? null,
  }
  const externalAssessmentSnapshotIds = replayInputs.externalAssessmentSnapshotIds ?? []
  const candidateFacts = candidateDecisionFacts(input).map(({ value, ...fact }) => ({
    ...fact,
    valueSha256: sha256(stable(value)),
  }))
  const result = await client.rpc("append_atomic_mobility_decision_receipt", {
    p_user_id: userId,
    p_candidate_facts: candidateFacts,
    p_vacancy: {
      sourceUrl: input.job.jobUrl || "",
      employingEntityClaim: input.job.company || "",
      title: input.job.jobTitle,
      country: decision.governance.targetCountry,
      contentSha256: sha256(stable(vacancyPayload)),
    },
    p_decision: {
      ruleBundleVersionId: decision.governance.ruleBundleVersionId,
      mobilityState: mobilityState(decision.decision),
      employerState: "not_checked",
      outputPermission: decision.governance.outputPermission,
      reasonCodes,
      canonicalOutput,
      canonicalOutputSha256: sha256(stable(canonicalOutput)),
      targetCountry: decision.governance.targetCountry,
    },
    p_external_assessment_snapshot_ids: externalAssessmentSnapshotIds,
    p_recorded_at: recordedAt,
  })
  if (result.error) throw new Error("Governed mobility decision receipt could not be recorded")
  const row = Array.isArray(result.data) ? result.data[0] : result.data
  const vacancySnapshotId = (row as { vacancy_snapshot_id?: unknown } | null)?.vacancy_snapshot_id
  const decisionRecordId = (row as { decision_record_id?: unknown } | null)?.decision_record_id
  if (typeof vacancySnapshotId !== "string" || typeof decisionRecordId !== "string")
    throw new Error("Governed mobility decision receipt returned no identifiers")
  return { vacancySnapshotId, decisionRecordId }
}
