import assert from "node:assert/strict"
import test from "node:test"
import {
  getInterviewBuddyDisclaimer,
  getReusableAnswerLabel,
  inferReusableAnswerKey,
  normaliseSentence,
  validateInterviewBuddyInput,
} from "../domains/interviews/interview-buddy-policy.ts"

test("normalises interview notes without changing existing punctuation", () => {
  assert.equal(normaliseSentence("  Delivered   the migration  "), "Delivered the migration.")
  assert.equal(normaliseSentence("Already complete!"), "Already complete!")
})

test("rejects empty, underspecified and keyboard-noise interview input", () => {
  assert.match(validateInterviewBuddyInput({ question: "why", draft: "a valid enough example with multiple meaningful words included" }), /real interview question/)
  assert.match(validateInterviewBuddyInput({ question: "bcdf bcdf bcdf bcdf", draft: "a valid enough example with multiple meaningful words included" }), /random text/)
  assert.match(validateInterviewBuddyInput({ question: "Tell me about your delivery experience", draft: "too short" }), /rough but meaningful answer/)
})

test("accepts a meaningful question and evidence-bearing draft", () => {
  assert.equal(validateInterviewBuddyInput({
    question: "Tell me about a difficult delivery problem",
    draft: "I coordinated the migration, resolved a dependency, and delivered the release safely.",
  }), null)
})

test("maps consequential questions to reusable evidence categories", () => {
  assert.equal(inferReusableAnswerKey("Will you need visa sponsorship?"), "sponsorshipAnswer")
  assert.equal(inferReusableAnswerKey("What is your start date?"), "availabilityAnswer")
  assert.equal(getReusableAnswerLabel("workAuthorisationAnswer"), "work authorisation answer")
})

test("adds the legal-information boundary only to immigration questions", () => {
  assert.match(getInterviewBuddyDisclaimer("Do you need a work permit?"), /official sources/)
  assert.equal(getInterviewBuddyDisclaimer("Tell me about your strongest project"), "")
})
