import { chromium } from "playwright";
import { reportHtml, type Report } from "./report-template";

let activeReports = 0;

export async function generatePdf(data: Report) {
  if (activeReports >= 4) throw new Error("Capacidad de generación de informes alcanzada.");
  activeReports++;
  try {
    const browser = await chromium.launch({ timeout: 15000, chromiumSandbox: process.env.PDF_CHROMIUM_SANDBOX === "1" });
    try {
      const page = await browser.newPage({ javaScriptEnabled: false, offline: true });
      await page.emulateMedia({ media: "print" });
      await page.setContent(reportHtml(data), { timeout: 10000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const article of document.querySelectorAll("article")) {
          const table = article.querySelector<HTMLElement>(".answers")!;
          const footer = article.querySelector<HTMLElement>("footer")!;
          const bottom = article.getBoundingClientRect().bottom - parseFloat(getComputedStyle(article).paddingBottom);
          const closing = article.querySelector<HTMLElement>(".closing");
          const closingHeight = closing ? closing.getBoundingClientRect().height + parseFloat(getComputedStyle(closing).marginTop) : 0;
          const limit = bottom - footer.getBoundingClientRect().height - closingHeight - 12;
          for (const density of [1, 0.94, 0.88, 0.82, 0.76, 0.70, 0.64]) {
            table.style.setProperty("--density", String(density));
            if (table.getBoundingClientRect().bottom <= limit) break;
          }
          if (table.getBoundingClientRect().bottom > limit) throw new Error("Las respuestas exceden el área de impresión.");
        }
      });
      return await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true });
    } finally {
      await browser.close();
    }
  } finally {
    activeReports--;
  }
}
