import { notFound } from "next/navigation";

/** Ruta interna: el middleware reescribe aquí a visitantes sin sesión. */
export default function GonePage() {
  notFound();
}
