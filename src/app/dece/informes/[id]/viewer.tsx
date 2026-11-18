"use client";

import { useRef, useState } from "react";

export function Viewer({ url, close }: { url: string; close: React.ReactNode }) {
  const pdf = useRef<HTMLIFrameElement>(null);
  const [printHelp, setPrintHelp] = useState(false);
  function print() {
    setPrintHelp(true);
    try { pdf.current?.contentWindow?.print(); } catch { /* The native viewer may isolate its print context. */ }
  }
  return <>
    <div className="actions mb-3">
      <a className="btn" href={url + "?descargar=1"}>Descargar PDF</a>
      <button className="btn alt" type="button" onClick={print}>Imprimir PDF</button>
      <a className="btn alt" href={url} target="_blank" rel="noreferrer">Abrir en otra pestaña</a>
      {close}
    </div>
    {printHelp && <p role="status" className="muted mb-3">Si el diálogo no aparece, abre el PDF en otra pestaña y usa la opción Imprimir del visor.</p>}
    <iframe ref={pdf} className="viewer-frame" title="Visor del informe individual PDF" src={url} />
  </>;
}
