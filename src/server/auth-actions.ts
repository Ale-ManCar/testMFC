"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { allowLogin, issueSession, revokeSession, roleHome, sessionUser } from "./auth";
import { db } from "./db";
import type { FormState } from "./form-state";
import { dummyPasswordHash, hashPassword, verifyPassword } from "./password";

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/),
  password: z.string().min(1).max(128),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const input = loginSchema.safeParse(Object.fromEntries(form));
  const invalid = { error: "Verifica tu usuario y contraseña." };
  if (!input.success) return invalid;
  const { username, password } = input.data;
  if (!await allowLogin(username)) return { error: "Demasiados intentos. Vuelve a intentarlo en 15 minutos." };
  const user = await db.user.findUnique({ where: { username } });
  const valid = await verifyPassword(password, user?.passwordHash ?? dummyPasswordHash);
  if (!valid || !user?.active) return invalid;
  await revokeSession();
  if (!await issueSession(user.id, user.passwordHash)) return invalid;
  redirect(user.mustChange ? "/clave" : roleHome[user.role]);
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await sessionUser();
  if (!user) redirect("/");
  if (user.passwordLocked) return { error: "La contraseña de esta cuenta es fija." };
  const input = z.object({
    password: z.string().min(14).max(128), confirm: z.string().max(128), current: z.string().min(1).max(128),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Escribe tu contraseña actual y una nueva de al menos 14 caracteres." };
  const { password, confirm, current } = input.data;
  if (password !== confirm) return { error: "Las contraseñas nuevas no coinciden." };
  if (password === current || password.toLowerCase().includes(user.username)) return { error: "Usa una contraseña diferente y sin tu usuario." };
  if (!await allowLogin(user.username)) return { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." };
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!await verifyPassword(current, record.passwordHash)) return { error: "La contraseña actual no es correcta." };
  const passwordHash = await hashPassword(password);
  const updated = await db.$transaction(async tx => {
    const { count } = await tx.user.updateMany({ where: { id: user.id, active: true, passwordLocked: false, passwordHash: record.passwordHash }, data: { passwordHash, mustChange: false } });
    if (count) {
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.create({ data: { actorId: user.id, event: "PASSWORD_CHANGED", target: user.id } });
    }
    return count;
  });
  if (!updated) return { error: "Tu cuenta cambió. Inicia sesión nuevamente." };
  if (!await issueSession(user.id, passwordHash)) redirect("/");
  redirect(roleHome[user.role]);
}

export async function logout() {
  await revokeSession();
  redirect("/");
}
