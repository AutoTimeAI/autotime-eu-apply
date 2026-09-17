import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  ".github/workflows/production-deploy.yml",
  "utf8",
);
const vercelConfig = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

test("Git pushes cannot bypass the manual production deployment workflow", () => {
  assert.equal(vercelConfig.git?.deploymentEnabled, false);
});

test("production deployment is manual-only and commit-pinned", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s{2}(?:push|pull_request):/m);
  assert.match(workflow, /Full 40-character commit SHA/);
  assert.match(workflow, /DEPLOY PRODUCTION/);
  assert.match(
    workflow,
    /git merge-base --is-ancestor "\$DEPLOY_SHA" origin\/main/,
  );
  assert.match(workflow, /git checkout --detach "\$DEPLOY_SHA"/);
});

test("production deployment verifies before and after release", () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /pnpm typecheck/);
  assert.match(workflow, /pnpm test:mobility-suite/);
  assert.match(workflow, /vercel@59\.7\.0 build --prod/);
  assert.match(workflow, /deploy --prebuilt --prod --yes/);
  assert.match(workflow, /WEB_SMOKE_URL:/);
  assert.match(workflow, /pnpm smoke:web/);
});

test("workflow inputs are passed through env instead of interpolated in shell", () => {
  assert.match(workflow, /DEPLOY_SHA: \$\{\{ inputs\.commit_sha \}\}/);
  assert.match(
    workflow,
    /DEPLOY_CONFIRMATION: \$\{\{ inputs\.confirmation \}\}/,
  );
  assert.doesNotMatch(workflow, /run:\s*\|[\s\S]*\$\{\{ inputs\./);
});

// Added 2026-09-17: a bad Production env var left every authenticated
// route 503ing while the deploy itself still reported success and left
// the broken build live - the smoke check above catches the failure, but
// without an automatic rollback, the broken build stayed live until
// someone noticed the red CI run and rolled back by hand.
test("a failed post-deploy check automatically rolls production back", () => {
  const captureIndex = workflow.indexOf(
    "Capture current production deployment for rollback",
  );
  const deployIndex = workflow.indexOf("Build and deploy production");
  const smokeIndex = workflow.indexOf("Verify deployed surface");
  const rollbackIndex = workflow.indexOf(
    "Roll back to previous production deployment",
  );

  assert.ok(captureIndex > 0, "must capture the previous deployment");
  assert.ok(
    captureIndex < deployIndex,
    "must capture the previous deployment before deploying the new one",
  );
  assert.ok(
    deployIndex < smokeIndex && smokeIndex < rollbackIndex,
    "rollback step must come after the smoke check it responds to",
  );

  const rollbackStep = workflow.slice(rollbackIndex);
  assert.match(rollbackStep, /if: failure\(\) && steps\.previous\.outputs\.url != ''/);
  assert.match(rollbackStep, /vercel@59\.7\.0 rollback/);
  assert.match(
    rollbackStep,
    /"https:\/\/\$\{\{ steps\.previous\.outputs\.url \}\}"/,
  );
});

test("a failure with nothing to roll back to is surfaced loudly, not silently", () => {
  assert.match(
    workflow,
    /if: failure\(\) && steps\.previous\.outputs\.url == ''/,
  );
  assert.match(workflow, /::error::/);
});

test("deployment evidence is only recorded when the deploy actually succeeded", () => {
  const recordIndex = workflow.indexOf("Record deployment evidence");
  const recordStep = workflow.slice(recordIndex);
  assert.match(recordStep, /if: success\(\)/);
});
