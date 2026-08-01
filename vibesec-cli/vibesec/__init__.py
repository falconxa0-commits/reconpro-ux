"""VibeSec — AI/Vibe-Coding Vulnerability Benchmark.

The security scanner for AI-built apps. 100-point benchmark.
A+ to F grades. GitHub badge included.
"""

from .scanner import VibeSecResult, scan

__version__ = "0.1.0"
__all__ = ["scan", "VibeSecResult", "__version__"]
