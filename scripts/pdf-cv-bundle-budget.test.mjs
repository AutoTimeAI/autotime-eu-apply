import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { extractPdfText } from "../apps/web/lib/pdf-cv.ts"

const extractor = await readFile(new URL("../apps/web/lib/pdf-cv.ts", import.meta.url), "utf8")
const webPackage = JSON.parse(await readFile(new URL("../apps/web/package.json", import.meta.url), "utf8"))
const rootPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))

function createTextPdf(text) {
  const stream = `BT\n/F1 8 Tf\n72 720 Td\n(${text}) Tj\nET`
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = "%PDF-1.4\n"
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf)
}

test("PDF CV extraction uses the serverless text-only parser", () => {
  assert.match(extractor, /import\("unpdf"\)/)
  assert.match(extractor, /mergePages: true/)
  assert.doesNotMatch(extractor, /@napi-rs\/canvas|pdf-parse/)
})

test("native Canvas cannot re-enter the function through an optional peer", () => {
  assert.equal(webPackage.dependencies.unpdf.startsWith("^1."), true)
  assert.equal(webPackage.dependencies["@napi-rs/canvas"], undefined)
  assert.equal(webPackage.dependencies["pdf-parse"], undefined)
  assert.equal(rootPackage.pnpm.overrides["@napi-rs/canvas"], "-")
})

test("extracts selectable CV text from a real PDF byte stream", async () => {
  const cvText = "AutoTime test candidate with TypeScript React Node.js cloud engineering and European mobility experience"
  const extracted = await extractPdfText(createTextPdf(cvText))

  assert.match(extracted, /AutoTime test candidate/)
  assert.match(extracted, /European mobility experience/)
})

test("rejects files that only pretend to be PDFs", async () => {
  await assert.rejects(() => extractPdfText(Buffer.from("not a PDF")), /not a valid PDF/)
})
