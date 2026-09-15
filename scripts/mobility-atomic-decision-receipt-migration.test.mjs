import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("supabase/migrations/20260912240000_atomic_mobility_decision_receipt.sql", "utf8")

test("the receipt function writes every provenance layer in one transaction", () => {
  for (const table of [
    "mobility_candidate_evidence_items", "mobility_candidate_evidence_versions",
    "mobility_vacancy_snapshots", "mobility_employer_verifications", "mobility_decision_records",
    "mobility_decision_replay_inputs",
  ]) assert.match(source, new RegExp(`insert into public\\.${table}`, "i"))
  assert.match(source, /begin;/i)
  assert.match(source, /commit;\s*$/i)
})

test("unchecked employers are represented explicitly rather than as not applicable", () => {
  assert.match(source, /'not_checked'/i)
  assert.match(source, /EMPLOYER_VERIFICATION_NOT_RUN/)
  assert.match(source, /created_employer_verification_id/)
  assert.match(source, /state = 'not_checked' and checked_at is null/i)
})

test("employer verification uses only a current register and normalized exact legal-name matching", () => {
  assert.match(source, /register_version\.status = 'current'/i)
  assert.match(source, /register_version\.effective_from is null/i)
  assert.match(source, /register_version\.effective_to is null/i)
  assert.match(source, /lower\(regexp_replace\(trim\(register_row\.legal_name\)/i)
  assert.match(source, /resolved_match_method := 'exact_legal_name'/i)
  assert.doesNotMatch(source, /similarity\(|levenshtein|fuzzy/i)
})

test("missing, duplicate, and unavailable register evidence fail closed distinctly", () => {
  assert.match(source, /NO_EXACT_LEGAL_NAME_REGISTER_MATCH/)
  assert.match(source, /MULTIPLE_EXACT_LEGAL_NAME_MATCHES/)
  assert.match(source, /CURRENT_SPONSOR_REGISTER_NOT_AVAILABLE/)
  assert.match(source, /EMPLOYING_LEGAL_ENTITY_NOT_SUPPLIED/)
  assert.match(source, /then 'employer_unverified'/i)
})

test("only the service role can execute the atomic receipt", () => {
  assert.match(source, /security definer/i)
  assert.match(source, /set search_path = ''/i)
  assert.match(source, /revoke all on function[\s\S]*from public, anon, authenticated/i)
  assert.match(source, /grant execute on function[\s\S]*to service_role/i)
})

test("the database computes the replay envelope hash after generating evidence ids", () => {
  assert.match(source, /candidate_version_ids := array_append/i)
  assert.match(source, /encode\(extensions\.digest\(convert_to\(jsonb_build_object/i)
})
