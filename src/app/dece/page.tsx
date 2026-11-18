import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { readRoster } from "@/server/dece-actions";
import { Shell } from "@/ui/shell";
import { Roster } from "./roster";

export default async function DecePage() {
  await requireRole("DECE");
  const [years, parallels] = await Promise.all([
    db.academicYear.findMany({ orderBy: { id: "desc" } }), db.parallel.findMany({ orderBy: { id: "asc" } }),
  ]);
  const initial = { year: years[0]?.id ?? "", parallel: "", status: "all", query: "", page: 1 } as const;
  const data = await readRoster(initial);
  return <Shell section="Consejería estudiantil" home="/dece">
    <p className="kicker">Departamento de Consejería Estudiantil</p>
    <h1>Seguimiento de evaluaciones</h1>
    <Roster initial={initial} data={data} years={years.map(y => y.id)} parallels={parallels.map(p => p.id)} />
  </Shell>;
}
