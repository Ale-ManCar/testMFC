"use server";

import { parse } from "csv-parse/sync";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { specialties, validateQuestions } from "@/domain/assessment";
import { requireRole } from "./auth";
import { db } from "./db";
import type { FormState } from "./form-state";
import { hashPassword, temporaryPassword } from "./password";

const name = z.string().trim().min(3).max(140);
const username = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/);
const document = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{5,24}$/);
const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,32}$/);
const year = z.string().regex(/^20\d{2}-20\d{2}$/).refine(value => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1);
const parallel = z.string().trim().toUpperCase().regex(/^[A-Z]$/);
const student = z.object({ username: document, name, code, year, parallel });
const staff = z.object({ username, name });
const invalid = { error: "Revisa los campos. Usa un año lectivo como 2026-2027 y un paralelo de una letra." };

async function run(task: (tx: Prisma.TransactionClient, actorId: string) => Promise<FormState>): Promise<FormState> {
  const actor = await requireRole("ADMIN");
  try {
    const result = await db.$transaction(tx => task(tx, actor.id), { timeout: 25000 });
    revalidatePath("/admin");
    revalidatePath("/admin/configuracion");
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { error: "El usuario, código o nombre de versión ya está registrado." };
      if (error.code === "P2025") return { error: "El registro ya no está disponible." };
    }
    return { error: "No se pudo completar el cambio. Vuelve a intentarlo." };
  }
}

function audit(tx: Prisma.TransactionClient, actorId: string, event: string, target: string) {
  return tx.auditLog.create({ data: { actorId, event, target } });
}

async function enroll(tx: Prisma.TransactionClient, studentId: string, yearId: string, parallelId: string) {
  await tx.academicYear.upsert({ where: { id: yearId }, update: {}, create: { id: yearId } });
  await tx.parallel.upsert({ where: { id: parallelId }, update: {}, create: { id: parallelId } });
  await tx.enrollment.upsert({
    where: { studentId_yearId: { studentId, yearId } },
    update: { parallelId }, create: { studentId, yearId, parallelId },
  });
}

async function createStudent(tx: Prisma.TransactionClient, data: z.infer<typeof student>, actorId: string, credentials: {password: string; passwordHash: string}) {
  const user = await tx.user.create({ data: {
    username: data.username, name: data.name, passwordHash: credentials.passwordHash, role: "STUDENT", student: { create: { code: data.code } },
  } });
  await enroll(tx, user.id, data.year, data.parallel);
  await audit(tx, actorId, "STUDENT_CREATED", user.id);
  return { username: user.username, password: credentials.password };
}

async function generateCredentials() {
  const password = temporaryPassword();
  return { password, passwordHash: await hashPassword(password) };
}

export async function registerStudent(_: FormState, form: FormData) {
  await requireRole("ADMIN");
  const input = student.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid;
  const credentials = await generateCredentials();
  return run(async (tx, actorId) => ({
    message: "Estudiante registrado. Entrega la contraseña temporal por un canal privado.",
    credentials: [await createStudent(tx, input.data, actorId, credentials)],
  }));
}

export async function importStudents(_: FormState, form: FormData) {
  await requireRole("ADMIN");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 160000) return { error: "Selecciona un CSV de hasta 160 KB." };
  let rows: unknown[];
  try {
    rows = parse(await file.text(), {
      bom: true, skip_empty_lines: true, trim: true, max_record_size: 2000,
      columns(header: string[]) {
        const expected = ["cedula", "nombre", "codigo", "anio", "paralelo"];
        if (header.length !== expected.length || expected.some((key, i) => key !== header[i])) throw new Error("Encabezado inválido");
        return ["username", "name", "code", "year", "parallel"];
      },
    });
  } catch {
    return { error: "CSV inválido. Usa los encabezados cedula,nombre,codigo,anio,paralelo." };
  }
  if (rows.length < 1 || rows.length > 100) return { error: "Incluye de 1 a 100 estudiantes por archivo." };
  const input = z.array(student).safeParse(rows);
  if (!input.success) return { error: "Revisa el registro " + (Number(input.error.issues[0]?.path[0]) + 1) + " del CSV." };
  for (const key of ["username", "code"] as const) {
    if (new Set(input.data.map(row => row[key])).size !== rows.length) return { error: "El archivo contiene cédulas o códigos repetidos." };
  }
  const secrets: Awaited<ReturnType<typeof generateCredentials>>[] = [];
  for (const _row of input.data) secrets.push(await generateCredentials());
  return run(async (tx, actorId) => {
    const credentials = [];
    for (const [index, row] of input.data.entries()) credentials.push(await createStudent(tx, row, actorId, secrets[index]));
    return { message: "Estudiantes importados. Entrega las claves temporales por canales privados.", credentials };
  });
}

export async function registerStaff(_: FormState, form: FormData) {
  await requireRole("ADMIN");
  const input = staff.safeParse(Object.fromEntries(form));
  if (!input.success) return invalid;
  const { password, passwordHash } = await generateCredentials();
  return run(async (tx, actorId) => {
    const user = await tx.user.create({ data: { ...input.data, passwordHash, role: "DECE" } });
    await audit(tx, actorId, "DECE_CREATED", user.id);
    return { message: "Cuenta DECE creada.", credentials: [{ username: user.username, password }] };
  });
}

