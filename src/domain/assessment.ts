export const specialties = [
  { id: "D", name: "Diseño Gráfico", shortName: "Diseño", position: 1 },
  { id: "S", name: "Desarrollo de Software", shortName: "Software", position: 2 },
  { id: "T", name: "Turismo", shortName: "Turismo", position: 3 },
  { id: "C", name: "Ciencias", shortName: "Ciencias", position: 4 },
  { id: "G", name: "Gestión Administrativa", shortName: "Gestión", position: 5 },
];

export function validateQuestions(questions: { number: number; specialtyId: string }[]) {
  const valid = questions.length === 50 && new Set(questions.map(q => q.number)).size === 50
    && questions.every(q => Number.isInteger(q.number) && q.number >= 1 && q.number <= 50)
    && specialties.every(s => questions.filter(q => q.specialtyId === s.id).length === 10);
  if (!valid) throw new Error("La versión debe tener 50 preguntas numeradas y 10 por especialidad.");
}

export function calculate(questions: { number: number; specialtyId: string; interested?: boolean }[]) {
  validateQuestions(questions);
  if (questions.some(q => typeof q.interested !== "boolean")) throw new Error("Responde las 50 preguntas antes de finalizar.");
  const scores = specialties.map(s => {
    const points = questions.filter(q => q.specialtyId === s.id && q.interested).length;
    return { specialtyId: s.id, name: s.name, points, percent: points * 10 };
  });
  const interested = scores.reduce((total, score) => total + score.points, 0);
  return { interested, uninterested: 50 - interested, answered: 50, scores };
}

export type Score = ReturnType<typeof calculate>["scores"][number];
export function highest(scores: Score[]) {
  const max = Math.max(...scores.map(score => score.points));
  return scores.filter(score => score.points === max).map(score => score.name);
}
