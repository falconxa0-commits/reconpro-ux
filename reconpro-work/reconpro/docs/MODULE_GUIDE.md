# ReconPro v10 -- Module Guide

## Overview

ReconPro v10 ships with 26 scanning modules organized into three categories:
11 core remote modules, 12 advanced modules, and 3 local modules. Each module
is a self-contained Python file under `modules/` that exports a `run()` function
returning a list of `Finding` objects. Modules are orchestrated by `scanner.py`
(sync) or `engine.py` (async) and registered in `registry.py`.

The default remote scan runs 20 modules. Use `-m` to select specific modules
or `--all` to run every registered module.

## Core Remote Modules

### recon -- Surface Reconnaissance

**File:** `modules/recon.py` | **Registry name:** RECON | **Color:** cyan

The flagship module performing 25-category surface analysis: DNS resolution
(A, AAAA, CNAME, MX, NS, TXT) via Cloudflare DoH, HTTP headers analysis,
technology fingerprinting (40+ technologies), robots.txt/sitemap.xml parsing,
TLS/SSL certificate info and cipher analysis, open ports (top 20), sensitive
path exposure (.env, .git, configs), API endpoint discovery, CORS policy
analysis, cookie security flags, redirect chain analysis, WAF detection (15
providers), email/SPF/DMARC, Certificate Transparency (crt.sh), threat
intelligence (abuse.ch), HTTP/2 protocol analysis, subdomain enumeration,
email harvesting, open redirect checks, mixed content detection, and meta
tag security.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### auth -- Authentication Bypass

**File:** `modules/auth.py` | **Registry name:** AUTH BYPASS | **Color:** yellow

Tests 15 authentication bypass techniques including default credentials across
common paths, authentication header manipulation, JWT validation issues,
session token weaknesses, and brute-force protection gaps.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### chain -- SSRF Chain Hunter

**File:** `modules/chain.py` | **Registry name:** CHAIN HUNTER | **Color:** magenta

Detects Server-Side Request Forgery vulnerabilities and follows redirect chains
to discover internal services exposed through open redirect vulnerabilities.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### bot -- C2/Bot Detection

**File:** `modules/bot.py` | **Registry name:** BOT HUNTER | **Color:** red

Analyzes response patterns, timing anomalies, beaconing behavior, and known
botnet indicators to detect compromised or malicious infrastructure.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### gorgon -- AI Red Team

**File:** `modules/gorgon.py` | **Registry name:** GORGON ULTRA | **Color:** bright_red

A 15-stage adversarial testing engine. Tests SQL injection (5 payload families),
XSS (5 payload families), path traversal (4 variants), command injection, and
additional attack vectors against the target.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### oblivion -- DREAD Analysis

**File:** `modules/oblivion.py` | **Registry name:** OBLIVION | **Color:** bright_magenta

A 23-stage analytical dissolution engine using DREAD scoring (Damage,
Reprocibility, Exploitability, Affected users, Discoverability) with six
fear levels: SUBTLE, NOTABLE, SUBSTANTIAL, DEVASTATING, OMNIPOTENT, ABSOLUTE.
Can leverage AI analysis via ZAI stream integration.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### vibesec -- Vibe Coding Benchmark

**File:** `modules/vibesec.py` | **Registry name:** VIBESEC | **Color:** bright_green

