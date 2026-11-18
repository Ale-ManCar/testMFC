"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main><h1>No se pudo cargar la página</h1><p className="my-4">Intenta nuevamente en unos instantes.</p>
    <button className="btn" type="button" onClick={reset}>Volver a intentar</button></main>;
}
