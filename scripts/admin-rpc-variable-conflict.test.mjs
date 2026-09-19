import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// A PL/pgSQL function whose RETURNS TABLE(...) column names match the
// underlying table's own column names creates implicit OUT-parameter
// variables that collide with those columns - breaking any bare
// (unqualified) reference to them inside the function body, most
// dangerously an `on conflict (...)` target list, which cannot be
// table-qualified at all (Postgres syntax forbids it). Found live in
// production, in this exact shape, in two separate functions:
//   - admin_change_beta_access: failed only once a beta_access row
//     already existed (the real admin approve/suspend workflow - the
//     entire manual-approval fallback for the beta waitlist was broken).
//   - admin_update_feature_flag: failed unconditionally, on the very
//     first-ever call with an empty table - the feature-flag admin tool
//     had never worked in production at all.
// Both fixed with #variable_conflict use_column, verified live for every
// branch (insert, conflict, update) after the fix. This test guards
// against a future edit to either function silently dropping that
// pragma, and documents the pattern so a future RETURNS TABLE function
// with the same shape gets checked before shipping, not after.

const fixedFunctions = [
  {
    file: "../supabase/migrations/20260919160000_fix_beta_access_variable_conflict.sql",
    signature: "returns table(user_id uuid, status text, updated_at timestamptz)",
  },
  {
    file: "../supabase/migrations/20260919170000_fix_feature_flag_variable_conflict.sql",
    signature:
      "returns table(outcome text, key text, environment text, enabled boolean, version bigint, updated_at timestamptz)",
  },
];

for (const { file, signature } of fixedFunctions) {
  test(`${file.split("/").pop()} keeps the #variable_conflict use_column guard`, async () => {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /#variable_conflict use_column/);
    assert.ok(
      source.includes(signature),
      `expected the RETURNS TABLE signature to be unchanged (external contract preserved): ${signature}`,
    );
  });
}
