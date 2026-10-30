const { test, expect } = require('@playwright/test');
const path = require('node:path');
const folder = path.resolve(__dirname, '../work/screenshots');

test('design screenshots', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.hero-visual img')).toBeVisible();
  await page.screenshot({ path: path.join(folder, 'home-desktop.png'), fullPage: true });
  await page.screenshot({ path: path.join(folder, 'vileta-desktop.png') });
  const steps = await page.evaluate(() => window.GUIDE.steps);
  if (!steps.length) return;
  await page.goto(`./#step/${steps[1].id}`);
  await page.screenshot({ path: path.join(folder, 'step-02-desktop.png'), fullPage: true });
  await page.goto('./#step/main-shelves');
  await page.locator('.assembly-layout [data-select-part="9"]').click();
  await page.evaluate(()=>window.scrollTo(0,100));
  await page.screenshot({path:path.join(folder,'vileta-assembly.png')});
  await page.goto(`./#step/${steps[1].id}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(folder, 'step-02-mobile.png'), fullPage: true });
  await page.goto('./#parts');
  await page.screenshot({ path: path.join(folder, 'finder-mobile.png'), fullPage: true });
});
