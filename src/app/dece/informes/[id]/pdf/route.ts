import { z } from "zod";
import { db } from "@/server/db";
import { sessionUser } from "@/server/auth";
import { generatePdf } from "@/server/pdf";
import type { Score } from "@/domain/assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user || user.mustChange || user.role !== "DECE") return new Response("Acceso restringido.", { status: 403, headers: privateHeaders });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Informe no disponible.", { status: 404, headers: privateHeaders });
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id, completedAt: { not: null } },
    include: { result: true, order: { orderBy: { position: "asc" },
      include: { answer: true, question: { include: { specialty: true } } } } },
  });
  if (!attempt?.completedAt || !attempt.result || attempt.order.length !== 50 || attempt.order.some(item => !item.answer)) {
    return new Response("Informe no disponible.", { status: 404, headers: privateHeaders });
  }
  const download = new URL(request.url).searchParams.get("descargar") === "1";
  try {
    const data = await generatePdf({
      ...attempt.result, scores: attempt.result.scores as Score[], completedAt: attempt.completedAt, year: attempt.campaignId,
      items: attempt.order.map(({ position, question, answer }) => ({
        position, prompt: question.prompt, area: question.specialty.shortName, interested: answer!.interested,
      })),
    });
    await db.auditLog.create({ data: { actorId: user.id, event: download ? "REPORT_DOWNLOADED" : "REPORT_VIEWED", target: id } });
    return new Response(new Uint8Array(data), { headers: {
      ...privateHeaders, "Content-Type": "application/pdf",
      "Content-Disposition": (download ? "attachment" : "inline") + '; filename="informe-vocacional.pdf"',
    } });
  } catch (error) {
    // Infrastructure diagnostics only. Never log the report data or student identity.
    const message = error instanceof Error ? error.message : "Error desconocido";
    const category = message.includes("Executable doesn't exist") ? "BROWSER_NOT_INSTALLED"
      : /shared libraries|Host system is missing dependencies/i.test(message) ? "BROWSER_DEPENDENCIES_MISSING"
      : /timeout/i.test(message) ? "PDF_TIMEOUT"
      : message.includes("área de impresión") ? "PDF_LAYOUT_OVERFLOW" : "PDF_GENERATION_FAILED";
    console.error(JSON.stringify({ event: "REPORT_GENERATION_ERROR", category }));
    return new Response("No se pudo generar el informe. Vuelve a intentarlo.", { status: 503, headers: privateHeaders });
  }
}
