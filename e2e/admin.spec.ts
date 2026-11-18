import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("importa CSV, edita y desactiva una cuenta con un diseño sin desbordamiento", async ({ page }, info) => {
  const unique = randomUUID().slice(0, 7);
  const username = "csv-" + unique;
  const name = "Estudiante de Importación " + unique;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Usuario", { exact: true }).fill("demo-admin");
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo-Admin-Solo-Local!");
  await page.screenshot({ path: info.outputPath("acceso-movil.png") });
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Cuentas y matrículas" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const importSection = page.locator("#importacion");
  const file = importSection.getByLabel("Archivo CSV");
  await file.setInputFiles({ name: "invalido.csv", mimeType: "text/csv", buffer: Buffer.from("a,b\n1,2") });
  await importSection.getByRole("button", { name: "Validar e importar" }).click();
  await expect(importSection.getByRole("alert")).toContainText("CSV inválido");
  await file.setInputFiles({ name: "estudiantes.csv", mimeType: "text/csv", buffer: Buffer.from(
    "cedula,nombre,codigo,anio,paralelo\n" + username + "," + name + ",CSV-" + unique + ",2026-2027,B\n",
  ) });
  await importSection.getByRole("button", { name: "Validar e importar" }).click();
  await expect(importSection.getByRole("status")).toContainText("Estudiantes importados");
  const temp = await importSection.getByRole("row").filter({ hasText: username }).locator("code").innerText();
  await importSection.getByRole("button", { name: "Ocultar credenciales" }).click();
  await expect(importSection.getByText(temp)).toHaveCount(0);
  await page.getByRole("link", { name: "Editar cuenta de " + name }).click();
  await expect(page.getByLabel("Paralelo")).toHaveValue("B");
  await page.getByLabel("Cuenta activa").uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status")).toContainText("Cuenta actualizada");
  await page.reload();
  await expect(page.getByLabel("Cuenta activa")).not.toBeChecked();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.getByLabel("Usuario", { exact: true }).fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(temp);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("region", { name: "Iniciar sesión" }).getByRole("alert")).toContainText("Verifica tu usuario y contraseña");
});
