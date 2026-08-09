"""ReconPro Enterprise — The Security Reconnaissance Platform.

Eleven Blades. One Target. One Verdict.

Remote Modules:
    recon      13-category surface reconnaissance
    auth       15 auth bypass techniques
    chain      SSRF + redirect chain hunting
    bot        C2 / bot infrastructure detection
    gorgon     15-stage AI red team
    oblivion   23-stage analytical dissolution (DREAD)
    vibesec    AI/vibe-coding vulnerability benchmark
    nhi        Non-Human Identity & blast-radius mapping
    pegasus    Pegasus spyware/surveillance detection
    cloud_recon Cloud infrastructure reconnaissance
    team       Team collaboration & shared scans

Advanced Modules (v9.2.0):
    quantum_fingerprint  OS/kernel fingerprinting via HTTP timing
    dark_web_monitor     Credential leak & exposure scanner
    info_ops             Information operations & deception analysis
    steganography_detector Hidden data & covert channel detection
    covert_channel       Covert channel detection & simulation
    zero_day_hunter      Anomaly-based zero-day pattern detection
    infrastructure_ghost Complete infrastructure ghosting
    signal_intelligence  SIGINT for HTTP (beaconing, C2)
    nation_state_attributor Nation-state attack attribution engine
    weaponized_report    Tracking & beacon detection in documents
    honeypot_dance       Honeypot detection & effectiveness scoring
    dead_drop            Cryptographic dead drop detection

Local Modules:
    host       Full laptop/machine security audit
    dev        Developer security scan (secrets, deps, git, docker)
    doctor     Security health check with fix commands

Powers:
    chat       Interactive REPL — talk to ReconPro naturally
    tui        Visual terminal dashboard
    blitz      Parallel multi-target scanning
    agent      Autonomous goal-driven scanning
    subdomains Subdomain discovery (CT logs + DNS)
    schedule   Cron-like recurring scans
    serve      REST API server
    report     HTML report generation
    history    Scan history with diff/comparison
    plugin     Custom module system
    screenshot Browser screenshots (Playwright)

Usage:
    reconpro example.com                    # Remote scan
    reconpro chat                          # Talk to it
    reconpro tui                           # Visual dashboard
    reconpro audit                          # Scan your laptop
    reconpro blitz t1.com t2.com t3.com     # Parallel scan
    reconpro agent scan everything          # Autonomous
    reconpro subdomains example.com         # Discover subs
    reconpro serve                          # API server
"""

__version__ = "9.2.0"
__all__ = ["scan", "ReconProResult", "audit_scan", "__version__"]

from .scanner import scan, ReconProResult, audit_scan  # noqa: E402
