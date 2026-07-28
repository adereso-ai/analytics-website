import { readFileSync } from "node:fs";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getCredentials } from "@/lib/config";

function initAdmin() {
  if (getApps().length > 0) return;

  const creds = getCredentials();
  if (creds?.kind === "json") {
    const sa = JSON.parse(creds.json) as {
      project_id?: string;
      client_email: string;
      private_key: string;
    };
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    return;
  }

  if (creds?.kind === "fields") {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: creds.clientEmail,
        privateKey: creds.privateKey,
      }),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    return;
  }

  if (creds?.kind === "file") {
    const sa = JSON.parse(readFileSync(creds.path, "utf8")) as {
      project_id?: string;
      client_email: string;
      private_key: string;
    };
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "adereso-landings",
  });
}

export function getAdminAuth(): Auth {
  initAdmin();
  return getAuth();
}
