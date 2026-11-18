import { describe, expect, it } from "vitest";
import questions from "../prisma/questions.json";
import { calculate, highest, specialties, validateQuestions } from "@/domain/assessment";

export const exampleInterested = new Set([1,3,4,8,10,12,13,15,17,19,21,23,25,26,27,28,29,30,32,33,34,35,37,39,40,41,42,44,48,50].filter(n => n !== 29));
const answered = questions.map(q => ({ ...q, interested: exampleInterested.has(q.number) }));

describe("Cuestionario institucional", () => {
  it("contiene 50 enunciados y 10 por especialidad", () => {
    expect(questions).toHaveLength(50);
    for (const specialty of specialties) expect(questions.filter(q => q.specialtyId === specialty.id)).toHaveLength(10);
    expect(() => validateQuestions(questions)).not.toThrow();
  });
  it("calcula el ejemplo, incluida la afinidad empatada", () => {
    const result = calculate(answered);
    expect(result).toMatchObject({ interested: 29, uninterested: 21, answered: 50 });
    expect(result.scores.map(s => s.percent)).toEqual([70, 70, 60, 30, 60]);
    expect(highest(result.scores)).toEqual(["Diseño Gráfico", "Desarrollo de Software"]);
    expect(result.scores.reduce((sum, row) => sum + row.points, 0)).toBe(result.interested);
  });
  it("rechaza evaluaciones incompletas y números repetidos", () => {
    expect(() => calculate(answered.slice(0, 49))).toThrow();
    expect(() => calculate([answered[1], ...answered.slice(1)])).toThrow();
    expect(() => calculate([questions[0], ...answered.slice(1)])).toThrow();
  });
  it("conserva todos los empates incluso cuando el máximo es cero", () => {
    expect(highest(calculate(questions.map(q => ({ ...q, interested: false }))).scores)).toHaveLength(5);
  });
});
