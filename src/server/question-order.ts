import { randomInt } from "node:crypto";

/** Avoid matching the same position in the three preceding assignments. */
export function randomQuestionOrder<T extends { id: string }>(questions: T[], previous: string[][]): T[] {
  for (let retry = 0; retry < 10000; retry++) {
    const order = [...questions];
    for (let i = order.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.every((question, position) => previous.every(prior => prior[position] !== question.id))) return order;
  }
  throw new Error("No se pudo asignar un orden de preguntas. Intenta iniciar nuevamente.");
}
