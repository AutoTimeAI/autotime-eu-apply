"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { canUseAnalytics, identifyAnalyticsUser } from "../lib/analytics"
import { publicEnv } from "../lib/env"
import { createBrowserClient } from "../lib/supabase/client"

let hasInitialisedPostHog = false

export default function PostHogProvider() {
  useEffect(() => {
    if (!canUseAnalytics()) {
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

    async function identifyUser() {
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

    void identifyUser()
  }, [])

  return null
}
