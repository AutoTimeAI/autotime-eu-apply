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
