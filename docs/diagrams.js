(function () {
  'use strict';
  // Factory panel dimensions in millimetres; no fixing locations are inferred.
  const parts = [
    [19,16,2020,307.5,1168,79.5,16,1], [19,16,2020,16,1168,79.5,16,1],
    [8,16,2004,0,1168,16,383.5,1], [1,0,0,0,16,2099,383.5,2],
    [18,788,1707.6,0,16,296.4,383.5,3], [14,788,16,0,16,426,383.5,4],
    [15,408,1000,367.5,776,199,16,6], [10,408,1691.6,0,776,16,383.5,4],
    [9,408,442,0,776,16,383.5,4], [17,16,1691.6,0,376,16,383.5,4],
    [16,16,1379.2,0,376,16,383.5,6], [16,16,1066.8,0,376,16,383.5,6],
    [16,16,754.4,0,376,16,383.5,6], [17,16,442,0,376,16,383.5,4],
    [3,392,16,0,16,1988,383.5,3], [2,1184,0,0,16,2099,383.5,2],
    [7,16,0,0,1168,16,383.5,5]
  ];
  const stages={base:1,sides:2,dividers:3,shelves:4,roof:5,'loose-shelves':6,back:7};
  const aliases={preflight:'preparation',prepare:'preparation',frame:'sides',partitions:'dividers',top:'roof','shelves-brace':'loose-shelves',shelves16:'loose-shelves',rear:'back',lift:'raise',adjustment:'adjust'};
  const titles={base:'Дно и два цоколя',sides:'Боковины на основании',dividers:'Основная и нижняя стойки',shelves:'Фиксированные полки и верхняя стойка',roof:'Верхняя панель','loose-shelves':'Оставшиеся полки и ребро жёсткости',back:'Три панели задней стенки',raise:'Подъём с помощником и защита от опрокидывания',rod:'Одна штанга в широкой правой секции',hinges:'Накладные и полунакладные петли',doors:'Шесть дверей шкафа Вилета 6',adjust:'Три направления регулировки положения фасада'};
  const project=(x,y,z=0)=>[155+.31*x+.24*z,70+.31*y-.16*z];
  const pointList=a=>a.map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' ');
  const shape=(a,fill,stroke,extra='')=>`<polygon points="${pointList(a)}" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round" ${extra}/>`;
  const segment=(a,b,stroke='#8B9485',extra='')=>{
    const endArrow=/marker-end=/.test(extra);
    const attributes=extra.replace(/marker-end="[^"]*"/g,'');
    const width=Number(extra.match(/stroke-width="([\d.]+)"/)?.[1]||1.8);
    let markup=`<path d="M${a.join(' ')} L${b.join(' ')}" fill="none" stroke="${stroke}" ${extra.includes('stroke-width')?'':'stroke-width="1.8"'} ${attributes}/>`;
    if(endArrow){
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(length){
        const ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length,size=Math.max(9,width*3.5);
        const wing=sign=>[b[0]-ux*size+uy*size*.5*sign,b[1]-uy*size-ux*size*.5*sign];
        markup+=`<path d="M${wing(1).join(' ')}L${b.join(' ')}L${wing(-1).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    }
    return markup;
  };
  function boardFaces(b,active){
    const [id,x,y,z,w,h,d]=b;
    const c=active?['#D9E6CD','#9DAF8D','#B8CBA6','#455E3A']:['#F7F8F3','#E9ECE3','#F0F2EB','#A5AD9D'];
    return [
      {axis:1,limit:y,vertices:[[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]],fill:c[0]},
      {axis:0,limit:x+w,vertices:[[x+w,y,z],[x+w,y,z+d],[x+w,y+h,z+d],[x+w,y+h,z]],fill:c[1]},
      {axis:2,limit:z,vertices:[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],fill:c[2]}
    ].map(face=>({...face,id,active,stroke:c[3],points:face.vertices.map(vertex=>project(...vertex))}));
  }
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const signedArea=polygon=>polygon.reduce((sum,point,index)=>{
    const next=polygon[(index+1)%polygon.length];return sum+point[0]*next[1]-next[0]*point[1];
  },0)/2;
  function projectedOverlap(subject,clip){
    let result=subject;
    const sign=Math.sign(signedArea(clip));
    for(let i=0;i<clip.length&&result.length;i++){
      const a=clip[i],b=clip[(i+1)%clip.length],input=result;
      result=[];
      let previous=input[input.length-1],previousDistance=sign*cross(a,b,previous);
      for(const current of input){
        const distance=sign*cross(a,b,current);
        if((distance>=-1e-7)!==(previousDistance>=-1e-7)){
          const ratio=previousDistance/(previousDistance-distance);
          result.push([previous[0]+(current[0]-previous[0])*ratio,previous[1]+(current[1]-previous[1])*ratio]);
        }
        if(distance>=-1e-7)result.push(current);
        previous=current;previousDistance=distance;
      }
    }
    return result;
  }
  function faceDepth(face,point){
    // A viewing ray is (x0-.24/.31*t, y0+.16/.31*t, t).
    // Smaller t is closer to the camera. Compare only overlapping polygons:
    // sorting a whole tall panel by its centroid incorrectly hides the floor.
    const x0=(point[0]-155)/.31,y0=(point[1]-70)/.31;
    if(face.axis===0)return(face.limit-x0)/(-.24/.31);
    if(face.axis===1)return(face.limit-y0)/(.16/.31);
    return face.limit;
  }
  function scene(boards,isActive=()=>false){
    const faces=boards.flatMap(board=>boardFaces(board,isActive(board)));
    const following=faces.map(()=>new Set()),incoming=faces.map(()=>0);
    for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){
      const overlap=projectedOverlap(faces[i].points,faces[j].points);
      if(overlap.length<3||Math.abs(signedArea(overlap))<.01)continue;
      const point=overlap.reduce((sum,current)=>[sum[0]+current[0]/overlap.length,sum[1]+current[1]/overlap.length],[0,0]);
      const difference=faceDepth(faces[i],point)-faceDepth(faces[j],point);
      if(Math.abs(difference)<1e-5)continue;
      const far=difference>0?i:j,near=difference>0?j:i;
      if(!following[far].has(near)){following[far].add(near);incoming[near]++;}
    }
    const queue=faces.map((_,index)=>index).filter(index=>incoming[index]===0),order=[];
    while(queue.length){
      const index=queue.shift();order.push(index);
      for(const next of following[index])if(--incoming[next]===0)queue.push(next);
    }
    const unresolved=faces.length-order.length;
    if(unresolved)for(let i=0;i<faces.length;i++)if(!order.includes(i))order.push(i);
    return `<g data-scene="carcass" data-face-count="${faces.length}" data-unresolved-order="${unresolved}">`+order.map(index=>{
      const face=faces[index];
      return `<g class="diagram-part${face.active?' is-current':''}" data-part="${face.id}" data-face-axis="${face.axis}">`+shape(face.points,face.fill,face.stroke)+'</g>';
    }).join('')+'</g>';
  }
  function callout(number,target,labelPoint,suffix='',size=40){
    const radius=size*.9;
    return `<g class="diagram-part diagram-callout" data-part="${number}" tabindex="0" role="button" aria-label="Показать деталь №${number}">`+segment(target,labelPoint,'#607A51')+`<circle cx="${labelPoint[0]}" cy="${labelPoint[1]}" r="${radius}" fill="#445845"/><text x="${labelPoint[0]}" y="${labelPoint[1]+size*.34}" text-anchor="middle" fill="#fff" font-size="${size}" font-weight="600">${number}</text>`+(suffix?`<text x="${labelPoint[0]+radius+9}" y="${labelPoint[1]+size*.3}" font-size="${size*.8}" fill="#445845">${suffix}</text>`:'')+'</g>';
  }
  const defs=`<defs><marker id="vileta-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#617D50" stroke-width="1.8"/></marker></defs>`;
  function orientation(x,y){
    return `<g transform="translate(${x} ${y})"><path d="M0 37H93M8 29V8L72 8L86 0V21L72 29Z M8 8L23 0H86 M72 8V29 M23 0V20" fill="#E7EDDE" stroke="#617450" stroke-width="1.7" stroke-linejoin="round"/><path d="M27 9V27M49 9V27" fill="none" stroke="#617450" stroke-width="1.5"/><text x="113" y="19" font-size="30" fill="#445845">Сборка лёжа</text><text x="113" y="48" font-size="22" fill="#626D5A">Ракурс — для обзора конструкции</text></g>`;
  }
  function wrapper(body,viewBox,title,extraNote='',lying=true){
    const [x,y,w,h]=viewBox;
    const footer=lying?orientation(x+65,y+h-(extraNote?112:84)):'';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(' ')}" role="group" aria-label="${title}" style="font-family:Arial,sans-serif">${defs}${body}${footer}${extraNote?`<text x="${x+w/2}" y="${y+h-12}" text-anchor="middle" font-size="22" fill="#626D5A">${extraNote}</text>`:''}</svg>`;
  }
  function preparation(){
    let b=shape([[145,225],[435,140],[584,214],[294,299]],'#EFF3E8','#A5AD9D');
    b+=shape([[145,225],[294,299],[294,318],[145,244]],'#DDE5D2','#7D9070');
    b+=shape([[294,299],[584,214],[584,233],[294,318]],'#CBD9BF','#7D9070');
    b+=shape([[218,140],[401,86],[491,131],[308,185]],'#E0EBCD','#607A51');
    b+=shape([[218,140],[308,185],[308,201],[218,156]],'#B8CCA7','#607A51');
    b+=shape([[308,185],[491,131],[491,147],[308,201]],'#9EB68A','#607A51');
    b+=segment([174,335],[460,251],'#445845','stroke-width="4"');
    for(let i=0;i<=14;i++){const x=174+i*20.43,y=335-i*6;b+=segment([x,y],[x+4,y+(i%5===0?16:9)],'#445845');}
    b+=`<rect x="105" y="319" width="74" height="61" rx="16" fill="#445845"/><circle cx="141" cy="348" r="18" fill="#DCE7CF"/><text x="141" y="355" text-anchor="middle" fill="#445845" font-size="19">см</text><text x="380" y="425" text-anchor="middle" font-size="23" fill="#445845">Сверьте размеры и расположение отверстий</text>`;
    return wrapper(b,[45,35,650,440],'Подготовка: разложенные панели и рулетка.','Номера деталей — из заводской схемы.',false);
  }
  function renderDiagram(requested){
    const key=aliases[requested]||requested;
    if(key==='preparation')return preparation();
    if(key==='raise'){
      let b='<path d="M560 50L605 35L605 648L560 660Z" fill="#E9EDE1" stroke="#A5AD9D" stroke-width="2"/><text x="585" y="15" font-size="25" text-anchor="middle" fill="#626D5A">Стена</text><g transform="translate(65 129) scale(.72)">';
      b+=scene(parts);
      b+='</g>';
      const person=(x,flip)=>`<g transform="translate(${x} 415) scale(${flip} 1)" stroke="#617450" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="0" cy="-35" r="23" fill="#E5EDDB" stroke-width="3"/><path d="M-18 0L-24 110H23L18 0Z" fill="#E5EDDB" stroke-width="3"/><path d="M-12 112L-30 233M12 112L39 233M-18 12L-43 80M18 12L75 51"/></g>`;
      b+=person(105,1)+person(666,-1);
      b+=segment([35,648],[730,648],'#9BA68E','stroke-width="2"');
      b+='<g class="diagram-part diagram-callout" data-part="Ф17" tabindex="0" role="button" aria-label="Показать крепёж для защиты от опрокидывания"><path d="M744 111L794 130V180C794 214 769 238 744 251C719 238 694 214 694 180V130Z" fill="#D9E6CD" stroke="#617450" stroke-width="3"/><path d="M721 178L739 196L771 158" fill="none" stroke="#445845" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><text x="744" y="297" text-anchor="middle" font-size="28" fill="#445845">Защита от</text><text x="744" y="333" text-anchor="middle" font-size="28" fill="#445845">опрокидывания</text></g>';
      b+='<text x="405" y="710" text-anchor="middle" font-size="32" fill="#445845">Поднимайте с помощником</text><text x="470" y="766" text-anchor="middle" font-size="25" fill="#626D5A">Крепление выбирают по типу стены</text><text x="470" y="800" text-anchor="middle" font-size="25" fill="#626D5A">и инструкции к комплекту крепежа.</text>';
      return wrapper(b,[0,-15,930,865],titles.raise,'',false);
    }
    if(key==='adjust'){
      const narrow=typeof window.matchMedia==='function'&&window.matchMedia('(max-width:760px)').matches;
      const bidirectional=(a,z)=>{
        const length=Math.hypot(z[0]-a[0],z[1]-a[1]),ux=(z[0]-a[0])/length,uy=(z[1]-a[1])/length;
        const wing=(p,d,s)=>[p[0]+d*ux+s*uy,p[1]+d*uy-s*ux];
        return segment(a,z,'#617450','stroke-width="3"')+`<path d="M${wing(a,12,7).join(' ')}L${a.join(' ')}L${wing(a,12,-7).join(' ')}M${wing(z,-12,7).join(' ')}L${z.join(' ')}L${wing(z,-12,-7).join(' ')}" fill="none" stroke="#617450" stroke-width="3"/>`;
      };
      // Redrawn from the three supplied manufacturer diagrams: near arm screw,
      // end arm screw, then the mounting plate. No travel ranges or turn counts.
      const screw=(x,y,selected)=>`<ellipse cx="${x}" cy="${y}" rx="${selected?16:11}" ry="${selected?18:13}" fill="${selected?'#DBE9CD':'#F7F8F3'}" stroke="${selected?'#445845':'#8B9485'}" stroke-width="${selected?3.5:1.7}"/><path d="M${x-6} ${y+1}L${x+6} ${y-1}M${x} ${y-7}V${y+7}" fill="none" stroke="${selected?'#445845':'#8B9485'}" stroke-width="2"/>`;
      const headings=['Влево / вправо','Ближе / дальше','Вверх / вниз'];
      const captions=[['Винт на плече','ближе к фасаду'],['Крайний винт','на плече петли'],['Крепление','монтажной планки']];
      let b='';
      for(let i=0;i<3;i++){
        const offsetX=narrow?0:i*460,offsetY=narrow?i*610:0;
        b+=`<g class="adjust-panel" transform="translate(${offsetX} ${offsetY})"><text x="225" y="40" text-anchor="middle" font-size="31" fill="#445845">${headings[i]}</text>`;
        // Two open furniture faces and the cup/arm/mounting-plate silhouette.
        b+=shape([[34,160],[160,116],[160,416],[34,460]],'#F5F7F0','#A5AD9D');
        b+=shape([[160,116],[418,73],[418,373],[160,416]],'#EEF2E7','#A5AD9D');
        b+='<path d="M119 232Q119 222 132 219L158 211V338L132 347Q119 349 119 338Z" fill="#E1E8D7" stroke="#7D8B6F" stroke-width="2"/>';
        b+='<ellipse cx="158" cy="280" rx="23" ry="30" fill="#D7E2CB" stroke="#7D8B6F" stroke-width="2"/>';
        b+='<path d="M334 193Q334 183 346 181L367 177V319Q367 329 356 332L334 338Z" fill="#DFE8D4" stroke="#7D8B6F" stroke-width="2"/>';
        b+=screw(350,208,false)+screw(350,316,i===2);
        b+=shape([[171,258],[347,227],[379,239],[203,270]],'#F7F9F2','#7D8B6F');
        b+=shape([[203,270],[379,239],[379,269],[203,300]],'#D9E5CD','#7D8B6F');
        b+=shape([[171,258],[203,270],[203,300],[171,288]],'#E4EDDA','#7D8B6F');
        b+='<ellipse cx="314" cy="267" rx="8" ry="14" fill="#EEF3E8" stroke="#8B9485" stroke-width="1.7"/>';
        b+=screw(269,276,i===0)+screw(357,260,i===1);
        const target=i===0?[269,276]:i===1?[357,260]:[350,316];
        // An external ring identifies the original diagram's selected screw.
        b+=`<circle cx="${target[0]}" cy="${target[1]}" r="27" fill="none" stroke="#445845" stroke-width="3.5"/>`;
        b+=segment([target[0]+22,target[1]+14],[target[0]+58,target[1]+37],'#445845','stroke-width="3"');
        b+=segment([target[0]+58,target[1]+37],[target[0]+79,target[1]+50],'#617450','stroke-width="12" stroke-linecap="round"');
        if(i===0)b+=bidirectional([168,479],[310,479]);
        if(i===1)b+=bidirectional([181,505],[299,455]);
        if(i===2)b+=bidirectional([246,441],[246,509]);
        b+=`<text x="225" y="550" text-anchor="middle" font-size="27" fill="#445845">${captions[i][0]}</text><text x="225" y="586" text-anchor="middle" font-size="27" fill="#445845">${captions[i][1]}</text></g>`;
      }
      const width=narrow?460:1380,footerY=narrow?1900:665;
      const footerLines=narrow?['Петля показана по','инструкции производителя.','Сверьте форму своей петли.']:['Петля показана по инструкции производителя.','Сверьте форму своей петли.'];
      footerLines.forEach((text,index)=>{b+=`<text x="${width/2}" y="${footerY+index*(narrow?32:38)}" text-anchor="middle" font-size="${narrow?22:27}" fill="#626D5A">${text}</text>`;});
      return wrapper(b,[0,0,width,narrow?1980:750],titles.adjust,'',false);
    }
    if(key==='doors'){
      const closedParts=parts.slice();
      for(const [col,x]of[2,402.5,803].entries()){
        closedParts.push([13-col,x,16,-16.5,395,445,16,0],[4+col,x,465,-16.5,395,1565,16,0]);
      }
      let b=scene(closedParts);
      for(const x of[347,747,847])b+='<g class="diagram-part" data-part="Ф15">'+segment(project(x,690,-29),project(x,1230,-29),'#252D25','stroke-width="5.2" stroke-linecap="round"')+'</g>';
      return wrapper(b,[35,-70,690,920],titles.doors,'Три больших и три малых фасада.',false);
    }
    if(key==='base'){
      let b=scene([[19,16,2020,307.5,1168,79.5,16,1],[19,16,2020,16,1168,79.5,16,1],[8,16,1700,0,1168,16,383.5,1]],()=>true);
      b+=callout(8,project(730,1700,80),[590,548],'',32);
      b+=callout(19,project(850,2040,307.5),[655,644],'',32);
      b+=callout(19,project(250,2040,16),[110,728],'',32);
      b+=segment([300,624],[300,670],'#617D50','marker-end="url(#vileta-arrow)" stroke-dasharray="6 5"');
      b+=segment([470,604],[470,640],'#617D50','marker-end="url(#vileta-arrow)" stroke-dasharray="6 5"');
      b+='<text x="380" y="507" text-anchor="middle" font-size="25" fill="#445845">Положение цоколей — по заводским отверстиям</text><text x="590" y="695" text-anchor="middle" font-size="25" fill="#445845">Зад</text><text x="250" y="770" text-anchor="middle" font-size="25" fill="#445845">Перед</text>';
      return wrapper(b,[45,480,665,410],titles.base);
    }
    if(key==='hinges'){
      let b='<defs><pattern id="half-overlay-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="10" fill="#EEF0E9"/><path d="M0 0V10" stroke="#6C7C60" stroke-width="3"/></pattern></defs>';
      for(let col=0;col<3;col++)for(let row=0;row<2;row++){
        const x=320+col*90,y=row?234:130,h=row?344.3:97.9;
        const id=row?4+col:13-col;
        b+=`<g class="diagram-part" data-part="${id}"><rect x="${x}" y="${y}" width="86.9" height="${h}" fill="${col===1?'url(#half-overlay-hatch)':'#C5D7B4'}" stroke="#607A51" stroke-width="2"/></g>`;
      }
      b+='<g class="diagram-part diagram-callout" data-part="Ф5" tabindex="0" role="button" aria-label="Показать накладные петли"><rect x="40" y="173" width="42" height="32" rx="3" fill="#C5D7B4" stroke="#607A51"/><text x="40" y="248" font-size="30" fill="#445845">Накладные</text><text x="40" y="288" font-size="29" fill="#445845">12 всего</text><text x="40" y="328" font-size="23" fill="#626D5A">Крайние четыре</text><text x="40" y="357" font-size="23" fill="#626D5A">фасада</text><path d="M40 444H178L198 452H240V466H195L175 458H40Z" fill="#DEE7D3" stroke="#617450" stroke-width="2"/><text x="40" y="506" font-size="22" fill="#626D5A">Почти прямое плечо</text></g>';
      b+='<g class="diagram-part diagram-callout" data-part="Ф11" tabindex="0" role="button" aria-label="Показать полунакладные петли"><rect x="665" y="173" width="42" height="32" rx="3" fill="url(#half-overlay-hatch)" stroke="#607A51"/><text x="665" y="248" font-size="29" fill="#445845">Полунакладные</text><text x="665" y="288" font-size="29" fill="#445845">6 всего</text><text x="665" y="328" font-size="23" fill="#626D5A">Два средних</text><text x="665" y="357" font-size="23" fill="#626D5A">фасада</text><path d="M665 444H721L756 471H865V485H750L716 458H665Z" fill="#DEE7D3" stroke="#617450" stroke-width="2"/><text x="665" y="525" font-size="22" fill="#626D5A">Плечо с изгибом</text></g>';
      b+='<text x="460" y="620" text-anchor="middle" font-size="20" fill="#626D5A">Профиль плеча показан схематично, без крепёжных отверстий</text>';
      b+='<text x="460" y="668" text-anchor="middle" font-size="24" fill="#445845">Распределение двух типов петель по фасадам</text><text x="460" y="706" text-anchor="middle" font-size="22" fill="#626D5A">Положение и крепление — по заводской схеме</text>';
      return wrapper(b,[10,65,940,710],titles.hinges,'',false);
    }
    if(key==='rod'){
      let b=scene([...parts,[23,408,580,190,776,15,15,8]],panel=>panel[0]===23);
      b+=callout(23,project(930,580,190),[665,200]);
      b+=segment([460,175],[460,208],'#617D50','marker-end="url(#vileta-arrow)" stroke-dasharray="5 5"');
      return wrapper(b,[35,-70,690,920],titles.rod,'Высота штанги — по заводской схеме.',false);
    }
    if(key==='back'){
      let back='<g transform="translate(-5 65) scale(.64)" opacity=".6">';
      back+=scene(parts);
      back+=shape([project(0,0,388),project(1200,0,388),project(1200,2016,388),project(0,2016,388)],'#C1D3AF','#607A51')+'</g>';
      back+='<text x="245" y="555" text-anchor="middle" font-size="24" fill="#445845">Задняя область корпуса</text>';
      back+='<text x="675" y="64" text-anchor="middle" font-size="24" fill="#445845">Отдельные листы ДВП</text>';
      for(const [i,panel]of[[20,401],[21,398],[22,395]].entries()){
        const x=500+i*132,w=panel[1]*.1875;
        back+=`<g class="diagram-part diagram-callout" data-part="${panel[0]}" tabindex="0" role="button" aria-label="Показать задний лист №${panel[0]}"><rect x="${x}" y="157" width="${w}" height="378" fill="#D9E6CD" stroke="#607A51" stroke-width="2"/><circle cx="${x+w/2}" cy="112" r="26" fill="#445845"/><text x="${x+w/2}" y="122" text-anchor="middle" font-size="30" fill="#fff">${panel[0]}</text><text x="${x+w/2}" y="568" text-anchor="middle" font-size="21" fill="#445845">2016 × ${panel[1]}</text><text x="${x+w/2}" y="593" text-anchor="middle" font-size="18" fill="#626D5A">мм</text></g>`;
      }
      back+=`<text x="460" y="658" text-anchor="middle" font-size="24" fill="#445845">Порядок листов — по заводской схеме,</text><text x="460" y="690" text-anchor="middle" font-size="24" fill="#445845">сверить до крепления.</text>`;
      return wrapper(back,[30,20,890,750],titles.back,'',false);
    }
    const stage=stages[key];
    if(!stage)return '';
    let body=scene(parts.filter(panel=>panel[7]<=stage),panel=>panel[7]===stage);
    {
      const labels={
        base:[[8,[730,2004,80],[590,638]],[19,[340,2050,16],[110,732],'×2']],
        sides:[[1,[8,780,0],[80,260]],[2,[1192,780,0],[665,270]]],
        dividers:[[3,[400,980,0],[80,365]],[18,[796,1860,0],[665,655]]],
        shelves:[[9,[800,442,0],[665,155]],[10,[1050,1691.6,0],[665,590]],[17,[210,442,0],[80,155],'×2'],[14,[796,230,0],[520,-20]]],
        roof:[[7,[620,8,80],[390,-35]]],
        'loose-shelves':[[16,[210,1066.8,0],[80,375],'×3'],[15,[820,1090,383.5],[665,400]]]
      };
      for(const[id,target,position,suffix]of labels[key]||[])body+=callout(id,project(...target),position,suffix||'');
      const arrows={base:[[[310,655],[310,685]]],sides:[[[115,215],[148,215]],[[670,215],[635,215]]],dividers:[[[310,20],[310,66]],[[450,620],[440,652]]],shelves:[[[395,150],[405,182]],[[390,560],[405,590]]],roof:[[[360,-18],[360,25]]],'loose-shelves':[[[155,325],[187,325]],[[590,390],[555,390]]]};
      for(const[a,b]of arrows[key]||[])body+=segment(a,b,'#617D50','marker-end="url(#vileta-arrow)" stroke-dasharray="5 5"');
    }
    if(key==='base')return wrapper(body,[45,580,665,300],titles[key]);
    const note=key==='loose-shelves'?'Уровни полок и ребра — по сверловке оригинала.':'';
    return wrapper(body,[35,-100,690,970],titles[key],note);
  }
  function renderJointDiagram(type){
    const narrow=typeof window.matchMedia==='function'&&window.matchMedia('(max-width:760px)').matches;
    const text=(x,y,value,size=27)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="#445845">${value}</text>`;
    const panel=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F5F8EF" stroke="#617450" stroke-width="2"/>`;
    const line=(a,b,extra='')=>{
      const color=extra.match(/(?:^|\s)stroke="([^"]+)"/)?.[1]||'#617450';
      return segment(a,b,color,extra.replace(/\bstroke="[^"]*"/,''));
    };
    const screw=(x,y)=>{
      let drawing=`<path d="M${x} ${y-12}H${x+4}L${x+20} ${y-7}H${x+98}V${y+7}H${x+20}L${x+4} ${y+12}H${x}Z" fill="#C9D8B8" stroke="#445845" stroke-width="2"/>`;
      for(let step=30;step<96;step+=11)drawing+=line([x+step,y+7],[x+step+6,y-7]);
      return drawing;
    };
    if(type==='glide'){
      let body=panel(105,85,510,198)+`<path d="M105 251H615" stroke="#9BAB8B" stroke-width="2"/>`;
      body+=`<rect x="252" y="346" width="218" height="20" rx="3" fill="#D5E2C6" stroke="#617450" stroke-width="2"/>`;
      body+=line([361,327],[361,296],'marker-end="url(#vileta-arrow)" stroke-width="3"');
      body+=text(360,49,'Нижняя кромка панели',29)+text(360,415,'Подпятник Ф10 · артикул 10005',29);
      body+=text(360,465,'Плашка располагается под нижней кромкой.',24)+text(360,503,'Способ фиксации в PDF не показан.',24);
      return wrapper(body,[0,0,720,550],'Подпятник под нижней кромкой панели','',false).replace('<svg ','<svg data-joint-type="glide" ');
    }
    if(!['confirmat','cam-dowel'].includes(type))return '';
    const confirmat=type==='confirmat';
    const headings=confirmat?['1. Совместите детали','2. Введите конфирмат','3. Стяните соединение']:['1. Установите элементы','2. Соедините панели','3. Зафиксируйте узел'];
    const captions=confirmat?[['По готовым','отверстиям'],['Ф4 · 7 × 50 мм','в торец второй панели'],['Подтяните вручную','шестигранным ключом']]:[['Шток, шкант','и круглый эксцентрик'],['Шток входит','в эксцентрик'],['Поверните эксцентрик','до фиксации']];
    let body='';
    for(let i=0;i<3;i++){
      const offsetX=narrow?0:i*460,offsetY=narrow?i*610:0;
      body+=`<g transform="translate(${offsetX} ${offsetY})">`+text(225,40,headings[i],28);
      if(confirmat){
        body+=panel(120,130,32,282)+panel(i===0?186:152,250,i===0?240:274,32);
        body+=line([55,266],[430,266],'stroke-dasharray="6 6" stroke="#9DAA91"');
        if(i===1){body+=screw(59,266);body+=line([45,215],[109,215],'marker-end="url(#vileta-arrow)" stroke-width="3"');}
        if(i===2){body+=screw(120,266);body+=`<path d="M120 266H99V208H63" fill="none" stroke="#617450" stroke-width="7" stroke-linejoin="round"/>`;}
        if(i===0)body+=line([174,308],[155,308],'marker-end="url(#vileta-arrow)" stroke-width="3"');
      }else{
        const left=i===0?195:96,camX=left+78;
        body+=panel(64,128,32,284)+panel(left,210,230,120);
        body+=`<path d="M96 244H${i===0?163:camX}V256H96Z" fill="#CAD7BB" stroke="#617450" stroke-width="2"/><path d="M96 295H${i===0?159:178}V309H96Z" fill="#D6BD92" stroke="#917C57" stroke-width="2"/>`;
        for(let x=110;x<150;x+=12)body+=line([x,295],[x,309],'stroke="#A58C62"');
        body+=`<circle cx="${camX}" cy="250" r="30" fill="#DFE9D3" stroke="#445845" stroke-width="2.5"/><path d="M${camX-11} 241H${camX+11}M${camX} 231V251" stroke="#617450" stroke-width="3"/>`;
        if(i<2)body+=`<path d="M${camX+10} 265H${camX-12}M${camX-4} 257L${camX-12} 265L${camX-4} 273" fill="none" stroke="#617450" stroke-width="2"/>`;
        if(i===0){body+=line([165,250],[193,250],'stroke-dasharray="4 4"');body+=line([161,302],[193,302],'stroke-dasharray="4 4"');body+=line([269,381],[215,381],'marker-end="url(#vileta-arrow)" stroke-width="3"');}
        if(i===2)body+=`<path d="M${camX-34} 207A55 55 0 1 1 ${camX+49} 281M${camX+49} 267V281H${camX+63}" fill="none" stroke="#617450" stroke-width="3" stroke-linecap="round"/>`;
      }
      body+=text(225,490,captions[i][0])+text(225,528,captions[i][1]);
      body+='</g>';
    }
    const width=narrow?460:1380,footerY=narrow?1875:620;
    const notes=confirmat?['Схематичный разрез одного узла.','Используйте только заводские отверстия.']:['До совмещения стрелка эксцентрика направлена к входу штока.','Поверните до фиксации. Не затягивайте с усилием.'];
    if(narrow&&type==='cam-dowel'){
      ['До совмещения стрелка —','к входу штока.','Поверните до фиксации.','Не затягивайте с усилием.'].forEach((value,index)=>{body+=text(width/2,footerY+index*33,value,22);});
    }else notes.forEach((value,index)=>{body+=text(width/2,footerY+index*36,value,narrow?22:27);});
    return wrapper(body,[0,0,width,narrow?2000:720],confirmat?'Как работает соединение конфирматом':'Как работает эксцентрик со шкантом','',false).replace('<svg ',`<svg data-joint-type="${type}" `);
  }
  window.renderDiagram=renderDiagram;
  window.renderJointDiagram=renderJointDiagram;
})();
