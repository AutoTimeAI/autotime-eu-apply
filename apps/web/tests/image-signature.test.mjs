import assert from "node:assert/strict"
import { matchesImageSignature } from "../lib/image-signature.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

function bytesOf(...values) {
  return new Uint8Array(values)
}

test("accepts a real JPEG signature", () => {
  assert.equal(matchesImageSignature(bytesOf(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"), true)
})

test("accepts a real PNG signature", () => {
  assert.equal(
    matchesImageSignature(bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png"),
    true,
  )
})

test("accepts a real WebP signature", () => {
  const webp = bytesOf(
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x00, 0x00, 0x00, 0x00, // chunk size (unchecked)
    0x57, 0x45, 0x42, 0x50, // "WEBP"
  )
  assert.equal(matchesImageSignature(webp, "image/webp"), true)
})

test("rejects an HTML payload claiming to be a JPEG", () => {
  const html = new TextEncoder().encode("<html><script>alert(1)</script></html>")
  assert.equal(matchesImageSignature(html, "image/jpeg"), false)
})

test("rejects a PNG-claimed file with a JPEG signature", () => {
  assert.equal(matchesImageSignature(bytesOf(0xff, 0xd8, 0xff, 0xe0), "image/png"), false)
})

test("rejects a WebP-claimed file missing the WEBP marker", () => {
  const notWebp = bytesOf(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0, 0, 0, 0)
  assert.equal(matchesImageSignature(notWebp, "image/webp"), false)
})

test("rejects an unsupported mime type outright", () => {
  assert.equal(matchesImageSignature(bytesOf(0xff, 0xd8, 0xff), "image/svg+xml"), false)
})

test("rejects a truncated buffer shorter than the signature", () => {
  assert.equal(matchesImageSignature(bytesOf(0x89, 0x50), "image/png"), false)
})

let failed = 0

for (const { name, run } of tests) {
  try {
    await run()
    console.log(`ok - ${name}`)
  } catch (error) {
    failed += 1
    console.error(`not ok - ${name}`)
    console.error(error)
  }
}

if (failed > 0) {
  process.exitCode = 1
}
