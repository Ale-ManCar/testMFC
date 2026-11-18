import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { studentAttempt } from "@/server/assessment";
import { requireRole } from "@/server/auth";
import { Shell } from "@/ui/shell";
import { Questionnaire } from "./questionnaire";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("STUDENT");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const attempt = await studentAttempt(user.id, id);
  if (!attempt) notFound();
  return <Shell section="Estudiantes" home="/estudiante"><div className="workbook">
    {attempt.completedAt ? <section className="section">
      <p className="kicker">Envío confirmado</p><h1>Evaluación completada</h1>
      <p className="mt-3 mb-5">Tus 50 respuestas quedaron registradas. El DECE puede consultar tu informe.</p>
      <Link href="/estudiante" className="btn">Volver a mi panel</Link>
    </section> : <Questionnaire id={attempt.id} questions={attempt.order} cursor={attempt.cursor} />}
  </div></Shell>;
}
