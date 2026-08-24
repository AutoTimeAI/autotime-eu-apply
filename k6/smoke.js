import http from "k6/http"
import { check, sleep } from "k6"

// Minimal, safe smoke test: 1-2 virtual users hitting only read-only,
// unauthenticated, non-mutating endpoints. Never targets production by
// default - see k6/README.md and docs/quality-assurance.md.

export const options = {
  vus: Number(__ENV.VUS) || 2,
  duration: __ENV.DURATION || "20s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"]
  }
}

const BASE_URL = __ENV.TARGET_URL || "http://127.0.0.1:3000"

// Only genuinely public, unauthenticated, non-mutating routes.
// /api/diagnostics/health is admin-gated (401/403 without a session) so it
// is deliberately excluded - it isn't a useful anonymous-load target.
const paths = ["/", "/login"]

export default function () {
  for (const path of paths) {
    const response = http.get(`${BASE_URL}${path}`)
    check(response, {
      "status is 200 or 3xx": (response) => response.status < 400
    })
  }

  sleep(1)
}
