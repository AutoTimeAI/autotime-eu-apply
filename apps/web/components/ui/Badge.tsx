import type { ReactNode } from "react"
import clsx from "clsx"

export type BadgeTone = "good" | "warn" | "danger" | "neutral" | "info"

export type BadgeProps = {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

/**
 * The app's single status-pill primitive. Existing pages each invented
 * their own tone naming (ProductStatusBadge's "confirmed"/"consider",
 * the profile-quality-item "ready"/"needs-check"/"blocked", the
 * applications-redesign mockup's "ready"/"needs-work") - this collapses
 * that down to one 5-tone vocabulary new code can standardize on.
 * Existing call sites are NOT migrated by this commit; see the pilot use
 * in JobApplicationWorkspace.tsx for the intended replacement pattern.
 */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return <span className={clsx("ui-badge", `ui-badge-${tone}`, className)}>{children}</span>
}
