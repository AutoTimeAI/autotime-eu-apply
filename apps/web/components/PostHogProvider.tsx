"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { canUseAnalytics, identifyAnalyticsUser } from "../lib/analytics"
import { publicEnv } from "../lib/env"
import { createBrowserClient } from "../lib/supabase/client"
import { analyticsConsentStorageKey } from "./AnalyticsConsent"

let hasInitialisedPostHog = false

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
        posthog.init(publicEnv.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: publicEnv.NEXT_PUBLIC_POSTHOG_HOST,
          capture_pageview: true,
          defaults: "2025-05-24",
          persistence: "localStorage+cookie"
        })
        hasInitialisedPostHog = true
      }

      try {
        const supabase = createBrowserClient()
        const {
          data: { user }
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
      initialisePostHog
    )

    return () => {
      window.removeEventListener(
        "autotime-analytics-consent-changed",
        initialisePostHog
      )
    }
  }, [])

  return null
}
