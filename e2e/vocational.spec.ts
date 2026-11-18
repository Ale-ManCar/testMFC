import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import questions from "../prisma/questions.json";

const exampleInterested = new Set([1,3,4,8,10,12,13,15,17,19,21,23,25,26,27,28,30,32,33,34,35,37,39,40,41,42,44,48,50]);
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/");
  await page.getByLabel("Usuario", { exact: true }).fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

test("administración, estudiante, persistencia, DECE y PDF institucional", async ({ page, browser, baseURL }, testInfo) => {
  const suffix = randomUUID().slice(0, 7);
  const username = "prueba-" + suffix;
  const studentName = "Estudiante ficticio " + suffix;
  const code = "QA-" + suffix.toUpperCase();
  await signIn(page, "demo-admin", "Demo-Admin-Solo-Local!");
  await expect(page.getByRole("heading", { name: "Cuentas y matrículas" })).toBeVisible();
  await page.locator("#alta").getByLabel("Nombres y apellidos").fill(studentName);
  await page.locator("#alta").getByLabel("Cédula o DNI").fill(username);
  await page.locator("#alta").getByLabel("Código del estudiante").fill(code);
  await page.locator("#alta").getByLabel("Año lectivo").fill("2026-2027");
  await page.locator("#alta").getByLabel("Paralelo").fill("A");
  await page.getByRole("button", { name: "Registrar estudiante" }).click();
  const temp = page.getByRole("row").filter({ hasText: username }).locator("code");
  await expect(temp).toBeVisible();
  const temporary = await temp.innerText();

  const student = await browser.newPage({ baseURL });
  const dece = await browser.newPage({ baseURL });
  try {
    await signIn(student, username, temporary);
    await expect(student.getByRole("heading", { name: "Actualiza tu contraseña temporal" })).toBeVisible();
    await student.goto("/estudiante");
    await expect(student).toHaveURL(/\/clave$/);
    await student.getByLabel("Contraseña actual").fill(temporary);
    const changed = "Evaluacion-Ficticia-Segura-928!";
    await student.getByLabel("Nueva contraseña", { exact: true }).fill(changed);
    await student.getByLabel("Repite la nueva contraseña").fill(changed);
    await student.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(student.getByRole("heading", { name: "Hola, " + studentName })).toBeVisible();
    await student.getByRole("button", { name: "Iniciar evaluación" }).click();
    await expect(student.getByRole("heading", { name: "Pregunta 1 de 50", exact: true })).toBeVisible();
    const attemptPath = new URL(student.url()).pathname;
    const attemptId = attemptPath.split("/").at(-1)!;
    const reportPath = "/dece/informes/" + attemptId;
    expect((await student.request.get(reportPath + "/pdf")).status()).toBe(403);
    expect((await page.request.get(reportPath + "/pdf")).status()).toBe(403);

    await signIn(dece, "demo-dece", "Demo-Dece-Solo-Local!");
    await expect(dece.getByRole("heading", { name: "Seguimiento de evaluaciones" })).toBeVisible();
    expect((await dece.request.get(reportPath + "/pdf")).status()).toBe(404);
    await dece.goto(attemptPath);
    await expect(dece).toHaveURL(/\/dece$/);

    const responses: { prompt: string; area: string; response: string }[] = [];
    for (let position = 1; position <= 50; position++) {
      await expect(student.getByRole("heading", { name: "Pregunta " + position + " de 50", exact: true })).toBeVisible();
      const prompt = normalize(await student.locator("legend").innerText());
      const source = questions.find(question => question.prompt === prompt);
      expect(source, prompt).toBeDefined();
      const interested = exampleInterested.has(source!.number);
      const area = { D: "Diseño", S: "Software", T: "Turismo", C: "Ciencias", G: "Gestión" }[source!.specialtyId as "D" | "S" | "T" | "C" | "G"];
      responses.push({ prompt, area, response: interested ? "Me interesa" : "No me interesa" });
      if (position === 1) {
        await student.setViewportSize({ width: 390, height: 844 });
        expect(await student.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
        await student.screenshot({ path: testInfo.outputPath("evaluacion-movil.png") });
      }
      await student.getByRole("radio", { name: interested ? "Me interesa" : "No me interesa", exact: true }).check();
      await expect(student.getByText(position + " de 50 respondidas", { exact: true })).toBeVisible();
      if (position === 4) {
        await student.getByRole("button", { name: "Siguiente" }).click();
        await expect(student.getByRole("heading", { name: "Pregunta 5 de 50", exact: true })).toBeVisible();
        await student.reload();
        await expect(student.getByRole("heading", { name: "Pregunta 5 de 50", exact: true })).toBeVisible();
        await expect(student.getByText("4 de 50 respondidas", { exact: true })).toBeVisible();
      } else if (position < 50) {
        await student.getByRole("button", { name: "Siguiente" }).click();
      }
    }
    await student.getByRole("button", { name: "Finalizar evaluación" }).click();
    await student.getByRole("button", { name: "Enviar respuestas" }).click();
    await expect(student.getByRole("heading", { name: "Evaluación completada" })).toBeVisible();
    await student.reload();
    await expect(student.getByRole("heading", { name: "Evaluación completada" })).toBeVisible();
    await student.goto("/dece");
    await expect(student).toHaveURL(/\/estudiante$/);
    await student.goto("/admin");
    await expect(student).toHaveURL(/\/estudiante$/);

    await dece.getByLabel("Nombre, cédula o código").fill(username);
    await dece.getByRole("button", { name: "Buscar" }).click();
    const row = dece.getByRole("row").filter({ hasText: code });
    await expect(row.getByText("Finalizada")).toBeVisible();
    await dece.screenshot({ path: testInfo.outputPath("dece-escritorio.png") });
    await row.getByRole("link", { name: "Ver resultados" }).click();
    await expect(dece.getByRole("heading", { name: "Informe individual" })).toBeVisible();
    await expect(dece.getByTitle("Visor del informe individual PDF")).toBeVisible();
    const downloadEvent = dece.waitForEvent("download");
    await dece.getByRole("link", { name: "Descargar PDF" }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe("informe-vocacional.pdf");
    await download.saveAs(testInfo.outputPath("informe-vocacional.pdf"));
    const response = await dece.request.get(reportPath + "/pdf");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    const bytes = await response.body();
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(4);
    for (const pdfPage of pdf.getPages()) {
      expect(Math.abs(pdfPage.getWidth() - 595.28)).toBeLessThan(1);
      expect(Math.abs(pdfPage.getHeight() - 841.89)).toBeLessThan(1);
    }
    const pdfTask = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
    const extracted = await pdfTask.promise;
    try {
      const all = [];
      for (let n = 1; n <= 4; n++) {
        const content = await (await extracted.getPage(n)).getTextContent();
        const text = normalize(content.items.map(item => "str" in item ? item.str : "").join(" "));
        expect(text).toContain("Página " + n + " de 4");
        expect(text).toContain("DOCUMENTO CONFIDENCIAL");
        all.push(text);
      }
      expect(all[0]).toContain(studentName);
      expect(all[0]).toContain(code);
      expect(all[0]).toContain("29 / 50");
      expect(all[0]).toContain("21 / 50");
      expect(all[0]).toContain("Diseño Gráfico / Desarrollo de Software");
      const text = all.join(" ");
      const limits = [[0, 5], [5, 23], [23, 41], [41, 50]];
      for (const [index, response] of responses.entries()) {
        const section = limits.findIndex(([first, last]) => index >= first && index < last);
        const number = String(index + 1).padStart(2, "0");
        expect(all[section]).toContain(number + " " + response.prompt + " " + response.area + " " + response.response);
      }
      const answerRows = text.match(/(?:Diseño|Software|Turismo|Ciencias|Gestión) (?:Me interesa|No me interesa)/g);
      expect(answerRows).toHaveLength(50);
    } finally {
      await pdfTask.destroy();
    }
    expect((await student.request.get(reportPath + "/pdf")).status()).toBe(403);
    expect((await page.request.get(reportPath + "/pdf")).status()).toBe(403);
    await expect(dece.getByRole("button", { name: "Imprimir PDF" })).toBeEnabled();
    await dece.getByRole("link", { name: "Cerrar informe" }).click();
    await expect(dece).toHaveURL(/\/dece$/);
  } finally {
    await student.close();
    await dece.close();
  }
});
