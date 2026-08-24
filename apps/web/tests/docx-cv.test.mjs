import assert from "node:assert/strict"
import { deflateRawSync } from "node:zlib"
import { extractDocxText } from "../lib/docx-cv.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

function buildMinimalDocx(entryName, uncompressedData) {
  const compressed = deflateRawSync(uncompressedData)
  const nameBytes = Buffer.from(entryName, "utf8")

  const localHeader = Buffer.alloc(30)
  localHeader.writeUInt32LE(0x04034b50, 0)
  localHeader.writeUInt16LE(20, 4) // version needed
  localHeader.writeUInt16LE(0, 6) // flags
  localHeader.writeUInt16LE(8, 8) // compression method: deflate
  localHeader.writeUInt16LE(0, 10) // mod time
  localHeader.writeUInt16LE(0, 12) // mod date
  localHeader.writeUInt32LE(0, 14) // crc32 (unchecked by this reader)
  localHeader.writeUInt32LE(compressed.length, 18) // compressed size
  localHeader.writeUInt32LE(uncompressedData.length, 22) // uncompressed size
  localHeader.writeUInt16LE(nameBytes.length, 26) // file name length
  localHeader.writeUInt16LE(0, 28) // extra field length

  const localHeaderOffset = 0
  const localSection = Buffer.concat([localHeader, nameBytes, compressed])

  const centralHeader = Buffer.alloc(46)
  centralHeader.writeUInt32LE(0x02014b50, 0)
  centralHeader.writeUInt16LE(20, 4) // version made by
  centralHeader.writeUInt16LE(20, 6) // version needed
  centralHeader.writeUInt16LE(0, 8) // flags
  centralHeader.writeUInt16LE(8, 10) // compression method
  centralHeader.writeUInt16LE(0, 12) // mod time
  centralHeader.writeUInt16LE(0, 14) // mod date
  centralHeader.writeUInt32LE(0, 16) // crc32
  centralHeader.writeUInt32LE(compressed.length, 20) // compressed size
  centralHeader.writeUInt32LE(uncompressedData.length, 24) // uncompressed size
  centralHeader.writeUInt16LE(nameBytes.length, 28) // file name length
  centralHeader.writeUInt16LE(0, 30) // extra field length
  centralHeader.writeUInt16LE(0, 32) // comment length
  centralHeader.writeUInt16LE(0, 34) // disk number
  centralHeader.writeUInt16LE(0, 36) // internal attrs
  centralHeader.writeUInt32LE(0, 38) // external attrs
  centralHeader.writeUInt32LE(localHeaderOffset, 42) // local header offset

  const centralDirectory = Buffer.concat([centralHeader, nameBytes])
  const centralDirectoryOffset = localSection.length

  const endOfCentralDirectory = Buffer.alloc(22)
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0)
  endOfCentralDirectory.writeUInt16LE(0, 4) // disk number
  endOfCentralDirectory.writeUInt16LE(0, 6) // cd start disk
  endOfCentralDirectory.writeUInt16LE(1, 8) // entries on this disk
  endOfCentralDirectory.writeUInt16LE(1, 10) // total entries
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12) // cd size
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16) // cd offset
  endOfCentralDirectory.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([localSection, centralDirectory, endOfCentralDirectory])
}

test("extracts text from a normal document.xml entry", () => {
  const xml =
    "<w:document><w:body><w:p><w:r><w:t>Hello CV</w:t></w:r></w:p></w:body></w:document>"
  const docx = buildMinimalDocx("word/document.xml", Buffer.from(xml, "utf8"))
  const text = extractDocxText(docx)
  assert.equal(text, "Hello CV")
})

test("decodes entities in one pass without double-escaping", () => {
  // "&amp;lt;" is a legitimately double-escaped "&lt;" - it should decode
  // to the literal two characters "&lt;", not be re-decoded into "<".
  const xml =
    "<w:document><w:body><w:p><w:r><w:t>Rate &amp;lt; 5&amp;gt;/hr &amp;amp; more</w:t></w:r></w:p></w:body></w:document>"
  const docx = buildMinimalDocx("word/document.xml", Buffer.from(xml, "utf8"))
  const text = extractDocxText(docx)
  assert.equal(text, "Rate &lt; 5&gt;/hr &amp; more")
})

test("rejects a document.xml entry that decompresses past the output cap", () => {
  // A large run of a single repeated byte compresses to a tiny buffer but
  // expands back to its full size on inflate - the zip-bomb shape this
  // guards against. 80MB comfortably exceeds the 50MB cap while staying
  // fast and light to compress in a test.
  const bomb = Buffer.alloc(80 * 1024 * 1024, 0)
  const docx = buildMinimalDocx("word/document.xml", bomb)
  assert.throws(() => extractDocxText(docx), /too large to read/)
})

test("throws when document.xml is missing", () => {
  const docx = buildMinimalDocx("word/styles.xml", Buffer.from("<xml/>", "utf8"))
  assert.throws(() => extractDocxText(docx), /document text was not found/)
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
