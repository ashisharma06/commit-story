import { describe, expect, it } from "vitest";
import { relativeTime } from "@/lib/time";

describe("relativeTime", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("formats recent pushes in readable units", () => {
    expect(relativeTime("2025-09-28T00:00:00Z", now)).toBe("3 months ago");
    expect(relativeTime("2025-12-31T23:00:00Z", now)).toBe("1 hour ago");
    expect(relativeTime("2025-12-31T00:00:00Z", now)).toBe("1 day ago");
  });

  it("handles missing, invalid, and future dates", () => {
    expect(relativeTime(null, now)).toBe("never");
    expect(relativeTime("not-a-date", now)).toBe("unknown");
    expect(relativeTime("2030-01-01T00:00:00Z", now)).toBe("just now");
  });
});
