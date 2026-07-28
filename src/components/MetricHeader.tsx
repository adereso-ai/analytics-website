"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

const font = "font-[family-name:var(--font-outfit)]";

export const METRIC_HELP = {
  vistas: {
    label: "Vistas",
    title: "Vistas de página (screenPageViews)",
    body: "Cuántas veces se cargó una página. La misma persona puede generar muchas vistas. No es usuarios únicos.",
  },
  sesiones: {
    label: "Sesiones",
    title: "Sesiones (sessions)",
    body: "Visitas al sitio. Una persona puede tener varias sesiones (vuelve otro día o tras ~30 min de inactividad). Tampoco son únicos del periodo.",
  },
  usuarios: {
    label: "Usuarios",
    title: "Usuarios activos (activeUsers)",
    body: "Lo más cercano a usuarios únicos en el periodo según GA4. Cuenta personas distintas (con límites de identidad/cookies). Preferir esta métrica para “cuánta gente”.",
  },
  bounce: {
    label: "Bounce",
    title: "Bounce rate",
    body: "% de sesiones sin engagement (en GA4: sin interacción relevante). Más alto = más gente que entra y se va sin interactuar. No mide usuarios únicos.",
  },
} as const;

export const INTEREST_HELP = {
  landing: {
    label: "Landing",
    title: "Página evaluada",
    body: "Host + ruta (sin query). Solo páginas con ≥10 usuarios y sin ruido legal/thank-you. Debajo del nombre va la señal principal que explica el nivel.",
  },
  nivel: {
    label: "Nivel",
    title: "Nivel de interés",
    body: "Alta: convierte, form_start ≥10% o score ≥55. Media: score ≥35 o engagement ≥55%. Baja: el resto. Es un proxy de intención, no un evento nativo de GA4.",
  },
  score: {
    label: "Nota",
    title: "De dónde sale la nota",
    body: "Suma de 5 aportes de GA4: Engagement (0–25) + Anti-rebote (0–15) + Tiempo (0–15) + Form start (0–25) + Conversión (0–25). En cada fila, al expandir, ves cuántos puntos puso cada uno.",
  },
  prioridad: {
    label: "Prioridad",
    title: "Prioridad de acción",
    body: "Cruce interés × volumen: nota × √(usuarios ÷ máx. usuarios del listado). Alta ≥40, media ≥18. Sube páginas calientes con tráfico; baja las de interés medio pero poca visita.",
  },
  usuarios: {
    label: "Usuarios",
    title: "Usuarios en la página",
    body: "Usuarios activos que vieron esta página en el periodo. Denominador de form start y conversiones.",
  },
  engagement: {
    label: "Engagement",
    title: "Tasa de engagement",
    body: "Sesiones engaged ÷ sesiones en esa página. Engaged ≈ hubo interacción (tiempo, scroll, click, etc.). Más alto = la gente se queda y usa la página.",
  },
  formStart: {
    label: "Form start",
    title: "Inicio de formulario",
    body: "Usuarios que tocaron un campo del form (evento GA4 form_start) y % sobre usuarios de la página. Señala intención de llenar; no es envío. En get casi no existe.",
  },
  conversiones: {
    label: "Conversiones",
    title: "Usuarios que convirtieron",
    body: "Según la página: HubSpot en landings como /vsl-2, thank-you desde /contacto, o thank-you en get.adereso.ai. Entre paréntesis: tasa vs usuarios de la página.",
  },
  rebote: {
    label: "Rebote",
    title: "Bounce rate",
    body: "% de sesiones sin engagement en esa página. Alto + poco engagement suele indicar tráfico frío o mala fit del mensaje.",
  },
} as const;

