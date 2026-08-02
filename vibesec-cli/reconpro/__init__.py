"""ReconPro Enterprise — The Security Reconnaissance Platform.

Eight Blades. One Target. One Verdict.

Modules:
    recon      13-category surface reconnaissance
    auth       15 auth bypass techniques
    chain      SSRF + redirect chain hunting
    bot        C2 / bot infrastructure detection
    gorgon     15-stage AI red team
    oblivion   23-stage analytical dissolution
    vibesec    AI/vibe-coding vulnerability benchmark
    nhi        Non-Human Identity & blast-radius mapping

Usage:
    reconpro example.com
    reconpro example.com --modules recon,auth,vibesec
    reconpro example.com --all --json -o report.json
    reconpro vibesec example.com
"""

__version__ = "2.0.0"
__all__ = ["scan", "ReconProResult", "__version__"]

from .scanner import scan, ReconProResult  # noqa: E402
