"use client";

import { useRef, useState, useTransition } from "react";
import { recordAnswer, submitAssessment } from "@/server/assessment-actions";

type Item = { position: number; question: { prompt: string }; answer: { interested: boolean } | null };

export function Questionnaire({ id, questions, cursor }: { id: string; questions: Item[]; cursor: number }) {
  const initialIndex = cursor < 50 && questions[cursor - 1]?.answer && !questions[cursor]?.answer ? cursor : cursor - 1;
  const [index, setIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState(() => questions.map(item => item.answer?.interested));
  const [pending, transition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [selection, setSelection] = useState<boolean>();
  const [confirm, setConfirm] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const question = questions[index];
  const answered = answers.filter(answer => typeof answer === "boolean").length;

  function navigate(next: number) {
    setIndex(next);
    setError("");
    setSaved(false);
    title.current?.focus();
  }

  function choose(value: boolean) {
    setSelection(value);
    setError("");
    setSaved(false);
    transition(async () => {
      try {
        const result = await recordAnswer(id, question.position, value);
        if (result.error) { setError(result.error); return; }
        setAnswers(current => current.map((answer, i) => i === index ? value : answer));
        setSaved(true);
      } catch {
        setError("No se pudo guardar tu respuesta. Verifica tu conexión y vuelve a intentarlo.");
      } finally {
        setSelection(undefined);
      }
    });
  }

  return <>
    <p className="kicker">Evaluación de intereses</p>
    <h1 ref={title} tabIndex={-1}>Pregunta {question.position} de 50</h1>
    <p className="muted mt-2" id="answered-count">{answered} de 50 respondidas</p>
    <progress aria-labelledby="answered-count" max={50} value={answered} />
    <section className="section">
      <fieldset disabled={pending || confirm}>
        <legend className="text-xl font-semibold mb-5">{question.question.prompt}</legend>
        <div className="grid gap-2">
          {[true, false].map(value => <label className="choice" key={String(value)}>
            <input type="radio" name="interest" checked={(selection ?? answers[index]) === value} onChange={() => choose(value)} />
            {value ? "Me interesa" : "No me interesa"}
          </label>)}
        </div>
      </fieldset>
      <div className="min-h-8 mt-2" aria-live="polite">{pending && !confirm ? "Guardando…" : saved ? "Respuesta guardada." : ""}</div>
      {error && <p role="alert" className="error mb-3">{error}</p>}
      {!confirm && <div className="actions justify-between">
        <button type="button" className="btn alt" disabled={pending || index === 0} onClick={() => navigate(index - 1)}>Anterior</button>
        {index < 49 ? <button type="button" className="btn" disabled={pending || answers[index] === undefined} onClick={() => navigate(index + 1)}>Siguiente</button>
          : answered === 50 ? <button type="button" className="btn" disabled={pending} onClick={() => setConfirm(true)}>Finalizar evaluación</button>
          : <button type="button" className="btn" disabled={pending} onClick={() => navigate(answers.findIndex(answer => answer === undefined))}>Ir a una pregunta pendiente</button>}
      </div>}
      {confirm && <section className="mt-4" aria-labelledby="confirmation">
        <h2 id="confirmation">Confirma el envío</h2>
        <p className="mt-2 mb-4">Después de enviar, tus respuestas quedarán bloqueadas.</p>
        <div className="actions">
          <button type="button" className="btn alt" disabled={pending} onClick={() => setConfirm(false)}>Revisar respuestas</button>
          <button type="button" className="btn" disabled={pending} onClick={() => transition(async () => {
            const result = await submitAssessment(id);
            if (result?.error) setError(result.error);
          })}>{pending ? "Enviando…" : "Enviar respuestas"}</button>
        </div>
      </section>}
    </section>
  </>;
}
