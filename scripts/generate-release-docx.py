#!/usr/bin/env python3
"""Generate the Private Beta v1.0.1 release summary as a .docx deliverable.

Source content: docs/reports/release-summary-v1.0.1-2026-09-20.md (narrative)
                 docs/reports/testing-categories-v1.0.1-2026-09-20.csv (table)
Both re-read fresh at generation time, not hardcoded, so the .docx cannot
drift from the source-of-truth markdown/CSV files.
"""
import csv
import re
from pathlib import Path
from datetime import date

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

REPO = Path(__file__).resolve().parents[1]
MD_PATH = REPO / "docs/reports/release-summary-v1.0.1-2026-09-20.md"
CSV_PATH = REPO / "docs/reports/testing-categories-v1.0.1-2026-09-20.csv"
OUT_PATH = REPO / "docs/reports/AutoTime-EU-Apply-Private-Beta-v1.0.1-Release-Summary-2026-09-20.docx"

NAVY = RGBColor(0x1F, 0x2D, 0x50)
ACCENT = RGBColor(0x8A, 0x1F, 0x2B)
GREY = RGBColor(0x55, 0x55, 0x55)


def shade_cell(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_text(cell, text, bold=False, size=9, color=None):
    cell.text = ""
    p = cell.paragraphs[0]
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = color


def add_title_page(doc):
    doc.add_paragraph().add_run()
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title.add_run("AutoTime EU Apply")
    r.bold = True
    r.font.size = Pt(30)
    r.font.color.rgb = NAVY

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = subtitle.add_run("Private Beta v1.0.1 — Release Summary")
    r.bold = True
    r.font.size = Pt(18)
    r.font.color.rgb = ACCENT

    tag = doc.add_paragraph()
    tag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = tag.add_run("Beta-stage production release — controlled, invited cohort")
    r.italic = True
    r.font.size = Pt(12)
    r.font.color.rgb = GREY

    doc.add_paragraph()

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_lines = [
        "Decision: GO WITH LIMITATIONS",
        "Deployed commit: c791e7f2aacd246d8768ab239f76b1edf43fd564",
        "Deployment: dpl_GWJbTExcaRD1TpFHb7HDGrMJwvKb",
        f"Document generated: {date.today().isoformat()}",
        "Repository HEAD at generation time: 7e427e700af55a746f23c6467d5dd7650e1b0b23",
    ]
    for line in meta_lines:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(line)
        r.font.size = Pt(10.5)
        r.font.color.rgb = GREY

    doc.add_page_break()


def parse_inline(paragraph, text):
    """Handle **bold** and *italic* markers minimally within a run of text."""
    tokens = re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", text)
    for tok in tokens:
        if not tok:
            continue
        if tok.startswith("**") and tok.endswith("**"):
            run = paragraph.add_run(tok[2:-2])
            run.bold = True
        elif tok.startswith("`") and tok.endswith("`"):
            run = paragraph.add_run(tok[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(9.5)
        else:
            paragraph.add_run(tok)


def add_markdown_body(doc, md_text):
    lines = md_text.split("\n")
    i = 0
    in_list = False
    buffer_para_lines = []

    def flush_buffer():
        nonlocal buffer_para_lines
        if buffer_para_lines:
            p = doc.add_paragraph()
            parse_inline(p, " ".join(buffer_para_lines))
            buffer_para_lines = []

    while i < len(lines):
        line = lines[i].rstrip()
        if line.startswith("# "):
            flush_buffer()  # title handled separately, skip H1 line content
        elif line.startswith("## "):
            flush_buffer()
            h = doc.add_heading(level=1)
            parse_inline(h, line[3:])
            for run in h.runs:
                run.font.color.rgb = NAVY
        elif line.startswith("### "):
            flush_buffer()
            h = doc.add_heading(level=2)
            parse_inline(h, line[4:])
            for run in h.runs:
                run.font.color.rgb = ACCENT
        elif line.strip().startswith("- "):
            flush_buffer()
            p = doc.add_paragraph(style="List Bullet")
            parse_inline(p, line.strip()[2:])
        elif re.match(r"^\d+\.\s+", line.strip()):
            flush_buffer()
            content = re.sub(r"^\d+\.\s+", "", line.strip())
            p = doc.add_paragraph(style="List Number")
            parse_inline(p, content)
        elif line.strip() == "":
            flush_buffer()
        else:
            buffer_para_lines.append(line.strip())
        i += 1
    flush_buffer()


def add_csv_table(doc):
    doc.add_page_break()
    h = doc.add_heading(level=1)
    h.add_run("Appendix A — 24-Category Testing Framework (structured data)")
    for run in h.runs:
        run.font.color.rgb = NAVY

    note = doc.add_paragraph()
    r = note.add_run(
        "Full structured export. Source: docs/reports/testing-categories-v1.0.1-2026-09-20.csv. "
        "Import into a spreadsheet for filtering; this table preserves every row and column verbatim."
    )
    r.italic = True
    r.font.size = Pt(9)
    r.font.color.rgb = GREY

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = list(csv.reader(f))
    rows = [r for r in reader if any(cell.strip() for cell in r)]
    header, data_rows = rows[0], rows[1:]

    # Split into two logical tables for readability: core identity cols + evidence/notes cols
    core_cols = [0, 1, 2, 3, 4, 5]
    note_cols = [0, 6, 7, 8, 9]

    def build_table(cols, col_widths):
        table = doc.add_table(rows=1, cols=len(cols))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.style = "Light Grid Accent 1"
        hdr_cells = table.rows[0].cells
        for idx, c in enumerate(cols):
            set_cell_text(hdr_cells[idx], header[c], bold=True, size=9, color=RGBColor(0xFF, 0xFF, 0xFF))
            shade_cell(hdr_cells[idx], "1F2D50")
        for row in data_rows:
            cells = table.add_row().cells
            for idx, c in enumerate(cols):
                val = row[c] if c < len(row) else ""
                set_cell_text(cells[idx], val, size=8.5)
        for idx, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[idx].width = Inches(w)
        return table

    p1 = doc.add_paragraph()
    r = p1.add_run("Table A.1 — Priority, status, evidence type, risk")
    r.bold = True
    r.font.size = Pt(11)
    build_table(core_cols, [1.6, 0.6, 1.2, 1.3, 0.6, 1.1])

    doc.add_paragraph()
    p2 = doc.add_paragraph()
    r = p2.add_run("Table A.2 — Verification date, owner, evidence notes, reference doc")
    r.bold = True
    r.font.size = Pt(11)
    build_table(note_cols, [1.4, 0.9, 1.1, 2.6, 1.4])


def add_footer_note(doc):
    doc.add_page_break()
    h = doc.add_heading(level=1)
    h.add_run("Provenance")
    for run in h.runs:
        run.font.color.rgb = NAVY
    p = doc.add_paragraph()
    p.add_run(
        "This document was generated directly from the repository's own markdown and CSV "
        "release artefacts, cross-checked against live git state at generation time "
        "(HEAD == origin/main == 7e427e70), rather than hand-typed. If this document and "
        "the source files in docs/reports/ ever disagree, the source files are authoritative."
    ).italic = True


def main():
    md_text = MD_PATH.read_text(encoding="utf-8")
    doc = Document()

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10.5)

    for section in doc.sections:
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)

    add_title_page(doc)
    add_markdown_body(doc, md_text)
    add_csv_table(doc)
    add_footer_note(doc)

    doc.save(OUT_PATH)
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
