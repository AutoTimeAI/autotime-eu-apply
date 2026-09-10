import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

// Regression guard for a real bug: globals.css's "2026 visual system
// refresh" is a second, unscoped :root block. It used to redefine --ink,
// --text, --border and --border-strong to near-duplicate teal-tinted
// values, which leaked into computed styles (e.g. <body> text color) that
// no surface-scoped override could reach, since a child selector cannot
// change what an ancestor element already resolved to. The fix has three
// parts that all have to hold together:
//   1. globals.css's refresh block must never redefine those four
//      ancestor-resolved properties again - it must let them fall through
//      to tokens.css's blue values everywhere.
//   2. phase-10-dashboard-blue.css re-pins the full blue palette (those
//      four plus --accent/--accent-strong) scoped to .dashboard-app-shell,
//      so every dashboard page overrides the refresh's teal accent/shadow.
//   3. phase-8-public.css re-pins --accent/--accent-strong scoped to
//      .landing-shell/.auth-shell, so the two public pages do the same.
// A future edit to any one of these three files without the others is
// exactly how the original bug happened.

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8")
}

function extractBlock(source, blockStartPattern) {
  const startIndex = source.search(blockStartPattern)
  assert.notEqual(
    startIndex,
    -1,
    `Expected to find a block starting with ${blockStartPattern} - has it moved or been renamed?`,
  )
  const openBrace = source.indexOf("{", startIndex)
  const closeBrace = source.indexOf("}", openBrace)
  return source.slice(openBrace, closeBrace + 1)
}

// Strips /* ... */ comments so explanatory text documenting a historical,
// now-forbidden value (e.g. "--text: #183230 vs the original #263244")
// cannot itself trip a doesNotMatch check on live declarations.
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

function extractCustomProperty(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*([^;]+);`))
  assert.notEqual(match, null, `Expected ${name} to be set in: ${block}`)
  return match[1].trim()
}

test("globals.css's unscoped visual-refresh :root never redefines the four ancestor-resolved neutral tokens", async () => {
  const globalsCss = await read("apps/web/app/globals.css")
  const refreshBlock = stripComments(
    extractBlock(globalsCss, /\/\* 2026 visual system refresh \*\/\s*:root\s*\{/),
  )

  assert.doesNotMatch(refreshBlock, /--ink:/)
  assert.doesNotMatch(refreshBlock, /--text:/)
  assert.doesNotMatch(refreshBlock, /--border:/)
  assert.doesNotMatch(refreshBlock, /--border-strong:/)
})

test("phase-10-dashboard-blue.css re-pins .dashboard-app-shell to the same blue values as the base tokens", async () => {
  const tokensCss = await read("apps/web/app/tokens.css")
  const phase10Css = await read("apps/web/app/phase-10-dashboard-blue.css")

  const baseBlock = extractBlock(tokensCss, /:root\s*\{/)
  const shellBlock = extractBlock(phase10Css, /\.dashboard-app-shell\s*\{/)

  for (const property of ["--ink", "--text", "--border", "--border-strong", "--accent", "--accent-strong"]) {
    assert.equal(
      extractCustomProperty(shellBlock, property),
      extractCustomProperty(baseBlock, property),
      `.dashboard-app-shell's ${property} has drifted from the base token - the dashboard would render off-brand`,
    )
  }
})

test("phase-8-public.css re-pins the public pages' accent to the same blue as the base tokens", async () => {
  const tokensCss = await read("apps/web/app/tokens.css")
  const phase8Css = await read("apps/web/app/phase-8-public.css")

  const baseBlock = extractBlock(tokensCss, /:root\s*\{/)
  const publicBlock = extractBlock(phase8Css, /\.landing-shell,\s*\.auth-shell\s*\{/)

  for (const property of ["--accent", "--accent-strong"]) {
    assert.equal(
      extractCustomProperty(publicBlock, property),
      extractCustomProperty(baseBlock, property),
      `.landing-shell/.auth-shell's ${property} has drifted from the base token - the public pages would show the wrong accent`,
    )
  }
})
