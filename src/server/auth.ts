import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const cookieName = "vocacional_session";
const sessionAge = 8 * 60 * 60;

export function appOrigin() {
  const origin = new URL(process.env.APP_ORIGIN ?? "http://localhost:3000");
  if (origin.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(origin.hostname)) {
    throw new Error("APP_ORIGIN debe usar HTTPS fuera del entorno local.");
  }
  return origin;
}

export async function issueSession(userId: string, passwordHash: string) {
  const token = randomBytes(32).toString("base64url");
  const issued = await db.$transaction(async tx => {
    const [account] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User" WHERE id = ${userId}::uuid AND active AND "passwordHash" = ${passwordHash} FOR UPDATE`;
    if (!account) return false;
    await tx.session.create({ data: { digest: digest(token), userId, expires: new Date(Date.now() + sessionAge * 1000) } });
    return true;
  });
  if (!issued) return false;
  (await cookies()).set(cookieName, token, {
    httpOnly: true, sameSite: "lax", secure: appOrigin().protocol === "https:", path: "/", maxAge: sessionAge,
  });
  return true;
}

export async function revokeSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { digest: digest(token) } });
  jar.delete(cookieName);
}

export async function sessionUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[\w-]{43}$/.test(token)) return null;
  const session = await db.session.findUnique({ where: { digest: digest(token) }, select: {
    expires: true, user: { select: { id: true, username: true, name: true, active: true, mustChange: true, role: true } },
  } });
  return session && session.expires > new Date() && session.user.active ? session.user : null;
}

export const roleHome = { STUDENT: "/estudiante", DECE: "/dece", ADMIN: "/admin" } as const;

export async function requireRole(role: Role) {
  const user = await sessionUser();
  if (!user) redirect("/");
  if (user.mustChange) redirect("/clave");
  if (user.role !== role) redirect(roleHome[user.role]);
  return user;
}

export async function allowLogin(username: string) {
  const key = digest("usuario:" + username);
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  const [entry] = await db.$queryRaw<{ hits: number }[]>`
    INSERT INTO "LoginLimit" ("key", "hits", "expires") VALUES (${key}, 1, ${expires})
    ON CONFLICT ("key") DO UPDATE SET
    "hits" = CASE WHEN "LoginLimit"."expires" <= NOW() THEN 1 ELSE LEAST("LoginLimit"."hits" + 1, 11) END,
    "expires" = CASE WHEN "LoginLimit"."expires" <= NOW() THEN EXCLUDED."expires" ELSE "LoginLimit"."expires" END
    RETURNING "hits"`;
  return entry.hits <= 10;
}
