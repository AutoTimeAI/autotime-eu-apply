import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = await readFile(new URL("../supabase/migrations/20260912330000_governed_mobility_correction_review.sql", import.meta.url), "utf8")
const route = await readFile(new URL("../apps/web/app/api/admin/mobility-corrections/review/route.ts", import.meta.url), "utf8")
const queue = await readFile(new URL("../apps/web/app/admin/mobility-corrections/AdminMobilityCorrectionQueue.tsx", import.meta.url), "utf8")
const ledgerRoute = await readFile(new URL("../apps/web/app/api/mobility/decisions/[decisionId]/route.ts", import.meta.url), "utf8")
const workspace = await readFile(new URL("../apps/web/components/JobApplicationWorkspace.tsx", import.meta.url), "utf8")

test("correction reviews are append-only and owner governed", () => {
  assert.match(migration, /mobility_decision_correction_reviews_no_mutation/)
  assert.match(migration, /active owner membership required/)
  assert.match(migration, /invalid correction review transition/)
  assert.match(migration, /mobility_correction_reviewed/)
})

test("accepted corrections require evidence-linked successor lineage", () => {
  assert.match(migration, /accepted correction requires evidence and successor decision/)
  assert.match(migration, /successor\.supersedes_decision_id <> correction\.original_decision_id/)
  assert.match(migration, /successor\.user_id <> correction\.user_id/)
  assert.match(migration, /mobility_candidate_evidence_items item/)
  assert.match(migration, /evidence reference is invalid or inaccessible/)
  assert.match(route, /Accepted corrections require evidence and a successor decision/)
})

test("admin route requires explicit permission, origin and confirmation", () => {
  assert.match(route, /requireAdminRequest\(request, "mobility_corrections:review"\)/)
  assert.match(route, /isSameOriginMutation/)
  assert.match(route, /confirm: z\.literal\(true\)/)
  assert.match(route, /admin_review_mobility_decision_correction/)
})

test("operator queue preserves triaged work and removes terminal reviews", () => {
  assert.match(queue, /decision === "triaged"/)
  assert.match(queue, /state: "triaged"/)
  assert.match(queue, /current\.filter/)
  assert.match(queue, /Accept with successor/)
})

test("candidate ledger exposes safe correction outcomes after ownership filtering", () => {
  assert.match(ledgerRoute, /mobility_decision_correction_reviews/)
  assert.match(ledgerRoute, /\.in\("correction_id", correctionIds\)/)
  assert.doesNotMatch(ledgerRoute, /reviewer_id/)
  assert.match(workspace, /DecisionCorrectionHistory/)
  assert.match(workspace, /Disagreement history/)
  assert.match(workspace, /Corrected by successor decision/)
})

test("submitted corrections enter learning only through explicit stored consent", () => {
  assert.match(workspace, /learningConsent\?\.enabled && correctionId/)
  assert.match(workspace, /eventType: "correction_submitted"/)
  assert.match(workspace, /evidenceClass: "user_reported"/)
  assert.match(migration, /mobility_learning_events_correction_shape/)
  assert.match(migration, /correction\.user_id = new\.user_id/)
  assert.match(migration, /correction\.original_decision_id = new\.decision_id/)
})
