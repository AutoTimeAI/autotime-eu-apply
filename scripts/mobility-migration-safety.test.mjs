import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath = "supabase/migrations/20260729120000_mobility_profiles_entry_gate.sql";
const preflightPath = "supabase/preflight/20260729120000_mobility_profiles_entry_gate_readonly.sql";

function executableSql(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");
}

function statements(source) {
  return executableSql(source)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

test("mobility migration is additive and explicitly transactional", () => {
  const source = fs.readFileSync(migrationPath, "utf8");
  const sql = executableSql(source);
  const parsedStatements = statements(source);

  assert.match(sql, /^\s*begin\s*;/i);
  assert.match(sql, /commit\s*;\s*$/i);
  assert.match(sql, /create table public\.mobility_profiles\s*\(/i);
  assert.doesNotMatch(sql, /create\s+table\s+if\s+not\s+exists/i);
  assert.equal(parsedStatements.filter((statement) => /^drop\b/i.test(statement)).length, 0);
  assert.equal(parsedStatements.filter((statement) => /^truncate\b/i.test(statement)).length, 0);
  assert.equal(parsedStatements.filter((statement) => /^delete\b/i.test(statement)).length, 0);
  assert.equal(
    parsedStatements.filter((statement) =>
      /^alter\s+table\b[\s\S]*\b(drop|rename|alter\s+column)\b/i.test(statement),
    ).length,
    0,
  );
  assert.equal(parsedStatements.filter((statement) => /^(insert|update)\b/i.test(statement)).length, 0);
});

test("mobility migration preflight fails on every intended object conflict", () => {
  const source = fs.readFileSync(migrationPath, "utf8");
  assert.match(source, /to_regclass\('public\.mobility_profiles'\) is not null/i);
  assert.match(source, /to_regclass\('auth\.users'\) is null/i);
  assert.match(source, /to_regprocedure\('public\.set_updated_at\(\)'\) is null/i);
  assert.match(source, /from pg_policies/i);
  assert.match(source, /from pg_trigger/i);
  assert.match(source, /raise exception/g);
  assert.equal((source.match(/create policy/gi) ?? []).length, 4);
  assert.equal((source.match(/create trigger/gi) ?? []).length, 1);
});

test("mobility migration preserves ownership, cascade, versions and RLS", () => {
  const source = fs.readFileSync(migrationPath, "utf8");
  assert.match(source, /user_id uuid primary key references auth\.users\(id\) on delete cascade/i);
  assert.match(source, /schema_version integer not null default 1 check \(schema_version = 1\)/i);
  assert.match(source, /consent_version integer not null check \(consent_version = 1\)/i);
  assert.match(source, /alter table public\.mobility_profiles enable row level security/i);
  assert.equal((source.match(/auth\.uid\(\) = user_id/g) ?? []).length, 5);
  assert.doesNotMatch(source, /\bto\s+anon\b/i);
});

test("production preflight is metadata-only", () => {
  const source = fs.readFileSync(preflightPath, "utf8");
  const parsedStatements = statements(source);
  assert.ok(parsedStatements.length >= 6);
  assert.ok(parsedStatements.every((statement) => /^select\b/i.test(statement)));
  assert.match(source, /supabase_migrations\.schema_migrations/i);
  assert.match(source, /pg_policies/i);
  assert.match(source, /information_schema\.triggers/i);
  assert.match(source, /relrowsecurity/i);
});