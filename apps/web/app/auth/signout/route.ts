// Sign-out endpoint used by client-side UI (e.g. a "Sign out" button) to end
// the current Supabase session. Server-only route handler that clears the
// session cookies via Supabase's `auth.signOut()` and returns a small JSON
// result rather than redirecting, so callers decide where to navigate next.
import { NextResponse } from "next/server"
import { createServerClient } from "../../../lib/supabase/server"

type SignOutResponse = {
  data: { signedOut: boolean } | null
  error: string | null
  status: number
}

function jsonResponse(
  body: SignOutResponse
): NextResponse<SignOutResponse> {
  return NextResponse.json(body, { status: body.status })
}

/**
 * Signs the current user out of their Supabase session and returns
 * `{ data: { signedOut: true } }` on success, or a 500 with an `error`
 * message if the sign-out call fails or throws.
 */
export async function POST(): Promise<NextResponse<SignOutResponse>> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return jsonResponse({
        data: null,
        error: error.message,
        status: 500
      })
    }

    return jsonResponse({
      data: { signedOut: true },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    return jsonResponse({
      data: null,
      error: error instanceof Error ? error.message : "Sign out failed",
      status: 500
    })
  }
}