/** Canales default de GA4 (sessionDefaultChannelGroup). */
export const CHANNEL_HELP: Record<string, { title: string; body: string }> = {
  Direct: {
    title: "Direct",
    body: "Entraron sin una fuente clara: escribieron la URL, usaron un favorito, o el referrer se perdió (apps, HTTPS→HTTP, privacidad). No siempre es “me conocían”: a veces es tracking incompleto.",
  },
  "Organic Search": {
    title: "Organic Search",
    body: "Llegaron desde un buscador (Google, Bing, etc.) sin pagar. Clic en un resultado orgánico, no en un anuncio.",
  },
  "Paid Search": {
    title: "Paid Search",
    body: "Clic en anuncios de búsqueda paga (Google Ads, Bing Ads, etc.). Fuente/medio tipo google/cpc o con UTM de paid search.",
  },
  "Organic Social": {
    title: "Organic Social",
    body: "Desde redes (Instagram, LinkedIn, Facebook, etc.) sin pago: posts orgánicos, bio, shares. No es un anuncio pagado.",
  },
  "Paid Social": {
    title: "Paid Social",
    body: "Anuncios pagos en redes (Meta, LinkedIn, TikTok, etc.). Ej. facebook/paid, ig/paid. Tráfico de campañas pagadas en social.",
  },
  "AI Assistants": {
    title: "AI Assistants",
    body: "Llegaron desde un buscador o chat de IA: ChatGPT, Perplexity, Claude, Gemini, etc. (referral o utm_source=chatgpt.com). No es Google orgánico clásico: alguien preguntó a una IA y llegó a tu sitio desde ahí.",
  },
  "AI Assistant": {
    title: "AI Assistant",
    body: "Canal nativo de GA4 para tráfico desde asistentes de IA. En este dashboard lo agrupamos junto a ChatGPT/Perplexity/etc. bajo AI Assistants.",
  },
  Referral: {
    title: "Referral",
    body: "Vienen de otro sitio web que linkeó al tuyo (blogs, partners, directorios). No es buscador ni red social tipificada como social.",
  },
  Email: {
    title: "Email",
    body: "Llegaron desde un correo (newsletter, secuencia HubSpot, etc.), normalmente con utm_medium=email o similar.",
  },
  Affiliates: {
    title: "Affiliates",
    body: "Tráfico de afiliados o partners etiquetados como affiliate en la fuente/medio o UTMs.",
  },
  Display: {
    title: "Display",
    body: "Banners / display ads (red de display, programmatic). Impresiones/clics en avisos gráficos, no search ni social típico.",
  },
  "Cross-network": {
    title: "Cross-network",
    body: "Campañas que GA4 marca como cross-network (ej. Performance Max u otras que mezclan varias redes).",
  },
  "Organic Video": {
    title: "Organic Video",
    body: "Desde plataformas de video sin pago (YouTube orgánico, etc.).",
  },
  "Paid Video": {
    title: "Paid Video",
    body: "Anuncios de video pagos (YouTube Ads u otros video paid).",
  },
  "Organic Shopping": {
    title: "Organic Shopping",
    body: "Listados orgánicos en shopping / marketplaces, sin pago.",
  },
  "Paid Shopping": {
    title: "Paid Shopping",
    body: "Shopping ads pagos (Google Shopping, etc.).",
  },
  SMS: {
    title: "SMS",
    body: "Entraron desde un mensaje de texto / SMS con tracking.",
  },
  Audio: {
    title: "Audio",
    body: "Tráfico desde audio ads o plataformas de audio etiquetadas así.",
  },
  "(not set)": {
    title: "(not set)",
    body: "GA4 no pudo clasificar el canal: faltan datos de fuente/medio o el hit llegó incompleto.",
  },
  Unassigned: {
    title: "Unassigned",
    body: "No encaja en las reglas default de canales de GA4. Revisa UTMs y fuente/medio; a menudo es tracking mal etiquetado.",
  },
};

export type MetricHelpKey = keyof typeof METRIC_HELP;
export type InterestHelpKey = keyof typeof INTEREST_HELP;

type HelpContent = {
  label: string;
  title: string;
  body: string;
};

export function channelHelp(channel: string): { title: string; body: string } {
  return (
    CHANNEL_HELP[channel] ?? {
      title: channel,
      body: "Canal de adquisición de GA4 (sessionDefaultChannelGroup). Agrupa visitas según fuente, medio y UTMs con las reglas por defecto de Google.",
    }
  );
}

export function InfoTip({
  title,
  body,
  stopPropagation = false,
}: {
  title: string;
  body: string;
  stopPropagation?: boolean;
}) {
  const tipId = useId();
  const iconRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  function show() {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 280;
    const left = Math.min(
      Math.max(12, rect.right - width),
      window.innerWidth - width - 12,
    );
    setCoords({ top: rect.bottom + 8, left });
    setOpen(true);
  }

  function hide() {
    setOpen(false);
  }

  const tooltip =
    open && coords
      ? createPortal(
          <div
            id={tipId}
            role="tooltip"
            className={`fixed z-[300] w-[280px] rounded-xl p-3 text-left normal-case tracking-normal font-normal pointer-events-none ${font}`}
            style={{
              top: coords.top,
              left: coords.left,
              backgroundColor: "#1a1b1d",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
              color: "rgba(255,255,255,0.75)",
            }}
          >
            <p
              className="text-xs font-semibold mb-1 m-0"
              style={{ color: "#ffd540" }}
            >
              {title}
            </p>
            <p className="text-xs leading-relaxed m-0">{body}</p>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={iconRef}
        className="inline-flex cursor-help shrink-0"
        tabIndex={0}
        aria-describedby={open ? tipId : undefined}
        aria-label={title}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        onKeyDown={
          stopPropagation
            ? (e) => {
                e.stopPropagation();
              }
            : undefined
        }
      >
        <IconInfoCircle
          size={14}
          stroke={1.5}
          style={{ color: "rgba(255,255,255,0.35)" }}
        />
      </span>
      {tooltip}
    </>
  );
}

export function HelpHeader({ label, title, body }: HelpContent) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span>{label}</span>
      <InfoTip title={title} body={body} />
    </span>
  );
}

export function MetricHeader({ metric }: { metric: MetricHelpKey }) {
  const help = METRIC_HELP[metric];
  return <HelpHeader {...help} />;
}

export function metricHeader(metric: MetricHelpKey): ReactNode {
  return <MetricHeader metric={metric} />;
}

export function interestHeader(key: InterestHelpKey): ReactNode {
  const help = INTEREST_HELP[key];
  return <HelpHeader {...help} />;
}
