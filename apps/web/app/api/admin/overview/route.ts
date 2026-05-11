import { NextResponse } from "next/server"
import { isAdminUser } from "../../../../lib/admin-access"
import { getAdminOverview } from "../../../../lib/admin-monitoring"
import { getErrorMessage } from "../../../../lib/diagnostics"
import { createServerClient } from "../../../../lib/supabase/server"
import { getTestAuthUser } from "../../../../lib/test-auth"

export const dynamic = "force-dynamic"

async function getAdminRequestUser() {
  const testUser = getTestAuthUser()

  if (testUser) {
    return testUser
  }

  const supabase = await createServerClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function GET() {
  const user = await getAdminRequestUser()

  if (!user) {
    return NextResponse.json(
      { data: null, error: "Unauthorised", status: 401 },
      { status: 401 }
    )
  }

  if (!isAdminUser(user)) {
    return NextResponse.json(
      { data: null, error: "Forbidden", status: 403 },
      { status: 403 }
    )
  }

  try {
    return NextResponse.json(
      {
        data: await getAdminOverview(),
        error: null,
        status: 200
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      {
        data: null,
        error: getErrorMessage(error, "Unable to load admin overview"),
        status: 500
      },
      { status: 500 }
    )
  }
}
