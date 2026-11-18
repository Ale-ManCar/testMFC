import Link from "next/link";
import { logout } from "@/server/auth-actions";

export function Shell({ section, home, children }: { section: string; home: string; children: React.ReactNode }) {
  return <><header className="shell">
    <Link href={home} className="font-bold">Orientación Vocacional</Link>
    <nav aria-label="Menú de sesión"><span>{section}</span><Link href="/clave">Cambiar contraseña</Link>
      <form action={logout}><button className="font-semibold underline" type="submit">Cerrar sesión</button></form>
    </nav>
  </header><main>{children}</main></>;
}
