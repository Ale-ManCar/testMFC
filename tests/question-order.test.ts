import { expect, it } from "vitest";
import { randomQuestionOrder } from "@/server/question-order";

it("asigna las 50 preguntas sin coincidencias por posición entre cuatro inicios consecutivos", () => {
  const questions = Array.from({ length: 50 }, (_, index) => ({ id: String(index + 1) }));
  const history: string[][] = [];
  for (let student = 0; student < 40; student++) {
    const order = randomQuestionOrder(questions, history.slice(-3));
    expect(new Set(order.map(q => q.id)).size).toBe(50);
    expect(order.map(q => q.id).sort()).toEqual(questions.map(q => q.id).sort());
    for (const previous of history.slice(-3)) {
      expect(order.every((q, position) => q.id !== previous[position])).toBe(true);
    }
    history.push(order.map(q => q.id));
  }
  expect(questions[0].id).toBe("1");
});
