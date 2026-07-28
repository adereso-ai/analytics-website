import {
  BetaAnalyticsDataClient,
  v1alpha,
} from "@google-analytics/data";
import { getCredentials, getFunnelSteps, getInterestFunnelSteps, getPropertyId } from "./config";
import { withGaLimit } from "./ga-queue";
import { isAllowedHost } from "./hosts";
import {
  isInterestCandidatePath,
  scoreLandingInterest,
  scoreLandingPriority,
} from "./interest";
import type {
  FunnelResult,
  FunnelStepConfig,
  FunnelStepResult,
  NextActionRow,
  OverviewStats,
  ReportRow,
} from "./types";

const { AlphaAnalyticsDataClient } = v1alpha;

type ClientOptions = ConstructorParameters<typeof BetaAnalyticsDataClient>[0];
type BetaClient = BetaAnalyticsDataClient;
type AlphaClient = InstanceType<typeof AlphaAnalyticsDataClient>;
type RunReportRequest = Parameters<BetaClient["runReport"]>[0];
type RunFunnelReportRequest = Parameters<AlphaClient["runFunnelReport"]>[0];

function gaRunReport(client: BetaClient, request: RunReportRequest) {
  return withGaLimit(() => client.runReport(request));
}

function gaRunFunnelReport(client: AlphaClient, request: RunFunnelReportRequest) {
  return withGaLimit(() => client.runFunnelReport(request));
}

function clientOptions(): ClientOptions {
  const creds = getCredentials();
  if (!creds) {
    throw new Error("Faltan credenciales de Google (service account).");
  }

  if (creds.kind === "json") {
    const parsed = JSON.parse(creds.json) as {
      client_email: string;
      private_key: string;
    };
    return {
      credentials: {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      },
    };
  }

  if (creds.kind === "fields") {
    return {
      credentials: {
        client_email: creds.clientEmail,
        private_key: creds.privateKey,
      },
    };
  }

  return { keyFilename: creds.path };
}

function createClient(): BetaAnalyticsDataClient {
  return new BetaAnalyticsDataClient(clientOptions());
}

function createAlphaClient(): InstanceType<typeof AlphaAnalyticsDataClient> {
  return new AlphaAnalyticsDataClient(clientOptions());
}

function propertyPath(): string {
  const id = getPropertyId();
  if (!id) throw new Error("Falta GA4_PROPERTY_ID.");
  return `properties/${id}`;
}

function metricValue(
  row: { metricValues?: Array<{ value?: string | null }> | null },
  index: number,
): number {
  const raw = row.metricValues?.[index]?.value;
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dimensionValue(
  row: { dimensionValues?: Array<{ value?: string | null }> | null },
  index: number,
): string {
  return row.dimensionValues?.[index]?.value ?? "(not set)";
}

function toRows(
  response: {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string | null }> | null;
      metricValues?: Array<{ value?: string | null }> | null;
    }> | null;
  },
  dimensionNames: string[],
  metricNames: string[],
): ReportRow[] {
  return (response.rows ?? []).map((row) => {
    const dimensions: Record<string, string> = {};
    const metrics: Record<string, number> = {};
    dimensionNames.forEach((name, i) => {
      dimensions[name] = dimensionValue(row, i);
    });
    metricNames.forEach((name, i) => {
      metrics[name] = metricValue(row, i);
    });
    return { dimensions, metrics };
  });
}

export async function fetchOverview(
  startDate: string,
  endDate: string,
): Promise<OverviewStats> {
  const client = createClient();
  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "keyEvents" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
    ],
  });

  const row = response.rows?.[0];
  return {
    activeUsers: row ? metricValue(row, 0) : 0,
    sessions: row ? metricValue(row, 1) : 0,
    screenPageViews: row ? metricValue(row, 2) : 0,
    keyEvents: row ? metricValue(row, 3) : 0,
    bounceRate: row ? metricValue(row, 4) : 0,
    averageSessionDuration: row ? metricValue(row, 5) : 0,
  };
}

