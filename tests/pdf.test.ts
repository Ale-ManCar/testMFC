import { PDFDocument } from "pdf-lib";
import { expect, it } from "vitest";
import { calculate } from "@/domain/assessment";
import { generatePdf } from "@/server/pdf";
import questions from "../prisma/questions.json";

const pdfTest = process.env.RUN_PDF_TESTS === "1" ? it : it.skip;

pdfTest("ajusta preguntas extensas y conserva cuatro páginas A4", async () => {
  const data = calculate(questions.map(q => ({ ...q, interested: false })));
  const pdf = await generatePdf({
    ...data, institutionName: "Institución Educativa de Prueba ".repeat(4),
    studentName: "Estudiante con apellidos compuestos y un nombre institucional extenso ".repeat(2),
    studentCode: "PRUEBA-CODIGO-ESTUDIANTE-MAXIMO",
    parallelLabel: "Décimo A", completedAt: new Date("2026-11-11T18:00:00Z"), year: "2026-2027",
    items: questions.map(q => ({
      position: q.number, prompt: "¿Me interesa participar en actividades que permitan investigar, organizar y comunicar ideas con distintos equipos de trabajo, tomando en cuenta las necesidades de todas las personas y los desafíos de mi comunidad?".padEnd(220, "W"),
      area: "Ciencias", interested: false,
    })),
  });
  const document = await PDFDocument.load(pdf);
  expect(document.getPageCount()).toBe(4);
  expect(document.getPages().every(page => Math.abs(page.getHeight() - 841.89) < 1)).toBe(true);
});
