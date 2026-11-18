import Link from "next/link";
import { requireRole } from "@/server/auth";
import { importStudents, registerStaff, registerStudent } from "@/server/admin-actions";
import { db } from "@/server/db";
import { ActionForm, Field } from "@/ui/forms";
import { Shell } from "@/ui/shell";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  await requireRole("ADMIN");
  const query = await searchParams;
  const page = /^\d{1,4}$/.test(query.pagina ?? "") ? Math.max(1, Number(query.pagina)) : 1;
  const where = { role: { in: ["STUDENT" as const, "DECE" as const] } };
  const [users, count, latestYear] = await Promise.all([
    db.user.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * 25, take: 25,
      select: { id: true, name: true, active: true, role: true, student: { select: { code: true } } } }),
    db.user.count({ where }), db.academicYear.findFirst({ orderBy: { id: "desc" } }),
  ]);
  return <Shell section="Administración" home="/admin">
    <p className="kicker">Administración técnica</p><h1>Cuentas y matrículas</h1>
    <nav className="actions mt-4" aria-label="Configuración de administración">
      <Link className="btn alt" href="/admin/configuracion">Institución y convocatorias</Link>
      <a href="#alta">Registrar estudiante</a><a href="#importacion">Importar CSV</a>
    </nav>
    <section className="section">
      <h2>Cuentas registradas</h2><p className="muted mt-2 mb-4">{count} cuentas de estudiantes y DECE</p>
      {!users.length ? <p>No hay cuentas en esta página.</p> : <div className="scroll"><table>
        <thead><tr><th>Nombre</th><th>Código</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>{users.map(user => <tr key={user.id}>
          <td>{user.name}</td><td>{user.student?.code ?? "—"}</td><td>{user.role === "STUDENT" ? "Estudiante" : "DECE"}</td>
          <td><span className={"status-tag " + (user.active ? "done" : "inactive")}>{user.active ? "Activa" : "Inactiva"}</span></td><td><Link className="btn alt" href={"/admin/cuentas/" + user.id}>Editar<span className="sr-only"> cuenta de {user.name}</span></Link></td>
        </tr>)}</tbody>
      </table></div>}
      {(page > 1 || page * 25 < count) && <div className="actions mt-4">
        {page > 1 && <Link className="btn alt" href={"/admin?pagina=" + (page - 1)}>Anterior</Link>}
        <span>Página {page}</span>
        {page * 25 < count && <Link className="btn alt" href={"/admin?pagina=" + (page + 1)}>Siguiente</Link>}
      </div>}
    </section>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
      <section className="section" id="alta">
        <h2 className="mb-4">Registrar estudiante</h2>
        <ActionForm action={registerStudent} submit="Registrar estudiante">
          <Field label="Nombres y apellidos" name="name" maxLength={140} required />
          <Field label="Cédula o DNI" name="username" maxLength={24} required autoComplete="off" />
          <Field label="Código del estudiante" name="code" maxLength={32} required />
          <p className="muted">Curso · Décimo de EGB</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Año lectivo" name="year" defaultValue={latestYear?.id} placeholder="2026-2027" maxLength={9} required />
            <Field label="Paralelo" name="parallel" placeholder="A" maxLength={1} required />
          </div>
        </ActionForm>
      </section>
      <div className="min-w-0">
        <section className="section" id="importacion">
          <h2>Importar estudiantes</h2>
          <p className="muted my-3">Archivo CSV UTF-8 con hasta 100 registros. Usa los encabezados <code className="break-all">cedula,nombre,codigo,anio,paralelo</code>.</p>
          <ActionForm action={importStudents} submit="Validar e importar">
            <Field label="Archivo CSV" type="file" name="file" accept=".csv,text/csv" required />
          </ActionForm>
        </section>
        <section className="section">
          <h2 className="mb-4">Registrar personal DECE</h2>
          <ActionForm action={registerStaff} submit="Crear cuenta DECE">
            <Field label="Nombre completo" name="name" maxLength={140} required />
            <Field label="Usuario" name="username" maxLength={40} pattern="[A-Za-z0-9\-]{3,40}" required />
          </ActionForm>
        </section>
      </div>
    </div>
  </Shell>;
}
