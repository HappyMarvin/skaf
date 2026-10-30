const fs = require('fs');
const vm = require('vm');
const { Resvg } = require('@resvg/resvg-js');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const previews = path.join(root, 'work', 'diagrams');
const check = process.argv.includes('--check');
if (!check) fs.mkdirSync(previews, { recursive: true });
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(root + '/docs/diagrams.js', 'utf8'), context);
vm.runInNewContext(fs.readFileSync(root + '/docs/data.js', 'utf8'), context);
const knownParts = new Set(context.window.GUIDE.parts.map(part => String(part.id)));
const keys = ['preparation','base','sides','dividers','shelves','roof','loose-shelves','back','raise','rod','hinges','doors','adjust'];
let sheet = '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="2160" viewBox="0 0 1440 2160"><rect width="1440" height="2160" fill="#F7F6F2"/>';
for (let i=0; i<keys.length; i++) {
  const svg = context.window.renderDiagram(keys[i]);
  const ids = [...svg.matchAll(/data-part="([^"]+)/g)].map(match => match[1]);
  const unknown = ids.filter(id => !knownParts.has(id));
  if (unknown.length) throw new Error('Unknown part IDs in ' + keys[i] + ': ' + unknown.join(', '));
  if (/<image|\.(?:png|jpe?g|webp)/i.test(svg)) throw new Error('Raster reference in ' + keys[i]);
  for(const match of svg.matchAll(/data-unresolved-order="(\d+)"/g))if(Number(match[1])!==0)throw new Error('Unresolved face order in '+keys[i]);
  if (!check) fs.writeFileSync(root + '/docs/assets/diagram-' + keys[i] + '.svg',svg);
  const png = new Resvg(svg, { background:'#F7F6F2' }).render().asPng();
  if (!check) fs.writeFileSync(previews + '/diagram-' + keys[i] + '-preview.png',png);
  const x = (i%4)*360, y = Math.floor(i/4)*540;
  sheet += `<text x="${x+20}" y="${y+30}" font-family="Arial" font-size="20" fill="#222820">${keys[i]}</text>`;
  sheet += `<svg x="${x+5}" y="${y+45}" width="350" height="480" ${svg.slice(svg.indexOf('viewBox='),svg.indexOf('>'))}>${svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'))}</svg>`;
}
sheet += '</svg>';
if (!check) fs.writeFileSync(previews + '/diagram-contact-sheet.png',new Resvg(sheet).render().asPng());
context.window.matchMedia=()=>({matches:true});
const mobileAdjust=context.window.renderDiagram('adjust');
if (!check) fs.writeFileSync(root+'/docs/assets/diagram-adjust-mobile.svg',mobileAdjust);
if (!check) fs.writeFileSync(previews+'/diagram-adjust-mobile-preview.png',new Resvg(mobileAdjust,{background:'#F7F6F2'}).render().asPng());
for (const mobile of [false,true]) {
  context.window.matchMedia=()=>({matches:mobile});
  for (const type of ['confirmat','cam-dowel','glide']) {
    const joint=context.window.renderJointDiagram(type);
    if (!joint || /<image|\.(?:png|jpe?g|webp)/i.test(joint)) throw new Error('Invalid joint illustration: '+type);
    const name='joint-'+type+(mobile?'-mobile':'');
    const png=new Resvg(joint,{background:'#F7F6F2'}).render().asPng();
    if (!check) fs.writeFileSync(root+'/docs/assets/'+name+'.svg',joint);
    if (!check) fs.writeFileSync(previews+'/'+name+'.png',png);
  }
}
console.log('13 assembly SVG and 6 joint SVG rendered; no raster references or unknown interactive part IDs.');
