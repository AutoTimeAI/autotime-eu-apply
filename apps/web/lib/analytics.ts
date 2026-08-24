/**
 * Client-side PostHog analytics wrapper for the web app. Defines a typed
 * map of the product events this app tracks (with their required
 * properties) and thin wrapper functions around posthog-js, so callers
 * cannot capture an event with the wrong shape of props and every call
 * automatically no-ops when analytics is not configured (e.g. missing
 * PostHog key) instead of throwing or silently sending malformed events.
 */
"use client"

import posthog from "posthog-js"
import { getAnalyticsEnv } from "./env"

type JobAnalysedProps = {
  fitScore: number
  isPro: boolean
  platform: string
  recommendation: string
}

type ApplicationSavedProps = {
  source: string
}

type AiContentGeneratedProps = {
  feature: string
}

type UpgradeClickedProps = {
  location: string
  plan: string
}

type SubscriptionStartedProps = {
  interval: string
  plan: string
}

type UpgradeLimitHitProps = {
  feature: string
  remainingCalls: number
}

type AnalyticsEventMap = {
  ai_content_generated: AiContentGeneratedProps
  application_saved: ApplicationSavedProps
  job_analysed: JobAnalysedProps
  subscription_started: SubscriptionStartedProps
  upgrade_clicked: UpgradeClickedProps
  upgrade_limit_hit: UpgradeLimitHitProps
}

/** True if a PostHog key/host is configured, meaning analytics calls are live. */
export function canUseAnalytics(): boolean {
  return getAnalyticsEnv() !== null
}

/**
 * Associates the current PostHog session with `userId`. No-ops (does not
 * call posthog.identify) if analytics is unavailable or `userId` is blank.
 */
export function identifyAnalyticsUser(userId: string): void {
  if (!canUseAnalytics() || !userId.trim()) {
    return
  }

  posthog.identify(userId)
}

function captureEvent<EventName extends keyof AnalyticsEventMap>(
  eventName: EventName,
  props: AnalyticsEventMap[EventName],
): void {
  if (!canUseAnalytics()) {
    return
  }

  posthog.capture(eventName, props)
}

/** Tracks that a job was analysed, with its fit score, plan tier, source platform, and recommendation. */
export function trackJobAnalysed(props: JobAnalysedProps): void {
  captureEvent("job_analysed", props)
}

/** Tracks that a user saved a job application, tagged with its source surface. */
export function trackApplicationSaved(props: ApplicationSavedProps): void {
  captureEvent("application_saved", props)
}

/** Tracks that AI-generated content was produced for a given feature. */
export function trackAiContentGenerated(props: AiContentGeneratedProps): void {
  captureEvent("ai_content_generated", props)
}

/** Tracks a click on an upgrade CTA, tagged with the UI location and target plan. */
export function trackUpgradeClicked(props: UpgradeClickedProps): void {
  captureEvent("upgrade_clicked", props)
}

/** Tracks that a paid subscription started, with its plan and billing interval. */
export function trackSubscriptionStarted(
  props: SubscriptionStartedProps,
): void {
  captureEvent("subscription_started", props)
}

/** Tracks that a user hit a usage limit for a gated feature, with the calls remaining. */
export function trackUpgradeLimitHit(props: UpgradeLimitHitProps): void {
  captureEvent("upgrade_limit_hit", props)
}
