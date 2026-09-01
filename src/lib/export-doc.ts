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

/** Escapa texto para HTML. */
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Exporta para um ficheiro .html independente (HTML + CSS embutido),
 * pronto a abrir e editar no VS Code ou no navegador.
 */
export function exportHtml(title: string, sections: DocSection[]) {
  if (!sections.length) throw new Error("O documento ainda não tem conteúdo para exportar.");

  const body = sections
    .map((section) => {
      const clean = sanitizeMath(section.body).replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/`/g, "");
      const paragraphs = clean
        .split("\n")
        .filter((p) => p.trim())
        .map((p) => `      <p>${esc(p)}</p>`)
        .join("\n");
      return `    <section>\n      <h2>${esc(section.title)}</h2>\n${paragraphs}\n    </section>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    :root { --ink: #16202c; --muted: #5b6b7c; --line: #dde5ee; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 48px 20px; background: #f4f7fb; color: var(--ink);
      font-family: Georgia, "Times New Roman", serif; line-height: 1.7;
    }
    main { max-width: 820px; margin: 0 auto; background: #fff; padding: 56px 64px;
      border: 1px solid var(--line); border-radius: 10px; }
    h1 { font-size: 2rem; text-align: center; margin: 0 0 8px; }
    .meta { text-align: center; color: var(--muted); font-size: .9rem; margin-bottom: 40px; }
    h2 { font-size: 1.25rem; margin: 36px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
    p { margin: 0 0 12px; text-align: justify; }
    @media print { body { background: #fff; padding: 0; } main { border: 0; padding: 0; } }
  </style>
</head>
<body>
  <main>
    <h1>${esc(title)}</h1>
    <p class="meta">Way Estudantes AI</p>
${body}
  </main>
</body>
</html>
`;

  try {
    saveAs(new Blob([html], { type: "text/html;charset=utf-8" }), `${title.slice(0, 60) || "documento"}.html`);
  } catch {
    throw new Error("O navegador bloqueou a transferência do ficheiro HTML. Permita downloads e tente novamente.");
  }
}
