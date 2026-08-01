# @VibeSecRoast — Twitter/X Security Roast Bot

An automated public roasting engine that turns the VibeSec Benchmark into a viral social machine. Tag the bot with any URL and get a brutal, hilarious security breakdown with your VibeSec Grade (A+ to F).

## How It Works

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User tweets    │────▶│  Bot polls   │────▶│  Micro-Scan  │────▶│  Roast Engine│
│  @VibeSecRoast  │     │  mentions    │     │  (7 checks)  │     │  (templates) │
│  + URL          │     │  every 60s   │     │  < 10 sec    │     │              │
└─────────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                              │
                               ┌──────────────┐     ┌──────────────┐          │
                               │  Post Reply  │◀────│  Generate    │◀─────────┘
                               │  + Image     │     │  Share Card  │
                               │  + Thread    │     │  (Pillow)    │
                               └──────────────┘     └──────────────┘
```

### Micro-Scan (7 Checks, <10 Seconds)

| # | Check | What It Detects |
|---|-------|-----------------|
| 1 | `/.env` | Exposed configuration files |
| 2 | `/api/webhooks` | Unauthenticated webhook endpoints |
| 3 | `/dashboard` | Unauthenticated admin dashboards |
| 4 | `/admin` | Unauthenticated admin panels |
| 5 | `/uploads/` | Public storage directory listings |
| 6 | CORS Check | Origin reflection / wildcard policies |
| 7 | Security Headers | Missing HSTS, CSP headers |

## Setup

### 1. Install dependencies

```bash
cd vibesec-roast-bot
pip install -r requirements.txt
```

### 2. Configure Twitter API credentials

```bash
cp .env.example .env
# Edit .env with your Twitter Developer Portal credentials
```

You need a Twitter Developer account with OAuth 2.0 credentials:
- **Client ID** and **Client Secret**
- **Access Token** and **Refresh Token** (OAuth 2.0 with PKCE)
- **Bearer Token**

### 3. Run the bot

```bash
python -m bot.main
```

### Docker Deployment

```bash
cp .env.example .env
# Edit .env
docker-compose up -d --build
```

## Roast Examples

**Grade A+:**
> This app is locked down tighter than Fort Knox. @acme-corp built this with actual security in mind. Respect. Grade: A+ 🛡️

**Grade C:**
> Yikes. We found some problems. No HSTS header? In 2026? @startup-xyz, your AI assistant left the door wide open. Grade: C 🔥

**Grade F:**
> Absolute carnage. Your .env file is literally public. /dashboard doesn't need a password. CORS says 'everyone come in!' @quick-app, this app is a hacker's playground. Grade: F ☠️

## Rate Limiting

- **Twitter API:** 900 requests per 15-minute window (conservative usage)
- **Scan cache:** Same domain not re-scanned within 24 hours
- **Polling interval:** 60 seconds between mention checks
- **Thread delay:** 1 second between thread tweets

## Architecture

| File | Purpose |
|------|---------|
| `bot/scanner.py` | 10-second micro-scan engine (7 checks, concurrent HTTP) |
| `bot/roast_engine.py` | Roast template engine (3 variations per grade) |
| `bot/card_generator.py` | Share card PNG generator (Pillow, 1200×675) |
| `bot/twitter_client.py` | Twitter API v2 client (stdlib urllib only) |
| `bot/cache.py` | 24-hour JSON-file scan cache |
| `bot/config.py` | Central configuration with env var defaults |
| `bot/main.py` | Main polling loop with graceful shutdown |

## License

MIT — Part of the ReconPro platform by VibeSec.
