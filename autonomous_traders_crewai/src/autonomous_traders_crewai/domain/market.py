"""Share prices from Yahoo Finance (NSE-listed stocks), the Massive market data API
(US-listed stocks), or a simulator as a last resort.

NSE_TICKERS lists the Indian stocks traded on this floor; those are priced via
yfinance. Anything else falls through to Massive if MASSIVE_API_KEY is set, then to
market_simulator so the whole trading floor still runs out of the box.
"""

import os
from dotenv import load_dotenv
import yfinance as yf
from massive import RESTClient
from .market_simulator import simulated_price

load_dotenv(override=True)

massive_api_key = os.getenv("MASSIVE_API_KEY")

# NSE ticker -> (Yahoo Finance symbol, company name), the Indian stocks this floor trades.
NSE_TICKERS = {
    "IEX": ("IEX.NS", "Indian Energy Exchange"),
    "NTPCGREEN": ("NTPCGREEN.NS", "NTPC Green Energy"),
    "OLAELEC": ("OLAELEC.NS", "Ola Electric Mobility"),
    "ONGC": ("ONGC.NS", "Oil and Natural Gas Corporation"),
    "SUZLON": ("SUZLON.NS", "Suzlon Energy"),
}


def _get_share_price_nse(symbol: str) -> float:
    yahoo_symbol, _ = NSE_TICKERS[symbol.upper()]
    price = yf.Ticker(yahoo_symbol).fast_info["lastPrice"]
    return round(float(price), 2)


def _last_trade(client: RESTClient, symbol: str) -> float:
    return float(client.get_last_trade(symbol).price)


def _snapshot(client: RESTClient, symbol: str) -> float:
    snapshot = client.get_snapshot_ticker("stocks", symbol)
    return float(snapshot.min.close or snapshot.prev_day.close)


def _previous_close(client: RESTClient, symbol: str) -> float:
    return float(client.get_previous_close_agg(symbol)[0].close)


# Best price first, prior close last. Lower tier plans reject the earlier calls,
# so we remember the first tier that works and start there next time.
price_methods = [_last_trade, _snapshot, _previous_close]
plan_tier = 0


def get_share_price(symbol: str) -> float:
    """Return the current price for a symbol: NSE stocks via yfinance, else Massive, else the simulator."""
    if symbol.upper() in NSE_TICKERS:
        try:
            return _get_share_price_nse(symbol)
        except Exception as e:
            print(f"Yahoo Finance unavailable for {symbol} ({e}); using a simulated price")
            return simulated_price(symbol)
    if massive_api_key:
        try:
            return get_share_price_massive(symbol)
        except Exception as e:
            print(f"Massive API unavailable ({e}); using a simulated price")
    return simulated_price(symbol)


def get_share_price_massive(symbol: str) -> float:
    """Best price the plan allows, remembering the working tier to avoid repeat failures."""
    global plan_tier
    client = RESTClient(massive_api_key)
    for tier in range(plan_tier, len(price_methods)):
        try:
            price = price_methods[tier](client, symbol)
            plan_tier = tier
            return price
        except Exception:
            continue
    raise RuntimeError(f"No Massive price available for {symbol}")


def is_market_open() -> bool:
    """Whether the US market is open; True on simulated data or if Massive is unreachable."""
    if not massive_api_key:
        return True
    try:
        client = RESTClient(massive_api_key)
        return client.get_market_status().market == "open"
    except Exception:
        return True
