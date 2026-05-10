import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { publicEnv } from "../../../../lib/env"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { createServerClient } from "../../../../lib/supabase/server"
import { isConfiguredStripePrice, PLANS, stripe } from "../../../../lib/stripe"
import { getTestAuthUser } from "../../../../lib/test-auth"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type CheckoutRouteData = {
  url: string
}

const requestSchema = z.object({
  priceId: z.string().min(1).optional(),
  returnUrl: z.string().url()
})

function jsonResponse(
  body: ApiResponse<CheckoutRouteData>
): NextResponse<ApiResponse<CheckoutRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

async function getOrCreateStripeCustomer({
  email,
  userId
}: {
  email: string | null
  userId: string
}): Promise<string> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (data?.stripe_customer_id) {
      return data.stripe_customer_id
    }

    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: {
        user_id: userId
      }
    })

    const { error: upsertError } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customer.id,
        plan: "free",
        status: "active"
      },
      { onConflict: "user_id" }
    )

    if (upsertError) {
      throw new Error(upsertError.message)
    }

    return customer.id
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create Stripe customer"

    throw new Error(message)
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CheckoutRouteData>>> {
  try {
    const testUser = getTestAuthUser()
    let user = testUser

    if (!user) {
      const supabase = await createServerClient()
      const {
        data: { user: sessionUser },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !sessionUser) {
        return diagnosticJson({
          area: "billing",
          code: "billing.checkout.auth.missing-user",
          data: null,
          error: "Unauthorised",
          request,
          status: 401
        })
      }

      user = sessionUser
    }

    const body = requestSchema.parse(await request.json())

    const priceId = body.priceId ?? PLANS.pro_monthly.priceId

    if (!isConfiguredStripePrice(priceId)) {
      return diagnosticJson({
        area: "billing",
        code: "billing.checkout.price.invalid",
        data: null,
        error: "Selected plan is not available",
        request,
        status: 400
      })
    }

    const customerId = await getOrCreateStripeCustomer({
      email: user.email ?? null,
      userId: user.id
    })
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      metadata: {
        user_id: user.id
      },
      subscription_data: {
        metadata: {
          user_id: user.id
        }
      },
      success_url: body.returnUrl,
      cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/pricing`
    })

    if (!session.url) {
      return diagnosticJson({
        area: "billing",
        code: "billing.checkout.session.missing-url",
        data: null,
        error: "Stripe checkout session did not return a URL",
        log: true,
        request,
        status: 502
      })
    }

    return jsonResponse({
      data: { url: session.url },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "billing",
        code: "billing.checkout.request.invalid",
        data: null,
        error: "Invalid request body",
        request,
        status: 400
      })
    }

    const message =
      error instanceof Error ? error.message : "Checkout session failed"

    return diagnosticJson({
      area: "billing",
      code: "billing.checkout.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}
