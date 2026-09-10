/** Fails long-running build/browser jobs before they exhaust the workspace volume. */
import { statfsSync } from "node:fs"
import path from "node:path"

const workspace = path.resolve(import.meta.dirname, "..")
const minimumGb = Number.parseFloat(process.env.AUTOTIME_MIN_FREE_SPACE_GB ?? "2.5")

if (!Number.isFinite(minimumGb) || minimumGb <= 0) {
  console.error("AUTOTIME_MIN_FREE_SPACE_GB must be a positive number.")
  process.exit(2)
}

const stats = statfsSync(workspace)
const freeBytes = Number(stats.bavail) * Number(stats.bsize)
const freeGb = freeBytes / 1024 ** 3

console.log(`Workspace free space: ${freeGb.toFixed(2)} GB (minimum ${minimumGb.toFixed(2)} GB)`)

if (freeGb < minimumGb) {
  console.error(
    "Insufficient free space for browser/build verification. Clear regenerable caches or use a larger test volume.",
  )
  process.exit(1)
}
