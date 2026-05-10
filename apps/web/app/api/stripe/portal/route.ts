import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { publicEnv } from "../../../../lib/env"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { createServerClient } from "../../../../lib/supabase/server"
import { stripe } from "../../../../lib/stripe"
import { getTestAuthUser } from "../../../../lib/test-auth"

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
          code: "billing.portal.auth.missing-user",
          data: null,
          error: "Unauthorised",
          request,
          status: 401
        })
      }

      user = sessionUser
    }

    const body = requestSchema.parse(await request.json())
    const customerId = await getStripeCustomerId(user.id)

    if (!customerId) {
      return diagnosticJson({
        area: "billing",
        code: "billing.portal.customer.missing",
        data: null,
        error: "No billing customer exists for this account",
        request,
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
      return diagnosticJson({
        area: "billing",
        code: "billing.portal.request.invalid",
        data: null,
        error: "Invalid request body",
        request,
        status: 400
      })
    }

    const message =
      error instanceof Error ? error.message : "Billing portal failed"

    return diagnosticJson({
      area: "billing",
      code: "billing.portal.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}
