import Link from "next/link";
import { sessionUser } from "@/server/auth";
import { logout } from "@/server/auth-actions";

export async function Shell({ section, home, children }: { section: string; home: string; children: React.ReactNode }) {
  const user = await sessionUser();
  return <><header className="shell">
    <Link href={home} className="font-bold">Orientación Vocacional</Link>
    <nav aria-label="Menú de sesión"><span>{section}</span>{!user?.passwordLocked && <Link href="/clave">Cambiar contraseña</Link>}
      <form action={logout}><button className="font-semibold underline" type="submit">Cerrar sesión</button></form>
    </nav>
  </header><main>{children}</main></>;
}
