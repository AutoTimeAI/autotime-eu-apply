import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("apps/web/app/api/international/stamp4-check/route.ts", "utf8");

test("direct threshold API cannot bypass mobility governance", () => {
  assert.match(route, /loadCurrentMobilityReadiness/);
  assert.match(route, /outputPermission !== "definitive"/);
  assert.match(route, /current source and expert review/);
  assert.match(route, /}, 409\)/);
});

test("governance lookup failure does not fall back to an ungoverned result", () => {
  assert.match(route, /governance status is temporarily unavailable/);
  assert.match(route, /}, 503\)/);
});

test("the assessment runs only after the governance gate", () => {
  assert.ok(
    route.indexOf("loadCurrentMobilityReadiness") < route.indexOf("assessSponsorshipReadiness(requestPayload)"),
  );
});
