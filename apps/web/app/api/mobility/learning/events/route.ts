import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../../lib/api-auth"
import { createAdminClient } from "../../../../../lib/supabase/admin"
import { appendLearningEvent, type LearningWriteClient } from "../../../../../platform/mobility-learning/writer.ts"

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request)
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 })
    const data = await appendLearningEvent(createAdminClient() as unknown as LearningWriteClient, user.id, await request.json())
    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch (error) {
    const invalid = error instanceof z.ZodError
    return NextResponse.json({ data: null, error: invalid ? "Invalid learning event" : error instanceof Error ? error.message : "Learning event failed" }, { status: invalid ? 400 : 500 })
  }
}
