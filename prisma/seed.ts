import "dotenv/config";
import { db } from "../src/server/db";
import { hashPassword } from "../src/server/password";
import { specialties, validateQuestions } from "../src/domain/assessment";
import questions from "./questions.json";

async function seed() {
  const demo = process.env.DEMO_DATA === "1";
  if (demo && !["localhost", "127.0.0.1"].includes(new URL(process.env.APP_ORIGIN ?? "http://localhost:3000").hostname)) {
    throw new Error("DEMO_DATA requiere un origen local.");
  }
  const username = process.env.BOOTSTRAP_ADMIN?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD;
  if (!demo && (!username || !password || password.length < 14 || password === username)) {
    throw new Error("Configura BOOTSTRAP_ADMIN y BOOTSTRAP_PASSWORD (14 caracteres o más).");
  }
  validateQuestions(questions);
  await db.$transaction(async tx => {
    await tx.institution.upsert({ where: { id: 1 }, update: {}, create: { name: "Unidad Educativa Miguel Febres Cordero" } });
    for (const specialty of specialties) {
      await tx.specialty.upsert({ where: { id: specialty.id }, update: {}, create: specialty });
    }
    const version = await tx.questionnaireVersion.upsert({
      where: { label: "Cuestionario institucional 1" }, update: {},
      create: { label: "Cuestionario institucional 1", publishedAt: new Date(), questions: { createMany: { data: questions } } },
    });
    const admin = { username: demo ? "demo-admin" : username!, passwordHash: await hashPassword(demo ? "Demo-Admin-Solo-Local!" : password!) };
    await tx.user.upsert({ where: { username: admin.username }, update: {}, create: { ...admin, name: "Administración técnica", role: "ADMIN", mustChange: !demo } });
    if (demo) {
      const yearId = "2026-2027";
      await tx.academicYear.upsert({ where: { id: yearId }, create: { id: yearId }, update: {} });
      await tx.parallel.upsert({ where: { id: "A" }, create: { id: "A" }, update: {} });
      await tx.campaign.upsert({ where: { yearId }, create: { yearId, versionId: version.id }, update: {} });
      await tx.user.upsert({ where: { username: "demo-dece" }, update: {}, create: {
        username: "demo-dece", name: "Consejería de prueba", passwordHash: await hashPassword("Demo-Dece-Solo-Local!"), role: "DECE", mustChange: false,
      } });
      await tx.user.upsert({ where: { username: "demo-001" }, update: {}, create: {
        username: "demo-001", name: "Estudiante Ficticio", passwordHash: await hashPassword("Demo-Estudiante-Temporal!"), role: "STUDENT",
        student: { create: { code: "EJ-001", enrollment: { create: { yearId, parallelId: "A" } } } },
      } });
    }
  });
}

seed().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Error de inicialización."); process.exitCode = 1; })
  .finally(() => db.$disconnect());
