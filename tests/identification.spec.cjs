const {test,expect}=require('@playwright/test');
const path=require('node:path');
const screenshots=path.resolve(__dirname,'../work/screenshots');
const proof=path.join(screenshots,'vileta-identification-guide.png');

for(const width of [1440,390,320]){
  test(`label-led part help works from preparation and catalogue at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:width===1440?1000:844});
    for(const route of ['./#step/prepare','./#parts']){
      await page.goto(route);
      const opener=page.locator('main .identification-help-button');
      await opener.click();
      const dialog=page.locator('#help-dialog');
      await expect(dialog).toHaveClass(/identification-dialog/);
      await expect(page.locator('#identification-title')).toHaveText('Как найти нужную деталь');
      await expect(page.locator('.identification-steps > li')).toHaveCount(3);
      await expect(page.locator('.identification-steps > li').nth(0)).toContainText('Прочитайте этикетку');
      await expect(page.locator('.identification-steps > li').nth(1)).toContainText('Если подпись отсутствует или неясна');
      await expect(page.locator('.identification-steps > li').nth(1)).toContainText('Три тонких задних листа измеряйте каждый отдельно');
      await expect(page.locator('.identification-steps > li').nth(2)).toContainText(/после опознания/i);
      await expect(dialog.locator('table,.box-hints')).toHaveCount(0);
      await expect(page.locator('.identification-packaging-note')).toHaveText('На коробках указан номер упаковки. Списка деталей для каждой коробки в документах нет, поэтому определить деталь по номеру коробки нельзя.');
      if(route.endsWith('prepare'))await page.screenshot({path:path.join(screenshots,`identification-${width}.png`)});
      expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
      await expect(dialog.locator('[data-action="close-dialog"]').first()).toBeInViewport();
      if(route.endsWith('prepare')){
        if(width===1440){await page.setViewportSize({width:1440,height:1400});await dialog.evaluate(el=>el.scrollTop=0);await page.screenshot({path:proof});await page.setViewportSize({width,height:1000});}
      }
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(opener).toBeFocused();
      await expect(page).toHaveURL(route.endsWith('parts')?/#parts$/:/#step\/prepare$/);
    }
  });
}

test('closing identification help and opening a component resets dialog layout and focus',async({page})=>{
  await page.goto('./#parts');
  const helper=page.locator('main .identification-help-button');
  await helper.click();await page.keyboard.press('Escape');await expect(helper).toBeFocused();
  await page.locator('#parts-search').fill('№8');
  const opener=page.locator('.part-card-open');await opener.focus();await page.keyboard.press('Enter');
  const dialog=page.locator('#help-dialog');
  await expect(dialog).toHaveClass(/part-dialog/);
  await expect(dialog).not.toHaveClass(/identification-dialog/);
  await expect(page.locator('#part-dialog-title')).toHaveText('Дно');
  await expect(page.locator('#identification-title')).toHaveCount(0);
  await expect(dialog).toHaveAttribute('aria-labelledby','part-dialog-title');
  await page.keyboard.press('Escape');await expect(opener).toBeFocused();
});

test('panel instructions start with label names without assuming printed reference numbers',async({page})=>{
  await page.goto('./');
  const data=await page.evaluate(()=>window.GUIDE);
  const bottom=data.parts.find(part=>part.id==='8'),base=data.steps.find(step=>step.id==='base'),prepare=data.steps.find(step=>step.id==='prepare');
  expect(prepare.instructions.join(' ')).toContain('Прочитайте название на этикетке');
  expect(`${prepare.description} ${prepare.sourceNote} ${bottom.description} ${bottom.recognize} ${base.instructions[0]}`).not.toMatch(/На панелях нет|На самих панелях.{0,30}нет|на панелях они не напечатаны|номера на самой панели нет/);
  expect(data.identification.steps[0].text).toContain('не обязательно указан наш справочный номер');
  expect(data.identification).not.toHaveProperty('boxes');
  expect(JSON.stringify(data.identification)).not.toMatch(/QR|гипотез|1566|20,3 кг|27,3 кг|17,6 кг/);
  expect(data.steps.every(step=>!('package' in step)&&!('box' in step))).toBeTruthy();
});
