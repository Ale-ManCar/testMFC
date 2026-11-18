import Link from "next/link";
import { createDraft, manageCampaign, saveInstitution } from "@/server/admin-actions";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm, Field } from "@/ui/forms";
import { Shell } from "@/ui/shell";

export default async function ConfigurationPage() {
  await requireRole("ADMIN");
  const [institution, versions, campaigns] = await Promise.all([
    db.institution.findUnique({ where: { id: 1 } }),
    db.questionnaireVersion.findMany({ orderBy: { label: "asc" } }),
    db.campaign.findMany({ orderBy: { yearId: "desc" }, include: { version: { select: { label: true } } } }),
  ]);
  const published = versions.filter(v => v.publishedAt);
  return <Shell section="Administración" home="/admin">
    <Link href="/admin">Volver a cuentas</Link><h1 className="mt-3">Configuración institucional</h1>
    <div className="grid lg:grid-cols-2 gap-x-5">
      <section className="section">
        <h2 className="mb-4">Institución y políticas</h2>
        <ActionForm action={saveInstitution} submit="Guardar configuración">
          <Field label="Nombre institucional" name="name" defaultValue={institution?.name} maxLength={140} required />
          <label className="field">Política de acceso y privacidad<textarea name="accessPolicy" defaultValue={institution?.accessPolicy} rows={4} maxLength={4000} /></label>
          <label className="field">Política de retención<textarea name="retentionPolicy" defaultValue={institution?.retentionPolicy} rows={4} maxLength={4000} /></label>
        </ActionForm>
      </section>
      <section className="section">
        <h2>Versiones del cuestionario</h2>
        <ul className="my-4 divide-y divide-slate-200">{versions.map(version => <li className="py-2 flex flex-wrap gap-3 justify-between" key={version.id}>
          <Link href={"/admin/cuestionarios/" + version.id}>{version.label}</Link>
          <span>{version.publishedAt ? "Publicada" : "Borrador"}</span>
        </li>)}</ul>
        {published.length > 0 && <ActionForm action={createDraft} submit="Crear borrador">
          <label className="field">Copiar versión<select name="versionId">{published.map(version => <option key={version.id} value={version.id}>{version.label}</option>)}</select></label>
          <Field label="Nombre del borrador" name="label" maxLength={140} required />
        </ActionForm>}
      </section>
      <section className="section lg:col-span-2">
        <h2>Convocatorias</h2>
        <p className="muted my-3">Cada año admite una convocatoria y un intento por estudiante. Cerrar la convocatoria impide nuevos inicios. Quienes ya empezaron pueden continuar.</p>
        {campaigns.length === 0 && <p className="mb-4">Aún no hay convocatorias.</p>}
        <ul className="divide-y divide-slate-200 mb-4">{campaigns.map(campaign => <li className="py-3 grid md:grid-cols-[1fr_auto] gap-3" key={campaign.yearId}>
          <div><strong>{campaign.yearId}</strong><p>{campaign.version.label} · {campaign.open ? "Abierta" : "Cerrada"}</p></div>
          <ActionForm action={manageCampaign} submit={campaign.open ? "Cerrar convocatoria" : "Reabrir convocatoria"}>
            <input type="hidden" name="year" value={campaign.yearId} /><input type="hidden" name="open" value={String(!campaign.open)} />
          </ActionForm>
        </li>)}</ul>
        {published.length > 0 && <ActionForm action={manageCampaign} submit="Abrir convocatoria">
          <Field label="Año lectivo" name="year" placeholder="2026-2027" maxLength={9} required />
          <div className="field"><label htmlFor="campaign-version">Versión publicada</label><select id="campaign-version" name="versionId">
            {published.map(version => <option key={version.id} value={version.id}>{version.label}</option>)}
          </select></div>
        </ActionForm>}
      </section>
    </div>
  </Shell>;
}
