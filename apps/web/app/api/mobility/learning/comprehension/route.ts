import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../../lib/api-auth"
import { createAdminClient } from "../../../../../lib/supabase/admin"
import { appendComprehensionResponse, type LearningWriteClient } from "../../../../../platform/mobility-learning/writer.ts"

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request)
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 })
    const data = await appendComprehensionResponse(createAdminClient() as unknown as LearningWriteClient, user.id, await request.json())
    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch (error) {
    const invalid = error instanceof z.ZodError
    return NextResponse.json({ data: null, error: invalid ? "Invalid comprehension response" : error instanceof Error ? error.message : "Comprehension response failed" }, { status: invalid ? 400 : 500 })
  }
}
