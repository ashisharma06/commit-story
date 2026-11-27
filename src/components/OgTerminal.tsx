import type { ReactNode } from "react";
import { OG_COLORS, OG_FONT_NAME } from "@/lib/ogTheme";

export function OgTerminal({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 42,
        backgroundColor: OG_COLORS.background,
        fontFamily: OG_FONT_NAME,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: OG_COLORS.surface,
          border: `2px solid ${OG_COLORS.border}`,
        }}
      >
        <div
          style={{
            height: 76,
            display: "flex",
            alignItems: "center",
            paddingLeft: 30,
            paddingRight: 30,
            borderBottom: `2px solid ${OG_COLORS.border}`,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: OG_COLORS.error,
            }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              marginLeft: 12,
              borderRadius: 999,
              backgroundColor: OG_COLORS.warning,
            }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              marginLeft: 12,
              borderRadius: 999,
              backgroundColor: OG_COLORS.accent,
            }}
          />
          <div
            style={{
              marginLeft: 28,
              fontSize: 24,
              color: OG_COLORS.muted,
            }}
          >
            {`commit-story ~ ${title}`}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingTop: 52,
            paddingBottom: 40,
            paddingLeft: 56,
            paddingRight: 56,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function OgPrompt({ command }: { command: string }) {
  return (
    <div style={{ display: "flex", fontSize: 36, color: OG_COLORS.text }}>
      <span style={{ color: OG_COLORS.accent, marginRight: 16 }}>$</span>
      <span>{command}</span>
    </div>
  );
}

export function OgStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", marginTop: 28, fontSize: 30 }}>
      <span style={{ width: 240, color: OG_COLORS.muted }}>{label}</span>
      <span style={{ color: OG_COLORS.text }}>{value}</span>
    </div>
  );
}

export function OgBar({ value }: { value: string }) {
  return (
    <div style={{ display: "flex", marginTop: 28, fontSize: 30 }}>
      <span style={{ width: 240, color: OG_COLORS.muted }}>top language</span>
      <span style={{ color: OG_COLORS.accent }}>{value}</span>
    </div>
  );
}

export function OgNote({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 32, fontSize: 26, color: OG_COLORS.warning }}>
      {children}
    </div>
  );
}

export function OgBrand() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginTop: "auto",
        fontSize: 24,
        color: OG_COLORS.muted,
      }}
    >
      commit story <span style={{ color: OG_COLORS.accent }}>{">_"}</span>
    </div>
  );
}
