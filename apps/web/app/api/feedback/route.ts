/**
 * POST /api/feedback
 *
 * Lets a signed-in beta user submit structured feedback into the existing
 * `beta_feedback` table (previously readable only by admins - no route
 * wrote to it, so real testers had no working in-app feedback path).
 *
 * Auth: requires a valid session, resolved via `getRequestUser` - same
 * pattern as /api/account/settings. Mutations are further restricted to
 * same-origin requests, matching /api/beta/redeem-invite.
 *
 * Responses:
 * - 201: `{ data: { id }, error: null, status: 201 }` on success.
 * - 400: invalid body (zod validation failure).
 * - 401: no authenticated user.
 * - 403: cross-origin request.
 * - 500: unexpected write error.
 */
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../lib/api-auth"
import { isSameOriginMutation } from "../../../lib/admin-authorization"
import { createAdminClient } from "../../../lib/supabase/admin"

const feedbackSchema = z.object({
  category: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1).max(5).optional(),
  message: z.string().trim().min(1).max(4000),
  productArea: z.string().trim().min(1).max(80),
  route: z.string().trim().max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return NextResponse.json(
        { data: null, error: "Unauthorised", status: 401 },
        { status: 401 },
      )
    }

    if (!isSameOriginMutation(request)) {
      return NextResponse.json(
        { data: null, error: "Invalid origin", status: 403 },
        { status: 403 },
      )
    }

    const parsed = feedbackSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: "That feedback couldn't be submitted. Check the required fields and try again.", status: 400 },
        { status: 400 },
      )
    }

    const { category, rating, message, productArea, route } = parsed.data
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("beta_feedback")
      .insert({
        category,
        rating: rating ?? null,
        message,
        product_area: productArea,
        route: route ?? null,
        user_id: user.id,
      })
      .select("id")
      .single()

    if (error) throw error

    return NextResponse.json(
      { data: { id: data.id }, error: null, status: 201 },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback submission failed"
    console.error("feedback_submit_failed", { reason: message })
    return NextResponse.json(
      { data: null, error: "Request could not be completed. Try again shortly.", status: 500 },
      { status: 500 },
    )
  }
}
