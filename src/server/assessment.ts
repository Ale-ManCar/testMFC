import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { calculate, validateQuestions } from "@/domain/assessment";
import { db } from "./db";

export class AssessmentError extends Error {}

export async function enrollmentsFor(userId: string) {
  return db.enrollment.findMany({
    where: { studentId: userId }, orderBy: { yearId: "desc" },
    include: { attempt: { select: { id: true, completedAt: true, _count: { select: { order: { where: { answer: { isNot: null } } } } } } },
      year: { include: { campaign: { select: { open: true } } } } },
  });
}

export async function startAttempt(userId: string, enrollmentId: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE id = ${enrollmentId}::uuid AND "studentId" = ${userId}::uuid FOR UPDATE`;
    await tx.$queryRaw`
      SELECT c."yearId" FROM "Campaign" c JOIN "Enrollment" e ON c."yearId" = e."yearId"
      WHERE e.id = ${enrollmentId}::uuid AND e."studentId" = ${userId}::uuid FOR SHARE OF c`;
    const enrollment = await tx.enrollment.findFirst({
      where: { id: enrollmentId, studentId: userId },
      include: { attempt: true, year: { include: { campaign: { include: { version: { include: { questions: { where: { active: true } } } } } } } } },
    });
    if (enrollment?.attempt) return enrollment.attempt.id;
    const campaign = enrollment?.year.campaign;
    if (!enrollment || !campaign?.open || !campaign.version.publishedAt || campaign.attemptLimit !== 1) {
      throw new AssessmentError("La convocatoria no está disponible.");
    }
    const questions = campaign.version.questions;
    validateQuestions(questions);
    for (let i = questions.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    const attempt = await tx.assessmentAttempt.create({ data: {
      enrollmentId, campaignId: campaign.yearId,
      order: { createMany: { data: questions.map((q, index) => ({ questionId: q.id, position: index + 1 })) } },
    } });
    return attempt.id;
  });
}

export async function studentAttempt(userId: string, attemptId: string) {
  return db.assessmentAttempt.findFirst({
    where: { id: attemptId, enrollment: { studentId: userId } },
    select: { id: true, completedAt: true, cursor: true, order: {
      orderBy: { position: "asc" },
      select: { position: true, question: { select: { prompt: true } }, answer: { select: { interested: true } } },
    } },
  });
}

async function lockAttempt(tx: Prisma.TransactionClient, userId: string, attemptId: string) {
  const [attempt] = await tx.$queryRaw<{ completedAt: Date | null }[]>`
    SELECT a."completedAt" FROM "AssessmentAttempt" a
    JOIN "Enrollment" e ON e.id = a."enrollmentId"
    WHERE a.id = ${attemptId}::uuid AND e."studentId" = ${userId}::uuid
    FOR UPDATE OF a`;
  if (!attempt) throw new AssessmentError("La evaluación no está disponible.");
  return attempt;
}

export async function saveAnswer(userId: string, attemptId: string, position: number, interested: boolean) {
  return db.$transaction(async tx => {
    const attempt = await lockAttempt(tx, userId, attemptId);
    if (attempt.completedAt) throw new AssessmentError("La evaluación ya fue enviada.");
    await tx.answer.upsert({
      where: { attemptId_position: { attemptId, position } }, update: { interested },
      create: { attemptId, position, interested },
    });
    await tx.assessmentAttempt.update({ where: { id: attemptId }, data: { cursor: position } });
  });
}

export async function finishAttempt(userId: string, attemptId: string) {
  return db.$transaction(async tx => {
    const locked = await lockAttempt(tx, userId, attemptId);
    if (locked.completedAt) return;
    const attempt = await tx.assessmentAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { enrollment: { include: { student: { include: { user: true } } } },
        order: { include: { question: true, answer: true } } },
    });
    if (attempt.order.length !== 50 || attempt.order.some(item => !item.answer)) {
      throw new AssessmentError("Responde las 50 preguntas antes de finalizar.");
    }
    const result = calculate(attempt.order.map(({ question, answer }) => ({ ...question, interested: answer?.interested })));
    const { enrollment } = attempt;
    const institution = await tx.institution.findUniqueOrThrow({ where: { id: 1 } });
    await tx.assessmentResult.create({ data: {
      ...result, attemptId, studentName: enrollment.student.user.name, studentCode: enrollment.student.code,
      institutionName: institution.name, parallelLabel: enrollment.grade + " " + enrollment.parallelId,
    } });
    await tx.assessmentAttempt.update({ where: { id: attemptId }, data: { completedAt: new Date() } });
  });
}
