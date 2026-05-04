import { fileURLToPath } from "node:url"

export const defaultUrl = "https://autotime-eu-apply.vercel.app"

export const expectedMarkers = [
  "AutoTime EU Apply",
  "European tech market guide",
  "Candidate OS",
  "Role Intelligence",
  "Pipeline",
  "Interview Desk",
  "European Tech Market Guide",
  "General tech",
  "FinTech",
  "Foreign / relocating",
  "Native / local",
  "User-Approved AI Intake",
  "Review CV Context",
  "Approve Suggestion",
  "AI Reasoning Layer",
  "Decision Brief",
  "Readiness Path",
  "Capture Role",
  "Export Evidence",
  "Save Dashboard",
  "Export JSON",
  "Import Dashboard"
]

export function getWebSmokeUrl(env = process.env) {
  return env.WEB_SMOKE_URL ?? defaultUrl
}

export async function runWebDashboardSmoke({
  url = defaultUrl,
  fetchImpl = fetch,
  markers = expectedMarkers
} = {}) {
  let response
  try {
    response = await fetchImpl(url, {
      headers: {
        "user-agent": "autotime-web-smoke/1.0"
      },
      redirect: "follow"
    })
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "request failed"
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      message: `expected HTTP 2xx, received ${response.status}`
    }
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("text/html")) {
    return {
      ok: false,
      message: `expected text/html content type, received ${contentType || "none"}`
    }
  }

  const body = await response.text()
  const missing = markers.filter((marker) => !body.includes(marker))

  if (missing.length) {
    return {
      ok: false,
      message: `missing dashboard markers: ${missing.join(", ")}`
    }
  }

  return { ok: true }
}

async function main() {
  const url = getWebSmokeUrl()
  console.log(`Checking AutoTime web dashboard: ${url}`)

  const result = await runWebDashboardSmoke({ url })

  if (result.ok) {
    console.log("PASS - deployed web dashboard returned expected V2 HTML")
    return
  }

  console.error(`FAIL - ${result.message}`)
  process.exitCode = 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(
      `FAIL - ${
        error instanceof Error ? error.message : "unexpected smoke test failure"
      }`
    )
    process.exitCode = 1
  })
}
