/** Enforces plan entitlements, monthly AI allowances, and purchased-credit usage. */
import { createAdminClient } from "./supabase/admin"
import { createDiagnostic, logDiagnostic } from "./diagnostics"
import type { SubscriptionPlan, SubscriptionStatus } from "./supabase/types"
import { getTestAuthPlan, isTestAuthUserId } from "./test-auth"

export const FREE_AI_CALLS_PER_MONTH = 5
export const PRO_AI_CALLS_PER_MONTH = 50

export const PLAN_AI_CALLS_PER_MONTH: Record<SubscriptionPlan, number> = {
  free: FREE_AI_CALLS_PER_MONTH,
  pro: PRO_AI_CALLS_PER_MONTH,
}

export class FeatureGateError extends Error {
  constructor(
    public readonly code: "LIMIT_REACHED" | "NOT_PRO",
    public readonly remainingCalls: number,
    message: string
  ) {
    super(message)
    this.name = "FeatureGateError"
  }
}

function normalisePlan(plan: SubscriptionPlan | null | undefined) {
  return plan === "pro" ? "pro" : "free"
}

function isEntitledStatus(status: SubscriptionStatus | null | undefined) {
  return status === "active" || status === "trialing"
}

/** Resolves the effective subscription plan for a user. */
export async function getUserPlan(
  userId: string
): Promise<SubscriptionPlan> {
  if (isTestAuthUserId(userId)) {
    return getTestAuthPlan()
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    const storedPlan = normalisePlan(data?.plan)
    const plan =
      storedPlan !== "free" && isEntitledStatus(data?.status)
        ? storedPlan
        : "free"

    return plan
  } catch (error: unknown) {
    console.error("feature_gate_plan_read_failed", {
      reason: error instanceof Error ? error.message : "Unable to read user plan"
    })

    return "free"
  }
}

/** Returns whether the user's effective plan is Pro. */
export async function isProUser(userId: string): Promise<boolean> {
  try {
    const plan = await getUserPlan(userId)
    return plan === "pro"
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to check Pro plan"

    throw new Error(message)
  }
}

/** Counts unused purchased AI credits available to the user. */
export async function getPurchasedAiCredits(userId: string): Promise<number> {
  if (isTestAuthUserId(userId)) {
    return 0
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("get_ai_credit_balance", {
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return Math.max(0, data ?? 0)
}

async function getMonthlyAiCallCount(userId: string): Promise<number> {
  if (isTestAuthUserId(userId)) {
    return 0
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("get_monthly_ai_calls", {
      p_user_id: userId
    })

    if (error) {
      throw new Error(error.message)
    }

    return data ?? 0
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to read monthly AI usage"

    throw new Error(message)
  }
}

/** Calculates the user's remaining included and purchased AI calls. */
export async function getRemainingAiCalls(userId: string): Promise<number> {
  try {
    const [plan, monthlyCalls, purchasedCredits] = await Promise.all([
      getUserPlan(userId),
      getMonthlyAiCallCount(userId),
      getPurchasedAiCredits(userId),
    ])
    return (
      Math.max(0, PLAN_AI_CALLS_PER_MONTH[plan] - monthlyCalls) +
      purchasedCredits
    )
  } catch (error: unknown) {
    console.error("feature_gate_remaining_calls_failed", {
      reason:
        error instanceof Error
          ? error.message
          : "Unable to calculate remaining AI calls"
    })

    return 0
  }
}

/** Records an AI call against the appropriate allowance or purchased credit. */
export async function trackAiCall(
  userId: string,
  opts: {
    feature: string
    model: string
    promptTokens: number
    completionTokens: number
    costUsd: number
  }
): Promise<void> {
  if (isTestAuthUserId(userId)) {
    return
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("ai_usage").insert({
      user_id: userId,
      feature: opts.feature,
      model: opts.model,
      prompt_tokens: opts.promptTokens,
      completion_tokens: opts.completionTokens,
      cost_usd: opts.costUsd
    })

    if (error) {
      throw new Error(error.message)
    }

    const [plan, monthlyCalls] = await Promise.all([
      getUserPlan(userId),
      getMonthlyAiCallCount(userId),
    ])

    if (monthlyCalls > PLAN_AI_CALLS_PER_MONTH[plan]) {
      const { data: consumed, error: consumeError } = await supabase.rpc(
        "consume_ai_credit",
        { p_feature: opts.feature, p_user_id: userId },
      )

      if (consumeError || !consumed) {
        throw new Error(consumeError?.message ?? "AI credit could not be consumed")
      }
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to track AI usage"

    logDiagnostic(
      createDiagnostic({
        area: "ai",
        code: "ai.usage.track.failed",
        message,
        status: 500
      }),
      {
        costUsd: opts.costUsd,
        feature: opts.feature,
        model: opts.model,
        userId
      }
    )
  }
}

/** Throws when the user has no remaining entitlement for an AI request. */
export async function assertCanUseAi(userId: string): Promise<void> {
  try {
    const remainingCalls = await getRemainingAiCalls(userId)

    if (remainingCalls <= 0) {
      throw new FeatureGateError(
        "LIMIT_REACHED",
        0,
        "Your monthly AI allowance is used. Buy a credit pack or upgrade to continue."
      )
    }
  } catch (error: unknown) {
    if (error instanceof FeatureGateError) {
      throw error
    }

    const message =
      error instanceof Error ? error.message : "Unable to check AI access"

    throw new Error(message)
  }
}
