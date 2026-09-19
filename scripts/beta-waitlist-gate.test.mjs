import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Static-inspection tests confirming the beta-waitlist gate is wired the
// way it's supposed to be, mirroring this repo's existing pattern for
// verifying security-relevant route wiring without a full Supabase mock
// (see sync-dashboard-tombstone-recheck.test.mjs / auth-cookie-redirect-
// fix.test.mjs for the same style).

test("dashboard layout gates on beta_access and bypasses admins/test-auth", async () => {
  const source = await readFile(
    new URL("../apps/web/app/dashboard/layout.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /isBetaActive/);
  assert.match(source, /redirect\(\s*"\/waitlist"\s*\)/);
  // Both bypasses must be present on the same guard, not just imported -
  // an admin or the test-auth user must never be routed to the waitlist.
  assert.match(
    source,
    /!testUser\s*&&\s*!isAdmin\s*&&\s*!\(await isBetaActive\(user\.id\)\)/,
  );
});

test("isBetaActive fails closed: missing row and lookup error both mean not active", async () => {
  const source = await readFile(
    new URL("../apps/web/lib/beta-access.ts", import.meta.url),
    "utf8",
  );
  // "return data?.status === 'active'" - anything else (no row, pending,
  // suspended) is falsy, and the catch block explicitly returns false
  // rather than letting a lookup error silently grant access.
  assert.match(source, /return data\?\.status === "active"/);
  assert.match(source, /catch[\s\S]{0,300}return false/);
});

test("redeem-invite route requires auth, same-origin, and never overrides a suspension", async () => {
  const source = await readFile(
    new URL("../apps/web/app/api/beta/redeem-invite/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /getRequestUser/);
  assert.match(source, /isSameOriginMutation/);
  assert.match(source, /getBetaInviteCode/);
  // The suspended-account guard must run (and reject) before the upsert
  // that would otherwise set status back to "active".
  const suspendedGuardIndex = source.indexOf('existing?.status === "suspended"');
  const upsertIndex = source.indexOf('status: "active"', suspendedGuardIndex + 1);
  assert.ok(suspendedGuardIndex !== -1, "suspended-account guard must be present");
  assert.ok(
    upsertIndex > suspendedGuardIndex,
    "the active-status upsert must come after the suspended-account guard",
  );
});

test("admin_change_beta_access guards against the RETURNS TABLE / column name collision", async () => {
  // Real production bug, found by actually calling this RPC against a
  // user who already had a beta_access row (the normal case for any real
  // admin approve/suspend action, since the row only gets created once):
  // RETURNS TABLE(user_id uuid, status text, updated_at timestamptz)
  // creates implicit PL/pgSQL variables of those same names, which made
  // `on conflict (user_id)` ambiguous and threw a 42702 error on every
  // call except a brand-new user's very first grant. Confirmed live
  // (admin_change_beta_access('active', ...) against an existing pending
  // row) both before the fix (failed) and after (succeeded), including
  // the suspend branch. #variable_conflict use_column is the fix; this
  // guards against it being silently dropped in a future edit.
  const source = await readFile(
    new URL(
      "../supabase/migrations/20260919160000_fix_beta_access_variable_conflict.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /#variable_conflict use_column/);
  assert.match(source, /returns table\(user_id uuid, status text, updated_at timestamptz\)/);
});

test("waitlist page requires a session but does not require beta-active status", async () => {
  const source = await readFile(
    new URL("../apps/web/app/waitlist/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /redirect\(\s*"\/login"\s*\)/);
  assert.doesNotMatch(source, /isBetaActive/);
});
