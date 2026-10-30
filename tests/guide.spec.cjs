const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function content(page) {
  await page.goto('./');
  return page.evaluate(() => ({ steps: window.GUIDE.steps, parts: window.GUIDE.parts }));
}
async function openStep(page, id) { await page.goto(`./#step/${id}`); await expect(page.locator('.step-main')).toBeVisible(); }
async function stored(page) { return page.evaluate(() => JSON.parse(localStorage.getItem('vileta6-guide-v1') || '{}')); }

test('all production steps have usable content and diagrams without JavaScript errors', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePhotos=[];page.on('request',request=>{if(/source-.*\.(png|jpe?g)/i.test(request.url()))sourcePhotos.push(request.url());});
  const { steps } = await content(page); expect(steps.length).toBeGreaterThan(5);
  expect(steps).toHaveLength(13);
  expect(await page.evaluate(()=>JSON.stringify(window.GUIDE).includes('assets/source-'))).toBeFalsy();
  for (const step of steps) {
    await openStep(page, step.id);
    await expect(page.locator('h1')).toHaveText(step.title);
    await expect(page.locator('.diagram-card')).toBeVisible();
    await expect(page.locator('.diagram-card > svg')).toHaveCount(1);
    await expect(page.locator('.diagram-card [data-unresolved-order]:not([data-unresolved-order="0"])')).toHaveCount(0);
    await expect(page.locator('.diagram-card > img')).toHaveCount(0);
    await expect(page.locator('[data-action="original-diagram"]')).toHaveCount(0);
    if(['prepare','adjust'].includes(step.id)) await expect(page.locator('.diagram-inspector')).toHaveCount(0);
    else expect(await page.locator('.diagram-part-buttons button').count()).toBeGreaterThan(0);
    expect(await page.locator('.diagram-card').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBeTruthy();
    const image = page.locator('.diagram-card > img');
    if (await image.count()) expect(await image.evaluate(el => el.complete && el.naturalWidth > 0)).toBeTruthy();
  }
  expect(errors).toEqual([]);
  expect(sourcePhotos).toEqual([]);
});

test('visible left portion of the base is not painted over by the side panel',async({page})=>{
  await page.goto('./#step/sides');
  const hit=await page.locator('.diagram-card > svg').evaluate(svg=>{
    const point=new DOMPoint(190.16,675.24).matrixTransform(svg.getScreenCTM());
    return document.elementFromPoint(point.x,point.y)?.closest('[data-part]')?.dataset.part;
  });
  expect(hit).toBe('8');
});

test('diagram inspection supports keyboard selection, repeated selection and enlarged view', async ({ page }) => {
  await page.goto('./#step/base');
  const number=page.locator('.diagram-card [data-part][role="button"]').first();
  const id=await number.getAttribute('data-part');
  const expected=await page.evaluate(id=>window.GUIDE.parts.find(part=>part.id===id),id);
  await number.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.assembly-layout .diagram-part-info h3')).toHaveText(expected.name);
  await expect(page.locator('.assembly-layout .selected-part-size')).toHaveText(expected.size);
  await expect(number).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press(' ');
  await expect(page.locator('.assembly-layout .diagram-part-info h3')).toHaveCount(0);
  await page.locator(`.assembly-layout [data-select-part="${id}"]`).click();
  await expect(page.locator('.assembly-layout .diagram-part-info h3')).toHaveText(expected.name);
  await page.locator('[data-action="zoom"]').click();
  await page.locator(`#zoom-dialog [data-select-part="${id}"]`).click();
  await expect(page.locator('#zoom-dialog .diagram-part-info h3')).toHaveText(expected.name);
  await page.keyboard.press('Escape');await expect(page.locator('#zoom-dialog')).not.toBeVisible();
});

