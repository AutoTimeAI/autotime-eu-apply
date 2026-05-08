"use client"

import { useEffect, useState } from "react"

type UpgradeBannerProps = {
  remainingCalls: number
}

const dismissedKey = "autotime-upgrade-banner-dismissed"

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
