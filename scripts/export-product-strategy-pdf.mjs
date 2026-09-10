import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, process.argv[2] ?? "docs/product-core-investment-strategy.md");
const pdfPath = resolve(root, process.argv[3] ?? "docs/AutoTime-EU-Apply-Core-Product-Investment-Strategy.pdf");
const htmlPath = pdfPath.replace(/\.pdf$/i, ".print.html");

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const inline = (value) => escapeHtml(value)
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/`([^`]+)`/g, "<code>$1</code>");

const lines = (await readFile(sourcePath, "utf8")).split(/\r?\n/);
const body = [];
let paragraph = [];
let listType = null;
let inCode = false;
let code = [];

const flushParagraph = () => {
  if (paragraph.length) body.push(`<p>${inline(paragraph.join(" "))}</p>`);
  paragraph = [];
};
const closeList = () => {
  if (listType) body.push(`</${listType}>`);
  listType = null;
};

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  if (line.startsWith("```")) {
    flushParagraph(); closeList();
    if (inCode) {
      body.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      code = [];
    }
    inCode = !inCode;
    continue;
  }
  if (inCode) { code.push(line); continue; }
  if (/^\|.+\|$/.test(line) && /^\|[\s:|-]+\|$/.test(lines[index + 1] ?? "")) {
    flushParagraph(); closeList();
    const rows = [];
    while (/^\|.+\|$/.test(lines[index] ?? "")) {
      rows.push(lines[index].slice(1, -1).split("|").map((cell) => cell.trim()));
      index += 1;
    }
    index -= 1;
    const headers = rows[0];
    const dataRows = rows.slice(2);
    body.push(`<table><thead><tr>${headers.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${dataRows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    continue;
  }
  const heading = line.match(/^(#{1,4})\s+(.+)$/);
  if (heading) {
    flushParagraph(); closeList();
    const level = heading[1].length;
    body.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    continue;
  }
  const list = line.match(/^\s*(-|\d+\.)\s+(.+)$/);
  if (list) {
    flushParagraph();
    const nextType = list[1] === "-" ? "ul" : "ol";
    if (listType !== nextType) { closeList(); listType = nextType; body.push(`<${listType}>`); }
    body.push(`<li>${inline(list[2])}</li>`);
    continue;
  }
  if (line.startsWith("> ")) {
    flushParagraph(); closeList();
    body.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    continue;
  }
  if (/^---+$/.test(line)) {
    flushParagraph(); closeList(); body.push("<hr>"); continue;
  }
  if (!line.trim()) { flushParagraph(); closeList(); continue; }
  paragraph.push(line.trim().replace(/\s{2}$/, ""));
}
flushParagraph(); closeList();

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>AutoTime EU Apply — Core Product Investment Strategy</title>
<style>
@page { size: A4; margin: 16mm 15mm 18mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); color: #64748b; font: 9px Arial, sans-serif; } }
* { box-sizing: border-box; }
body { margin: 0; color: #172033; font: 10.2pt/1.48 Arial, Helvetica, sans-serif; }
h1 { color: #132b55; font-size: 24pt; line-height: 1.12; margin: 0 0 18pt; padding-bottom: 10pt; border-bottom: 3px solid #2563eb; }
h2 { color: #173d72; font-size: 15pt; margin: 20pt 0 7pt; break-after: avoid; }
h3 { color: #31557f; font-size: 11.5pt; margin: 13pt 0 5pt; break-after: avoid; }
h4 { color: #425f80; font-size: 10.4pt; margin: 10pt 0 4pt; break-after: avoid; }
p { margin: 0 0 7pt; }
ul, ol { margin: 3pt 0 9pt 18pt; padding: 0; }
li { margin: 2.5pt 0; }
blockquote { margin: 10pt 0; padding: 9pt 12pt; background: #eef5ff; border-left: 4px solid #2563eb; color: #173d72; font-size: 11pt; font-weight: 600; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0 13pt; font-size: 8.6pt; break-inside: auto; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { background: #173d72; color: white; text-align: left; }
th, td { border: 1px solid #cad5e4; padding: 5pt 6pt; vertical-align: top; }
tbody tr:nth-child(even) { background: #f6f8fb; }
pre { padding: 10pt; background: #172033; color: #e7edf6; border-radius: 4px; white-space: pre-wrap; font-size: 8.8pt; break-inside: avoid; }
code { font-family: Consolas, monospace; background: #edf1f7; padding: 1px 3px; border-radius: 3px; }
pre code { background: transparent; padding: 0; }
a { color: #1d4ed8; text-decoration: none; }
strong { color: #132b55; }
hr { border: 0; border-top: 1px solid #cad5e4; margin: 14pt 0; }
</style></head><body>${body.join("\n")}</body></html>`;

await writeFile(htmlPath, html, "utf8");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });
} finally {
  await browser.close();
}
console.log(pdfPath);
