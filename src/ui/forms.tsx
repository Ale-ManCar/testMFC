"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/server/form-state";

export function ActionForm({ action, children, submit, multipart }: {
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode; submit?: string; multipart?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [dismissed, setDismissed] = useState<FormState>();
  return <form action={dispatch} className="form" encType={multipart ? "multipart/form-data" : undefined}>
    <fieldset disabled={pending} className="form">
      {children}
      {submit && <div><button className="btn" type="submit">{pending ? "Procesando…" : submit}</button></div>}
    </fieldset>
    {state.error && <p role="alert" className="error">{state.error}</p>}
    {state.message && <p role="status" className="success">{state.message}</p>}
    {state.credentials && dismissed !== state && !pending && <div className="section scroll">
      <h3>Credenciales temporales</h3>
      <p>Entrega cada contraseña en privado. Se ocultarán al salir de esta pantalla.</p>
      <table><thead><tr><th>Usuario</th><th>Contraseña temporal</th></tr></thead><tbody>
        {state.credentials.map(entry => <tr key={entry.username}><td>{entry.username}</td><td><code>{entry.password}</code></td></tr>)}
      </tbody></table>
      <button className="btn alt mt-3" type="button" onClick={() => setDismissed(state)}>Ocultar credenciales</button>
    </div>}
  </form>;
}

export function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field">{label}<input {...props} /></label>;
}
