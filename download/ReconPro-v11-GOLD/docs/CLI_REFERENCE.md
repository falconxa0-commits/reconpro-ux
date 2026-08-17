# CLI Reference — ReconPro v11.0.0

Complete command-line reference for the ReconPro Python CLI. 77+ commands across 5 categories.

## Global Flags
| Flag | Description |
|------|-------------|
| `--json` | JSON output (no Rich formatting) |
| `--help` | Show command help |
| `--version` | Show version |

## Exit Codes: 0=Success, 1=Error, 2=Invalid args, 130=Interrupted

## Remote Modules
| Command | Description |
|---------|-------------|
| `reconpro <target>` | Full surface reconnaissance |
| `reconpro auth <target>` | 15 auth bypass techniques |
| `reconpro chain <target>` | SSRF + redirect chain hunting |
| `reconpro bot <target>` | C2 / bot infrastructure detection |
| `reconpro gorgon <target>` | 15-stage AI red team |
| `reconpro oblivion <target>` | 23-stage DREAD analysis |
| `reconpro vibesec <target>` | AI/vibe-coding vulnerability benchmark |
| `reconpro nhi <target>` | Non-Human Identity mapping |
| `reconpro pegasus <target>` | Pegasus spyware detection |
| `reconpro cloud-recon <target>` | Cloud infrastructure recon |
| `reconpro quantum-fingerprint <target>` | OS/kernel fingerprinting |
| `reconpro dark-web-monitor <target>` | Credential leak scanning |
| `reconpro info-ops <target>` | Information operations analysis |
| `reconpro steganography-detector <target>` | Hidden data detection |
| `reconpro covert-channel <target>` | Covert channel detection |
| `reconpro zero-day-hunter <target>` | Zero-day pattern detection |
| `reconpro infrastructure-ghost <target>` | Infrastructure ghosting |
| `reconpro signal-intelligence <target>` | HTTP beaconing/C2 SIGINT |
| `reconpro nation-state-attributor <target>` | Nation-state attribution |
| `reconpro weaponized-report <target>` | Tracking beacon detection |
| `reconpro honeypot-dance <target>` | Honeypot detection |
| `reconpro dead-drop <target>` | Cryptographic dead drop detection |

## Intelligence Systems
| Command | Description |
|---------|-------------|
| `reconpro threat-intel <target>` | CVE/CWE/CAPEC/MITRE enrichment |
| `reconpro attack-graph <target>` | Graph-based attack chain analysis |
| `reconpro ai-analyst <target>` | AI classification and attack paths |

## Local Modules
| Command | Description |
|---------|-------------|
| `reconpro audit` | Full machine security audit |
| `reconpro host` | Host security scan |
| `reconpro dev` | Developer security scan |
| `reconpro doctor` | Health check with fix commands |

## Powers
| Command | Description |
|---------|-------------|
| `reconpro chat` | Interactive REPL |
| `reconpro nexus` | Visual TUI dashboard |
| `reconpro blitz <targets>` | Parallel multi-target scan |
| `reconpro agent scan <scope>` | Autonomous scanning |
| `reconpro subdomains <target>` | Subdomain discovery |
| `reconpro schedule` | Recurring scan scheduling |
| `reconpro serve` | REST API server |
| `reconpro report <target>` | HTML report generation |
| `reconpro history` | Scan history with diff |
| `reconpro plugin` | Custom module system |
| `reconpro screenshot <target>` | Browser screenshots |
| `reconpro swarm <target>` | Multi-agent attack swarm |
| `reconpro adversarial` | Hacker vs coder simulation |

## Engineering Systems
| Command | Description |
|---------|-------------|
| `reconpro engineering` | Full engineering pipeline |
| `reconpro validate` | Validation pipeline |
| `reconpro benchmark` | Performance benchmarks |
| `reconpro auto-fix` | AST-based auto-fix proposals |
| `reconpro repository-memory` | Engineering knowledge store |
| `reconpro digital-twin` | Virtual runtime model |
| `reconpro quality-intelligence` | Code quality analysis |
| `reconpro security-hardening` | Security policy engine |
| `reconpro regression-intelligence` | Regression detection |
| `reconpro prompt-defense` | Prompt injection defense |

## Usage Examples
```bash
reconpro example.com                    # Full scan
reconpro example.com --json | jq .     # JSON output
reconpro audit                          # Local audit
reconpro chat                           # Interactive
reconpro blitz t1.com t2.com t3.com     # Parallel scan
reconpro agent scan everything          # Autonomous
```

## Optional Dependencies
`async` (aiohttp), `browser` (playwright), `llm` (openai, anthropic), `graph` (networkx), `raw` (scapy), `intel` (shodan), `collab` (websockets), `integrations` (jira, slack-sdk), `full` (all)
