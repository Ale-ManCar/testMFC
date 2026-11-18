"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { readRoster, type RosterFilter } from "@/server/dece-actions";
import { dateInEcuador } from "@/server/date";
import { Field } from "@/ui/forms";

export function Roster({ initial, data, years, parallels }: {
  initial: RosterFilter; data: Awaited<ReturnType<typeof readRoster>>; years: string[]; parallels: string[];
}) {
  const [filters, setFilters] = useState(initial);
  const [roster, setRoster] = useState(data);
  const [pending, transition] = useTransition();
  const [error, setError] = useState("");
  function refresh(next: RosterFilter) {
    setError("");
    transition(async () => {
      try {
        setRoster(await readRoster(next));
        setFilters(next);
      } catch {
        setError("No se pudo actualizar el listado. Intenta nuevamente.");
      }
    });
  }
  return <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-5" aria-label="Resumen del año lectivo">
      {[["Estudiantes registrados", roster.total], ["Sin iniciar", roster.fresh], ["En progreso", roster.started], ["Finalizadas", roster.done]].map(([label, count]) =>
        <div className="stat" key={label}><strong>{count}</strong>{label}</div>)}
    </div>
    <section className="section">
      <h2>Estudiantes</h2>
      <form className="mt-4" onSubmit={event => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        refresh({ year: String(values.get("year")), parallel: String(values.get("parallel")),
          status: String(values.get("status")) as RosterFilter["status"], query: String(values.get("query")), page: 1 });
      }}>
        <fieldset disabled={pending} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end">
          <Field label="Nombre, cédula o código" name="query" type="search" maxLength={100} />
          <label className="field">Año lectivo<select name="year" defaultValue={initial.year}>
            {years.length ? years.map(y => <option key={y}>{y}</option>) : <option value="">Sin registros</option>}
          </select></label>
          <label className="field">Paralelo<select name="parallel"><option value="">Todos</option>
            {parallels.map(p => <option key={p}>{p}</option>)}
          </select></label>
          <label className="field">Estado<select name="status"><option value="all">Todos</option>
            <option value="new">Sin iniciar</option><option value="started">En progreso</option><option value="done">Finalizada</option>
          </select></label>
          <button className="btn" type="submit">Buscar</button>
        </fieldset>
      </form>
      <p role="status" className="muted my-3">{pending ? "Consultando…" : roster.filtered === 1 ? "1 registro" : roster.filtered + " registros"}</p>
      {error && <p role="alert" className="error">{error}</p>}
      {!roster.rows.length ? <p className="py-3">No hay estudiantes para los filtros seleccionados.</p> : <div className="scroll">
        <table aria-label="Estudiantes y estado de evaluación"><thead><tr>
          <th>Código</th><th>Estudiante</th><th>Paralelo</th><th>Estado</th><th>Fecha de finalización</th><th>Acción</th>
        </tr></thead><tbody>{roster.rows.map(row => <tr key={row.id}>
          <td>{row.student.code}</td><td>{row.student.user.name}</td><td>{row.parallelId}</td>
          <td>{row.attempt?.completedAt ? "Finalizada" : row.attempt ? "En progreso" : "Sin iniciar"}</td>
          <td>{row.attempt?.completedAt ? dateInEcuador.format(row.attempt.completedAt) : "—"}</td>
          <td>{row.attempt?.completedAt && <Link className="btn alt whitespace-nowrap" href={"/dece/informes/" + row.attempt.id}>Ver resultados</Link>}</td>
        </tr>)}</tbody></table>
      </div>}
      {roster.filtered > 25 && <div className="actions mt-4">
        <button className="btn alt" disabled={pending || filters.page === 1} onClick={() => refresh({ ...filters, page: filters.page - 1 })}>Anterior</button>
        <span>Página {filters.page} de {Math.ceil(roster.filtered / 25)}</span>
        <button className="btn alt" disabled={pending || filters.page * 25 >= roster.filtered} onClick={() => refresh({ ...filters, page: filters.page + 1 })}>Siguiente</button>
      </div>}
    </section>
  </>;
}
