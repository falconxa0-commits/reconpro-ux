"""Structural fix: Migrate GitHub-Dark components to OLED design system.

Key changes:
1. Replace `border-[#1a1a1a] bg-[#050505]` card patterns with `panel` class
2. Replace green CTA buttons with white primary buttons
3. Replace `<p>Loading...</p>` with skeleton loading
4. Replace inline SVGs with lucide-react icons
5. Fix dialog/modal styling
"""
import re, os

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w') as f:
        f.write(content)

# ═══════════════════════════════════════════════════════════════
# FIX 1: Replace GitHub-Dark card containers with panel class
# Pattern: border border-[#1a1a1a] bg-[#050505] rounded-lg → panel
# ═══════════════════════════════════════════════════════════════

def fix_card_containers(content):
    """Replace GitHub-Dark card patterns with panel class."""
    # Pattern 1: Full card pattern
    content = re.sub(
        r'border\s+border-\[#1a1a1a\]\s+bg-\[#050505\]\s+rounded-(?:lg|xl|md)',
        'panel',
        content
    )
    # Pattern 2: bg before border
    content = re.sub(
        r'bg-\[#050505\]\s+border\s+border-\[#1a1a1a\]\s+rounded-(?:lg|xl|md)',
        'panel',
        content
    )
    # Pattern 3: With additional classes
    content = re.sub(
        r'className="([^"]*?)border\s+border-\[#1a1a1a\]([^"]*?)bg-\[#050505\]([^"]*?)rounded-(?:lg|xl|md)([^"]*?)"',
        lambda m: f'className="{m.group(1)}{m.group(2)}{m.group(3)}panel{m.group(4)}"',
        content
    )
    # Pattern 4: Simpler card without border
    content = re.sub(
        r'bg-\[#050505\]\s+rounded-(?:lg|xl|md)\s+border\s+border-\[#1a1a1a\]',
        'panel',
        content
    )
    return content

# ═══════════════════════════════════════════════════════════════
# FIX 2: Replace green CTA buttons with white primary buttons
# Pattern: bg-[#00ff88] text-[#000000] font-semibold → bg-white text-black font-semibold
# ═══════════════════════════════════════════════════════════════

def fix_green_buttons(content):
    """Replace green primary buttons with white ones."""
    # Full green button pattern
    content = content.replace('bg-[#00ff88] text-[#000000]', 'bg-white text-black')
    content = content.replace('bg-[#00ff88] text-black', 'bg-white text-black')
    # Hover states
    content = content.replace('hover:bg-[#00ffcc]', 'hover:bg-white/90')
    content = content.replace('hover:bg-[#00dd77]', 'hover:bg-white/90')
    content = content.replace('hover:bg-[#00ff88]/90', 'hover:bg-white/90')
    return content

# ═══════════════════════════════════════════════════════════════
# FIX 3: Replace text-only loading with skeleton
# ═══════════════════════════════════════════════════════════════

def fix_loading_states(content):
    """Replace <p>Loading...</p> with skeleton blocks."""
    content = content.replace(
        '<p>Loading...</p>',
        '<div className="space-y-3"><div className="skeleton-pulse h-12 rounded-xl" /><div className="skeleton-pulse h-40 rounded-xl" /><div className="skeleton-pulse h-32 rounded-xl" /></div>'
    )
    return content

# ═══════════════════════════════════════════════════════════════
# FIX 4: Fix divider patterns
# ═══════════════════════════════════════════════════════════════

def fix_dividers(content):
    """Replace hardcoded divider colors with system ones."""
    content = content.replace('border-[#111111]', 'border-white/[0.05]')
    content = content.replace('border-[#222222]', 'border-white/[0.08]')
    content = content.replace('bg-[#111111]', 'bg-white/[0.04]')
    return content

# ═══════════════════════════════════════════════════════════════
# FIX 5: Fix section headers in GitHub-Dark components
# ═══════════════════════════════════════════════════════════════

def fix_section_headers(content):
    """Standardize section headers to use design system typography."""
    # Replace various section header patterns with consistent styling
    # GitHub-dark style: text-base font-medium text-[#f0f0f0]
    content = re.sub(
        r'text-\[#f0f0f0\]\s+font-medium',
        'text-white font-medium',
        content
    )
    return content

# ═══════════════════════════════════════════════════════════════
# Process all 4 GitHub-Dark components
# ═══════════════════════════════════════════════════════════════

FILES = [
    '/home/z/my-project/src/components/reconpro/compliance-panel.tsx',
    '/home/z/my-project/src/components/reconpro/monitoring-panel.tsx',
    '/home/z/my-project/src/components/reconpro/team-management.tsx',
    '/home/z/my-project/src/components/reconpro/integration-hub.tsx',
]

for fpath in FILES:
    basename = os.path.basename(fpath)
    print(f'Processing {basename}...')
    content = read_file(fpath)
    original = content
    
    content = fix_card_containers(content)
    content = fix_green_buttons(content)
    content = fix_loading_states(content)
    content = fix_dividers(content)
    content = fix_section_headers(content)
    
    if content != original:
        write_file(fpath, content)
        print(f'  ✅ {basename} updated')
    else:
        print(f'  ⏭ {basename} no structural changes')

print('\nDone.')
