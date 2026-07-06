# trader

Wakes and triggers the [Daily Market Briefing](https://huggingface.co/spaces/JSanthosh/daily-market-briefing)
Hugging Face Space every day at 9am IST, via `.github/workflows/daily-briefing.yml`.

Free HF Spaces sleep after inactivity and have no cron of their own, so this
repo's only job is to ping the Space's `/run` endpoint on a schedule.

## Setup

Add a repository secret named `BRIEFING_KEY` (Settings -> Secrets and
variables -> Actions -> New repository secret) matching the `BRIEFING_SECRET`
configured on the Space.
