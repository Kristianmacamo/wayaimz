import { saveAs } from "file-saver";
import { sanitizeMath } from "@/lib/math-text";

export type DocSection = { title: string; body: string };

/** Exporta para PDF (A4, texto simples e legível). */
export async function exportPdf(title: string, sections: DocSection[]) {
  if (!sections.length) throw new Error("O documento ainda não tem conteúdo para exportar.");
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const width = 210 - margin * 2;
  let y = margin;

  const addPageIfNeeded = (needed = 8) => {
    if (y + needed > 297 - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(doc.splitTextToSize(title, width), margin, y);
  y += 14;

  for (const section of sections) {
    addPageIfNeeded(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(section.title, margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const clean = sanitizeMath(section.body).replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/`/g, "");
    for (const paragraph of clean.split("\n")) {
      const lines = doc.splitTextToSize(paragraph || " ", width) as string[];
      for (const line of lines) {
        addPageIfNeeded();
        doc.text(line, margin, y);
        y += 6;
      }
    }
    y += 6;
  }

  try {
    doc.save(`${title.slice(0, 60) || "documento"}.pdf`);
  } catch {
    throw new Error("O navegador bloqueou a transferência do PDF. Permita downloads e tente novamente.");
  }
}

/** Exporta para Word (.docx). */
export async function exportWord(title: string, sections: DocSection[]) {
  if (!sections.length) throw new Error("O documento ainda não tem conteúdo para exportar.");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: title, bold: true, size: 36, font: "Arial" })],
    }),
  ];

  for (const section of sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 160 },
        children: [new TextRun({ text: section.title, bold: true, size: 28, font: "Arial" })],
      }),
    );
    const clean = sanitizeMath(section.body).replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/`/g, "");
    for (const paragraph of clean.split("\n")) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: paragraph, size: 24, font: "Arial" })],
        }),
      );
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 24 } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  try {
    saveAs(blob, `${title.slice(0, 60) || "documento"}.docx`);
  } catch {
    throw new Error("O navegador bloqueou a transferência do ficheiro Word. Permita downloads e tente novamente.");
  }
}

