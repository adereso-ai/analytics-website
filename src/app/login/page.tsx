import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{ backgroundColor: "#0C0C0D" } as CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,213,64,0.14), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(255,255,255,0.04), transparent 50%)",
        }}
      />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <p className="font-[family-name:var(--font-outfit)] text-xs font-semibold uppercase tracking-[0.2em] text-[#FFD540]">
          Adereso
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-outfit)] text-3xl font-semibold tracking-tight text-white">
          Analítica Web
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Acceso interno · datos confidenciales
        </p>
        <div className="mt-10 w-full">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
