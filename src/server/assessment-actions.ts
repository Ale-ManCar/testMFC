"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { advanceAttempt, AssessmentError, finishAttempt, saveAnswer, startAttempt } from "./assessment";
import { requireRole } from "./auth";

export async function begin(form: FormData) {
  const user = await requireRole("STUDENT");
  const input = z.uuid().safeParse(form.get("enrollmentId"));
  if (!input.success) notFound();
  let attemptId: string;
  try {
    attemptId = await startAttempt(user.id, input.data);
  } catch (error) {
    if (error instanceof AssessmentError) redirect("/estudiante?noDisponible=1");
    throw error;
  }
  redirect("/estudiante/" + attemptId);
}

export async function recordAnswer(id: string, position: number, interested: boolean) {
  const user = await requireRole("STUDENT");
  const input = z.tuple([z.uuid(), z.number().int().min(1).max(50), z.boolean()]).safeParse([id, position, interested]);
  if (!input.success) return { error: "La respuesta no es válida." };
  try {
    await saveAnswer(user.id, ...input.data);
    return {};
  } catch (error) {
    return { error: error instanceof AssessmentError ? error.message : "No se pudo guardar. Intenta nuevamente." };
  }
}

export async function submitAssessment(id: string) {
  const user = await requireRole("STUDENT");
  if (!z.uuid().safeParse(id).success) return { error: "La evaluación no es válida." };
  try {
    await finishAttempt(user.id, id);
  } catch (error) {
    return { error: error instanceof AssessmentError ? error.message : "No se pudo finalizar. Intenta nuevamente." };
  }
  redirect("/estudiante/" + id);
}

export async function nextQuestion(id: string, position: number) {
  const user = await requireRole("STUDENT");
  if (!z.uuid().safeParse(id).success || !z.number().int().min(1).max(50).safeParse(position).success) {
    return { error: "La pregunta no es válida." };
  }
  try {
    return { position: await advanceAttempt(user.id, id, position) };
  } catch (error) {
    return { error: error instanceof AssessmentError ? error.message : "No se pudo avanzar. Intenta nuevamente." };
  }
}
