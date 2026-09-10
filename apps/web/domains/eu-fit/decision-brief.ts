import type { AutoTimeFitReview, CompanionDashboardState, CountryFitEvaluation } from "shared"
import type { TrustState } from "../../platform/persistence/dashboard-preferences-storage"
import type {
  ContentGuardrail,
  DecisionBrief,
  OfficialSource,
  VerificationChecklistItem
} from "./types"

export function getDecisionBrief({
  autoTimeFitReview,
  targetCountry,
  marketLabel,
  urgencyGuidance,
  state,
  fitEvaluation,
  readinessScore
}: {
  autoTimeFitReview: AutoTimeFitReview
  targetCountry: string
  marketLabel: string | undefined
  urgencyGuidance: string
  state: CompanionDashboardState
  fitEvaluation: CountryFitEvaluation
  readinessScore: number
}): DecisionBrief {
  const missingInputs = [
    !state.profile.fullName.trim() && "candidate name",
    !state.profile.baseCvText.trim() && "CV text",
    !state.profile.workRightDetails.trim() && "work-right details",
    !state.profile.targetRoles.trim() && "target roles",
    !state.jobAnalysis.jobDescription.trim() && "job description",
    !state.jobAnalysis.jobUrl.trim() && "job URL"
  ].filter(Boolean) as string[]
  const fitRisks = fitEvaluation.components
    .filter((item) => item.status === "weak" || item.status === "blocker")
    .map((item) => `${item.label}: ${item.rationale}`)
  const evidenceFound = fitEvaluation.components.flatMap((item) =>
    item.evidence.length
      ? item.evidence.map((evidence) => `${item.label}: ${evidence}`)
      : []
  )
  const risks = [
    ...fitRisks,
    !state.profile.baseCvText.trim() &&
      "CV text is missing, so skill and ATS checks cannot be verified.",
    !state.jobAnalysis.jobDescription.trim() &&
      "Job description is missing, so role classification cannot be verified.",
    (state.jobAnalysis.gaps?.length ?? 0) > 0 && "Saved role gaps need review."
  ].filter(Boolean) as string[]

  return {
    decision: fitEvaluation.decision,
    confidence: autoTimeFitReview.confidenceLevel,
    score: autoTimeFitReview.fitScore,
    contentGate: fitEvaluation.contentGate,
    rationale: [
      `Assessment mode: ${marketLabel} / ${targetCountry}.`,
      autoTimeFitReview.shortSummary,
      autoTimeFitReview.suggestedCvPositioning,
      urgencyGuidance
    ],
    evidenceFound:
      autoTimeFitReview.matchedSignals.length > 0
        ? autoTimeFitReview.matchedSignals
        : evidenceFound.length > 0
          ? evidenceFound
        : [
            "No supporting evidence has been found yet. Add real profile, work-right and job-description details."
          ],
    risks:
      autoTimeFitReview.riskAreas.length > 0
        ? autoTimeFitReview.riskAreas
        : risks.length > 0
          ? risks
        : [
            "No rule-based blocker was detected. This is not employer, visa or legal confirmation."
          ],
    nextActions:
      fitEvaluation.contentGate === "ready"
        ? [
            "Save the role into the tracker.",
            "Generate application content from the approved positioning angle.",
            "Track next action and prepare interview prompts if shortlisted."
          ]
        : fitEvaluation.contentGate === "stretch"
          ? [
              "Label this as a stretch application before generating content.",
              "Clarify the weakest country, work-right or sponsorship signal.",
              "Apply only if the role is strategically important."
            ]
          : [
              autoTimeFitReview.suggestedNextAction,
              "Add missing target country, target roles and work-right details.",
              "Re-check the role before writing application content."
            ],
    missingInputs
  }
}

export function getEvidenceLedgerRows(
  fitEvaluation: CountryFitEvaluation,
  missingInputs: string[]
) {
  return [
    ...fitEvaluation.components.map((component) => ({
      id: component.key,
      check: component.label,
      status: component.status,
      explanation: component.rationale,
      evidence: component.evidence.length
        ? component.evidence
        : ["No direct supporting evidence found yet."],
      limit:
        component.status === "strong" || component.status === "medium"
          ? "Supported by saved text and rule checks, not officially verified."
          : "Requires user or employer confirmation before relying on this advice."
    })),
    ...missingInputs.map((input) => ({
      id: `missing-${input}`,
      check: `Missing: ${input}`,
      status: "missing",
      explanation: `The ${input} input is required for a stronger decision.`,
      evidence: ["No user-provided evidence is saved for this input."],
      limit: "AutoTime must not infer this from unrelated information."
    }))
  ]
}

