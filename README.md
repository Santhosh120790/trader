# trader

An autonomous trading floor (CrewAI): five AI trader accounts (Warren,
George, Ray, Cathie, Santhosh) that research and trade five NSE-listed Indian
stocks — IEX, NTPC Green Energy, Ola Electric, ONGC and Suzlon — priced live
via yfinance. See [autonomous_traders_crewai/PROJECT_GUIDE.md](autonomous_traders_crewai/PROJECT_GUIDE.md)
for the full architecture and how to run it.

## Daily market briefing

`.github/workflows/daily-briefing.yml` wakes and triggers the
[Daily Market Briefing](https://huggingface.co/spaces/JSanthosh/daily-market-briefing)
Hugging Face Space every day at 9am IST, which pushes a price + news summary
for the 5 stocks via Pushover. Free HF Spaces sleep after inactivity and have
no cron of their own, so this repo's workflow is what keeps it firing on
schedule. Source for that service lives at
[autonomous_traders_crewai/daily_briefing](autonomous_traders_crewai/daily_briefing).

### Setup

Add a repository secret named `BRIEFING_KEY` (Settings -> Secrets and
variables -> Actions -> New repository secret) matching the `BRIEFING_SECRET`
configured on the Space.
