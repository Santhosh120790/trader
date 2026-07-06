// Holdings heatmap: one tile per symbol, size proportional to market value,
// colored by unrealized profit. Tiles flash green/red when the price ticks —
// keying the tile by a per-symbol "flash sequence" number forces React to
// remount it on every tick, which restarts the CSS animation even when the
// same direction repeats on consecutive polls.

import { useEffect, useState } from "react";
import type { Holding } from "../api";
import type { PriceDirection } from "../hooks/useTradingFloor";

interface Props {
  holdings: Holding[];
  priceDirections: Record<string, PriceDirection>;
}

export function Heatmap({ holdings, priceDirections }: Props) {
  const [flashSeq, setFlashSeq] = useState<Record<string, number>>({});

  useEffect(() => {
    setFlashSeq((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [symbol, dir] of Object.entries(priceDirections)) {
        if (dir === "up" || dir === "down") {
          next[symbol] = (next[symbol] ?? 0) + 1;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [priceDirections]);

  if (holdings.length === 0) {
    return <div className="heatmap" data-empty="true" />;
  }

  const totalValue = holdings.reduce((s, h) => s + h.market_value, 0);

  return (
    <div className="heatmap">
      {holdings.map((h) => {
        const share = totalValue > 0 ? h.market_value / totalValue : 1 / holdings.length;
        const dir = priceDirections[h.symbol];
        const flashClass = dir === "up" ? "flash-up" : dir === "down" ? "flash-down" : "";
        return (
          <div
            key={`${h.symbol}-${flashSeq[h.symbol] ?? 0}`}
            className={`heatmap-tile ${flashClass}`}
            style={{ flexGrow: Math.max(0.05, share) }}
            data-pnl={h.unrealized_pnl >= 0 ? "up" : "down"}
          >
            <span className="heatmap-ticker">{h.symbol}</span>
            <span className="heatmap-value">{formatMoney(h.market_value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
