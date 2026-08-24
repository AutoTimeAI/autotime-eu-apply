"use client"

// Computes and tracks a 0-100 "profile readiness" score used across the
// dashboard (e.g. on Home) to nudge the user toward completing their
// profile before relying on AI features. Despite the "Lock" name, the
// wrapper component no longer gates/blocks children (isLocked is hardcoded
// false) — it only renders them, while the readiness score itself is
// exposed via the `useProfileProtocolReadiness` hook for callers that want
// to show progress or guidance based on it. Score is computed from local
// dashboard state first (for a fast/offline result) and then reconciled
// with the account's synced profile when cloud sync is configured.

import { type ReactNode, useEffect, useState } from "react"

const dashboardStorageKey = "autotime-v2-companion-dashboard"
export const profileProtocolReadinessEvent =
  "autotime-profile-readiness-updated"

type ProfileProtocolLockProps = {
  children: ReactNode
  userId: string
}

type StoredDashboardState = {
  profile?: {
    baseCvText?: string
    currentCountry?: string
    fullName?: string
    targetCountries?: string
    targetRoles?: string
    workRightDetails?: string
  }
  reusableAnswers?: {
    motivationAnswer?: string
    strengthsAnswer?: string
  }
}

type ProfileReadinessProfile = StoredDashboardState["profile"]
type ProfileReadinessReusableAnswers = StoredDashboardState["reusableAnswers"]
type ProfileReadRouteResponse = {
  data: {
    profile: ProfileReadinessProfile | null
  } | null
  error: string | null
}

/**
 * Computes a 0-100 profile readiness score: six required profile signals
 * (name, current/target countries, target roles, work-right details, base
 * CV text) are worth 90% weighted evenly, and two reusable-answer signals
 * (motivation/strengths) are worth the remaining 10%. Used both for local
 * (`getStoredProfileReadiness`) and server-synced readiness calculations so
 * the two stay consistent.
 */
export function getProfileReadinessFromParts(
  profile: ProfileReadinessProfile = {},
  reusableAnswers: ProfileReadinessReusableAnswers = {}
): number {
  const requiredProfileSignals = [
    profile.fullName?.trim(),
    profile.currentCountry?.trim(),
    profile.targetCountries?.trim(),
    profile.targetRoles?.trim(),
    profile.workRightDetails?.trim(),
    profile.baseCvText?.trim()
  ]
  const reusableSignals = [
    reusableAnswers.motivationAnswer?.trim(),
    reusableAnswers.strengthsAnswer?.trim()
  ]
  const requiredCompleted = requiredProfileSignals.filter(Boolean).length
  const reusableCompleted = reusableSignals.filter(Boolean).length

  return Math.min(
    100,
    Math.round(
      (requiredCompleted / requiredProfileSignals.length) * 90 +
        (reusableCompleted / reusableSignals.length) * 10
    )
  )
}

/**
 * Reads the user's locally-stored companion-dashboard profile state (if
 * any) and returns its readiness score via
 * {@link getProfileReadinessFromParts}. Returns 0 outside the browser or if
 * nothing is stored / parsing fails.
 */
export function getStoredProfileReadiness(userId: string): number {
  if (typeof window === "undefined") {
    return 0
  }

  try {
    const raw = window.localStorage.getItem(`${dashboardStorageKey}:${userId}`)

    if (!raw) {
      return 0
    }

    const state = JSON.parse(raw) as StoredDashboardState
    return getProfileReadinessFromParts(state.profile, state.reusableAnswers)
  } catch {
    return 0
  }
}

async function getSyncedProfileReadiness(
  signal: AbortSignal
): Promise<number | null> {
  try {
    const response = await fetch("/api/sync/profile", {
      cache: "no-store",
      signal
    })
    const body = (await response.json()) as ProfileReadRouteResponse

    if (!response.ok || body.error || !body.data?.profile) {
      return null
    }

    return getProfileReadinessFromParts(body.data.profile)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return null
    }

    return null
  }
}

function hasPublicEnvValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0
}

function shouldReadSyncedProfile() {
  if (process.env.NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY === "true") {
    return false
  }

  const cloudSyncEnabled =
    process.env.NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED ??
    (process.env.NEXT_PUBLIC_AUTOTIME_ENV === "production" ? "true" : undefined)

  return (
    cloudSyncEnabled === "true" &&
    hasPublicEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    hasPublicEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}

/**
 * Hook that tracks the current profile readiness score for `userId`,
 * starting from the local score and upgrading it (via `Math.max`) with the
 * server-synced score when cloud sync is enabled and configured
 * (`shouldReadSyncedProfile`). Recomputes on the
 * `autotime-profile-readiness-updated` custom event, on `storage` events
 * (cross-tab updates) and on window `focus`. `isLocked` is always `false` —
 * retained in the return shape for backward compatibility with callers that
 * still check it.
 */
export function useProfileProtocolReadiness(userId?: string) {
  const [readinessScore, setReadinessScore] = useState(0)

  useEffect(() => {
    let isActive = true
    let activeController: AbortController | null = null

    const updateReadiness = () => {
      if (!userId) {
        setReadinessScore(0)
        return
      }

      const localReadiness = getStoredProfileReadiness(userId)
      setReadinessScore(localReadiness)

      if (!shouldReadSyncedProfile()) {
        return
      }

      activeController?.abort()
      activeController = new AbortController()

      void getSyncedProfileReadiness(activeController.signal).then(
        (syncedReadiness) => {
          if (!isActive || syncedReadiness === null) {
            return
          }

          setReadinessScore((currentReadiness) =>
            Math.max(currentReadiness, localReadiness, syncedReadiness)
          )
        }
      )
    }

    if (!userId) {
      setReadinessScore(0)
      return
    }

    updateReadiness()
    window.addEventListener(profileProtocolReadinessEvent, updateReadiness)
    window.addEventListener("storage", updateReadiness)
    window.addEventListener("focus", updateReadiness)

    return () => {
      isActive = false
      activeController?.abort()
      window.removeEventListener(profileProtocolReadinessEvent, updateReadiness)
      window.removeEventListener("storage", updateReadiness)
      window.removeEventListener("focus", updateReadiness)
    }
  }, [userId])

  return {
    isLocked: false,
    readinessScore
  }
}

/**
 * Pass-through wrapper that renders `children` unconditionally. Historically
 * this gated dashboard content behind a profile-completeness check; that
 * gating has been removed (see module comment) but the component is kept
 * as a stable wrapping point in the tree.
 */
export function ProfileProtocolLock({
  children,
  userId
}: ProfileProtocolLockProps) {
  void userId
  return <div className="protocol-page-lock">{children}</div>
}
