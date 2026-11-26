"use client";

import { useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekBucket } from "@/lib/analyze";

const AXIS_TICK = {
  fill: "var(--muted)",
  fontFamily: "var(--font-geist-mono)",
  fontSize: 10,
};

function shortWeek(value: string): string {
  return value.slice(5).replace("-", "/");
}

function subscribe(onStoreChange: () => void): () => void {
  void onStoreChange;
  return () => undefined;
}

function clientSnapshot(): boolean {
  return true;
}

function serverSnapshot(): boolean {
  return false;
}

export function CommitsOverTime({ weeks }: { weeks: readonly WeekBucket[] }) {
  const mounted = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );

  if (weeks.length < 2) {
    const total = weeks.reduce((sum, week) => sum + week.commits, 0);
    return (
      <div>
        <p className="mb-4 text-xs tracking-[0.18em] text-muted uppercase">
          {"// commits over time"}
        </p>
        <p className="text-sm text-muted">
          {weeks.length === 0
            ? "not enough history for a trend"
            : `${total} commit${total === 1 ? "" : "s"} in one week · trend needs two or more weeks`}
        </p>
      </div>
    );
  }

  const points = weeks.map((week) => ({
    week: shortWeek(week.weekStart),
    commits: week.commits,
  }));

  return (
    <div>
      <p className="mb-4 text-xs tracking-[0.18em] text-muted uppercase">
        {"// commits over time"}
      </p>
      <div className="h-44 w-full" aria-label="Commits per week line chart">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 0,
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--accent)" }}
                itemStyle={{ color: "var(--text)" }}
                cursor={{ stroke: "var(--border)", strokeDasharray: "2 4" }}
              />
              <Line
                type="linear"
                dataKey="commits"
                stroke="var(--accent)"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="pt-12 text-center text-xs text-muted">
            plotting weekly commits...
          </p>
        )}
      </div>
    </div>
  );
}
