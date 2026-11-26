const UNITS = [
  { label: "year", seconds: 31_536_000 },
  { label: "month", seconds: 2_592_000 },
  { label: "week", seconds: 604_800 },
  { label: "day", seconds: 86_400 },
  { label: "hour", seconds: 3_600 },
  { label: "minute", seconds: 60 },
] as const;

export function relativeTime(
  value: string | null,
  now: number = Date.now(),
): string {
  if (!value) return "never";
  const time = Date.parse(value);
  if (!Number.isFinite(time) || !Number.isFinite(now)) return "unknown";

  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 60) return "just now";

  for (const unit of UNITS) {
    if (seconds >= unit.seconds) {
      const amount = Math.floor(seconds / unit.seconds);
      return `${amount} ${unit.label}${amount === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}
