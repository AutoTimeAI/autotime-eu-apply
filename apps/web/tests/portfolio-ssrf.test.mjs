import assert from "node:assert/strict"
import { createSsrfSafeLookup, extractReadableText, fetchPortfolioText, isPrivateAddress, PortfolioFetchError } from "../lib/cv/sources/portfolio.ts"

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

test("rejects an IPv4-mapped IPv6 loopback address (dotted-quad form)", async () => {
  // RFC 4291: "::ffff:127.0.0.1" is a valid IPv6 address the OS socket
  // layer connects to identically to plain 127.0.0.1 on any dual-stack
  // host - a DNS server returning this in an AAAA record is a real,
  // reachable SSRF bypass if the check only recognizes bare dotted-quad
  // and the small set of pre-existing IPv6 prefixes.
  const lookup = createSsrfSafeLookup(
    fakeLookup([{ address: "::ffff:127.0.0.1", family: 6 }]),
  )
  await assert.rejects(() => runLookup(lookup, "mapped.example.com", {}))
})

test("rejects an IPv4-mapped IPv6 loopback address (hex-group form)", async () => {
  // The same address as above, but in the compressed hex-group form
  // Node's own dns.lookup / getaddrinfo can actually return
  // ("::ffff:7f00:1" = 127.0.0.1) - both representations must be caught.
  const lookup = createSsrfSafeLookup(
    fakeLookup([{ address: "::ffff:7f00:1", family: 6 }]),
  )
  await assert.rejects(() => runLookup(lookup, "mapped-hex.example.com", {}))
})

test("isPrivateAddress recognizes bracketed IPv6 hosts, as produced by new URL().hostname", () => {
  // new URL("http://[::1]/").hostname returns "[::1]" WITH the brackets -
  // a real, directly reachable bypass (not just a DNS-rebinding scenario)
  // since a literal-IP host never goes through the DNS-safe lookup at all.
  assert.equal(isPrivateAddress("[::1]"), true)
  assert.equal(isPrivateAddress("[fe80::1]"), true)
  // new URL("http://[::ffff:127.0.0.1]/").hostname returns
  // "[::ffff:7f00:1]" - bracketed AND hex-encoded.
  assert.equal(isPrivateAddress("[::ffff:7f00:1]"), true)
  assert.equal(isPrivateAddress("[::ffff:127.0.0.1]"), true)
  assert.equal(isPrivateAddress("[2001:db8::1]"), false)
})

test("fetchPortfolioText throws PortfolioFetchError (not a generic Error) for user-actionable input problems", async () => {
  // The route mapping these to a 4xx status relies on `instanceof
  // PortfolioFetchError` specifically - a plain Error here would silently
  // fall through to the generic 500 branch and get its safe, actionable
  // message redacted by toPublicApiError.
  await assert.rejects(() => fetchPortfolioText("not-a-url"), (error) => {
    assert.ok(error instanceof Error)
    return true
  })
  await assert.rejects(() => fetchPortfolioText("ftp://example.com/"), PortfolioFetchError)
  await assert.rejects(() => fetchPortfolioText("http://127.0.0.1/"), PortfolioFetchError)
  await assert.rejects(() => fetchPortfolioText("http://localhost/"), PortfolioFetchError)
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
