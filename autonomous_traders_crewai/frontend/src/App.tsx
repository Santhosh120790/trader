import { useEffect, useState } from "react";
import { getMarket, getTraders, type MarketInfo, type TraderInfo } from "./api";
import { Sidebar } from "./components/Sidebar";
import { TraderPanel } from "./components/TraderPanel";
import { useTheme } from "./hooks/useTheme";
import { useTradingFloor } from "./hooks/useTradingFloor";

export function App() {
  const [theme, toggleTheme] = useTheme();
  const [traders, setTraders] = useState<TraderInfo[]>([]);
  const [market, setMarket] = useState<MarketInfo | null>(null);

  useEffect(() => {
    getTraders()
      .then(setTraders)
      .catch((err) => console.error("traders fetch failed", err));
    getMarket()
      .then(setMarket)
      .catch((err) => console.error("market fetch failed", err));
  }, []);

  const names = traders.map((t) => t.name);
  const floor = useTradingFloor(names);

  const details = names.map((n) => floor[n]?.detail ?? null);
  const values = details.filter((d): d is NonNullable<typeof d> => d !== null).map((d) => d.portfolio_value);
  const best = values.length ? Math.max(...values) : null;
  // Only crown a single clear leader; a tie (e.g. before any trading) highlights nobody.
  const uniqueLeader = best !== null && values.filter((v) => v === best).length === 1;

  return (
    <>
      <Sidebar market={market} details={details} theme={theme} onToggleTheme={toggleTheme} />
      <main className="panels">
        {traders.map((info) => {
          const state = floor[info.name] ?? { detail: null, chart: [], logs: [], priceDirections: {} };
          return (
            <TraderPanel
              key={info.name}
              info={info}
              state={state}
              isLeader={uniqueLeader && state.detail?.portfolio_value === best}
            />
          );
        })}
      </main>
    </>
  );
}
