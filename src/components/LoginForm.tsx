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

const font = "font-[family-name:var(--font-outfit)]";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

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
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className={`group flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-[#0C0C0D] transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${font}`}
        style={{
          backgroundColor: "#FFD540",
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = "#FFE37A";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#FFD540";
        }}
      >
        {loading ? (
          <IconLoader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white shadow-sm">
            <GoogleMark />
          </span>
        )}
        Continuar con Google
      </button>

      {error ? (
        <p
          className="mt-4 rounded-xl px-3 py-2.5 text-center text-xs leading-snug"
          style={{
            border: "1px solid rgba(248,113,113,0.35)",
            background: "rgba(248,113,113,0.1)",
            color: "#fecaca",
          }}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