export async function editAccount(_: FormState, form: FormData) {
  const input = z.object({ id: z.uuid(), ...staff.shape }).safeParse(Object.fromEntries(form));
  if (!input.success) return invalid;
  const operation = form.get("operation");
  if (operation !== "save" && operation !== "reset") return invalid;
  const studentInput = student.safeParse(Object.fromEntries(form));
  return run(async (tx, actorId) => {
    const user = await tx.user.findFirstOrThrow({ where: { id: input.data.id, role: { in: ["STUDENT", "DECE"] } } });
    if (operation === "reset") {
      if (user.passwordLocked) return { error: "Esta cuenta tiene una contraseña fija." };
      const { password, passwordHash } = await generateCredentials();
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChange: true } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await audit(tx, actorId, "PASSWORD_RESET", user.id);
      return { message: "Contraseña restablecida. Las sesiones anteriores se cerraron.", credentials: [{ username: user.username, password }] };
    }
    if (user.role === "STUDENT" && !studentInput.success) return invalid;
    if (user.passwordLocked && input.data.username !== user.username) return { error: "La cédula de esta cuenta requiere una actualización institucional de sus credenciales fijas." };
    const active = form.get("active") === "on";
    await tx.user.update({ where: { id: user.id }, data: { name: input.data.name, username: input.data.username, active } });
    if (!active) await tx.session.deleteMany({ where: { userId: user.id } });
    if (user.role === "STUDENT" && studentInput.success) {
      const data = studentInput.data;
      await tx.studentProfile.update({ where: { userId: user.id }, data: { code: data.code } });
      await enroll(tx, user.id, data.year, data.parallel);
    }
    await audit(tx, actorId, "ACCOUNT_UPDATED", user.id);
    return { message: "Cuenta actualizada." };
  });
}

export async function saveInstitution(_: FormState, form: FormData) {
  const input = z.object({ name, retentionPolicy: z.string().trim().max(4000), accessPolicy: z.string().trim().max(4000) }).safeParse(Object.fromEntries(form));
  if (!input.success) return invalid;
  return run(async (tx, actorId) => {
    await tx.institution.upsert({ where: { id: 1 }, update: input.data, create: input.data });
    await audit(tx, actorId, "INSTITUTION_UPDATED", "1");
    return { message: "Configuración guardada." };
  });
}

export async function createDraft(_: FormState, form: FormData) {
  const input = z.object({ versionId: z.uuid(), label: name }).safeParse(Object.fromEntries(form));
  if (!input.success) return invalid;
  return run(async (tx, actorId) => {
    const source = await tx.question.findMany({ where: { versionId: input.data.versionId },
      select: { number: true, specialtyId: true, prompt: true, active: true } });
    if (!source.length) return invalid;
    const version = await tx.questionnaireVersion.create({
      data: { label: input.data.label, questions: { createMany: { data: source } } },
    });
    await audit(tx, actorId, "QUESTIONNAIRE_DRAFTED", version.id);
    return { message: "Borrador creado. Ábrelo para editar sus preguntas." };
  });
}

export async function updateVersion(_: FormState, form: FormData) {
  const id = z.uuid().safeParse(form.get("id"));
  const operation = form.get("operation");
  if (!id.success || !["save", "publish"].includes(String(operation))) return invalid;
  const keys = specialties.map(s => s.id);
  const rows = Array.from({ length: 50 }, (_, i) => ({
    number: i + 1, specialtyId: form.get("area" + (i + 1)), prompt: form.get("prompt" + (i + 1)),
  }));
  const parsed = z.array(z.object({ number: z.number(), specialtyId: z.string().refine(key => keys.includes(key)), prompt: z.string().trim().min(4).max(220) })).safeParse(rows);
  if (!parsed.success) return { error: "Completa los 50 enunciados con un máximo de 220 caracteres." };
  if (operation === "publish") {
    try { validateQuestions(parsed.data); } catch {
      return { error: "Distribuye 10 preguntas por especialidad antes de publicar." };
    }
  }
  return run(async (tx, actorId) => {
    const claimed = await tx.questionnaireVersion.updateMany({ where: { id: id.data, publishedAt: null },
      data: { publishedAt: operation === "publish" ? new Date() : null } });
    if (!claimed.count) return { error: "Esta versión ya fue publicada." };
    for (const row of parsed.data) {
      await tx.question.update({ where: { versionId_number: { versionId: id.data, number: row.number } },
        data: { specialtyId: row.specialtyId, prompt: row.prompt } });
    }
    await audit(tx, actorId, operation === "publish" ? "QUESTIONNAIRE_PUBLISHED" : "QUESTIONNAIRE_UPDATED", id.data);
    revalidatePath("/admin/cuestionarios/" + id.data);
    return { message: operation === "publish" ? "Versión publicada." : "Borrador guardado." };
  });
}

export async function manageCampaign(_: FormState, form: FormData) {
  const input = z.object({ year, versionId: z.uuid().optional() }).safeParse(Object.fromEntries(form));
  if (!input.success) return invalid;
  return run(async (tx, actorId) => {
    const { year: yearId, versionId } = input.data;
    if (versionId) {
      const version = await tx.questionnaireVersion.findFirst({ where: { id: versionId, publishedAt: { not: null } },
        include: { questions: { where: { active: true } } } });
      if (!version) return invalid;
      validateQuestions(version.questions);
      await tx.academicYear.upsert({ where: { id: yearId }, update: {}, create: { id: yearId } });
      await tx.campaign.create({ data: { yearId, versionId } });
    } else {
      await tx.campaign.update({ where: { yearId }, data: { open: form.get("open") === "true" } });
    }
    await audit(tx, actorId, "CAMPAIGN_UPDATED", yearId);
    return { message: "Convocatoria actualizada." };
  });
}
