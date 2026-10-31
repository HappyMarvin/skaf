(() => {
  'use strict';
  const data = window.GUIDE;
  const main = document.querySelector('#main');
  const storageKey = 'vileta6-guide-v1';
  let state = { current: '', completed: [], found: [] };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch (_) {}
  if (!Array.isArray(state.completed)) state.completed = [];
  if (!Array.isArray(state.found)) state.found = [];
  state.completed = [...new Set(state.completed.map(String))].filter(id => data.steps.some(s => String(s.id) === id));
  state.found = [...new Set(state.found.map(String))].filter(id => data.parts.some(part => String(part.id) === id));
  state.current = data.steps.some(step=>String(step.id)===String(state.current)) ? String(state.current) : '';
  let zoom = 1;
  let activeZoomJoint = '';
  let baseDiagramView = 'assembly';
  const jointLabels={confirmat:'Как соединить конфирматом','cam-dowel':'Как собрать эксцентрик и шкант',glide:'Куда поставить подпятник'};
  let toastTimer;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name, cls = '') => {
    const paths = {
      check: '<path d="m5 12 4 4L19 6"/>',
      expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>',
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      floor: '<path d="m3 16 9-5 9 5-9 5-9-5Zm0-5 9-5 9 5M3 6l9-5 9 5"/>',
      parts: '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 0v10l9 5 9-5V8m-9 5v10M8 6l9 5"/>',
      guide: '<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4Zm9 2v16M6 8h3m-3 4h3m6-4h3m-3 4h3"/>',
      help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3m0 3v.1"/>',
      arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>'
    };
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.parts}</svg>`;
  };
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {} };
  save();
  const isDone = id => state.completed.includes(String(id));
  const progress = () => data.steps.length ? Math.round(state.completed.length / data.steps.length * 100) : 0;
  const stepUrl = id => `#step/${encodeURIComponent(id)}`;
  const currentStep = () => data.steps.find(s => String(s.id) === String(state.current)) || data.steps[0];
  const number = n => String(n).padStart(2, '0');
  const quantityLabel = value => /^\d+(?:[.,]\d+)?$/.test(String(value)) ? `${escape(value)} шт.` : escape(value);
  const normalizeFactoryName = value => String(value || '').toLowerCase().replace(/ё/g,'е').replace(/[\s№]/g,'');
  const diagramMarkup = (step, options={}) => {
    if(step.id==='base' && baseDiagramView==='holes') return baseTopMarkup(options);
    const key = step.diagramKey || step.diagram;
    if (window.renderDiagram && key && !/[./]/.test(key)) { const vector=window.renderDiagram(key); if(vector) return vector; }
    return step.diagram ? `<img src="${escape(step.diagram)}" alt="${escape(step.diagramAlt || `Схема: ${step.title}`)}">` : `<div class="diagram-pending">${icon('guide')}<span>Схема из исходной инструкции</span></div>`;
  };
  const isVectorDiagram = step => { const key=step.diagramKey || step.diagram || ''; return Boolean(window.renderDiagram && key && !/[./]/.test(key) && window.renderDiagram(key)); };
  const diagramCaption = () => 'Наглядная схема';
  const sourceLabel = step => typeof step.source === 'string' ? escape(step.source) : step.source ? `${step.source.url ? `<a href="${escape(step.source.url)}" target="_blank" rel="noopener">${escape(step.source.label || 'Исходная инструкция')}</a>` : escape(step.source.label || 'Исходная инструкция')}${step.source.page ? ` · стр. ${escape(step.source.page)}` : ''}` : '';
  const routeToStart = () => currentStep() ? stepUrl(currentStep().id) : '#guide';

  function home() {
    document.title = 'Вилета 6 — соберём по порядку';
    const hasProgress = Boolean(state.current || state.completed.length);
    main.innerHTML = `<div class="home"><section class="hero"><div class="hero-copy"><div class="eyebrow">Инструкция к вашему шкафу</div><h1>Ваш шкаф.<br><em>По шагам.</em></h1><p class="hero-description">От первой детали до последней дверцы.<br>Всё для сборки Вилеты 6 — в одном понятном руководстве.</p><a class="primary-button" href="${routeToStart()}">${hasProgress ? 'Продолжить сборку' : 'Начать сборку'}<span class="arrow" aria-hidden="true">→</span></a><div class="hero-meta"><span>${data.steps.length || 'Все'} ${data.steps.length ? 'этапов' : 'этапы'} сборки</span><span>Прогресс сохраняется</span></div>${hasProgress ? `<div class="resume-note"><span class="progress-dot"></span>Вы остановились на шаге ${data.steps.findIndex(s => String(s.id) === String(currentStep()?.id)) + 1} · выполнено ${state.completed.length} из ${data.steps.length}</div>` : ''}</div><div class="hero-visual"><img class="cabinet-svg" src="assets/hero-closed.svg" alt="Шкаф Вилета 6: три верхние и три длинные дверцы, ширина 120, глубина 40, высота 210 сантиметров"><div class="product-note"><strong>${escape(data.product.name)}</strong>${escape(data.product.dimensions)}<br>${escape(data.product.subtitle || '')}</div></div></section><div class="hero-bottom"><p><strong>Меньше догадок, больше ясности.</strong><br>Сверяйте детали, увеличивайте схемы и двигайтесь в своём темпе.</p><a class="small-link" href="#parts">Сначала проверить детали <span aria-hidden="true">↗</span></a></div><section class="section prep-section"><div class="section-heading"><div><span class="eyebrow">Перед первым шагом</span><h2>Подготовим место.</h2></div><p>Несколько простых действий,<br>чтобы сборка шла спокойно.</p></div><div class="prep-grid"><article class="prep-card">${icon('floor','line-icon')}<h3>Освободите пространство</h3><p>Разложите детали на ровной поверхности. Подстелите картон от упаковки, чтобы защитить пол и покрытие шкафа.</p></article><article class="prep-card">${icon('parts','line-icon')}<h3>Сверьте комплект</h3><p>Сравните панели и крепёж с ведомостью. Сверьте название на этикетке с каталогом. Неясную подпись уточните рулеткой, отверстиями и кромками.</p></article><article class="prep-card">${icon('guide','line-icon')}<h3>Держите схемы под рукой</h3><p>Любую схему можно увеличить. Ваша отметка о завершении шага сохранится в этом браузере.</p></article></div></section><section class="section" id="guide"><div class="section-heading"><div><span class="eyebrow">Вся сборка на виду</span><h2>У каждого шага — своя задача.</h2></div><p>Можно заглянуть в любой этап.<br>Прогресс изменится, когда вы отметите его готовым.</p></div><div class="journey-list">${data.steps.map((s,i) => `<a class="journey-item" href="${stepUrl(s.id)}"><span class="journey-number">${isDone(s.id) ? '✓' : number(i+1)}</span><span class="journey-title">${escape(s.title)}</span><span class="journey-arrow" aria-hidden="true">↗</span></a>`).join('')}</div></section></div>`;
    if (location.hash === '#guide') requestAnimationFrame(() => document.querySelector('#guide')?.scrollIntoView({ behavior: 'smooth' }));
  }

  function itemMarkup(item) {
    if (typeof item === 'string') return `<div class="part-chip"><span class="part-mini">—</span><span>${escape(item)}</span></div>`;
    const reference = data.parts.find(part => String(part.id) === String(item.id));
    return `<button class="part-chip" data-part-dialog="${escape(item.id)}"><span class="part-mini">${partArt(reference || item)}</span><span><span class="part-chip-number">${escape(partLabel(reference || item))} · </span>${escape(item.name || reference?.name || '')}${item.quantity ? ` <b class="item-quantity">× ${escape(item.quantity)}</b>` : ''}<small>${escape(item.size || reference?.size || '')}</small>${item.usage ? `<small class="part-chip-usage">${escape(item.usage)}</small>` : ''}</span></button>`;
  }

  function stepPage(step) {
    const index = data.steps.indexOf(step);
    state.current = String(step.id); save();
    document.title = `${index + 1}. ${step.title} — Вилета 6`;
    main.innerHTML = `<div class="guide-shell"><aside class="guide-sidebar"><a class="back-link" href="#">← <span>К началу</span></a><h2 class="sidebar-product">${escape(data.product.name)}</h2><div class="sidebar-dimensions">${escape(data.product.dimensions)}</div><div class="progress-track"><div class="progress-fill" style="width:${progress()}%"></div></div><div class="progress-label"><span>Собираем по порядку</span><span>${state.completed.length} / ${data.steps.length}</span></div><nav class="step-nav" aria-label="Этапы сборки">${data.steps.map((s,i) => `<button data-step="${escape(s.id)}" class="${s === step ? 'current' : ''} ${isDone(s.id) ? 'done' : ''}" ${s === step ? 'aria-current="step"' : ''}><span class="step-nav-number">${isDone(s.id) ? '✓' : number(i+1)}</span><span>${escape(s.title)}</span></button>`).join('')}</nav><div class="sidebar-bottom">Прогресс сохранён в этом браузере.<button data-action="help">Нужна помощь? ↗</button></div></aside><article class="step-main"><div class="mobile-step-nav"><label for="mobile-steps">Все шаги</label><select id="mobile-steps" aria-label="Перейти к шагу">${data.steps.map((s,i) => `<option value="${escape(s.id)}" ${s === step ? 'selected' : ''}>${number(i+1)} · ${escape(s.title)}${isDone(s.id) ? ' ✓' : ''}</option>`).join('')}</select><span class="mobile-step-count">${index+1}/${data.steps.length}</span></div><div class="mobile-progress" style="width:${progress()}%"></div><div class="step-breadcrumb"><span>Инструкция по сборке</span><button data-action="help">${icon('help')} Нужна помощь?</button></div><div class="step-title-row"><div><div class="eyebrow">Шаг ${number(index+1)} из ${number(data.steps.length)}${step.eyebrow ? ` · ${escape(step.eyebrow)}` : ''}</div><h1>${escape(step.title)}</h1><p class="step-description">${escape(step.description || '')}</p></div><span class="step-counter" aria-hidden="true">${number(index+1)}</span></div>${step.warning ? `<div class="safety-note">${icon('help')}<p>${escape(step.warning)}</p></div>` : ''}<div class="assembly-layout"><div class="diagram-card">${diagramMarkup(step)}${sourceLabel(step) ? `<span class="diagram-source">${typeof step.source === 'object' && step.source.page ? `Исходная схема · стр. ${escape(step.source.page)}` : 'Схема из инструкции'}</span>` : ''}<button class="diagram-zoom" data-action="zoom">${icon('expand')} Увеличить</button></div><div class="step-details">${step.items?.length ? `<h2 class="step-aside-title">Возьмите</h2><div class="part-chips">${step.items.map(itemMarkup).join('')}</div><button class="part-help-link" data-action="part-help">Не уверены в детали? <span aria-hidden="true">↗</span></button>` : ''}<ol class="step-instructions">${(step.instructions || []).map(text => `<li>${escape(text)}</li>`).join('')}</ol></div></div>${step.checkpoint ? `<div class="checkpoint">${icon('check')}<div><h2>Проверьте перед продолжением</h2><p>${escape(step.checkpoint)}</p></div></div>` : ''}${progress() === 100 ? `<div class="all-complete"><strong>Все этапы отмечены.</strong>Все ${data.steps.length} этапов отмечены готовыми. Можно вернуться к любой схеме.</div>` : ''}<div class="step-actions"><a class="secondary-button" href="${index ? stepUrl(data.steps[index-1].id) : '#'}"><span aria-hidden="true">←</span>${index ? 'Назад' : 'К началу'}</a><button class="complete-button ${isDone(step.id) ? 'is-complete' : ''}" data-action="toggle-complete" aria-pressed="${isDone(step.id)}"><span class="check-box" aria-hidden="true">${isDone(step.id) ? '✓' : ''}</span>${isDone(step.id) ? 'Шаг выполнен' : 'Отметить выполненным'}</button><button class="primary-button" data-action="next">${index === data.steps.length - 1 ? 'Завершить сборку' : 'Готово, дальше'}<span class="arrow" aria-hidden="true">${index === data.steps.length - 1 ? '✓' : '→'}</span></button></div>${sourceLabel(step) ? `<p class="step-source">Источник: ${sourceLabel(step)}</p>` : ''}</article></div>`;
    const caption = document.querySelector('.diagram-source');
    if(step.id==='adjust') document.querySelector('.diagram-card').classList.add('diagram-card--adjust');
    if(step.id==='back') document.querySelector('.diagram-card').classList.add('diagram-card--back');
    if(step.id==='prepare') document.querySelector('.step-description').insertAdjacentHTML('afterend',identificationHelpButton());
    if (caption) caption.textContent = diagramCaption(step);
    if(step.diagramResult){const result=document.createElement('p');result.className='diagram-result';result.textContent=step.diagramResult;document.querySelector('.diagram-card').after(result);}
    if (isVectorDiagram(step) && document.querySelector('.diagram-card svg [data-part]')) {
      const note = document.createElement('p'); note.className = 'vector-note';
      note.textContent = 'Выбирайте номер на схеме или под ней, чтобы узнать деталь.';
      document.querySelector('.diagram-card').after(note);
    }
    createInspector(document.querySelector('.assembly-layout'));
    const drawingColumn=document.createElement('div');drawingColumn.className='diagram-column';
    const assembly=document.querySelector('.assembly-layout');
    const drawingItems=[assembly.querySelector('.diagram-card'),assembly.querySelector('.diagram-result'),assembly.querySelector('.vector-note'),assembly.querySelector('.diagram-inspector')].filter(Boolean);
    assembly.prepend(drawingColumn);drawingItems.forEach(item=>drawingColumn.append(item));
    if(step.id==='base') setupBaseViews(drawingColumn);
    if(step.walkthrough) drawingColumn.insertAdjacentHTML('afterend',walkthroughMarkup(step.walkthrough));
    if(step.joints?.length){const helpers=document.createElement('div');helpers.className='joint-help';helpers.innerHTML=step.joints.map(type=>`<button data-joint="${escape(type)}">${escape(jointLabels[type])}<span aria-hidden="true">↗</span></button>`).join('');document.querySelector('.part-help-link').after(helpers);}
    const source = document.querySelector('.step-source');
    if (source) { const detail = document.createElement('details'); detail.className='source-detail'; detail.innerHTML=`<summary>Источник и оригинальная инструкция</summary><p>${sourceLabel(step)}</p>${data.pdf ? `<p><a href="${escape(data.pdf.url)}" target="_blank" rel="noopener">Открыть полный PDF ↗</a></p>` : ''}`; source.replaceWith(detail); }
    if (step.sourceNote) { const detail=document.querySelector('.source-detail'); if(detail) { const note=document.createElement('p'); note.textContent=step.sourceNote; detail.append(note); } }
    document.querySelector('#mobile-steps').addEventListener('change', e => { location.hash = stepUrl(e.target.value); });
  }

  function walkthroughCopy(walkthrough,card){
    return `<p>${escape(card.text)}</p>${card.note?`<p class="walkthrough-note">${escape(card.note)}</p>`:''}${card.anatomy?`<dl class="walkthrough-anatomy">${walkthrough.anatomy.map(item=>`<div><dt><span class="hinge-mark hinge-mark--${escape(item.kind)}">${escape(item.mark)}</span></dt><dd>${escape(item.text)}</dd></div>`).join('')}</dl>`:''}`;
  }
  function walkthroughMarkup(walkthrough){
    return `<section class="hinge-walkthrough" aria-labelledby="hinge-walkthrough-title"><h2 id="hinge-walkthrough-title">${escape(walkthrough.title)}</h2><p class="walkthrough-intro">${escape(walkthrough.intro)}</p><div class="walkthrough-grid">${walkthrough.steps.map((card,index)=>`<article class="walkthrough-card" data-walkthrough="${escape(card.diagramKey)}"><h3><span>${index+1}</span>${escape(card.title)}</h3><div class="walkthrough-art">${window.renderJointDiagram(card.diagramKey)}</div><div class="walkthrough-copy">${walkthroughCopy(walkthrough,card)}</div><button class="walkthrough-zoom-button" data-joint="${escape(card.diagramKey)}" aria-label="Увеличить: ${escape(card.title)}">${icon('expand')} Увеличить</button></article>`).join('')}</div></section>`;
  }
  function currentWalkthroughCard(){return currentStep()?.walkthrough?.steps.find(card=>card.diagramKey===activeZoomJoint);}

  function baseTopMarkup(options={}){
    return `<h3 class="base-top-title">Дно №8 · вид сверху</h3><p class="base-top-orientation">Зад — сверху, перед — снизу</p>${window.renderBaseTopDiagram(options)}<div class="base-top-insets"><h3>Задний ряд крупнее · для шага 4</h3>${['left','right'].map(side=>`<figure>${window.renderBaseTopInset(side)}<figcaption><strong>${side==='left'?'Слева':'Справа'} на фото</strong><span>Для заднего цоколя — крайнее ${side==='left'?'слева':'справа'}</span></figcaption></figure>`).join('')}</div><div class="base-top-legend"><span>Для цоколей — 4 отверстия:</span><span><i class="plinth-dot"></i>Передний — 2 сейчас</span><span><i class="later-dot"></i>Задний — 2 на шаге 4</span><span><i class="other-dot"></i>Другие отверстия — 6: в этом шаге не используются</span></div><p class="base-top-strip-note">Пунктирные полосы показывают планки <strong>под дном</strong>, а не пазы на поверхности. Переднюю закрепите сейчас 2 конфирматами, заднюю — после стойки №3 на шаге 4.</p><p class="base-top-caption">Расположение приблизительное, по фото детали. Это не шаблон для сверления.</p>`;
  }
  function setupBaseViews(column){
    const panel=document.createElement('div');panel.className='diagram-view-panel';panel.id='base-diagram-panel';panel.setAttribute('role','tabpanel');
    [...column.children].forEach(child=>panel.append(child));column.append(panel);
    column.insertAdjacentHTML('afterbegin','<div class="diagram-view-tabs" role="tablist" aria-label="Вид схемы дна"><button id="base-tab-assembly" role="tab" data-base-view="assembly" aria-controls="base-diagram-panel">Сборка</button><button id="base-tab-holes" role="tab" data-base-view="holes" aria-controls="base-diagram-panel">Отверстия дна</button></div>');
    setBaseDiagramView(baseDiagramView);
  }
  function setBaseDiagramView(view){
    if(!['assembly','holes'].includes(view))return;
    baseDiagramView=view;
    const scope=document.querySelector('.assembly-layout'),panel=document.querySelector('#base-diagram-panel');if(!panel)return;
    const previous=scope.querySelector('.diagram-inspector')?.dataset.selected;
    const card=panel.querySelector('.diagram-card');card.classList.toggle('diagram-card--base-top',view==='holes');
    card.innerHTML=`${diagramMarkup(currentStep())}<span class="diagram-source" ${view==='holes'?'hidden':''}>Наглядная схема</span><button class="diagram-zoom" data-action="zoom">${icon('expand')} Увеличить</button>`;
    panel.setAttribute('aria-labelledby',`base-tab-${view}`);
    document.querySelectorAll('[data-base-view]').forEach(button=>{const selected=button.dataset.baseView===view;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    const note=panel.querySelector('.vector-note');if(note)note.textContent=view==='holes'?'Под схемой можно выбрать дно №8 или цокольные планки №19.':'Выбирайте номер на схеме или под ней, чтобы узнать деталь.';
    createInspector(scope);
    if(previous && [...scope.querySelectorAll('svg [data-part]')].some(part=>part.dataset.part===previous))selectDiagramPart(previous,scope);
  }
  const isBaseTopZoom=()=>!activeZoomJoint && currentStep()?.id==='base' && baseDiagramView==='holes';
  const zoomMinimum=()=>isBaseTopZoom()&&window.matchMedia('(max-width:760px)').matches?1.5:.5;

  function partLabel(part) { return String(part.id).startsWith('Ф') ? `Строка ${part.id}` : `№ ${part.id}`; }
  function partInfoMarkup(part) {
    const currentPlinth=String(part.id)==='19' && currentStep()?.items?.find(item=>String(item.id)==='19');
    return `<div class="selected-part-heading"><span>${escape(partLabel(part))}</span><h3>${escape(part.name)}</h3></div><p class="selected-part-size">${escape(part.size || '')}</p><p class="selected-part-count">В комплекте: ${quantityLabel(part.quantity)}</p>${currentPlinth?`<p class="selected-part-step">На этом шаге: ${escape(currentPlinth.name)} — ${quantityLabel(currentPlinth.quantity)}</p>`:''}`;
  }
  function createInspector(scope) {
    const old = scope.querySelector('.diagram-inspector'); if(old) old.remove();
    const ids=[...new Set([...scope.querySelectorAll('svg [data-part]')].map(el=>el.dataset.part))].filter(id=>data.parts.some(part=>String(part.id)===id));
    if(!ids.length) return;
    const inspector=document.createElement('div'); inspector.className='diagram-inspector';
    inspector.innerHTML=`<p class="inspector-label">Нажмите на номер детали</p><div class="diagram-part-buttons">${ids.map(id=>{const part=data.parts.find(p=>String(p.id)===id);return `<button data-select-part="${escape(id)}" aria-pressed="false" aria-label="Показать ${escape(partLabel(part))}: ${escape(part.name)}">${escape(id)}</button>`;}).join('')}</div><div class="diagram-part-info" aria-live="polite"><p class="inspector-placeholder">Здесь появятся название, размер и количество.</p></div>`;
    if(scope.classList.contains('zoom-dialog')) scope.append(inspector);
    else (scope.querySelector('.vector-note') || scope.querySelector('.diagram-card')).after(inspector);
  }
  function selectDiagramPart(id, scope) {
    const part=data.parts.find(p=>String(p.id)===String(id)); if(!part || !scope) return;
    const inspector=scope.querySelector('.diagram-inspector'); if(!inspector) return;
    const selected=inspector.dataset.selected === String(id) ? '' : String(id);
    inspector.dataset.selected=selected;
    scope.querySelectorAll('svg [data-part]').forEach(el=>{const active=el.dataset.part===selected;el.classList.toggle('is-selected',active);if(el.getAttribute('role')==='button')el.setAttribute('aria-pressed',String(active));});
    scope.querySelectorAll('[data-select-part]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.selectPart===selected)));
    inspector.querySelector('.diagram-part-info').innerHTML=selected ? partInfoMarkup(part) : '<p class="inspector-placeholder">Здесь появятся название, размер и количество.</p>';
  }
  function showPartDialog(id) {
    const part=data.parts.find(p=>String(p.id)===String(id)); if(!part) return;
    openDialog(`<div class="part-detail-layout"><figure class="part-dialog-art">${partArt(part,'detail')}</figure><div class="part-detail-copy"><span class="eyebrow">${escape(partLabel(part))}</span><h2 id="part-dialog-title">${escape(part.name)}</h2><dl class="part-measurements">${part.factoryName ? `<div><dt>Название в ведомости</dt><dd>${escape(part.factoryName)}</dd></div>` : ''}<div><dt>Размеры / обозначение</dt><dd>${escape(part.size || 'Не указаны в ведомости')}</dd></div><div><dt>В комплекте</dt><dd>${quantityLabel(part.quantity)}</dd></div></dl><p class="part-detail-description">${escape(part.description || '')}</p><div class="part-dialog-actions"><button class="secondary-button" data-action="close-dialog">Закрыть просмотр</button>${location.hash==='#parts' ? '' : '<a class="small-link" href="#parts" data-close>Все детали <span aria-hidden="true">→</span></a>'}</div></div></div>`,{part:true});
    const extra=[['Как узнать',part.recognize],['Для чего',part.purpose]].filter(([,text])=>text);
    if(extra.length) document.querySelector('.part-detail-description').insertAdjacentHTML('beforebegin',extra.map(([title,text])=>`<section class="part-detail-note"><h3>${escape(title)}</h3><p>${escape(text)}</p></section>`).join(''));
  }

  function partArt(part, mode = 'compact') {
    return window.renderPartArt(part, { mode });
  }

  function identificationHelpButton() {
    return '<button class="identification-help-button" data-action="identify">Как найти нужную деталь<span aria-hidden="true">↗</span></button>';
  }

  function identificationGuideMarkup() {
    const guide=data.identification;
    return `<h2 id="identification-title">${escape(guide.title)}</h2><p class="identification-intro">${escape(guide.intro)}</p>
      <ol class="identification-steps">${guide.steps.map(step=>`<li><h3>${escape(step.title)}</h3><p>${escape(step.text)}</p></li>`).join('')}</ol>
      <details class="identification-details"><summary>Какие признаки помогают</summary><ul>${guide.clues.map(clue=>`<li>${escape(clue)}</li>`).join('')}</ul></details>
      <p class="identification-packaging-note">${escape(guide.packagingNote)}</p>`;
  }

  function partsPage() {
    document.title = 'Детали и крепёж — Вилета 6';
    main.innerHTML = `<section class="parts-page"><a class="back-link" href="#">← К началу</a><div class="eyebrow">Всё начинается с деталей</div><h1>Найдите ту самую.</h1><p class="parts-intro">Найдите деталь по названию на этикетке. Если подпись не читается — по размеру.</p><div class="filter-row"><label class="search-field">${icon('search')}<input type="search" id="parts-search" placeholder="Название, номер или размер" aria-label="Поиск деталей по названию, номеру или размеру"></label><select id="parts-kind" aria-label="Тип деталей"><option value="all">Все детали</option><option value="panel">Панели</option><option value="hardware">Крепёж и фурнитура</option></select></div><p class="parts-count" id="parts-count"></p><div class="parts-grid" id="parts-grid"></div><div class="parts-note">Начните с названия на этикетке. При неясной подписи измерьте панель; если размеры совпадают, уточните назначение по готовым отверстиям, углублениям и кромкам.</div></section>`;
    const legend = document.createElement('p'); legend.className='parts-legend'; legend.textContent='№ — номер в руководстве, Ф — строка фурнитуры. Количества — на весь комплект.';
    document.querySelector('.parts-intro').after(legend);
    legend.insertAdjacentHTML('afterend',identificationHelpButton());
    document.querySelector('#parts-search').placeholder='Название, размер или №8';
    if (state.current) { const step=currentStep(); const back=document.querySelector('.parts-page > .back-link'); back.href=stepUrl(step.id); back.textContent=`← К шагу ${data.steps.indexOf(step)+1} · ${step.title}`; }
    document.querySelector('#parts-search').addEventListener('input', filterParts);
    document.querySelector('#parts-kind').addEventListener('change', filterParts);
    filterParts();
  }

  function partCardMarkup(part) {
    const found=state.found.includes(String(part.id));
    const label=String(part.id).startsWith('Ф') ? `Крепёж ${part.id}` : `№ ${part.id}`;
    return `<article class="part-card ${found ? 'part-found' : ''}">
      <div class="part-card-top"><span>${escape(label)}</span><span>В комплекте: ${quantityLabel(part.quantity)}</span></div>
      <div class="part-card-art">${partArt(part)}</div>
      <h2><button class="part-card-open" data-part-dialog="${escape(part.id)}" aria-label="Открыть деталь ${escape(label)}: ${escape(part.name)}">${escape(part.name)}<span aria-hidden="true">↗</span></button></h2>
      ${part.factoryName ? `<p class="part-card-factory-name">В ведомости: ${escape(part.factoryName)}</p>` : ''}
      <p class="part-card-size">${escape(part.size || part.description || '')}</p>
      ${part.size && part.description ? `<p class="part-card-description">${escape(part.description)}</p>` : ''}
      <button class="found-button ${found ? 'is-found' : ''}" data-found="${escape(part.id)}" aria-pressed="${found}"><span class="check-box" aria-hidden="true">${found ? '✓' : ''}</span>${found ? 'Деталь найдена' : 'Я нашёл деталь'}</button>
    </article>`;
  }

  function filterParts() {
    const query = document.querySelector('#parts-search').value.trim().toLowerCase().replace(/,/g,'.');
    const tokens = query.split(/[×xх*\s]+/).filter(Boolean);
    const explicitId = query.match(/^[№#]\s*(\d+)$/)?.[1];
    const factoryMatch = data.parts.find(part=>part.factoryName && normalizeFactoryName(part.factoryName)===normalizeFactoryName(query));
    const exactId = explicitId || (data.parts.some(part=>String(part.id).toLowerCase()===query) ? query : null) || factoryMatch?.id;
    const kind = document.querySelector('#parts-kind').value;
    const found = data.parts.filter(p => (kind === 'all' || p.kind === kind) && (exactId ? String(p.id).toLowerCase() === exactId : tokens.every(token => `${p.id} ${p.name} ${p.factoryName || ''} ${p.size} ${p.description || ''}`.toLowerCase().replace(/,/g,'.').includes(token))));
    document.querySelector('#parts-count').textContent = `Найдено: ${found.length} из ${data.parts.length}`;
    document.querySelector('#parts-grid').innerHTML = found.length ? found.map(partCardMarkup).join('') : `<div class="empty-state">По этому запросу деталей не нашлось.<button data-action="clear-search">Сбросить поиск</button></div>`;
  }

  function render() {
    const hash = location.hash;
    document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', hash === '#parts' ? link.dataset.nav === 'parts' : hash.startsWith('#step/') || hash === '#guide' ? link.dataset.nav === 'guide' : false));
    if (hash === '#parts') partsPage();
    else if (hash.startsWith('#step/')) {
      let id; try { id = decodeURIComponent(hash.slice(6)); } catch (_) { id = ''; }
      const step = data.steps.find(s => String(s.id) === id);
      if (step) stepPage(step); else home();
    } else home();
    if (hash !== '#guide') window.scrollTo(0, 0);
  }

  function notify(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function openDialog(content, options = {}) {
    document.querySelector('#dialog-content').innerHTML = content;
    const dialog=document.querySelector('#help-dialog');
    dialog.classList.toggle('part-dialog',Boolean(options.part));
    dialog.classList.toggle('identification-dialog',Boolean(options.identification));
    dialog.setAttribute('aria-label',options.part ? 'Просмотр детали' : 'Под рукой');
    if(options.part) dialog.setAttribute('aria-labelledby','part-dialog-title');
    else if(options.identification) dialog.setAttribute('aria-labelledby','identification-title');
    else dialog.removeAttribute('aria-labelledby');
    if(!dialog.open) dialog.showModal();
    dialog.scrollTop=0;
  }
  function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); }
  function help(partOnly = false) {
    if(partOnly) {
      const step=currentStep();
      openDialog(`<h2>Детали этого шага.</h2><p>Шаг ${data.steps.indexOf(step)+1} · ${escape(step.title)}</p><div class="context-parts">${(step.items || []).map(itemMarkup).join('')}</div><p>Сначала сравните размеры, затем заводские отверстия и обработанные передние кромки. Совпадение размеров помогает найти кандидатов; ориентацию проверьте на нумерованной схеме этого шага.</p><a class="primary-button" href="#parts" data-close>Все детали и крепёж <span aria-hidden="true">→</span></a>`);
      return;
    }
    openDialog(`<h2>${partOnly ? 'Похожие — не одинаковые.' : 'Собираем спокойно.'}</h2><div class="help-item"><h3>Как различать панели</h3><p>Начните с названия на этикетке и найдите деталь в каталоге. Если подпись неясна, измерьте панель. При одинаковом размере сравните отверстия и кромки. Свой скотч нужен только при отсутствии понятной подписи.</p>${identificationHelpButton()}</div><div class="help-item"><h3>Как работать со схемой</h3><p>Нажмите «Увеличить» под изображением. В большом окне используйте кнопки + и −, а при увеличении прокручивайте схему.</p></div><div class="help-item"><h3>Как сохраняется прогресс</h3><p>Кнопка «Готово, дальше» завершает текущий этап. Переход через список шагов только открывает нужную схему. Прогресс хранится на этом устройстве в этом браузере.</p></div><a class="primary-button" href="#parts" data-close>Открыть детали <span aria-hidden="true">→</span></a><br><button class="reset-progress" data-action="reset">Сбросить прогресс сборки</button>`);
  }
  function sources() {
    openDialog(`<h2>Основа — ваша инструкция.</h2><p>Руководство подготовлено для шкафа ${escape(data.product.name)} размером ${escape(data.product.dimensions)}. Этапы сопровождают заново нарисованные схемы на основе данных комплекта.</p><div class="source-list">${data.sources.map(s => s.url ? `<a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(s.label)} ↗</a>` : `<span>${escape(s.label)}</span>`).join('')}</div>${data.pdf ? `<a class="primary-button" href="${escape(data.pdf.url)}" download>${escape(data.pdf.label || 'Скачать исходную инструкцию')} ↓</a>` : ''}`);
    if(data.about){const note=document.createElement('p');note.textContent=data.about;document.querySelector('#dialog-content').append(note);}
    document.querySelector('#dialog-content > p').textContent=`Руководство подготовлено для шкафа ${data.product.name} размером ${data.product.dimensions}. Наглядные схемы сопровождаются оригинальной инструкцией производителя.`;
  }
  function toggleCompleted(step, value) {
    const id = String(step.id);
    if (value && !isDone(id)) state.completed.push(id);
    if (!value) state.completed = state.completed.filter(item => item !== id);
    save();
  }

  document.addEventListener('click', event => {
    const viewTarget=event.target.closest('[data-base-view]');if(viewTarget){setBaseDiagramView(viewTarget.dataset.baseView);return;}
    const jointTarget=event.target.closest('[data-joint]');
    if(jointTarget){activeZoomJoint=jointTarget.dataset.joint;const card=currentWalkthroughCard();zoom=1;document.querySelector('#zoom-content').innerHTML=window.renderJointDiagram(activeZoomJoint);document.querySelector('#zoom-title').textContent=card?.title||jointLabels[activeZoomJoint];document.querySelector('#zoom-dialog .diagram-inspector')?.remove();updateZoom();document.querySelector('#zoom-dialog').showModal();return;}
    const partTarget=event.target.closest('[data-select-part],svg [data-part]');
    if(partTarget) { selectDiagramPart(partTarget.dataset.selectPart || partTarget.dataset.part,partTarget.closest('.zoom-dialog,.assembly-layout')); return; }
    const detailTarget=event.target.closest('[data-part-dialog]');
    if(detailTarget) { showPartDialog(detailTarget.dataset.partDialog); return; }
    const button = event.target.closest('[data-action], [data-step], [data-close], [data-found]');
    if (!button) return;
    if (button.hasAttribute('data-close')) closeDialogs();
    if (button.dataset.step) location.hash = stepUrl(button.dataset.step);
    if (button.hasAttribute('data-found')) { const id=button.dataset.found; state.found=state.found.includes(id) ? state.found.filter(item => item !== id) : [...state.found,id]; save(); filterParts(); document.querySelector(`[data-found="${CSS.escape(id)}"]`)?.focus(); }
    const step = currentStep();
    switch (button.dataset.action) {
      case 'help': help(); break;
      case 'identify': openDialog(identificationGuideMarkup(),{identification:true}); break;
      case 'part-help': help(true); break;
      case 'sources': sources(); break;
      case 'close-dialog': closeDialogs(); break;
      case 'toggle-complete': if (step) { toggleCompleted(step, !isDone(step.id)); stepPage(step); notify(isDone(step.id) ? 'Шаг отмечен выполненным' : 'Отметка снята'); } break;
      case 'next': if (step) {
        toggleCompleted(step, true);
        const index = data.steps.indexOf(step);
        if (index < data.steps.length-1) { location.hash = stepUrl(data.steps[index+1].id); }
        else { stepPage(step); const remaining=data.steps.length-state.completed.length; notify(remaining ? `Этот шаг выполнен. Осталось этапов: ${remaining}` : 'Все шаги выполнены. Прогресс сохранён'); }
      } break;
      case 'zoom': if (step) { activeZoomJoint='';zoom = Math.max(1,zoomMinimum()); document.querySelector('#zoom-content').innerHTML = diagramMarkup(step,{interactive:!isBaseTopZoom()}); document.querySelector('#zoom-title').textContent = isBaseTopZoom()?'Дно №8 · вид сверху':step.title; if(isBaseTopZoom())document.querySelector('#zoom-dialog .diagram-inspector')?.remove();else createInspector(document.querySelector('#zoom-dialog')); updateZoom(); document.querySelector('#zoom-dialog').showModal(); } break;
      case 'zoom-in': zoom = Math.min(3, zoom+.25); updateZoom(); break;
      case 'zoom-out': zoom = Math.max(zoomMinimum(), zoom-.25); updateZoom(); break;
      case 'clear-search': document.querySelector('#parts-search').value=''; document.querySelector('#parts-kind').value='all'; filterParts(); document.querySelector('#parts-search').focus(); break;
      case 'reset':
        if (confirm('Сбросить все отметки о выполнении? Вы начнёте сборку с первого шага.')) { state = {current:'',completed:[],found:[]}; save(); closeDialogs(); location.hash=''; render(); notify('Прогресс сброшен'); }
        break;
    }
  });
  document.addEventListener('keydown',event=>{
    const tab=event.target.closest('[data-base-view]');if(!tab)return;
    const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();
    const views=['assembly','holes'],index=views.indexOf(tab.dataset.baseView);
    const target=event.key==='Home'?0:event.key==='End'?1:(index+(event.key==='ArrowRight'?1:-1)+2)%2;
    setBaseDiagramView(views[target]);document.querySelector(`[data-base-view="${views[target]}"]`).focus();
  });
  document.addEventListener('keydown',event=>{const target=event.target.closest('svg [data-part][role="button"]');if(target && (event.key==='Enter' || event.key===' ')){event.preventDefault();selectDiagramPart(target.dataset.part,target.closest('.zoom-dialog,.assembly-layout'));}});
  document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView();});
  function updateZoom() {
    const dialog=document.querySelector('#zoom-dialog');
    const walkthroughCard=currentWalkthroughCard();
    let copy=dialog.querySelector('.zoom-walkthrough-copy');
    dialog.classList.toggle('walkthrough-zoom',Boolean(walkthroughCard));
    if(walkthroughCard){if(!copy){copy=document.createElement('div');copy.className='zoom-walkthrough-copy walkthrough-copy';dialog.querySelector('.zoom-header').after(copy);}copy.innerHTML=walkthroughCopy(currentStep().walkthrough,walkthroughCard);}else copy?.remove();
    const resultText=activeZoomJoint?'':currentStep()?.diagramResult;
    let result=dialog.querySelector('.zoom-result');
    if(resultText){if(!result){result=document.createElement('p');result.className='zoom-result';dialog.querySelector('.zoom-header').after(result);}result.textContent=resultText;}else result?.remove();
    const content = document.querySelector('#zoom-content');
    const topPhone=isBaseTopZoom()&&window.matchMedia('(max-width:760px)').matches;
    content.classList.toggle('base-top-content',isBaseTopZoom());
    content.style.width = topPhone?`${400*zoom}px`:`${(walkthroughCard?100:80) * zoom}%`;
    content.style.minWidth = topPhone?'600px':'';
    content.style.maxWidth = topPhone?'none':`${900 * zoom}px`;
    content.querySelectorAll('img,svg').forEach(img => img.style.maxHeight = activeZoomJoint || isBaseTopZoom() || currentStep()?.id==='adjust' ? 'none' : `${700 * zoom}px`);
    document.querySelector('#zoom-level').textContent = `${Math.round(zoom*100)}%`;
    document.querySelector('[data-action="zoom-out"]').disabled=zoom<=zoomMinimum();
    document.querySelector('[data-action="zoom-in"]').disabled=zoom>=3;
  }
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect=dialog.getBoundingClientRect(); if (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close(); } }));
  document.querySelector('#header-download').addEventListener('click', event => { if (!data.pdf) { event.preventDefault(); sources(); } });
  if (data.pdf) { const link=document.querySelector('#header-download'); link.href=data.pdf.url; link.setAttribute('download',''); }
  addEventListener('hashchange', render);
  const mobileBreakpoint=window.matchMedia('(max-width:760px)');
  mobileBreakpoint.addEventListener('change',()=>{
    if(location.hash==='#step/adjust') stepPage(currentStep());
    if(document.querySelector('#zoom-dialog').open && activeZoomJoint){document.querySelector('#zoom-content').innerHTML=window.renderJointDiagram(activeZoomJoint);updateZoom();}
    else if(document.querySelector('#zoom-dialog').open && currentStep()?.id==='adjust'){document.querySelector('#zoom-content').innerHTML=diagramMarkup(currentStep());updateZoom();}
    else if(document.querySelector('#zoom-dialog').open && isBaseTopZoom()){zoom=Math.max(zoom,zoomMinimum());updateZoom();}
  });
  render();
})();
