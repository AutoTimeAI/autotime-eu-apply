import assert from "node:assert/strict"
import test from "node:test"
import { getMobilityStorageKey } from "../lib/international-mobility-storage.ts"
import { defaultDashboardState, dashboardStorageKey } from "../platform/persistence/dashboard-state-storage.ts"
import { computeMobilityCountryPrefill, getBestStoredProfileRecovery } from "../platform/persistence/profile-recovery.ts"

class MemoryStorage {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)) }
  get length() { return this.values.size }
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
  key(index) { return [...this.values.keys()][index] ?? null }
}

test("prefills only empty country fields from an explicitly saved mobility profile", () => {
  const storage = new MemoryStorage({
    [getMobilityStorageKey("user-1")]: JSON.stringify({
      schemaVersion: 1,
      currentCountry: "India",
      targetCountries: ["Ireland", "Germany"],
      applicantPosition: "international-applicant",
      sponsorshipRequired: "yes",
      relocationPreference: "yes",
    }),
  })
  const result = computeMobilityCountryPrefill(defaultDashboardState.profile, "user-1", storage)
  assert.deepEqual(result?.patch, { currentCountry: "India", targetCountries: "Ireland, Germany" })
})

test("does not overwrite confirmed dashboard country evidence", () => {
  const storage = new MemoryStorage({
    [getMobilityStorageKey("user-1")]: JSON.stringify({
      schemaVersion: 1, currentCountry: "India", targetCountries: ["Ireland"],
      applicantPosition: "international-applicant", sponsorshipRequired: "yes", relocationPreference: "yes",
    }),
  })
  const profile = { ...defaultDashboardState.profile, currentCountry: "France", targetCountries: "Spain" }
  assert.equal(computeMobilityCountryPrefill(profile, "user-1", storage), null)
})

test("recovers the strongest valid profile from another scoped browser record", () => {
  const state = (name) => ({ ...defaultDashboardState, profile: { ...defaultDashboardState.profile, fullName: name } })
  const storage = new MemoryStorage({
    [`${dashboardStorageKey}:current`]: JSON.stringify(state("Current")),
    [`${dashboardStorageKey}:older-a`]: JSON.stringify(state("Medium")),
    [`${dashboardStorageKey}:older-b`]: JSON.stringify(state("Strong profile")),
    "unrelated:key": "{}",
  })
  const recovered = getBestStoredProfileRecovery("current", 3, (candidate) => candidate.profile.fullName.length, storage)
  assert.equal(recovered?.state.profile.fullName, "Strong profile")
  assert.equal(recovered?.storageKey, `${dashboardStorageKey}:older-b`)
})

test("does not recover a profile below the current readiness threshold", () => {
  const storage = new MemoryStorage({
    [`${dashboardStorageKey}:older`]: JSON.stringify({
      ...defaultDashboardState,
      profile: { ...defaultDashboardState.profile, fullName: "Short" },
    }),
  })
  assert.equal(getBestStoredProfileRecovery("current", 10, (candidate) => candidate.profile.fullName.length, storage), null)
})
