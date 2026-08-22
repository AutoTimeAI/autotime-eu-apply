import assert from "node:assert/strict"
import { getVisibleRowRange } from "../lib/admin-users-pagination.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("first page shows rows 1 through perPage", () => {
  assert.deepEqual(getVisibleRowRange(1, 50, 137), {
    firstRow: 1,
    lastRow: 50,
  })
})

test("middle page shows the correct offset range", () => {
  assert.deepEqual(getVisibleRowRange(2, 50, 137), {
    firstRow: 51,
    lastRow: 100,
  })
})

test("last partial page clamps lastRow to total, not a full page", () => {
  assert.deepEqual(getVisibleRowRange(3, 50, 137), {
    firstRow: 101,
    lastRow: 137,
  })
})

test("zero total returns an empty range instead of a nonsensical one", () => {
  assert.deepEqual(getVisibleRowRange(1, 50, 0), {
    firstRow: 0,
    lastRow: 0,
  })
})

let failed = 0

for (const { name, run } of tests) {
  try {
    await run()
    console.log(`ok - ${name}`)
  } catch (error) {
    failed += 1
    console.error(`not ok - ${name}`)
    console.error(error)
  }
}

if (failed > 0) {
  process.exitCode = 1
}
