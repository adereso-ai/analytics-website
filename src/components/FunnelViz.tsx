"use client";

import { formatNumber, formatPercent } from "@/lib/format";
import type { FunnelStepResult } from "@/lib/types";

const font = "font-[family-name:var(--font-outfit)]";

export function FunnelViz({
  steps,
  message,
}: {
  steps: FunnelStepResult[];
  message?: string;
}) {
  if (message && steps.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: "rgba(255,255,255,0.45)" }}>
        {message}
      </p>
    );
  }

  if (steps.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: "rgba(255,255,255,0.45)" }}>
        Sin datos de embudo en este periodo.
      </p>
    );
  }

  const max = Math.max(...steps.map((s) => s.users), 1);

  return (
    <div className="flex flex-col gap-4">
      {steps.map((step, index) => {
        const width = Math.max(8, (step.users / max) * 100);
        const drop =
          index > 0 && steps[index - 1].users > 0
            ? 1 - step.users / steps[index - 1].users
            : 0;

        return (
          <div key={`${step.name}-${index}`} className="flex flex-col gap-2">
            <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold text-neutral-900 ${font}`}
                style={{ backgroundColor: "#ffd540" }}
              >
                {index + 1}
              </span>
              <div>
                <strong className={`block text-white font-medium ${font}`}>
                  {step.name}
                </strong>
                <p
                  className="text-sm m-0 mt-0.5"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {formatNumber(step.users)} usuarios
                  {index > 0
                    ? ` · −${formatPercent(drop)} vs paso anterior`
                    : ""}
                </p>
              </div>
              <span
                className={`tabular-nums font-semibold ${font}`}
                style={{ color: "#ffd540" }}
              >
                {formatPercent(step.completionRate || step.users / max)}
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,213,64,0.1)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  background:
                    "linear-gradient(90deg, #E6C039 0%, #FFD540 100%)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
