import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { publicEnv } from "../../../../lib/env"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { createServerClient } from "../../../../lib/supabase/server"
import { stripe } from "../../../../lib/stripe"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type PortalRouteData = {
  url: string
}

const requestSchema = z.object({
  returnUrl: z.string().url().optional()
})

function jsonResponse(
  body: ApiResponse<PortalRouteData>
): NextResponse<ApiResponse<PortalRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

async function getStripeCustomerId(userId: string): Promise<string | null> {
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

    return data?.stripe_customer_id ?? null
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to read Stripe customer"

    throw new Error(message)
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PortalRouteData>>> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ data: null, error: "Unauthorised", status: 401 })
    }

    const body = requestSchema.parse(await request.json())
    const customerId = await getStripeCustomerId(user.id)

    if (!customerId) {
      return jsonResponse({
        data: null,
        error: "No billing customer exists for this account",
        status: 400
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: body.returnUrl ?? `${publicEnv.NEXT_PUBLIC_APP_URL}/dashboard`
    })

    return jsonResponse({
      data: { url: session.url },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ data: null, error: "Invalid request body", status: 400 })
    }

    const message =
      error instanceof Error ? error.message : "Billing portal failed"

    return jsonResponse({ data: null, error: message, status: 500 })
  }
}
