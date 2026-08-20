import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

let reportDirReady: Promise<unknown> | null = null

function sanitize(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 120)
}

async function writeAxeReport(page: Page, results: Awaited<ReturnType<AxeBuilder["analyze"]>>) {
  reportDirReady ??= mkdir("axe-report", { recursive: true })
  await reportDirReady

  const testInfo = test.info()
  const fileName = `${sanitize(testInfo.titlePath.join("-"))}-${sanitize(page.url())}.json`
  await writeFile(
    path.join("axe-report", fileName),
    JSON.stringify(
      {
        url: page.url(),
        test: testInfo.titlePath.join(" > "),
        violations: results.violations
      },
      null,
      2
    )
  )
}

export type AxeCheckOptions = {
  /** Restrict the scan to a CSS selector instead of the full page. */
  include?: string
  /** axe rule ids to skip entirely (use sparingly - see docs/quality-assurance.md). */
  disableRules?: string[]
}

/**
 * Runs an axe-core scan and fails the test only on "serious" or "critical"
 * impact violations - moderate/minor findings are logged for visibility
 * without blocking CI, matching the requirement to fail on serious/critical
 * only and never silence genuine violations with broad exclusions.
 */
export async function expectNoSeriousViolations(
  page: Page,
  options: AxeCheckOptions = {}
) {
  let builder = new AxeBuilder({ page })
  if (options.include) builder = builder.include(options.include)
  if (options.disableRules?.length) builder = builder.disableRules(options.disableRules)

  const results = await builder.analyze()
  await writeAxeReport(page, results)

  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  )
  const nonBlocking = results.violations.filter(
    (violation) => violation.impact !== "serious" && violation.impact !== "critical"
  )

  if (nonBlocking.length) {
    console.warn(
      `axe: ${nonBlocking.length} non-blocking (moderate/minor) violation(s) on ${page.url()}:`,
      nonBlocking.map((violation) => `${violation.id} (${violation.impact})`)
    )
  }

  expect(
    blocking,
    blocking
      .map(
        (violation) =>
          `${violation.id} (${violation.impact}): ${violation.help} - ${violation.nodes.length} node(s)`
      )
      .join("\n")
  ).toEqual([])

  return results
}
