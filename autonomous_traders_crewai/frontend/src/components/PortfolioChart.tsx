// Portfolio-value line chart: a thin hand-rolled SVG line + soft gradient
// fill, colored green or red by whether the trader is up overall, with a
// hover crosshair + tooltip. No charting library — just scales and a path.

import { useMemo, useRef, useState } from "react";
import type { ChartPoint } from "../hooks/useTradingFloor";
import { useResizeObserver } from "../hooks/useResizeObserver";

const MIN_HEIGHT = 120;
const PAD = { top: 10, right: 58, bottom: 22, left: 6 };
const Y_TICKS = 4;

interface Props {
  points: ChartPoint[];
}

export function PortfolioChart({ points }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const size = useResizeObserver(hostRef);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = Math.max(1, size.width);
  const height = Math.max(MIN_HEIGHT, size.height || MIN_HEIGHT);
  const plotWidth = Math.max(1, width - PAD.left - PAD.right);
  const plotHeight = Math.max(1, height - PAD.top - PAD.bottom);

  const domain = useMemo(() => {
    const xs = points.map((p) => p.t);
    const ys = points.map((p) => p.value);
    const now = Date.now() / 1000;
    let xMin: number, xMax: number;
    if (xs.length < 2) {
      xMin = now - 300;
      xMax = now + 30;
    } else {
      xMin = Math.min(...xs);
      xMax = Math.max(...xs);
    }
    let yMin: number, yMax: number;
    if (ys.length === 0) {
      yMin = 0;
      yMax = 100;
    } else {
      const lo = Math.min(...ys);
      const hi = Math.max(...ys);
      if (lo === hi) {
        yMin = lo - 100;
        yMax = hi + 100;
      } else {
        const pad = (hi - lo) * 0.1;
        yMin = lo - pad;
        yMax = hi + pad;
      }
    }
    return { xMin, xMax, yMin, yMax };
  }, [points]);

  const scaleX = (t: number) => PAD.left + ((t - domain.xMin) / (domain.xMax - domain.xMin)) * plotWidth;
  const scaleY = (v: number) => PAD.top + (1 - (v - domain.yMin) / (domain.yMax - domain.yMin)) * plotHeight;

  const up = points.length > 1 ? points[points.length - 1].value >= points[0].value : true;
  const trendVar = up ? "var(--trend-up)" : "var(--trend-down)";
  const gradId = up ? "chart-fill-up" : "chart-fill-down";

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.t)},${scaleY(p.value)}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${scaleX(points[points.length - 1].t)},${PAD.top + plotHeight} L${scaleX(points[0].t)},${PAD.top + plotHeight} Z`
      : "";

  const yTicks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= Y_TICKS; i++) out.push(domain.yMin + ((domain.yMax - domain.yMin) * i) / Y_TICKS);
    return out;
  }, [domain]);

  const xTicks = useMemo(() => [domain.xMin, (domain.xMin + domain.xMax) / 2, domain.xMax], [domain]);

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const t = domain.xMin + ((px - PAD.left) / plotWidth) * (domain.xMax - domain.xMin);
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].t - t);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="chart-host" ref={hostRef}>
      <svg width={width} height={height} className="chart-svg">
        <defs>
          <linearGradient id="chart-fill-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--trend-up)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--trend-up)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chart-fill-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--trend-down)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--trend-down)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={scaleY(v)}
              y2={scaleY(v)}
              className="chart-grid"
            />
            <text x={width - PAD.right + 6} y={scaleY(v)} dy="0.32em" className="chart-tick">
              {formatCompact(v)}
            </text>
          </g>
        ))}

        {xTicks.map((t, i) => (
          <text
            key={i}
            x={scaleX(t)}
            y={height - 6}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            className="chart-tick"
          >
            {formatTime(t)}
          </text>
        ))}

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {linePath && <path d={linePath} fill="none" stroke={trendVar} strokeWidth={2} />}

        {hovered && (
          <>
            <line
              x1={scaleX(hovered.t)}
              x2={scaleX(hovered.t)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
              className="chart-crosshair"
            />
            <circle cx={scaleX(hovered.t)} cy={scaleY(hovered.value)} r={4} fill={trendVar} className="chart-dot" />
          </>
        )}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(Math.max(scaleX(hovered.t), 60), width - 60),
            top: Math.max(scaleY(hovered.value) - 12, 10),
          }}
        >
          <div className="chart-tooltip-value">{formatFull(hovered.value)}</div>
          <div className="chart-tooltip-time">{new Date(hovered.t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      )}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatFull(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatTime(t: number): string {
  return new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
