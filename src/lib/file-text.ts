/** Extracção de texto de ficheiros no navegador (PDF e Word). */

export type ExtractedFile = {
  name: string;
  kind: "imagem" | "pdf" | "word";
  text?: string;
  dataUrl?: string;
  mediaType: string;
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.readAsDataURL(file);
  });
}

async function pdfToText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const max = Math.min(doc.numPages, 30);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return pages.join("\n\n");
}

async function wordToText(file: File) {
  const mammoth = (await import("mammoth/mammoth.browser")) as unknown as {
    extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}


export async function extractFile(file: File): Promise<ExtractedFile> {
  const type = file.type || "";
  if (type.startsWith("image/")) {
    return { name: file.name, kind: "imagem", dataUrl: await readAsDataUrl(file), mediaType: type };
  }
  if (type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return { name: file.name, kind: "pdf", text: await pdfToText(file), mediaType: "application/pdf" };
  }
  if (file.name.toLowerCase().endsWith(".docx") || type.includes("word")) {
    return {
      name: file.name,
      kind: "word",
      text: await wordToText(file),
      mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  throw new Error("Formato não suportado. Use imagem, PDF ou Word (.docx).");
}

export const ACCEPTED_FILES = "image/*,application/pdf,.docx";