export async function fetchTopPages(
  startDate: string,
  endDate: string,
  limit = 40,
): Promise<ReportRow[]> {
  const client = createClient();
  // hostName + pagePath: separa adereso.ai/ de get.adereso.ai/ etc.
  const dimensionNames = ["hostName", "pagePath"];
  const metricNames = [
    "screenPageViews",
    "sessions",
    "activeUsers",
    "bounceRate",
    "averageSessionDuration",
  ];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/** Tráfico por hostname / subdominio. */
export async function fetchHosts(
  startDate: string,
  endDate: string,
  limit = 30,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["hostName"];
  const metricNames = [
    "sessions",
    "activeUsers",
    "screenPageViews",
    "keyEvents",
    "bounceRate",
    "engagementRate",
  ];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/** Top páginas de un host concreto (opcional filter). */
export async function fetchTopPagesForHost(
  startDate: string,
  endDate: string,
  hostName: string,
  limit = 20,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["pagePath"];
  const metricNames = [
    "screenPageViews",
    "sessions",
    "activeUsers",
    "bounceRate",
  ];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: "hostName",
        stringFilter: {
          matchType: "EXACT",
          value: hostName,
          caseSensitive: false,
        },
      },
    },
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/**
 * Conversión get.adereso.ai = usuarios en get.adereso.ai/thank-you-page.
 * No usa adereso.ai ni otras landings.
 */
export async function fetchGetThankYouConversion(
  startDate: string,
  endDate: string,
): Promise<import("./types").GetThankYouConversion> {
  const host = "get.adereso.ai";
  const thankYouPath = "/thank-you-page";
  const client = createClient();

  const hostFilter = {
    filter: {
      fieldName: "hostName",
      stringFilter: {
        matchType: "EXACT" as const,
        value: host,
        caseSensitive: false,
      },
    },
  };

  const [[hostRes], [tyRes]] = await Promise.all([
    gaRunReport(client, {
      property: propertyPath(),
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      dimensionFilter: hostFilter,
    }),
    gaRunReport(client, {
      property: propertyPath(),
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            hostFilter,
            {
              filter: {
                fieldName: "pagePath",
                stringFilter: { matchType: "EXACT", value: thankYouPath },
              },
            },
          ],
        },
      },
    }),
  ]);

  const getUsers = hostRes.rows?.[0] ? metricValue(hostRes.rows[0], 0) : 0;
  const getSessions = hostRes.rows?.[0] ? metricValue(hostRes.rows[0], 1) : 0;
  const conversions = tyRes.rows?.[0] ? metricValue(tyRes.rows[0], 0) : 0;
  const conversionSessions = tyRes.rows?.[0]
    ? metricValue(tyRes.rows[0], 1)
    : 0;
  const conversionViews = tyRes.rows?.[0] ? metricValue(tyRes.rows[0], 2) : 0;

  return {
    host,
    thankYouPath,
    getUsers,
    getSessions,
    conversions,
    conversionSessions,
    conversionViews,
    rate: getUsers > 0 ? conversions / getUsers : 0,
    note:
      "Conversión get = solo llegada a get.adereso.ai/thank-you-page. Independiente del home de adereso.ai. Proxy hasta que existan key events propios de get.",
  };
}

const MAIN_SITE_HOSTS = ["adereso.ai", "www.adereso.ai"];

/**
 * Conversión sitio principal:
 * - /contacto → llegada a /thank-you-page
 * - Otras landings → Envío Form - HubSpot
 */
