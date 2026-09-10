import assert from "node:assert/strict"
import test from "node:test"
import { emptyDashboard, mapApplicationToRow, rowToApplication } from "../apps/web/domains/sync/row-mappers.ts"
import { normalizeLegacyDashboardPayload } from "../apps/web/domains/sync/legacy-payload.ts"
import { mapSyncEvents } from "../apps/web/domains/sync/sync-events.ts"
import { normalizeApplicationUrlKey } from "../apps/web/domains/sync/url-key.ts"

const application = (overrides = {}) => ({
  id: "app-1",
  title: "Business Analyst",
  url: "https://jobs.lever.co/acme/1",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "Saved",
  outcomeReason: "Unknown",
  ...overrides,
})

test("normalizeApplicationUrlKey canonicalises equivalent URLs to the same key", () => {
  const withTrailingSlash = normalizeApplicationUrlKey(
    "https://Example.com/Job/1/?utm_source=x#fragment",
  )
  const withoutTrailingSlash = normalizeApplicationUrlKey(
    "https://example.com/Job/1?utm_source=x",
  )

  assert.equal(withTrailingSlash, withoutTrailingSlash)
  assert.doesNotMatch(withTrailingSlash, /#/)
  assert.doesNotMatch(withTrailingSlash, /Example/)
})

test("normalizeApplicationUrlKey falls back to a trimmed lowercase key for an invalid URL", () => {
  assert.equal(
    normalizeApplicationUrlKey("Not A URL/"),
    "not a url",
  )
})

test("legacy dashboard payload migrates retired application and outcome statuses", () => {
  const migrated = normalizeLegacyDashboardPayload({
    applications: [{ id: "a1", status: "Applying" }, { id: "a2", status: "Closed" }],
    outcomeRecords: [{ id: "o1", status: "Applying" }],
  })

  assert.deepEqual(
    migrated.applications.map((item) => item.status),
    ["Ready to apply", "Archived"],
  )
  assert.equal(migrated.outcomeRecords[0].status, "Ready to apply")
})

test("legacy dashboard payload leaves current statuses and non-array fields untouched", () => {
  const migrated = normalizeLegacyDashboardPayload({
    applications: [{ id: "a1", status: "Interview" }],
    reusableAnswers: { motivationAnswer: "kept" },
  })

  assert.equal(migrated.applications[0].status, "Interview")
  assert.equal(migrated.reusableAnswers.motivationAnswer, "kept")
})

test("legacy dashboard payload passes through non-object input unchanged", () => {
  assert.equal(normalizeLegacyDashboardPayload(null), null)
  assert.equal(normalizeLegacyDashboardPayload("not-an-object"), "not-an-object")
})

test("mapApplicationToRow defaults a missing ATS platform to unknown and derives the url_key", () => {
  const row = mapApplicationToRow("user-1", application(), "web")

  assert.equal(row.ats_platform, "unknown")
  assert.equal(row.url_key, normalizeApplicationUrlKey(application().url))
  assert.equal(row.id, "app-1")
  assert.equal(row.source_surface, "web")
})

test("mapApplicationToRow honours an explicit id override for identity-matched upserts", () => {
  const row = mapApplicationToRow("user-1", application(), "web", "existing-row-id")

  assert.equal(row.id, "existing-row-id")
})

test("rowToApplication round-trips an application row back to the shared record shape", () => {
  const row = {
    id: "app-1",
    title: "Business Analyst",
    url: "https://jobs.lever.co/acme/1",
    url_key: "https://jobs.lever.co/acme/1",
    company: "Acme",
    role_title: null,
    source: null,
    ats_platform: "lever",
    status: "Saved",
    next_action: null,
    next_action_date: null,
    notes: null,
    outcome_reason: "Unknown",
    fit_score: 72,
    fit_decision: null,
    content_gate: null,
    content_snapshot: null,
    job_snapshot: null,
    source_surface: "web",
    schema_version: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  }

  const record = rowToApplication(row)

  assert.equal(record.id, "app-1")
  assert.equal(record.company, "Acme")
  assert.equal(record.atsPlatform, "lever")
  assert.equal(record.fitScore, 72)
})

test("emptyDashboard returns empty collections and blank reusable answers, not undefined", () => {
  const dashboard = emptyDashboard()

  assert.deepEqual(dashboard.applications, [])
  assert.deepEqual(dashboard.evidenceRecords, [])
  assert.deepEqual(dashboard.outcomeRecords, [])
  assert.deepEqual(dashboard.interviewPrepPacks, [])
  assert.equal(dashboard.reusableAnswers.motivationAnswer, "")
})

test("mapSyncEvents emits one event per synced entity and remaps ids through the application id map", () => {
  const applicationIdMap = new Map([["local-1", "server-1"]])
  const events = mapSyncEvents({
    applicationIdMap,
    payload: {
      applications: [application({ id: "local-1" })],
      evidenceRecords: [],
      outcomeRecords: [],
      interviewPrepPacks: [],
    },
    sourceSurface: "web",
    userId: "user-1",
  })

  assert.equal(events.length, 2)
  assert.equal(events[0].entity_type, "reusable_answers")
  assert.equal(events[1].entity_type, "application")
  assert.equal(events[1].entity_id, "server-1")
})

test("mapSyncEvents omits the reusable-answers event when the caller says none were synced", () => {
  const events = mapSyncEvents({
    payload: { applications: [] },
    sourceSurface: "web",
    userId: "user-1",
    includeReusableAnswers: false,
  })

  assert.deepEqual(events, [])
})
