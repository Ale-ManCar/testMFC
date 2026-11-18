import { redirect } from "next/navigation";
import { roleHome, sessionUser } from "@/server/auth";
import { login } from "@/server/auth-actions";
import { db } from "@/server/db";
import { ActionForm, Field } from "@/ui/forms";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await sessionUser();
  if (user) redirect(user.mustChange ? "/clave" : roleHome[user.role]);
  const institution = await db.institution.findUnique({ where: { id: 1 } });
  return <main className="auth">
    <aside><p className="kicker">{institution?.name ?? "Acceso institucional"}</p>
      <h1>Orientación<br />Vocacional</h1>
      <p className="mt-4">Evaluación de intereses para estudiantes de Décimo de Educación General Básica.</p>
    </aside>
    <section aria-labelledby="login-title">
      <h2 id="login-title">Iniciar sesión</h2>
      <p className="muted mb-5 mt-2">Si eres estudiante, ingresa con tu número de cédula o DNI y la contraseña asignada.</p>
      <ActionForm action={login} submit="Iniciar sesión">
        <Field label="Usuario" name="username" autoComplete="username" maxLength={40} required />
        <Field label="Contraseña" name="password" type="password" autoComplete="current-password" maxLength={128} required />
      </ActionForm>
    </section>
  </main>;
}