export async function fetchMainHubSpotConversion(
  startDate: string,
  endDate: string,
): Promise<import("./types").MainHubSpotConversion> {
  const eventName = "Envío Form - HubSpot";
  const client = createClient();

  const mainHostFilter = {
    orGroup: {
      expressions: MAIN_SITE_HOSTS.map((host) => ({
        filter: {
          fieldName: "hostName",
          stringFilter: {
            matchType: "EXACT" as const,
            value: host,
            caseSensitive: false,
          },
        },
      })),
    },
  };

  const eventFilter = {
    filter: {
      fieldName: "eventName",
      stringFilter: { matchType: "EXACT" as const, value: eventName },
    },
  };

  const contactoPathFilter = {
    orGroup: {
      expressions: [
        {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "EXACT" as const, value: "/contacto" },
          },
        },
        {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "EXACT" as const,
              value: "/contacto/",
            },
          },
        },
      ],
    },
  };

  const thankYouPath = "/thank-you-page";
  const thankYouPathFilter = {
    filter: {
      fieldName: "pagePath",
      stringFilter: { matchType: "EXACT" as const, value: thankYouPath },
    },
  };
  /** Solo conversiones cuyo referrer inmediato viene de /contacto (no todo el thank-you). */
  const fromContactoReferrerFilter = {
    filter: {
      fieldName: "pageReferrer",
      stringFilter: {
        matchType: "CONTAINS" as const,
        value: "/contacto",
        caseSensitive: false,
      },
    },
  };

  const [[contactoTraffic], [thankYouFromContacto], [allConv], [contactoConv], [byPage]] =
    await Promise.all([
      gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "activeUsers" }],
        dimensionFilter: {
          andGroup: {
            expressions: [mainHostFilter, contactoPathFilter],
          },
        },
      }),
      gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              mainHostFilter,
              thankYouPathFilter,
              fromContactoReferrerFilter,
            ],
          },
        },
      }),
      gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "eventCount" },
          { name: "totalUsers" },
          { name: "keyEvents" },
        ],
        dimensionFilter: {
          andGroup: {
            expressions: [mainHostFilter, eventFilter],
          },
        },
      }),
      gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        dimensionFilter: {
          andGroup: {
            expressions: [mainHostFilter, eventFilter, contactoPathFilter],
          },
        },
      }),
      gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "hostName" }, { name: "pagePath" }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        dimensionFilter: {
          andGroup: {
            expressions: [mainHostFilter, eventFilter],
          },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 15,
      }),
    ]);

  const contactoUsers = contactoTraffic.rows?.[0]
    ? metricValue(contactoTraffic.rows[0], 0)
    : 0;
  const thankYouUsers = thankYouFromContacto.rows?.[0]
    ? metricValue(thankYouFromContacto.rows[0], 0)
    : 0;
  const thankYouSessions = thankYouFromContacto.rows?.[0]
    ? metricValue(thankYouFromContacto.rows[0], 1)
    : 0;
  const conversions = allConv.rows?.[0] ? metricValue(allConv.rows[0], 0) : 0;
  const conversionUsers = allConv.rows?.[0]
    ? metricValue(allConv.rows[0], 1)
    : 0;
  const contactoConversions = contactoConv.rows?.[0]
    ? metricValue(contactoConv.rows[0], 0)
    : 0;
  const contactoConversionUsers = contactoConv.rows?.[0]
    ? metricValue(contactoConv.rows[0], 1)
    : 0;

  const byPageBase = (byPage.rows ?? []).map((row) => ({
    host: dimensionValue(row, 0),
    pagePath: dimensionValue(row, 1),
    eventCount: metricValue(row, 0),
    users: metricValue(row, 1),
  }));

  const pageTraffic = await Promise.all(
    byPageBase.map(async (p) => {
      const [res] = await gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: "activeUsers" }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: "hostName",
                  stringFilter: {
                    matchType: "EXACT",
                    value: p.host,
                    caseSensitive: false,
                  },
                },
              },
              {
                filter: {
                  fieldName: "pagePath",
                  stringFilter: {
                    matchType: "EXACT",
                    value: p.pagePath,
                  },
                },
              },
            ],
          },
        },
      });
      return res.rows?.[0] ? metricValue(res.rows[0], 0) : 0;
    }),
  );

  return {
    eventName,
    hosts: MAIN_SITE_HOSTS,
    thankYouPath,
    contactoUsers,
    thankYouUsers,
    thankYouSessions,
    rateVsContacto:
      contactoUsers > 0 ? thankYouUsers / contactoUsers : 0,
    conversions,
    conversionUsers,
    contactoConversions,
    contactoConversionUsers,
    byPage: byPageBase.map((p, i) => ({
      ...p,
      pageUsers: pageTraffic[i] ?? 0,
    })),
    note:
      "Conversión de /contacto = thank-you-page con referrer desde /contacto (no todo el thank-you del sitio). Otras páginas (ej. /vsl-2) siguen con Envío Form - HubSpot.",
  };
}

/**
 * Origen de las conversiones: canal + fuente/medio + landing URL.
 * `site` = página de referencia (host + path sin query), p.ej. get.adereso.ai,
 * adereso.ai/contacto, adereso.ai/vsl-2.
 * Si `byDate`, desglosa por día (dimensión date de GA4).
 */
