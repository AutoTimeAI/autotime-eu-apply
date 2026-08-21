import http from "k6/http"
import { check, sleep } from "k6"

// Configurable load test for safe, public, read-only, non-mutating pages
// only. Never targets production unless TARGET_URL is explicitly pointed
// there by a human running k6/k6-manual.yml - see k6/README.md.

const VUS = Number(__ENV.VUS) || 5
const DURATION = __ENV.DURATION || "1m"

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"]
  }
}

const BASE_URL = __ENV.TARGET_URL || "http://127.0.0.1:3000"
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
