const {test,expect}=require('@playwright/test');
const crypto=require('node:crypto');

test('hinge distribution remains unchanged and the walkthrough occupies its own full-width row',async({page})=>{
  await page.goto('./#step/hinges');
  const original=await page.evaluate(()=>window.renderDiagram('hinges'));
  expect(crypto.createHash('sha256').update(original).digest('hex')).toBe('f72a6b1faa83c5d18f6b19559ea985b527beb5cf6030df83f116588ce70c16fc');
  await expect(page.locator('.walkthrough-card')).toHaveCount(4);
  expect(await page.locator('.hinge-walkthrough').evaluate(el=>el.previousElementSibling.classList.contains('diagram-column')&&el.nextElementSibling.classList.contains('step-details'))).toBeTruthy();
  const drawing=await page.locator('.diagram-column').boundingBox(),details=await page.locator('.step-details').boundingBox(),walk=await page.locator('.hinge-walkthrough').boundingBox();
  expect(walk.x).toBeCloseTo(drawing.x,0);
  expect(walk.x+walk.width).toBeGreaterThanOrEqual(details.x+details.width-1);
  expect(walk.y).toBeGreaterThanOrEqual(Math.max(drawing.y+drawing.height,details.y+details.height));
  const cards=await page.locator('.walkthrough-card').all();
  const first=await cards[0].boundingBox(),second=await cards[1].boundingBox(),third=await cards[2].boundingBox();
  expect(first.width).toBeGreaterThan(400);
  expect(second.y).toBeCloseTo(first.y,0);expect(second.x).toBeGreaterThan(first.x);
  expect(third.y).toBeGreaterThan(first.y+first.height);
  await expect(page.locator('[data-walkthrough="hinge-seat"] .walkthrough-anatomy dd')).toHaveText(['Чашка','Ушки','Плечо','Ответная планка']);
  await expect(page.locator('[data-walkthrough="hinge-check"] .walkthrough-anatomy')).toHaveCount(0);
  await expect(page.locator('[data-walkthrough="hinge-check"] svg text')).toHaveCount(0);
});

test('hinge geometry seats the cup and directs the arm past the nearest door edge',async({page})=>{
  await page.goto('./#step/hinges');
  const geometry=await page.locator('.hinge-walkthrough').evaluate(section=>{
    const svgs=[...section.querySelectorAll('.walkthrough-art>svg')];
    const point=(svg,el,x,y)=>new DOMPoint(x,y).matrixTransform(el.getScreenCTM()).matrixTransform(svg.getScreenCTM().inverse());
    const center=(svg,el)=>{const b=el.getBBox();return point(svg,el,b.x+b.width/2,b.y+b.height/2);};
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const final=svgs[3],door=final.querySelector('.hinge-door-inner'),points=[...door.points].map(p=>point(final,door,p.x,p.y));
    const cup=final.querySelector('.hinge-cup-rim'),cupCenter=point(final,cup,cup.cx.baseVal.value,cup.cy.baseVal.value);
    const arm=center(final,final.querySelector('.hinge-arm-end')),plate=center(final,final.querySelector('.hinge-mounting-plate'));
    const distances=points.map((a,index)=>{const b=points[(index+1)%4];const t=Math.max(0,Math.min(1,((cupCenter.x-a.x)*(b.x-a.x)+(cupCenter.y-a.y)*(b.y-a.y))/((b.x-a.x)**2+(b.y-a.y)**2)));return Math.hypot(cupCenter.x-a.x-t*(b.x-a.x),cupCenter.y-a.y-t*(b.y-a.y));});
    const relative=(svg,selector)=>{const el=svg.querySelector(selector);return point(svg,el,el.cx.baseVal.value,el.cy.baseVal.value);};
    const hover=relative(svgs[1],'.hinge-cup-rim'),hoverHole=relative(svgs[1],'.hinge-door-recess'),seatedHole=relative(final,'.hinge-door-recess');
    const tool=svgs[2].querySelector('.hinge-driver-tip'),tipLocal=tool.getPointAtLength(0),tip=point(svgs[2],tool,tipLocal.x,tipLocal.y);
    const heads=[...svgs[2].querySelectorAll('.hinge-ear-fastener ellipse')].map(el=>point(svgs[2],el,el.cx.baseVal.value,el.cy.baseVal.value));
    const armScrews=[...svgs[2].querySelectorAll('.hinge-arm-screw')].map(el=>point(svgs[2],el,el.cx.baseVal.value,el.cy.baseVal.value));
    return {
      nearestEdge:distances.indexOf(Math.min(...distances)),armAcrossEdge:cross(points[1],points[2],cupCenter)*cross(points[1],points[2],arm)<0,
      plateAcrossEdge:cross(points[1],points[2],cupCenter)*cross(points[1],points[2],plate)<0,
      hoverGap:hoverHole.y-hover.y,seatedGap:Math.hypot(cupCenter.x-seatedHole.x,cupCenter.y-seatedHole.y),
      earHeads:heads.length,toolToEar:Math.min(...heads.map(p=>Math.hypot(p.x-tip.x,p.y-tip.y))),toolToArm:Math.min(...armScrews.map(p=>Math.hypot(p.x-tip.x,p.y-tip.y))),
      frames:svgs.map(svg=>svg.getAttribute('viewBox')),doorShapes:svgs.map(svg=>svg.querySelector('.hinge-door-inner').getAttribute('points'))
    };
  });
  expect(geometry.nearestEdge).toBe(1);expect(geometry.armAcrossEdge).toBeTruthy();expect(geometry.plateAcrossEdge).toBeTruthy();
  expect(geometry.hoverGap).toBeGreaterThan(20);expect(geometry.seatedGap).toBeLessThan(1);
  expect(geometry.earHeads).toBe(2);expect(geometry.toolToEar).toBeLessThan(5);expect(geometry.toolToArm).toBeGreaterThan(40);
  expect(new Set(geometry.frames).size).toBe(1);expect(new Set(geometry.doorShapes).size).toBe(1);
});

