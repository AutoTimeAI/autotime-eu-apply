import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "../../../../lib/supabase/server"
import { getTestAuthUser } from "../../../../lib/test-auth"

const extensionFileName = "autotime-eu-apply-chrome-mv3-0.0.3.zip"

export async function GET(request: NextRequest) {
  const testUser = getTestAuthUser()
  let user = testUser

  if (!user) {
    const supabase = await createServerClient()
    const {
      data: { user: sessionUser },
      error
    } = await supabase.auth.getUser()

    if (error || !sessionUser) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirectTo", "/dashboard/extension")
      return NextResponse.redirect(loginUrl)
    }

    user = sessionUser
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
