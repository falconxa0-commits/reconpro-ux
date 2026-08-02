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

Local Modules:
    host       Full laptop/machine security audit
    dev        Developer security scan (secrets, deps, git, docker)
    doctor     Security health check with fix commands

Usage:
    reconpro example.com                    # Remote scan
    reconpro audit                          # Scan your laptop
    reconpro dev                            # Scan your project
    reconpro doctor                         # Health check
    reconpro ports                          # Show open ports
    reconpro secrets                        # Find secrets
"""

__version__ = "3.0.0"
__all__ = ["scan", "ReconProResult", "__version__"]

from .scanner import scan, ReconProResult  # noqa: E402
