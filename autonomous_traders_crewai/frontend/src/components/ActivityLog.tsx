// The per-trader activity log. Rows come from the backend already colored by
// type (account reads/writes today; room for richer crew-event types later).

import type { LogRow } from "../api";

interface Props {
  rows: LogRow[];
}

export function ActivityLog({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="log">
        <div className="log-empty">Waiting for activity</div>
      </div>
    );
  }
  return (
    <div className="log" ref={(el) => el && (el.scrollTop = el.scrollHeight)}>
      {rows.map((row, i) => (
        <div className="log-row" key={i}>
          <span className="log-time">{timeOf(row.datetime)}</span>
          <span className="log-type" style={{ color: row.color }}>
            {row.type}
          </span>
          <span className="log-text">{row.message}</span>
        </div>
      ))}
    </div>
  );
}

function timeOf(stamp: string): string {
  // Stored as "YYYY-MM-DD HH:MM:SS"; show just the time.
  const parts = stamp.split(" ");
  return parts.length > 1 ? parts[1] : stamp;
}
