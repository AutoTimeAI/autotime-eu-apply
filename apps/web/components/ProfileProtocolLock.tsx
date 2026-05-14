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
    const profile = state.profile ?? {}
    const reusableAnswers = state.reusableAnswers ?? {}
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
  } catch {
    return 0
  }
}

export function useProfileProtocolReadiness(userId?: string) {
  const [readinessScore, setReadinessScore] = useState(0)

  useEffect(() => {
    const updateReadiness = () => {
      setReadinessScore(userId ? getStoredProfileReadiness(userId) : 0)
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
