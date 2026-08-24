/**
 * POST /api/profile/import-cv
 *
 * Extracts plain text from an uploaded CV file (DOCX or text-based PDF)
 * for use in the profile-import flow. Does not persist anything itself —
 * just returns extracted text.
 *
 * Auth: requires a valid session — resolved via `getRequestUser`. Requests
 * without a recognised user receive 401.
 *
 * Behaviour: accepts a `multipart/form-data` upload (`file` field),
 * restricted to `.docx`/`.pdf` extensions and a 5 MB size cap
 * (`maxCvFileBytes`).
 */
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

/**
 * Extracts text from an uploaded CV file for the authenticated caller.
 *
 * Request: `multipart/form-data` with a `file` field (`.docx` or `.pdf`,
 * up to 5 MB).
 *
 * Responses:
 * - 200: `{ data: { text }, error: null, status: 200 }`.
 * - 400: missing file, or unsupported extension.
 * - 401: no authenticated user.
 * - 413: file exceeds the 5 MB limit.
 * - 422: file could not be parsed/read.
 * - 503: backing configuration unavailable.
 */
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
