export const PROFILE_EXECUTION_THRESHOLD = 90

export const productSecurityProtocols = {
  profileGate: {
    name: "Feature-specific readiness",
    thresholdPercent: PROFILE_EXECUTION_THRESHOLD,
    constraint:
      "Overall profile readiness is guidance only. Each capability checks the exact evidence and confirmation it requires.",
    appliesTo: [
      "job_analysis",
      "application_tracking",
      "tracker_mutations",
      "interview_prep",
      "analytics",
      "ai_generation"
    ],
    fallback:
      "Keep the selected context open, explain required and recommended information separately, and offer the smallest next action."
  },
  userControl: {
    name: "No auto-submit",
    constraint:
      "AutoTime can import visible job details and draft guidance, but it never submits applications or hidden job-site actions."
  },
  storageAndSync: {
    name: "Local-first tracking",
    constraint:
      "Track Job saves locally first. If a dashboard session exists, basic tracked-job sync is available to free and pro users.",
    forbiddenData: [
      "browser cookies",
      "job-site sessions",
      "API keys",
      "passwords",
      "payment secrets"
    ]
  },
  planGating: {
    name: "Basic tracking for all users",
    constraint:
      "Pro gates advanced assistance only; it must not block basic job tracking sync."
  },
  adminAccess: {
    name: "Admin allowlist",
    constraint:
      "Internal admin routes and logs are visible only after authenticated allowlisted admin access."
  },
  observability: {
    name: "Actionable failures",
    levels: ["severe", "warn", "info"],
    constraint:
      "Failures should be logged with enough context to explain whether the issue is auth, sync, storage, API, database or fallback behavior."
  }
} as const

export function getProfileExecutionLockMessage(readinessScore: number) {
  return `Profile evidence coverage is ${readinessScore}%. This is guidance only; the selected action checks its own required information.`
}