export async function fetchConversionOrigins(
  startDate: string,
  endDate: string,
  options?: { byDate?: boolean },
): Promise<import("./types").ConversionOriginRow[]> {
  const client = createClient();
  const rows: import("./types").ConversionOriginRow[] = [];
  const byDate = Boolean(options?.byDate);
  const rowLimit = byDate ? 500 : 100;

  const getHostFilter = {
    filter: {
      fieldName: "hostName",
      stringFilter: {
        matchType: "EXACT" as const,
        value: "get.adereso.ai",
        caseSensitive: false,
      },
    },
  };

  const thankYouFilter = {
    filter: {
      fieldName: "pagePath",
      stringFilter: {
        matchType: "EXACT" as const,
        value: "/thank-you-page",
      },
    },
  };

  const fromContactoReferrerFilter = {
    filter: {
      fieldName: "pageReferrer",
      stringFilter: {
        matchType: "CONTAINS" as const,
        value: "/contacto",
        caseSensitive: false,
      },
    },
  };

  const mainHostFilter = {
    orGroup: {
      expressions: MAIN_SITE_HOSTS.map((host) => ({
        filter: {
          fieldName: "hostName",
          stringFilter: {
            matchType: "EXACT" as const,
            value: host,
            caseSensitive: false,
          },
        },
      })),
    },
  };

  const hubspotEventFilter = {
    filter: {
      fieldName: "eventName",
      stringFilter: {
        matchType: "EXACT" as const,
        value: "Envío Form - HubSpot",
      },
    },
  };

  const channelLandingDimensions = [
    ...(byDate ? [{ name: "date" }] : []),
    { name: "sessionDefaultChannelGroup" },
    { name: "sessionSource" },
    { name: "sessionMedium" },
    { name: "landingPagePlusQueryString" },
  ];

  const hubspotDimensions = [
    ...(byDate ? [{ name: "date" }] : []),
    { name: "hostName" },
    { name: "pagePath" },
    { name: "sessionDefaultChannelGroup" },
    { name: "sessionSource" },
    { name: "sessionMedium" },
    { name: "landingPagePlusQueryString" },
  ];

  const off = byDate ? 1 : 0;

  const [[getByChannel], [mainThankYouByChannel], [hubspotByPage]] =
    await Promise.all([
      gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        dimensions: channelLandingDimensions,
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        dimensionFilter: {
          andGroup: {
            expressions: [getHostFilter, thankYouFilter],
          },
        },
        orderBys: byDate
          ? [
              { dimension: { dimensionName: "date" }, desc: true },
              { metric: { metricName: "activeUsers" }, desc: true },
            ]
          : [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: rowLimit,
      }),
      gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        dimensions: channelLandingDimensions,
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              mainHostFilter,
              thankYouFilter,
              fromContactoReferrerFilter,
            ],
          },
        },
        orderBys: byDate
          ? [
              { dimension: { dimensionName: "date" }, desc: true },
              { metric: { metricName: "activeUsers" }, desc: true },
            ]
          : [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: rowLimit,
      }),
      gaRunReport(client, {
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        dimensions: hubspotDimensions,
        metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
        dimensionFilter: {
          andGroup: {
            expressions: [mainHostFilter, hubspotEventFilter],
          },
        },
        orderBys: byDate
          ? [
              { dimension: { dimensionName: "date" }, desc: true },
              { metric: { metricName: "totalUsers" }, desc: true },
            ]
          : [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: rowLimit,
      }),
    ]);

  const parseGaDate = (raw: string): string | undefined => {
    if (!/^\d{8}$/.test(raw)) return undefined;
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  };

  for (const row of getByChannel.rows ?? []) {
    rows.push({
      date: byDate ? parseGaDate(dimensionValue(row, 0)) : undefined,
      site: "get.adereso.ai",
      channel: dimensionValue(row, off + 0),
      source: dimensionValue(row, off + 1),
      medium: dimensionValue(row, off + 2),
      landingPage: dimensionValue(row, off + 3),
      users: metricValue(row, 0),
      sessionsOrEvents: metricValue(row, 1),
    });
  }

  for (const row of mainThankYouByChannel.rows ?? []) {
    rows.push({
      date: byDate ? parseGaDate(dimensionValue(row, 0)) : undefined,
      site: "adereso.ai/contacto",
      channel: dimensionValue(row, off + 0),
      source: dimensionValue(row, off + 1),
      medium: dimensionValue(row, off + 2),
      landingPage: dimensionValue(row, off + 3),
      users: metricValue(row, 0),
      sessionsOrEvents: metricValue(row, 1),
    });
  }

  for (const row of hubspotByPage.rows ?? []) {
    const host = normalizeOriginHost(dimensionValue(row, off + 0));
    const pagePath = stripQueryPath(dimensionValue(row, off + 1));
    // /contacto se mide por thank-you; no mezclar como HubSpot
    if (pagePath === "/contacto" || pagePath === "/contacto/") continue;

    rows.push({
      date: byDate ? parseGaDate(dimensionValue(row, 0)) : undefined,
      site: `${host}${pagePath || "/"}`,
      channel: dimensionValue(row, off + 2),
      source: dimensionValue(row, off + 3),
      medium: dimensionValue(row, off + 4),
      landingPage: dimensionValue(row, off + 5),
      users: metricValue(row, 0),
      sessionsOrEvents: metricValue(row, 1),
    });
  }

  return rows.sort((a, b) => {
    if (byDate) {
      const da = a.date ?? "";
      const db = b.date ?? "";
      if (da !== db) return db.localeCompare(da);
    }
    return b.users - a.users;
  });
}

export async function fetchConversionOriginsByDate(
  startDate: string,
  endDate: string,
): Promise<import("./types").ConversionOriginRow[]> {
  return fetchConversionOrigins(startDate, endDate, { byDate: true });
}

function normalizeOriginHost(host: string): string {
  const h = host.toLowerCase();
  if (h === "www.adereso.ai") return "adereso.ai";
  return h || "adereso.ai";
}