test('context part help and finder keep a path back to the same step', async ({ page }) => {
  await page.goto('./#step/base');
  await page.locator('[data-action="part-help"]').click();
  await expect(page.locator('#help-dialog')).toContainText('Дно');
  await expect(page.locator('#help-dialog')).toContainText('Планки цоколя');
  await page.getByRole('link',{name:'Все детали и крепёж'}).click();
  await expect(page.locator('.parts-page > .back-link')).toContainText('К шагу 2');
  await page.locator('.parts-page > .back-link').click();
  await expect(page).toHaveURL(/#step\/base$/);
  await expect(page.locator('h1')).toHaveText('Соберите дно и цоколь');
});

test('adjustment diagram keeps all three hinge views visible across desktop and phone resize', async ({ page }) => {
  await page.goto('./#step/adjust');
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900});
    await expect(page.locator('.diagram-card--adjust > svg .adjust-panel')).toHaveCount(3);
    const drawing=await page.locator('.diagram-card--adjust > svg').boundingBox();
    for(const panel of await page.locator('.diagram-card--adjust > svg .adjust-panel').all()) {
      const bounds=await panel.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(drawing.x-2);
      expect(bounds.y).toBeGreaterThanOrEqual(drawing.y-2);
      expect(bounds.x+bounds.width).toBeLessThanOrEqual(drawing.x+drawing.width+2);
      expect(bounds.y+bounds.height).toBeLessThanOrEqual(drawing.y+drawing.height+2);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    await expect(page.locator('.diagram-inspector')).toHaveCount(0);
    await page.screenshot({path:`work/screenshots/adjust-${width}.png`,fullPage:true});
    await page.locator('[data-action="zoom"]').click();
    expect(await page.locator('#zoom-content > svg').evaluate(el=>getComputedStyle(el).maxHeight)).toBe('none');
    if(width<760) expect((await page.locator('#zoom-content > svg').boundingBox()).height).toBeGreaterThan(700);
    await page.keyboard.press('Escape');
  }
});

test('skip to content keeps the current step route', async ({ page }) => {
  await page.goto('./#step/base');
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#step\/base$/);
  await expect(page.locator('#main')).toBeFocused();
});

test('duplicate or invalid stored IDs cannot produce false completion', async ({ page }) => {
  await page.addInitScript(()=>localStorage.setItem('vileta6-guide-v1',JSON.stringify({completed:Array(13).fill('prepare'),found:[1,1,'1','unknown'],current:'unknown'})));
  await page.goto('./');
  expect((await stored(page)).completed).toEqual(['prepare']);
  expect((await stored(page)).found).toEqual(['1']);
  expect((await stored(page)).current).toBe('');
  await page.goto('./#step/adjust');
  await expect(page.locator('.all-complete')).toHaveCount(0);
});

test('viewing future steps changes the current position without completing anything', async ({ page }) => {
  const { steps } = await content(page);
  await openStep(page, steps[0].id);
  await page.locator(`[data-step="${steps[4].id}"]`).click();
  await expect(page.locator('h1')).toHaveText(steps[4].title);
  expect((await stored(page)).completed).toEqual([]);
  expect((await stored(page)).current).toBe(String(steps[4].id));
  await expect(page.locator(`[data-step="${steps[4].id}"]`)).toHaveAttribute('aria-current','step');
  await expect(page.locator('.step-nav .done')).toHaveCount(0);
});

test('a skipped final step never claims the whole assembly is complete', async ({ page }) => {
  const { steps } = await content(page);
  await openStep(page, steps.at(-1).id);
  await page.getByRole('button', { name: 'Завершить сборку', exact: true }).click();
  expect((await stored(page)).completed).toEqual([String(steps.at(-1).id)]);
  await expect(page.locator('#toast')).toContainText('Осталось этапов');
  await expect(page.locator('.all-complete')).toHaveCount(0);
});

test('completed steps and the next position survive a reload', async ({ page }) => {
  const { steps } = await content(page);
  await openStep(page, steps[0].id);
  await page.getByRole('button', { name: 'Готово, дальше', exact: true }).click();
  await expect(page.locator('h1')).toHaveText(steps[1].title);
  await page.reload();
  expect((await stored(page)).completed).toEqual([String(steps[0].id)]);
  await expect(page.locator(`[data-step="${steps[0].id}"]`)).toHaveClass(/done/);
  await page.goto('./');
  await page.getByRole('link', { name: 'Продолжить сборку' }).click();
  await expect(page.locator('h1')).toHaveText(steps[1].title);
});

test('finder accepts both decimal separators and remembers found parts', async ({ page }) => {
  const { parts } = await content(page);
  const decimalPart = parts.find(part => /\d[,.]\d/.test(String(part.size)));
  expect(decimalPart).toBeTruthy();
  const decimal = String(decimalPart.size).match(/\d+[,.]\d+/)[0];
  await page.goto('./#parts');
  await page.locator('#parts-search').fill(decimal.replace('.',','));
  const commaCount = await page.locator('.part-card').count(); expect(commaCount).toBeGreaterThan(0);
  await page.locator('#parts-search').fill(decimal.replace(',','.'));
  await expect(page.locator('.part-card')).toHaveCount(commaCount);
  await page.locator('#parts-search').fill(decimalPart.size.replace(/[×xх]/g, ' x '));
  await expect(page.locator('.part-card').first()).toBeVisible();
  const foundButton = page.locator(`[data-found="${decimalPart.id}"]`);
  await foundButton.click();
  await page.reload();
  await expect(page.locator(`[data-found="${decimalPart.id}"]`)).toHaveAttribute('aria-pressed', 'true');
});

