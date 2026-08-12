const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    headless: true 
  });
  const context = await browser.newContext();
  
  const viewports = [
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'laptop-1440', width: 1440, height: 900 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
  ];
  
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: vp });
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: `/home/z/my-project/download/screenshots/audit-v10/01-hero-${vp.name}.png`,
        fullPage: false
      });
      console.log(`✓ ${vp.name} hero captured`);
    } catch(e) {
      console.log(`✗ ${vp.name} hero failed: ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }
  
  await browser.close();
  console.log('Done');
})();
