import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  ".github/workflows/production-deploy.yml",
  "utf8",
);

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
