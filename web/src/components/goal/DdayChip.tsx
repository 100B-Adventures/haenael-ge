// components/goal/DdayChip.tsx — D-day 뱃지 + StatusChip
// DESIGN.md §3.1: clover chip(active) / warm chip(closed) / faint chip(deleted)

import { calcDday } from "@/lib/utils/format";

interface DdayChipProps {
  dueDate: string; // ISO date string
  tone?: "clover" | "warm";
}

interface StatusChipProps {
  status: "ACTIVE" | "CLOSED" | "DELETED";
}

// ─── D-day ────────────────────────────────────────────────────────────────────

export function DdayChip({ dueDate, tone = "clover" }: DdayChipProps) {
  const n = calcDday(dueDate);
  const label = n > 0 ? `D-${n}` : n === 0 ? "D-day" : `D+${Math.abs(n)}`;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full font-semibold [font-size:var(--text-wordmark)]! [letter-spacing:0.1px]! ${
        tone === "warm"
          ? "[background-color:var(--warm)]! [color:var(--amber-ink)]!"
          : "[background-color:var(--primary)]! [color:var(--card)]!"
      }`}
      data-testid="dday-chip"
    >
      {label}
    </span>
  );
}

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StatusChipProps["status"], string> = {
  ACTIVE: "진행 중",
  CLOSED: "마감됨",
  DELETED: "종료됨",
};

const STATUS_STYLE: Record<StatusChipProps["status"], React.CSSProperties> = {
  ACTIVE: { background: "var(--muted)", color: "#7a7363" }, // --warm
  CLOSED: { background: "#EFEDE8", color: "#8a857a" },
  DELETED: { background: "#EFEDE8", color: "#8a857a" },
};

export function StatusChip({ status }: StatusChipProps) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full font-semibold [font-size:var(--text-wordmark)]!"
      style={STATUS_STYLE[status]}
      data-testid="status-chip"
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// re-export together
import type React from "react";
export type { DdayChipProps, StatusChipProps };
