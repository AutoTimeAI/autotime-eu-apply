import { fileURLToPath } from "node:url"

export const defaultUrl = "https://autotime-eu-apply.vercel.app"

export const expectedMarkers = [
  "AutoTime EU Apply",
  "Private Beta v1 - founder-led early access",
  "This is not the final public SaaS launch",
  "Start free",
  "Workflow system",
  "Country-aware fit",
  "Evidence discipline",
  "Interview conversion",
  "EU Fit Engine",
  "Smarter targeting. Stronger applications. More interviews.",
  "Official Verification Status",
  "No job, visa, sponsorship, or interview guarantees"
]

export function getWebSmokeUrl(env = process.env) {
  return env.SMOKE_BASE_URL ?? env.WEB_SMOKE_URL ?? env.PLAYWRIGHT_BASE_URL ?? defaultUrl
}

function describeFetchError(error) {
  if (!(error instanceof Error)) {
    return "request failed"
  }

  const cause =
    error.cause && typeof error.cause === "object"
      ? /** @type {{ code?: string, message?: string }} */ (error.cause)
      : undefined

  const causeText = cause?.message
    ? `; cause: ${cause.code ? `${cause.code} ` : ""}${cause.message}`
    : ""

  return `${error.message}${causeText}`
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
      message: describeFetchError(error)
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
    console.log(
      "PASS - deployed web dashboard returned expected Private Beta v1 HTML"
    )
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