/** Path sin query ni trailing slash raro (excepto root). */
function stripQueryPath(path: string): string {
  const raw = (path || "/").split("?")[0] || "/";
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw;
}

/**
 * Landings / páginas con score de interés comercial (intención de compra/lead).
 */
export async function fetchLandingInterest(
  startDate: string,
  endDate: string,
): Promise<import("./types").LandingInterestRow[]> {
  const client = createClient();

  const interestHosts = [
    "adereso.ai",
    "www.adereso.ai",
    "get.adereso.ai",
    "lp.adereso.ai",
  ];
  const hostFilter = {
    orGroup: {
      expressions: interestHosts.map((host) => ({
        filter: {
          fieldName: "hostName",
          stringFilter: {
            matchType: "EXACT" as const,
            value: host,
            caseSensitive: false,
          },
        },
      })),
    },
  };

  const [[pages], [formStarts], [hubspot], [getThankYou]] = await Promise.all([
    gaRunReport(client, {
      property: propertyPath(),
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "hostName" }, { name: "pagePath" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "engagedSessions" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      dimensionFilter: hostFilter,
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 80,
    }),
    gaRunReport(client, {
      property: propertyPath(),
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "hostName" }, { name: "pagePath" }],
      metrics: [{ name: "totalUsers" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            hostFilter,
            {
              filter: {
                fieldName: "eventName",
                stringFilter: {
                  matchType: "EXACT",
                  value: "form_start",
                },
              },
            },
          ],
        },
      },
      limit: 50,
    }),
    gaRunReport(client, {
      property: propertyPath(),
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "hostName" }, { name: "pagePath" }],
      metrics: [{ name: "totalUsers" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            hostFilter,
            {
              filter: {
                fieldName: "eventName",
                stringFilter: {
                  matchType: "EXACT",
                  value: "Envío Form - HubSpot",
                },
              },
            },
          ],
        },
      },
      limit: 50,
    }),
    gaRunReport(client, {
      property: propertyPath(),
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "activeUsers" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: "hostName",
                stringFilter: {
                  matchType: "EXACT",
                  value: "get.adereso.ai",
                  caseSensitive: false,
                },
              },
            },
            {
              filter: {
                fieldName: "pagePath",
                stringFilter: {
                  matchType: "EXACT",
                  value: "/thank-you-page",
                },
              },
            },
          ],
        },
      },
    }),
  ]);

  const formByPage = new Map<string, number>();
  for (const row of formStarts.rows ?? []) {
    const host = normalizeOriginHost(dimensionValue(row, 0));
    const path = stripQueryPath(dimensionValue(row, 1));
    formByPage.set(`${host}${path}`, metricValue(row, 0));
  }

  const hubspotByPage = new Map<string, number>();
  for (const row of hubspot.rows ?? []) {
    const host = normalizeOriginHost(dimensionValue(row, 0));
    const path = stripQueryPath(dimensionValue(row, 1));
    hubspotByPage.set(`${host}${path}`, metricValue(row, 0));
  }

  const getTyUsers = getThankYou.rows?.[0]
    ? metricValue(getThankYou.rows[0], 0)
    : 0;

  // Contacto conversions = thank-you with referrer from /contacto
  const [contactoTy] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: "activeUsers" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            orGroup: {
              expressions: MAIN_SITE_HOSTS.map((host) => ({
                filter: {
                  fieldName: "hostName",
                  stringFilter: {
                    matchType: "EXACT" as const,
                    value: host,
                    caseSensitive: false,
                  },
                },
              })),
            },
          },
          {
            filter: {
              fieldName: "pagePath",
              stringFilter: {
                matchType: "EXACT",
                value: "/thank-you-page",
              },
            },
          },
          {
            filter: {
              fieldName: "pageReferrer",
              stringFilter: {
                matchType: "CONTAINS",
                value: "/contacto",
                caseSensitive: false,
              },
            },
          },
        ],
      },
    },
  });
  const contactoTyUsers = contactoTy.rows?.[0]
    ? metricValue(contactoTy.rows[0], 0)
    : 0;

  const rows: import("./types").LandingInterestRow[] = [];

  for (const row of pages.rows ?? []) {
    const rawHost = dimensionValue(row, 0);
    if (!isAllowedHost(rawHost)) continue;
    const host = normalizeOriginHost(rawHost);
    const pagePath = stripQueryPath(dimensionValue(row, 1));
    if (!isInterestCandidatePath(pagePath)) continue;

    const users = metricValue(row, 0);
    if (users < 10) continue;

    const sessions = metricValue(row, 1);
    const engagedSessions = metricValue(row, 2);
    const bounceRate = metricValue(row, 3);
    const avgSessionDuration = metricValue(row, 4);
    const pageKey = `${host}${pagePath}`;
    const formStartUsers = formByPage.get(pageKey) ?? 0;

    let conversionUsers = hubspotByPage.get(pageKey) ?? 0;
    if (host === "get.adereso.ai" && (pagePath === "/" || pagePath === "")) {
      conversionUsers = Math.max(conversionUsers, getTyUsers);
    }
    if (host === "adereso.ai" && pagePath === "/contacto") {
      conversionUsers = Math.max(conversionUsers, contactoTyUsers);
    }

    const scored = scoreLandingInterest({
      users,
      sessions,
      engagedSessions,
      bounceRate,
      avgSessionDuration,
      formStartUsers,
      conversionUsers,
    });

    rows.push({
      page: pageKey,
      host,
      pagePath,
      users,
      sessions,
      engagedSessions,
      bounceRate,
      avgSessionDuration,
      formStartUsers,
      conversionUsers,
      ...scored,
      priority: 0,
      priorityLevel: "low",
      priorityLabel: "Baja prioridad",
    });
  }

  const maxUsers = rows.reduce((m, r) => Math.max(m, r.users), 0);
  for (const row of rows) {
    const p = scoreLandingPriority(row.score, row.users, maxUsers);
    row.priority = p.priority;
    row.priorityLevel = p.priorityLevel;
    row.priorityLabel = p.priorityLabel;
  }

  return rows.sort(
    (a, b) => b.priority - a.priority || b.score - a.score || b.users - a.users,
  );
}