test('help modal supports Escape and restores focus to the help button', async ({ page }) => {
  await content(page);
  const helpButton = page.locator('.top-nav [data-action="help"]');
  await helpButton.click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).not.toBeVisible();
  await expect(helpButton).toBeFocused();
});

test('exact panel search and quantity units match the source records', async ({ page }) => {
  await page.goto('./#parts');
  for(const query of ['№8','#8','8','1']) {
    await page.locator('#parts-search').fill(query);
    await expect(page.locator('.part-card')).toHaveCount(1);
    await expect(page.locator('.part-card-top span').first()).toHaveText(query==='1'?'№ 1':'№ 8');
  }
  for(const id of ['23','24']) {
    await page.locator('#parts-search').fill(`№${id}`);
    await expect(page.locator('.part-card-top span').first()).toHaveText(`№ ${id}`);
  }
  for(const [id,quantity] of [['Ф8','8 комплектов'],['Ф17','2 комплекта']]) {
    await page.locator('#parts-search').fill(id);
    await expect(page.locator('.part-card')).toHaveCount(1);
    await expect(page.locator('.part-card-top span').last()).toHaveText(`В комплекте: ${quantity}`);
  }
});

test('portable file opens offline with diagrams, local font and saved progress', async ({ page }) => {
  const errors=[]; const remote=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:/,route=>{remote.push(route.request().url());return route.abort();});
  const file=pathToFileURL(path.resolve(__dirname,'../docs/index.html')).href;
  await page.goto(file);
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.fonts.check('16px "Golos Text"'))).toBeTruthy();
  await page.getByRole('link',{name:'Начать сборку'}).click();
  await expect(page.locator('.diagram-card > svg,.diagram-card > img')).toBeVisible();
  await page.getByRole('button',{name:'Готово, дальше',exact:true}).click();
  await page.reload();
  expect((await stored(page)).completed).toEqual(['prepare']);
  await page.goto(`${file}#parts`);
  await page.locator('#parts-search').fill('Ф5');
  await page.locator('.part-card-open').click();
  expect(await page.evaluate(()=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=document.querySelector('.part-dialog-art image').getAttribute('href');}))).toBeTruthy();
  expect(remote).toEqual([]);
  expect(errors).toEqual([]);
});

for (const width of [1440, 390, 320]) {
  test(`responsive pages at ${width}px have no horizontal overflow or blocked next button`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { steps } = await content(page);
    for (const path of ['./', './#parts', `./#step/${steps[3].id}`]) {
      await page.goto(path);
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll:document.documentElement.scrollWidth, overflow:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+1 || r.left < -1;}).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,left:el.getBoundingClientRect().left})) }));
      expect(layout.scroll <= layout.width + 1, `${path}: ${JSON.stringify(layout)}`).toBeTruthy();
    }
    const next = page.locator('[data-action="next"]');
    const zoomRect=await page.locator('[data-action="zoom"]').boundingBox();
    expect(zoomRect.height).toBeGreaterThanOrEqual(44);
    expect(zoomRect.height).toBeLessThanOrEqual(48);
    const partButton=page.locator('.assembly-layout [data-select-part]').first();
    const partRect=await partButton.boundingBox();expect(partRect.height).toBeGreaterThanOrEqual(44);expect(partRect.width).toBeGreaterThanOrEqual(44);
    await partButton.click();await expect(page.locator('.assembly-layout .diagram-part-info h3')).toBeVisible();
    await page.locator('[data-action="zoom"]').click();
    for(const button of await page.locator('.zoom-header .icon-button').all()){const bounds=await button.boundingBox();expect(bounds.width).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeGreaterThanOrEqual(44);}
    expect(await page.locator('#zoom-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
    await page.keyboard.press('Escape');
    await next.scrollIntoViewIfNeeded();
    await expect(next).toBeVisible();
    await expect(next).toBeInViewport();
    await next.click();
    await expect(page.locator('h1')).toHaveText(steps[4].title);
    await page.screenshot({ path: `work/screenshots/step-${width}.png`, fullPage: width > 700 });
  });
}
