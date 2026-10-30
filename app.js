(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const places = window.NIGHT_PLACES;
  const byId = Object.fromEntries(places.map(p => [p.id, p]));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (id, extra = '') => '<svg class="icon '+extra+'" aria-hidden="true"><use href="#i-'+id+'"/></svg>';
  const arrow = () => icon('arrow', 'cta-arrow');
  const params = new URLSearchParams(location.search);
  const readRange = (key, initial, max) => {
    const n = Number(params.get(key));
    return params.has(key) && Number.isFinite(n) ? Math.round(Math.max(10, Math.min(max, n))/5)*5 : initial;
  };
  const state = {selected:'sonya', extra:params.get('extra') === '1', start:/^(21|22|23):[0-5]\d$/.test(params.get('start') || '') ? params.get('start') : '21:00', frans:readRange('frans',45,90), cider:readRange('cider',45,90), sumbur:readRange('sumbur',15,60), visited:new Set()};
  let map, modalId = null, photoIndex = 0, toastTimer;
  const sequence = () => state.extra ? ['sonya','frans','cider','sumbur','vnvnc'] : ['sonya','frans','cider','vnvnc'];
  const legs = () => state.extra ? [7,5,6,17] : [7,5,20];
  const clock = n => String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  const minutes = text => text.split(':').reduce((a,n,i) => a + Number(n)*(i ? 1 : 60),0);
  const minText = n => n+' мин';
  function toast(text) {
    clearTimeout(toastTimer); $('toast').textContent=text; $('toast').classList.add('is-visible');
    toastTimer=setTimeout(()=>$('toast').classList.remove('is-visible'),3500);
  }
  async function copy(text, fallback) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) { if(fallback) { fallback.focus(); fallback.select(); } return false; }
  }
  function renderPreview() {
    const p=byId[state.selected], photo=p.photos[0];
    $('place-preview').innerHTML='<button class="preview-image-button" type="button" data-open-place="'+p.id+'" aria-label="Фотографии '+esc(p.name)+'"><img src="'+photo.src+'" alt="'+esc(photo.caption)+'" width="'+photo.width+'" height="'+photo.height+'">'+icon('photo')+'</button><div class="preview-copy"><p class="section-note">'+esc(p.type)+'</p><h3>'+esc(p.name)+'</h3><p class="preview-address">'+esc(p.address)+'</p><p class="preview-description">'+esc(p.description)+'</p><button class="button button-accent" type="button" data-open-place="'+p.id+'">Заглянуть внутрь'+arrow()+'</button><a class="preview-source" href="'+p.contact+'" target="_blank" rel="noopener">'+esc(p.contactLabel)+'</a></div>';
    document.querySelectorAll('.route-stop').forEach(b => { const active=b.dataset.selectPlace===state.selected; b.classList.toggle('is-selected',active); b.setAttribute('aria-pressed',String(active)); });
  }
  function selectPlace(id) { state.selected=id; if(map) map.select(id); renderPreview(); }
  function choosePlace(id) { selectPlace(id); if (matchMedia('(max-width:840px)').matches) openPlace(id); }
  function renderStops() {
    const ids=sequence(), walk=legs();
    $('route-stops').style.setProperty('--stop-count',ids.length);
    $('route-stops').innerHTML=ids.map((id,i)=>'<button class="route-stop" type="button" data-select-place="'+id+'" aria-pressed="'+(id===state.selected)+'"><span class="route-stop-index">0'+(i+1)+'</span><span class="route-stop-info"><strong>'+esc(byId[id].short)+'</strong><span>'+(i===0?'Старт в '+state.start:minText(walk[i-1])+' от предыдущего')+'</span></span></button>').join('');
    document.querySelectorAll('[data-total-distance]').forEach(el=>el.textContent=state.extra?'2,5 км':'2,3 км');
    document.querySelectorAll('[data-total-walk]').forEach(el=>el.textContent=state.extra?'около 40 минут':'около 35 минут');
    const route=ids.map(id=>byId[id].point.slice().reverse().join(',')).join('~');
    $('navigator-link').href='https://yandex.ru/maps/?rtext='+encodeURIComponent(route)+'&rtt=pd&z=15';
  }
  function renderPlan() {
    const ids=sequence(), walk=legs(); let t=minutes(state.start);
    const rows=ids.map((id,i)=>{
      if(i) t+=walk[i-1];
      const arrive=t, stay=state[id]||0; t+=stay;
      return {id,arrive,depart:t,stay,walk:i?walk[i-1]:0};
    });
    $('plan-timeline').innerHTML=rows.map(row=>'<li><span class="plan-time">'+clock(row.arrive)+'</span><span class="plan-dot" aria-hidden="true"></span><span class="plan-place"><strong>'+esc(byId[row.id].short)+'</strong><span>'+(row.id==='sonya'?'Выходим из отеля':row.id==='vnvnc'?'Конюшенная площадь, 2В':minText(row.stay)+' на остановку · выход '+clock(row.depart))+'</span></span></li>').join('');
    $('arrival-time').textContent=clock(t);
    const day=t>=1440?'Уже 1 ноября. ':'';
    $('arrival-note').textContent=t<1380?'До открытия ещё '+minText(1380-t)+'. Можно задержаться в баре или выйти позже.':day+'Двери открыты с 23:00. Оставьте запас на очередь и контроль входа.';
    ['frans','cider','sumbur'].forEach(id=>{$('stay-'+id).value=state[id];$('stay-'+id+'-output').textContent=state[id]+' минут';});
    $('start-time').value=state.start;
    $('map-sumbur').checked=state.extra; $('plan-sumbur').checked=state.extra; $('sumbur-range').hidden=!state.extra;
    return rows;
  }
  function updateVisited() {
    const ids=sequence();
    $('visited-count').textContent=ids.filter(id=>state.visited.has(id)).length+' из '+ids.length+' остановок';
    document.querySelectorAll('[data-visit]').forEach(b=>{ const yes=state.visited.has(b.dataset.visit); b.setAttribute('aria-pressed',String(yes)); b.innerHTML=icon('check')+(yes?'Уже были':'Отметить визит'); });
    if(modalId) {const yes=state.visited.has(modalId); $('dialog-visit').setAttribute('aria-pressed',String(yes)); $('dialog-visit').innerHTML=(yes?'Уже были — снять отметку':'Отметить посещение')+icon('check');}
    if(map) map.setVisited([...state.visited]);
  }
  function setExtra(value) { state.extra=value; if(map) map.setExtra(value); renderStops(); renderPreview(); renderPlan(); updateVisited(); }
  function renderGallery() {
    $('places-gallery').innerHTML=['sonya','frans','cider','sumbur','vnvnc'].map(id=>{
      const p=byId[id],photo=p.photos[0];
      return '<article class="place-tile scene" data-scene><button class="place-photo-button" type="button" data-open-place="'+id+'" aria-label="Фотографии и описание '+esc(p.name)+'"><div class="photo-scroll"><div class="photo-pointer"><img loading="lazy" src="'+photo.src+'" alt="'+esc(photo.caption)+'" width="'+photo.width+'" height="'+photo.height+'"></div></div><span class="photo-open-label">'+icon('photo')+'Посмотреть</span></button><div class="place-tile-copy"><p class="section-note">'+esc(p.type)+'</p><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><div class="tile-actions"><button class="text-link" type="button" data-open-place="'+id+'">О месте'+arrow()+'</button><button class="visited-button" type="button" data-visit="'+id+'" aria-pressed="false">'+icon('check')+'Отметить визит</button></div></div></article>';
    }).join('');
  }
  function renderPhoto() {
    const p=byId[modalId], photo=p.photos[photoIndex];
    $('dialog-photo').src=photo.src; $('dialog-photo').alt=photo.caption;
    $('photo-counter').textContent=(photoIndex+1)+' / '+p.photos.length;
    $('dialog-photo-credit').innerHTML=esc(photo.caption)+' <a href="'+photo.source_url+'" target="_blank" rel="noopener">'+esc(photo.credit)+'</a>.';
  }
  function openPlace(id) {
    const p=byId[id]; if(!p) return; modalId=id; photoIndex=0;
    $('dialog-place-type').textContent=p.type; $('dialog-place-title').textContent=p.name;
    $('dialog-place-address').textContent=p.address; $('dialog-place-description').textContent=p.description+' '+p.detail;
    $('dialog-place-facts').innerHTML='<p>'+icon('clock')+'<span>'+esc(p.hours)+'</span></p><p>'+icon('pin')+'<span>'+esc(p.entry)+'</span></p>'+(p.tickets?'<p><a class="text-link" href="'+p.tickets+'" target="_blank" rel="noopener">Билеты у организатора'+arrow()+'</a></p>':'');
    $('dialog-place-map').href=p.map; $('dialog-source').href=p.source;
    renderPhoto(); updateVisited();
    $('place-dialog').showModal(); document.body.classList.add('modal-open');
  }
  function closeDialog(dialog) { dialog.close(); }
  ['place-dialog','credits-dialog'].forEach(id=>{
    const dialog=$(id); dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open'); if(id==='place-dialog') modalId=null;});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return; const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(dialog);});
  });
  $('close-place-dialog').addEventListener('click',()=>closeDialog($('place-dialog')));
  $('photo-prev').addEventListener('click',()=>{photoIndex=(photoIndex-1+byId[modalId].photos.length)%byId[modalId].photos.length;renderPhoto();});
  $('photo-next').addEventListener('click',()=>{photoIndex=(photoIndex+1)%byId[modalId].photos.length;renderPhoto();});
  $('place-dialog').addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();$(event.key==='ArrowRight'?'photo-next':'photo-prev').click();}});
  $('dialog-visit').addEventListener('click',()=>{if(!modalId)return;state.visited.has(modalId)?state.visited.delete(modalId):state.visited.add(modalId);updateVisited();});
  document.addEventListener('click',event=>{
    const open=event.target.closest('[data-open-place]'); if(open)openPlace(open.dataset.openPlace);
    const select=event.target.closest('[data-select-place]'); if(select)choosePlace(select.dataset.selectPlace);
    const visit=event.target.closest('[data-visit]'); if(visit){const id=visit.dataset.visit;state.visited.has(id)?state.visited.delete(id):state.visited.add(id);updateVisited();}
  });
  renderGallery();
  map=window.initNightMap({container:$('atlas-map'),data:window.NIGHT_MAP,places,onSelect:choosePlace});
  setExtra(state.extra); selectPlace('sonya');
  $('map-zoom-in').addEventListener('click',()=>map.zoomBy(1.3));
  $('map-zoom-out').addEventListener('click',()=>map.zoomBy(1/1.3));
  $('map-reset').addEventListener('click',()=>map.reset());
  ['map-sumbur','plan-sumbur'].forEach(id=>$(id).addEventListener('change',event=>setExtra(event.target.checked)));
  ['frans','cider','sumbur'].forEach(id=>$('stay-'+id).addEventListener('input',event=>{state[id]=Number(event.target.value);renderPlan();}));
  $('start-time').addEventListener('change',event=>{if(!event.target.checkValidity()){event.target.reportValidity();return;}state.start=event.target.value;renderStops();renderPlan();});
  $('reset-plan').addEventListener('click',()=>{Object.assign(state,{start:'21:00',frans:45,cider:45,sumbur:15});setExtra(false);toast('Исходный темп восстановлен');});
  $('reset-visited').addEventListener('click',()=>{state.visited.clear();updateVisited();toast('Отметки посещений сброшены');});
  $('share-plan').addEventListener('click',async()=>{
    const url=new URL(location.href);url.hash='route';url.search='';
    ['start','frans','cider','sumbur'].forEach(k=>url.searchParams.set(k,state[k]));if(state.extra)url.searchParams.set('extra','1');
    if(await copy(url.href)){$('route-status').textContent='Ссылка на ваш план скопирована.';toast('Ссылка на план скопирована');}
    else {$('route-status').innerHTML='Скопируйте <a href="'+esc(url.href)+'">ссылку на ваш план</a> через меню браузера.';}
  });
  $('download-plan').addEventListener('click',()=>{
    const rows=renderPlan();
    const text='ПОСЛЕ ДЕВЯТИ\n31 октября 2026 · Петербург\n\n'+rows.map(r=>clock(r.arrive)+' — '+byId[r.id].name+', '+byId[r.id].address+(r.stay?' · остановка '+minText(r.stay):'')+'\n'+byId[r.id].map).join('\n\n')+'\n\nВремя приблизительное. VNVNC открыт с 23:00. Уточните условия входа и бронирование у заведений.';
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='posle-devyati-plan.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('План подготовлен к сохранению');
  });
  $('contact-links').innerHTML=['frans','cider','sumbur','vnvnc'].map(id=>{const p=byId[id];return '<a href="'+p.contact+'" target="_blank" rel="noopener">'+icon(p.contact.startsWith('tel:')?'phone':'arrow',p.contact.startsWith('tel:')?'':'cta-arrow')+'<span>'+esc(p.name)+' · '+esc(p.contactLabel)+'</span></a>';}).join('');
  $('credits-list').innerHTML=places.map(p=>'<div class="credit-row"><strong>'+esc(p.name)+'</strong><a href="'+p.photos[0].source_url+'" target="_blank" rel="noopener">Фотографии и страница места</a></div>').join('');
  $('open-credits').addEventListener('click',()=>{$('credits-dialog').showModal();document.body.classList.add('modal-open');});
  $('close-credits').addEventListener('click',()=>closeDialog($('credits-dialog')));
  const form=$('booking-form');
  ['name','phone','time'].forEach(id=>{$('booking-'+id).setAttribute('aria-describedby','booking-'+id+'-error');$('booking-'+id).addEventListener('input',()=>{$('booking-'+id).removeAttribute('aria-invalid');$('booking-'+id+'-error').textContent='';});});
  form.addEventListener('submit',event=>{
    event.preventDefault();const name=$('booking-name').value.trim(),phone=$('booking-phone').value.trim(),time=$('booking-time').value,digits=phone.replace(/\D/g,'');
    const errors={name:(name.match(/[a-zа-яё]/gi)||[]).length<2?'Введите имя — хотя бы две буквы.':'',phone:!(/^[78]\d{10}$/.test(digits)||/^9\d{9}$/.test(digits))?'Введите российский номер из 10 или 11 цифр.':'',time:!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||time<($('booking-place').value==='vnvnc'?'23:00':'21:00')?'Укажите время от '+($('booking-place').value==='vnvnc'?'23:00':'21:00')+'.':''};
    let first=null;Object.entries(errors).forEach(([id,msg])=>{$('booking-'+id+'-error').textContent=msg;if(msg){$('booking-'+id).setAttribute('aria-invalid','true');first=first||$('booking-'+id);}else $('booking-'+id).removeAttribute('aria-invalid');});
    if(first){first.focus();return;}
    const p=byId[$('booking-place').value];
    $('booking-draft').value='Здравствуйте! Можно ли забронировать стол в «'+p.name+'» на 31 октября 2026, '+time+', на '+$('booking-guests').value+' человек? Будем в костюмах. Подскажите, пожалуйста, условия входа и участия в программе.\n\nИмя: '+name+'\nТелефон для ответа: '+phone;
    $('booking-contact').href=p.contact;$('booking-contact').innerHTML=esc(p.contactLabel)+arrow();
    form.hidden=true;$('booking-result').hidden=false;$('booking-name').value='';$('booking-phone').value='';$('booking-draft').focus();
  });
  $('booking-place').addEventListener('change',()=>{const min=$('booking-place').value==='vnvnc'?'23:00':'21:00';$('booking-time').min=min;if($('booking-time').value<min)$('booking-time').value=min;});
  form.querySelector('button[type="submit"]').disabled=false;
  $('copy-booking').addEventListener('click',async()=>{const ok=await copy($('booking-draft').value,$('booking-draft'));$('booking-copy-status').textContent=ok?'Текст скопирован. Передайте его заведению самостоятельно.':'Текст выделен — скопируйте его через меню браузера.';});
  $('booking-again').addEventListener('click',()=>{form.reset();$('booking-time').min='21:00';$('booking-draft').value='';$('booking-copy-status').textContent='';$('booking-result').hidden=true;form.hidden=false;$('booking-name').focus();});
  const menu=document.querySelector('.menu-toggle');
  function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');$('mobile-nav').hidden=true;}
  menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');$('mobile-nav').hidden=!open;});
  document.querySelector('.site-header').addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
  window.initNightGame('#night-game');
  // Pointer light moves decoration only. Links, form fields and map targets stay still.
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
  document.querySelectorAll('[data-scene]').forEach(scene=>{
    let frame=0,x=0,y=0;
    scene.addEventListener('pointermove',event=>{if(motion.matches||!fine.matches)return;const r=scene.getBoundingClientRect();x=(event.clientX-r.left)/r.width;y=(event.clientY-r.top)/r.height;if(frame)return;frame=requestAnimationFrame(()=>{scene.style.setProperty('--pointer-x',(x-.5)*2);scene.style.setProperty('--pointer-y',(y-.5)*2);scene.style.setProperty('--light-x',x*100+'%');scene.style.setProperty('--light-y',y*100+'%');scene.classList.add('is-pointer-active');frame=0;});});
    scene.addEventListener('pointerleave',()=>{cancelAnimationFrame(frame);frame=0;scene.classList.remove('is-pointer-active');scene.style.setProperty('--pointer-x','0');scene.style.setProperty('--pointer-y','0');});
  });
  let scrollFrame=0;
  function progress(){scrollFrame=0;const total=document.documentElement.scrollHeight-innerHeight;document.querySelector('.page-progress').style.transform='scaleX('+(total>0?scrollY/total:0)+')';}
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(progress);},{passive:true});progress();
  if(window.gsap&&window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);const mm=gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.to('.hero-photo-scroll',{yPercent:12,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
      document.querySelectorAll('.photo-scroll').forEach(photo=>gsap.fromTo(photo,{yPercent:-6},{yPercent:6,ease:'none',scrollTrigger:{trigger:photo.closest('.place-tile'),start:'top bottom',end:'bottom top',scrub:.7}}));
      document.querySelectorAll('.section-heading h2,.planner-intro h2,.contact-intro h2').forEach(el=>gsap.from(el,{y:38,duration:.9,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 93%',once:true}}));
      gsap.to('.planner-orbit svg',{rotation:85,ease:'none',scrollTrigger:{trigger:'#plan',start:'top bottom',end:'bottom top',scrub:1}});
      gsap.fromTo('.moon-disc',{rotation:-15},{rotation:22,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
    });
  }
})();
