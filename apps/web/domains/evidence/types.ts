export type ReadyToApplyItem = {
  id: string
  label: string
  status: "ready" | "needs-check" | "blocked"
  evidence: string
  action: string
}
