# ReconPro v10 -- Roadmap

## v10.0.0 (Current)

ReconPro v10 represents a ground-up redesign focused on enterprise
readiness, pure-Python architecture, and comprehensive security testing.

**What was accomplished:**

### Architecture
- Pure Python with zero external dependencies (only `rich` for rendering)
- Centralized module registry (`registry.py`) as single source of truth
- Lazy module loading to minimize startup time
- Universal `Finding` dataclass across all 26 modules
- Sync scan engine (`scanner.py`) and async engine (`engine.py`)
- Structured observability: JSON logging, metrics, trace receipts

### Scanning Modules (26 total)
- 11 core remote modules: recon (25 categories), auth, chain, bot,
  gorgon (15-stage red team), oblivion (23-stage DREAD), vibesec,
  nhi, pegasus, cloud_recon, team
- 12 advanced modules: quantum_fingerprint (OS fingerprinting via
  HTTP timing), dark_web_monitor, info_ops, steganography_detector,
  covert_channel, zero_day_hunter, infrastructure_ghost,
  signal_intelligence, nation_state_attributor, weaponized_report,
  honeypot_dance, dead_drop
- 3 local modules: host, dev, doctor

### Security Hardening
- Input sanitization: `sanitize_target`, `sanitize_path`,
  `sanitize_filename`, `sanitize_html`, `sanitize_shell`, `sanitize_log`
- Safe parsers: `safe_json_parse` (1MB/20 depth/10K keys),
  `safe_url_parse` (scheme whitelist), `safe_xml_parse` (no entities)
- Secret detection: 10 regex patterns for AWS keys, GitHub tokens,
  private keys, DB strings, JWTs
- Audit logging: JSON format, rotating file handler (10MB, 5 backups)
- File hash verification for supply chain integrity

### Export Formats
- SARIF 2.1.0 (GitHub Code Scanning compatible)
- JSON (machine-readable)
- Markdown (human-readable)
- HTML (self-contained reports)
- Print-ready HTML (for PDF export)

### CLI and Interfaces
- Rich terminal rendering with color-coded severity and grades
- Visual TUI dashboard (`nexus`) with keyboard and mouse support
- Interactive chat REPL (`chat`)
- REST API server (`serve`)
- Parallel multi-target scanning (`blitz`)
- Autonomous agent (`agent`)
- Cron-like scheduler (`schedule`)
- Scan history with diff/comparison (`history`)
- Plugin system with lifecycle hooks

## v10.1.0 (Next)

Planned improvements for the next minor release:

### Performance
- Connection pooling for repeated requests to the same host
- Response caching to avoid duplicate probes
- Parallel module execution within a single scan
- Streaming SARIF output for large result sets

### Modules
- IaC audit module enhancement (`modules/iac_audit.py`)
- Container security module enhancement (`modules/container_sec.py`)
- AST analyzer module (`modules/ast_analyzer.py`) promotion to default
- API discovery module (`api_discovery.py`) integration

### Developer Experience
- Pydantic models for type-safe finding creation
- Module template generator (`reconpro plugin create my_check`)
- Interactive module testing framework
- VS Code extension for ReconPro modules

### Integrations
- Azure DevOps integration
- GitLab security dashboard integration
- OpenCTI threat intelligence platform integration
- DefectDojo finding import

## v11.0.0 (Future)

Long-term vision for the next major version:

### Architecture
- Distributed scanning with agent mesh
- Real-time collaborative scanning (multiple analysts, one target)
- Plugin marketplace with signed plugins
- GraphQL API alongside REST
- Web-based dashboard (separate from terminal TUI)

### Intelligence
- Cross-scan correlation engine using knowledge graph
- Automated regression detection (compare scans over time)
- Threat modeling assistant (suggest modules based on target profile)
- Attack surface management lifecycle

### Advanced Capabilities
- Active exploitation module (with authorization framework)
- Network-level scanning (raw sockets, SYN scans)
- Wireless network assessment
- Cloud API security testing (AWS, GCP, Azure)
- Kubernetes cluster security scanning

### Enterprise Features
- Role-based access control for the REST API
- Scan scheduling with calendar integration
- Compliance mapping (SOC2, ISO 27001, PCI DSS)
- Executive reporting with trend analysis
- Multi-tenant support for MSSPs

## Contributing to the Roadmap

The roadmap is maintained in this file. To propose changes:

1. Open a GitHub issue with the `roadmap` label
2. Describe the proposed change and its rationale
3. Discuss with maintainers in the issue thread
4. For substantial features, submit a design document (ADR)
5. Approved changes are incorporated into the next release cycle

Architecture Decision Records (ADRs) for past decisions are available
in `docs/ADR/`.
