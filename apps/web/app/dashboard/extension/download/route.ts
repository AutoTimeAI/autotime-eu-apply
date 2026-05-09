import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "../../../../lib/supabase/server"

const extensionFileName = "autotime-eu-apply-chrome-mv3-0.0.1.zip"

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirectTo", "/dashboard/extension")
    return NextResponse.redirect(loginUrl)
  }

  const filePath = join(
    process.cwd(),
    "private-downloads",
    extensionFileName
  )
  const file = await readFile(filePath)

  return new NextResponse(file, {
    headers: {
      "Content-Disposition": `attachment; filename="${extensionFileName}"`,
      "Content-Length": file.byteLength.toString(),
      "Content-Type": "application/zip",
      "Cache-Control": "private, no-store"
    }
  })
}
