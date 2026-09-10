import assert from "node:assert/strict"
import test from "node:test"
import {
  ApplicationPreparationBlockedError,
  prepareApplicationKit,
} from "../domains/application-preparation/prepare-application-kit.ts"

const input = {
  profile: {},
  job: {},
  reusableAnswers: null,
}

const generated = {
  completionTokens: 20,
  costUsd: 0.01,
  model: "test-model",
  promptTokens: 10,
  value: { answers: [], coverLetter: "Draft", cvTailoringNotes: [] },
}

function createPorts({ decision = "Apply", failAt } = {}) {
  const calls = []
  return {
    calls,
    ports: {
      decisions: {
        async assess() {
          calls.push("assess")
          if (failAt === "assess") throw new Error("decision unavailable")
          return { blockers: [], decision, missingEvidence: [] }
        },
      },
      generator: {
        async generate() {
          calls.push("generate")
          if (failAt === "generate") throw new Error("provider failed")
          return generated
        },
      },
      lifecycle: { generationStarted: () => calls.push("started") },
      usage: {
        async assertAllowed() { calls.push("assert") },
        async reserve() { calls.push("reserve"); return "reservation-1" },
        async release() { calls.push("release") },
        async finalize() {
          calls.push("finalize")
          if (failAt === "finalize") throw new Error("finalization failed")
        },
      },
    },
  }
}

test("coordinates decision, generation and usage finalization in order", async () => {
  const fixture = createPorts()
  const result = await prepareApplicationKit({ input, ports: fixture.ports, userId: "user-1" })

  assert.equal(result, generated)
  assert.deepEqual(fixture.calls, ["assert", "reserve", "assess", "started", "generate", "finalize"])
})

test("releases a reservation when policy blocks generation", async () => {
  const fixture = createPorts({ decision: "Skip" })

  await assert.rejects(
    prepareApplicationKit({ input, ports: fixture.ports, userId: "user-1" }),
    ApplicationPreparationBlockedError,
  )
  assert.deepEqual(fixture.calls, ["assert", "reserve", "assess", "release"])
})

for (const failAt of ["assess", "generate"]) {
  test(`releases a reservation when ${failAt} fails before provider completion`, async () => {
    const fixture = createPorts({ failAt })

    await assert.rejects(
      prepareApplicationKit({ input, ports: fixture.ports, userId: "user-1" }),
    )
    assert.equal(fixture.calls.at(-1), "release")
  })
}

test("retains charged usage when finalization fails after provider completion", async () => {
  const fixture = createPorts({ failAt: "finalize" })

  await assert.rejects(
    prepareApplicationKit({ input, ports: fixture.ports, userId: "user-1" }),
    /finalization failed/,
  )
  assert.deepEqual(fixture.calls, ["assert", "reserve", "assess", "started", "generate", "finalize"])
})
