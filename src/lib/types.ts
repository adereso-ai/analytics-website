export type DatePreset = "7d" | "28d" | "90d" | "custom";

export type DateRange = {
  startDate: string;
  endDate: string;
  preset: DatePreset;
  dayCount: number;
};

export type DateRangeMeta = {
  label: string;
  compareLabel: string;
  excludesToday: boolean;
  note: string;
};

export type ReportRow = {
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
};

export type OverviewStats = {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  keyEvents: number;
  bounceRate: number;
  averageSessionDuration: number;
};

/** Serie diaria del tráfico que llegó al home de adereso.ai. */
export type HomeTrafficPoint = {
  /** Fecha en calendario de la propiedad GA4 (YYYY-MM-DD). */
  date: string;
  sessions: number;
  activeUsers: number;
  screenPageViews: number;
};

export type MetricDelta = {
  current: number;
  previous: number;
  abs: number;
  pct: number | null;
};

export type OverviewWithCompare = {
  current: OverviewStats;
  previous: OverviewStats;
  deltas: {
    activeUsers: MetricDelta;
    sessions: MetricDelta;
    screenPageViews: MetricDelta;
    keyEvents: MetricDelta;
    bounceRate: MetricDelta;
    averageSessionDuration: MetricDelta;
  };
};

export type FunnelStepConfig = {
  name: string;
  /** Host(s) GA4; se combina con AND al path. */
  hostNames?: string[];
  pagePath?: string;
  pagePathContains?: string;
  eventName?: string;
};

export type FunnelStepResult = {
  name: string;
  users: number;
  completionRate: number;
  abandonments: number;
};

export type FunnelResult = {
  steps: FunnelStepResult[];
  configured: boolean;
  message?: string;
  /** Etiqueta corta para UI (ej. Conversión / Interés). */
  label?: string;
  /** Descripción de los pasos. */
  description?: string;
};

export type NextActionRow = {
  fromStep: string;
  nextPage: string;
  users: number;
};

export type DashboardMeta = {
  fetchedAt: string;
  propertyIdMasked: string | null;
  source: "Google Analytics Data API";
  timezoneNote: string;
};

/** Conversión get.adereso.ai: solo thank-you-page (proxy temporal). */
export type GetThankYouConversion = {
  host: string;
  thankYouPath: string;
  /** Tráfico del host get (denominador de contexto). */
  getUsers: number;
  getSessions: number;
  /** Conversión = usuarios que vieron thank-you en get. */
  conversions: number;
  conversionSessions: number;
  conversionViews: number;
  rate: number;
  note: string;
};

/** Conversión sitio principal: /contacto → thank-you (vía referrer) (+ HubSpot en otras páginas). */
export type MainHubSpotConversion = {
  eventName: string;
  hosts: string[];
  thankYouPath: string;
  /** Usuarios en /contacto (+ variantes) en hosts principales. */
  contactoUsers: number;
  /** Conversión contacto = thank-you-page con pageReferrer desde /contacto. */
  thankYouUsers: number;
  thankYouSessions: number;
  rateVsContacto: number;
  /** Envios HubSpot totales en hosts principales (otras landings). */
  conversions: number;
  conversionUsers: number;
  /** Envios HubSpot en páginas /contacto* (referencia; ya no es la regla principal). */
  contactoConversions: number;
  contactoConversionUsers: number;
  byPage: Array<{
    host: string;
    pagePath: string;
    eventCount: number;
    users: number;
    /** Usuarios únicos que visitaron esa página (denominador). */
    pageUsers: number;
  }>;
  note: string;
};

export type ConversionOriginRow = {
  /** Página de referencia: host + path sin query (ej. adereso.ai/vsl-2). */
  site: string;
  channel: string;
  source: string;
  medium: string;
  /** Landing de la sesión (path + query) desde la que entraron. */
  landingPage: string;
  users: number;
  sessionsOrEvents: number;
  /** Día de la conversión (YYYY-MM-DD), solo en vista por fecha. */
  date?: string;
};

export type InterestLevel = "high" | "medium" | "low";

export type InterestScoreParts = {
  engagementPts: number;
  bouncePts: number;
  timePts: number;
  formPts: number;
  conversionPts: number;
};

/** Landing / página evaluada por señales de interés comercial. */
export type LandingInterestRow = {
  page: string;
  host: string;
  pagePath: string;
  users: number;
  sessions: number;
  engagedSessions: number;
  engagementRate: number;
  bounceRate: number;
  avgSessionDuration: number;
  formStartUsers: number;
  formStartRate: number;
  conversionUsers: number;
  conversionRate: number;
  score: number;
  scoreParts: InterestScoreParts;
  level: InterestLevel;
  levelLabel: string;
  /** 0–100: interés × volumen relativo (qué conviene tocar primero). */
  priority: number;
  priorityLevel: InterestLevel;
  priorityLabel: string;
  reasons: string[];
};

export type ApiErrorBody = {
  error: string;
  setup?: boolean;
  details?: string;
};
