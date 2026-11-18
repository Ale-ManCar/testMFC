import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { Shell } from "@/ui/shell";
import { Viewer } from "./viewer";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("DECE");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id, completedAt: { not: null }, result: { isNot: null } },
    select: { result: { select: { studentName: true } } },
  });
  if (!attempt?.result) notFound();
  return <Shell section="Consejería estudiantil" home="/dece">
    <p className="kicker">Informe confidencial</p><h1>Informe individual</h1>
    <p className="mt-2 mb-4">{attempt.result.studentName}</p>
    <Viewer url={"/dece/informes/" + id + "/pdf"} close={<Link className="btn alt" href="/dece">Cerrar informe</Link>} />
  </Shell>;
}