export function getVerificationChecklist({
  state,
  fitEvaluation,
  officialSources,
  trustState
}: {
  state: CompanionDashboardState
  fitEvaluation: CountryFitEvaluation
  officialSources: OfficialSource[]
  trustState: TrustState
}): VerificationChecklistItem[] {
  const hasJobDescription = Boolean(state.jobAnalysis.jobDescription.trim())
  const hasWorkRight = Boolean(state.profile.workRightDetails.trim())
  const hasTargetCountry = Boolean(state.profile.targetCountries.trim())
  const hasCv = Boolean(state.profile.baseCvText.trim())
  const hasOfficialSources = officialSources.length > 0
  const hasHardBlocker = fitEvaluation.blockers.length > 0

  return [
    {
      id: "job-description",
      label: "Job description saved",
      status: hasJobDescription ? "ready" : "needs-check",
      evidence: hasJobDescription
        ? "Job text is available for role, skill and sponsorship checks."
        : "No job description has been saved.",
      limit:
        "A thin or partial job post can hide sponsorship, location or salary constraints."
    },
    {
      id: "work-right",
      label: "Work-right position stated",
      status: hasWorkRight ? "ready" : "blocked",
      evidence: hasWorkRight
        ? state.profile.workRightDetails
        : "No work-right evidence is saved.",
      limit:
        "The user must verify work authorisation with official guidance or the employer."
    },
    {
      id: "target-country",
      label: "Target country confirmed",
      status: hasTargetCountry ? "ready" : "needs-check",
      evidence: hasTargetCountry
        ? state.profile.targetCountries
        : "No target country is saved in the profile.",
      limit:
        "Broad EU or remote roles still need country-specific hiring verification."
    },
    {
      id: "cv-evidence",
      label: "CV evidence available",
      status: hasCv ? "ready" : "needs-check",
      evidence: hasCv
        ? "CV text is saved and can be compared with role language."
        : "No CV text is saved.",
      limit: "Review application content before using it."
    },
    {
      id: "official-source",
      label: "Official source reviewed",
      status: trustState.officialSourceReviewed
        ? "ready"
        : hasOfficialSources
          ? "needs-check"
          : "blocked",
      evidence: hasOfficialSources
        ? trustState.officialSourceReviewedAt
          ? `Reviewed on ${new Date(
              trustState.officialSourceReviewedAt
            ).toLocaleDateString()}: ${officialSources
              .map((source) => source.label)
              .join(", ")}`
          : officialSources.map((source) => source.label).join(", ")
        : "No official verification source is available for this country.",
      limit:
        "The app provides links only; the user must verify current requirements."
    },
    {
      id: "blockers",
      label: "Hard blockers resolved",
      status: hasHardBlocker ? "blocked" : "ready",
      evidence: hasHardBlocker
        ? fitEvaluation.blockers.join(" ")
        : "No hard blocker was detected by the current rules.",
      limit:
        "No detected blocker is not the same as employer, visa or legal approval."
    }
  ]
}

export function getContentGuardrails({
  decisionBrief,
  verificationChecklist
}: {
  decisionBrief: DecisionBrief
  verificationChecklist: VerificationChecklistItem[]
}): ContentGuardrail[] {
  const blockedChecks = verificationChecklist.filter(
    (item) => item.status === "blocked"
  )
  const needsCheck = verificationChecklist.filter(
    (item) => item.status === "needs-check"
  )

  return [
    {
      label: "Decision gate",
      status:
        decisionBrief.contentGate === "blocked"
          ? "blocked"
          : decisionBrief.contentGate === "stretch"
            ? "warning"
            : "ready",
      reason:
        decisionBrief.contentGate === "blocked"
          ? "Application content is blocked until the strongest risk is resolved."
          : decisionBrief.contentGate === "stretch"
            ? "Content can only be drafted with a clear stretch-risk label."
            : "No content blocker was detected by the current rules."
    },
    {
      label: "Evidence minimum",
      status:
        blockedChecks.length > 0
          ? "blocked"
          : needsCheck.length > 0
            ? "warning"
            : "ready",
      reason:
        blockedChecks.length > 0
          ? "Required checks are blocked."
          : needsCheck.length > 0
            ? "Checks still need manual confirmation."
            : "Core verification checks are ready."
    },
    {
      label: "Content source",
      status: "ready",
      reason: "Drafts use saved profile, reusable answers and job text."
    }
  ]
}
