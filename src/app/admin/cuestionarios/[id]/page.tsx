import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { Shell } from "@/ui/shell";
import { Editor } from "./editor";

export default async function QuestionnaireVersionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const version = await db.questionnaireVersion.findUnique({
    where: { id }, include: { questions: { orderBy: { number: "asc" }, include: { specialty: true } } },
  });
  if (!version) notFound();
  return <Shell section="Administración" home="/admin">
    <Link href="/admin/configuracion">Volver a configuración</Link>
    <p className="kicker mt-4">{version.publishedAt ? "Versión publicada" : "Borrador editable"}</p>
    <h1>{version.label}</h1>
    <section className="section">
      {version.publishedAt ? <ol className="list-decimal pl-5 space-y-3">
        {version.questions.map(question => <li key={question.id}>{question.prompt} <span className="muted">· {question.specialty.name}</span></li>)}
      </ol> : <Editor id={id} initial={version.questions.map(({ id, number, prompt, specialtyId }) => ({ id, number, prompt, specialtyId }))} />}
    </section>
  </Shell>;
}
