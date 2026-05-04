const defaultUrl = "https://autotime-eu-apply-webs.vercel.app/"
const url = process.env.WEB_SMOKE_URL ?? defaultUrl

const expectedMarkers = [
  "AutoTime EU Apply V2",
  "Companion Dashboard",
  "Profile",
  "Job Review",
  "Applications",
  "Interview Prep",
  "Save Dashboard",
  "Export JSON",
  "Import Dashboard"
]

function fail(message) {
  console.error(`FAIL - ${message}`)
  process.exitCode = 1
}

async function main() {
  console.log(`Checking AutoTime web dashboard: ${url}`)

  let response
  try {
    response = await fetch(url, {
      headers: {
        "user-agent": "autotime-web-smoke/1.0"
      },
      redirect: "follow"
    })
  } catch (error) {
    fail(error instanceof Error ? error.message : "request failed")
    return
  }

  if (!response.ok) {
    fail(`expected HTTP 2xx, received ${response.status}`)
    return
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("text/html")) {
    fail(`expected text/html content type, received ${contentType || "none"}`)
    return
  }

  const body = await response.text()
  const missing = expectedMarkers.filter((marker) => !body.includes(marker))

  if (missing.length) {
    fail(`missing dashboard markers: ${missing.join(", ")}`)
    return
  }

  console.log("PASS - deployed web dashboard returned expected V2 HTML")
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "unexpected smoke test failure")
})
