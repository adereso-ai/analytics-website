import type { CSSProperties, ReactNode } from "react";
import { LoginForm } from "@/components/LoginForm";

export function LoginScreen({ footer }: { footer?: ReactNode }) {
  return (
    <main
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 py-12"
      style={{ backgroundColor: "#0C0C0D" } as CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,213,64,0.12), transparent 55%)",
        }}
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <p className="font-[family-name:var(--font-outfit)] text-xs font-semibold uppercase tracking-[0.2em] text-[#FFD540]">
          Adereso
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-outfit)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Analítica Web
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Acceso interno · datos confidenciales
        </p>
        <div className="mt-10 w-full">
          <LoginForm />
        </div>
        {footer}
      </div>
    </main>
  );
}
