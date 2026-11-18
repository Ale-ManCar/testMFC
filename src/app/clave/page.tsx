import { redirect } from "next/navigation";
import { roleHome, sessionUser } from "@/server/auth";
import { changePassword, logout } from "@/server/auth-actions";
import { ActionForm, Field } from "@/ui/forms";

export default async function PasswordPage() {
  const user = await sessionUser();
  if (!user) redirect("/");
  return <main className="workbook">
    <p className="kicker">Seguridad de la cuenta</p>
    <h1>{user.mustChange ? "Actualiza tu contraseña temporal" : "Cambia tu contraseña"}</h1>
    <section className="section">
      <p className="mb-4">Tu nueva contraseña debe tener al menos 14 caracteres.</p>
      <ActionForm action={changePassword} submit="Guardar contraseña">
        <Field label="Contraseña actual" name="current" type="password" autoComplete="current-password" maxLength={128} required />
        <Field label="Nueva contraseña" name="password" type="password" autoComplete="new-password" minLength={14} maxLength={128} required />
        <Field label="Repite la nueva contraseña" name="confirm" type="password" autoComplete="new-password" minLength={14} maxLength={128} required />
      </ActionForm>
    </section>
    {user.mustChange ? <form action={logout}><button className="btn alt">Cerrar sesión</button></form> : <a href={roleHome[user.role]}>Volver al panel</a>}
  </main>;
}
