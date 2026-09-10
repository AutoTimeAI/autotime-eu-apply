import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const readJson = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"))

test("every environment lane is explicit and production-only services stay isolated", async () => {
  const config = await readJson("config/environments.json")
  assert.deepEqual(Object.keys(config.lanes), ["local", "test", "preview", "staging", "production"])
  for (const [name, lane] of Object.entries(config.lanes)) {
    if (name !== "production") {
      assert.notEqual(lane.data, "production")
      assert.notEqual(lane.payments, "live")
      assert.equal(lane.cron, false)
    }
  }
})

test("every runtime and shared-policy boundary has an accountable owner", async () => {
  const config = await readJson("config/ownership.json")
  const paths = config.boundaries.map((boundary) => boundary.path)
  for (const required of ["apps/web", "apps/extension", "apps/analytics", "packages/shared", "supabase", "config"]) {
    assert.ok(paths.includes(required), required)
  }
  for (const boundary of config.boundaries) {
    assert.ok(boundary.owner)
    assert.ok(boundary.review.length > 0)
  }
})

test("structured logging contract requires correlation and excludes sensitive fields", async () => {
  const config = await readJson("config/monitoring/logging.json")
  assert.ok(config.requiredFields.includes("diagnosticId"))
  for (const sensitive of ["email", "access_token", "authorization", "password", "secret"]) {
    assert.ok(config.privacy.doNotLog.includes(sensitive), sensitive)
  }
})
