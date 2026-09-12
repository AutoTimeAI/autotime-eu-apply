import type {
  ApplicationWorkspace,
  JobRecord,
} from "../../lib/job-application-workflow"
import type { InterviewRecord } from "../../lib/interview-workflow"

export type CoreLoopStage =
  | "captured"
  | "decided"
  | "preparing"
  | "approved"
  | "applied"
  | "interview"
  | "outcome"

export type CoreLoopIntegrityIssue = {
  code:
    | "application-job-mismatch"
    | "application-without-decision"
    | "approved-without-evidence-review"
    | "applied-without-confirmation"
    | "applied-without-timestamp"
    | "interview-application-mismatch"
    | "interview-job-mismatch"
  message: string
}

export type CoreLoopTrace = {
  job: JobRecord
  application?: ApplicationWorkspace
  interviews?: InterviewRecord[]
}

const approvedStatuses = new Set<ApplicationWorkspace["status"]>([
  "Ready",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
])

/**
 * Validates continuity across the product's governing loop without reading
 * candidate or vacancy content. The result is safe to use for release checks
 * and privacy-minimal telemetry because it returns identifiers/stages/issues,
 * never CV text, job descriptions, answers, or generated documents.
 */
export function assessCoreLoopTrace(trace: CoreLoopTrace): {
  issueCodes: CoreLoopIntegrityIssue["code"][]
  issues: CoreLoopIntegrityIssue[]
  roleId: string
  stage: CoreLoopStage
  valid: boolean
} {
  const { application, job } = trace
  const interviews = trace.interviews ?? []
  const issues: CoreLoopIntegrityIssue[] = []
  const add = (code: CoreLoopIntegrityIssue["code"], message: string) => {
    if (!issues.some((issue) => issue.code === code)) issues.push({ code, message })
  }

  if (application) {
    if (application.jobId !== job.id)
      add(
        "application-job-mismatch",
        "The application is not linked to this role record.",
      )
    if (approvedStatuses.has(application.status) && !job.analysisHistory.length)
      add(
        "application-without-decision",
        "An approved or submitted application must retain its role decision.",
      )
    if (
      approvedStatuses.has(application.status) &&
      (!application.evidenceConfirmed ||
        !application.consequentialAnswersReviewed ||
        application.unsupportedClaims.length > 0)
    )
      add(
        "approved-without-evidence-review",
        "Approval requires confirmed evidence, reviewed consequential answers, and no unsupported claims.",
      )
    if (
      ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"].includes(
        application.status,
      ) &&
      !application.submissionConfirmed
    )
      add(
        "applied-without-confirmation",
        "A submitted application must retain explicit user confirmation.",
      )
    if (
      ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"].includes(
        application.status,
      ) &&
      !application.appliedAt
    )
      add(
        "applied-without-timestamp",
        "A submitted application must retain its application timestamp.",
      )
  }

  for (const interview of interviews) {
    if (!application || interview.applicationId !== application.id)
      add(
        "interview-application-mismatch",
        "An interview must link to the application in this role trace.",
      )
    if (interview.jobId !== job.id)
      add(
        "interview-job-mismatch",
        "An interview must link to the same role as its application.",
      )
  }

  const terminalInterview = interviews.find(
    (interview) => interview.outcome !== "awaiting",
  )
  const stage: CoreLoopStage = terminalInterview
    ? "outcome"
    : interviews.length
      ? "interview"
      : application?.status === "Applied"
        ? "applied"
        : application && approvedStatuses.has(application.status)
          ? "approved"
          : application
            ? "preparing"
            : job.analysisHistory.length
              ? "decided"
              : "captured"

  return {
    issueCodes: issues.map((issue) => issue.code),
    issues,
    roleId: job.id,
    stage,
    valid: issues.length === 0,
  }
}
