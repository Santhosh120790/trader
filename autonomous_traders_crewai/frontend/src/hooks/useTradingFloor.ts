// Centralised polling for every trader on the floor. The chart for each
// trader is seeded once from its stored time series, then grows a point on
// every poll so the line keeps moving while you watch — mirroring how the
// backend's own portfolio_value_time_series accumulates.

import { useCallback, useEffect, useRef, useState } from "react";
import { getTrader, getTraderLogs, type LogRow, type TraderDetail } from "../api";
import { useInterval } from "./useInterval";

const DATA_POLL_MS = 6000;
const LOG_POLL_MS = 2000;
const CHART_MAX_POINTS = 5000;

export interface ChartPoint {
  t: number; // unix seconds
  value: number;
}

export type PriceDirection = "up" | "down" | "same";

export interface TraderFloorState {
  detail: TraderDetail | null;
  chart: ChartPoint[];
  logs: LogRow[];
  priceDirections: Record<string, PriceDirection>;
}

function emptyState(): TraderFloorState {
  return { detail: null, chart: [], logs: [], priceDirections: {} };
}

function toUnixSeconds(stamp: string): number {
  // Stored timestamps are "YYYY-MM-DD HH:MM:SS" local time.
  return new Date(stamp.replace(" ", "T")).getTime() / 1000;
}

export function useTradingFloor(names: string[]): Record<string, TraderFloorState> {
  const [states, setStates] = useState<Record<string, TraderFloorState>>(() =>
    Object.fromEntries(names.map((n) => [n, emptyState()])),
  );
  const seeded = useRef<Record<string, boolean>>({});
  const prevPrices = useRef<Record<string, Record<string, number>>>({});

  const pollData = useCallback(async () => {
    const fetched = await Promise.all(
      names.map(async (name) => {
        try {
          return [name, await getTrader(name)] as const;
        } catch (err) {
          console.error(`data fetch failed for ${name}`, err);
          return [name, null] as const;
        }
      }),
    );
    setStates((prev) => {
      const next = { ...prev };
      for (const [name, detail] of fetched) {
        if (!detail) continue;
        const prior = prev[name] ?? emptyState();

        let chart = prior.chart;
        if (!seeded.current[name]) {
          chart = detail.time_series.map((p) => ({ t: toUnixSeconds(p.datetime), value: p.value }));
          seeded.current[name] = true;
        }
        chart = [...chart, { t: Date.now() / 1000, value: detail.portfolio_value }];
        if (chart.length > CHART_MAX_POINTS) chart = chart.slice(chart.length - CHART_MAX_POINTS);

        const priorPrices = prevPrices.current[name] ?? {};
        const priceDirections: Record<string, PriceDirection> = {};
        for (const h of detail.holdings) {
          const p = priorPrices[h.symbol];
          priceDirections[h.symbol] = p === undefined || p === h.price ? "same" : h.price > p ? "up" : "down";
        }
        prevPrices.current[name] = Object.fromEntries(detail.holdings.map((h) => [h.symbol, h.price]));

        next[name] = { ...prior, detail, chart, priceDirections };
      }
      return next;
    });
  }, [names]);

  const pollLogs = useCallback(async () => {
    const fetched = await Promise.all(
      names.map(async (name) => {
        try {
          return [name, await getTraderLogs(name)] as const;
        } catch (err) {
          console.error(`log fetch failed for ${name}`, err);
          return [name, null] as const;
        }
      }),
    );
    setStates((prev) => {
      const next = { ...prev };
      for (const [name, logs] of fetched) {
        if (!logs) continue;
        next[name] = { ...(prev[name] ?? emptyState()), logs };
      }
      return next;
    });
  }, [names]);

  useEffect(() => {
    pollData();
    pollLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollData, pollLogs]);

  useInterval(pollData, DATA_POLL_MS);
  useInterval(pollLogs, LOG_POLL_MS);

  return states;
}
