import assert from "node:assert/strict"
import test from "node:test"
import {
  dashboardStorageKey,
  defaultDashboardState,
  getStoredState,
  getUserScopedStorageKey,
  normalizeLegacyDashboardState,
} from "../platform/persistence/dashboard-state-storage.ts"

test("creates stable user-scoped storage keys", () => {
  assert.equal(getUserScopedStorageKey(dashboardStorageKey, "user-1"), "autotime-v2-companion-dashboard:user-1")
})

test("migrates legacy application and outcome statuses without mutating unrelated values", () => {
  const result = normalizeLegacyDashboardState({
    applications: [{ id: "a", status: "Applying" }],
    outcomeRecords: [{ id: "o", status: "Closed" }],
    marker: true,
  })
  assert.deepEqual(result, {
    applications: [{ id: "a", status: "Ready to apply" }],
    outcomeRecords: [{ id: "o", status: "Archived" }],
    marker: true,
  })
})

test("server-side loading returns the canonical empty state", () => {
  assert.equal(getStoredState("user-1"), defaultDashboardState)
})

test("malformed browser storage fails closed to the canonical empty state", () => {
  const previousWindow = globalThis.window
  globalThis.window = { localStorage: { getItem: () => "not-json" } }
  try {
    assert.equal(getStoredState("user-1"), defaultDashboardState)
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
