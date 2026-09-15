import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import { recordInitialSourceBaseline, recordSourceObservationChange, recordUnavailableInitialSource } from "../apps/web/platform/mobility-source-monitor/writer.ts"

const hash = (value) => value.repeat(64)
const previous = { available: true, httpStatus: 200, rawSha256: hash("a"), normalizedSha256: hash("b"), parserVersion: "1", normalizerVersion: "1" }

test("a material observation is classified and propagated through one RPC", async () => {
  const calls = []
  const client = { async rpc(name, args) { calls.push({ name, args }); return { data: "event-1", error: null } } }
  const result = await recordSourceObservationChange({
    client, sourceDocumentId: "source-1", previousVersionId: "version-1",
    observedVersionId: "version-2", countryCode: "nl", previous,
    current: { ...previous, normalizedSha256: hash("c") },
    observedAt: "2026-09-14T12:00:00Z",
  })
  assert.equal(result.classification.classification, "material_content")
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, "record_and_propagate_mobility_source_change")
  assert.equal(calls[0].args.p_country_code, "NL")
  assert.equal(calls[0].args.p_quarantine, true)
  assert.equal(calls[0].args.p_observed_version, null)
})

test("the propagation transaction blocks every critically dependent bundle", () => {
  const source = fs.readFileSync("supabase/migrations/20260912250000_propagate_mobility_source_change.sql", "utf8")
  assert.match(source, /rule_link\.critical/i)
  assert.match(source, /'quarantined', 0, 'blocked'/i)
  assert.match(source, /CRITICAL_SOURCE_CHANGE/)
  assert.match(source, /array\[created_event_id\]/i)
  assert.match(source, /grant execute[\s\S]*to service_role/i)
  assert.match(source, /insert into public\.mobility_source_versions/i)
})

test("new source versions persist validated redirect provenance", () => {
  const source = fs.readFileSync("supabase/migrations/20260915130000_record_mobility_source_redirect_chain.sql", "utf8")
  assert.match(source, /p_observed_version->'redirectChain'/)
  assert.match(source, /jsonb_typeof\(source_redirect_chain\) <> 'array'/)
  assert.match(source, /snapshot_uri, redirect_chain/)
  assert.match(source, /grant execute[\s\S]*to service_role/i)
})

test("provider failures are redacted", async () => {
  const client = { async rpc() { return { data: null, error: { message: "private database detail" } } } }
  await assert.rejects(
    recordSourceObservationChange({ client, sourceDocumentId: "source-1", previousVersionId: null, observedVersionId: null, countryCode: "DE", previous, current: previous }),
    /^Error: Mobility source-change event could not be recorded$/,
  )
})

test("a first source capture becomes version one but stays quarantined for review", async () => {
  const calls = []
  const client = { async rpc(name, args) { calls.push({ name, args }); return { data: "event-1", error: null } } }
  await recordInitialSourceBaseline({ client, sourceDocumentId: "source-1", countryCode: "DE", observation: previous, snapshotUri: "supabase-storage://mobility-source-snapshots/source-1/a", language: "en", redirectChain: [] })
  assert.equal(calls[0].args.p_observed_version.version, 1)
  assert.equal(calls[0].args.p_classification, "pipeline_changed")
  assert.equal(calls[0].args.p_quarantine, true)
  assert.deepEqual(calls[0].args.p_reason_codes, ["INITIAL_SOURCE_BASELINE_REVIEW_REQUIRED"])
  assert.deepEqual(calls[0].args.p_observed_version.redirectChain, [])
})

test("a failed first capture creates immutable unavailable evidence without inventing a version", async () => {
  const calls = []
  const client = { async rpc(name, args) { calls.push({ name, args }); return { data: "event-2", error: null } } }
  const eventId = await recordUnavailableInitialSource({ client, sourceDocumentId: "source-2", countryCode: "pt", observedAt: "2026-09-15T12:00:00Z" })
  assert.equal(eventId, "event-2")
  assert.equal(calls[0].name, "record_and_propagate_mobility_source_change")
  assert.equal(calls[0].args.p_country_code, "PT")
  assert.equal(calls[0].args.p_classification, "unavailable")
  assert.equal(calls[0].args.p_observed_version, null)
  assert.equal(calls[0].args.p_quarantine, true)
  assert.deepEqual(calls[0].args.p_reason_codes, ["INITIAL_SOURCE_UNAVAILABLE"])
})
