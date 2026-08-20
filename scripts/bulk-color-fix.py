"""Bulk color fix: replace wrong/inconsistent colors across all dashboard components."""
import re, os, glob

# All files to process
FILES = glob.glob('/home/z/my-project/src/app/(dashboard)/*/page.tsx')
FILES += glob.glob('/home/z/my-project/src/components/reconpro/*.tsx')

# Color replacements: (pattern, replacement)
# 1. Wrong greens: Tailwind green-500 (#22c55e) → OLED green (#00ff88)
# 2. Wrong reds: Tailwind red-500 (#ef4444) → OLED red (#ff3355)
# 3. Wrong yellows: Tailwind yellow-500 (#eab308) → OLED yellow (#d29922)
# 4. Wrong red-300 (#fca5a5) → lighter red for text
# 5. Wrong green-300 (#86efac) → lighter green for text
# 6. GitHub Dark borders/backgrounds
# 7. Bottom dock wrong colors
# 8. Purple removal

REPLACEMENTS = [
    # === WRONG GREENS ===
    # #22c55e (Tailwind green-500) → #00ff88 (OLED green)
    ('#22c55e', '#00ff88'),
    # #3dd68c (bottom dock green) → #00ff88
    ('#3dd68c', '#00ff88'),
    # #86efac (Tailwind green-300) → #00ff88 (for consistency)
    ('#86efac', '#00ff88'),
    
    # === WRONG REDS ===
    # #ef4444 (Tailwind red-500) → #ff3355 (OLED red)
    ('#ef4444', '#ff3355'),
    # #fca5a5 (Tailwind red-300) → #ff6677 (lighter OLED red for text)
    ('#fca5a5', '#ff6677'),
    # #e84057 (bottom dock red) → #ff3355
    ('#e84057', '#ff3355'),
    # #ff7b72 (GitHub lighter red) → #ff6677
    ('#ff7b72', '#ff6677'),
    
    # === WRONG YELLOWS ===
    # #eab308 (Tailwind yellow-500) → #d29922 (OLED yellow)
    ('#eab308', '#d29922'),
    # #e8b33d (bottom dock yellow) → #d29922
    ('#e8b33d', '#d29922'),
    
    # === WRONG BLUES ===
    # #5ba8d4 (bottom dock blue) → #44aaff (system blue)
    ('#5ba8d4', '#44aaff'),
    # #79c0ff (GitHub lighter blue) → #44aaff
    ('#79c0ff', '#44aaff'),
    # #06b6d4 (cyan, non-standard) → #44aaff
    ('#06b6d4', '#44aaff'),
    
    # === PURPLE REMOVAL (not in design system) ===
    # #a855f7 (purple-500) → #44aaff (map to blue as closest neutral)
    ('#a855f7', '#44aaff'),
    # #bb80d4 (lighter purple) → #6b7280 (neutral gray)
    ('#bb80d4', '#6b7280'),
    
    # === INCONSISTENT GRAYS ===
    # #555555 → #444444 (system muted text)
    ('#555555', '#444444'),
    # #888888 → #666666 (system secondary text)
    ('#888888', '#666666'),
    # #aaaaaa → #a3a3a3 (neutral-400)
    ('#aaaaaa', '#a3a3a3'),
    
    # === GITHUB DARK TOKENS → OLED TOKENS ===
    # #21262d (GitHub border) → rgba(255,255,255,0.06) equivalent
    ('#21262d', '#1a1a1a'),
    # #080b14 (GitHub card bg) → #000000
    ('#080b14', '#050505'),
    # #0d1117 (GitHub primer) → #050505
    ('#0d1117', '#050505'),
    # #161b22 (GitHub divider) → #111111
    ('#161b22', '#111111'),
    # #30363d (GitHub hover border) → #222222
    ('#30363d', '#222222'),
    # #050710 (GitHub input bg) → #0a0a0a
    ('#050710', '#0a0a0a'),
    # #0a0d14 (button text on green) → #000000
    ('#0a0d14', '#000000'),
    # #111111 → #0a0a0a (standardize to layout bg)
    ('border-[#111111]', 'border-white/[0.06]'),
    ('bg-[#111111]', 'bg-white/[0.03]'),
]

# Also handle Tailwind color classes
TAILWIND_FIXES = [
    # text-red-400, border-red-400, bg-red-400 → use design system colors
    (r'text-red-400', 'text-[#ff3355]'),
    (r'text-red-300', 'text-[#ff6677]'),
    (r'border-red-400', 'border-[#ff3355]'),
    (r'border-red-500', 'border-[#ff3355]'),
    (r'bg-red-400', 'bg-[#ff3355]'),
    (r'bg-red-500', 'bg-[#ff3355]'),
    (r'text-green-400', 'text-[#00ff88]'),
    (r'text-green-500', 'text-[#00ff88]'),
    (r'border-green-400', 'border-[#00ff88]'),
    (r'border-green-500', 'border-[#00ff88]'),
    (r'bg-green-400', 'bg-[#00ff88]'),
    (r'bg-green-500', 'bg-[#00ff88]'),
    (r'border-zinc-700', 'border-white/[0.08]'),
    (r'bg-zinc-800', 'bg-white/[0.05]'),
    (r'hover:bg-zinc-800', 'hover:bg-white/[0.05]'),
]

stats = {}
for fpath in FILES:
    basename = os.path.basename(os.path.dirname(fpath)) + '/' + os.path.basename(fpath)
    with open(fpath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Apply hex color replacements (case-insensitive for hex)
    for old, new in REPLACEMENTS:
        # Replace hex colors in className strings and style objects
        # Match #xxxxxx patterns
        content = content.replace(old, new)
        content = content.replace(old.upper(), new)
    
    # Apply Tailwind class fixes
    for pattern, replacement in TAILWIND_FIXES:
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        with open(fpath, 'w') as f:
            f.write(content)
        # Count changes
        changes = sum(1 for a, b in zip(original, content) if a != b)
        stats[basename] = 'updated'
        print(f'  ✅ {basename}')
    else:
        stats[basename] = 'no changes'

print(f'\nProcessed {len(FILES)} files, {sum(1 for v in stats.values() if v == "updated")} updated.')
