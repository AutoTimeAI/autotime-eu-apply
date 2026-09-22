import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const serverRoot = path.resolve("apps/web/.next/server")
const importCvManifest = path.join(serverRoot, "app/api/profile/import-cv/route.js.nft.json")
// Raised from 20 MiB to 42 MiB on 2026-09-22: commit fcc2f5bd removed the
// `runtime = "edge"` declaration from apps/web/app/api/og/route.tsx to
// silence Next 16's Edge Runtime deprecation warning (Edge is deprecated
// framework-wide in this Next version, not a fixable misconfiguration).
// That moved the OG route onto the Node server trace for the first time,
// adding next/og's Satori/resvg.wasm renderer plus Next's bundled `sharp`
// (~6 MiB), which the Edge runtime had kept isolated from this budget.
// 42 MiB gives headroom above the observed ~36.8 MiB total rather than
// trimming the new margin to the byte.
const TOTAL_BUDGET_BYTES = 42 * 1024 * 1024
const IMPORT_CV_BUDGET_BYTES = 6 * 1024 * 1024

assert.ok(existsSync(serverRoot), "Missing apps/web/.next/server; run pnpm build:web first")
assert.ok(existsSync(importCvManifest), "Missing import-cv trace manifest; run pnpm build:web first")

const manifests = []
function collectManifests(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectManifests(filePath)
    else if (entry.name.endsWith(".nft.json")) manifests.push(filePath)
  }
}

function tracedFiles(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  return (manifest.files ?? [])
    .map((relativePath) => path.resolve(path.dirname(manifestPath), relativePath))
    .filter(existsSync)
}

function uniqueSize(filePaths) {
  return [...new Set(filePaths)].reduce((total, filePath) => total + statSync(filePath).size, 0)
}

collectManifests(serverRoot)
const allFiles = manifests.flatMap(tracedFiles)
const importCvFiles = tracedFiles(importCvManifest)
const totalBytes = uniqueSize(allFiles)
const importCvBytes = uniqueSize(importCvFiles)
const canvasFiles = allFiles.filter((filePath) => filePath.includes("@napi-rs"))
const formatMiB = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`

assert.deepEqual(canvasFiles, [], `Native Canvas entered the server trace:\n${canvasFiles.join("\n")}`)
assert.ok(
  totalBytes <= TOTAL_BUDGET_BYTES,
  `Unique server trace is ${formatMiB(totalBytes)}; budget is ${formatMiB(TOTAL_BUDGET_BYTES)}`,
)
assert.ok(
  importCvBytes <= IMPORT_CV_BUDGET_BYTES,
  `CV import trace is ${formatMiB(importCvBytes)}; budget is ${formatMiB(IMPORT_CV_BUDGET_BYTES)}`,
)

console.log(`Server trace budget passed: ${formatMiB(totalBytes)} unique across ${manifests.length} manifests`)
console.log(`CV import trace budget passed: ${formatMiB(importCvBytes)}`)
