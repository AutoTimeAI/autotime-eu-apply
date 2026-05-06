"use client"

import posthog from "posthog-js"
import { publicEnv } from "./env"

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

export function canUseAnalytics(): boolean {
  return publicEnv.NEXT_PUBLIC_POSTHOG_KEY.trim().length > 0
}

export function identifyAnalyticsUser(userId: string): void {
  if (!canUseAnalytics() || !userId.trim()) {
    return
  }

  posthog.identify(userId)
}

function captureEvent<EventName extends keyof AnalyticsEventMap>(
  eventName: EventName,
  props: AnalyticsEventMap[EventName]
): void {
  if (!canUseAnalytics()) {
    return
  }

  posthog.capture(eventName, props)
}

export function trackJobAnalysed(props: JobAnalysedProps): void {
  captureEvent("job_analysed", props)
}

export function trackApplicationSaved(props: ApplicationSavedProps): void {
  captureEvent("application_saved", props)
}

export function trackAiContentGenerated(props: AiContentGeneratedProps): void {
  captureEvent("ai_content_generated", props)
}

export function trackUpgradeClicked(props: UpgradeClickedProps): void {
  captureEvent("upgrade_clicked", props)
}

export function trackSubscriptionStarted(
  props: SubscriptionStartedProps
): void {
  captureEvent("subscription_started", props)
}

export function trackUpgradeLimitHit(props: UpgradeLimitHitProps): void {
  captureEvent("upgrade_limit_hit", props)
}
