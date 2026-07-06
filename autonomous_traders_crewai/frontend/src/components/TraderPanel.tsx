// One trader's quadrant: header with value and profit, chart, heatmap, and
// a bottom row of activity log + recent trades.

import type { TraderInfo } from "../api";
import type { TraderFloorState } from "../hooks/useTradingFloor";
import { ActivityLog } from "./ActivityLog";
import { Heatmap } from "./Heatmap";
import { PortfolioChart } from "./PortfolioChart";
import { Transactions } from "./Transactions";

interface Props {
  info: TraderInfo;
  state: TraderFloorState;
  isLeader: boolean;
}

export function TraderPanel({ info, state, isLeader }: Props) {
  const { detail, chart, logs, priceDirections } = state;
  const trend = detail && detail.pnl >= 0 ? "up" : "down";
  const strategy = detail?.strategy.trim() ?? "";

  return (
    <section className="panel" data-leader={isLeader ? "true" : undefined}>
      <header className="panel-head">
        <span className="panel-name">{info.name}</span>
        <span className="panel-sub">
          {info.model_name} · {info.lastname}
        </span>
        <span className="panel-value" data-trend={detail ? trend : "flat"}>
          {detail ? formatMoney(detail.portfolio_value) : "$0"}
        </span>
        {detail && (
          <span className="panel-pnl" data-trend={trend}>
            {formatPnl(detail.pnl)}
          </span>
        )}
        <span className={`panel-strategy${strategy ? "" : " empty"}`} title={strategy}>
          {strategy || "No strategy set yet"}
        </span>
      </header>

      <div className="panel-chart">
        <PortfolioChart points={chart} />
      </div>

      <Heatmap holdings={detail?.holdings ?? []} priceDirections={priceDirections} />

      <div className="panel-bottom">
        <div className="panel-col">
          <span className="panel-col-label">Activity</span>
          <ActivityLog rows={logs} />
        </div>
        <div className="panel-col">
          <span className="panel-col-label">Recent trades</span>
          <Transactions transactions={detail?.transactions ?? []} />
        </div>
      </div>
    </section>
  );
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPnl(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`;
}
