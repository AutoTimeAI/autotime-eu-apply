import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

test("the shared decision contract distinguishes unchecked from not found employers", () => {
  const source = fs.readFileSync("packages/shared/src/evidence/decision.ts", "utf8")
  assert.match(source, /"not_checked"/)
  assert.match(source, /"not_found"/)
})

test("the candidate-facing lineage ledger exposes employer verification state", () => {
  const source = fs.readFileSync("apps/web/components/JobApplicationWorkspace.tsx", "utf8")
  assert.match(source, />Employer check</)
  assert.match(source, /ledger\.employerVerification\?\.state/)
  assert.match(source, /reason_codes/)
})