export async function fetchTrafficSources(
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = [
    "sessionSource",
    "sessionMedium",
    "sessionDefaultChannelGroup",
  ];
  const metricNames = [
    "sessions",
    "activeUsers",
    "engagedSessions",
    "keyEvents",
    "bounceRate",
  ];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/** Canal × fuente/medio × landing (para desglosar páginas por origen). */
export async function fetchTrafficSourceLandings(
  startDate: string,
  endDate: string,
  limit = 150,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = [
    "sessionDefaultChannelGroup",
    "sessionSource",
    "sessionMedium",
    "landingPage",
  ];
  const metricNames = ["sessions", "activeUsers", "keyEvents"];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

export async function fetchLandingPages(
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["landingPage"];
  const metricNames = [
    "sessions",
    "activeUsers",
    "keyEvents",
    "bounceRate",
    "engagementRate",
  ];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

export async function fetchConversionEvents(
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["eventName"];
  const metricNames = ["eventCount", "keyEvents", "totalUsers"];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: "isKeyEvent",
        stringFilter: { matchType: "EXACT", value: "true" },
      },
    },
    orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

export async function fetchConvertingPages(
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["pagePath", "eventName"];
  const metricNames = ["keyEvents", "eventCount", "totalUsers"];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: "isKeyEvent",
        stringFilter: { matchType: "EXACT", value: "true" },
      },
    },
    orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/** Eventos cuyo nombre contiene "form" (case-insensitive). */
export async function fetchFormEvents(
  startDate: string,
  endDate: string,
  limit = 50,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["eventName"];
  const metricNames = ["eventCount", "totalUsers", "keyEvents"];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: {
          matchType: "CONTAINS",
          value: "form",
          caseSensitive: false,
        },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/** Dónde ocurre form_start (páginas). */
export async function fetchFormStartByPage(
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["pagePath", "pageTitle"];
  const metricNames = ["eventCount", "totalUsers"];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "form_start" },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/** form_start por canal de adquisición (Organic, Paid, etc.). */
export async function fetchFormStartByChannel(
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["sessionDefaultChannelGroup"];
  const metricNames = ["eventCount", "totalUsers"];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "form_start" },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/** form_start por fuente / medio. */
export async function fetchFormStartBySource(
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = [
    "sessionSource",
    "sessionMedium",
    "sessionDefaultChannelGroup",
  ];
  const metricNames = ["eventCount", "totalUsers"];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "form_start" },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/** form_start: canal × página (para cruzar origen y dónde lo llenaron). */
export async function fetchFormStartByChannelAndPage(
  startDate: string,
  endDate: string,
  limit = 40,
): Promise<ReportRow[]> {
  const client = createClient();
  const dimensionNames = ["sessionDefaultChannelGroup", "pagePath"];
  const metricNames = ["eventCount", "totalUsers"];

  const [response] = await gaRunReport(client, {
    property: propertyPath(),
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensionNames.map((name) => ({ name })),
    metrics: metricNames.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "form_start" },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit,
  });

  return toRows(response, dimensionNames, metricNames);
}

/**
 * Eventos de formulario “esperados” vs reales, para ver cuáles funcionan.
 * Incluye nombres conocidos aunque tengan 0 en el periodo.
 */
export async function fetchFormEventHealth(
  startDate: string,
  endDate: string,
): Promise<
  Array<{
    eventName: string;
    eventCount: number;
    totalUsers: number;
    keyEvents: number;
    status: "active" | "inactive";
  }>
> {
  const watched = [
    "form_start",
    "form_submit",
    "hubspotFormSubmitted",
    "Envío Form - HubSpot",
  ];

  const live = await fetchFormEvents(startDate, endDate, 50);
  const byName = new Map(
    live.map((row) => [
      row.dimensions.eventName,
      {
        eventCount: row.metrics.eventCount ?? 0,
        totalUsers: row.metrics.totalUsers ?? 0,
        keyEvents: row.metrics.keyEvents ?? 0,
      },
    ]),
  );

  const names = new Set([...watched, ...live.map((r) => r.dimensions.eventName)]);

  return Array.from(names)
    .map((eventName) => {
      const stats = byName.get(eventName) ?? {
        eventCount: 0,
        totalUsers: 0,
        keyEvents: 0,
      };
      return {
        eventName,
        ...stats,
        status: (stats.eventCount > 0 ? "active" : "inactive") as
          | "active"
          | "inactive",
      };
    })
    .sort((a, b) => b.eventCount - a.eventCount);
}

function pathVariants(pagePath: string): string[] {
  if (pagePath === "/" || pagePath === "") return ["/"];
  const trimmed = pagePath.endsWith("/") ? pagePath.slice(0, -1) : pagePath;
  return [trimmed, `${trimmed}/`];
}

/**
 * GA4 funnel steps no aceptan pagePath (INVALID_ARGUMENT).
 * Usamos pageLocation: home exacto por URL; resto CONTAINS ://host/path.
 */
type PageLocationFunnelFilter = {
  funnelFieldFilter: {
    fieldName: string;
    stringFilter: {
      matchType: "EXACT" | "CONTAINS";
      value: string;
    };
  };
};

function pageLocationFilterExpression(
  hostNames: string[],
  pagePath: string,
) {
  const hosts = hostNames.length > 0 ? hostNames : ["adereso.ai"];
  const isHome = pagePath === "/" || pagePath === "";

  const expressions = hosts.flatMap((host): PageLocationFunnelFilter[] => {
    if (isHome) {
      return [
        {
          funnelFieldFilter: {
            fieldName: "pageLocation",
            stringFilter: {
              matchType: "EXACT",
              value: `https://${host}/`,
            },
          },
        },
        {
          funnelFieldFilter: {
            fieldName: "pageLocation",
            stringFilter: {
              matchType: "EXACT",
              value: `http://${host}/`,
            },
          },
        },
      ];
    }

    return pathVariants(pagePath).map((path) => ({
      funnelFieldFilter: {
        fieldName: "pageLocation",
        stringFilter: {
          matchType: "CONTAINS",
          value: `://${host}${path}`,
        },
      },
    }));
  });

  if (expressions.length === 1) return expressions[0];
  return { orGroup: { expressions } };
}

function buildFunnelStepFilter(step: FunnelStepConfig) {
  if (step.eventName) {
    return {
      funnelEventFilter: {
        eventName: step.eventName,
      },
    };
  }

  if (step.pagePath) {
    return pageLocationFilterExpression(step.hostNames ?? [], step.pagePath);
  }

  if (step.pagePathContains) {
    const hosts = step.hostNames?.length
      ? step.hostNames
      : ["adereso.ai", "www.adereso.ai"];
    const expressions = hosts.map((host) => ({
      funnelFieldFilter: {
        fieldName: "pageLocation",
        stringFilter: {
          matchType: "CONTAINS" as const,
          value: `://${host}${step.pagePathContains!.startsWith("/") ? "" : "/"}${step.pagePathContains}`,
        },
      },
    }));
    if (expressions.length === 1) return expressions[0];
    return { orGroup: { expressions } };
  }

  throw new Error(`Paso de embudo inválido: ${step.name}`);
}

function parseFunnelTableRows(
  rows: Array<{
    dimensionValues?: Array<{ value?: string | null }> | null;
    metricValues?: Array<{ value?: string | null }> | null;
  }>,
): FunnelStepResult[] {
  // Prefer RESERVED_TOTAL rows when a breakdown is present; otherwise take each step once.
  const byStep = new Map<string, FunnelStepResult>();

  for (const row of rows) {
    const stepName = row.dimensionValues?.[0]?.value ?? "";
    const breakdown = row.dimensionValues?.[1]?.value;
    if (breakdown && breakdown !== "RESERVED_TOTAL") continue;
    if (!stepName || byStep.has(stepName)) continue;

    byStep.set(stepName, {
      name: stepName.replace(/^\d+\.\s*/, ""),
      users: metricValue(row, 0),
      completionRate: metricValue(row, 1),
      abandonments: metricValue(row, 2),
    });
  }

  return Array.from(byStep.values());
}

export async function fetchFunnel(
  startDate: string,
  endDate: string,
  steps: FunnelStepConfig[] = getFunnelSteps(),
  meta?: { label?: string; description?: string },
): Promise<FunnelResult> {
  const client = createAlphaClient();

  try {
    const [response] = await gaRunFunnelReport(client, {
      property: propertyPath(),
      dateRanges: [{ startDate, endDate }],
      funnel: {
        steps: steps.map((step) => ({
          name: step.name,
          filterExpression: buildFunnelStepFilter(step),
        })),
      },
    });

    type RawRow = {
      dimensionValues?: Array<{ value?: string | null }> | null;
      metricValues?: Array<{ value?: string | null }> | null;
    };

    const tableRows = (response.funnelTable?.rows ?? []) as RawRow[];
    const vizRows = (response.funnelVisualization?.rows ?? []) as RawRow[];
    const parsed = parseFunnelTableRows(
      tableRows.length > 0 ? tableRows : vizRows,
    );

    if (parsed.length === 0 && vizRows.length > 0) {
      const fromViz = vizRows.map((row: RawRow) => ({
        name: (row.dimensionValues?.[0]?.value ?? "Paso").replace(
          /^\d+\.\s*/,
          "",
        ),
        users: metricValue(row, 0),
        completionRate: 0,
        abandonments: 0,
      }));
      const first = fromViz[0]?.users || 1;
      return {
        steps: fromViz.map((step, i) => ({
          ...step,
          completionRate: i === 0 ? 1 : step.users / first,
        })),
        configured: true,
        ...meta,
      };
    }

    return { steps: parsed, configured: true, ...meta };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo ejecutar el embudo.";
    return {
      steps: [],
      configured: true,
      message,
      ...meta,
    };
  }
}

export async function fetchConversionFunnel(
  startDate: string,
  endDate: string,
): Promise<FunnelResult> {
  return fetchFunnel(startDate, endDate, getFunnelSteps(), {
    label: "Conversión",
    description: "adereso.ai → Home → Contacto → Thank-you",
  });
}

export async function fetchInterestFunnel(
  startDate: string,
  endDate: string,
): Promise<FunnelResult> {
  return fetchFunnel(startDate, endDate, getInterestFunnelSteps(), {
    label: "Interés",
    description: "adereso.ai → Home → Pricing (+ siguientes páginas)",
  });
}

/**
 * Páginas siguientes tras el último paso del embudo de interés (Pricing).
 * La API limita nextAction a máx. 5 valores.
 */
export async function fetchInterestNextActions(
  startDate: string,
  endDate: string,
): Promise<NextActionRow[]> {
  const steps = getInterestFunnelSteps();
  const lastStep = steps[steps.length - 1];
  if (!lastStep) return [];

  const client = createAlphaClient();

  try {
    const [response] = await gaRunFunnelReport(client, {
      property: propertyPath(),
      dateRanges: [{ startDate, endDate }],
      funnel: {
        steps: steps.map((step) => ({
          name: step.name,
          filterExpression: buildFunnelStepFilter(step),
        })),
      },
      funnelNextAction: {
        nextActionDimension: { name: "pagePathPlusQueryString" },
        limit: 5,
      },
    });

    type RawRow = {
      dimensionValues?: Array<{ value?: string | null }> | null;
      metricValues?: Array<{ value?: string | null }> | null;
    };

    const rows = (response.funnelVisualization?.rows ?? []) as RawRow[];
    const lastName = lastStep.name.toLowerCase();

    return rows
      .map((row: RawRow) => {
        const fromStep = (
          row.dimensionValues?.[0]?.value ?? lastStep.name
        ).replace(/^\d+\.\s*/, "");
        return {
          fromStep,
          nextPage: row.dimensionValues?.[1]?.value ?? "(not set)",
          users: metricValue(row, 0),
        };
      })
      .filter((row) => {
        if (!row.nextPage || row.nextPage === "(not set)") return false;
        if (row.nextPage === "RESERVED_TOTAL") return false;
        if (row.nextPage === "(no next action)") return false;
        return row.fromStep.toLowerCase().includes(lastName);
      })
      .sort((a, b) => b.users - a.users);
  } catch {
    return [];
  }
}

/** @deprecated Prefer fetchInterestNextActions */
export async function fetchNextActions(
  startDate: string,
  endDate: string,
): Promise<NextActionRow[]> {
  return fetchInterestNextActions(startDate, endDate);
}
