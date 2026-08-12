const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    headless: true 
  });
  
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for shader/animations to settle
    
    const sections = [
      { name: '02-features', selector: '[data-section="features"], .features-section, section:nth-of-type(2)' },
      { name: '03-architecture', selector: '[data-section="architecture"], .architecture-section' },
      { name: '04-modules', selector: '[data-section="modules"], .modules-section' },
      { name: '05-cli', selector: '[data-section="cli"], .cli-section' },
      { name: '06-docs', selector: '[data-section="docs"], .docs-section' },
      { name: '07-benchmarks', selector: '[data-section="benchmarks"], .benchmarks-section' },
      { name: '08-enterprise', selector: '[data-section="enterprise"], .enterprise-section' },
      { name: '09-community', selector: '[data-section="community"], .community-section' },
      { name: '10-footer', selector: 'footer' },
    ];
    
    // First, let's get all section positions by checking the page structure
    const sectionInfo = await page.evaluate(() => {
      const allSections = document.querySelectorAll('section, [class*="section"], main > div');
      const info = [];
      allSections.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const classes = el.className;
        info.push({ 
          index: i, 
          top: rect.top, 
          height: rect.height,
          classes: typeof classes === 'string' ? classes.substring(0, 100) : '',
          tag: el.tagName 
        });
      });
      return info;
    });
    
    console.log('Page sections found:');
    sectionInfo.forEach(s => {
      if (s.height > 200) {
        console.log(`  [${s.index}] ${s.tag} top=${s.top} h=${s.height} class="${s.classes}"`);
      }
    });
    
    // Take full-page screenshot
    await page.screenshot({ 
      path: '/home/z/my-project/download/screenshots/audit-v10/00-full-page-1920.png',
      fullPage: true 
    });
    console.log('✓ Full page captured');
    
    // Scroll to each section and take individual screenshots
    for (const section of sections) {
      try {
        const el = await page.$(section.selector);
        if (el) {
          await el.scrollIntoView({ behavior: 'instant', block: 'start' });
          await page.waitForTimeout(1500); // Wait for animations
          await page.screenshot({ path: `/home/z/my-project/download/screenshots/audit-v10/${section.name}.png` });
          console.log(`✓ ${section.name} captured`);
        } else {
          console.log(`⚠ ${section.name} selector not found, trying scroll offset`);
        }
      } catch(e) {
        console.log(`⚠ ${section.name}: ${e.message.split('\n')[0]}`);
      }
    }
    
  } catch(e) {
    console.log('Navigation error:', e.message.split('\n')[0]);
  }
  
  await browser.close();
  console.log('Section screenshots done');
})();
