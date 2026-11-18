"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation({ home }: { home: string }) {
  const pathname = usePathname();
  const links = home === "/admin"
    ? [{ href: "/admin", label: "Cuentas y matrículas", symbol: "▤" }, { href: "/admin/configuracion", label: "Configuración", symbol: "⚙" }]
    : home === "/dece"
      ? [{ href: "/dece", label: "Evaluaciones", symbol: "▤" }]
      : [{ href: "/estudiante", label: "Mi evaluación", symbol: "▤" }];
  return <nav className="workspace-navigation" aria-label="Navegación principal">
    {links.map(link => {
      const configuration = pathname.startsWith("/admin/configuracion") || pathname.startsWith("/admin/cuestionarios");
      const active = link.href === "/admin/configuracion" ? configuration
        : link.href === "/admin" ? !configuration : pathname.startsWith(link.href);
      return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}>
        <span aria-hidden="true">{link.symbol}</span>{link.label}
      </Link>;
    })}
  </nav>;
}
