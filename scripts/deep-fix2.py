import os, glob

FILES = glob.glob('/home/z/my-project/src/components/reconpro/{compliance-panel,monitoring-panel,team-management,integration-hub}.tsx')

for fpath in sorted(FILES):
    bn = os.path.basename(fpath)
    with open(fpath, 'r') as f:
        c = f.read()
    orig = c
    
    # Straightforward replacements - order matters!
    # Green buttons
    c = c.replace('bg-[#00ff88] hover:bg-[#00cc6a] text-[#000000] font-semibold', 'bg-white hover:bg-white/90 text-black font-semibold')
    c = c.replace('hover:bg-[#00cc6a]', 'hover:bg-white/90')
    
    # All remaining border-[#1a1a1a] → border-white/[0.06]
    c = c.replace('border-[#1a1a1a]', 'border-white/[0.06]')
    
    # All remaining bg-[#050505] → bg-black  
    c = c.replace('bg-[#050505]', 'bg-black')
    
    # divide-[#111111] → divide-white/[0.05]
    c = c.replace('divide-[#111111]', 'divide-white/[0.05]')
    
    # focus:border-[#00ff88] → focus:border-white/[0.15]
    c = c.replace('focus:border-[#00ff88]', 'focus:border-white/[0.15]')
    
    # text-[#f0f0f0] → text-white
    c = c.replace('text-[#f0f0f0]', 'text-white')
    
    # border-[#050505] → border-black
    c = c.replace('border-[#050505]', 'border-black')
    
    # SVG stroke
    c = c.replace('stroke="#111111"', 'stroke="rgba(255,255,255,0.06)"')
    
    # rgba patterns
    c = c.replace('rgba(52,211,153,', 'rgba(0,255,136,')
    c = c.replace('rgba(244,63,94,', 'rgba(255,51,85,')
    
    # Hover effects
    c = c.replace('hover:border-[rgba(0,255,136,0.3)] hover:bg-[rgba(0,255,136,0.1)]', 'hover:border-white/[0.1] hover:bg-white/[0.03]')
    c = c.replace('hover:border-[rgba(255,51,85,0.3)] hover:bg-[rgba(255,51,85,0.1)]', 'hover:border-white/[0.1] hover:bg-white/[0.03]')
    
    # bg-[#333333] for avatar fallback
    c = c.replace("return 'bg-[#333333]'", "return 'bg-neutral-800'")
    c = c.replace("return 'bg-[#333333]'", "return 'bg-neutral-800'")
    
    # remaining #111111
    c = c.replace('bg-[#111111]', 'bg-white/[0.04]')
    c = c.replace('border-[#111111]', 'border-white/[0.05]')
    
    # w-px bg-[#1a1a1a] → w-px bg-white/[0.06]
    c = c.replace('bg-[#1a1a1a]', 'bg-white/[0.06]')
    
    # DropdownMenuSeparator
    c = c.replace('bg-white/[0.06]"', 'bg-white/[0.06]"')  # no-op, already fixed
    
    # Skeleton blocks: replace bg-[#000000] with skeleton-pulse in specific patterns
    # Only in loading/skeleton contexts
    import re
    c = re.sub(r'(className="[^"]*?)bg-\[\#000000\]([^"*?]*?)rounded', r'\1skeleton-pulse\2rounded', c)
    
    if c != orig:
        with open(fpath, 'w') as f:
            f.write(c)
        print(f'  ✅ {bn}')
    else:
        print(f'  ⏭ {bn}')

print('Done.')
