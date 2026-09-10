import assert from "node:assert/strict"
import test from "node:test"
import {
  defaultSyncPreferences,
  defaultTrustState,
  getStoredSyncPreferences,
  getStoredTrustState,
  saveSyncPreferences,
  saveTrustState,
} from "../platform/persistence/dashboard-preferences-storage.ts"

class MemoryStorage {
  constructor() { this.values = new Map() }
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
}

test("server and malformed storage return conservative defaults", () => {
  assert.equal(getStoredTrustState("user"), defaultTrustState)
  assert.equal(getStoredSyncPreferences("user"), defaultSyncPreferences)
  const malformed = { getItem: () => "not-json" }
  assert.equal(getStoredTrustState("user", malformed), defaultTrustState)
  assert.equal(getStoredSyncPreferences("user", malformed), defaultSyncPreferences)
})

test("trust state round-trips within a user-scoped record", () => {
  const storage = new MemoryStorage()
  const value = { officialSourceReviewed: true, officialSourceReviewedAt: "2026-09-10" }
  saveTrustState(value, "user-1", storage)
  assert.deepEqual(getStoredTrustState("user-1", storage), value)
  assert.deepEqual(getStoredTrustState("user-2", storage), defaultTrustState)
})

test("sync preferences round-trip without leaking between accounts", () => {
  const storage = new MemoryStorage()
  saveSyncPreferences({ profileAccountSyncEnabled: true }, "user-1", storage)
  assert.deepEqual(getStoredSyncPreferences("user-1", storage), { profileAccountSyncEnabled: true })
  assert.deepEqual(getStoredSyncPreferences("user-2", storage), defaultSyncPreferences)
})

test("unknown stored fields are discarded by the schema", () => {
  const storage = new MemoryStorage()
  storage.setItem("autotime-v2-sync-preferences:user-1", JSON.stringify({ profileAccountSyncEnabled: true, token: "must-not-propagate" }))
  assert.deepEqual(getStoredSyncPreferences("user-1", storage), { profileAccountSyncEnabled: true })
})
