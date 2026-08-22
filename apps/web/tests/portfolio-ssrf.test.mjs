import assert from "node:assert/strict"
import { createSsrfSafeLookup, extractReadableText } from "../lib/cv/sources/portfolio.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

function fakeLookup(addresses) {
  return (_hostname, _options, callback) => {
    callback(null, addresses)
  }
}

function fakeLookupError(error) {
  return (_hostname, _options, callback) => {
    callback(error, [])
  }
}

function runLookup(lookup, hostname, options) {
  return new Promise((resolve, reject) => {
    lookup(hostname, options, (error, address, family) => {
      if (error) {
        reject(error)
        return
      }
      resolve({ address, family })
    })
  })
}

test("accepts a hostname that resolves only to public addresses", async () => {
  const lookup = createSsrfSafeLookup(
    fakeLookup([{ address: "93.184.216.34", family: 4 }]),
  )
  const result = await runLookup(lookup, "example.com", {})
  assert.equal(result.address, "93.184.216.34")
  assert.equal(result.family, 4)
})

test("rejects a hostname that resolves to a private address", async () => {
  const lookup = createSsrfSafeLookup(
    fakeLookup([{ address: "10.0.0.5", family: 4 }]),
  )
  await assert.rejects(() => runLookup(lookup, "internal.example.com", {}))
})

test("rejects a hostname that resolves to the cloud metadata address", async () => {
  const lookup = createSsrfSafeLookup(
    fakeLookup([{ address: "169.254.169.254", family: 4 }]),
  )
  await assert.rejects(() => runLookup(lookup, "metadata.example.com", {}))
})

test("rejects when only one of multiple resolved addresses is private", async () => {
  // The DNS-rebinding scenario this exists to close: a hostname that
  // resolves to a mix of public and private/internal addresses must be
  // rejected outright, not accepted because one address looked fine.
  const lookup = createSsrfSafeLookup(
    fakeLookup([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]),
  )
  await assert.rejects(() => runLookup(lookup, "rebinding.example.com", {}))
})

test("rejects a loopback IPv6 address", async () => {
  const lookup = createSsrfSafeLookup(fakeLookup([{ address: "::1", family: 6 }]))
  await assert.rejects(() => runLookup(lookup, "v6.example.com", {}))
})

test("propagates the underlying DNS lookup error", async () => {
  const dnsError = new Error("getaddrinfo ENOTFOUND")
  const lookup = createSsrfSafeLookup(fakeLookupError(dnsError))
  await assert.rejects(() => runLookup(lookup, "missing.example.com", {}), dnsError)
})

test("supports the { all: true } callback shape", async () => {
  const lookup = createSsrfSafeLookup(
    fakeLookup([{ address: "93.184.216.34", family: 4 }]),
  )
  const addresses = await new Promise((resolve, reject) => {
    lookup("example.com", { all: true }, (error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result)
    })
  })
  assert.deepEqual(addresses, [{ address: "93.184.216.34", family: 4 }])
})

test("supports the (hostname, callback) two-argument shape", async () => {
  const lookup = createSsrfSafeLookup(
    fakeLookup([{ address: "93.184.216.34", family: 4 }]),
  )
  const result = await new Promise((resolve, reject) => {
    lookup("example.com", (error, address, family) => {
      if (error) {
        reject(error)
        return
      }
      resolve({ address, family })
    })
  })
  assert.equal(result.address, "93.184.216.34")
})

test("strips script content even when the closing tag has junk before '>'", () => {
  // Browsers treat `</script anything>` as a valid closing tag as long as
  // it contains no '>' - a bare `<\/script>` regex misses that, letting the
  // literal script body (e.g. `alert(1)`) survive as plain text. Matches the
  // CodeQL js/incomplete-multi-character-sanitization finding for this
  // pattern (both the plain-whitespace and arbitrary-junk variants).
  for (const closer of ["</script >", "</script\t\n bar>"]) {
    const text = extractReadableText(`<p>hello</p><script>alert(1)${closer}world`)
    assert.doesNotMatch(text, /alert\(1\)/, closer)
    assert.match(text, /hello/, closer)
    assert.match(text, /world/, closer)
  }
})

test("strips style content even when the closing tag has junk before '>'", () => {
  for (const closer of ["</style >", "</style\t\n bar>"]) {
    const text = extractReadableText(`<p>hello</p><style>body{color:red}${closer}world`)
    assert.doesNotMatch(text, /color:red/, closer)
    assert.match(text, /hello/, closer)
    assert.match(text, /world/, closer)
  }
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
