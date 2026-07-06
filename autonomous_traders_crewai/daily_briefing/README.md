---
title: Daily Market Briefing
emoji: 📈
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Daily Market Briefing

Fetches price + recent news for IEX, NTPC Green Energy, Ola Electric, ONGC and
Suzlon (all NSE-listed), and pushes a summary via Pushover.

Woken and triggered once a day by an external cron (this Space has no
scheduler of its own): `GET /run?key=<BRIEFING_SECRET>`.

Required Space secrets: `PUSHOVER_USER`, `PUSHOVER_TOKEN`, `TAVILY_API_KEY`,
`BRIEFING_SECRET`.