Benchmarks AI/vibe-coding generated code for security vulnerabilities.
**Special return type:** Returns a 4-tuple `(findings, score, grade, badge)`
instead of just a list of findings.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> tuple[list[Finding], int, str, str]`

### nhi -- Non-Human Identity

**File:** `modules/nhi.py` | **Registry name:** NHI GRAPH | **Color:** cyan

Maps non-human identities (service accounts, API keys, machine identities)
and their blast radius, assessing permissions and trust relationships.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### pegasus -- Pegasus Detection

**File:** `modules/pegasus.py` | **Registry name:** PEGASUS HUNTER | **Color:** bright_red

Detects indicators of Pegasus spyware, suspicious domain resolutions, and
surveillance-related infrastructure signatures.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### cloud_recon -- Cloud Reconnaissance

**File:** `modules/cloud_recon.py` | **Registry name:** CLOUD RECON | **Color:** bright_cyan

Identifies cloud providers, S3 buckets, cloud storage exposure, and
cloud-specific misconfigurations.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### team -- Team Collaboration

**File:** `modules/team.py` | **Registry name:** TEAM | **Color:** cyan

Manages team-based scanning, shared findings, and collaborative assessments.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

## Advanced Modules

### quantum_fingerprint -- OS Fingerprinting

**File:** `modules/quantum_fingerprint.py` | **Registry name:** QUANTUM FINGERPRINT | **Color:** bright_cyan

Infers remote OS via HTTP timing analysis. No raw sockets, no SYN packets,
no privileged access. Uses seven signals: TTL deduction, TCP window size,
SYN-ACK timing, keep-alive persistence, path MTU detection, congestion
control algorithm identification, and timestamp resolution.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### dark_web_monitor -- Credential Leak Scanner

**File:** `modules/dark_web_monitor.py` | **Registry name:** DARK WEB MONITOR | **Color:** bright_red

Checks public breach databases and paste sites for credentials associated
with the target domain.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### info_ops -- Information Operations

**File:** `modules/info_ops.py` | **Registry name:** INFO OPS | **Color:** magenta

Detects coordinated influence campaigns, fake infrastructure, and
disinformation indicators.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### steganography_detector -- Steganography Detection

**File:** `modules/steganography_detector.py` | **Registry name:** STEGANO DETECTOR | **Color:** yellow

Analyzes images, metadata, and payloads for steganographic content.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### covert_channel -- Covert Channel Detection

**File:** `modules/covert_channel.py` | **Registry name:** COVERT CHANNEL | **Color:** red

Identifies potential covert data exfiltration channels including timing
channels, DNS tunneling indicators, and protocol-level covert channels.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### zero_day_hunter -- Zero-Day Pattern Detection

**File:** `modules/zero_day_hunter.py` | **Registry name:** ZERO-DAY HUNTER | **Color:** bright_red

Uses behavioral analysis and anomaly detection for previously unknown
vulnerability patterns.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### infrastructure_ghost -- Infrastructure Ghosting

**File:** `modules/infrastructure_ghost.py` | **Registry name:** INFRA GHOST | **Color:** cyan

Maps the complete infrastructure footprint including subnets, ASN
information, and shared infrastructure.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### signal_intelligence -- SIGINT/C2 Detection

**File:** `modules/signal_intelligence.py` | **Registry name:** SIGINT | **Color:** bright_magenta

Analyzes HTTP traffic for beaconing behavior and C2 communication patterns.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### nation_state_attributor -- Nation-State Attribution

**File:** `modules/nation_state_attributor.py` | **Registry name:** NATION-STATE ATTR | **Color:** bright_red

Analyzes TTPs, infrastructure, and behavioral patterns to assess nation-state
threat activity.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### weaponized_report -- Tracking Beacon Detection

**File:** `modules/weaponized_report.py` | **Registry name:** WEAPONIZED REPORT | **Color:** red

Scans for tracking pixels and surveillance indicators in documents.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### honeypot_dance -- Honeypot Detection

**File:** `modules/honeypot_dance.py` | **Registry name:** HONEYPOT DANCE | **Color:** yellow

Identifies honeypot signatures and scores deployment effectiveness.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

### dead_drop -- Cryptographic Dead Drops

**File:** `modules/dead_drop.py` | **Registry name:** DEAD DROP | **Color:** bright_cyan

Analyzes for dead drop infrastructure: steganographic DNS records, unusual
certificate patterns, and cryptographic signatures indicating covert communication.

**Signature:** `run(target, base_url, timeout=8, verify_tls=True) -> list[Finding]`

## Local Modules

### host -- Machine Audit

**File:** `modules/host.py` | **Registry name:** HOST AUDIT | **Color:** bright_yellow

Full laptop/machine audit: system configurations, running services, firewall
rules, user accounts, SSH configuration. Run via `reconpro audit`.

**Signature:** `run(target=".", base_url="", timeout=8, verify_tls=True) -> list[Finding]`

### dev -- Developer Security Scan

**File:** `modules/dev.py` | **Registry name:** DEV SEC | **Color:** bright_cyan

Scans for secrets in code, dependency vulnerabilities, git history exposure,
and Docker configuration issues.

**Signature:** `run(target=".", base_url="", timeout=8, verify_tls=True) -> list[Finding]`

### doctor -- Health Check

**File:** `modules/doctor.py` | **Registry name:** DOCTOR | **Color:** bright_green

Comprehensive health check with specific remediation commands for each finding.

**Signature:** `run(target=".", base_url="", timeout=8, verify_tls=True) -> list[Finding]`

## Module Reference Table

| Module | Category | Default | Description |
|---|---|---|---|
| recon | Core Remote | Yes | 25-category surface reconnaissance |
| vibesec | Core Remote | Yes | AI/vibe-coding vulnerability benchmark |
| auth | Core Remote | Yes | 15 auth bypass techniques |
| chain | Core Remote | Yes | SSRF + redirect chain hunting |
| oblivion | Core Remote | Yes | 23-stage DREAD analysis |
| gorgon | Core Remote | Yes | 15-stage AI red team |
| bot | Core Remote | Yes | C2/bot infrastructure detection |
| pegasus | Core Remote | Yes | Pegasus spyware detection |
| quantum_fingerprint | Advanced | Yes | OS fingerprinting via HTTP timing |
| dark_web_monitor | Advanced | Yes | Credential leak scanner |
| info_ops | Advanced | Yes | Information operations analysis |
| steganography_detector | Advanced | Yes | Steganography detection |
| covert_channel | Advanced | Yes | Covert channel detection |
| zero_day_hunter | Advanced | Yes | Zero-day pattern detection |
| infrastructure_ghost | Advanced | Yes | Infrastructure ghosting |
| signal_intelligence | Advanced | Yes | SIGINT/C2 detection |
| nation_state_attributor | Advanced | Yes | Nation-state attribution |
| weaponized_report | Advanced | Yes | Tracking beacon detection |
| honeypot_dance | Advanced | Yes | Honeypot detection |
| dead_drop | Advanced | Yes | Cryptographic dead drops |
| cloud_recon | Core Remote | No | Cloud infrastructure recon |
| team | Core Remote | No | Team collaboration |
| nhi | Core Remote | No | Non-human identity mapping |
| host | Local | Yes* | Full machine audit |
| dev | Local | Yes* | Developer security scan |
| doctor | Local | Yes* | Health check with fixes |

*Local modules are included in the default `reconpro audit` run.
