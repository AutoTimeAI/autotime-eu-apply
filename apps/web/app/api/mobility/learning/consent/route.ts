import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../../lib/api-auth"
import { createAdminClient } from "../../../../../lib/supabase/admin"
import { appendLearningConsent, type LearningWriteClient } from "../../../../../platform/mobility-learning/writer.ts"
import { toPublicApiError } from "../../../../../lib/public-api-error"

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request)
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 })
    const data = await appendLearningConsent(createAdminClient() as unknown as LearningWriteClient, user.id, await request.json())
    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch (error) {
    const invalid = error instanceof z.ZodError
    const status = invalid ? 400 : 500
    return NextResponse.json({ data: null, error: invalid ? "Invalid learning consent" : toPublicApiError(error instanceof Error ? error.message : "Learning consent failed", status) }, { status })
  }
}
