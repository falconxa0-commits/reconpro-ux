const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function main() {
  // Start server
  const server = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Wait for server to be ready
  await new Promise(resolve => {
    server.stdout.on('data', (data) => {
      const msg = data.toString();
      process.stdout.write(msg);
      if (msg.includes('Ready')) resolve();
    });
    server.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    setTimeout(resolve, 15000); // Fallback timeout
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const browser = await chromium.launch({ 
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    headless: true 
  });
  
  const dir = '/home/z/my-project/download/screenshots/audit-v10';
  
  // Viewport configs
  const viewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'laptop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ];
  
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: vp });
    try {
      console.log(`\n[${vp.name}] Navigating...`);
      await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(3000); // Wait for shader + animations
      
      // Full page screenshot
      await page.screenshot({ path: `${dir}/FULL-${vp.name}.png`, fullPage: true });
      console.log(`[${vp.name}] ✓ Full page`);
      
      // Hero section (viewport)
      await page.screenshot({ path: `${dir}/01-hero-${vp.name}.png` });
      console.log(`[${vp.name}] ✓ Hero`);
      
    } catch(e) {
      console.log(`[${vp.name}] ✗ ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }
  
  // Detailed section screenshots at desktop resolution
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    console.log('\n[sections] Navigating for section capture...');
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(3000);
    
    // Get all major sections
    const sections = await page.evaluate(() => {
      const results = [];
      const main = document.querySelector('main');
      if (!main) return results;
      const children = main.children;
      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const rect = el.getBoundingClientRect();
        if (rect.height > 200) {
          results.push({
            index: i,
            top: rect.top + window.scrollY,
            height: rect.height,
            id: el.id || '',
            className: (el.className || '').toString().substring(0, 80),
            tag: el.tagName,
            firstText: el.textContent?.substring(0, 60)?.trim() || ''
          });
        }
      }
      return results;
    });
    
    console.log('Found sections:');
    sections.forEach(s => console.log(`  [${s.index}] ${s.tag} y=${s.top} h=${s.height} "${s.firstText}"`));
    
    // Scroll to and screenshot each section
    const sectionNames = ['hero', 'features', 'architecture', 'modules', 'cli', 'docs', 'benchmarks', 'enterprise', 'community'];
    let sectionIdx = 0;
    
    for (const section of sections) {
      if (sectionIdx >= sectionNames.length) break;
      const name = sectionNames[sectionIdx];
      await page.evaluate((y) => window.scrollTo(0, y), section.top);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${dir}/02-${name}.png` });
      console.log(`✓ ${name} section`);
      sectionIdx++;
    }
    
    // Footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${dir}/03-footer.png` });
    console.log('✓ Footer');
    
  } catch(e) {
    console.log(`[sections] ✗ ${e.message.split('\n')[0]}`);
  }
  
  await browser.close();
  server.kill();
  console.log('\nAll screenshots complete!');
}

main().catch(console.error);
