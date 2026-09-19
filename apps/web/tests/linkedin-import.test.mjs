import assert from "node:assert/strict"
import JSZip from "jszip"
import { assertSafeEntrySize, enrichCvFromLinkedInZip } from "../lib/cv/sources/linkedin-import.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

function csvFile(name, content) {
  return new File([content], name, { type: "text/csv" })
}

async function zipFile(entries) {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(entries)) {
    zip.file(name, content)
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" })
  return new File([buffer], "export.zip", { type: "application/zip" })
}

test("parses positions, education, and skills from a real LinkedIn export zip", async () => {
  const file = await zipFile({
    "Positions.csv": 'Title,Company Name,Started On,Finished On,Description\n"Engineer","Acme","Jan 2020","",""',
    "Education.csv": 'School Name,Degree Name,Start Date,End Date\n"State U","BSc","2016","2020"',
    "Skills.csv": "Name\nTypeScript\nSQL",
  })
  const result = await enrichCvFromLinkedInZip(file)
  assert.equal(result.experience[0].title, "Engineer")
  assert.equal(result.education[0].institution, "State U")
  assert.deepEqual(result.skills, ["TypeScript", "SQL"])
})

test("rejects a zip entry whose declared uncompressed size exceeds the cap before decompressing it", async () => {
  // Real zip-bomb shape: highly repetitive content compresses to almost
  // nothing but declares its true (huge) uncompressed size in the zip's
  // central directory - exactly the field the fix checks before ever
  // calling .async() to inflate it.
  const bomb = "A".repeat(21 * 1024 * 1024)
  const file = await zipFile({ "Positions.csv": bomb })
  await assert.rejects(() => enrichCvFromLinkedInZip(file), /too large/)
})

test("rejects a zip larger than the overall 25MB cap regardless of contents", async () => {
  const file = { size: 26 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(0) }
  await assert.rejects(() => enrichCvFromLinkedInZip(file), /25 MB/)
})

test("a stray quote inside an unquoted field does not corrupt the rest of the row", async () => {
  // Not RFC 4180-compliant (a field with an embedded quote should itself be
  // quoted), but real-world messy exports aren't always compliant. The
  // parser used to toggle "quoted" mode on ANY standalone quote regardless
  // of position, so this stray mid-field quote would swallow the rest of
  // the row's commas (and even subsequent rows' newlines) as literal text.
  const file = await zipFile({
    "Positions.csv":
      'Title,Company Name,Started On,Finished On,Description\n' +
      'Engineer,Bob\'s "Corner" Shop,Jan 2020,,\n' +
      'Analyst,Acme,Feb 2021,,',
  })
  const result = await enrichCvFromLinkedInZip(file)
  assert.equal(result.experience.length, 2)
  assert.equal(result.experience[0].company, 'Bob\'s "Corner" Shop')
  assert.equal(result.experience[1].title, "Analyst")
  assert.equal(result.experience[1].company, "Acme")
})

test("a genuinely RFC 4180-quoted field with an embedded comma still parses as one field", async () => {
  const file = await zipFile({
    "Positions.csv": 'Title,Company Name\nEngineer,"Smith, Jones & Co"',
  })
  const result = await enrichCvFromLinkedInZip(file)
  assert.equal(result.experience[0].company, "Smith, Jones & Co")
})

test("the size check fails closed when JSZip's internal size field is unavailable, not open", () => {
  // _data.uncompressedSize is a documented-but-unofficial JSZip internal
  // field, not a stable public API - if a future JSZip version renames or
  // removes it, this must refuse to process the entry rather than silently
  // skip the zip-bomb check and decompress an unbounded amount.
  assert.throws(
    () => assertSafeEntrySize({ name: "Positions.csv", _data: undefined }),
    /could not be safely checked/,
  )
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
