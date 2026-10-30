const {test,expect}=require('@playwright/test');

test('confirmed step quantities remain separate from the whole hardware kit',async({page})=>{
  await page.goto('./#step/base');
  const screws=page.locator('.part-chip[data-part-dialog="Ф4"]');
  await expect(screws).toContainText('× 4');
  await expect(screws).not.toContainText('× 52');
  await screws.click();
  await expect(page.locator('.part-measurements')).toContainText('52 шт.');
  await page.keyboard.press('Escape');
  await page.goto('./#step/partitions');
  await expect(page.locator('.part-chip[data-part-dialog="Ф8"]')).toContainText('× 2');
  await page.goto('./#step/remaining');
  await expect(page.locator('.part-chip[data-part-dialog="Ф4"]')).not.toContainText('× 52');
  await page.goto('./#step/main-shelves');
  await expect(page.locator('.part-chip[data-part-dialog="Ф4"]')).toContainText('× 14');
  await expect(page.locator('.part-chip[data-part-dialog="Ф8"]')).toContainText('× 6');
  await expect(page.locator('.part-chip[data-part-dialog="Ф9"]')).toContainText('× 6');
  // The screws through the divider must remain reachable before the left shelves close access.
  await expect(page.locator('.step-instructions li').first()).toContainText('широкие полки №9 и №10');
  const actions=await page.locator('.step-instructions li').allTextContents();
  const fastenWide=actions.findIndex(text=>text.includes('затяните крепления №9/10'));
  const prepareLeft=actions.findIndex(text=>text.includes('Теперь найдите 2 узкие полки №17'));
  expect(fastenWide).toBeGreaterThanOrEqual(0);
  expect(prepareLeft).toBeGreaterThan(fastenWide);
  await expect(page.locator('.part-chip[data-part-dialog="Ф8"]')).toContainText('внутренних торцов №17');
  await page.locator('.part-chip[data-part-dialog="17"]').click();
  await expect(page.locator('#help-dialog')).toContainText('Полка2');
  await expect(page.locator('#help-dialog')).toContainText('Круглые эксцентриковые посадки обращены к высокой стойке №3');
  await expect(page.locator('#help-dialog')).toContainText('двумя конфирматами');
});

test('connection explanations open separately and remain large on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const [step,type]of [['base','confirmat'],['base','glide'],['partitions','cam-dowel']]){
    await page.goto(`./#step/${step}`);
    const button=page.locator(`[data-joint="${type}"]`);
    await button.click();
    await expect(page.locator('#zoom-content > svg')).toHaveCount(1);
    await expect(page.locator('#zoom-dialog .diagram-inspector')).toHaveCount(0);
    expect(await page.locator('#zoom-content > svg').evaluate(svg=>getComputedStyle(svg).maxHeight)).toBe('none');
    expect((await page.locator('#zoom-content > svg').boundingBox()).height).toBeGreaterThan(type==='glide'?150:700);
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
  }
});
