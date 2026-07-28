"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  IconChartBar,
  IconChartFunnel,
  IconChevronDown,
  IconCalendarEvent,
  IconFlame,
  IconForms,
  IconLayoutDashboard,
  IconLoader2,
  IconLogout,
  IconRefresh,
  IconRoute,
  IconServer,
  IconShieldCheck,
  IconTargetArrow,
  IconWorldWww,
} from "@tabler/icons-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { DataTable } from "@/components/DataTable";
import {
  DateRangePicker,
  type DateSelection,
} from "@/components/DateRangePicker";
import { FunnelViz } from "@/components/FunnelViz";
import { channelHelp, InfoTip, metricHeader } from "@/components/MetricHeader";
import {
  AI_CHANNEL_LABEL,
  aiPlatformLabel,
  displayChannelGroup,
} from "@/lib/aiTraffic";
import {
  formatDeltaPct,
  formatDuration,
  formatFetchedAt,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import type {
  ApiErrorBody,
  DashboardMeta,
  DateRange,
  DateRangeMeta,
  FunnelResult,
  GetThankYouConversion,
  ConversionOriginRow,
  MainHubSpotConversion,
  MetricDelta,
  NextActionRow,
  OverviewWithCompare,
  ReportRow,
  LandingInterestRow,
} from "@/lib/types";
import type { SessionUser } from "@/lib/auth/domain";

const font = "font-[family-name:var(--font-outfit)]";

type FormEventHealth = {
  eventName: string;
  eventCount: number;
  totalUsers: number;
  keyEvents: number;
  status: "active" | "inactive";
};

type DashboardData = {
  range: DateRange;
  compareRange: { startDate: string; endDate: string; dayCount: number };
  rangeMeta: DateRangeMeta;
  meta: DashboardMeta;
  overview: OverviewWithCompare;
  pages: ReportRow[];
  hosts: ReportRow[];
  sources: ReportRow[];
  sourceLandings: ReportRow[];
  landings: ReportRow[];
  conversions: ReportRow[];
  convertingPages: ReportRow[];
  funnel: FunnelResult;
  interestFunnel: FunnelResult;
  interestNextActions: NextActionRow[];
  formEvents: FormEventHealth[];
  formStartPages: ReportRow[];
  formStartChannels: ReportRow[];
  formStartSources: ReportRow[];
  formStartChannelPages: ReportRow[];
  getThankYouConversion: GetThankYouConversion;
  mainHubSpotConversion: MainHubSpotConversion;
  conversionOrigins: ConversionOriginRow[];
  conversionOriginsByDate: ConversionOriginRow[];
  landingInterest: LandingInterestRow[];
};

type SectionId =
  | "overview"
  | "domains"
  | "pages"
  | "traffic"
  | "forms"
  | "conversions"
  | "interest"
  | "funnel";

function initialSelection(): DateSelection {
  const end = subDays(new Date(), 1);
  const start = subDays(end, 27);
  return {
    preset: "28d",
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

const SECTIONS: {
  id: SectionId;
  label: string;
  hint: string;
  icon: typeof IconLayoutDashboard;
}[] = [
  {
    id: "overview",
    label: "Resumen",
    hint: "KPIs del periodo",
    icon: IconLayoutDashboard,
  },
  {
    id: "domains",
    label: "Dominios",
    hint: "Subdominios mapeados",
    icon: IconServer,
  },
  {
    id: "pages",
    label: "Páginas",
    hint: "Host + ruta",
    icon: IconWorldWww,
  },
  {
    id: "traffic",
    label: "Tráfico",
    hint: "Fuentes y landings",
    icon: IconRoute,
  },
  {
    id: "forms",
    label: "Formularios",
    hint: "form_start y envíos",
    icon: IconForms,
  },
  {
    id: "conversions",
    label: "Conversiones",
    hint: "Key events",
    icon: IconTargetArrow,
  },
  {
    id: "interest",
    label: "Interés",
    hint: "Intención por landing",
    icon: IconFlame,
  },
  {
    id: "funnel",
    label: "Embudo",
    hint: "Conversión e interés",
    icon: IconChartFunnel,
  },
];

export function Dashboard({ user }: { user: SessionUser }) {
  const [selection, setSelection] = useState<DateSelection>(initialSelection);
  const [section, setSection] = useState<SectionId>("overview");
  const [formTab, setFormTab] = useState<
    "health" | "pages" | "channels" | "sources" | "matrix"
  >("health");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [on, setOn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } finally {
      window.location.href = "/";
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const load = useCallback(async (sel: DateSelection) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        range: sel.preset,
        start: sel.startDate,
        end: sel.endDate,
      });
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const json = (await res.json()) as DashboardData & ApiErrorBody;
      if (!res.ok) {
        setData(null);
        setError({
          error: json.error || "No se pudo cargar el dashboard",
          setup: json.setup,
          details: json.details,
        });
        return;
      }
      setData(json);
      // Sync selection with server-resolved range (authoritative)
      setSelection({
        preset: json.range.preset,
        startDate: json.range.startDate,
        endDate: json.range.endDate,
      });
    } catch (err) {
      setError({
        error: "Error de red al consultar el dashboard",
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selection);
    // Intentionally only on mount; subsequent loads via onChange/refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = SECTIONS.find((s) => s.id === section)!;

  function handleDateChange(next: DateSelection) {
    setSelection(next);
    void load(next);
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#0C0C0D" }}>
      {/* Sidebar desktop */}
      <aside
        className="hidden md:flex w-[240px] shrink-0 flex-col border-r py-6 px-4"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "#0C0C0D",
        }}
      >
        <div className={`mb-8 px-2 hero-in ${on ? "on" : ""}`}>
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${font}`}
            style={{ color: "#ffd540" }}
          >
            Adereso
          </p>
          <h1
            className={`text-xl font-medium text-white mt-1 leading-snug ${font}`}
          >
            Analítica Web
          </h1>
          <p
            className="text-sm mt-1 leading-snug"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            GA4 · lecturas claras
          </p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {SECTIONS.map((item, i) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`hero-in ${on ? "on" : ""} flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200`}
                style={{
                  transitionDelay: `${0.05 * i}s`,
                  background: active
                    ? "rgba(255,213,64,0.1)"
                    : "transparent",
                  border: active
                    ? "1px solid rgba(255,213,64,0.25)"
                    : "1px solid transparent",
                }}
              >
                <Icon
                  size={20}
                  stroke={1.5}
                  style={{ color: active ? "#ffd540" : "rgba(255,255,255,0.55)" }}
                />
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-medium ${font}`}
                    style={{ color: active ? "#fff" : "rgba(255,255,255,0.75)" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="block text-xs truncate"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div
          className={`mt-4 border-t pt-4 px-1 hero-in ${on ? "on" : ""}`}
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="truncate px-2 text-xs text-white/40" title={user.email}>
            {user.email}
          </p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white/80 disabled:opacity-50"
          >
            <IconLogout size={18} stroke={1.5} />
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col relative">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(255,213,64,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Top bar */}
        <header
          className="relative z-50 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-4 md:px-8 pt-6 pb-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className={`hero-in ${on ? "on" : ""}`}>
            <div className="md:hidden mb-3">
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${font}`}
                style={{ color: "#ffd540" }}
              >
                Adereso · Analítica
              </p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${font}`}
                style={{
                  border: "1px solid rgba(255,213,64,0.25)",
                  background: "rgba(255,213,64,0.06)",
                  color: "#ffd540",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd540]" />
                {current.label}
              </span>
              {loading ? (
                <IconLoader2
                  size={16}
                  className="animate-spin"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                />
              ) : null}
            </div>
            <h2
              className={`text-2xl md:text-[2rem] font-medium text-white leading-snug tracking-[-0.02em] ${font}`}
            >
              {current.label}
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {data
                ? `${data.rangeMeta.label} · ${data.range.dayCount} días`
                : current.hint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker
              value={selection}
              onChange={handleDateChange}
              disabled={loading}
              compareLabel={data?.rangeMeta.compareLabel}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void load(selection)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${font}`}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
              }}
              title="Actualizar desde GA4"
            >
              <IconRefresh
                size={16}
                stroke={1.5}
                className={loading ? "animate-spin" : undefined}
              />
              Actualizar
            </button>
          </div>
        </header>

        {data ? (
          <div
            className="relative z-20 px-4 md:px-8 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div
              className="flex items-start gap-2 text-xs leading-snug"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <IconShieldCheck
                size={16}
                stroke={1.5}
                className="shrink-0 mt-0.5"
                style={{ color: "#ffd540" }}
              />
              <span>
                <strong className="text-white/80 font-medium">
                  Fuente fidedigna:
                </strong>{" "}
                {data.meta.source}
                {data.meta.propertyIdMasked
                  ? ` · Propiedad ${data.meta.propertyIdMasked}`
                  : ""}
                {" · "}
                Hasta ayer (día en curso excluido)
                {" · "}
                vs periodo previo {data.rangeMeta.compareLabel}
              </span>
            </div>
            <p
              className="text-xs shrink-0"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Actualizado {formatFetchedAt(data.meta.fetchedAt)}
            </p>
          </div>
        ) : null}

        {/* Mobile section nav */}
        <div
          className="md:hidden relative z-10 flex gap-2 overflow-x-auto app-scroll px-4 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {SECTIONS.map((item) => {
            const active = section === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium ${font}`}
                style={
                  active
                    ? {
                        backgroundColor: "#ffd540",
                        color: "#0C0C0D",
                      }
                    : {
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.7)",
                      }
                }
              >
                <Icon size={16} stroke={1.5} />
                {item.label}
              </button>
            );
          })}
        </div>

        <main className="relative z-10 flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1140px] w-full mx-auto">
          {error?.setup ? (
            <Panel>
              <h3 className={`text-xl font-medium text-white mb-3 ${font}`}>
                Conecta tu GA4
              </h3>
              <ol
                className="list-decimal pl-5 space-y-2 text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                <li>
                  Habilita <strong className="text-white">Google Analytics Data API</strong>{" "}
                  y usa un service account.
                </li>
                <li>
                  Dale rol <strong className="text-white">Viewer</strong> en GA4.
                </li>
                <li>
                  Completa <code>GA4_PROPERTY_ID</code> y credenciales en{" "}
                  <code>.env.local</code>.
                </li>
                <li>
                  Reinicia <code>pnpm dev</code>.
                </li>
              </ol>
            </Panel>
          ) : null}

          {error && !error.setup ? (
            <Panel>
              <h3 className={`text-xl font-medium text-white mb-2 ${font}`}>
                {error.error}
              </h3>
              {error.details ? (
                <pre
                  className="text-xs overflow-auto p-3 rounded-xl mb-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  {error.details}
                </pre>
              ) : null}
              <button
                type="button"
                onClick={() => void load(selection)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium text-neutral-900 ${font}`}
                style={{ backgroundColor: "#ffd540" }}
              >
                Reintentar
              </button>
            </Panel>
          ) : null}

          {loading && !data ? (
            <p
              className="text-sm flex items-center gap-2"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <IconLoader2 size={16} className="animate-spin" />
              Cargando reportes…
            </p>
          ) : null}

          {data ? (
            <div key={section} className={`hero-in ${on ? "on" : ""}`}>
              {section === "overview" ? (
                <OverviewSection data={data} />
              ) : null}
              {section === "domains" ? <DomainsSection data={data} /> : null}
              {section === "pages" ? <PagesSection data={data} /> : null}
              {section === "traffic" ? <TrafficSection data={data} /> : null}
              {section === "forms" ? (
                <FormsSection
                  data={data}
                  tab={formTab}
                  setTab={setFormTab}
                />
              ) : null}
              {section === "conversions" ? (
                <ConversionsSection data={data} />
              ) : null}
              {section === "interest" ? (
                <InterestSection data={data} />
              ) : null}
              {section === "funnel" ? <FunnelSection data={data} /> : null}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Panel({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section
      className="rounded-2xl p-5 md:p-6"
      style={{
        border: "1px solid rgba(255,255,255,0.07)",
        backgroundColor: "#131415",
      }}
    >
      {title ? (
        <header className="mb-4">
          <h3 className={`text-lg md:text-xl font-medium text-white ${font}`}>
            {title}
          </h3>
          {subtitle ? (
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {subtitle}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  delta,
  invert = false,
}: {
  label: string;
  value: string;
  delta?: MetricDelta;
  invert?: boolean;
}) {
  const up = delta ? delta.abs > 0 : false;
  const flat = !delta || delta.abs === 0;
  const positive = invert ? !up : up;
  const deltaColor = flat
    ? "rgba(255,255,255,0.4)"
    : positive
      ? "#7ddea0"
      : "#f07167";

  return (
    <div
      className="flex flex-col p-5 rounded-2xl"
      style={{
        border: "1px solid rgba(255,255,255,0.07)",
        backgroundColor: "#131415",
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {label}
      </span>
      <span
        className={`text-2xl md:text-3xl font-semibold leading-none ${font}`}
        style={{ color: "#ffd540" }}
      >
        {value}
      </span>
      {delta ? (
        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <span
            className={`text-sm font-semibold tabular-nums ${font}`}
            style={{ color: deltaColor }}
          >
            {formatDeltaPct(delta.pct)}
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            vs periodo anterior
          </span>
        </div>
      ) : null}
    </div>
  );
}

function StackCell({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <strong className={`text-white font-medium break-all ${font}`}>
        {primary}
      </strong>
      {secondary ? (
        <span
          className="text-xs leading-snug"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {secondary}
        </span>
      ) : null}
    </div>
  );
}

function OverviewSection({ data }: { data: DashboardData }) {
  const { current, deltas } = data.overview;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <MetricCard
          label="Usuarios"
          value={formatNumber(current.activeUsers)}
          delta={deltas.activeUsers}
        />
        <MetricCard
          label="Sesiones"
          value={formatNumber(current.sessions)}
          delta={deltas.sessions}
        />
        <MetricCard
          label="Vistas"
          value={formatNumber(current.screenPageViews)}
          delta={deltas.screenPageViews}
        />
        <MetricCard
          label="Key events"
          value={formatNumber(current.keyEvents)}
          delta={deltas.keyEvents}
        />
        <MetricCard
          label="Bounce rate"
          value={formatPercent(current.bounceRate)}
          delta={deltas.bounceRate}
          invert
        />
        <MetricCard
          label="Duración media"
          value={formatDuration(current.averageSessionDuration)}
          delta={deltas.averageSessionDuration}
        />
      </div>

      <Panel
        title="Criterios de lectura"
        subtitle="Cómo interpretamos los números para que sean comparables"
      >
        <ul
          className="space-y-2 text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <li>
            Periodo actual:{" "}
            <strong className="text-white/85">{data.rangeMeta.label}</strong> (
            {data.range.dayCount} días).
          </li>
          <li>
            Comparación: mismo largo de días inmediatamente anterior (
            {data.rangeMeta.compareLabel}).
          </li>
          <li>{data.rangeMeta.note}</li>
          <li>{data.meta.timezoneNote}</li>
        </ul>
      </Panel>

      <Panel
        title="Cómo usar este panel"
        subtitle="Elige una sección en la barra lateral. Cada vista muestra un tema a la vez."
      >
        <ul
          className="grid md:grid-cols-2 gap-3 text-sm"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {SECTIONS.filter((s) => s.id !== "overview").map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.id}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <Icon size={20} stroke={1.5} style={{ color: "#ffd540" }} />
                <span>
                  <strong className={`block text-white font-medium ${font}`}>
                    {s.label}
                  </strong>
                  {s.hint}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

function DomainsSection({ data }: { data: DashboardData }) {
  const hosts = data.hosts ?? [];
  const totalSessions = hosts.reduce(
    (sum, row) => sum + (row.metrics.sessions ?? 0),
    0,
  );

  const known = [
    "adereso.ai",
    "www.adereso.ai",
    "get.adereso.ai",
    "lp.adereso.ai",
    "vsl.adereso.ai",
  ];

  return (
    <div className="space-y-4">
      <Panel
        title="Dominios y subdominios"
        subtitle="Todo lo que reporta esta propiedad GA4 por hostname"
      >
        <DataTable
          rows={hosts}
          empty="Sin hostnames en este periodo."
          columns={[
            {
              key: "host",
              header: "Hostname",
              render: (r) => {
                const host = r.dimensions.hostName;
                const share =
                  totalSessions > 0
                    ? (r.metrics.sessions ?? 0) / totalSessions
                    : 0;
                const tag = known.includes(host)
                  ? host.startsWith("get.")
                    ? "Landing get"
                    : host.startsWith("lp.")
                      ? "Landing lp"
                      : host.startsWith("vsl.")
                        ? "VSL"
                        : host.startsWith("www.")
                          ? "WWW"
                          : "Sitio principal"
                  : "Otro";
                return (
                  <StackCell
                    primary={host}
                    secondary={`${tag} · ${formatPercent(share)} del tráfico`}
                  />
                );
              },
            },
            {
              key: "sessions",
              header: metricHeader("sesiones"),
              align: "right",
              render: (r) => formatNumber(r.metrics.sessions),
            },
            {
              key: "users",
              header: metricHeader("usuarios"),
              align: "right",
              render: (r) => formatNumber(r.metrics.activeUsers),
            },
            {
              key: "views",
              header: metricHeader("vistas"),
              align: "right",
              render: (r) => formatNumber(r.metrics.screenPageViews),
            },
            {
              key: "keys",
              header: "Key events",
              align: "right",
              render: (r) => formatNumber(r.metrics.keyEvents),
            },
            {
              key: "bounce",
              header: metricHeader("bounce"),
              align: "right",
              render: (r) => formatPercent(r.metrics.bounceRate),
            },
          ]}
        />
      </Panel>

      <Panel
        title="Lectura rápida"
        subtitle="Cómo interpretar esta vista"
      >
        <ul
          className="space-y-2 text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <li>
            <strong className="text-white/85">get.adereso.ai</strong> y{" "}
            <strong className="text-white/85">lp.adereso.ai</strong> sí están
            en esta propiedad; antes no se veían porque Páginas agrupaba solo
            por ruta.
          </li>
          <li>
            En <strong className="text-white/85">Páginas</strong> ahora cada
            fila es <code>hostname + ruta</code> (ej.{" "}
            <code>get.adereso.ai/</code> ≠ <code>adereso.ai/</code>).
          </li>
        </ul>
      </Panel>
    </div>
  );
}

function PagesSection({ data }: { data: DashboardData }) {
  const [hostFilter, setHostFilter] = useState<string>("all");
  const hosts = Array.from(
    new Set((data.pages ?? []).map((r) => r.dimensions.hostName).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const rows =
    hostFilter === "all"
      ? data.pages
      : data.pages.filter((r) => r.dimensions.hostName === hostFilter);

  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { id: "all", label: "Todos" },
          ...hosts.slice(0, 8).map((h) => ({
            id: h,
            label: h.replace(".adereso.ai", "").replace("adereso.ai", "main"),
          })),
        ]}
        value={hostFilter}
        onChange={setHostFilter}
      />
      <Panel
        title="Páginas más visitadas"
        subtitle="Agrupadas por hostname + ruta (sin mezclar subdominios)"
      >
        <DataTable
          rows={rows}
          columns={[
            {
              key: "path",
              header: "Página",
              render: (r) => (
                <StackCell
                  primary={`${r.dimensions.hostName}${r.dimensions.pagePath}`}
                  secondary={
                    r.dimensions.pagePath === "/"
                      ? `${r.dimensions.hostName} · Home`
                      : r.dimensions.hostName
                  }
                />
              ),
            },
            {
              key: "views",
              header: metricHeader("vistas"),
              align: "right",
              render: (r) => formatNumber(r.metrics.screenPageViews),
            },
            {
              key: "sessions",
              header: metricHeader("sesiones"),
              align: "right",
              render: (r) => formatNumber(r.metrics.sessions),
            },
            {
              key: "users",
              header: metricHeader("usuarios"),
              align: "right",
              render: (r) => formatNumber(r.metrics.activeUsers),
            },
            {
              key: "bounce",
              header: metricHeader("bounce"),
              align: "right",
              render: (r) => formatPercent(r.metrics.bounceRate),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

function TrafficSection({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<"sources" | "landings">("sources");
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const channelGroups = useMemo(() => {
    const totalSessions = data.sources.reduce(
      (sum, r) => sum + (r.metrics.sessions || 0),
      0,
    );
    const map = new Map<
      string,
      {
        sessions: number;
        users: number;
        keyEvents: number;
        sources: Map<
          string,
          {
            source: string;
            medium: string;
            sessions: number;
            users: number;
            keyEvents: number;
            pages: Map<
              string,
              {
                landing: string;
                sessions: number;
                users: number;
                keyEvents: number;
              }
            >;
          }
        >;
      }
    >();

    for (const r of data.sources) {
      const rawChannel = r.dimensions.sessionDefaultChannelGroup || "(not set)";
      const source = r.dimensions.sessionSource || "(not set)";
      const medium = r.dimensions.sessionMedium || "(not set)";
      const channel = displayChannelGroup({
        source,
        medium,
        channel: rawChannel,
      });
      let bucket = map.get(channel);
      if (!bucket) {
        bucket = { sessions: 0, users: 0, keyEvents: 0, sources: new Map() };
        map.set(channel, bucket);
      }
      bucket.sessions += r.metrics.sessions || 0;
      bucket.users += r.metrics.activeUsers || 0;
      bucket.keyEvents += r.metrics.keyEvents || 0;
      const srcKey = `${source}|${medium}`;
      let src = bucket.sources.get(srcKey);
      if (!src) {
        src = {
          source,
          medium,
          sessions: 0,
          users: 0,
          keyEvents: 0,
          pages: new Map(),
        };
        bucket.sources.set(srcKey, src);
      }
      src.sessions += r.metrics.sessions || 0;
      src.users += r.metrics.activeUsers || 0;
      src.keyEvents += r.metrics.keyEvents || 0;
    }

    for (const r of data.sourceLandings ?? []) {
      const rawChannel = r.dimensions.sessionDefaultChannelGroup || "(not set)";
      const source = r.dimensions.sessionSource || "(not set)";
      const medium = r.dimensions.sessionMedium || "(not set)";
      const channel = displayChannelGroup({
        source,
        medium,
        channel: rawChannel,
      });
      const landing = r.dimensions.landingPage || "/";
      let bucket = map.get(channel);
      if (!bucket) {
        bucket = { sessions: 0, users: 0, keyEvents: 0, sources: new Map() };
        map.set(channel, bucket);
      }
      const srcKey = `${source}|${medium}`;
      let src = bucket.sources.get(srcKey);
      if (!src) {
        src = {
          source,
          medium,
          sessions: 0,
          users: 0,
          keyEvents: 0,
          pages: new Map(),
        };
        bucket.sources.set(srcKey, src);
      }
      const prev = src.pages.get(landing);
      if (prev) {
        prev.sessions += r.metrics.sessions || 0;
        prev.users += r.metrics.activeUsers || 0;
        prev.keyEvents += r.metrics.keyEvents || 0;
      } else {
        src.pages.set(landing, {
          landing,
          sessions: r.metrics.sessions || 0,
          users: r.metrics.activeUsers || 0,
          keyEvents: r.metrics.keyEvents || 0,
        });
      }
    }

    return Array.from(map.entries())
      .map(([channel, ch]) => ({
        channel,
        sessions: ch.sessions,
        users: ch.users,
        keyEvents: ch.keyEvents,
        share: totalSessions > 0 ? ch.sessions / totalSessions : 0,
        isAi: channel === AI_CHANNEL_LABEL,
        sources: Array.from(ch.sources.entries())
          .map(([key, s]) => ({
            key,
            source: s.source,
            medium: s.medium,
            platform:
              channel === AI_CHANNEL_LABEL
                ? aiPlatformLabel(s.source)
                : null,
            sessions: s.sessions,
            users: s.users,
            keyEvents: s.keyEvents,
            pages: Array.from(s.pages.values())
              .sort((a, b) => b.sessions - a.sessions)
              .slice(0, 8),
          }))
          .sort((a, b) => b.sessions - a.sessions),
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [data.sources, data.sourceLandings]);

  const aiGroup = channelGroups.find((g) => g.isAi && g.sessions > 0);
  const maxChannelSessions = channelGroups[0]?.sessions ?? 0;

  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { id: "sources", label: "Fuentes" },
          { id: "landings", label: "Landings" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "sources" ? (
        <Panel
          title="De dónde vienen"
          subtitle="Canal → fuente/medio → landing · IA (ChatGPT, Perplexity…) agrupada aparte"
        >
          {aiGroup ? (
            <div
              className="mb-4 rounded-xl p-4"
              style={{
                border: "1px solid rgba(255,213,64,0.28)",
                background: "rgba(255,213,64,0.06)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`inline-flex items-center gap-1.5 text-sm font-medium text-white ${font}`}
                  >
                    Tráfico desde IA
                    <InfoTip
                      stopPropagation
                      {...channelHelp(AI_CHANNEL_LABEL)}
                    />
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    ChatGPT, Perplexity, Claude, Gemini y similares (referral o
                    UTM)
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xl font-semibold tabular-nums ${font}`}
                    style={{ color: "#ffd540" }}
                  >
                    {formatNumber(aiGroup.sessions)}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    sesiones · {formatNumber(aiGroup.users)} usuarios ·{" "}
                    {formatPercent(aiGroup.share)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {aiGroup.sources.slice(0, 6).map((s) => (
                  <span
                    key={s.key}
                    className={`text-xs px-2.5 py-1 rounded-full ${font}`}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {s.platform || s.source} · {formatNumber(s.sessions)}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className={`mt-3 text-xs font-medium ${font}`}
                style={{ color: "#ffd540" }}
                onClick={() => setExpandedChannel(AI_CHANNEL_LABEL)}
              >
                Ver desglose completo ↓
              </button>
            </div>
          ) : null}
          {channelGroups.length === 0 ? (
            <p
              className="text-sm py-6"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Sin fuentes en este periodo.
            </p>
          ) : (
            <div className="space-y-2">
              {channelGroups.map((g, i) => {
                const open = expandedChannel === g.channel;
                const barPct =
                  maxChannelSessions > 0
                    ? Math.max(4, (g.sessions / maxChannelSessions) * 100)
                    : 0;
                return (
                  <div
                    key={g.channel}
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedChannel(open ? null : g.channel)
                      }
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{
                        background: open
                          ? "rgba(255,213,64,0.06)"
                          : "transparent",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-semibold tabular-nums w-5 ${font}`}
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3 mb-2">
                            <span
                              className={`inline-flex items-center gap-1.5 min-w-0 text-sm font-medium text-white ${font}`}
                            >
                              <span className="truncate">{g.channel}</span>
                              <InfoTip
                                stopPropagation
                                {...channelHelp(g.channel)}
                              />
                            </span>
                            <span className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-sm font-semibold tabular-nums ${font}`}
                                style={{ color: "#ffd540" }}
                              >
                                {formatNumber(g.sessions)}
                              </span>
                              <span
                                className="text-xs tabular-nums"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                {formatPercent(g.share)}
                              </span>
                              <IconChevronDown
                                size={16}
                                stroke={1.5}
                                style={{
                                  color: "rgba(255,255,255,0.45)",
                                  transform: open
                                    ? "rotate(180deg)"
                                    : undefined,
                                  transition: "transform 0.15s ease",
                                }}
                              />
                            </span>
                          </div>
                          <div
                            className="h-2 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                          >
                            <div
                              className="h-full rounded-full transition-[width] duration-300"
                              style={{
                                width: `${barPct}%`,
                                background: "#ffd540",
                              }}
                            />
                          </div>
                          <div
                            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            <span>{formatNumber(g.users)} usuarios</span>
                            <span>
                              {formatNumber(g.keyEvents)} key events
                            </span>
                            <span>
                              {g.sources.length} fuente
                              {g.sources.length === 1 ? "" : "s"} / medio
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {open ? (
                      <div
                        className="px-4 pb-3 pt-1 space-y-3"
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          background: "rgba(0,0,0,0.2)",
                        }}
                      >
                        {g.sources.map((s) => {
                          const srcShare =
                            g.sessions > 0 ? s.sessions / g.sessions : 0;
                          return (
                            <div key={s.key} className="pl-8 space-y-1.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p
                                    className={`text-sm text-white truncate ${font}`}
                                  >
                                    {s.platform
                                      ? `${s.platform} · ${s.source} / ${s.medium}`
                                      : `${s.source} / ${s.medium}`}
                                  </p>
                                  <p
                                    className="text-xs"
                                    style={{
                                      color: "rgba(255,255,255,0.4)",
                                    }}
                                  >
                                    {formatNumber(s.users)} usuarios ·{" "}
                                    {formatNumber(s.keyEvents)} key events
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p
                                    className={`text-sm tabular-nums ${font}`}
                                    style={{
                                      color: "rgba(255,255,255,0.85)",
                                    }}
                                  >
                                    {formatNumber(s.sessions)}
                                  </p>
                                  <p
                                    className="text-xs tabular-nums"
                                    style={{
                                      color: "rgba(255,255,255,0.35)",
                                    }}
                                  >
                                    {formatPercent(srcShare)} del canal
                                  </p>
                                </div>
                              </div>
                              <div
                                className="h-1 rounded-full overflow-hidden"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                }}
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.max(3, srcShare * 100)}%`,
                                    background: "rgba(255,213,64,0.45)",
                                  }}
                                />
                              </div>
                              {s.pages.length > 0 ? (
                                <div className="space-y-1 pt-1">
                                  <p
                                    className="text-[11px] uppercase tracking-wide"
                                    style={{
                                      color: "rgba(255,255,255,0.35)",
                                    }}
                                  >
                                    Landings de entrada
                                  </p>
                                  {s.pages.map((p) => (
                                    <div
                                      key={p.landing}
                                      className="flex items-start justify-between gap-3 pl-3"
                                      style={{
                                        borderLeft:
                                          "2px solid rgba(255,213,64,0.25)",
                                      }}
                                    >
                                      <p
                                        className="text-xs leading-snug break-all min-w-0"
                                        style={{
                                          color: "rgba(255,255,255,0.55)",
                                        }}
                                        title={p.landing}
                                      >
                                        {p.landing}
                                      </p>
                                      <span
                                        className={`text-xs tabular-nums shrink-0 ${font}`}
                                        style={{
                                          color: "rgba(255,255,255,0.45)",
                                        }}
                                      >
                                        {formatNumber(p.sessions)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      ) : null}
      {tab === "landings" ? (
        <Panel title="Landings" subtitle="Primera página de la sesión">
          <DataTable
            rows={data.landings}
            columns={[
              {
                key: "landing",
                header: "Landing",
                render: (r) => (
                  <StackCell primary={r.dimensions.landingPage} />
                ),
              },
              {
                key: "sessions",
                header: metricHeader("sesiones"),
                align: "right",
                render: (r) => formatNumber(r.metrics.sessions),
              },
              {
                key: "keys",
                header: "Key events",
                align: "right",
                render: (r) => formatNumber(r.metrics.keyEvents),
              },
              {
                key: "eng",
                header: "Engagement",
                align: "right",
                render: (r) => formatPercent(r.metrics.engagementRate),
              },
            ]}
          />
        </Panel>
      ) : null}
    </div>
  );
}

function FormsSection({
  data,
  tab,
  setTab,
}: {
  data: DashboardData;
  tab: "health" | "pages" | "channels" | "sources" | "matrix";
  setTab: (
    t: "health" | "pages" | "channels" | "sources" | "matrix",
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SubTabs
        tabs={[
          { id: "health", label: "Estado" },
          { id: "pages", label: "Por página" },
          { id: "channels", label: "Por canal" },
          { id: "sources", label: "Fuente / medio" },
          { id: "matrix", label: "Canal × página" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "health" ? (
        <Panel
          title="Eventos de formulario"
          subtitle="Cuáles disparan en el periodo y cuáles no"
        >
          <DataTable
            rows={data.formEvents}
            columns={[
              {
                key: "event",
                header: "Evento",
                render: (r) => <StackCell primary={r.eventName} />,
              },
              {
                key: "status",
                header: "Estado",
                render: (r) => <StatusPill active={r.status === "active"} />,
              },
              {
                key: "count",
                header: "Eventos",
                align: "right",
                render: (r) => formatNumber(r.eventCount),
              },
              {
                key: "users",
                header: metricHeader("usuarios"),
                align: "right",
                render: (r) => formatNumber(r.totalUsers),
              },
              {
                key: "keys",
                header: "Key events",
                align: "right",
                render: (r) => formatNumber(r.keyEvents),
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "pages" ? (
        <Panel
          title="form_start por página"
          subtitle="Dónde empiezan a llenar el formulario"
        >
          <DataTable
            rows={data.formStartPages}
            columns={[
              {
                key: "page",
                header: "Página",
                render: (r) => (
                  <StackCell
                    primary={r.dimensions.pagePath}
                    secondary={r.dimensions.pageTitle}
                  />
                ),
              },
              {
                key: "count",
                header: "Eventos",
                align: "right",
                render: (r) => formatNumber(r.metrics.eventCount),
              },
              {
                key: "users",
                header: metricHeader("usuarios"),
                align: "right",
                render: (r) => formatNumber(r.metrics.totalUsers),
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "channels" ? (
        <Panel
          title="form_start por canal"
          subtitle="Organic, Paid, Direct, Referral…"
        >
          <DataTable
            rows={data.formStartChannels ?? []}
            columns={[
              {
                key: "channel",
                header: "Canal",
                render: (r) => (
                  <StackCell
                    primary={r.dimensions.sessionDefaultChannelGroup}
                  />
                ),
              },
              {
                key: "count",
                header: "Eventos",
                align: "right",
                render: (r) => formatNumber(r.metrics.eventCount),
              },
              {
                key: "users",
                header: metricHeader("usuarios"),
                align: "right",
                render: (r) => formatNumber(r.metrics.totalUsers),
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "sources" ? (
        <Panel title="form_start por fuente / medio">
          <DataTable
            rows={data.formStartSources ?? []}
            columns={[
              {
                key: "source",
                header: "Fuente / medio",
                render: (r) => (
                  <StackCell
                    primary={`${r.dimensions.sessionSource} / ${r.dimensions.sessionMedium}`}
                    secondary={r.dimensions.sessionDefaultChannelGroup}
                  />
                ),
              },
              {
                key: "count",
                header: "Eventos",
                align: "right",
                render: (r) => formatNumber(r.metrics.eventCount),
              },
              {
                key: "users",
                header: metricHeader("usuarios"),
                align: "right",
                render: (r) => formatNumber(r.metrics.totalUsers),
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "matrix" ? (
        <Panel
          title="Canal × página"
          subtitle="Origen de la sesión y página donde arranca el form"
        >
          <DataTable
            rows={data.formStartChannelPages ?? []}
            columns={[
              {
                key: "channel",
                header: "Canal",
                render: (r) => (
                  <StackCell
                    primary={r.dimensions.sessionDefaultChannelGroup}
                  />
                ),
              },
              {
                key: "page",
                header: "Página",
                render: (r) => r.dimensions.pagePath,
              },
              {
                key: "count",
                header: "Eventos",
                align: "right",
                render: (r) => formatNumber(r.metrics.eventCount),
              },
              {
                key: "users",
                header: metricHeader("usuarios"),
                align: "right",
                render: (r) => formatNumber(r.metrics.totalUsers),
              },
            ]}
          />
        </Panel>
      ) : null}
    </div>
  );
}

type ConversionPageRow = {
  id: string;
  page: string;
  site: string;
  rule: string;
  conversions: number;
  contextUsers: number | null;
  rate: number | null;
  converts: boolean;
};

function buildConversionPageRows(data: DashboardData): ConversionPageRow[] {
  const rows: ConversionPageRow[] = [];
  const get = data.getThankYouConversion;
  const main = data.mainHubSpotConversion;

  if (get) {
    rows.push({
      id: "get-landing",
      page: "get.adereso.ai",
      site: "Landing get",
      rule: "Llegó a /thank-you-page",
      conversions: get.conversions,
      contextUsers: get.getUsers,
      rate: get.rate,
      converts: get.conversions > 0,
    });
  }

  if (main) {
    const contactoKey = "adereso.ai/contacto";
    const contactoConv = main.thankYouUsers;
    const contactoTotal = main.contactoUsers;

    rows.push({
      id: "main-contacto",
      page: contactoKey,
      site: "adereso.ai",
      rule: "Thank-you desde /contacto",
      conversions: contactoConv,
      contextUsers: contactoTotal,
      rate:
        contactoTotal > 0
          ? contactoConv / contactoTotal
          : contactoTotal === 0 && contactoConv === 0
            ? 0
            : null,
      converts: contactoConv > 0,
    });

    for (const p of main.byPage) {
      const full = `${p.host}${p.pagePath}`;
      if (
        p.pagePath === "/contacto" ||
        p.pagePath === "/contacto/" ||
        full === contactoKey
      ) {
        continue;
      }
      const pageUsers = p.pageUsers ?? 0;
      rows.push({
        id: `hubspot-${full}`,
        page: full,
        site: p.host,
        rule: "Envío Form - HubSpot",
        conversions: p.users,
        contextUsers: pageUsers,
        rate: pageUsers > 0 ? p.users / pageUsers : null,
        converts: p.users > 0,
      });
    }
  }

  const seen = new Set(rows.map((r) => r.page));
  for (const r of data.convertingPages ?? []) {
    const path = r.dimensions.pagePath;
    const event = r.dimensions.eventName;
    if (!path || seen.has(path)) continue;
    if (event === "Envío Form - HubSpot") continue;
    rows.push({
      id: `key-${path}-${event}`,
      page: path,
      site: "GA4 key event",
      rule: event,
      conversions: r.metrics.keyEvents || r.metrics.totalUsers || 0,
      contextUsers: null,
      rate: null,
      converts: (r.metrics.keyEvents || 0) > 0,
    });
  }

  return rows.sort((a, b) => b.conversions - a.conversions);
}

type OriginLandingRow = {
  key: string;
  url: string;
  users: number;
  sessionsOrEvents: number;
};

type OriginBreakdownRow = {
  key: string;
  label: string;
  secondary?: string;
  users: number;
  sessionsOrEvents: number;
  landings: OriginLandingRow[];
};

type OriginGroup = {
  id: string;
  name: string;
  users: number;
  sessionsOrEvents: number;
  share: number;
  children: OriginBreakdownRow[];
};

function hostFromOriginSite(site: string): string {
  if (site.startsWith("get.")) return "get.adereso.ai";
  const slash = site.indexOf("/");
  if (slash > 0) return site.slice(0, slash);
  if (site.includes("adereso.ai")) return "adereso.ai";
  return site;
}

function formatOriginLandingUrl(site: string, landingPage: string): string {
  const path =
    !landingPage || landingPage === "(not set)" ? "/" : landingPage;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const host = hostFromOriginSite(site);
  return `${host}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatOriginDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "(sin fecha)";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return format(dt, "d MMM yyyy", { locale: es });
}

function groupOrigins(
  origins: ConversionOriginRow[],
  mode: "channel" | "site" | "date",
): OriginGroup[] {
  const total = origins.reduce((sum, o) => sum + o.users, 0);
  const groups = new Map<
    string,
    {
      users: number;
      sessionsOrEvents: number;
      children: Map<
        string,
        {
          label: string;
          secondary?: string;
          users: number;
          sessionsOrEvents: number;
          landings: Map<string, OriginLandingRow>;
        }
      >;
    }
  >();

  for (const row of origins) {
    const groupId =
      mode === "channel"
        ? row.channel || "(not set)"
        : mode === "site"
          ? row.site || "(not set)"
          : row.date || "(sin fecha)";
    let bucket = groups.get(groupId);
    if (!bucket) {
      bucket = { users: 0, sessionsOrEvents: 0, children: new Map() };
      groups.set(groupId, bucket);
    }
    bucket.users += row.users;
    bucket.sessionsOrEvents += row.sessionsOrEvents;

    const childKey =
      mode === "channel"
        ? `${row.site}|${row.source}|${row.medium}`
        : mode === "site"
          ? `${row.channel}|${row.source}|${row.medium}`
          : `${row.site}|${row.channel}|${row.source}|${row.medium}`;
    let child = bucket.children.get(childKey);
    if (!child) {
      child =
        mode === "channel"
          ? {
              label: `${row.source} / ${row.medium}`,
              secondary: row.site,
              users: 0,
              sessionsOrEvents: 0,
              landings: new Map(),
            }
          : mode === "site"
            ? {
                label: row.channel || "(not set)",
                secondary: `${row.source} / ${row.medium}`,
                users: 0,
                sessionsOrEvents: 0,
                landings: new Map(),
              }
            : {
                label: row.site || "(not set)",
                secondary: `${row.channel} · ${row.source} / ${row.medium}`,
                users: 0,
                sessionsOrEvents: 0,
                landings: new Map(),
              };
      bucket.children.set(childKey, child);
    }
    child.users += row.users;
    child.sessionsOrEvents += row.sessionsOrEvents;

    const url = formatOriginLandingUrl(row.site, row.landingPage);
    const landingKey = url;
    const prevLanding = child.landings.get(landingKey);
    if (prevLanding) {
      prevLanding.users += row.users;
      prevLanding.sessionsOrEvents += row.sessionsOrEvents;
    } else {
      child.landings.set(landingKey, {
        key: landingKey,
        url,
        users: row.users,
        sessionsOrEvents: row.sessionsOrEvents,
      });
    }
  }

  const mapped = Array.from(groups.entries()).map(([id, data]) => ({
    id,
    name: mode === "date" ? formatOriginDate(id) : id,
    users: data.users,
    sessionsOrEvents: data.sessionsOrEvents,
    share: total > 0 ? data.users / total : 0,
    children: Array.from(data.children.entries())
      .map(([key, c]) => ({
        key,
        label: c.label,
        secondary: c.secondary,
        users: c.users,
        sessionsOrEvents: c.sessionsOrEvents,
        landings: Array.from(c.landings.values()).sort(
          (a, b) => b.users - a.users,
        ),
      }))
      .sort((a, b) => b.users - a.users),
  }));

  if (mode === "date") {
    return mapped.sort((a, b) => b.id.localeCompare(a.id));
  }
  return mapped.sort((a, b) => b.users - a.users);
}

function ConversionsSection({ data }: { data: DashboardData }) {
  const rows = buildConversionPageRows(data);
  const origins = data.conversionOrigins ?? [];
  const originsByDate = data.conversionOriginsByDate ?? [];
  const [view, setView] = useState<"detail" | "channel" | "site" | "date">(
    "detail",
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const groupedSource = view === "date" ? originsByDate : origins;
  const groups = useMemo(
    () =>
      view === "detail" ? [] : groupOrigins(groupedSource, view),
    [groupedSource, view],
  );
  const maxUsers = useMemo(
    () => Math.max(0, ...groups.map((g) => g.users)),
    [groups],
  );
  const hasDateData = originsByDate.length > 0;

  useEffect(() => {
    setExpanded(null);
  }, [view]);

  const tabStyle = (active: boolean, enabled = true) =>
    ({
      background: !enabled
        ? "rgba(255,255,255,0.04)"
        : active
          ? "rgba(255,213,64,0.12)"
          : "transparent",
      border: !enabled
        ? "1px solid rgba(255,255,255,0.08)"
        : active
          ? "1px solid rgba(255,213,64,0.35)"
          : "1px solid rgba(255,255,255,0.1)",
      color: !enabled
        ? "rgba(255,255,255,0.35)"
        : active
          ? "#ffd540"
          : "rgba(255,255,255,0.55)",
      cursor: enabled ? "pointer" : "not-allowed",
    }) as const;

  const viewLabel =
    view === "channel"
      ? "canal"
      : view === "site"
        ? "sitio"
        : view === "date"
          ? "fecha"
          : "";

  return (
    <div className="space-y-4">
      <Panel title="Conversiones">
        <DataTable
          rows={rows}
          empty="Sin filas de conversión para este periodo."
          columns={[
            {
              key: "page",
              header: "Página / sitio",
              render: (r) => (
                <StackCell primary={r.page} secondary={r.site} />
              ),
            },
            {
              key: "rule",
              header: "Cómo cuenta la conversión",
              render: (r) => (
                <span
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  {r.rule}
                </span>
              ),
            },
            {
              key: "status",
              header: "Estado",
              render: (r) => (
                <StatusPill
                  active={r.converts}
                  activeLabel="Convierte"
                  inactiveLabel="No convierte"
                />
              ),
            },
            {
              key: "conversions",
              header: "Usuarios que convirtieron",
              align: "right",
              render: (r) => formatNumber(r.conversions),
            },
            {
              key: "context",
              header: "Usuarios únicos totales",
              align: "right",
              render: (r) =>
                r.contextUsers !== null ? formatNumber(r.contextUsers) : "—",
            },
            {
              key: "rate",
              header: "Tasa de conversión",
              align: "right",
              render: (r) =>
                r.rate !== null ? formatPercent(r.rate) : "—",
            },
          ]}
        />
      </Panel>

      <Panel
        title="Origen de las conversiones"
        subtitle="Etiqueta = página de conversión (path sin query)"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView("detail")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium ${font}`}
            style={tabStyle(view === "detail")}
          >
            Detalle
          </button>
          <button
            type="button"
            onClick={() => setView("channel")}
            disabled={origins.length === 0}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium ${font}`}
            style={tabStyle(view === "channel", origins.length > 0)}
          >
            <IconChartBar size={18} stroke={1.5} />
            Por canal
          </button>
          <button
            type="button"
            onClick={() => setView("site")}
            disabled={origins.length === 0}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium ${font}`}
            style={tabStyle(view === "site", origins.length > 0)}
          >
            <IconWorldWww size={18} stroke={1.5} />
            Por sitio
          </button>
          <button
            type="button"
            onClick={() => setView("date")}
            disabled={!hasDateData}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium ${font}`}
            style={tabStyle(view === "date", hasDateData)}
          >
            <IconCalendarEvent size={18} stroke={1.5} />
            Por fecha
          </button>
        </div>

        {view === "detail" ? (
          <DataTable
            rows={origins}
            empty="Sin origen de conversiones en este periodo."
            columns={[
              {
                key: "site",
                header: "Sitio",
                render: (r) => <strong className={font}>{r.site}</strong>,
              },
              {
                key: "channel",
                header: "Canal",
                render: (r) => (
                  <StackCell
                    primary={r.channel}
                    secondary={`${r.source} / ${r.medium}`}
                  />
                ),
              },
              {
                key: "landing",
                header: "URL de entrada",
                render: (r) => (
                  <span
                    className="text-sm break-all"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                    title={formatOriginLandingUrl(r.site, r.landingPage)}
                  >
                    {formatOriginLandingUrl(r.site, r.landingPage)}
                  </span>
                ),
              },
              {
                key: "users",
                header: "Usuarios que convirtieron",
                align: "right",
                render: (r) => formatNumber(r.users),
              },
              {
                key: "vol",
                header: "Sesiones / eventos",
                align: "right",
                render: (r) => formatNumber(r.sessionsOrEvents),
              },
            ]}
          />
        ) : groups.length === 0 ? (
          <p
            className="text-sm py-6 text-center"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Sin conversiones para este periodo.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>
              {view === "date"
                ? "Días con conversión · más reciente primero · click para ver sitio / landing"
                : `Ranking por ${viewLabel} · click para desglosar fuente / medio y URL de entrada`}
            </p>
            {groups.map((g, i) => {
              const open = expanded === g.id;
              const barPct =
                maxUsers > 0 ? Math.max(4, (g.users / maxUsers) * 100) : 0;
              return (
                <div
                  key={g.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : g.id)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{
                      background: open
                        ? "rgba(255,213,64,0.06)"
                        : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold tabular-nums w-5 ${font}`}
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3 mb-2">
                          <span
                            className={`text-sm font-medium text-white truncate ${font}`}
                          >
                            {g.name}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-sm font-semibold tabular-nums ${font}`}
                              style={{ color: "#ffd540" }}
                            >
                              {formatNumber(g.users)}
                            </span>
                            <span
                              className="text-xs tabular-nums"
                              style={{ color: "rgba(255,255,255,0.4)" }}
                            >
                              {formatPercent(g.share)}
                            </span>
                            <IconChevronDown
                              size={16}
                              stroke={1.5}
                              style={{
                                color: "rgba(255,255,255,0.45)",
                                transform: open ? "rotate(180deg)" : undefined,
                                transition: "transform 0.15s ease",
                              }}
                            />
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barPct}%`,
                              background: "#ffd540",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>

                  {open ? (
                    <div
                      className="px-4 pb-3 pt-1 space-y-3"
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(0,0,0,0.2)",
                      }}
                    >
                      {g.children.map((child) => (
                        <div key={child.key} className="pl-8 space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p
                                className={`text-sm text-white truncate ${font}`}
                              >
                                {child.label}
                              </p>
                              {child.secondary ? (
                                <p
                                  className="text-xs truncate"
                                  style={{ color: "rgba(255,255,255,0.4)" }}
                                >
                                  {child.secondary}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right shrink-0">
                              <p
                                className={`text-sm tabular-nums ${font}`}
                                style={{ color: "rgba(255,255,255,0.85)" }}
                              >
                                {formatNumber(child.users)}
                              </p>
                              <p
                                className="text-xs tabular-nums"
                                style={{ color: "rgba(255,255,255,0.35)" }}
                              >
                                {formatNumber(child.sessionsOrEvents)} ses./ev.
                              </p>
                            </div>
                          </div>
                          {child.landings.map((landing) => (
                            <div
                              key={landing.key}
                              className="flex items-start justify-between gap-3 pl-3"
                              style={{
                                borderLeft: "2px solid rgba(255,213,64,0.25)",
                              }}
                            >
                              <p
                                className="text-xs leading-snug break-all min-w-0"
                                style={{ color: "rgba(255,255,255,0.55)" }}
                                title={landing.url}
                              >
                                {landing.url}
                              </p>
                              <span
                                className={`text-xs tabular-nums shrink-0 ${font}`}
                                style={{ color: "rgba(255,255,255,0.45)" }}
                              >
                                {formatNumber(landing.users)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function InterestSection({ data }: { data: DashboardData }) {
  const rows = data.landingInterest ?? [];
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered =
    filter === "all" ? rows : rows.filter((r) => r.level === filter);
  const counts = {
    high: rows.filter((r) => r.level === "high").length,
    medium: rows.filter((r) => r.level === "medium").length,
    low: rows.filter((r) => r.level === "low").length,
  };

  const pill = (level: LandingInterestRow["level"]) => {
    if (level === "high") {
      return {
        bg: "rgba(255,213,64,0.14)",
        border: "rgba(255,213,64,0.35)",
        color: "#ffd540",
        label: "Alta intención",
      };
    }
    if (level === "medium") {
      return {
        bg: "rgba(255,255,255,0.06)",
        border: "rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.75)",
        label: "Interés medio",
      };
    }
    return {
      bg: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.45)",
      label: "Bajo interés",
    };
  };

  const priorityPill = (level: LandingInterestRow["priorityLevel"]) => {
    if (level === "high") {
      return {
        bg: "rgba(255,213,64,0.14)",
        border: "rgba(255,213,64,0.35)",
        color: "#ffd540",
      };
    }
    if (level === "medium") {
      return {
        bg: "rgba(255,255,255,0.06)",
        border: "rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.75)",
      };
    }
    return {
      bg: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.45)",
    };
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Interés por landing"
        subtitle="Cruzamos interés × volumen · ordenado por prioridad · click una fila para el desglose"
      >
        <div
          className="rounded-xl p-4 mb-4 text-sm leading-relaxed space-y-3"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.2)",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <p className={`text-white font-medium ${font}`}>
            Qué datos cruzamos (todo viene de GA4)
          </p>
          <div className="overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr style={{ color: "rgba(255,255,255,0.4)" }}>
                  <th className={`py-1.5 pr-3 font-semibold ${font}`}>
                    Aporte
                  </th>
                  <th className={`py-1.5 pr-3 font-semibold ${font}`}>
                    Dato GA4
                  </th>
                  <th className={`py-1.5 font-semibold ${font}`}>Pts máx</th>
                </tr>
              </thead>
              <tbody style={{ color: "rgba(255,255,255,0.65)" }}>
                <tr>
                  <td className="py-1.5 pr-3 text-white">Engagement</td>
                  <td className="py-1.5 pr-3">
                    engagedSessions ÷ sessions en esa página
                  </td>
                  <td className="py-1.5">25</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-white">Anti-rebote</td>
                  <td className="py-1.5 pr-3">
                    1 − bounceRate (menos rebote = más puntos)
                  </td>
                  <td className="py-1.5">15</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-white">Tiempo</td>
                  <td className="py-1.5 pr-3">
                    averageSessionDuration (lleno a los 2 min)
                  </td>
                  <td className="py-1.5">15</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-white">Form start</td>
                  <td className="py-1.5 pr-3">
                    usuarios con evento form_start ÷ usuarios página
                  </td>
                  <td className="py-1.5">25</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-white">Conversión</td>
                  <td className="py-1.5 pr-3">
                    HubSpot en esa URL, o thank-you (get / contacto) ÷
                    usuarios
                  </td>
                  <td className="py-1.5">25</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong className="text-white">Nota = suma de esos 5.</strong> El
            nivel Alta/Media/Baja además fuerza “Alta” si ya convierte o si
            form_start ≥ 10%.
          </p>
          <p>
            <strong className="text-white">Prioridad = nota × √(usuarios ÷ máx).</strong>{" "}
            Cruza interés con volumen relativo del listado: sube lo caliente con
            tráfico y baja interés medio con poca visita. La lista ordena por
            prioridad.
          </p>
          <details className="mt-3 pt-3 group" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <summary
              className={`cursor-pointer list-none flex items-center justify-between gap-2 text-sm font-medium text-white select-none ${font}`}
            >
              <span>Glosario</span>
              <IconChevronDown
                size={16}
                stroke={1.5}
                className="shrink-0 transition-transform group-open:rotate-180"
                style={{ color: "rgba(255,255,255,0.45)" }}
              />
            </summary>
            <div className="mt-2 space-y-1.5 text-xs leading-relaxed">
              <p>
                <strong className="text-white">Engagement:</strong> sesión que
                interactuó (≥10s, 2+ páginas o un key event). Acá: engaged ÷
                sesiones.
              </p>
              <p>
                <strong className="text-white">Rebote:</strong> % de sesiones sin
                engagement. Anti-rebote = lo contrario (menos rebote = mejor).
              </p>
              <p>
                <strong className="text-white">Tiempo:</strong> duración media de
                la sesión en esa página (GA4). A los ~2 min ya suma el máximo.
              </p>
              <p>
                <strong className="text-white">Form start:</strong> tocó un campo
                del form (no es envío). Casi solo en /contacto.
              </p>
              <p>
                <strong className="text-white">Conversión:</strong> lead real —
                HubSpot en esa URL, o thank-you en get / desde contacto.
              </p>
              <p>
                <strong className="text-white">Usuarios:</strong> activeUsers de
                esa página; denominador de form y conversión.
              </p>
              <p>
                <strong className="text-white">Prioridad:</strong> nota × √(share
                de usuarios vs la página con más tráfico). Alta ≥40, media ≥18.
                Qué conviene tocar primero; no reemplaza el nivel de interés.
              </p>
            </div>
          </details>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              { id: "all" as const, label: `Todas (${rows.length})` },
              { id: "high" as const, label: `Alta (${counts.high})` },
              { id: "medium" as const, label: `Media (${counts.medium})` },
              { id: "low" as const, label: `Baja (${counts.low})` },
            ] as const
          ).map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${font}`}
                style={
                  active
                    ? {
                        background: "rgba(255,213,64,0.12)",
                        border: "1px solid rgba(255,213,64,0.3)",
                        color: "#ffd540",
                      }
                    : {
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.55)",
                        background: "transparent",
                      }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p
            className="text-sm py-6"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Sin landings con tráfico suficiente (≥10 usuarios).
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const open = expanded === r.page;
              const s = pill(r.level);
              const p = priorityPill(r.priorityLevel ?? "low");
              const parts = r.scoreParts ?? {
                engagementPts: 0,
                bouncePts: 0,
                timePts: 0,
                formPts: 0,
                conversionPts: 0,
              };
              const breakdown = [
                {
                  label: "Engagement",
                  pts: parts.engagementPts,
                  max: 25,
                  detail: formatPercent(r.engagementRate),
                },
                {
                  label: "Anti-rebote",
                  pts: parts.bouncePts,
                  max: 15,
                  detail: `rebote ${formatPercent(r.bounceRate)}`,
                },
                {
                  label: "Tiempo",
                  pts: parts.timePts,
                  max: 15,
                  detail: formatDuration(r.avgSessionDuration),
                },
                {
                  label: "Form start",
                  pts: parts.formPts,
                  max: 25,
                  detail:
                    r.formStartUsers > 0
                      ? `${formatNumber(r.formStartUsers)} · ${formatPercent(r.formStartRate)}`
                      : "sin form_start",
                },
                {
                  label: "Conversión",
                  pts: parts.conversionPts,
                  max: 25,
                  detail:
                    r.conversionUsers > 0
                      ? `${formatNumber(r.conversionUsers)} · ${formatPercent(r.conversionRate)}`
                      : "sin conversión",
                },
              ];
              const vibe =
                r.score >= 55
                  ? "caliente"
                  : r.score >= 35
                    ? "tibio"
                    : "frío";

              return (
                <div
                  key={r.page}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : r.page)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{
                      background: open
                        ? "rgba(255,213,64,0.06)"
                        : "transparent",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium text-white truncate ${font}`}
                        >
                          {r.page}
                        </p>
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          {r.reasons[0]} · {formatNumber(r.users)} usuarios
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${font}`}
                          style={{
                            background: s.bg,
                            border: `1px solid ${s.border}`,
                            color: s.color,
                          }}
                        >
                          {s.label}
                        </span>
                        <div className="text-right min-w-[52px]">
                          <p
                            className={`text-lg font-semibold tabular-nums leading-none ${font}`}
                            style={{ color: "#ffd540" }}
                          >
                            {r.score}
                          </p>
                          <p
                            className="text-[11px] mt-0.5"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            nota · {vibe}
                          </p>
                        </div>
                        <div
                          className="text-right min-w-[64px] pl-2"
                          style={{
                            borderLeft: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <p
                            className={`text-lg font-semibold tabular-nums leading-none ${font}`}
                            style={{ color: p.color }}
                          >
                            {r.priority ?? 0}
                          </p>
                          <p
                            className="text-[11px] mt-0.5"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            prioridad
                          </p>
                        </div>
                        <IconChevronDown
                          size={16}
                          stroke={1.5}
                          style={{
                            color: "rgba(255,255,255,0.45)",
                            transform: open ? "rotate(180deg)" : undefined,
                            transition: "transform 0.15s ease",
                          }}
                        />
                      </div>
                    </div>
                  </button>

                  {open ? (
                    <div
                      className="px-4 pb-4 pt-1 space-y-2"
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(0,0,0,0.22)",
                      }}
                    >
                      <p
                        className="text-xs mb-2"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        Desglose de la nota {r.score} = suma de estos aportes ·
                        prioridad {r.priority ?? 0} (
                        {r.priorityLabel ?? "Baja prioridad"})
                      </p>
                      {breakdown.map((b) => (
                        <div
                          key={b.label}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span
                            className={`w-[110px] shrink-0 ${font}`}
                            style={{ color: "rgba(255,255,255,0.75)" }}
                          >
                            {b.label}
                          </span>
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(4, (b.pts / b.max) * 100)}%`,
                                background:
                                  b.pts > 0
                                    ? "#ffd540"
                                    : "rgba(255,255,255,0.12)",
                              }}
                            />
                          </div>
                          <span
                            className={`w-14 text-right tabular-nums shrink-0 ${font}`}
                            style={{ color: "#ffd540" }}
                          >
                            +{b.pts}
                            <span
                              style={{ color: "rgba(255,255,255,0.3)" }}
                            >
                              /{b.max}
                            </span>
                          </span>
                          <span
                            className="w-[140px] text-right text-xs truncate shrink-0"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {b.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function FunnelSection({ data }: { data: DashboardData }) {
  const conversion = data.funnel;
  const interest = data.interestFunnel ?? {
    steps: [],
    configured: true,
    label: "Interés",
    description: "adereso.ai → Home → Pricing",
  };
  const nextActions = data.interestNextActions ?? [];
  const nextMax = Math.max(...nextActions.map((r) => r.users), 1);

  return (
    <div className="space-y-4">
      <Panel
        title="Embudo de conversión"
        subtitle={
          conversion.description ??
          "adereso.ai · Home → Contacto → Thank-you"
        }
      >
        <p
          className="text-sm mb-4 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Usuarios que en la misma sesión visitaron home, luego{" "}
          <code className="text-white/70">/contacto</code> y después{" "}
          <code className="text-white/70">/thank-you-page</code> (solo
          adereso.ai / www).
        </p>
        <FunnelViz steps={conversion.steps} message={conversion.message} />
      </Panel>

      <Panel
        title="Embudo de interés"
        subtitle={
          interest.description ?? "adereso.ai · Home → Pricing"
        }
      >
        <p
          className="text-sm mb-4 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Quién llegó al home y pasó a{" "}
          <code className="text-white/70">/pricing</code>. Abajo: top páginas
          siguientes tras pricing (límite GA4: 5).
        </p>
        <FunnelViz steps={interest.steps} message={interest.message} />

        <div
          className="mt-6 pt-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className={`text-sm font-medium text-white mb-3 ${font}`}>
            Después de Pricing
          </p>
          {nextActions.length === 0 ? (
            <p
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Sin siguientes páginas en el periodo (o sin tráfico que complete
              Home → Pricing).
            </p>
          ) : (
            <div className="space-y-2.5">
              {nextActions.map((row) => (
                <div
                  key={`${row.fromStep}-${row.nextPage}`}
                  className="flex items-center gap-3"
                >
                  <span
                    className={`text-sm truncate flex-1 min-w-0 ${font}`}
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    {row.nextPage}
                  </span>
                  <div
                    className="w-28 h-1.5 rounded-full overflow-hidden shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(6, (row.users / nextMax) * 100)}%`,
                        background: "#ffd540",
                      }}
                    />
                  </div>
                  <span
                    className={`w-14 text-right text-sm tabular-nums shrink-0 ${font}`}
                    style={{ color: "#ffd540" }}
                  >
                    {formatNumber(row.users)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${font}`}
            style={
              active
                ? {
                    background: "rgba(255,213,64,0.12)",
                    border: "1px solid rgba(255,213,64,0.3)",
                    color: "#ffd540",
                  }
                : {
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.55)",
                    background: "transparent",
                  }
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function StatusPill({
  active,
  activeLabel = "Activo",
  inactiveLabel = "Sin datos",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${font}`}
      style={
        active
          ? {
              background: "rgba(255,213,64,0.1)",
              color: "#ffd540",
              border: "1px solid rgba(255,213,64,0.25)",
            }
          : {
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.1)",
            }
      }
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
