import { readFile, writeFile } from "node:fs/promises";

const report = JSON.parse(await readFile("coverage-report/registry-update.json", "utf8"));
const registryPath = "packages/shared/src/platform-coverage.ts";
let source = await readFile(registryPath, "utf8");
for (const platform of report.verifiedPlatforms) {
  const escaped = platform.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(platform:\\s*"${escaped}"[\\s\\S]*?lastVerifiedAt:)(?:VERIFIED_AT|"\\d{4}-\\d{2}-\\d{2}")`);
  source = source.replace(pattern, `$1"${report.checkedAt}"`);
}
await writeFile(registryPath, source);
