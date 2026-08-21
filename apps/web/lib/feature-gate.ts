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

/**
 * Atomically reserves one AI call slot *before* the caller makes the real,
 * paid provider request - closing a race where concurrent requests could
 * each pass a plain "remaining calls" read-check simultaneously and all
 * reach OpenAI before any of them recorded usage. Consumes a purchased
 * credit under the hood (via the same per-user advisory lock
 * consume_ai_credit uses) if the monthly allowance is already exhausted.
 *
 * Returns a reservation id to pass to finalizeAiCall (on success) or
 * releaseAiCall (if the provider call itself throws) - or null for the
 * test-auth user, which is never gated or recorded.
 *
 * Throws FeatureGateError if no allowance or credit remains.
 */
export async function reserveAiCall(userId: string): Promise<string | null> {
  if (isTestAuthUserId(userId)) {
    return null
  }

  const reservationId = crypto.randomUUID()

  try {
    const plan = await getUserPlan(userId)
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("reserve_ai_call", {
      p_user_id: userId,
      p_reservation_id: reservationId,
      p_monthly_limit: PLAN_AI_CALLS_PER_MONTH[plan],
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new FeatureGateError(
        "LIMIT_REACHED",
        0,
        "Your monthly AI allowance is used. Buy a credit pack or upgrade to continue."
      )
    }

    return reservationId
  } catch (error: unknown) {
    if (error instanceof FeatureGateError) {
      throw error
    }

    const message =
      error instanceof Error ? error.message : "Unable to check AI access"

    throw new Error(message)
  }
}

/**
 * Fills in the real token/cost data on a reservation after a successful
 * provider call. Best-effort: a failure here means a usage row keeps its
 * placeholder values rather than losing the reservation's allowance/credit
 * accounting, so it never throws.
 */
export async function finalizeAiCall(
  reservationId: string | null,
  opts: {
    feature: string
    model: string
    promptTokens: number
    completionTokens: number
    costUsd: number
  }
): Promise<void> {
  if (!reservationId) {
    return
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.rpc("confirm_ai_call", {
      p_reservation_id: reservationId,
      p_feature: opts.feature,
      p_model: opts.model,
      p_prompt_tokens: opts.promptTokens,
      p_completion_tokens: opts.completionTokens,
      p_cost_usd: opts.costUsd,
    })

    if (error) {
      throw new Error(error.message)
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
        reservationId
      }
    )
  }
}

/**
 * Releases a reservation the provider call never fulfilled - deletes its
 * placeholder usage row and refunds a purchased credit if one was consumed
 * to make the reservation, so a failed generation never costs the caller
 * an allowance slot or a credit. Best-effort: never throws, since the
 * caller is already handling/rethrowing the original provider error.
 */
export async function releaseAiCall(reservationId: string | null): Promise<void> {
  if (!reservationId) {
    return
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.rpc("release_ai_call", {
      p_reservation_id: reservationId,
    })

    if (error) {
      throw new Error(error.message)
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to release AI reservation"

    logDiagnostic(
      createDiagnostic({
        area: "ai",
        code: "ai.usage.release.failed",
        message,
        status: 500
      }),
      { reservationId }
    )
  }
}
