import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCassperPropertyId } from "@/lib/config";
import { resolveDateRange } from "@/lib/dates";
import { fetchPropertySnapshot } from "@/lib/ga4";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const propertyId = getCassperPropertyId();
  if (!propertyId) {
    return NextResponse.json({
      error: "Falta la propiedad GA4 de Cassper.",
      setup: true,
      details: "Define CASSPER_GA4_PROPERTY_ID (el sitio usa el measurement ID G-RCMTVJ8444).",
    }, { status: 503 });
  }
  const range = resolveDateRange({ preset: request.nextUrl.searchParams.get("range"), start: null, end: null });
  try {
    return NextResponse.json({ range, ...(await fetchPropertySnapshot(propertyId, range.startDate, range.endDate)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo consultar GA4." }, { status: 500 });
  }
}
