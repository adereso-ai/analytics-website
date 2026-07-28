import type { CSSProperties } from "react";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "#0C0C0D" } as CSSProperties}
    >
      <p
        className="font-[family-name:var(--font-outfit)] text-6xl font-semibold tracking-tight text-white/90"
      >
        404
      </p>
      <p className="mt-3 max-w-sm text-sm text-white/50">
        Esta página no existe.
      </p>
    </main>
  );
}