test('every walkthrough zoom preserves its caption and restores focus without completing a step',async({page})=>{
  await page.goto('./#step/hinges');
  const cards=await page.evaluate(()=>window.GUIDE.steps.find(s=>s.id==='hinges').walkthrough.steps);
  for(const card of cards){
    const button=page.locator(`[data-walkthrough="${card.diagramKey}"] [data-joint]`);
    await button.click();
    await expect(page.locator('#zoom-content > svg')).toHaveAttribute('data-joint-type',card.diagramKey);
    await expect(page.locator('#zoom-level')).toHaveText('100%');
    await expect(page.locator('.zoom-walkthrough-copy')).toContainText(card.text);
    await expect(page.locator('.zoom-walkthrough-copy')).toContainText(card.note);
    await expect(page.locator('#zoom-dialog .diagram-inspector')).toHaveCount(0);
    if(card.anatomy)await expect(page.locator('.zoom-walkthrough-copy .walkthrough-anatomy dd')).toHaveCount(4);
    await page.keyboard.press('Escape');await expect(button).toBeFocused();
  }
  await page.locator('.diagram-zoom').click();
  await expect(page.locator('#zoom-dialog.walkthrough-zoom,.zoom-walkthrough-copy')).toHaveCount(0);
  await expect(page.locator('#zoom-dialog .diagram-inspector')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('./#step/base');await page.locator('[data-joint="confirmat"]').click();
  await expect(page.locator('#zoom-dialog.walkthrough-zoom,.zoom-walkthrough-copy')).toHaveCount(0);
  await expect(page.locator('#zoom-content > svg')).toHaveAttribute('data-joint-type','confirmat');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vileta6-guide-v1')).completed)).toEqual([]);
});

for(const width of [390,320])test(`hinge walkthrough stays readable and initially complete at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto('./#step/hinges');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  const cards=page.locator('.walkthrough-card');
  const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();expect(a.x).toBeCloseTo(b.x,0);expect(b.y).toBeGreaterThan(a.y+a.height);
  for(const button of await page.locator('.walkthrough-zoom-button').all()){const box=await button.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);}
  await page.locator('[data-walkthrough="hinge-seat"] [data-joint]').click();
  await expect(page.locator('.zoom-walkthrough-copy .walkthrough-anatomy dd').last()).toBeInViewport();
  await expect(page.locator('#zoom-level')).toHaveText('100%');
  const picture=await page.locator('#zoom-content > svg .hinge-assembly').boundingBox(),viewport=await page.locator('.zoom-viewport').boundingBox();
  expect(picture.x).toBeGreaterThanOrEqual(viewport.x);expect(picture.x+picture.width).toBeLessThanOrEqual(viewport.x+viewport.width);
  const copy=page.locator('.zoom-walkthrough-copy'),font=await copy.locator('p').first().evaluate(el=>getComputedStyle(el).fontSize),before=await page.locator('#zoom-content > svg').boundingBox();
  await page.locator('[data-action="zoom-in"]').click();
  expect((await page.locator('#zoom-content > svg').boundingBox()).width).toBeGreaterThan(before.width);
  expect(await copy.locator('p').first().evaluate(el=>getComputedStyle(el).fontSize)).toBe(font);
  expect(await copy.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
});
