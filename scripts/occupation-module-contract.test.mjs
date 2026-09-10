import assert from "node:assert/strict"
import test from "node:test"
import {
  getStaleOccupationSources,
  occupationModuleSchema,
  techFintechOccupationModule,
} from "../packages/shared/src/occupations/index.ts"

test("the launch occupation module satisfies the governed contract", () => {
  assert.equal(occupationModuleSchema.safeParse(techFintechOccupationModule).success, true)
})

test("regulated modules require a qualified reviewer and sources", () => {
  const result = occupationModuleSchema.safeParse({
    ...techFintechOccupationModule,
    id: "regulated-example",
    riskLevel: "regulated",
  })
  assert.equal(result.success, false)
  assert.match(JSON.stringify(result.error?.issues), /qualified reviewer/i)
  assert.match(JSON.stringify(result.error?.issues), /authoritative sources/i)
})

test("source freshness is deterministic at the review boundary", () => {
  const module = occupationModuleSchema.parse({
    ...techFintechOccupationModule,
    sources: [{
      jurisdiction: "EU",
      label: "Official source",
      reviewedAt: "2026-01-01",
      reviewIntervalDays: 30,
      url: "https://example.eu/official",
    }],
  })
  assert.equal(getStaleOccupationSources(module, new Date("2026-01-31T00:00:00Z")).length, 0)
  assert.equal(getStaleOccupationSources(module, new Date("2026-02-01T00:00:00Z")).length, 1)
})
