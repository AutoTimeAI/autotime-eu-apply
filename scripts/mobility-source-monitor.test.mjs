import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import { captureOfficialSource, captureOfficialSourceArtifact, isAllowedOfficialSource, normalizeOfficialSource } from "../apps/web/platform/mobility-source-monitor/capture.ts"
import { archiveOfficialSource } from "../apps/web/platform/mobility-source-monitor/archive.ts"
import { resolveSourceJurisdictionCode } from "../apps/web/platform/mobility-source-monitor/jurisdiction.ts"

test("source normalization removes executable and presentation noise", () => {
  assert.equal(normalizeOfficialSource("<style>x{}</style><h1> Permit </h1><script>bad()</script><p>rule</p>"), "Permit rule")
})

test("source artifacts use a private immutable object path", async () => {
  const uploads = []
  const client = { storage: { from(bucket) { return { async upload(path, content, options) { uploads.push({ bucket, path, content, options }); return { data: { path }, error: null } } } } } }
  const uri = await archiveOfficialSource({ client, sourceDocumentId: "doc-1", content: "official", contentType: "text/html", rawSha256: "a".repeat(64), capturedAt: "2026-09-14T12:00:00Z" })
  assert.match(uri, /^supabase-storage:\/\/mobility-source-snapshots\//)
  assert.equal(uploads[0].options.upsert, false)
  assert.equal(uploads[0].bucket, "mobility-source-snapshots")
})

test("artifact capture retains content only for private archival", async () => {
  const artifact = await captureOfficialSourceArtifact("https://ind.nl/source", new Set(["ind.nl"]), async () => new Response("<h1>Rule</h1>", { status: 200, headers: { "content-type": "text/html" } }))
  assert.equal(artifact.content, "<h1>Rule</h1>")
  assert.match(artifact.observation.normalizedSha256, /^[a-f0-9]{64}$/)
})

test("only explicitly allowlisted HTTPS hosts can be retrieved", () => {
  const hosts = new Set(["ind.nl"])
  assert.equal(isAllowedOfficialSource("https://ind.nl/source", hosts), true)
  assert.equal(isAllowedOfficialSource("http://ind.nl/source", hosts), false)
  assert.equal(isAllowedOfficialSource("https://ind.nl.attacker.test/source", hosts), false)
})

test("source jurisdictions support ISO country codes without a hard-coded market ceiling", () => {
  assert.equal(resolveSourceJurisdictionCode("pt"), "PT")
  assert.equal(resolveSourceJurisdictionCode(" SE "), "SE")
  assert.equal(resolveSourceJurisdictionCode("United Kingdom"), "GB")
  assert.equal(resolveSourceJurisdictionCode("Netherlands"), "NL")
  assert.equal(resolveSourceJurisdictionCode("Portugal"), null)
  assert.equal(resolveSourceJurisdictionCode("EUROPE"), null)
})

test("capture hashes raw and normalized content without returning source text", async () => {
  const result = await captureOfficialSource("https://ind.nl/source", new Set(["ind.nl"]), async () => new Response("<h1>Rule</h1>", { status: 200 }))
  assert.equal(result.available, true)
  assert.match(result.rawSha256, /^[a-f0-9]{64}$/)
  assert.match(result.normalizedSha256, /^[a-f0-9]{64}$/)
  assert.equal(Object.values(result).includes("Rule"), false)
})

test("capture refuses redirects to hosts outside the allowlist", async () => {
  const visited = []
  const result = await captureOfficialSourceArtifact("https://ind.nl/source", new Set(["ind.nl"]), async (url) => {
    visited.push(String(url))
    return new Response(null, { status: 302, headers: { location: "https://attacker.test/private" } })
  })
  assert.equal(result.observation.available, false)
  assert.deepEqual(visited, ["https://ind.nl/source"])
})

test("capture follows redirects only when every hop is allowlisted", async () => {
  const visited = []
  const result = await captureOfficialSourceArtifact("https://ind.nl/old", new Set(["ind.nl"]), async (url) => {
    visited.push(String(url))
    if (String(url).endsWith("/old")) return new Response(null, { status: 302, headers: { location: "/current" } })
    return new Response("<h1>Current rule</h1>", { status: 200 })
  })
  assert.equal(result.observation.available, true)
  assert.deepEqual(visited, ["https://ind.nl/old", "https://ind.nl/current"])
})

test("capture stops reading bodies that exceed the archive limit", async () => {
  const oversized = "x".repeat(5_242_881)
  const result = await captureOfficialSourceArtifact("https://ind.nl/source", new Set(["ind.nl"]), async () => new Response(oversized, { status: 200 }))
  assert.equal(result.observation.available, false)
  assert.equal(result.content, null)
})

test("cron is daily and requires both CRON_SECRET and a source allowlist", () => {
  const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"))
  assert.deepEqual(config.crons, [{ path: "/api/cron/mobility-source-monitor", schedule: "17 4 * * *" }])
  const route = fs.readFileSync("apps/web/app/api/cron/mobility-source-monitor/route.ts", "utf8")
  assert.match(route, /timingSafeEqual/)
  assert.match(route, /MOBILITY_SOURCE_HOST_ALLOWLIST/)
  assert.match(route, /baseline_quarantined_for_review/)
  assert.match(route, /recordUnavailableInitialSource/)
  assert.match(route, /mobility_source_monitor_started/)
  assert.match(route, /mobility_source_monitor_completed/)
  assert.match(route, /mobility_source_monitor_source_failed/)
  assert.match(route, /status: failed === 0 \? 200 : 503/)
  assert.match(route, /source_monitor_failed/)
  assert.match(route, /statusCounts/)
  assert.match(route, /sourceBatchSize = 20/)
  assert.match(route, /sourceConcurrency = 4/)
  assert.match(route, /Promise\.all\(Array\.from\(\{ length: Math\.min\(sourceConcurrency, documents\.length\) \}/)
  assert.match(route, /utcDay \* sourceBatchSize/)
  assert.match(route, /\.order\("id"\)\.range\(batchOffset, firstBatchEnd\)/)
  assert.match(route, /\.order\("id"\)\.range\(0, remaining - 1\)/)
  assert.doesNotMatch(route, /console\.(?:info|warn|error)\([^\n]*(?:canonical_url|snapshotUri|content)/)
  assert.match(fs.readFileSync("apps/web/platform/mobility-source-monitor/capture.ts", "utf8"), /SOURCE_FETCH_TIMEOUT_MS = 8_000/)
})

test("every integrated Stamp4 threshold source is registered and allowlisted", () => {
  const migration = fs.readFileSync("supabase/migrations/20260915120000_seed_integrated_stamp4_sources.sql", "utf8")
  const environment = fs.readFileSync(".env.production.example", "utf8")
  const allowlist = environment.match(/^MOBILITY_SOURCE_HOST_ALLOWLIST=(.+)$/m)?.[1].trim().split(",") ?? []
  const expected = [
    ["https://www.gov.uk/skilled-worker-visa/your-job", "www.gov.uk"],
    ["https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/", "enterprise.gov.ie"],
    ["https://ind.nl/en/required-amounts-income-requirements", "ind.nl"],
    ["https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card", "www.make-it-in-germany.com"],
  ]
  for (const [url, host] of expected) {
    assert.match(migration, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    assert.ok(allowlist.includes(host), `${host} must be in MOBILITY_SOURCE_HOST_ALLOWLIST`)
  }
})
