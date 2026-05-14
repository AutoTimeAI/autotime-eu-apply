import { inflateRawSync } from "node:zlib"

type ZipEntry = {
  compressedSize: number
  compressionMethod: number
  localHeaderOffset: number
  name: string
}

const endOfCentralDirectorySignature = 0x06054b50
const centralDirectorySignature = 0x02014b50
const localFileHeaderSignature = 0x04034b50

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 65557)

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endOfCentralDirectorySignature) {
      return offset
    }
  }

  return -1
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
  const directoryEnd = findEndOfCentralDirectory(buffer)

  if (directoryEnd < 0) {
    throw new Error("DOCX file could not be read.")
  }

  const entryCount = buffer.readUInt16LE(directoryEnd + 10)
  const directoryOffset = buffer.readUInt32LE(directoryEnd + 16)
  const entries: ZipEntry[] = []
  let offset = directoryOffset

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== centralDirectorySignature) {
      throw new Error("DOCX file index is invalid.")
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const fileNameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const name = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8")

    entries.push({
      compressedSize,
      compressionMethod,
      localHeaderOffset,
      name
    })

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localHeaderOffset

  if (buffer.readUInt32LE(offset) !== localFileHeaderSignature) {
    throw new Error("DOCX file content is invalid.")
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26)
  const extraLength = buffer.readUInt16LE(offset + 28)
  const dataStart = offset + 30 + fileNameLength + extraLength
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize)

  if (entry.compressionMethod === 0) {
    return compressed
  }

  if (entry.compressionMethod === 8) {
    return inflateRawSync(compressed)
  }

  throw new Error("DOCX compression type is not supported.")
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function documentXmlToText(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}

export function extractDocxText(buffer: Buffer): string {
  const documentEntry = readZipEntries(buffer).find(
    (entry) => entry.name === "word/document.xml"
  )

  if (!documentEntry) {
    throw new Error("DOCX document text was not found.")
  }

  const xml = readZipEntry(buffer, documentEntry).toString("utf8")
  const text = documentXmlToText(xml)

  if (!text.trim()) {
    throw new Error("No readable CV text was found in this DOCX file.")
  }

  return text
}
