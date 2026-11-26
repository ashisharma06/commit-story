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

type AsciiBarProps = {
  label: string;
  value: number;
  max: number;
  width?: number;
  detail?: string;
  percent?: number;
};

export function AsciiBar({
  label,
  value,
  max,
  width = 12,
  detail,
  percent,
}: AsciiBarProps) {
  const scaledPercent =
    Number.isFinite(value) && Number.isFinite(max) && max > 0
      ? Math.round((value / max) * 100)
      : 0;
  const shownPercent = percent ?? scaledPercent;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 text-xs sm:grid-cols-[minmax(9rem,1fr)_auto_4rem]">
      <span className="truncate text-text">{label}</span>
      <span aria-hidden="true" className="whitespace-nowrap text-accent">
        {asciiBar(value, max, width)}
      </span>
      <span className="text-right text-muted">{detail ?? `${shownPercent}%`}</span>
      <span className="sr-only">{shownPercent}%</span>
    </div>
  );
}
