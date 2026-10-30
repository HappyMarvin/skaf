(function () {
  'use strict';
  const length=1168,width=383.5;
  // Relative positions observed on the supplied bottom-panel photo, not drilling coordinates.
  const holes=[
    ['H1',.309,.151,true],['H2',.330,.132,false],
    ['H3',.667,.168,false],['H4',.691,.153,true],['H5',.667,.253,false],
    ['H6',.330,.868,false],['H7',.309,.965,true],
    ['H8',.666,.747,false],['H9',.667,.830,false],['H10',.692,.965,true]
  ];
  const n=value=>Number(value.toFixed(3));
  function body(interactiveParts){
    const panel=`<rect x="0" y="0" width="${length}" height="${width}" rx="2" fill="#fffef8" stroke="#718166" stroke-width="3"/>`;
    let result=interactiveParts?`<g class="diagram-part" data-part="8">${panel}</g>`:panel;
    const strips=[.152,.965].map(v=>`<rect x="6" y="${n(v*width-9)}" width="${length-12}" height="18" rx="2" fill="#a8bd8d" fill-opacity=".25" stroke="#748960" stroke-width="2" stroke-dasharray="10 8"/>`).join('');
    result+=interactiveParts?`<g class="diagram-part base-top-plinths" data-part="19">${strips}</g>`:strips;
    result+=holes.map(([id,u,v,mount])=>`<circle class="base-hole ${mount?'is-plinth':'is-other'}" data-hole-key="${id}" data-hole-use="${mount?'plinth':'other'}" cx="${n(u*length)}" cy="${n(v*width)}" r="${mount?8:7}" fill="${mount?'#445845':'#f7f6f2'}" stroke="${mount?'#445845':'#8a9480'}" stroke-width="${mount?1.5:2.4}" aria-hidden="true"/>`).join('');
    return result;
  }
  window.renderBaseTopDiagram=function renderBaseTopDiagram(options={}){
    const frames=[.32,.68].map(center=>`<rect class="base-crop-frame" x="${n((center-.06)*length)}" y="${n((.18-.125)*width)}" width="${n(.12*length)}" height="${n(.25*width)}" fill="none" stroke="#a8b59a" stroke-width="2.8" stroke-dasharray="9 7" pointer-events="none" aria-hidden="true"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" class="base-top-svg" data-diagram-view="base-top" viewBox="-32 -70 1232 523.5" role="img" aria-label="Дно, вид сверху: четыре отверстия для цокольных планок и шесть других видимых отверстий"><title>Отверстия дна, вид сверху</title>${body(options.interactive!==false)}${frames}<g class="base-top-direction-labels" fill="#445845" font-family="Arial,sans-serif" font-size="58" text-anchor="middle" aria-hidden="true"><text x="584" y="-23">ЗАД</text><text x="584" y="${width+57}">ПЕРЕД</text></g></svg>`;
  };
  window.renderBaseTopInset=function renderBaseTopInset(side){
    const center=side==='left'?.32:.68,crop=[(center-.06)*length,(.18-.125)*width,.12*length,.25*width];
    return `<svg xmlns="http://www.w3.org/2000/svg" class="base-top-inset" data-inset="${side}" viewBox="${crop.map(n).join(' ')}" role="img" aria-label="Увеличенная задняя группа отверстий, ${side==='left'?'слева':'справа'} на фото">${body(false)}</svg>`;
  };
})();
