(function () {
  'use strict';

  const ink = '#45583F';
  const edge = '#BDCAA8';
  const metal = '#DCE3D3';
  const pale = '#F9FAF5';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const number = value => Number(value.toFixed(3));
  const points = values => values.map(point => point.map(number).join(',')).join(' ');
  const polygon = (values, fill, attributes = '') => `<polygon points="${points(values)}" fill="${fill}" ${attributes}/>`;
  const path = (d, fill = 'none', attributes = '') => `<path d="${d}" fill="${fill}" ${attributes}/>`;
  const ellipse = (x,y,rx,ry,fill=pale,attributes='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${attributes}/>`;
  const rect = (x,y,width,height,fill=pale,attributes='') => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" ${attributes}/>`;

  function svg(part, body, box, layout, type, attributes = '') {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="part-illustration" data-part-id="${escape(part.id)}" data-part-kind="${escape(part.kind)}" data-part-layout="${layout}" data-art-type="${type}" viewBox="${box.join(' ')}" role="img" aria-label="${escape(part.name)}" preserveAspectRatio="xMidYMid meet" ${attributes}><title>${escape(part.name)}</title><g stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  }

  function dimension(a, b, offset, label) {
    const start=[a[0]+offset[0],a[1]+offset[1]],end=[b[0]+offset[0],b[1]+offset[1]];
    let angle=Math.atan2(end[1]-start[1],end[0]-start[0])*180/Math.PI;
    if(angle<-90||angle>90)angle+=180;
    const middle=[(start[0]+end[0])/2,(start[1]+end[1])/2];
    return `<g stroke="#7C8B70" stroke-width="1.2" fill="none">${path(`M${a.join(' ')}L${start.join(' ')}M${b.join(' ')}L${end.join(' ')}M${start.join(' ')}L${end.join(' ')}`)}${path(`M${start[0]-4} ${start[1]-4}l8 8M${end[0]-4} ${end[1]-4}l8 8`)}</g><text transform="translate(${middle.join(' ')}) rotate(${angle})" y="-9" text-anchor="middle" fill="#526548" stroke="none" font-family="Arial,sans-serif" font-size="30">${label} мм</text>`;
  }

  function panelArt(part, detail) {
    const dimensions=String(part.size).match(/\d+(?:[.,]\d+)?/g)?.slice(0,3).map(value=>Number(value.replace(',','.')));
    if(!dimensions||dimensions.length!==3)return '';
    const [length,width,thickness]=dimensions;
    const id=Number(part.id);
    const horizontal=[7,8,9,10,16,17,19].includes(id);
    const standingWide=id===15;
    const faceWidth=standingWide?length:width,faceHeight=standingWide?width:length;
    // All three dimensions share one scale. The thickness is never inflated.
    const project=horizontal?(x,y,z)=>[x+.55*y,-.42*y-z]:(x,y,z)=>[x+.6*z,y-.36*z];
    const model=horizontal?[
      {face:'front',fill:edge,vertices:[[0,0,0],[length,0,0],[length,0,thickness],[0,0,thickness]]},
      {face:'side',fill:'#D2DCC3',vertices:[[length,0,0],[length,width,0],[length,width,thickness],[length,0,thickness]]},
      {face:'top',fill:pale,vertices:[[0,0,thickness],[length,0,thickness],[length,width,thickness],[0,width,thickness]]}
    ]:[
      {face:'top',fill:'#E3EAD9',vertices:[[0,0,0],[faceWidth,0,0],[faceWidth,0,thickness],[0,0,thickness]]},
      {face:'side',fill:edge,vertices:[[faceWidth,0,0],[faceWidth,0,thickness],[faceWidth,faceHeight,thickness],[faceWidth,faceHeight,0]]},
      {face:'front',fill:id>=20?'#ECE8D9':pale,vertices:[[0,0,0],[faceWidth,0,0],[faceWidth,faceHeight,0],[0,faceHeight,0]]}
    ];
    const coordinates=model.flatMap(face=>face.vertices.map(vertex=>project(...vertex)));
    const minimum=[Math.min(...coordinates.map(point=>point[0])),Math.min(...coordinates.map(point=>point[1]))];
    const extent=[Math.max(...coordinates.map(point=>point[0]))-minimum[0],Math.max(...coordinates.map(point=>point[1]))-minimum[1]];
    const layout=!horizontal&&faceHeight>faceWidth*1.45?'portrait':'landscape';
    const box=detail?(layout==='portrait'?[0,0,620,520]:[0,0,720,440]):(layout==='portrait'?[0,0,220,320]:[0,0,420,240]);
    const area=detail?(layout==='portrait'?[145,35,300,365]:[60,55,555,260]):[14,14,box[2]-28,box[3]-28];
    const scale=Math.min(area[2]/extent[0],area[3]/extent[1]);
    const origin=[area[0]+(area[2]-extent[0]*scale)/2-minimum[0]*scale,area[1]+(area[3]-extent[1]*scale)/2-minimum[1]*scale];
    const screen=vertex=>{const point=project(...vertex);return [point[0]*scale+origin[0],point[1]*scale+origin[1]];};
    let body=model.map(face=>polygon(face.vertices.map(screen),face.fill,`data-face="${face.face}" stroke-width="${detail?1.8:1.7}"`)).join('');
    if(detail){
      const label=value=>String(value).replace('.',',');
      if(horizontal){
        body+=dimension(screen([0,0,thickness]),screen([length,0,thickness]),[0,34],label(length));
        body+=dimension(screen([length,0,thickness]),screen([length,width,thickness]),[70,0],label(width));
      }else{
        body+=dimension(screen([0,0,0]),screen([0,faceHeight,0]),[-35,0],label(faceHeight));
        body+=dimension(screen([0,faceHeight,0]),screen([faceWidth,faceHeight,0]),[0,36],label(faceWidth));
      }
      const corner=horizontal?screen([length,width,thickness/2]):screen([faceWidth,0,thickness/2]);
      const labelX=layout==='portrait'?492:560;
      body+=path(`M${corner.join(' ')}L${labelX-13} 46`,'none','stroke="#7C8B70" stroke-width="1.2"');
      body+=`<text x="${labelX}" y="49" fill="#526548" stroke="none" font-family="Arial,sans-serif" font-size="30">${label(thickness)} мм</text>`;
    }
    return svg(part,body,box,layout,'proportional-panel',`data-dimensions-mm="${dimensions.join(' ')}" data-projection="${horizontal?'horizontal':'vertical'}" data-uniform-scale="${scale}"`);
  }

  function thread(start,end,top,bottom,pitch,color=ink){
    let body='';
    for(let x=start;x<end-pitch*.5;x+=pitch)body+=path(`M${x} ${bottom}L${Math.min(x+pitch*.7,end)} ${top}`,'none',`stroke="${color}" stroke-width="2"`);
    return body;
  }

  function woodScrew(part, detail) {
    const long=part.id==='Ф18',yellow=part.id==='Ф6';
    const headHeight=long?34:67,shaftRadius=long?10:17,start=108,end=335,point=363;
    const fill=yellow?'#D9D6B4':metal;
    let body=polygon([[68,150-headHeight/2],[82,150-headHeight/2],[start,150-shaftRadius],[end,150-shaftRadius*.62],[point,150],[end,150+shaftRadius*.62],[start,150+shaftRadius],[82,150+headHeight/2],[68,150+headHeight/2]],fill);
    body+=path(`M82 ${150-headHeight/2}L82 ${150+headHeight/2}`);
    body+=thread(122,329,150-shaftRadius,150+shaftRadius,long?15:27);
    body+=path(`M68 ${150-headHeight*.25}L68 ${150+headHeight*.25}`,'none','stroke-width="3.3"');
    if(detail)body+=ellipse(75,66,24,24,pale)+path('M63 66h24M75 54v24','none','stroke-width="3"');
    return svg(part,body,[35,35,350,230],'landscape','wood-screw','data-end-type="pointed"');
  }

  function machineScrew(part, detail) {
    const end=part.id==='Ф12'?355:318;
    let body=rect(104,137,end-104,26,metal)+thread(113,end-3,137,163,10);
    body+=path('M94 118H107V182H94Q61 182 58 150Q61 118 94 118Z',metal);
    body+=rect(96,113,13,74,'#CCD6BD');
    body+=path('M72 135v30','none','stroke-width="3"');
    if(detail)body+=ellipse(76,62,29,29,pale)+ellipse(76,62,21,21,'none')+path('M64 62h24M76 50v24','none','stroke-width="3"');
    return svg(part,body,[30,25,355,235],'landscape','machine-screw','data-end-type="blunt"');
  }

  function hardwareArt(part,detail){
    const id=String(part.id);
    if(['Ф2','Ф6','Ф18'].includes(id))return woodScrew(part,detail);
    if(['Ф12','Ф13'].includes(id))return machineScrew(part,detail);
    if(id==='Ф5'||id==='Ф11'){
      const overlay=id==='Ф5';
      const name=overlay?'hinge-overlay-from-pdf.png':'hinge-half-overlay-from-pdf.png';
      const height=overlay?348:433,width=overlay?517:511;
      return svg(part,`<image href="assets/parts/${name}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" style="mix-blend-mode:multiply"/>`,[0,0,width,height],'landscape','manufacturer-hinge-photo');
    }
    let body='',layout='landscape',type='';
    switch(id){
      case '23':
        type='oval-hollow-rail';
        body=path('M47 205L373 136Q380 135 381 143Q382 150 375 152L49 221Z','#DFE6D8');
        body+=ellipse(48,213,4,8,pale)+ellipse(48,213,2,5,'#849776');
        body+=path('M55 208L376 140','none','stroke="#A4B199" stroke-width="1.2"');
        body+=ellipse(156,104,25,50,'#F3F7EE')+ellipse(156,104,19,43,'#839672');
        body+=path('M57 198L120 144','none','stroke="#8E9D80" stroke-width="1.2" stroke-dasharray="5 5"');
        body+='<text x="156" y="38" text-anchor="middle" fill="#526548" stroke="none" font-family="Arial,sans-serif" font-size="22">15 × 30 мм</text>';
        break;
      case '24':
        type='rear-connecting-profile';
        body=polygon([[54,189],[318,91],[360,108],[96,207]],'#E7E1CF');
        body+=polygon([[54,189],[96,207],[96,221],[54,203]],'#CFC8B1');
        body+=polygon([[96,207],[360,108],[360,122],[96,221]],'#D9D2BC');
        body+=path('M75 196L340 99','none','stroke="#8E8C73" stroke-width="4"');
        break;
      case 'Ф1':
        type='smooth-nail';
        body=polygon([[90,144],[321,144],[365,150],[321,156],[90,156]],metal);
        body+=ellipse(87,150,6,29,'#F8FAF4')+path('M91 145L321 145','none','stroke="#9DAC90" stroke-width="1.2"');
        break;
      case 'Ф3':
        type='adhesive-cover';layout='square';
        body=ellipse(206,159,96,65,'#DDE4D1')+ellipse(206,155,96,65,'#FDFEF9');
        body+=path('M249 99Q279 105 294 131Q278 152 256 148Q267 124 249 99Z','#E0E7D5');
        break;
      case 'Ф4':
        type='confirmat';
        body=rect(103,136,54,28,metal)+rect(156,129,191,42,metal)+thread(164,341,129,171,26);
        body+=path('M76 116H86L105 136V164L86 184H76Z','#CFD9C2');
        body+=ellipse(75,150,15,34,pale)+polygon([[75,132],[83,140],[83,159],[75,168],[67,159],[67,140]],'#73866B');
        break;
      case 'Ф7':
        type='cam-cover';layout='square';
        body=path('M75 132V148C75 182 233 182 233 148V132Z','#D5DEC8');
        body+=ellipse(154,132,79,43,'#FBFCF7')+ellipse(154,132,65,32,'none','stroke="#B3C1A3"');
        body+=ellipse(287,205,50,27,'#E9EEDF')+path('M268 199V177Q287 162 306 177V199Q287 213 268 199Z','#C7D3B7');
        break;
      case 'Ф8':
        type='cam-and-dowel';
        body=path('M61 111V166Q62 205 195 191V135Z','#BECBAE');
        body+=ellipse(128,123,68,43,'#F3F7ED')+path('M98 115l57 18M127 98l-5 50','none','stroke-width="5"');
        body+=path('M173 152Q150 156 157 179L181 170Z','#71856A');
        body+='<g transform="rotate(-28 283 199)">'+rect(228,191,107,15,metal)+ellipse(226,198,8,20,'#F3F7ED')+rect(324,182,49,32,metal)+thread(327,369,182,214,10)+'</g>';
        break;
      case 'Ф9':
        type='fluted-wood-dowel';
        body=path('M84 112H322Q347 112 347 150Q347 188 322 188H84Z','#D6BD92');
        body+=ellipse(84,150,20,38,'#E6D2AD');
        for(const y of[124,137,151,165,178])body+=path(`M107 ${y}H327`,'none','stroke="#967E58" stroke-width="2"');
        body+=path('M78 127Q95 149 78 173','none','stroke="#B39A6F"');
        break;
      case 'Ф10':
        type='flat-furniture-glide';
        body=polygon([[94,157],[236,112],[325,145],[183,190]],'#FAFCF6');
        body+=polygon([[94,157],[183,190],[183,207],[94,174]],'#CDD8BC');
        body+=polygon([[183,190],[325,145],[325,162],[183,207]],'#B7C8A3');
        break;
      case 'Ф14':
        type='push-latch';
        body=polygon([[66,132],[204,98],[246,126],[109,161]],'#FAFCF5');
        body+=polygon([[66,132],[109,161],[109,205],[66,176]],'#D5E0C8');
        body+=polygon([[109,161],[246,126],[246,170],[109,205]],'#E9EFDE');
        body+=path('M246 140L322 119Q337 115 341 129Q345 142 330 147L246 168Z','#D0DCC0');
        body+=ellipse(333,132,10,15,'#F9FBF3');
        break;
      case 'Ф15':
        type='long-pull-handle';
        body=path('M88 152V192L104 197V157M307 96V136L323 140V101','#29372A','stroke="#29372A" stroke-width="8"');
        body+=path('M77 139L320 77Q335 73 340 89Q344 106 329 110L85 172Q70 175 66 159Q62 143 77 139Z','#28342A','stroke="#28342A"');
        body+=path('M81 144L325 82','none','stroke="#687464" stroke-width="2"');
        break;
      case 'Ф16':
        type='split-wall-plug';
        body=path('M89 128H305Q333 128 346 150Q333 172 305 172H89Z','#E6EEDB');
        for(let x=131;x<304;x+=24)body+=path(`M${x} 125L${x+9} 134V166L${x} 175`,'none','stroke-width="3"');
        body+=path('M211 150H342M197 128L180 113L176 129M197 172L180 187L176 171','none','stroke-width="3"');
        body+=ellipse(87,150,9,31,'#FAFCF5')+ellipse(87,150,4,13,'#B6C7A3');
        break;
      case 'Ф17':
        type='cabinet-wall-hanger';
        body=polygon([[110,104],[251,85],[300,119],[158,140]],'#FCFDF8');
        body+=polygon([[110,104],[158,140],[158,232],[110,196]],'#D1DCC2');
        body+=polygon([[158,140],[300,119],[300,211],[158,232]],'#EFF4E7');
        body+=path('M200 117V83Q200 62 222 58L264 52V70L229 76Q219 78 219 92V115Z','#AAB99A');
        body+=path('M177 160L281 145M177 202L281 187','none','stroke="#BECDAF"');
        break;
      case 'Ф19':
        type='oval-rail-support';layout='square';
        body=path('M95 202V113Q95 73 146 66H237Q288 73 288 113V202Z','#D5DFCA');
        body+=path('M114 191V116Q114 91 147 85H235Q269 90 269 116V191Z','#F7FAF2');
        body+=path('M134 111V163Q134 202 193 202Q252 202 252 163V111H232V163Q232 182 193 182Q154 182 154 163V111Z','#B9CAAA');
        body+=path('M111 212H273L294 230H91Z','#E5EDDA');
        break;
      case 'Ф20':
        type='z-hex-key';
        body=path('M75 204L116 192L116 153L310 100V58L344 49','none','stroke="#8C9D7C" stroke-width="16" stroke-linecap="butt"');
        body+=path('M75 200L112 190V150L306 97V55L341 45','none','stroke="#E1E8D8" stroke-width="5" stroke-linecap="butt"');
        break;
      default:return '';
    }
    return svg(part,body,[30,30,360,240],layout,type);
  }

  window.renderPartArt=function renderPartArt(part,options={}){
    if(!part||!part.id)return '';
    return part.kind==='panel'?panelArt(part,options.mode==='detail'):hardwareArt(part,options.mode==='detail');
  };
})();
