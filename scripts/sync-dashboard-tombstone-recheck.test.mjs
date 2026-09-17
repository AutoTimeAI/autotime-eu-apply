import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

// POST /api/sync/dashboard reads which applications are tombstoned once,
// early in the handler, then only writes the still-active ones several
// awaits later (a reusable-answers upsert, an application-identity lookup).
// A DELETE for one of those same applications landing in that window would
// have its tombstone missed entirely, since nothing re-checks before the
// write - resurrecting an application the user just deleted from another
// tab/device via this sync's insert. Documented as a known gap for a long
// time before this fix (see docs/quality-assurance.md's "Known gaps"
// section, independently re-confirmed twice) because closing the *full*
// lost-update problem (a concurrent edit racing the same upsert) needs a
// real per-row CAS design. This narrower piece - a delete losing to a
// stale re-insert - doesn't need that redesign: re-running the same
// tombstone check immediately before the write closes it completely.
test("POST /api/sync/dashboard re-checks tombstones immediately before the applications upsert", async () => {
  const source = await readFile(
    new URL("../apps/web/app/api/sync/dashboard/route.ts", import.meta.url),
    "utf8",
  )

  const upsertIndex = source.indexOf('.from("applications").upsert(')
  assert.ok(upsertIndex > -1, "expected to find the applications upsert call")

  // The re-check must be a second, independent tombstone query - not just
  // the one already read earlier in the handler - positioned after that
  // first read and before the write it's meant to protect. Matched
  // loosely (any whitespace between the chained calls) since the two
  // reads sit at different indentation depths in the source.
  const tombstoneSelectPattern =
    /from\("deleted_application_tombstones"\)\s*\.select\("url_key"\)/g
  const tombstoneReadPositions = [...source.matchAll(tombstoneSelectPattern)]
    .map((match) => match.index)
    .filter((index) => index < upsertIndex)

  assert.ok(
    tombstoneReadPositions.length >= 2,
    "expected two tombstone reads before the applications upsert (an initial read, plus a re-check " +
      "immediately before the write) - without the second one, a DELETE landing in between can be " +
      `resurrected by this sync's own insert. Found ${tombstoneReadPositions.length}.`,
  )

  console.log("PASS sync/dashboard re-checks tombstones immediately before writing applications")
})
