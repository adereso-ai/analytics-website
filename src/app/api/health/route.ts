import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getFunnelSteps,
  getInterestFunnelSteps,
  getPropertyId,
  isGaConfigured,
} from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({
    configured: isGaConfigured(),
    propertyId: getPropertyId() ? "***" + getPropertyId()!.slice(-4) : null,
    conversionFunnel: getFunnelSteps(),
    interestFunnel: getInterestFunnelSteps(),
  });
}
