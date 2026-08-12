import { type NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { extractDocxText } from "../../../../lib/docx-cv"
import { extractPdfText } from "../../../../lib/pdf-cv"

type ApiResponse = {
  data: { text: string } | null
  error: string | null
  status: number
}

const maxCvFileBytes = 5 * 1024 * 1024

function jsonResponse(body: ApiResponse): NextResponse<ApiResponse> {
  return NextResponse.json(body, { status: body.status })
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  let user
  let authError
  try {
    ;({ user, error: authError } = await getRequestUser(request))
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "auth",
        code: "profile.import.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    throw error
  }

  if (authError || !user) {
    return diagnosticJson({
      area: "account",
      code: "profile.cv-import.auth.missing-user",
      data: null,
      error: "Unauthorised",
      request,
      status: 401,
    })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return jsonResponse({
      data: null,
      error: "CV file is required.",
      status: 400,
    })
  }

  const extension = file.name.toLowerCase().split(".").pop()
  if (extension !== "docx" && extension !== "pdf") {
    return jsonResponse({
      data: null,
      error: "Upload a DOCX or text-based PDF file.",
      status: 400,
    })
  }

  if (file.size > maxCvFileBytes) {
    return jsonResponse({
      data: null,
      error: "CV file is too large. Please upload a DOCX or PDF under 5 MB.",
      status: 413,
    })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const text = extension === "pdf" ? await extractPdfText(buffer) : extractDocxText(buffer)

    return jsonResponse({
      data: { text },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    return jsonResponse({
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Could not read this CV file.",
      status: 422,
    })
  }
}
