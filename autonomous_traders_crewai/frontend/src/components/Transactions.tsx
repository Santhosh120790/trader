// A trader's recent trades, newest first. Mirrors the activity log's compact style.

import type { Transaction } from "../api";

const MAX_ROWS = 12;

interface Props {
  transactions: Transaction[];
}

export function Transactions({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="txns">
        <div className="txn-empty">No trades yet</div>
      </div>
    );
  }
  const rows = transactions.slice(-MAX_ROWS).reverse();
  return (
    <div className="txns">
      {rows.map((t, i) => (
        <div className="txn-row" key={i}>
          <span className="txn-date">{dateOf(t.timestamp)}</span>
          <span className="txn-side" data-side={t.quantity >= 0 ? "buy" : "sell"}>
            {t.quantity >= 0 ? "BUY" : "SELL"}
          </span>
          <span className="txn-detail">
            {Math.abs(t.quantity)} {t.symbol} @ ${t.price.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function dateOf(stamp: string): string {
  // "YYYY-MM-DD HH:MM:SS" -> "MM-DD"
  const parts = stamp.split(" ")[0].split("-");
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : stamp;
}
