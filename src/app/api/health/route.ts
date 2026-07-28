import { NextResponse } from "next/server";
import {
  getFunnelSteps,
  getInterestFunnelSteps,
  getPropertyId,
  isGaConfigured,
} from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    configured: isGaConfigured(),
    propertyId: getPropertyId() ? "***" + getPropertyId()!.slice(-4) : null,
    conversionFunnel: getFunnelSteps(),
    interestFunnel: getInterestFunnelSteps(),
  });
}
