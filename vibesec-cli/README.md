```
  ██╗    ██╗ ██████╗ ███████╗███████╗██╗███╗   ██╗ ██████╗ ███████╗████████╗
  ██║    ██║██╔═══██╗██╔════╝██╔════╝██║████╗  ██║██╔═══██╗██╔════╝╚══██╔══╝
  ██║ █╗ ██║██║   ██║███████╗███████╗██║██╔██╗ ██║██║   ██║███████╗   ██║
  ██║███╗██║██║   ██║╚════██║╚════██║██║██║╚██╗██║██║   ██║╚════██║   ██║
  ╚███╔███╔╝╚██████╔╝███████║███████║██║██║ ╚████║╚██████╔╝███████║   ██║
   ╚══╝╚══╝  ╚═════╝ ╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝   ╚═╝
```

> **The security scanner for AI-built apps.**
> 100-point benchmark · A+ to F grades · GitHub badge included.

VibeSec is a fast, standalone vulnerability benchmark that checks if your AI-generated or "vibe-coded" application exposes common security misconfigurations. One command, zero setup.

---

## Install

```bash
pip install vibesec
```

## Quick Start

```bash
vibesec your-app.com
```

That's it. VibeSec runs 7 categories of security checks and gives you a score out of 100 with a letter grade.

### JSON output

```bash
vibesec your-app.com --json
```

### Save report to file

```bash
vibesec your-app.com --json -o report.json
```

### Custom timeout

```bash
vibesec your-app.com --timeout 10
```

---

## Example Output

```
  ██╗    ██╗ ██████╗ ███████╗███████╗██╗███╗   ██╗ ██████╗ ███████╗████████╗
  ██║    ██║██╔═══██╗██╔════╝██╔════╝██║████╗  ██║██╔═══██╗██╔════╝╚══██╔══╝
  ██║ █╗ ██║██║   ██║███████╗███████╗██║██╔██╗ ██║██║   ██║███████╗   ██║
  ██║███╗██║██║   ██║╚════██║╚════██║██║██║╚██╗██║██║   ██║╚════██║   ██║
  ╚███╔███╔╝╚██████╔╝███████║███████║██║██║ ╚████║╚██████╔╝███████║   ██║
   ╚══╝╚══╝  ╚═════╝ ╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝   ╚═╝
  v0.1.0 | AI/Vibe-Coding Vulnerability Benchmark | example.com

  Scanning example.com ...

╭─────────── VIBESEC ───────────────────────────────────────────╮
│                                                                │
│  VIBESEC BENCHMARK — AI/Vibe-Coding Vulnerability Audit       │
│                                                                │
│  Score: ██████████████████████████████████████░░░░░░ 72/100 (B)│
│                                                                │
│  Findings: 5   0 critical, 2 high, 2 medium, 1 low, 0 info    │
│                                                                │
╰────────────────────────────────────────────────────────────────╯
  Categories: exposed_config: 0  unauth_api: 2  cors: 0  anon_keys: 0  security_headers: 2  exposed_db: 0  storage_exposure: 1

                 Vibe Coding Vulnerabilities — 5 detected
┏━━━━━━━━━━━┳━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━┓
┃ Severity  ┃ Category        ┃ Finding                    ┃ Pts ┃
┡━━━━━━━━━━━╇━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━┩
│ HIGH      │ unauth_api      │ Unauthenticated API — /api/ │ 10  │
│ HIGH      │ unauth_api      │ Unauthenticated API — /dash │ 10  │
│ MEDIUM    │ security_header │ Missing HSTS header         │  8  │
│ MEDIUM    │ security_header │ Missing CSP header          │  6  │
│ LOW       │ storage_exposur │ Storage path accessible — / │  3  │
└───────────┴────────────────┴────────────────────────────┴─────┘

╭──────── Badge ────────────────────────────────────────────────╮
│  GitHub README Badge (copy-paste):                            │
│  ![VibeSec Grade B](https://img.shields.io/badge/VibeSec-B...│
╰────────────────────────────────────────────────────────────────╯
```

---

## How It Works

VibeSec runs **7 independent vulnerability categories** against your target:

| # | Category | What it checks |
|---|----------|---------------|
| 1 | **Exposed Config** | `.env`, `.git/config`, `docker-compose.yml`, AWS credentials, SSH keys, CI configs |
| 2 | **Unauth APIs** | `/api/webhooks`, `/api/v1/admin`, `/api/trpc`, `/dashboard` — accessible without auth? |
| 3 | **CORS Policy** | Wildcard origins (`*`), origin reflection, credentials exposure |
| 4 | **Anon Keys** | Supabase, Firebase, AWS S3, Cloudflare R2, Vercel Blob, GCP, Azure URLs in source |
| 5 | **Security Headers** | HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| 6 | **Exposed DB Admins** | phpMyAdmin, Adminer, Mongo Express, pgAdmin, Prisma Studio, GraphQL Playground |
| 7 | **Storage Exposure** | Open directory listings on `/uploads/`, `/public/`, S3 bucket listings |

Each finding deducts points from 100. Every finding is **verified via real HTTP responses** — zero fabrication.

### Grading Scale

| Score | Grade | Color |
|-------|-------|-------|
| 90–100 | A+ | 🟢 brightgreen |
| 80–89 | A | 🟢 green |
| 65–79 | B | 🟡 yellow |
| 50–64 | C | 🔴 red |
| 35–49 | D | 🔴 orange |
| 0–34 | F | 🔴 red |

---

## Add the Badge to Your README

After scanning, VibeSec outputs a ready-to-paste Markdown badge. Drop it into your project's README:

```markdown
![VibeSec Grade A+](https://img.shields.io/badge/VibeSec-A+-brightgreen?style=for-the-badge&labelColor=0B1C2C)
```

It renders as:

![VibeSec Grade A+](https://img.shields.io/badge/VibeSec-A+-brightgreen?style=for-the-badge&labelColor=0B1C2C)

---

## GitHub Actions

Add VibeSec to your CI/CD pipeline:

```yaml
name: VibeSec Security Scan
on: [push, pull_request]
jobs:
  vibesec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install vibesec
      - run: vibesec ${{ vars.DEPLOY_URL || 'example.com' }} --json -o vibesec-report.json
      - uses: actions/upload-artifact@v4
        with:
          name: vibesec-report
          path: vibesec-report.json
```

---

## Python API

```python
from vibesec import scan

result = scan("your-app.com", timeout=10)
print(f"Score: {result.score}/100 — Grade: {result.grade}")
print(f"Findings: {len(result.findings)}")
print(f"Badge: {result.badge_markdown}")

# JSON export
import json
print(json.dumps(result.to_dict(), indent=2))
```

---

## Comparison

| Feature | VibeSec | OWASP ZAP | Nuclei | Nikto |
|---------|---------|-----------|--------|-------|
| Install | `pip install vibesec` | Java JAR | Go binary | Perl |
| Setup | Zero config | Complex | Templates | Moderate |
| AI/Vibe focus | ✅ Dedicated | ❌ | ❌ | ❌ |
| GitHub badge | ✅ Built-in | ❌ | ❌ | ❌ |
| 100-point score | ✅ | ❌ | ❌ | ❌ |
| Scan time | ~30s | 5–30 min | 1–10 min | 1–5 min |
| Dependencies | `rich` only | Java 11+ | Go | Perl + libs |
| CLI + API | ✅ Both | GUI + CLI | CLI only | CLI only |

---

## License

MIT — free for personal and commercial use.

---

> Built by [ReconPro Security](https://github.com/reconpro-security) — Enterprise Attack Surface Management.
