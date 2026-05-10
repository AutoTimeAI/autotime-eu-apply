import { createAdminClient } from "./supabase/admin"
import type { SubscriptionPlan, SubscriptionStatus } from "./supabase/types"
import { getTestAuthPlan, isTestAuthUserId } from "./test-auth"

export const FREE_AI_CALLS_PER_MONTH = 5

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

    const plan =
      normalisePlan(data?.plan) === "pro" && isEntitledStatus(data?.status)
        ? "pro"
        : "free"

    return plan
  } catch (error: unknown) {
    console.error("feature_gate_plan_read_failed", {
      reason: error instanceof Error ? error.message : "Unable to read user plan"
    })

    return "free"
  }
}

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

export async function getRemainingAiCalls(userId: string): Promise<number> {
  try {
    if (await isProUser(userId)) {
      return Number.POSITIVE_INFINITY
    }

    const monthlyCalls = await getMonthlyAiCallCount(userId)
    return Math.max(0, FREE_AI_CALLS_PER_MONTH - monthlyCalls)
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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to track AI usage"

    throw new Error(message)
  }
}

export async function assertCanUseAi(userId: string): Promise<void> {
  try {
    if (await isProUser(userId)) {
      return
    }

    const remainingCalls = await getRemainingAiCalls(userId)

    if (remainingCalls <= 0) {
      throw new FeatureGateError(
        "LIMIT_REACHED",
        0,
        "Free AI call limit reached. Upgrade to Pro to continue."
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
