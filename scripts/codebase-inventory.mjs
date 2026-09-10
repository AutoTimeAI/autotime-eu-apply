import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { extname } from "node:path"

const countedExtensions = new Set([".css", ".js", ".json", ".mjs", ".ps1", ".py", ".sh", ".sql", ".ts", ".tsx", ".yml", ".yaml"])
const excluded = new Set(["pnpm-lock.yaml"])

function category(path) {
  if (path.startsWith("docs/")) return "documentation"
  if (path.includes("/tests/") || path.startsWith("tests/") || /\.test\.|\.spec\./.test(path)) return "tests"
  if (path.startsWith("scripts/") || path.startsWith("k6/")) return "tooling"
  if (path.startsWith("supabase/migrations/") || path.startsWith("supabase/preflight/") || path.startsWith("supabase/seeds/")) return "database"
  if (path.startsWith(".github/") || path.startsWith("config/") || ["package.json", "vercel.json", "checkly.config.ts"].includes(path)) return "configuration"
  return "production"
}

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((path) => !excluded.has(path) && countedExtensions.has(extname(path)))

const result = {}
for (const path of files) {
  const bucket = category(path)
  const lines = readFileSync(path, "utf8").split(/\r?\n/).length
  result[bucket] ??= { files: 0, lines: 0 }
  result[bucket].files += 1
  result[bucket].lines += lines
}

process.stdout.write(`${JSON.stringify({ measuredAt: new Date().toISOString(), categories: result }, null, 2)}\n`)
