"use client"

// Mounts PostHog analytics only after the user has explicitly granted
// consent via AnalyticsConsent (shared localStorage key), and re-checks
// whenever that consent changes. Kept as its own invisible provider so
// analytics initialisation stays decoupled from the consent banner's own
// render logic and from every other layout component.

import { useEffect } from "react"
import posthog from "posthog-js"
import { canUseAnalytics, identifyAnalyticsUser } from "../lib/analytics"
import { getAnalyticsEnv } from "../lib/env"
import { createBrowserClient } from "../lib/supabase/client"
import { analyticsConsentStorageKey } from "./AnalyticsConsent"

let hasInitialisedPostHog = false

/**
 * Conditionally initialises PostHog (once per page load, guarded by the
 * module-level `hasInitialisedPostHog` flag) only when analytics are
 * enabled for the environment and the user has previously granted consent
 * (`analyticsConsentStorageKey` === "granted"). Re-runs on the
 * `autotime-analytics-consent-changed` window event so granting consent
 * after mount still triggers initialisation without a reload. Renders no
 * UI.
 */
export default function PostHogProvider() {
  useEffect(() => {
    async function initialisePostHog() {
      if (
        !canUseAnalytics() ||
        window.localStorage.getItem(analyticsConsentStorageKey) !== "granted"
      ) {
        return
      }

      if (!hasInitialisedPostHog) {
        const analytics = getAnalyticsEnv()
        if (!analytics) return
        posthog.init(analytics.key, {
          api_host: analytics.host,
          capture_pageview: true,
          defaults: "2025-05-24",
          persistence: "localStorage+cookie",
        })
        hasInitialisedPostHog = true
      }

      try {
        const supabase = createBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          identifyAnalyticsUser(user.id)
        }
      } catch (error: unknown) {
        return
      }
    }

    void initialisePostHog()
    window.addEventListener(
      "autotime-analytics-consent-changed",
      initialisePostHog,
    )

    return () => {
      window.removeEventListener(
        "autotime-analytics-consent-changed",
        initialisePostHog,
      )
    }
  }, [])

  return null
}
