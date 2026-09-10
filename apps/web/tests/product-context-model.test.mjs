import assert from "node:assert/strict"
import test from "node:test"
import {
  defaultProductContext,
  getStoredProductContext,
  productContextSchema,
  productContextSchemaVersion,
  roleMarkets,
  saveProductContext,
} from "../domains/product-context/model.ts"

class MemoryStorage {
  constructor() { this.values = new Map() }
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
}

test("market configuration has unique identifiers and complete positioning", () => {
  assert.equal(new Set(roleMarkets.map((market) => market.id)).size, roleMarkets.length)
  for (const market of roleMarkets) {
    assert.ok(market.keywords.length > 0)
    assert.ok(market.targetRoles.length > 0)
    assert.ok(market.positioning.length > 0)
  }
})

test("current product context round-trips per account", () => {
  const storage = new MemoryStorage()
  const context = {
    schemaVersion: productContextSchemaVersion,
    roleMarket: "fintech",
    candidatePosition: "foreign-candidate",
    urgency: "active",
    targetCountry: "Ireland",
    experienceLevel: "Senior",
  }
  saveProductContext(context, "user-1", storage)
  assert.deepEqual(getStoredProductContext("user-1", storage), context)
  assert.deepEqual(getStoredProductContext("user-2", storage), defaultProductContext)
})

test("legacy fallback defaults are cleared so users explicitly reconfirm context", () => {
  const storage = new MemoryStorage()
  storage.setItem("autotime-v2-product-context:user-1", JSON.stringify({
    schemaVersion: 1,
    roleMarket: "general-tech",
    candidatePosition: "foreign-candidate",
    urgency: "active",
    targetCountry: "United Kingdom",
    experienceLevel: "Mid-level",
  }))
  assert.deepEqual(getStoredProductContext("user-1", storage), defaultProductContext)
})

test("unsupported countries and malformed context fail closed", () => {
  assert.equal(productContextSchema.safeParse({ ...defaultProductContext, targetCountry: "Mars" }).success, false)
  const storage = new MemoryStorage()
  storage.setItem("autotime-v2-product-context:user-1", "not-json")
  assert.deepEqual(getStoredProductContext("user-1", storage), defaultProductContext)
})
