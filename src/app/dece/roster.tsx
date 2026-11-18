"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readRoster, type RosterFilter } from "@/server/dece-actions";
import { dateInEcuador } from "@/server/date";
import { Field } from "@/ui/forms";

export function Roster({ initial, data, years, parallels }: {
  initial: RosterFilter; data: Awaited<ReturnType<typeof readRoster>>; years: string[]; parallels: string[];
}) {
  const [filters, setFilters] = useState(initial);
  const [roster, setRoster] = useState(data);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(initial);

  useEffect(() => {
    let ignore = false;
    setPending(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const result = await readRoster(filters);
        if (ignore) return;
        setRoster(result);
        setAppliedFilters(filters);
      } catch {
        if (!ignore) setError("No se pudo actualizar el listado. Intenta nuevamente.");
      } finally {
        if (!ignore) setPending(false);
      }
    }, 300);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [filters]);

  function changeFilters(change: Partial<RosterFilter>) {
    setFilters(current => ({ ...current, ...change, page: 1 }));
  }
  return <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-5" aria-label="Resumen del año lectivo">
      {[["Estudiantes registrados", roster.total], ["Sin iniciar", roster.fresh], ["En progreso", roster.started], ["Finalizadas", roster.done]].map(([label, count]) =>
        <div className="stat" key={label}><strong>{count}</strong>{label}</div>)}
    </div>
    <section className="section" aria-busy={pending}>
      <h2>Estudiantes</h2>
      <form className="filter-form mt-4" onSubmit={event => {
        event.preventDefault();
        setFilters(current => ({ ...current }));
      }}>
        <fieldset className="roster-filter-grid">
          <Field label="Nombre, cédula o código" name="query" type="search" maxLength={100} value={filters.query} onChange={event => changeFilters({ query: event.target.value })} />
          <label className="field">Año lectivo<select name="year" value={filters.year} onChange={event => changeFilters({ year: event.target.value })}>
            {years.length ? years.map(y => <option key={y}>{y}</option>) : <option value="">Sin registros</option>}
          </select></label>
          <label className="field">Paralelo<select name="parallel" value={filters.parallel} onChange={event => changeFilters({ parallel: event.target.value })}><option value="">Todos</option>
            {parallels.map(p => <option key={p}>{p}</option>)}
          </select></label>
          <label className="field">Estado<select name="status" value={filters.status} onChange={event => changeFilters({ status: event.target.value as RosterFilter["status"] })}><option value="all">Todos</option>
            <option value="new">Sin iniciar</option><option value="started">En progreso</option><option value="done">Finalizada</option>
          </select></label>
          <button className="btn" type="submit">Buscar</button>
        </fieldset>
      </form>
      <p role="status" className="muted my-3">{pending ? "Consultando…" : roster.filtered === 1 ? "1 registro" : roster.filtered + " registros"}</p>
      {error && <p role="alert" className="error">{error}</p>}
      {!roster.rows.length ? <div className="empty-state"><strong>No se encontraron estudiantes</strong><p>Prueba con otro nombre, cédula, paralelo o estado.</p></div> : <div className="scroll">
        <table aria-label="Estudiantes y estado de evaluación"><thead><tr>
          <th>Código</th><th>Estudiante</th><th>Paralelo</th><th>Estado</th><th>Fecha de finalización</th><th>Acción</th>
        </tr></thead><tbody>{roster.rows.map(row => <tr key={row.id}>
          <td>{row.student.code}</td><td>{row.student.user.name}</td><td>{row.parallelId}</td>
          <td><span className={"status-tag " + (row.attempt?.completedAt ? "done" : row.attempt ? "started" : "")}>{row.attempt?.completedAt ? "Finalizada" : row.attempt ? "En progreso" : "Sin iniciar"}</span></td>
          <td>{row.attempt?.completedAt ? dateInEcuador.format(row.attempt.completedAt) : "—"}</td>
          <td>{row.attempt?.completedAt && <Link className="btn alt whitespace-nowrap" href={"/dece/informes/" + row.attempt.id}>Ver resultados</Link>}</td>
        </tr>)}</tbody></table>
      </div>}
      {roster.filtered > 25 && <div className="actions table-pagination">
        <button className="btn alt" disabled={pending || appliedFilters.page === 1} onClick={() => setFilters({ ...appliedFilters, page: appliedFilters.page - 1 })}>Anterior</button>
        <span>Página {appliedFilters.page} de {Math.ceil(roster.filtered / 25)}</span>
        <button className="btn alt" disabled={pending || appliedFilters.page * 25 >= roster.filtered} onClick={() => setFilters({ ...appliedFilters, page: appliedFilters.page + 1 })}>Siguiente</button>
      </div>}
    </section>
  </>;
}
