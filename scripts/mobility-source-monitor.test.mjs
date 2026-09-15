import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import { captureOfficialSource, captureOfficialSourceArtifact, isAllowedOfficialSource, normalizeOfficialSource } from "../apps/web/platform/mobility-source-monitor/capture.ts"
import { archiveOfficialSource } from "../apps/web/platform/mobility-source-monitor/archive.ts"

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
  const artifact = await captureOfficialSourceArtifact("https://ind.nl/source", async () => new Response("<h1>Rule</h1>", { status: 200, headers: { "content-type": "text/html" } }))
  assert.equal(artifact.content, "<h1>Rule</h1>")
  assert.match(artifact.observation.normalizedSha256, /^[a-f0-9]{64}$/)
})

test("only explicitly allowlisted HTTPS hosts can be retrieved", () => {
  const hosts = new Set(["ind.nl"])
  assert.equal(isAllowedOfficialSource("https://ind.nl/source", hosts), true)
  assert.equal(isAllowedOfficialSource("http://ind.nl/source", hosts), false)
  assert.equal(isAllowedOfficialSource("https://ind.nl.attacker.test/source", hosts), false)
})

test("capture hashes raw and normalized content without returning source text", async () => {
  const result = await captureOfficialSource("https://ind.nl/source", async () => new Response("<h1>Rule</h1>", { status: 200 }))
  assert.equal(result.available, true)
  assert.match(result.rawSha256, /^[a-f0-9]{64}$/)
  assert.match(result.normalizedSha256, /^[a-f0-9]{64}$/)
  assert.equal(Object.values(result).includes("Rule"), false)
})

test("cron is daily and requires both CRON_SECRET and a source allowlist", () => {
  const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"))
  assert.deepEqual(config.crons, [{ path: "/api/cron/mobility-source-monitor", schedule: "17 4 * * *" }])
  const route = fs.readFileSync("apps/web/app/api/cron/mobility-source-monitor/route.ts", "utf8")
  assert.match(route, /timingSafeEqual/)
  assert.match(route, /MOBILITY_SOURCE_HOST_ALLOWLIST/)
  assert.match(route, /baseline_quarantined_for_review/)
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
