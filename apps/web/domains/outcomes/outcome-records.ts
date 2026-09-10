import type { ApplicationRecord, OutcomeLearningSignals, OutcomeRecord } from "shared"

export function createOutcomeRecord(application: ApplicationRecord): OutcomeRecord {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    applicationId: application.id,
    roleTitle: application.roleTitle || application.title,
    company: application.company,
    source: application.source,
    status: application.status,
    outcomeReason: application.outcomeReason ?? "Unknown",
    decisionIndexAtSave: application.fitScore,
    decisionLabelAtSave: application.fitDecision,
    contentGateAtSave: application.contentGate,
    appliedAt: application.status === "Applied" ? now : undefined,
    interviewAt: application.status === "Interview" ? now : undefined,
    closedAt:
      application.status === "Rejected" || application.status === "Archived"
        ? now
        : undefined,
    notes: application.notes,
    createdAt: now,
    updatedAt: now
  }
}

export function updateOutcomeRecordFromApplication(
  existing: OutcomeRecord | undefined,
  application: ApplicationRecord
): OutcomeRecord {
  const now = new Date().toISOString()
  const base = existing ?? createOutcomeRecord(application)

  return {
    ...base,
    roleTitle: application.roleTitle || application.title,
    company: application.company,
    source: application.source,
    status: application.status,
    outcomeReason: application.outcomeReason ?? "Unknown",
    decisionIndexAtSave: base.decisionIndexAtSave ?? application.fitScore,
    decisionLabelAtSave: base.decisionLabelAtSave ?? application.fitDecision,
    contentGateAtSave: base.contentGateAtSave ?? application.contentGate,
    appliedAt:
      base.appliedAt ?? (application.status === "Applied" ? now : undefined),
    interviewAt:
      base.interviewAt ??
      (application.status === "Interview" ? now : undefined),
    closedAt:
      base.closedAt ??
      (application.status === "Rejected" || application.status === "Archived"
        ? now
        : undefined),
    notes: application.notes,
    updatedAt: now
  }
}

export function getOutcomeLearningSignals(
  applications: ApplicationRecord[]
): OutcomeLearningSignals {
  return applications.reduce(
    (signals, application) => {
      const reason = application.outcomeReason ?? "Unknown"

      return {
        totalTracked:
          reason === "Unknown"
            ? signals.totalTracked
            : signals.totalTracked + 1,
        interviews:
          application.status === "Interview" || reason === "Interview secured"
            ? signals.interviews + 1
            : signals.interviews,
        sponsorshipBlocks:
          reason === "Sponsorship blocker"
            ? signals.sponsorshipBlocks + 1
            : signals.sponsorshipBlocks,
        workRightBlocks:
          reason === "Work-right blocker"
            ? signals.workRightBlocks + 1
            : signals.workRightBlocks,
        noResponses:
          reason === "No response"
            ? signals.noResponses + 1
            : signals.noResponses,
        positiveOutcomes:
          reason === "Interview secured" || reason === "Offer or final stage"
            ? signals.positiveOutcomes + 1
            : signals.positiveOutcomes
      }
    },
    {
      totalTracked: 0,
      interviews: 0,
      sponsorshipBlocks: 0,
      workRightBlocks: 0,
      noResponses: 0,
      positiveOutcomes: 0
    }
  )
}
