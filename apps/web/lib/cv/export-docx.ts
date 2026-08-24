// Builds a minimal .docx (Office Open XML) file from a CVData document and
// triggers a browser download, without depending on a full docx-generation
// library. A .docx is just a zip of XML parts, so this hand-assembles the
// small subset of WordprocessingML parts (document.xml, styles.xml, and
// their relationship/content-type manifests) needed to render a simple CV,
// then zips them with JSZip.
import JSZip from "jszip";
import type { CVData } from "./types";

/** Escapes the five XML special characters so arbitrary CV text is safe to embed in WordprocessingML. */
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Renders one WordprocessingML `<w:p>` paragraph for `text`, or an empty string
 * if `text` is blank (so callers can push blank-input paragraphs unconditionally
 * without producing stray empty paragraphs in the output document).
 */
function paragraph(
  text: string,
  options: { style?: string; bold?: boolean; after?: number } = {},
): string {
  if (!text.trim()) return "";
  const style = options.style
    ? `<w:pStyle w:val="${options.style}"/>`
    : "";
  const after = `<w:spacing w:after="${options.after ?? 100}"/>`;
  const bold = options.bold ? "<w:b/>" : "";
  return `<w:p><w:pPr>${style}${after}</w:pPr><w:r><w:rPr>${bold}</w:rPr><w:t xml:space="preserve">${escapeXml(text.trim())}</w:t></w:r></w:p>`;
}

/** Strips characters illegal in Windows/macOS filenames from `value`, falling back to "CV" if empty. */
function safeFileName(value: string): string {
  const name = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-");
  return name || "CV";
}

/**
 * Builds a .docx from `cv` and immediately triggers a browser file download
 * (client-side only: creates an object URL and a synthetic anchor click).
 * Empty sections (no summary, no experience, etc.) are omitted entirely
 * rather than rendered as empty headings.
 */
export async function downloadCvDocx(cv: CVData): Promise<void> {
  const contact = [
    cv.contact.email,
    cv.contact.phone,
    cv.contact.location,
    cv.contact.linkedin,
  ].filter(Boolean).join(" | ");
  const sections: string[] = [
    paragraph(cv.contact.name, { style: "Title", after: 80 }),
    paragraph(contact, { style: "Contact", after: 180 }),
  ];

  if (cv.summary.trim()) {
    sections.push(paragraph("Summary", { style: "Heading1" }));
    sections.push(paragraph(cv.summary, { after: 180 }));
  }
  if (cv.experience.length) {
    sections.push(paragraph("Experience", { style: "Heading1" }));
    for (const item of cv.experience) {
      const heading = [item.title, item.company].filter(Boolean).join(" · ");
      sections.push(paragraph(heading, { style: "Heading2", after: 40 }));
      sections.push(paragraph(item.dates, { style: "Meta", after: 80 }));
      for (const bullet of item.bullets) {
        sections.push(paragraph(`• ${bullet}`, { style: "Bullet", after: 40 }));
      }
    }
  }
  if (cv.education.length) {
    sections.push(paragraph("Education", { style: "Heading1" }));
    for (const item of cv.education) {
      sections.push(paragraph([item.degree, item.institution].filter(Boolean).join(" · "), { style: "Heading2", after: 40 }));
      sections.push(paragraph(item.dates, { style: "Meta", after: 100 }));
    }
  }
  if (cv.skills.length) {
    sections.push(paragraph("Skills", { style: "Heading1" }));
    sections.push(paragraph(cv.skills.join(", "), { after: 100 }));
  }

  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  zip.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.folder("word")?.file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${sections.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1100" w:bottom="1000" w:left="1100" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  zip.folder("word/_rels")?.file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.folder("word")?.file("styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Contact"><w:name w:val="Contact"/><w:rPr><w:sz w:val="19"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:rPr><w:i/><w:color w:val="555555"/><w:sz w:val="19"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr></w:style></w:styles>`);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(cv.contact.name)}-CV.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
