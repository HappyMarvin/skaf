const { test, expect } = require('@playwright/test');

test('packing-list names resolve exactly while explicit reference numbers keep their meaning',async({page})=>{
  await page.goto('./#parts');
  for(const [query,id]of [['Полка1','9'],['Полка 1','9'],['Стойка2','3'],['Фасад1','4'],['№1','1'],['#1','1'],['ДВП задняя стенка №1','20'],['Ребро жёсткости','15']]){
    await page.locator('#parts-search').fill(query);
    await expect(page.locator('.part-card')).toHaveCount(1);
    await expect(page.locator('.part-card-open')).toHaveAttribute('data-part-dialog',id);
  }
});

test('catalogue preview and found mark are separate keyboard actions', async ({ page }) => {
  await page.goto('./#parts');
  await page.locator('#parts-search').fill('№8');
  const found=page.locator('[data-found="8"]');
  await found.click();
  await expect(found).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#help-dialog')).not.toBeVisible();
  const preview=page.locator('.part-card-open[data-part-dialog="8"]');
  await preview.focus();await page.keyboard.press('Enter');
  await expect(page.locator('#help-dialog')).toBeVisible();
  await expect(page.locator('#part-dialog-title')).toHaveText('Дно');
  await expect(page.locator('.part-measurements')).toContainText('1168 × 383,5 × 16 мм');
  await expect(page.locator('.part-dialog-art > svg')).toHaveAttribute('data-part-id','8');
  await page.keyboard.press('Escape');
  await expect(preview).toBeFocused();
  await expect(found).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press(' ');
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('all supplied components have a visible preview and an individually described detail view', async ({ page }) => {
  const errors=[], failed=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>failed.push(request.url()));
  page.on('response',response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url()}`);});
  await page.goto('./#parts');
  const parts=await page.evaluate(()=>window.GUIDE.parts);
  await expect(page.locator('.part-card')).toHaveCount(parts.length);
  for(const part of parts){
    await page.locator('#parts-search').fill(String(part.id).startsWith('Ф') ? part.id : `№${part.id}`);
    const art=page.locator('.part-card-art > svg');
    await expect(art).toHaveAttribute('data-part-id',String(part.id));
    expect(await art.evaluate(svg=>{const box=svg.getBBox();return box.width>0&&box.height>0;})).toBeTruthy();
    await page.locator('.part-card-open').click();
    await expect(page.locator('#part-dialog-title')).toHaveText(part.name);
    await expect(page.locator('.part-measurements')).toContainText(part.size);
    await expect(page.locator('.part-detail-description')).toHaveText(part.description);
    await expect(page.locator('.part-dialog-art > svg')).toHaveAttribute('data-part-id',String(part.id));
    await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('panel outlines preserve supplied length, width and thickness', async ({ page }) => {
  await page.goto('./#parts');
  for(const panel of [{id:'1',length:2099,width:383.5,thickness:16,vertical:true},{id:'8',length:1168,width:383.5,thickness:16},{id:'19',length:1168,width:79.5,thickness:16},{id:'20',length:2016,width:401,thickness:3,vertical:true}]){
    await page.locator('#parts-search').fill(`№${panel.id}`);
    const faces=await page.locator('.part-card-art > svg').evaluate(svg=>Object.fromEntries([...svg.querySelectorAll('polygon[data-face]')].map(face=>[face.dataset.face,[...face.points].map(point=>({x:point.x,y:point.y}))])));
    const frontWidth=Math.abs(faces.front[1].x-faces.front[0].x);
    if(panel.vertical){
      const frontHeight=Math.abs(faces.front[2].y-faces.front[1].y);
      expect(frontHeight/frontWidth).toBeCloseTo(panel.length/panel.width,2);
      const thickness=Math.abs(faces.side[1].x-faces.side[0].x)/0.6;
      expect(thickness/frontWidth).toBeCloseTo(panel.thickness/panel.width,3);
    }else{
      const projectedWidth=Math.abs(faces.top[2].y-faces.top[1].y)/0.42;
      expect(frontWidth/projectedWidth).toBeCloseTo(panel.length/panel.width,2);
      const thickness=Math.abs(faces.front[2].y-faces.front[1].y);
      expect(thickness/frontWidth).toBeCloseTo(panel.thickness/panel.length,3);
    }
  }
});

for(const width of [390,320]){
  test(`component detail remains readable and contained at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});
    await page.goto('./#parts');
    for(const id of ['1','8','19','Ф5','Ф11','Ф8','Ф17']){
      await page.locator('#parts-search').fill(id.startsWith('Ф')?id:`№${id}`);
      await page.locator('.part-card-open').click();
      const dialog=page.locator('#help-dialog');
      await expect(dialog).toBeVisible();
      await expect(page.locator('#part-dialog-title')).toBeInViewport();
      expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
      const figure=await page.locator('.part-dialog-art').boundingBox();
      const drawing=await page.locator('.part-dialog-art > svg').boundingBox();
      expect(drawing.x).toBeGreaterThanOrEqual(figure.x);
      expect(drawing.x+drawing.width).toBeLessThanOrEqual(figure.x+figure.width+1);
      await page.locator('#help-dialog [data-action="close-dialog"]').first().click();
      await expect(dialog).not.toBeVisible();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  });
}
