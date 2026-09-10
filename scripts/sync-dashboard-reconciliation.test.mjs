import assert from "node:assert/strict"
import test from "node:test"
import {
  buildApplicationIdMap,
  filterActiveChildRecords,
  partitionApplicationsByTombstone,
  resolveDeleteTarget,
} from "../apps/web/domains/sync/reconcile-applications.ts"
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

test("partitionApplicationsByTombstone keeps an application active when its url is not tombstoned", () => {
  const { activeApplications, deletedApplicationIds } =
    partitionApplicationsByTombstone([application()], new Set())

  assert.deepEqual(deletedApplicationIds, [])
  assert.equal(activeApplications.length, 1)
  assert.equal(activeApplications[0].id, "app-1")
})

test("partitionApplicationsByTombstone routes a tombstoned url to deletedApplicationIds instead of active", () => {
  const deletedUrlKeys = new Set([
    normalizeApplicationUrlKey("https://jobs.lever.co/acme/1"),
  ])

  const { activeApplications, deletedApplicationIds } =
    partitionApplicationsByTombstone([application()], deletedUrlKeys)

  assert.deepEqual(deletedApplicationIds, ["app-1"])
  assert.deepEqual(activeApplications, [])
})

test("partitionApplicationsByTombstone falls back to the application id when the url is blank", () => {
  const deletedUrlKeys = new Set([normalizeApplicationUrlKey("manual-entry-1")])

  const { deletedApplicationIds } = partitionApplicationsByTombstone(
    [application({ id: "manual-entry-1", url: "" })],
    deletedUrlKeys,
  )

  assert.deepEqual(deletedApplicationIds, ["manual-entry-1"])
})

test("buildApplicationIdMap maps a client id to the server row sharing its url_key", () => {
  const idMap = buildApplicationIdMap(
    [application({ id: "client-local-id" })],
    [{ id: "server-row-id", url_key: normalizeApplicationUrlKey("https://jobs.lever.co/acme/1") }],
  )

  assert.equal(idMap.get("client-local-id"), "server-row-id")
})

test("buildApplicationIdMap leaves a genuinely new application unmapped, so it upserts under its own id", () => {
  const idMap = buildApplicationIdMap(
    [application({ id: "brand-new" })],
    [{ id: "unrelated-row", url_key: normalizeApplicationUrlKey("https://jobs.lever.co/acme/DIFFERENT") }],
  )

  assert.equal(idMap.has("brand-new"), false)
})

test("filterActiveChildRecords keeps evidence without an applicationId (profile-level checks)", () => {
  const { activeEvidenceRecords } = filterActiveChildRecords({
    activeApplicationIds: new Set(),
    evidenceRecords: [{ id: "e1", applicationId: undefined }],
    outcomeRecords: [],
    interviewPrepPacks: [],
  })

  assert.equal(activeEvidenceRecords.length, 1)
})

test("filterActiveChildRecords drops evidence, outcome and prep records whose application was tombstoned", () => {
  const activeApplicationIds = new Set(["kept-app"])
  const result = filterActiveChildRecords({
    activeApplicationIds,
    evidenceRecords: [
      { id: "e-kept", applicationId: "kept-app" },
      { id: "e-dropped", applicationId: "deleted-app" },
    ],
    outcomeRecords: [
      { id: "o-kept", applicationId: "kept-app" },
      { id: "o-dropped", applicationId: "deleted-app" },
    ],
    interviewPrepPacks: [
      { id: "p-kept", applicationId: "kept-app" },
      { id: "p-dropped", applicationId: "deleted-app" },
    ],
  })

  assert.deepEqual(result.activeEvidenceRecords.map((r) => r.id), ["e-kept"])
  assert.deepEqual(result.activeOutcomeRecords.map((r) => r.id), ["o-kept"])
  assert.deepEqual(result.activeInterviewPrepPacks.map((r) => r.id), ["p-kept"])
})

test("resolveDeleteTarget collects every matching row's id and uses the first row's canonical url_key", () => {
  const { targetIds, urlKey } = resolveDeleteTarget({
    body: { applicationId: "app-1" },
    existingApplications: [
      { id: "app-1", url_key: "https://jobs.lever.co/acme/1" },
      { id: "app-1-duplicate", url_key: "https://jobs.lever.co/acme/1" },
    ],
  })

  assert.deepEqual(targetIds, ["app-1", "app-1-duplicate"])
  assert.equal(urlKey, "https://jobs.lever.co/acme/1")
})

test("resolveDeleteTarget falls back to a normalized url_key when no row exists yet (client ahead of server)", () => {
  const { targetIds, urlKey } = resolveDeleteTarget({
    body: { url: "https://Example.com/Job/1/" },
    existingApplications: [],
  })

  assert.deepEqual(targetIds, [])
  assert.equal(urlKey, normalizeApplicationUrlKey("https://Example.com/Job/1/"))
})

test("resolveDeleteTarget falls back to the applicationId when neither a row nor a url is available", () => {
  const { targetIds, urlKey } = resolveDeleteTarget({
    body: { applicationId: "orphan-id" },
    existingApplications: null,
  })

  assert.deepEqual(targetIds, [])
  assert.equal(urlKey, normalizeApplicationUrlKey("orphan-id"))
})
