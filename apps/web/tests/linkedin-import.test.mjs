import assert from "node:assert/strict"
import JSZip from "jszip"
import { enrichCvFromLinkedInZip } from "../lib/cv/sources/linkedin-import.ts"

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
