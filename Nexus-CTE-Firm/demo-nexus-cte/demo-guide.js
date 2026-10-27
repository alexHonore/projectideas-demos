/* Shared, dependency-free walkthrough. Copies live beside each demo. */
(function (global) {
  'use strict';
  let config, progress, host, active = false, busy = false, generation = 0;
  let inviteTimer, frame, focusBefore, observer, placedStep = -1;
  const words = {
    en: {tour:'Guided tutorial',invite:'Get to know your workspace',intro:'A short tour of the screens and the decisions you can try. Your records stay unchanged.',start:'Take the tour',resume:'Resume tutorial',later:'Maybe later',next:'Next',back:'Back',finish:'Finish tutorial',pause:'Pause tutorial',restart:'Start again',step:'Step',of:'of',done:'You’re ready to explore.',doneBody:'The tour is complete. Try the workflows at your own pace, and replay the tutorial whenever you need it.',close:'Explore the demo',found:'Try the highlighted control, or continue the tour.',missing:'This step is still useful without a highlight. Continue, or return to the screen with the tutorial button.',success:'Action completed',try:'You can try this step before continuing.',loading:'Opening the next screen…',error:'This screen could not open automatically. You can continue to the next step.'},
    fr: {tour:'Visite guidée',invite:'Découvrez votre espace de travail',intro:'Un parcours court pour découvrir les écrans et les décisions à essayer. Vos dossiers restent inchangés.',start:'Commencer la visite',resume:'Reprendre la visite',later:'Plus tard',next:'Suivant',back:'Retour',finish:'Terminer la visite',pause:'Mettre en pause',restart:'Recommencer',step:'Étape',of:'sur',done:'À vous d’explorer.',doneBody:'La visite est terminée. Essayez les parcours à votre rythme et relancez le tutoriel quand vous le souhaitez.',close:'Explorer la démo',found:'Essayez le contrôle surligné, ou poursuivez la visite.',missing:'Vous pouvez poursuivre sans surlignage, ou revenir à l’écran depuis le bouton de visite guidée.',success:'Action effectuée',try:'Vous pouvez essayer cette étape avant de continuer.',loading:'Ouverture de l’écran…',error:'Cet écran ne s’est pas ouvert automatiquement. Vous pouvez poursuivre la visite.'}
  };
  const text = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const w = () => words[config?.lang] || words.en;
  const key = () => 'project-demo-guide:' + config.id + ':v1';
  function read() {
    let saved;
    try { saved = JSON.parse(global.localStorage.getItem(key()) || 'null'); } catch {}
    return {index: Math.max(0,Math.min(config.steps.length-1,Number.isInteger(saved?.index)?saved.index:0)),started:Boolean(saved?.started),complete:Boolean(saved?.complete),dismissed:Boolean(saved?.dismissed)};
  }
  function persist() { try { global.localStorage.setItem(key(),JSON.stringify(progress)); } catch {} }
  function mount() {
    if (!host) {
      host = document.createElement('div');
      host.id = 'demo-guide-layer';
      host.className = 'dg-layer';
      host.setAttribute('popover','manual');
      host.addEventListener('click', event => {
        const button = event.target.closest('[data-dg]');
        if (!button) return;
        event.preventDefault(); event.stopPropagation();
        const command=button.getAttribute('data-dg');
        if(command==='next') next();
        if(command==='back') previous();
        if(command==='start') start();
        if(command==='restart') start({restart:true});
        if(command==='pause'||command==='dismiss'||command==='close') pause();
      });
    }
    // A modal makes nodes outside its subtree inert, even when a popover is
    // visually above it. Keep the tutorial inside the current dialog subtree.
    // Reparent back to body after that dialog closes (also needed by fallback).
    const dialog=[...document.querySelectorAll('dialog[open]')].filter(d=>!host.contains(d)).at(-1);
    const parent=dialog || document.body;
    if (host.parentElement!==parent) parent.appendChild(host);
    host.lang=config.lang||'en';
    host.dataset.theme=config.theme||'light';
    host.style.setProperty('--dg-accent',config.accent||'#6552b5');
    host.style.setProperty('--dg-on-accent',config.onAccent||'#ffffff');
    host.hidden=false;
    if(typeof host.showPopover==='function') {
      try { if(!host.matches(':popover-open')) host.showPopover(); } catch {}
    } else {
      host.removeAttribute('popover');
    }
    return host;
  }
  function conceal() {
    if(!host) return;
    if(typeof host.hidePopover==='function') { try { host.hidePopover(); } catch {} }
    host.hidden=true;
    host.innerHTML='';
  }
  function button(command,label,primary=false) { return `<button type="button" class="dg-button${primary?' dg-primary':''}" data-dg="${command}">${text(label)}</button>`; }
  function invite() {
    if(!config || active || progress.dismissed || progress.complete || document.querySelector('dialog[open]')) return;
    mount().innerHTML=`<section class="dg-invite" role="region" aria-label="${text(w().tour)}"><span class="dg-kicker">${text(config.title)}</span><h2>${text(w().invite)}</h2><p>${text(w().intro)}</p><div class="dg-invite-actions">${button('start',progress.started?w().resume:w().start,true)}${button('dismiss',w().later)}</div></section>`;
  }
  function target() {
    const step=config.steps[progress.index];
    try {
      const candidates=typeof step.target==='function'?[step.target()]:[...document.querySelectorAll(step.target||'#main')];
      return candidates.find(el=>el?.isConnected && el.getBoundingClientRect().width>0 && el.getBoundingClientRect().height>0) || null;
    } catch { return null; }
  }
  function position() {
    frame=null;
    if(!active || !host || !config) return;
    mount();
    const card=host.querySelector('.dg-card');
    if(!card) return;
    const width=global.innerWidth, height=global.innerHeight;
    const highlight=host.querySelector('.dg-focus');
    const shade=host.querySelector('.dg-shade');
    if(!highlight || !shade) {
      Object.assign(card.style,{left:Math.max(12,width-Math.min(368,width-24)-22)+"px",top:Math.max(12,height-140)+"px",width:Math.min(368,width-24)+"px"});
      return;
    }
    const el=target();
    let r=el?.getBoundingClientRect();
    if(r && placedStep!==progress.index && (r.bottom>height-85||r.top<75)) {
      placedStep=progress.index;
      el.scrollIntoView?.({behavior:'auto',block:'center',inline:'nearest'});
      r=el.getBoundingClientRect();
    }
    placedStep=progress.index;
    const visible=r && r.bottom>0 && r.top<height && r.right>0 && r.left<width;
    if(visible) {
      const left=Math.max(6,r.left-5),top=Math.max(6,r.top-5),right=Math.min(width-6,r.right+5),bottom=Math.min(height-6,r.bottom+5);
      Object.assign(highlight.style,{left:left+'px',top:top+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px',display:'block'});
      shade.style.display='none';
    } else { highlight.style.display='none'; shade.style.display='block'; }
    const cw=Math.min(368,width-24),ch=card.getBoundingClientRect().height||300;
    let x=width-cw-22,y=height-ch-24;
    if(width<640) {x=12;y=height-ch-20; if(visible && r.top>ch+100) y=75;}
    else if(visible) {
      if(width-r.right>cw+36) {x=r.right+18;y=r.top;}
      else if(r.left>cw+36) {x=r.left-cw-18;y=r.top;}
      else if(height-r.bottom>ch+30) {x=r.left;y=r.bottom+16;}
      else if(r.top>ch+30) {x=r.left;y=r.top-ch-16;}
      else {x=width-cw-22;y=height-ch-24;}
    }
    Object.assign(card.style,{left:Math.max(12,Math.min(width-cw-12,x))+'px',top:Math.max(12,Math.min(height-ch-12,y))+'px',width:cw+'px'});
    const hint=host.querySelector('.dg-hint');
    let successful=false;
    try {successful=Boolean(config.steps[progress.index].completeWhen?.());}catch{}
    const msg=config.steps[progress.index].completeWhen?(successful?w().success:w().try):(visible?w().found:w().missing);
    if(hint && hint.textContent!==msg) hint.textContent=msg;
    if(hint) hint.classList.toggle('dg-success',successful);
  }
  function schedule() {if(active&&!frame) frame=global.requestAnimationFrame(position);}
  async function showStep() {
    const token=++generation,step=config.steps[progress.index];
    busy=true;placedStep=-1;
    mount().innerHTML=`<section class="dg-card dg-loading" role="status">${text(w().loading)}</section>`;
    position();
    let failed=false;
    try {await step.enter?.();}catch{failed=true;}
    if(token!==generation||!active) return;
    busy=false;placedStep=-1;
    mount();
    // Re-show above any native dialog the step opened, without closing that dialog.
    if(typeof host.hidePopover==='function'&&typeof host.showPopover==='function') {try{host.hidePopover();host.showPopover();}catch{}}
    host.innerHTML=`<div class="dg-shade"></div><div class="dg-focus" aria-hidden="true"></div><section class="dg-card" role="dialog" aria-modal="false" aria-labelledby="dg-title" aria-describedby="dg-body" tabindex="-1"><div class="dg-card-top"><span class="dg-kicker">${text(config.title)}</span><button type="button" class="dg-close" data-dg="pause" aria-label="${text(w().pause)}">×</button></div><div class="dg-step" aria-live="polite">${text(w().step)} ${progress.index+1} ${text(w().of)} ${config.steps.length}</div><div class="dg-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${config.steps.length}" aria-valuenow="${progress.index+1}" aria-label="${text(w().tour)}"><span style="width:${(progress.index+1)/config.steps.length*100}%"></span></div><h2 id="dg-title">${text(step.title)}</h2><p id="dg-body">${text(step.body)}</p>${failed?`<p class="dg-error">${text(w().error)}</p>`:''}<p class="dg-hint"></p><div class="dg-controls">${progress.index?button('back',w().back):button('pause',w().pause)}${button('next',progress.index===config.steps.length-1?w().finish:w().next,true)}</div>${progress.index?`<button type="button" class="dg-restart" data-dg="restart">${text(w().restart)}</button>`:''}</section>`;
    position();
    host.querySelector('.dg-card')?.focus({preventScroll:true});
    schedule();
  }
  async function start(options={}) {
    if(!config) return;
    clearTimeout(inviteTimer);
    focusBefore=document.activeElement;
    if(options.restart||progress.complete) progress.index=0;
    progress.started=true;progress.complete=false;progress.dismissed=true;
    active=true;persist();
    await showStep();
  }
  function finish() {
    generation++;busy=false;active=false;
    progress.complete=true;progress.dismissed=true;persist();
    mount().innerHTML=`<section class="dg-invite dg-complete" role="dialog" aria-labelledby="dg-done" tabindex="-1"><span class="dg-kicker">${text(config.title)}</span><div class="dg-done-icon" aria-hidden="true">✓</div><h2 id="dg-done">${text(w().done)}</h2><p>${text(w().doneBody)}</p><div class="dg-invite-actions">${button('close',w().close,true)}${button('restart',w().restart)}</div></section>`;
    host.querySelector('.dg-complete')?.focus();
  }
  async function next() {if(!active||busy)return;if(progress.index===config.steps.length-1){finish();return;}progress.index++;persist();await showStep();}
  async function previous() {if(!active||busy||progress.index===0)return;progress.index--;persist();await showStep();}
  function pause() {
    generation++;active=false;busy=false;clearTimeout(inviteTimer);
    if(progress){progress.dismissed=true;persist();}
    conceal();
    const returnTarget=focusBefore?.isConnected?focusBefore:document.querySelector('[data-guide-open]');
    returnTarget?.focus?.({preventScroll:true});
  }
  function setup(options) {
    if(!options?.id||!Array.isArray(options.steps)||!options.steps.length)throw new Error('A tutorial needs an id and at least one step.');
    if(config)pause();
    config=options;progress=read();
    clearTimeout(inviteTimer);
    inviteTimer=setTimeout(invite,900);
    if(!observer && typeof MutationObserver!=='undefined') {
      observer=new MutationObserver(records=>{if(records.some(r=>!host?.contains(r.target)))schedule();});
      observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
    }
    return getState();
  }
  function getState() {return config?{id:config.id,...progress,active,busy,total:config.steps.length}:null;}
  document.addEventListener('click',event=>{
    const launcher=event.target.closest?.('[data-guide-open]');
    if(!launcher)return;
    event.preventDefault();event.stopPropagation();
    start({restart:launcher.getAttribute('data-guide-open')==='restart'});
  },true);
  document.addEventListener('keydown',event=>{
    if(!host || host.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();pause();return;}
    if(active && host.contains(document.activeElement) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')){
      if(event.key==='ArrowRight'){event.preventDefault();next();}
      if(event.key==='ArrowLeft'){event.preventDefault();previous();}
    }
  },true);
  global.addEventListener('resize',schedule);
  global.addEventListener('scroll',schedule,true);
  global.DemoGuide=Object.freeze({setup,start,next,previous,pause,getState});
})(window);
