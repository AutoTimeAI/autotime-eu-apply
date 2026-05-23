"use client"

import { type ReactNode, useEffect, useState } from "react"
import { PROFILE_EXECUTION_THRESHOLD } from "../lib/product-protocols"

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
    isLocked: Boolean(userId) && readinessScore < PROFILE_EXECUTION_THRESHOLD,
    readinessScore
  }
}

export function ProfileProtocolLock({
  children,
  userId
}: ProfileProtocolLockProps) {
  const { isLocked, readinessScore } = useProfileProtocolReadiness(userId)

  return (
    <div className={isLocked ? "protocol-page-lock locked" : "protocol-page-lock"}>
      {isLocked ? (
        <div className="dashboard-lock-overlay protocol-page-lock-overlay" role="note">
          <span className="profile-lock-symbol" aria-hidden="true" />
          <div>
            <p className="eyebrow">Profile protocol</p>
            <h2>Locked until profile reaches 90%</h2>
            <p>
              Complete Profile Evidence before using this area. Current profile
              readiness is {readinessScore}%.
            </p>
          </div>
          <a className="secondary-button" href="/dashboard/autofill-profile">
            Complete profile
          </a>
        </div>
      ) : null}
      <div className="protocol-page-lock-content">{children}</div>
    </div>
  )
}
