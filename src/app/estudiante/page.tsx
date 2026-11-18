import Link from "next/link";
import { enrollmentsFor } from "@/server/assessment";
import { begin } from "@/server/assessment-actions";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { Shell } from "@/ui/shell";

export default async function StudentPage({ searchParams }: { searchParams: Promise<{ noDisponible?: string }> }) {
  const user = await requireRole("STUDENT");
  const [enrollments, { noDisponible }, institution] = await Promise.all([
    enrollmentsFor(user.id), searchParams, db.institution.findUnique({ where: { id: 1 }, select: { retentionPolicy: true, accessPolicy: true } }),
  ]);
  return <Shell section="Estudiantes" home="/estudiante"><div className="workbook">
    <p className="kicker">Décimo de EGB</p>
    <h1>Hola, {user.name}</h1>
    <section className="section">
      <h2>Antes de empezar</h2>
      <p className="mt-3">Leerás 50 enunciados. Elige «Me interesa» o «No me interesa» según tus propios intereses.</p>
      <p className="mt-2">Puedes volver a preguntas anteriores y retomar la evaluación más tarde. Tus respuestas se guardan al elegir una opción.</p>
      <p className="mt-2">La evaluación registra tus intereses declarados. No mide aptitudes ni determina una especialidad obligatoria.</p>
    </section>
    {noDisponible && <p className="error" role="alert">La convocatoria ya no está disponible.</p>}
    {enrollments.length === 0 && <p>No tienes matrículas registradas. Comunícate con la institución.</p>}
    {enrollments.map(e => <section className="section" key={e.id}>
      <h2>Evaluación {e.yearId}</h2><p className="muted mt-2 mb-4">{e.grade} {e.parallelId}</p>
      {e.attempt ? <Link className="btn" href={"/estudiante/" + e.attempt.id}>
        {e.attempt.completedAt ? "Ver confirmación" : "Continuar (" + e.attempt._count.order + " de 50 respondidas)"}
      </Link> : e.year.campaign?.open ? <form action={begin}>
        <input type="hidden" name="enrollmentId" value={e.id} /><button className="btn" type="submit">Iniciar evaluación</button>
      </form> : <p>Por ahora no hay una convocatoria abierta.</p>}
    </section>)}
    {(institution?.accessPolicy || institution?.retentionPolicy) && <details className="section">
      <summary>Uso y conservación de tus datos</summary>
      {institution.accessPolicy && <p className="mt-2 whitespace-pre-line">{institution.accessPolicy}</p>}
      {institution.retentionPolicy && <p className="mt-2 whitespace-pre-line">{institution.retentionPolicy}</p>}
    </details>}
  </div></Shell>;
}
