"use client"

// GDPR-style consent banner for optional product analytics. Persists the
// user's choice ("granted"/"denied") to localStorage and broadcasts a
// window event so PostHogProvider (which reads the same storage key) can
// react immediately without a page reload. Renders nothing once a choice
// has already been recorded.

import { useEffect, useState } from "react"

export const analyticsConsentStorageKey = "autotime-analytics-consent"

/**
 * Analytics consent banner. Reads any prior choice from localStorage on
 * mount; while no choice is stored it renders an Allow/Decline banner, and
 * saving a choice both persists it and dispatches
 * `autotime-analytics-consent-changed` so listeners (e.g. PostHogProvider)
 * can initialise or skip analytics immediately.
 */
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
