import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  getMobilityConsentKey,
  getMobilityStorageKey,
  loadMobilityConsent,
  loadMobilityProfile,
  removeLocalMobilityProfile,
  removeMobilityConsent,
  saveMobilityConsent,
  saveMobilityProfile,
} from "../apps/web/lib/international-mobility-storage.ts";
import {
  confirmPersistedMobilityProfile,
  mobilityConsentVersion,
  reconcileMobilityProfiles,
} from "../apps/web/lib/mobility-sync.ts";

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

const empty = {
  schemaVersion: 1,
  currentCountry: "",
  targetCountries: ["Ireland"],
  applicantPosition: "unsure",
  sponsorshipRequired: "unsure",
  relocationPreference: "depends",
};
const local = {
  ...empty,
  currentCountry: "Spain",
  applicantPosition: "local-work-authorised",
  sponsorshipRequired: "no",
};
const consent = {
  version: mobilityConsentVersion,
  grantedAt: "2026-07-29T12:00:00.000Z",
};
const record = {
  profile: local,
  schemaVersion: 1,
  updatedAt: "2026-07-29T12:01:00.000Z",
  ownerContext: "authenticated-user",
  consent,
  syncEnabled: true,
};

test("consent is explicit, versioned, timestamped and account scoped", () => {
  const storage = new MemoryStorage();
  assert.equal(loadMobilityConsent(storage, "user-a"), null);
  saveMobilityConsent(storage, "user-a", consent);
  assert.deepEqual(loadMobilityConsent(storage, "user-a"), consent);
  assert.equal(loadMobilityConsent(storage, "user-b"), null);
  assert.notEqual(
    getMobilityConsentKey("user-a"),
    getMobilityConsentKey("user-b"),
  );
  removeMobilityConsent(storage, "user-a");
  assert.equal(loadMobilityConsent(storage, "user-a"), null);
});

test("local removal touches only the exact authenticated key", () => {
  const storage = new MemoryStorage();
  saveMobilityProfile(storage, "user-a", local);
  saveMobilityProfile(storage, "user-b", { ...local, currentCountry: "Italy" });
  removeLocalMobilityProfile(storage, "user-a");
  assert.equal(loadMobilityProfile(storage, "user-a").source, "empty");
  assert.equal(loadMobilityProfile(storage, "user-b").source, "saved");
  assert.throws(() => removeLocalMobilityProfile(storage, ""), /user ID/);
});

test("malformed local data is reported and retained until explicit removal", () => {
  const storage = new MemoryStorage();
  const key = getMobilityStorageKey("user-a");
  storage.setItem(key, "{not-json");
  assert.equal(loadMobilityProfile(storage, "user-a").source, "malformed");
  assert.equal(storage.getItem(key), "{not-json");
});

test("reconciliation covers empty, local, server, match and conflict", () => {
  const kind = (localProfile, localKind, server) =>
    reconcileMobilityProfiles({
      emptyProfile: empty,
      local: localProfile,
      localKind,
      server,
    }).kind;
  assert.equal(kind(empty, "empty", null), "empty");
  assert.equal(kind(local, "saved", null), "local-only");
  assert.equal(kind(empty, "empty", record), "server-only");
  assert.equal(kind(local, "saved", record), "matching");
  assert.equal(
    kind({ ...local, currentCountry: "France" }, "saved", record),
    "conflict",
  );
  assert.equal(kind(empty, "malformed", record), "malformed-local");
});

test("synced requires a validated confirmed response matching the upload", () => {
  assert.deepEqual(
    confirmPersistedMobilityProfile({
      expected: local,
      response: { data: record, error: null },
    }),
    record,
  );
  assert.throws(
    () =>
      confirmPersistedMobilityProfile({
        expected: local,
        response: {
          data: { ...record, profile: { ...local, currentCountry: "France" } },
          error: null,
        },
      }),
    /could not be confirmed/,
  );
  assert.throws(
    () =>
      confirmPersistedMobilityProfile({
        expected: local,
        response: { data: null, error: null },
      }),
    /could not be confirmed/,
  );
});

test("API is feature-gated, session-owned, strict and conflict-aware", () => {
  const route = fs.readFileSync(
    "apps/web/app/api/sync/mobility/route.ts",
    "utf8",
  );
  const repository = fs.readFileSync(
    "apps/web/lib/mobility-profile-repository.ts",
    "utf8",
  );
  assert.match(
    route,
    /if \(!mobilityServerSyncEnabled\) return unavailable\(\)/g,
  );
  assert.match(route, /getRequestUser\(request\)/);
  assert.match(route, /"Unauthorised", 401/g);
  assert.match(route, /MobilityConflictError/);
  assert.match(route, /409/);
  assert.doesNotMatch(route, /console\.|diagnosticJson/i);
  assert.match(repository, /\.strict\(\)/);
  assert.match(repository, /expectedUpdatedAt/);
  assert.match(repository, /\.eq\("user_id", authenticatedUserId\)/g);
  assert.match(repository, /\.eq\("updated_at", existing\.updatedAt\)/);
  assert.match(repository, /user_id: authenticatedUserId/);
});

test("migration enforces ownership, consent, one row and cascade", () => {
  const migration = fs.readFileSync(
    "supabase/migrations/20260729120000_mobility_profiles_entry_gate.sql",
    "utf8",
  );
  assert.match(migration, /user_id uuid primary key/);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/);
  assert.equal((migration.match(/auth\.uid\(\) = user_id/g) ?? []).length, 5);
  assert.match(migration, /consent_version integer not null/);
  assert.match(migration, /consent_granted_at timestamptz not null/);
  assert.match(migration, /schema_version integer not null/);
  assert.match(
    migration,
    /alter table public\.mobility_profiles enable row level security/,
  );
  assert.doesNotMatch(migration, /to anon/);
});

test("account-profile deletion integrates mobility and exact browser cleanup", () => {
  const settings = fs.readFileSync(
    "apps/web/components/SettingsControls.tsx",
    "utf8",
  );
  assert.match(settings, /fetch\("\/api\/sync\/mobility"/);
  assert.match(settings, /fetch\("\/api\/sync\/profile"/);
  assert.match(settings, /removeLocalMobilityProfile\(localStorage, userId\)/);
  assert.match(settings, /deletion is incomplete/);
  assert.match(settings, /does not delete your sign-in account/i);
});
