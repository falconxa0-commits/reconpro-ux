const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function main() {
  const server = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  await new Promise(resolve => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Ready')) resolve();
    });
    setTimeout(resolve, 15000);
  });
  await new Promise(r => setTimeout(r, 2000));
  
  const browser = await chromium.launch({ 
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    headless: true 
  });
  
  const dir = '/home/z/my-project/download/screenshots/audit-v10';
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${dir}/FINAL-hero-desktop.png`, fullPage: false });
    
    // Console errors check
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    // Scroll through all sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.15));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/FINAL-features.png` });
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.3));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/FINAL-architecture.png` });
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/FINAL-modules.png` });
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/FINAL-cli.png` });
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.75));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/FINAL-benchmarks.png` });
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.85));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/FINAL-enterprise.png` });
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${dir}/FINAL-footer.png` });
    
    // Mobile
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'load', timeout: 20000 });
    await mobilePage.waitForTimeout(4000);
    await mobilePage.screenshot({ path: `${dir}/FINAL-mobile-hero.png` });
    await mobilePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: `${dir}/FINAL-mobile-mid.png` });
    await mobilePage.close();
    
    console.log('All final screenshots captured');
    if (errors.length > 0) {
      console.log('Console errors:', errors.join('\n'));
    } else {
      console.log('Zero console errors detected');
    }
  } catch(e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
  server.kill();
}

main().catch(console.error);
