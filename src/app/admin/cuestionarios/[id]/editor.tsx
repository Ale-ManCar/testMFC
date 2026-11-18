"use client";

import { useState } from "react";
import { specialties } from "@/domain/assessment";
import { updateVersion } from "@/server/admin-actions";
import { ActionForm } from "@/ui/forms";

type Question = { id: string; number: number; prompt: string; specialtyId: string };

export function Editor({ id, initial }: { id: string; initial: Question[] }) {
  const [questions, setQuestions] = useState(initial);
  function update(number: number, change: Partial<Pick<Question, "prompt" | "specialtyId">>) {
    setQuestions(current => current.map(q => q.number === number ? { ...q, ...change } : q));
  }

  return <ActionForm action={updateVersion}>
    <p>Guarda el borrador para continuar editándolo. Publicar bloquea la versión y permite asignarla a una convocatoria.</p>
    <input type="hidden" name="id" value={id} />
    {questions.map(question => {
      const promptId = "prompt" + question.number;
      const areaId = "area" + question.number;
      return <div className="grid md:grid-cols-[2fr_1fr] gap-3 border-b border-slate-200 py-2" key={question.id}>
        <div className="field">
          <label htmlFor={promptId}>Pregunta {question.number}</label>
          <textarea id={promptId} name={promptId} value={question.prompt} maxLength={220} required
            onChange={event => update(question.number, { prompt: event.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={areaId}>Especialidad {question.number}</label>
          <select id={areaId} name={areaId} value={question.specialtyId}
            onChange={event => update(question.number, { specialtyId: event.target.value })}>
            {specialties.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>;
    })}
    <div className="actions">
      <button name="operation" value="save" className="btn alt" type="submit">Guardar borrador</button>
      <button name="operation" value="publish" className="btn" type="submit">Publicar versión</button>
    </div>
  </ActionForm>;
}
