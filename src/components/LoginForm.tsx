"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { IconLoader2 } from "@tabler/icons-react";
import {
  ALLOWED_EMAIL_DOMAIN,
  isAllowedEmail,
} from "@/lib/auth/domain";
import { getClientAuth } from "@/lib/auth/firebase-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const auth = getClientAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN });
    provider.addScope("email");
    provider.addScope("profile");

    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      if (!isAllowedEmail(email)) {
        await signOut(auth);
        setError(`Solo correos @${ALLOWED_EMAIL_DOMAIN}.`);
        return;
      }

      const idToken = await result.user.getIdToken(true);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        await signOut(auth);
        setError(body?.error ?? "No se pudo iniciar sesión.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al autenticar.";
      if (message.includes("popup-closed-by-user")) {
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD540] px-4 py-3 font-[family-name:var(--font-outfit)] text-sm font-semibold text-[#0C0C0D] transition hover:bg-[#FFE37A] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : null}
        Continuar con Google
      </button>
      <p className="mt-4 text-center text-xs text-white/40">
        Solo cuentas <span className="text-white/60">@{ALLOWED_EMAIL_DOMAIN}</span>
      </p>
      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
