const {test,expect}=require('@playwright/test');

test('rod holders are prepared before the back and counted once',async({page})=>{
  await page.goto('./#step/remaining');
  await expect(page.locator('.part-chip[data-part-dialog="Ф19"]')).toContainText('× 2');
  await expect(page.locator('.step-instructions')).toContainText('держатели с самой штангой');
  await expect(page.locator('.step-instructions')).toContainText('замкнутые');
  const allocations=await page.evaluate(()=>window.GUIDE.steps.flatMap(s=>s.items.filter(i=>i.id==='Ф19').map(i=>({step:s.id,quantity:i.quantity}))));
  expect(allocations).toEqual([{step:'remaining',quantity:2}]);
  await page.goto('./#step/rail');
  await expect(page.locator('.part-chip[data-part-dialog="Ф19"],.part-chip[data-part-dialog="Ф2"],.part-chip[data-part-dialog="Ф6"]')).toHaveCount(0);
  await expect(page.locator('.part-chip[data-part-dialog="23"]')).toBeVisible();
  await expect(page.locator('.step-description')).toContainText('шаге 7');
});

test('rear geometry distinguishes the open seam from the supported seam without extending the profile',async({page})=>{
  await page.goto('./#step/back');
  const drawing=page.locator('.diagram-card>svg');
  const geometry=await drawing.evaluate(svg=>{
    const rect=selector=>{const el=svg.querySelector(selector);return {x:el.x.baseVal.value,y:el.y.baseVal.value,w:el.width.baseVal.value,h:el.height.baseVal.value};};
    return {
      sheets:[...svg.querySelectorAll('.back-sheet')].map(el=>({id:el.dataset.part,x:el.querySelector('rect').x.baseVal.value,w:el.querySelector('rect').width.baseVal.value})).sort((a,b)=>a.x-b.x),
      profile:rect('.back-profile-strip'),profileCount:svg.querySelectorAll('.back-profile-strip').length,
      high:rect('.back-support[data-part="3"] rect'),upper:rect('.back-support[data-part="14"] rect'),lower:rect('.back-support[data-part="18"] rect'),rib:rect('.back-support[data-part="15"] rect'),
      level9:svg.querySelector('[data-shelf-level="9"] path').getPointAtLength(0).y,level10:svg.querySelector('[data-shelf-level="10"] path').getPointAtLength(0).y
    };
  });
  expect(geometry.sheets.map(s=>s.id)).toEqual(['20','22','21']);
  expect(geometry.profileCount).toBe(1);
  expect(geometry.profile.x+geometry.profile.w/2).toBeCloseTo(geometry.sheets[0].x+geometry.sheets[0].w,1);
  expect(geometry.high.x+geometry.high.w/2).toBeCloseTo(geometry.sheets[1].x+geometry.sheets[1].w,1);
  expect(geometry.profile.y).toBeCloseTo(geometry.level9,1);
  expect(geometry.profile.y+geometry.profile.h).toBeCloseTo(geometry.level10,1);
  expect(geometry.upper.y+geometry.upper.h).toBeLessThanOrEqual(geometry.profile.y);
  expect(geometry.lower.y).toBeGreaterThanOrEqual(geometry.profile.y+geometry.profile.h);
  expect(geometry.rib.y).toBeGreaterThan(geometry.profile.y);
  expect(geometry.rib.y+geometry.rib.h).toBeLessThan(geometry.profile.y+geometry.profile.h);
  await expect(page.locator('.diagram-result')).toContainText('Вид сзади');
  expect(await page.evaluate(()=>window.GUIDE.steps.find(s=>s.id==='back').items.find(i=>i.id==='Ф1').quantity)).toBeUndefined();
});

test('rear number buttons select their own parts by ordinary pointer click and keyboard',async({page})=>{
  await page.goto('./#step/back');
  for(const id of ['24','3','20','22','21']){
    const name=['24','3'].includes(id)?`Показать деталь №${id}`:new RegExp(`Показать лист №${id},`);
    await page.getByRole('button',{name,exact:typeof name==='string'}).click();
    await expect(page.locator('.diagram-inspector')).toHaveAttribute('data-selected',id);
  }
  const profile=page.getByRole('button',{name:'Показать деталь №24',exact:true});
  await profile.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.diagram-inspector')).toHaveAttribute('data-selected','24');
  await expect(page.locator('.diagram-part-info h3')).toHaveText('Соединительный профиль задника');
});

test('push mechanism is inside the cabinet with its stem facing the door away from the hinges',async({page})=>{
  await page.goto('./#step/doors');
  const geometry=await page.locator('[data-walkthrough="push-latch"] .walkthrough-art>svg').evaluate(svg=>{
    const r=selector=>svg.querySelector(selector).getBBox();
    const shelf=r('.push-shelf'),base=r('.push-base'),door=r('.push-example-door'),hinge=r('.push-hinge-side');
    const stem=svg.querySelector('.push-moving-stem'),a=stem.getPointAtLength(0),b=stem.getPointAtLength(stem.getTotalLength());
    return {contained:base.x>=shelf.x&&base.x+base.width<=shelf.x+shelf.width&&base.y>=shelf.y&&base.y+base.height<=shelf.y+shelf.height,
      dx:Math.abs(a.x-b.x),towardDoor:b.y>a.y,contact:Math.abs(b.y-door.y),distanceFree:Math.abs(door.x+door.width-b.x),distanceHinge:Math.abs(hinge.x+hinge.width/2-b.x)};
  });
  expect(geometry.contained).toBeTruthy();expect(geometry.dx).toBeLessThan(1);expect(geometry.towardDoor).toBeTruthy();expect(geometry.contact).toBeLessThan(1);expect(geometry.distanceFree).toBeLessThan(geometry.distanceHinge);
  await page.goto('./#parts');await page.locator('#parts-search').fill('защёл');
  await expect(page.locator('.part-card')).toHaveCount(1);
  await expect(page.locator('.part-card-open')).toHaveAttribute('data-part-dialog','Ф14');
});

for(const width of [390,320])test(`new rear and latch walkthroughs retain advice in zoom at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [step,key]of [['back','back-profile'],['doors','push-latch']]){
    await page.goto(`./#step/${step}`);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    const button=page.locator(`[data-walkthrough="${key}"] [data-joint]`),box=await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    await button.click();await expect(page.locator('#zoom-content>svg')).toHaveAttribute('data-joint-type',key);
    await expect(page.locator('#zoom-level')).toHaveText('100%');
    const copy=page.locator('.zoom-walkthrough-copy');
    await expect(copy).toContainText(key==='back-profile'?'не в профиль и не в пустоту':'ход нажатия');
    expect(await copy.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
    if(key==='push-latch'){await copy.evaluate(el=>el.scrollTop=el.scrollHeight);await expect(copy.locator('.walkthrough-anatomy dd').last()).toBeInViewport();}
    await page.keyboard.press('Escape');await expect(button).toBeFocused();
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vileta6-guide-v1')).completed)).toEqual([]);
  expect(errors).toEqual([]);
});
