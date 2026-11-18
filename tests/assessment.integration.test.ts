import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, expect, it } from "vitest";
import { finishAttempt, saveAnswer, startAttempt, studentAttempt } from "@/server/assessment";
import { db } from "@/server/db";

const integration = process.env.DATABASE_URL ? it : it.skip;

integration("serializa inicios y respuestas, rechaza accesos ajenos y conserva el cierre en PostgreSQL", async () => {
  const suffix = randomUUID().slice(0, 8);
  const campaign = await db.campaign.findUniqueOrThrow({ where: { yearId: "2026-2027" } });
  const user = await db.user.create({ data: {
    username: "integracion-" + suffix, name: "Estudiante de integración", role: "STUDENT", passwordHash: "cuenta-sin-credenciales", active: false,
    student: { create: { code: "IT-" + suffix, enrollment: { create: { yearId: campaign.yearId, parallelId: "A" } } } },
  }, include: { student: { include: { enrollment: true } } } });
  const enrollment = user.student!.enrollment[0];
  const [attempt, duplicate] = await Promise.all([startAttempt(user.id, enrollment.id), startAttempt(user.id, enrollment.id)]);
  expect(duplicate).toBe(attempt);
  await expect(finishAttempt(user.id, attempt)).rejects.toThrow("50 preguntas");
  const stranger = randomUUID();
  await expect(studentAttempt(stranger, attempt)).resolves.toBeNull();
  await expect(saveAnswer(stranger, attempt, 1, true)).rejects.toThrow("disponible");
  await Promise.all([saveAnswer(user.id, attempt, 1, true), saveAnswer(user.id, attempt, 1, true)]);
  expect(await db.answer.count({ where: { attemptId: attempt } })).toBe(1);
  const freshConnection = new PrismaClient();
  try {
    expect(await freshConnection.answer.findUnique({ where: { attemptId_position: { attemptId: attempt, position: 1 } } })).toMatchObject({ interested: true });
    for (let position = 2; position <= 50; position++) await saveAnswer(user.id, attempt, position, position % 2 === 1);
    await Promise.all([finishAttempt(user.id, attempt), finishAttempt(user.id, attempt)]);
    expect(await freshConnection.assessmentResult.findUnique({ where: { attemptId: attempt } }))
      .toMatchObject({ studentName: user.name, interested: 25, uninterested: 25, answered: 50 });
    expect(await freshConnection.answer.count({ where: { attemptId: attempt } })).toBe(50);
    await expect(saveAnswer(user.id, attempt, 1, false)).rejects.toThrow("enviada");
  } finally {
    await freshConnection.$disconnect();
    await db.$transaction([
      db.assessmentResult.deleteMany({ where: { attemptId: attempt } }),
      db.answer.deleteMany({ where: { attemptId: attempt } }),
      db.assessmentQuestionOrder.deleteMany({ where: { attemptId: attempt } }),
      db.assessmentAttempt.deleteMany({ where: { id: attempt } }),
      db.enrollment.deleteMany({ where: { id: enrollment.id } }),
      db.studentProfile.delete({ where: { userId: user.id } }),
      db.user.delete({ where: { id: user.id } }),
    ]);
  }
});

afterAll(() => db.$disconnect());
