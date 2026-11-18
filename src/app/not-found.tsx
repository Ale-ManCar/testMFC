import Link from "next/link";

export default function NotFound() {
  return <main><h1>Recurso no disponible</h1><Link href="/" className="btn mt-4">Volver al inicio</Link></main>;
}
