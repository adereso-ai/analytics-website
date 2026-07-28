import { NextResponse } from "next/server";
import { isGaConfigured } from "@/lib/config";
import type { ApiErrorBody } from "@/lib/types";

export function setupRequiredResponse() {
  const body: ApiErrorBody = {
    error:
      "Configura GA4_PROPERTY_ID y las credenciales del service account en .env.local",
    setup: true,
  };
  return NextResponse.json(body, { status: 503 });
}

export function ensureConfigured() {
  if (!isGaConfigured()) {
    return setupRequiredResponse();
  }
  return null;
}

export function errorResponse(error: unknown, status = 500) {
  const details = error instanceof Error ? error.message : String(error);
  const body: ApiErrorBody = {
    error: "Error al consultar Google Analytics",
    details,
  };
  return NextResponse.json(body, { status });
}
