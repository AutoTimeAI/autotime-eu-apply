"use client"

// Dismissible free-plan usage banner shown when the user is approaching
// their monthly AI-analysis limit. Dismissal is remembered per browser tab
// session only (sessionStorage), so the nudge reappears on the next fresh
// session rather than being suppressed permanently.

import { useEffect, useState } from "react"

type UpgradeBannerProps = {
  remainingCalls: number
}

const dismissedKey = "autotime-upgrade-banner-dismissed"

/**
 * Shows a "you have N AI analyses left, upgrade to Pro" banner unless it
 * was already dismissed in this session. Starts hidden (`isDismissed`
 * defaults `true`) until the sessionStorage check resolves, avoiding a
 * flash of the banner before dismissal state is known.
 */
export function UpgradeBanner({ remainingCalls }: UpgradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    setIsDismissed(sessionStorage.getItem(dismissedKey) === "true")
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(dismissedKey, "true")
    setIsDismissed(true)
  }

  if (isDismissed) {
    return null
  }

  return (
    <section className="upgrade-banner">
      <p>
        You have <strong>{remainingCalls}</strong> AI analyses remaining this
        month. Upgrade to Pro for unlimited AI, cloud sync and interview prep.
      </p>
      <div className="header-actions">
        <a className="primary-link" href="/pricing">
          Upgrade - GBP 9/month
        </a>
        <button className="secondary-button" type="button" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </section>
  )
}
