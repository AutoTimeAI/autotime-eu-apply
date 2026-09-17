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

// The public homepage check above cannot catch a broken backend - it's
// unauthenticated marketing copy with no Supabase dependency. Found the hard
// way (2026-09-17): a Supabase project mismatch in the production
// environment left every authenticated route returning a redacted 503,
// while this smoke test kept passing because it only ever checked "/".
// This second check hits a protected route without following redirects: a
// healthy deployment 3xx-redirects an unauthenticated visitor to /login
// (see apps/web/app/dashboard/layout.tsx); a backend/config failure
// surfaces as a 5xx instead, which this catches and the homepage check
// cannot.
export async function runProtectedRouteSmoke({
  url = defaultUrl,
  fetchImpl = fetch,
  path = "/dashboard"
} = {}) {
  let response
  try {
    response = await fetchImpl(new URL(path, url).toString(), {
      headers: {
        "user-agent": "autotime-web-smoke/1.0"
      },
      redirect: "manual"
    })
  } catch (error) {
    return {
      ok: false,
      message: describeFetchError(error)
    }
  }

  if (response.status < 300 || response.status >= 400) {
    return {
      ok: false,
      message: `expected a 3xx redirect to login for an unauthenticated ${path} request, received ${response.status}`
    }
  }

  return { ok: true }
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

  const homepageResult = await runWebDashboardSmoke({ url })
  if (homepageResult.ok) {
    console.log(
      "PASS - deployed web dashboard returned expected Private Beta v1 HTML"
    )
  } else {
    console.error(`FAIL - ${homepageResult.message}`)
    process.exitCode = 1
  }

  const protectedRouteResult = await runProtectedRouteSmoke({ url })
  if (protectedRouteResult.ok) {
    console.log("PASS - protected /dashboard route redirects unauthenticated visitors, backend is reachable")
  } else {
    console.error(`FAIL - ${protectedRouteResult.message}`)
    process.exitCode = 1
  }
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
