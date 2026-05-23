import { type NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "../../../../lib/api-auth"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { extractDocxText } from "../../../../lib/docx-cv"
import { addMvpBreadcrumb } from "../../../../lib/sentry-breadcrumbs"

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
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const { user, error: authError } = await getRequestUser(request)

  if (authError || !user) {
    return diagnosticJson({
      area: "account",
      code: "profile.cv-import.auth.missing-user",
      data: null,
      error: "Unauthorised",
      request,
      status: 401
    })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  addMvpBreadcrumb("job_import_started", {
    filePresent: file instanceof File
  })

  if (!(file instanceof File)) {
    return jsonResponse({
      data: null,
      error: "CV file is required.",
      status: 400
    })
  }

  if (!file.name.toLowerCase().endsWith(".docx")) {
    return jsonResponse({
      data: null,
      error: "Only DOCX Word files use this importer.",
      status: 400
    })
  }

  if (file.size > maxCvFileBytes) {
    return jsonResponse({
      data: null,
      error: "CV file is too large. Please import a DOCX under 5 MB.",
      status: 413
    })
  }

  try {
    const text = extractDocxText(Buffer.from(await file.arrayBuffer()))

    return jsonResponse({
      data: { text },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    return jsonResponse({
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Could not read this DOCX file.",
      status: 422
    })
  }
}
