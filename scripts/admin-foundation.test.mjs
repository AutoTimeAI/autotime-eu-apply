import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hasAdminPermission, isValidAdminStatus, rolePermissions } from "../apps/web/lib/admin-permissions.ts";
import { AdminAuthorizationError, authorizeAdminPrincipal } from "../apps/web/lib/admin-authorization-policy.ts";
import { isSameOriginWorkflowRequest, parseWorkflowOperationalEventBody, workflowEventBodyLimit } from "../apps/web/lib/workflow-operational-event-contract.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const active = (role) => ({ role, status: "active", userId: "00000000-0000-4000-8000-000000000001" });
assert.equal(hasAdminPermission(active("owner"), "admin_memberships:manage"), true);
assert.equal(hasAdminPermission(active("admin"), "feature_flags:write"), false);
assert.equal(hasAdminPermission(active("support"), "users:read_email"), false);
assert.equal(hasAdminPermission(active("analyst"), "users:read"), false);
for (const role of Object.keys(rolePermissions)) assert.equal(hasAdminPermission({ ...active(role), status: "suspended" }, "overview:read"), false);
assert.equal(hasAdminPermission(null, "overview:read"), false);
assert.equal(isValidAdminStatus("malformed"), false);

assert.equal(
  isSameOriginWorkflowRequest(
    new Request("http://localhost:3000/api/operations/workflow-events", {
      headers: { Origin: "http://localhost:3000" },
    }),
  ),
  true,
);
assert.equal(
  isSameOriginWorkflowRequest(
    new Request("http://localhost:3000/api/operations/workflow-events", {
      headers: { Origin: "https://attacker.example" },
    }),
  ),
  false,
);
assert.equal(
  isSameOriginWorkflowRequest(
    new Request("http://localhost:3000/api/operations/workflow-events"),
  ),
  false,
);
assert.equal(
  isSameOriginWorkflowRequest(
    new Request("http://localhost:3000/api/operations/workflow-events", {
      headers: { "Sec-Fetch-Site": "same-origin" },
    }),
  ),
  true,
);

await assert.rejects(
  authorizeAdminPrincipal(null, "overview:read", async () => active("owner")),
  (error) => error instanceof AdminAuthorizationError && error.status === 401,
);
await assert.rejects(
  authorizeAdminPrincipal(
    { id: active("owner").userId },
    "overview:read",
    async () => null,
  ),
  (error) => error instanceof AdminAuthorizationError && error.status === 403,
);
await assert.rejects(
  authorizeAdminPrincipal(
    { id: active("owner").userId },
    "overview:read",
    async () => ({ ...active("owner"), status: "suspended" }),
  ),
  (error) => error instanceof AdminAuthorizationError && error.status === 403,
);
const databaseFailure = new Error("database unavailable");
await assert.rejects(
  authorizeAdminPrincipal(
    { id: active("owner").userId },
    "overview:read",
    async () => {
      throw databaseFailure;
    },
  ),
  (error) => error === databaseFailure,
);
const internalFailure = new TypeError("programming failure");
await assert.rejects(
  authorizeAdminPrincipal(
    { id: active("owner").userId },
    "overview:read",
    async () => {
      throw internalFailure;
    },
  ),
  (error) => error === internalFailure,
);
const valid = JSON.stringify({ event: "job_saved", transitionId: "10000000-0000-4000-8000-000000000001" });
assert.equal(parseWorkflowOperationalEventBody(valid, "application/json", valid.length)?.event, "job_saved");
for (const invalid of ["{", JSON.stringify({ event: "unknown", transitionId: "10000000-0000-4000-8000-000000000001" }), JSON.stringify({ event: "job_saved", transitionId: "bad" }), JSON.stringify({ event: "job_saved", transitionId: "10000000-0000-4000-8000-000000000001", userId: "10000000-0000-4000-8000-000000000002" })]) assert.equal(parseWorkflowOperationalEventBody(invalid, "application/json", invalid.length), null);
assert.equal(parseWorkflowOperationalEventBody(valid, "text/plain", valid.length), null);
assert.equal(parseWorkflowOperationalEventBody("x".repeat(workflowEventBodyLimit + 1), "application/json", null), null);

const [adminSql, eventSql, usersLib, overviewApi, eventApi, eventClient] = await Promise.all([
  read("supabase/migrations/20260801190000_admin_operations_foundation.sql"), read("supabase/migrations/20260801191000_workflow_operational_events.sql"), read("apps/web/lib/admin-users.ts"), read("apps/web/app/api/admin/overview/route.ts"), read("apps/web/app/api/operations/workflow-events/route.ts"), read("apps/web/lib/workflow-operational-events.ts"),
]);
for (const sql of [adminSql, eventSql]) {
  assert.match(sql, /begin;[\s\S]*commit;/i);
  assert.doesNotMatch(sql, /^\s*(drop\s|truncate\s|delete\s+from)/im);
  assert.match(sql, /from public, anon, authenticated/i);
  assert.match(sql, /to service_role/i);
}
for (const fn of ["admin_change_beta_access", "admin_update_feature_flag", "admin_request_market_refresh"]) assert.match(adminSql, new RegExp(`create function public\\.${fn}`));
assert.match(eventSql, /unique \(user_id, event, transition_id\)/);
assert.match(eventSql, /pg_advisory_xact_lock/);
assert.match(usersLib, /beta\.error/);
assert.match(overviewApi, /audit:read/);
assert.match(eventApi, /record_workflow_operational_event/);
assert.match(eventClient, /NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY/);
console.log("Admin foundation executable security contracts passed");
