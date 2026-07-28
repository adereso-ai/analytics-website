"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { LoginForm } from "@/components/LoginForm";

const font = "font-[family-name:var(--font-outfit)]";

export function LoginScreen({ footer }: { footer?: ReactNode }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <main
      className="relative flex min-h-dvh w-full overflow-hidden"
      style={{ backgroundColor: "#0C0C0D" } as CSSProperties}
    >
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 15% 20%, rgba(255,213,64,0.11), transparent 50%), radial-gradient(ellipse 70% 50% at 90% 85%, rgba(255,255,255,0.04), transparent 45%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-center px-6 py-14 md:px-10 lg:flex-row lg:items-center lg:gap-20 lg:py-20">
        {/* Brand column */}
        <div className="flex-1 max-w-xl">
          <p
            className={`hero-in ${on ? "on" : ""} text-xs font-semibold uppercase tracking-[0.22em] text-[#FFD540] ${font}`}
          >
            Adereso
          </p>
          <h1
            className={`hero-in ${on ? "on" : ""} mt-5 text-4xl font-medium leading-[1.08] tracking-[-0.02em] md:text-5xl lg:text-[3.5rem] ${font}`}
            style={{
              transitionDelay: "0.08s",
              background:
                "linear-gradient(180deg, #FFFFFF 30%, rgba(255,255,255,0.65) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Analítica Web
          </h1>
          <p
            className={`hero-in ${on ? "on" : ""} mt-5 max-w-md text-base leading-relaxed md:text-lg`}
            style={{
              transitionDelay: "0.16s",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Reportes de analítica web con datos de GA4.
          </p>
        </div>

        {/* Auth action */}
        <div
          className={`hero-in ${on ? "on" : ""} mt-12 w-full max-w-md shrink-0 lg:mt-0`}
          style={{ transitionDelay: "0.18s" }}
        >
          <div
            className="rounded-2xl p-7 sm:p-8"
            style={{
              backgroundColor: "#131415",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
            }}
          >
            <p className={`text-sm font-medium text-white ${font}`}>
              Iniciar sesión
            </p>
            <p
              className="mt-1.5 text-sm leading-snug"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Usa tu cuenta de Google Workspace de Adereso.
            </p>
            <div className="mt-7">
              <LoginForm />
            </div>
          </div>
          {footer}
        </div>
      </div>
    </main>
  );
}
