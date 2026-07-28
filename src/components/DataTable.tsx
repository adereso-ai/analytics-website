"use client";

import type { ReactNode } from "react";

const font = "font-[family-name:var(--font-outfit)]";

type Column<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  empty = "Sin datos para este periodo.",
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm py-6" style={{ color: "rgba(255,255,255,0.45)" }}>
        {empty}
      </p>
    );
  }

  return (
    <div className="overflow-auto app-scroll max-h-[min(58vh,560px)] -mx-1">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10" style={{ backgroundColor: "#131415" }}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide ${font} ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
                style={{
                  color: "rgba(255,255,255,0.45)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-3 align-top ${
                    col.align === "right"
                      ? "text-right tabular-nums"
                      : "text-left"
                  }`}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
