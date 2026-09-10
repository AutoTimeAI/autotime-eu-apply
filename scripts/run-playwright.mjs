/** Runs Playwright with the host certificate store available to APIRequestContext. */
import { spawnSync } from "node:child_process"

const existingOptions = process.env.NODE_OPTIONS?.trim() ?? ""
// The Next.js webpack development server is a child of the Playwright CLI and
// inherits NODE_OPTIONS. The full browser suite compiles most application
// routes and can exceed Node's default ~4 GB heap before teardown.
const nodeOptions = `${existingOptions} --use-system-ca --max-old-space-size=8192`.trim()
const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", ...process.argv.slice(2)],
  {
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
    stdio: "inherit",
  },
)

process.exit(result.status ?? 1)
