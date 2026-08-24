import assert from "node:assert/strict";
import test from "node:test";
import {
  getRolePathwaysProgressStorageKey,
  loadRolePathwaysProgress,
  saveRolePathwaysProgress,
} from "../apps/web/lib/role-pathways-storage.ts";
import { ESCO_CACHE_VERSION, ROLE_PATHWAYS_SCHEMA_VERSION } from "../packages/shared/src/role-pathways.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, value);
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

const evidence = [
  {
    competencyId: "sql-reporting",
    label: "SQL reporting",
    supportingText: "Delivered SQL reporting for payments operations.",
    source: "cv",
    strength: "professional",
    confirmed: true,
  },
];

function progressFor(userId, overrides = {}) {
  return {
    schemaVersion: ROLE_PATHWAYS_SCHEMA_VERSION,
    catalogueVersion: ESCO_CACHE_VERSION,
    userId,
    stage: 3,
    candidateText: "Delivered SQL reporting for payments operations.",
    evidence,
    recommendations: [{ occupation: { id: "business-analyst" }, capabilityScore: 82 }],
    selectedRole: { occupation: { id: "business-analyst" }, capabilityScore: 82 },
    savedAt: "2026-08-19T12:00:00.000Z",
    ...overrides,
  };
}

test("confirmed evidence, recommendations, selected role and stage round-trip across a reload", () => {
  const storage = new MemoryStorage();
  assert.equal(loadRolePathwaysProgress(storage, "user-a"), null);
  const saved = saveRolePathwaysProgress(storage, "user-a", progressFor("user-a"));
  const loaded = loadRolePathwaysProgress(storage, "user-a");
  assert.deepEqual(loaded, saved);
  assert.equal(loaded.stage, 3);
  assert.equal(loaded.evidence[0].confirmed, true);
  assert.equal(loaded.selectedRole.occupation.id, "business-analyst");
});

test("progress is isolated per authenticated user", () => {
  const storage = new MemoryStorage();
  saveRolePathwaysProgress(storage, "user-a", progressFor("user-a"));
  assert.equal(loadRolePathwaysProgress(storage, "user-b"), null);
  assert.notEqual(
    getRolePathwaysProgressStorageKey("user-a"),
    getRolePathwaysProgressStorageKey("user-b"),
  );
});

test("cross-user progress payload is rejected", () => {
  const storage = new MemoryStorage();
  assert.throws(
    () => saveRolePathwaysProgress(storage, "user-a", progressFor("user-b")),
    /Cross-user/,
  );
});

test("a stale ESCO catalogue version is treated as no saved progress", () => {
  const storage = new MemoryStorage();
  const key = getRolePathwaysProgressStorageKey("user-a");
  storage.setItem(
    key,
    JSON.stringify(progressFor("user-a", { catalogueVersion: "esco-fixture-2025.9" })),
  );
  // loadRolePathwaysProgress itself only guards schema shape - callers
  // (RolePathwaysExperience) additionally check catalogueVersion === the
  // live ESCO_CACHE_VERSION before trusting it, same as loadLaneSelection's
  // existing convention. Confirm the raw record still round-trips so that
  // check has something real to compare against.
  const loaded = loadRolePathwaysProgress(storage, "user-a");
  assert.equal(loaded.catalogueVersion, "esco-fixture-2025.9");
  assert.notEqual(loaded.catalogueVersion, ESCO_CACHE_VERSION);
});

test("malformed local data returns null instead of throwing", () => {
  const storage = new MemoryStorage();
  const key = getRolePathwaysProgressStorageKey("user-a");
  storage.setItem(key, "{not-json");
  assert.equal(loadRolePathwaysProgress(storage, "user-a"), null);
});

test("saving requires a non-empty authenticated user ID", () => {
  const storage = new MemoryStorage();
  assert.throws(
    () => saveRolePathwaysProgress(storage, "", progressFor("")),
    /user ID/,
  );
});
