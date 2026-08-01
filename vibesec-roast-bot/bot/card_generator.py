"""Share Card Image Generator.

Generates dark-themed, branded PNG share cards (1200x675) using Pillow.
Twitter/X optimal aspect ratio.
"""

from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Dict, List, Tuple

logger = logging.getLogger("vibesec_roast.card_generator")

# ── Colors ──────────────────────────────────────────────────────────────
BG_COLOR = (11, 28, 44)          # #0B1C2C
GREEN = (0, 255, 136)            # #00ff88
WHITE = (255, 255, 255)
DIM_WHITE = (180, 190, 200)
GRADE_COLORS: Dict[str, Tuple[int, int, int]] = {
    "A+": (0, 255, 136),      # green
    "A":  (0, 230, 118),      # green
    "B":  (255, 235, 59),     # yellow
    "C":  (255, 152, 0),      # orange
    "D":  (244, 67, 54),      # red
    "F":  (211, 47, 47),      # dark red
}
FINDING_COLORS: Dict[str, Tuple[int, int, int]] = {
    "exposed_config": (255, 82, 82),
    "unauth_api": (255, 167, 38),
    "cors": (255, 238, 88),
    "security_headers": (66, 165, 245),
    "storage_exposure": (171, 71, 188),
}

# ── Font resolution ────────────────────────────────────────────────────
_FONT_CACHE: Dict[str, Any] = {}


def _find_font(size: int, bold: bool = False) -> Any:
    """Find a suitable font, with graceful fallbacks."""
    key = f"{size}_{bold}"
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]

    from PIL import ImageFont

    # Try DejaVu Sans (common on Linux/Docker)
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # fallback to bold
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",  # macOS
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
    ]

    for path in font_paths:
        if path and os.path.exists(path):
            try:
                font = ImageFont.truetype(path, size)
                _FONT_CACHE[key] = font
                return font
            except Exception:
                continue

    # Ultimate fallback
    font = ImageFont.load_default()
    _FONT_CACHE[key] = font
    return font


def generate_card(
    card_data: Dict[str, Any],
    output_path: str | None = None,
) -> str:
    """Generate a share card PNG and return the file path.

    Args:
        card_data: Dict with score, grade, handle, findings, roast_material.
        output_path: Where to save. If None, uses a temp file.

    Returns:
        Absolute path to the generated PNG.
    """
    from PIL import Image, ImageDraw

    W, H = 1200, 675
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    score = card_data.get("score", 0)
    grade = card_data.get("grade", "F")
    handle = card_data.get("handle", "unknown")
    findings = card_data.get("findings", [])
    material = card_data.get("roast_material", {})

    # ── Top: VIBESEC logo text ─────────────────────────────────────────
    logo_font = _find_font(28, bold=True)
    draw.text((40, 30), "VIBESEC", fill=GREEN, font=logo_font)
    sub_font = _find_font(16)
    draw.text((175, 37), "Security Roast", fill=DIM_WHITE, font=sub_font)

    # Thin green accent line
    draw.rectangle([(40, 68), (1160, 70)], fill=GREEN)

    # ── Center: Grade ──────────────────────────────────────────────────
    grade_color = GRADE_COLORS.get(grade, (255, 82, 82))
    grade_font = _find_font(140, bold=True)
    grade_text = grade
    # Center the grade horizontally
    bbox = draw.textbbox((0, 0), grade_text, font=grade_font)
    gw = bbox[2] - bbox[0]
    gx = (W - gw) // 2
    draw.text((gx, 100), grade_text, fill=grade_color, font=grade_font)

    # ── Score: XX/100 ─────────────────────────────────────────────────
    score_font = _find_font(36, bold=True)
    score_text = f"{score}/100"
    bbox = draw.textbbox((0, 0), score_text, font=score_font)
    sw = bbox[2] - bbox[0]
    draw.text(((W - sw) // 2, 260), score_text, fill=WHITE, font=score_font)

    # ── Domain/handle ──────────────────────────────────────────────────
    domain_font = _find_font(20)
    domain_text = f"@{handle}"
    bbox = draw.textbbox((0, 0), domain_text, font=domain_font)
    dw = bbox[2] - bbox[0]
    draw.text(((W - dw) // 2, 320), domain_text, fill=DIM_WHITE, font=domain_font)

    # ── Finding dots ──────────────────────────────────────────────────
    categories = []
    if material.get("has_env"):
        categories.append(("exposed_config", ".env exposed"))
    for api in material.get("unauth_apis", []):
        categories.append(("unauth_api", f"{api} open"))
    if material.get("cors_wildcard"):
        categories.append(("cors", "CORS open"))
    for hdr in material.get("missing_headers", []):
        categories.append(("security_headers", f"No {hdr}"))
    if material.get("storage_exposed"):
        categories.append(("storage_exposure", "Storage listed"))

    dot_y = 380
    dot_font = _find_font(15)
    for i, (cat, label) in enumerate(categories[:6]):  # max 6 dots
        x = 100 + i * 180
        color = FINDING_COLORS.get(cat, (150, 150, 150))
        # Colored circle
        draw.ellipse([(x, dot_y + 2), (x + 12, dot_y + 14)], fill=color)
        draw.text((x + 18, dot_y), label, fill=DIM_WHITE, font=dot_font)

    # ── Bottom CTA ─────────────────────────────────────────────────────
    draw.rectangle([(40, 440), (1160, 442)], fill=(30, 50, 70))
    cta_font = _find_font(18)
    cta_text = "Scan your app → Mention @VibeSecRoast with a URL"
    bbox = draw.textbbox((0, 0), cta_text, font=cta_font)
    cw = bbox[2] - bbox[0]
    draw.text(((W - cw) // 2, 460), cta_text, fill=GREEN, font=cta_font)

    # ── Bottom right: ReconPro branding ───────────────────────────────
    brand_font = _find_font(14)
    brand_text = "by ReconPro | github.com/reconpro-security/vibesec"
    draw.text((W - 440, 635), brand_text, fill=(60, 80, 100), font=brand_font)

    # ── Save ───────────────────────────────────────────────────────────
    if output_path is None:
        output_path = os.path.join(tempfile.gettempdir(), f"vibesec-card-{grade}-{score}.png")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    img.save(output_path, "PNG")
    logger.info("Card saved to %s (%dx%d)", output_path, W, H)
    return output_path
