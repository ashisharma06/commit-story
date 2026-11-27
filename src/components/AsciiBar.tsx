"use client";

import { useMediaQuery } from "@/components/useMediaQuery";

export function asciiBar(
  value: number,
  max: number,
  width = 12,
): string {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(max) ||
    max <= 0 ||
    width <= 0
  ) {
    return "░".repeat(Math.max(0, Math.floor(width)));
  }
  const ratio = Math.max(0, Math.min(value / max, 1));
  const filled = Math.round(ratio * Math.floor(width));
  return "█".repeat(filled) + "░".repeat(Math.floor(width) - filled);
}

export function AsciiBar({
  label,
  value,
  max,
  width = 12,
  detail,
  percent,
}: {
  label: string;
  value: number;
  max: number;
  width?: number;
  detail?: string;
  percent?: number;
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const barWidth = isDesktop ? width : Math.min(7, width);
  const scaledPercent =
    Number.isFinite(value) && Number.isFinite(max) && max > 0
      ? Math.round((value / max) * 100)
      : 0;
  const shownPercent = percent ?? scaledPercent;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(9rem,1fr)_auto_4rem] sm:gap-x-4">
      <span title={label} className="min-w-0 break-words text-text">
        {label}
      </span>
      <span aria-hidden="true" className="whitespace-nowrap text-accent">
        {asciiBar(value, max, barWidth)}
      </span>
      <span className="col-span-2 min-w-0 break-words text-sm text-muted sm:col-span-1 sm:text-right">
        {detail ?? `${shownPercent}%`}
      </span>
    </div>
  );
}
