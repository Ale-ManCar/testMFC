"use client";

import { useRef, useState, useTransition } from "react";
import { nextQuestion, recordAnswer, submitAssessment } from "@/server/assessment-actions";

type Item = { position: number; question: { prompt: string }; answer: { interested: boolean } | null };

export function Questionnaire({ id, questions, cursor, furthest }: { id: string; questions: Item[]; cursor: number; furthest: number }) {
  const initialIndex = cursor - 1;
  const [visitedThrough, setVisitedThrough] = useState(Math.max(cursor, furthest));
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

  function navigate() {
    setError("");
    transition(async () => {
      try {
        const result = await nextQuestion(id, question.position);
        if (result.error || !result.position) { setError(result.error ?? "No se pudo avanzar."); return; }
        setVisitedThrough(current => Math.max(current, question.position, result.position!));
        setIndex(result.position - 1);
        setSaved(false);
        setSelection(undefined);
        title.current?.focus();
      } catch {
        setError("No se pudo avanzar. Verifica tu conexión y vuelve a intentarlo.");
      }
    });
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

  return <div className="assessment-layout">
    <div className="assessment-heading">
    <p className="kicker">Evaluación de intereses</p>
    <h1 ref={title} tabIndex={-1}>Pregunta {question.position} de 50</h1>
    <p className="muted mt-2" id="answered-count">{answered} de 50 respondidas</p>
    <progress aria-labelledby="answered-count" max={50} value={answered} />
    </div>
    <section className="section question-overview" aria-label="Estado de las 50 preguntas">
      <h2 className="mb-3 text-base">Tu recorrido</h2>
      <ol className="question-map">
        {questions.map((item, i) => {
          const current = i === index;
          const complete = answers[i] !== undefined;
          const skipped = !complete && item.position < visitedThrough;
          const state = current ? "Actual" : complete ? "Respondida" : skipped ? "Sin responder" : "Pendiente";
          return <li key={item.position} aria-current={current ? "step" : undefined}
            aria-label={"Pregunta " + item.position + ": " + state} title={state}
            className={"question-square " + (current ? "current" : complete ? "answered" : skipped ? "skipped" : "")}>
            {item.position}
          </li>;
        })}
      </ol>
      <p className="muted mt-3 text-sm">Azul · Actual. Verde · Respondida. Rojo · Omitida. Gris · Pendiente.</p>
    </section>
    <section className="section question-content">
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
      {!confirm && <div className="actions justify-end">
        {answered === 50
          ? <button type="button" className="btn" disabled={pending} onClick={() => setConfirm(true)}>Finalizar evaluación</button>
          : <button type="button" className="btn" disabled={pending} onClick={navigate}>
            {index === 49 ? "Completar preguntas pendientes" : "Siguiente"}
          </button>}
      </div>}
      {confirm && <section className="mt-4" aria-labelledby="confirmation">
        <h2 id="confirmation">Confirma el envío</h2>
        <p className="mt-2 mb-4">Después de enviar, tus respuestas quedarán bloqueadas.</p>
        <div className="actions">
          <button type="button" className="btn alt" disabled={pending} onClick={() => setConfirm(false)}>Continuar aquí</button>
          <button type="button" className="btn" disabled={pending} onClick={() => transition(async () => {
            const result = await submitAssessment(id);
            if (result?.error) setError(result.error);
          })}>{pending ? "Enviando…" : "Enviar respuestas"}</button>
        </div>
      </section>}
    </section>
  </div>;
}
