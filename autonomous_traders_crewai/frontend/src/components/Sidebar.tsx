import type { MarketInfo, TraderDetail } from "../api";
import type { Theme } from "../hooks/useTheme";

interface Props {
  market: MarketInfo | null;
  details: (TraderDetail | null)[];
  theme: Theme;
  onToggleTheme: () => void;
}

export function Sidebar({ market, details, theme, onToggleTheme }: Props) {
  const returns = details
    .filter((d): d is TraderDetail => d !== null)
    .map((d) => {
      const initial = d.portfolio_value - d.pnl; // each trader started with this
      return { name: d.name, pct: initial > 0 ? (d.pnl / initial) * 100 : 0 };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <h1 className="brand">Autonomous Traders</h1>
        <p className="brand-sub">CrewAI trading floor</p>
      </div>

      <div className="market">
        <span className="market-label">Market data</span>
        <div className="market-badge" data-source={market?.source ?? undefined}>
          <span className="market-dot" />
          <span>{market ? (market.source === "massive" ? "Live market" : "Simulated") : "Connecting"}</span>
        </div>
        <span className="market-status">{market ? (market.is_market_open ? "Market open" : "Market closed") : ""}</span>
      </div>

      <div className="returns">
        <span className="returns-label">Returns</span>
        <ul className="returns-list">
          {returns.map((r) => (
            <li className="returns-row" key={r.name}>
              <span className="returns-name">{r.name}</span>
              <span className="returns-pct" data-trend={r.pct >= 0 ? "up" : "down"}>
                {r.pct >= 0 ? "+" : ""}
                {r.pct.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-spacer" />

      <button className="theme-toggle" aria-label="Toggle theme" onClick={onToggleTheme}>
        {theme === "dark" ? <MoonIcon /> : <SunIcon />}
      </button>
    </aside>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
