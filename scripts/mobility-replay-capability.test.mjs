import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const routePath = new URL("../apps/web/app/api/mobility/decisions/[decisionId]/actions/route.ts", import.meta.url)
const workspacePath = new URL("../apps/web/components/JobApplicationWorkspace.tsx", import.meta.url)

test("original-version replay completes synchronously without an orphaned queue", async () => {
  const source = await readFile(routePath, "utf8")

  assert.match(source, /body\.mode === "original_versions"/)
  assert.match(source, /evaluateMobilityRuleCase/)
  assert.match(source, /state:\s*"succeeded"/)
  assert.match(source, /completed_at:\s*now/)
  assert.match(source, /idempotencyKey/)
  assert.match(source, /MOBILITY_REPLAY_INTEGRITY_FAILURE/)
  assert.match(source, /inserted\.error\?\.code === "23505"/)
  assert.doesNotMatch(source, /state:\s*["']queued["']/)
})

test("the workspace accurately offers the supported original-policy replay", async () => {
  const source = await readFile(workspacePath, "utf8")

  assert.match(source, /Replay original policy/)
  assert.match(source, /mode: "original_versions"/)
  assert.match(source, /Hashed CV and profile evidence remain private/)
})

test("the workspace exposes approved successor comparison separately", async () => {
  const source = await readFile(workspacePath, "utf8")

  assert.match(source, /Compare approved current policy/)
  assert.match(source, /mode: "successor_comparison"/)
  assert.match(source, /audited, active successor bundle/)
  assert.match(source, /DecisionReplayHistory/)
  assert.match(source, /Recorded policy comparisons/)
  assert.match(source, /Decision or matched rule changed/)
})

test("successor comparison uses only the audited active successor pointer", async () => {
  const source = await readFile(routePath, "utf8")
  assert.match(source, /mobility_rule_bundle_current/)
  assert.match(source, /activation_id,activated_at/)
  assert.match(source, /successorBundle\.data\.state !== "active"/)
  assert.match(source, /successorBundle\.data\.version <= originalBundle\.data\.version/)
  assert.match(source, /MOBILITY_SUCCESSOR_REPLAY_UNAVAILABLE/)
  assert.match(source, /MOBILITY_SUCCESSOR_REPLAY_RULES_INVALID/)
  assert.match(source, /replay_rule_bundle_version_id: successorBundle\.data\.id/)
  assert.match(source, /changed: !equivalent/)
  assert.doesNotMatch(source, /MOBILITY_SUCCESSOR_REPLAY_NOT_EXECUTABLE/)
})
