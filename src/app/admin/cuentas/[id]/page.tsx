import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { editAccount } from "@/server/admin-actions";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm, Field } from "@/ui/forms";
import { Shell } from "@/ui/shell";

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await db.user.findFirst({
    where: { id, role: { in: ["STUDENT", "DECE"] } },
    select: { username: true, name: true, active: true, student: {
      select: { code: true, enrollment: { orderBy: { yearId: "desc" }, select: { yearId: true, parallelId: true } } },
    } },
  });
  if (!user) notFound();
  const enrollment = user.student?.enrollment[0];
  return <Shell section="Administración" home="/admin"><div className="workbook">
    <Link href="/admin">Volver a cuentas</Link><h1 className="mt-3">Editar cuenta</h1>
    <section className="section">
      <ActionForm action={editAccount}>
        <input type="hidden" name="id" value={id} />
        <Field label="Nombre completo" name="name" defaultValue={user.name} maxLength={140} required />
        <Field label={user.student ? "Cédula o DNI" : "Usuario"} name="username" defaultValue={user.username} maxLength={40} required />
        {user.student && <>
          <Field label="Código" name="code" defaultValue={user.student.code} maxLength={32} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Año lectivo" name="year" defaultValue={enrollment?.yearId} maxLength={9} required />
            <Field label="Paralelo" name="parallel" defaultValue={enrollment?.parallelId} maxLength={1} required />
          </div>
          <p className="muted">Cambiar el año registra o actualiza la matrícula de ese periodo. El historial se conserva.</p>
          <p className="muted">Matrículas: {user.student.enrollment.map(item => item.yearId + " · Décimo " + item.parallelId).join(", ") || "Sin matrícula"}</p>
        </>}
        <label className="flex gap-2"><input type="checkbox" name="active" defaultChecked={user.active} /> Cuenta activa</label>
        <div className="actions">
          <button className="btn" name="operation" value="save" type="submit">Guardar cambios</button>
        </div>
      </ActionForm>
    </section>
    <section className="section">
      <h2>Restablecer contraseña</h2>
      <p className="muted my-3">Genera una contraseña temporal y cierra las sesiones de esta cuenta.</p>
      <ActionForm action={editAccount} submit="Restablecer contraseña">
        <input type="hidden" name="id" value={id} /><input type="hidden" name="name" value={user.name} />
        <input type="hidden" name="username" value={user.username} /><input type="hidden" name="operation" value="reset" />
      </ActionForm>
    </section>
  </div></Shell>;
}
