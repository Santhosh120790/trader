"""Daily market briefing service.

Standalone from the main crewai project on purpose: this runs as a small
Hugging Face Space (Docker), woken once a day by an external cron ping (this
repo has no scheduler of its own), so it only needs plain HTTP deps -- no
CrewAI, MCP, Node/npx, or subprocess tooling.

GET /run (with the correct `key` query param) fetches the price and recent
news for each of the 5 NSE stocks this floor trades, and pushes a summary via
Pushover.
"""

import os
from datetime import datetime

import requests
import yfinance as yf
from fastapi import FastAPI, HTTPException
from tavily import TavilyClient

PUSHOVER_USER = os.getenv("PUSHOVER_USER")
PUSHOVER_TOKEN = os.getenv("PUSHOVER_TOKEN")
PUSHOVER_URL = "https://api.pushover.net/1/messages.json"
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
BRIEFING_SECRET = os.getenv("BRIEFING_SECRET")

# NSE ticker -> (Yahoo Finance symbol, news search question)
NSE_TICKERS = {
    "IEX": (
        "IEX.NS",
        "What is the latest notable news or development for Indian Energy Exchange IEX (NSE: IEX) this week?",
    ),
    "NTPCGREEN": (
        "NTPCGREEN.NS",
        "What is the latest notable news, new project, contract or order win for NTPC Green Energy "
        "(NSE: NTPCGREEN) this week?",
    ),
    "OLAELEC": (
        "OLAELEC.NS",
        "What is the latest notable news, new product launch, order or development for Ola Electric Mobility "
        "(NSE: OLAELEC) this week?",
    ),
    "ONGC": (
        "ONGC.NS",
        "What is the latest notable news, new project, discovery or contract for ONGC Oil and Natural Gas "
        "Corporation (NSE: ONGC) this week?",
    ),
    "SUZLON": (
        "SUZLON.NS",
        "What is the latest notable news, new order win, contract or project for Suzlon Energy (NSE: SUZLON) "
        "this week?",
    ),
}

app = FastAPI(title="Daily Market Briefing")
tavily_client = TavilyClient(api_key=TAVILY_API_KEY) if TAVILY_API_KEY else None


def _price(yahoo_symbol: str) -> float | None:
    try:
        return round(float(yf.Ticker(yahoo_symbol).fast_info["lastPrice"]), 2)
    except Exception:
        return None


def _news_summary(question: str) -> str | None:
    if not tavily_client:
        return None
    try:
        result = tavily_client.search(question, max_results=3, include_answer="basic", time_range="week")
        return result.get("answer") or None
    except Exception:
        return None


def build_briefing() -> str:
    lines = [f"Market Briefing {datetime.now().strftime('%Y-%m-%d')}"]
    for symbol, (yahoo_symbol, question) in NSE_TICKERS.items():
        price = _price(yahoo_symbol)
        price_str = f"Rs {price}" if price is not None else "price unavailable"
        line = f"{symbol}: {price_str}"
        summary = _news_summary(question)
        if summary:
            line += f"\n  {summary}"
        lines.append(line)
    return "\n".join(lines)


def send_push(message: str) -> None:
    if not (PUSHOVER_USER and PUSHOVER_TOKEN):
        raise RuntimeError("PUSHOVER_USER/PUSHOVER_TOKEN not configured")
    payload = {
        "user": PUSHOVER_USER,
        "token": PUSHOVER_TOKEN,
        "title": "Daily Market Briefing",
        "message": message[:1024],
    }
    response = requests.post(PUSHOVER_URL, data=payload, timeout=30)
    response.raise_for_status()


@app.get("/")
def health() -> dict:
    return {"status": "ok"}


@app.get("/run")
def run(key: str = "") -> dict:
    if not BRIEFING_SECRET or key != BRIEFING_SECRET:
        raise HTTPException(status_code=403, detail="Invalid key")
    message = build_briefing()
    send_push(message)
    return {"sent": True, "message": message}
