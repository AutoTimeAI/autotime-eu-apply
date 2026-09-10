export type ProfileQualitySignal = {
  label: string
  score: number
  status: "ready" | "needs-check" | "blocked"
  detail: string
}
