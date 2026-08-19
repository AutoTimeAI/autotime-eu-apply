import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath = "supabase/migrations/20260819100000_job_workflow_and_interviews.sql";
const preflightPath = "supabase/preflight/20260819100000_job_workflow_and_interviews_readonly.sql";

const tables = [
  "job_workflow_jobs",
  "job_workflow_analysis_snapshots",
  "job_workflow_applications",
  "job_workflow_screening_answers",
  "interview_records",
  "interview_questions",
  "interview_preparation_snapshots",
];
const triggeredTables = [
  "job_workflow_jobs",
  "job_workflow_applications",
  "job_workflow_screening_answers",
  "interview_records",
];

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

test("job workflow migration is additive and explicitly transactional", () => {
  const source = fs.readFileSync(migrationPath, "utf8");
  const sql = executableSql(source);
  const parsedStatements = statements(source);

  assert.match(sql, /^\s*begin\s*;/i);
  assert.match(sql, /commit\s*;\s*$/i);
  for (const table of tables) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\s*\\(`, "i"));
  }
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

test("job workflow migration preflight fails on every intended object conflict", () => {
  const source = fs.readFileSync(migrationPath, "utf8");
  for (const table of tables) {
    assert.match(source, new RegExp(`to_regclass\\('public\\.${table}'\\) is not null`, "i"));
  }
  assert.match(source, /to_regclass\('auth\.users'\) is null/i);
  assert.match(source, /to_regprocedure\('public\.set_updated_at\(\)'\) is null/i);
  assert.match(source, /from pg_policies/i);
  assert.match(source, /from pg_trigger/i);
  assert.match(source, /raise exception/g);
  assert.equal((source.match(/create policy/gi) ?? []).length, 28);
  assert.equal((source.match(/create trigger/gi) ?? []).length, 4);
});

test("job workflow migration preserves ownership, cascade and RLS for every table", () => {
  const source = fs.readFileSync(migrationPath, "utf8");
  for (const table of tables) {
    assert.match(
      source,
      new RegExp(`create table public\\.${table} \\([\\s\\S]*?\\n\\);`, "i"),
    );
    assert.match(source, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  for (const table of triggeredTables) {
    assert.match(
      source,
      new RegExp(`create trigger ${table}_set_updated_at\\nbefore update on public\\.${table}`, "i"),
    );
  }
  // Every table's user_id column cascades from auth.users, and every one of
  // the 28 policies (4 per table x 7 tables) scopes on auth.uid() = user_id -
  // select/delete contribute 1 occurrence each, insert 1, update 2 (using +
  // with check): 5 per table x 7 tables = 35.
  assert.equal(
    (source.match(/user_id uuid not null references auth\.users\(id\) on delete cascade/g) ?? [])
      .length,
    7,
  );
  assert.equal((source.match(/auth\.uid\(\) = user_id/g) ?? []).length, 35);
  assert.doesNotMatch(source, /\bto\s+anon\b/i);
});

test("job workflow migration keeps the new tables independent of the legacy applications schema", () => {
  const source = fs.readFileSync(migrationPath, "utf8");
  assert.doesNotMatch(source, /references public\.applications/i);
  assert.doesNotMatch(source, /references public\.interview_prep_packs/i);
  // Client-supplied ids: no gen_random_uuid()/uuid_generate_v4() defaults on
  // any primary key in this migration.
  assert.doesNotMatch(source, /id (uuid|text) primary key default/i);
});

test("production preflight is metadata-only", () => {
  const source = fs.readFileSync(preflightPath, "utf8");
  const parsedStatements = statements(source);
  assert.ok(parsedStatements.length >= 5);
  assert.ok(parsedStatements.every((statement) => /^select\b/i.test(statement)));
  assert.match(source, /supabase_migrations\.schema_migrations/i);
  assert.match(source, /pg_policies/i);
  assert.match(source, /information_schema\.triggers/i);
  assert.match(source, /relrowsecurity/i);
});
