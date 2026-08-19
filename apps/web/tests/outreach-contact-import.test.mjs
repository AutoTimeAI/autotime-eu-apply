import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseContactCsv } from "../lib/outreach/contact-import.ts";

test("parses documented contact CSV headers and quoted values", () => {
  const rows = parseContactCsv('name,company,email,role,contact type\n"Doe, Jane",Example,jane@example.com,"Talent Lead",hiring manager');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { row: 2, name: "Doe, Jane", company: "Example", email: "jane@example.com", role: "Talent Lead", profileUrl: "", contactType: "hiring_manager", errors: [] });
});
test("requires identity fields and rejects unsafe profile protocols", () => {
  const rows = parseContactCsv("name,company,profile url\nJane,Example,javascript:alert(1)\n,Example,https://example.com/jane");
  assert.match(rows[0].errors.join(" "), /HTTP or HTTPS/);
  assert.match(rows[1].errors.join(" "), /Name is required/);
});

test("limits a single preview to 100 contacts", () => {
  const body = Array.from({ length: 120 }, (_, index) => `Person ${index},Example,person${index}@example.com`).join("\n");
  assert.equal(parseContactCsv(`name,company,email\n${body}`).length, 100);
});

test("migration and API retain user isolation and explicit consent", () => {
  const migration = readFileSync(new URL("../../../supabase/migrations/20260818150000_outreach_contacts.sql", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/outreach/contacts/route.ts", import.meta.url), "utf8");
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\) = user_id/g);
  assert.match(migration, /unique \(user_id, dedupe_key\)/i);
  assert.match(route, /consent: z\.literal\(true\)/);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.match(route, /user_id: user\.id/);
});
