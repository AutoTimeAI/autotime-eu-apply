"use client"

import { useEffect, useState } from "react"

export const analyticsConsentStorageKey = "autotime-analytics-consent"

export default function AnalyticsConsent() {
  const [choice, setChoice] = useState<string | null>(null)

  useEffect(() => {
    setChoice(window.localStorage.getItem(analyticsConsentStorageKey))
  }, [])

  function saveChoice(value: "denied" | "granted") {
    window.localStorage.setItem(analyticsConsentStorageKey, value)
    window.dispatchEvent(new Event("autotime-analytics-consent-changed"))
    setChoice(value)
  }

  if (choice) {
    return null
  }

  return (
    <aside className="consent-banner" aria-label="Analytics consent">
      <p>
        AutoTime uses privacy-conscious EU analytics to improve the product. No
        email address is used for analytics.
      </p>
      <div>
        <button type="button" onClick={() => saveChoice("granted")}>
          Allow analytics
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => saveChoice("denied")}
        >
          Decline
        </button>
      </div>
    </aside>
  )
}
