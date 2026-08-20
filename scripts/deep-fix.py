"""Deep structural fix: catch remaining GitHub-Dark patterns."""
import re, os, glob

FILES = glob.glob('/home/z/my-project/src/components/reconpro/{compliance-panel,monitoring-panel,team-management,integration-hub}.tsx')

for fpath in sorted(FILES):
    basename = os.path.basename(fpath)
    with open(fpath, 'r') as f:
        content = f.read()
    
    original = content
    
    # === Fix remaining green buttons ===
    content = content.replace('bg-[#00ff88] hover:bg-[#00cc6a] text-[#000000]', 'bg-white hover:bg-white/90 text-black')
    content = content.replace('bg-[#00ff88] hover:bg-[#00cc6a]', 'bg-white hover:bg-white/90')
    content = content.replace('hover:bg-[#00cc6a]', 'hover:bg-white/90')
    
    # === Fix remaining border-[#1a1a1a] → border-white/[0.06] ===
    content = content.replace('border-[#1a1a1a]', 'border-white/[0.06]')
    
    # === Fix remaining bg-[#050505] → bg-black ===
    # But NOT in skeleton blocks (those should stay black)
    content = re.sub(
        r'bg-\[#050505\]'
        r'(?!")'
        r'(?![^}]*skeleton)',
        'bg-black',
        content
    )
    # Simple replacement for most cases
    content = content.replace('bg-[#050505] p-4', 'bg-black p-4')
    content = content.replace('bg-[#050505] p-6', 'bg-black p-6')
    content = content.replace('bg-[#050505] p-8', 'bg-black p-8')
    content = content.replace('bg-[#050505] overflow', 'bg-black overflow')
    content = content.replace('bg-[#050505] text', 'bg-black text')
    content = content.replace('bg-[#050505] border', 'bg-black border')
    
    # === Fix divide-[#111111] → divide-white/[0.05] ===
    content = content.replace('divide-[#111111]', 'divide-white/[0.05]')
    
    # === Fix focus:border-[#00ff88] → focus:border-white/[0.15] ===
    content = content.replace('focus:border-[#00ff88]', 'focus:border-white/[0.15]')
    
    # === Fix rgba(52,211,153,...) → rgba(0,255,136,...) ===
    content = content.replace('rgba(52,211,153,', 'rgba(0,255,136,')
    
    # === Fix rgba(244,63,94,...) → rgba(255,51,85,...) ===
    content = content.replace('rgba(244,63,94,', 'rgba(255,51,85,')
    
    # === Fix remaining bg-[#0a0a0a] inputs → use input-void or keep as-is ===
    # These are close enough to pure black, leave them but fix borders
    
    # === Fix text-[#f0f0f0] → text-white ===
    content = content.replace('text-[#f0f0f0]', 'text-white')
    
    # === Fix bg-[#333333] avatar fallback → bg-neutral-800 ===
    # (in team-management role badge function)
    content = content.replace("return 'bg-[#333333]'", "return 'bg-neutral-800'")
    
    # === Fix DialogContent styling ===
    content = content.replace(
        'bg-black border-white/[0.06] text-white',
        'bg-[#0a0a0a] border-white/[0.06] text-white'
    )
    
    # === Fix border-[#050505] in avatar status dot ===
    content = content.replace('border-[#050505]', 'border-black')
    
    # === Fix SVG stroke in compliance panel ===
    content = content.replace('stroke="#111111"', 'stroke="rgba(255,255,255,0.06)"')
    
    # === Fix skeleton blocks: bg-[#000000] rounded → skeleton-pulse ===
    # Replace skeleton container blocks
    content = re.sub(
        r'className="([^"]*?)bg-\[#000000\]([^"]*?)rounded([^"]*?)"',
        lambda m: f'className="{m.group(1)}skeleton-pulse{m.group(2)}rounded{m.group(3)}"',
        content
    )
    # Remove explicit h/w from skeleton to use natural sizing
    # Actually keep the sizes, just add skeleton-pulse
    
    # === Fix TabsList styling ===
    content = content.replace('bg-black border border-white/[0.06]', 'bg-white/[0.03] border border-white/[0.06]')
    
    # === Fix DropdownMenu styling ===
    content = content.replace('bg-[#000000] border-white/[0.06] text-white', 'bg-[#0a0a0a] border-white/[0.06] text-white')
    
    # === Fix Badge styling ===
    content = content.replace('text-[10px] border-white/[0.06] text-[#444444]', 'text-[10px] border-white/[0.06] text-[#444444]')
    
    # === Fix hover effects with rgba patterns ===
    content = content.replace(
        'hover:border-[rgba(0,255,136,0.3)] hover:bg-[rgba(0,255,136,0.1)]',
        'hover:border-white/[0.1] hover:bg-white/[0.03]'
    )
    content = content.replace(
        'hover:border-[rgba(255,51,85,0.3)] hover:bg-[rgba(255,51,85,0.1)]',
        'hover:border-white/[0.1] hover:bg-white/[0.03]'
    )
    
    # === Fix Button variant="outline" in dialogs ===
    content = content.replace(
        'border-white/[0.06] text-[#444444] hover:bg-[#0a0a0a]',
        'border-white/[0.06] text-[#444444] hover:bg-white/[0.03]'
    )
    
    if content != original:
        with open(fpath, 'w') as f:
            f.write(content)
        print(f'  ✅ {basename}')
    else:
        print(f'  ⏭ {basename}')

print('Done.')
