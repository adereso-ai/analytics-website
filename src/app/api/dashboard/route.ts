import { NextRequest, NextResponse } from "next/server";
import { ensureConfigured, errorResponse } from "@/lib/api";
import { getPropertyId } from "@/lib/config";
import {
  buildRangeMeta,
  previousPeriod,
  resolveDateRange,
} from "@/lib/dates";
import { overviewDeltas } from "@/lib/format";
import { filterRowsByHost } from "@/lib/hosts";
import {
  fetchConversionEvents,
  fetchConversionOrigins,
  fetchConversionOriginsByDate,
  fetchConvertingPages,
  fetchConversionFunnel,
  fetchFormEventHealth,
  fetchFormStartByChannel,
  fetchFormStartByChannelAndPage,
  fetchFormStartByPage,
  fetchFormStartBySource,
  fetchGetThankYouConversion,
  fetchHosts,
  fetchInterestFunnel,
  fetchInterestNextActions,
  fetchLandingInterest,
  fetchLandingPages,
  fetchMainHubSpotConversion,
  fetchOverview,
  fetchTopPages,
  fetchTrafficSourceLandings,
  fetchTrafficSources,
} from "@/lib/ga4";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const setup = ensureConfigured();
  if (setup) return setup;

  const sp = request.nextUrl.searchParams;
  const range = resolveDateRange({
    preset: sp.get("range"),
    start: sp.get("start"),
    end: sp.get("end"),
  });
  const compare = previousPeriod(range);
  const rangeMeta = buildRangeMeta(range, compare);

  try {
    const [
      overview,
      overviewPrev,
      pages,
      hosts,
      sources,
      landings,
      conversions,
      convertingPages,
      funnel,
      interestFunnel,
      interestNextActions,
      formEvents,
      formStartPages,
      formStartChannels,
      formStartSources,
      formStartChannelPages,
      getThankYouConversion,
      mainHubSpotConversion,
      conversionOrigins,
      conversionOriginsByDate,
      landingInterest,
      sourceLandings,
    ] = await Promise.all([
      fetchOverview(range.startDate, range.endDate),
      fetchOverview(compare.startDate, compare.endDate),
      fetchTopPages(range.startDate, range.endDate),
      fetchHosts(range.startDate, range.endDate),
      fetchTrafficSources(range.startDate, range.endDate),
      fetchLandingPages(range.startDate, range.endDate),
      fetchConversionEvents(range.startDate, range.endDate),
      fetchConvertingPages(range.startDate, range.endDate),
      fetchConversionFunnel(range.startDate, range.endDate),
      fetchInterestFunnel(range.startDate, range.endDate),
      fetchInterestNextActions(range.startDate, range.endDate),
      fetchFormEventHealth(range.startDate, range.endDate),
      fetchFormStartByPage(range.startDate, range.endDate),
      fetchFormStartByChannel(range.startDate, range.endDate),
      fetchFormStartBySource(range.startDate, range.endDate),
      fetchFormStartByChannelAndPage(range.startDate, range.endDate),
      fetchGetThankYouConversion(range.startDate, range.endDate),
      fetchMainHubSpotConversion(range.startDate, range.endDate),
      fetchConversionOrigins(range.startDate, range.endDate),
      fetchConversionOriginsByDate(range.startDate, range.endDate),
      fetchLandingInterest(range.startDate, range.endDate),
      fetchTrafficSourceLandings(range.startDate, range.endDate),
    ]);

    const propertyId = getPropertyId();

    return NextResponse.json({
      range,
      compareRange: compare,
      rangeMeta,
      meta: {
        fetchedAt: new Date().toISOString(),
        propertyIdMasked: propertyId
          ? `***${propertyId.slice(-4)}`
          : null,
        source: "Google Analytics Data API",
        timezoneNote:
          "Fechas en calendario de la propiedad GA4 (sin mezclar zona del navegador en el corte).",
      },
      overview: {
        current: overview,
        previous: overviewPrev,
        deltas: overviewDeltas(overview, overviewPrev),
      },
      pages: filterRowsByHost(pages),
      hosts: filterRowsByHost(hosts),
      sources,
      landings,
      conversions,
      convertingPages,
      funnel,
      interestFunnel,
      interestNextActions,
      formEvents,
      formStartPages,
      formStartChannels,
      formStartSources,
      formStartChannelPages,
      getThankYouConversion,
      mainHubSpotConversion,
      conversionOrigins,
      conversionOriginsByDate,
      landingInterest,
      sourceLandings,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
