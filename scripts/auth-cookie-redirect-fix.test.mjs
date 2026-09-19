import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

// Next.js does not reliably merge cookies written through the ambient
// `cookies()` API (used internally by @supabase/ssr's createServerClient)
// onto a separately-constructed NextResponse.redirect() returned from a
// Route Handler - a documented App Router limitation
// (https://github.com/vercel/next.js/discussions/48434). Found in
// production via direct diagnostics: the cookie write itself always
// succeeded (confirmed via Vercel logs, sane attributes), yet the
// browser's very next request had no recognized session, on both the QA
// test-account bootstrap route and (structurally identically) the real
// user login callback.
//
// The fix is `applyPendingCookies(response, pendingCookies)`, which writes
// each cookie directly onto the specific response object being returned
// via `response.cookies.set()` - the one path Next.js guarantees attaches
// regardless of response type. This test guards against a future redirect
// exit point being added to either fixed route without that wrapping,
// which would silently reintroduce the exact bug that took an extensive
// live-production investigation to find.
const files = [
  new URL("../apps/web/app/auth/callback/route.ts", import.meta.url),
  new URL("../apps/web/app/api/qa/session/route.ts", import.meta.url),
]

function countRealOccurrences(source, pattern) {
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .match(pattern)?.length ?? 0
}

for (const file of files) {
  test(`every NextResponse.redirect() in ${file.pathname.split("/").pop()} carries applyPendingCookies`, async () => {
    const source = await readFile(file, "utf8")

    assert.match(
      source,
      /createServerClient\(\s*\(cookies\)\s*=>\s*pendingCookies\.push/,
      "expected createServerClient to be called with a capture callback that fills pendingCookies",
    )

    const redirectCount = countRealOccurrences(source, /NextResponse\.redirect\(/g)
    const wrappedCount = countRealOccurrences(source, /applyPendingCookies\(/g)

    assert.ok(redirectCount > 0, "expected at least one NextResponse.redirect() call")
    assert.ok(
      wrappedCount >= redirectCount,
      `expected every NextResponse.redirect() (${redirectCount}) to be wrapped in applyPendingCookies (only ${wrappedCount} found) - ` +
        "an unwrapped redirect here silently drops any session cookie just written, exactly the bug this file fixes",
    )
  })
}
