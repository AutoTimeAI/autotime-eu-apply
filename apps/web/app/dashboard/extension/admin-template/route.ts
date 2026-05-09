import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "../../../../lib/supabase/server"

const policyTemplate = {
  ExtensionSettings: {
    "__EXTENSION_ID__": {
      installation_mode: "normal_installed",
      update_url: "https://YOUR-COMPANY-DOMAIN.example/autotime/updates.xml",
      override_update_url: true,
      toolbar_pin: "force_pinned"
    }
  },
  notes: [
    "Replace __EXTENSION_ID__ with the stable Chrome extension ID.",
    "Use force_installed only for company-managed users who must have the extension.",
    "Self-hosted managed rollout needs a CRX package and update XML, not only the beta zip.",
    "For normal public customers, use the Chrome Web Store listing after approval."
  ]
}

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

  return NextResponse.json(policyTemplate, {
    headers: {
      "Content-Disposition":
        'attachment; filename="autotime-extension-admin-policy-template.json"',
      "Cache-Control": "private, no-store"
    }
  })
}
