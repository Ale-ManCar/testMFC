import Link from "next/link";
import { sessionUser } from "@/server/auth";
import { logout } from "@/server/auth-actions";
import { Navigation } from "./navigation";

export async function Shell({ section, home, children }: { section: string; home: string; children: React.ReactNode }) {
  const user = await sessionUser();
  return <div className={"workspace " + (home === "/estudiante" ? "student-workspace" : "staff-workspace")}>
    <a href="#contenido" className="skip-link">Ir al contenido</a>
    <aside className="workspace-sidebar">
      <Link href={home} className="workspace-brand"><span className="brand-mark" aria-hidden="true">OV</span><span>Orientación<span>Vocacional</span></span></Link>
      <p className="navigation-label">{section}</p>
      <Navigation home={home} />
      <div className="sidebar-account">
        <span className="account-avatar" aria-hidden="true">{user?.name.charAt(0)}</span>
        <div><strong>{user?.name}</strong><span>{section}</span></div>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <span className="workspace-context">{section}</span>
        <nav aria-label="Menú de sesión">
          {!user?.passwordLocked && <Link href="/clave">Cambiar contraseña</Link>}
          <form action={logout}><button type="submit">Cerrar sesión <span aria-hidden="true">↗</span></button></form>
        </nav>
      </header>
      <main id="contenido" className="workspace-main">{children}</main>
      <footer className="workspace-footer">Orientación Vocacional Estudiantil <span>Uso académico interno</span></footer>
    </div>
  </div>;
}
