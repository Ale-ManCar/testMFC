import { highest, type Score } from "@/domain/assessment";
import { dateInEcuador } from "./date";

export type Report = {
  institutionName: string; year: string; studentName: string; studentCode: string; parallelLabel: string; completedAt: Date;
  interested: number; uninterested: number; answered: number; scores: Score[];
  items: { position: number; prompt: string; area: string; interested: boolean }[];
};

const escape = (value: string) => value.replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

function answerTable(items: Report["items"]) {
  return `<table class="answers"><colgroup><col style="width:7%"><col style="width:57%"><col style="width:18%"><col style="width:18%"></colgroup>
    <thead><tr><th>N.º</th><th>Pregunta</th><th>Área</th><th>Respuesta</th></tr></thead>
    <tbody>${items.map(item => `<tr><td><b>${String(item.position).padStart(2, "0")}</b></td><td>${escape(item.prompt)}</td><td>${escape(item.area)}</td>
      <td class="${item.interested ? "yes" : "no"}">${item.interested ? "Me interesa" : "No me interesa"}</td></tr>`).join("")}</tbody></table>`;
}

function summary(data: Report) {
  return `<h1>Informe individual</h1><p class="subtitle">Respuestas y afinidades por especialidad</p>
  <div class="student">
    <div><label>Estudiante</label><strong>${escape(data.studentName)}</strong></div><div><label>Código</label><strong>${escape(data.studentCode)}</strong></div>
    <div><label>Paralelo</label><strong>${escape(data.parallelLabel)}</strong></div><div><label>Fecha de finalización</label><strong>${dateInEcuador.format(data.completedAt)}</strong></div>
  </div>
  <div class="counts">
    <div><label>Me interesa</label><strong class="yes">${data.interested} / 50</strong></div>
    <div><label>No me interesa</label><strong class="no">${data.uninterested} / 50</strong></div>
    <div><label>Respuestas</label><strong class="blue">${data.answered} / 50</strong></div>
  </div>
  <h2>Resultados por especialidad</h2>
  <table class="scores"><colgroup><col style="width:66%"><col style="width:17%"><col style="width:17%"></colgroup>
    <thead><tr><th>Especialidad</th><th>Puntaje</th><th>Afinidad</th></tr></thead>
    <tbody>${data.scores.map(score => `<tr><td>${escape(score.name)}</td><td><b>${score.points} / 10</b></td><td class="blue"><b>${score.percent}%</b></td></tr>`).join("")}</tbody>
  </table>
  <p class="highest"><b>Mayor afinidad declarada: ${escape(highest(data.scores).join(" / "))}</b></p>
  <p class="note">Este informe describe intereses declarados. No mide aptitudes ni determina una especialidad obligatoria.</p>
  <h2>Registro de las 50 preguntas y respuestas</h2>`;
}

export function reportHtml(data: Report) {
  const sections = [[1,5], [6,23], [24,41], [42,50]];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe individual</title><style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    body { margin:0; font: 9pt/1.3 Arial, sans-serif; color:#213044; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    article { padding: 9mm 13.5mm 11mm; width:210mm; height:297mm; display:flex; flex-direction:column; break-after:page; }
    article:last-child { break-after:auto; }
    header { border-bottom:1px solid #cad8e5; padding-bottom:3mm; margin-bottom:6mm; }
    header strong { display:block; font-size:11pt; color:#174569; text-transform:uppercase; overflow-wrap:anywhere; }
    header span { color:#4c657d; font-size:8pt; display:block; margin-top:2mm; text-transform:uppercase; }
    h1,h2 { margin:0 0 3mm; text-transform:uppercase; color:#174569; line-height:1.1; }
    h1 { font-size:23pt; } h2 { font-size:11pt; }
    .subtitle { margin:0 0 4.3mm; color:#4c657d; font-size:10pt; }
    .student { background:#f1f5f8; border-radius:2mm; display:grid; grid-template-columns:60% 40%; gap:1.5mm 2mm; padding:3mm 5mm; }
    .student strong { font-size:10.5pt; display:block; overflow-wrap:anywhere; }
    label { color:#4c657d; display:block; font-weight:bold; text-transform:uppercase; font-size:8pt; margin-bottom:1mm; }
    .counts { display:grid; grid-template-columns:repeat(3,1fr); gap:3mm; margin:3.6mm 0 4.3mm; }
    .counts div { border:1px solid #d5e0e8; border-radius:2mm; padding:2.5mm 4mm; }
    .counts strong { font-size:18pt; }
    .yes { color:#0d714e; font-weight:bold; } .no { color:#9c3939; font-weight:bold; } .blue { color:#216c9e; }
    table { width:100%; table-layout:fixed; border-collapse:collapse; text-align:left; }
    th { background:#153f60; color:white; text-transform:uppercase; }
    td,th { padding: 2.2mm 3.5mm; vertical-align:middle; border-bottom: .2mm solid #d5e0e8; overflow-wrap:anywhere; }
    tbody tr:nth-child(even) { background:#f4f7f9; }
    tr { break-inside:avoid; }
    .answers { flex:none; font-size:calc(8.8pt * var(--density, 1)); }
    .answers td { padding-block:calc(2.12mm * var(--density, 1) * var(--density, 1) * var(--density, 1)); }
    .answers td:first-child { color:#174569; }
    .answers td:nth-child(3) { color:#4c657d; }
    .scores td { padding-block:1.9mm; }
    .highest { margin:3.2mm 0; background:#ebf3fa; color:#174569; padding:2mm 4mm; border-radius:1mm; }
    .note { color:#4c657d; font-size:8pt; margin:0 0 3.7mm; }
    .closing { margin-top:6mm; }
    footer { margin-top:auto; border-top:1px solid #cad8e5; padding-top:3mm; display:flex; justify-content:space-between; color:#4c657d; font-size:7.5pt; }
    footer strong { color:#174569; }
  </style></head><body>
  ${sections.map(([first, last], page) => `<article>
    <header><strong>${escape(data.institutionName)}</strong><span>Evaluación de intereses vocacionales &nbsp; | &nbsp; Año lectivo ${escape(data.year)}</span></header>
    ${page === 0 ? summary(data) : `<h2>Detalle de respuestas · Continuación</h2><p class="subtitle">Preguntas ${String(first).padStart(2,"0")} a ${last} de 50</p>`}
    ${answerTable(data.items.slice(first - 1, last))}
    ${page === 3 ? '<p class="note closing">Registro generado a partir de las respuestas almacenadas en el sistema.</p>' : ""}
    <footer><span>USO ACADÉMICO INTERNO · DOCUMENTO CONFIDENCIAL</span><strong>Página ${page + 1} de 4</strong></footer>
  </article>`).join("")}
  </body></html>`;
}
