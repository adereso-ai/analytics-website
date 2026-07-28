"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCalendar,
  IconChevronDown,
  IconInfoCircle,
} from "@tabler/icons-react";
import { format, parseISO, subDays } from "date-fns";
import type { DatePreset } from "@/lib/types";

const font = "font-[family-name:var(--font-outfit)]";

const PRESETS: {
  id: Exclude<DatePreset, "custom">;
  label: string;
  hint: string;
}[] = [
  { id: "7d", label: "7 días", hint: "Última semana completa" },
  { id: "28d", label: "28 días", hint: "Mes móvil estándar" },
  { id: "90d", label: "90 días", hint: "Trimestre móvil" },
];

export type DateSelection = {
  preset: DatePreset;
  startDate: string;
  endDate: string;
};

type Props = {
  value: DateSelection;
  onChange: (next: DateSelection) => void;
  disabled?: boolean;
  compareLabel?: string;
};

function yesterdayIso(): string {
  return format(subDays(new Date(), 1), "yyyy-MM-dd");
}

export function DateRangePicker({
  value,
  onChange,
  disabled,
  compareLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(value.startDate);
  const [draftEnd, setDraftEnd] = useState(value.endDate);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const maxEnd = useMemo(() => yesterdayIso(), []);

  useEffect(() => {
    setDraftStart(value.startDate);
    setDraftEnd(value.endDate);
  }, [value.startDate, value.endDate]);

  useEffect(() => {
    if (!open) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const summary =
    value.preset === "custom"
      ? "Personalizado"
      : (PRESETS.find((p) => p.id === value.preset)?.label ?? "Periodo");

  function applyPreset(preset: Exclude<DatePreset, "custom">) {
    const end = parseISO(maxEnd);
    const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 28;
    const start = subDays(end, days - 1);
    onChange({
      preset,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
    setOpen(false);
  }

  function applyCustom() {
    let start = draftStart;
    let end = draftEnd;
    if (end > maxEnd) end = maxEnd;
    if (start > end) start = end;
    onChange({ preset: "custom", startDate: start, endDate: end });
    setOpen(false);
  }

  const menu =
    open && coords
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[200] cursor-default"
              aria-label="Cerrar filtro de fechas"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[210] w-[min(100vw-2rem,360px)] rounded-2xl p-4 shadow-2xl"
              style={{
                top: coords.top,
                right: coords.right,
                backgroundColor: "#131415",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide mb-3 ${font}`}
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Periodo
              </p>

              <div className="grid gap-2 mb-4">
                {PRESETS.map((p) => {
                  const active = value.preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${font}`}
                      style={{
                        background: active
                          ? "rgba(255,213,64,0.12)"
                          : "rgba(255,255,255,0.03)",
                        border: active
                          ? "1px solid rgba(255,213,64,0.3)"
                          : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span>
                        <span className="block text-sm text-white font-medium">
                          {p.label}
                        </span>
                        <span
                          className="block text-xs mt-0.5"
                          style={{ color: "rgba(255,255,255,0.45)" }}
                        >
                          {p.hint}
                        </span>
                      </span>
                      {active ? (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "#ffd540" }}
                        >
                          Activo
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div
                className="rounded-xl p-3 mb-3"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide mb-2 ${font}`}
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Rango personalizado
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <label className="flex flex-col gap-1">
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      Desde
                    </span>
                    <input
                      type="date"
                      value={draftStart}
                      max={draftEnd < maxEnd ? draftEnd : maxEnd}
                      onChange={(e) => setDraftStart(e.target.value)}
                      className={`rounded-lg px-2.5 py-2 text-sm text-white outline-none ${font}`}
                      style={{
                        background: "#0C0C0D",
                        border: "1px solid rgba(255,255,255,0.12)",
                        colorScheme: "dark",
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      Hasta
                    </span>
                    <input
                      type="date"
                      value={draftEnd}
                      max={maxEnd}
                      min={draftStart}
                      onChange={(e) => setDraftEnd(e.target.value)}
                      className={`rounded-lg px-2.5 py-2 text-sm text-white outline-none ${font}`}
                      style={{
                        background: "#0C0C0D",
                        border: "1px solid rgba(255,255,255,0.12)",
                        colorScheme: "dark",
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={applyCustom}
                  className={`w-full rounded-full py-2.5 text-sm font-medium text-neutral-900 ${font}`}
                  style={{
                    backgroundColor: "#ffd540",
                    boxShadow: "0 0 20px rgba(255,213,64,0.15)",
                  }}
                >
                  Aplicar rango
                </button>
              </div>

              <div
                className="flex gap-2 text-xs leading-snug"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                <IconInfoCircle
                  size={16}
                  stroke={1.5}
                  className="shrink-0 mt-0.5"
                  style={{ color: "#ffd540" }}
                />
                <span>
                  El día de hoy se excluye a propósito: en GA4 suele estar
                  incompleto. Máximo seleccionable: {maxEnd}.
                  {compareLabel ? (
                    <> Comparación automática vs {compareLabel}.</>
                  ) : null}
                </span>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${font}`}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          background: open
            ? "rgba(255,213,64,0.1)"
            : "rgba(255,255,255,0.06)",
          color: "#fff",
        }}
        aria-expanded={open}
      >
        <IconCalendar size={18} stroke={1.5} style={{ color: "#ffd540" }} />
        <span>{summary}</span>
        <span
          className="hidden sm:inline text-xs font-normal"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {value.startDate} → {value.endDate}
        </span>
        <IconChevronDown
          size={16}
          stroke={1.5}
          style={{
            color: "rgba(255,255,255,0.45)",
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 0.2s",
          }}
        />
      </button>
      {menu}
    </div>
  );
}
