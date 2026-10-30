const {test,expect}=require('@playwright/test');
const path=require('node:path');
const folder=path.resolve(__dirname,'../work/screenshots');

test('bottom hole map preserves the observed groups without assigning other holes',async({page})=>{
  await page.goto('./#step/base');await page.getByRole('tab',{name:'Отверстия дна'}).click();
  const drawing=page.locator('.diagram-card > .base-top-svg');
  await expect(drawing.locator('.base-hole')).toHaveCount(10);
  await expect(drawing.locator('.is-plinth')).toHaveCount(4);
  await expect(drawing.locator('.is-other')).toHaveCount(6);
  expect(await drawing.locator('.is-plinth').evaluateAll(holes=>holes.map(hole=>hole.dataset.holeKey))).toEqual(['H1','H4','H7','H10']);
  expect(await drawing.locator('.base-hole').evaluateAll(holes=>holes.every(hole=>!hole.closest('[data-part]')&&!hole.hasAttribute('tabindex')))).toBeTruthy();
  expect(await drawing.locator('[data-part="8"] > rect').evaluate(rect=>Number(rect.getAttribute('width'))/Number(rect.getAttribute('height')))).toBeCloseTo(1168/383.5,5);
  for(const [side,expected]of [['left',['H1','H2']],['right',['H3','H4','H5']]]){
    const inset=page.locator(`.diagram-card .base-top-inset[data-inset="${side}"]`);
    expect(await inset.evaluate(svg=>{const b=svg.viewBox.baseVal;return [...svg.querySelectorAll('.base-hole')].filter(hole=>hole.cx.baseVal.value>=b.x&&hole.cx.baseVal.value<=b.x+b.width&&hole.cy.baseVal.value>=b.y&&hole.cy.baseVal.value<=b.y+b.height).map(hole=>hole.dataset.holeKey);})).toEqual(expected);
  }
  await expect(page.locator('.diagram-card')).toContainText('в этом шаге не используются');
  await expect(page.locator('.base-top-strip-note')).toContainText('под дном');
});

test('keyboard tabs preserve the step DOM, real-part selection and assembly progress',async({page})=>{
  await page.goto('./#step/base');const heading=await page.locator('h1').elementHandle();
  await page.locator('.assembly-layout [data-select-part="19"]').click();
  const assembly=page.getByRole('tab',{name:'Сборка',exact:true}),holes=page.getByRole('tab',{name:'Отверстия дна'});
  await assembly.focus();await page.keyboard.press('ArrowRight');
  await expect(holes).toBeFocused();await expect(holes).toHaveAttribute('aria-selected','true');
  await expect(assembly).toHaveAttribute('tabindex','-1');
  expect(await heading.evaluate(el=>el.isConnected)).toBeTruthy();
  await expect(page.locator('.assembly-layout .diagram-part-info h3')).toHaveText('Планки цоколя');
  await expect(page.locator('.diagram-card [data-part="19"]')).toHaveClass(/is-selected/);
  await page.keyboard.press('Home');await expect(assembly).toBeFocused();
  await page.keyboard.press('End');await expect(holes).toBeFocused();
  await page.keyboard.press('ArrowLeft');await expect(assembly).toBeFocused();
  await holes.focus();await page.keyboard.press(' ');await expect(holes).toHaveAttribute('aria-selected','true');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vileta6-guide-v1')).completed)).toEqual([]);
  await expect(page).toHaveURL(/#step\/base$/);
});

test('enlargement follows the current view and returns focus to its button',async({page})=>{
  await page.goto('./#step/base');await page.getByRole('tab',{name:'Отверстия дна'}).click();
  const zoom=page.locator('[data-action="zoom"]');await zoom.click();
  await expect(page.locator('#zoom-content > svg')).toHaveAttribute('data-diagram-view','base-top');
  await expect(page.locator('#zoom-dialog .diagram-inspector')).toHaveCount(0);
  await expect(page.locator('#zoom-content [data-part]')).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(zoom).toBeFocused();
  await page.getByRole('tab',{name:'Сборка',exact:true}).click();await zoom.click();
  await expect(page.locator('#zoom-content .base-top-insets')).toHaveCount(0);
  await expect(page.locator('#zoom-content')).not.toHaveClass(/base-top-content/);
  await page.keyboard.press('Escape');
  await page.locator('[data-joint="confirmat"]').click();
  await expect(page.locator('#zoom-content > svg')).toHaveAttribute('data-joint-type','confirmat');
  await expect(page.locator('#zoom-content')).not.toHaveClass(/base-top-content/);
  await expect(page.locator('#zoom-content .base-top-orientation')).toHaveCount(0);
});

for(const width of [1440,390,320]){
  test(`bottom views and enlarged close groups remain usable at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.goto('./#step/base');await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});await page.evaluate(()=>document.fonts.ready);
    await page.setViewportSize({width,height:1600});
    await page.locator('.diagram-column').screenshot({path:path.join(folder,`base-assembly-${width}.png`)});
    await page.getByRole('tab',{name:'Отверстия дна'}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    for(const tab of await page.getByRole('tab').all())expect((await tab.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.diagram-card .base-top-inset')).toHaveCount(2);
    await page.locator('.diagram-column').screenshot({path:path.join(folder,`base-holes-${width}.png`)});
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.locator('[data-action="zoom"]').click();
    await expect(page.locator('#zoom-dialog [data-action="close-dialog"]')).toBeInViewport();
    if(width<760){
      expect((await page.locator('#zoom-content').boundingBox()).width).toBeGreaterThanOrEqual(600);
      await expect(page.locator('#zoom-level')).toHaveText('150%');
      const before=(await page.locator('#zoom-content').boundingBox()).width;
      await page.locator('[data-action="zoom-in"]').click();
      expect((await page.locator('#zoom-content').boundingBox()).width).toBeGreaterThan(before);
      const viewport=page.locator('.zoom-viewport');await viewport.evaluate(el=>el.scrollLeft=el.scrollWidth);
      const bounds=await viewport.boundingBox();
      for(const caption of await page.locator('#zoom-content .base-top-insets figcaption').all()){
        const box=await caption.boundingBox();expect(box.x).toBeGreaterThanOrEqual(bounds.x);expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);
        await expect(caption).toBeInViewport();
      }
      await expect(page.locator('#zoom-content .base-top-orientation')).toBeInViewport();
      await viewport.evaluate(el=>{el.scrollLeft=0;el.scrollTop=0;});
    }
    await page.screenshot({path:path.join(folder,`base-holes-zoom-${width}.png`)});
  });
}
