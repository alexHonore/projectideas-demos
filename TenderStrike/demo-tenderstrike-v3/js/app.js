/* Application : coquille, routeur par hash, délégation d’événements. Tous les gestionnaires reçoivent
   l’identifiant du dossier (data-t) : aucun écran n’est propre à un dossier. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S, A = TS.A, UI = TS.UI, V = TS.V, X = TS.X;
  const esc = U.esc, ic = U.icon;
  const App = (TS.App = {});

  /* ---------- Routeur ---------- */
  const TABS = UI.TABS.map((t) => t[0]);
  const SIMPLE = ['radar', 'coffre', 'journal', 'calendrier', 'notifications', 'nouveau'];
  App.parse = () => {
    const raw = (location.hash || '#/brief').replace(/^#/, '');
    const [path, anchor] = raw.split('#');
    const parts = path.split('/').filter(Boolean);
    if (SIMPLE.includes(parts[0])) return { name: parts[0], anchor };
    if (parts[0] === 'dossier') {
      const id = parts[1] && S.exists(parts[1]) ? parts[1] : null;
      if (!id) return { name: 'missing', id: parts[1] };
      return { name: 'dossier', id, tab: TABS.includes(parts[2]) ? parts[2] : 'radiographie', anchor };
    }
    return { name: 'brief', anchor };
  };
  const routeKey = (r) => r.name + '/' + (r.id || '') + '/' + (r.tab || '');
  const TITLES = { brief: 'Brief du matin', radar: 'Radar', coffre: 'Coffre-fort', journal: 'Journal', calendrier: 'Calendrier', notifications: 'Notifications', nouveau: 'Ajouter un appel d’offres' };

  /* Cinq destinations principales; le reste sous « Plus ». L’outillage de démo est regroupé dans le menu Démo. */
  const nav = () => {
    const did = UI.view.lastDossier && S.exists(UI.view.lastDossier) ? UI.view.lastDossier : S.featured();
    return [
      ['brief', '#/brief', 'sun', 'Brief'],
      ['radar', '#/radar', 'radar', 'Radar'],
      ['dossier', '#/dossier/' + did + '/radiographie', 'folder', 'Dossier'],
      ['calendrier', '#/calendrier', 'cal', 'Agenda'],
      ['coffre', '#/coffre', 'vault', 'Coffre']
    ];
  };
  const menu = (cls, summary, label, body) => `<details class="menu ${cls}"><summary aria-label="${esc(label)}" title="${esc(label)}">${summary}</summary><div class="menu-p" role="group" aria-label="${esc(label)}">${body}</div></details>`;

  const shell = (r, inner) => {
    const p = S.person();
    const vaultAlert = S.state.vault.filter((v) => !v.removed && ['expired', 'suspended'].includes(S.vaultStatus(v).k)).length;
    const unread = S.unread();
    const lateN = S.allDeadlines().filter((x) => !x.done && Date.parse(x.at) < S.nowTs() && x.tender && S.isOpen(x.tender)).length;
    const N = nav();
    const dot = (k) => ((k === 'coffre' && vaultAlert) || (k === 'calendrier' && lateN) ? `<i class="nav-dot" aria-label="${k === 'coffre' ? vaultAlert + ' pièce(s) à renouveler' : lateN + ' échéance(s) en retard'}"></i>` : '');
    const ai = TS.AI.status();
    const demo = menu('demo-m', `${ic('flask', 18)}<span class="demo-tag">Démo</span><i class="ai-dot is-${ai.state}" aria-hidden="true"></i>`, 'Menu démo · données fictives',
      `<p class="menu-note">${ic('info', 14)}<span>Démo · données fictives</span></p>
       <p class="menu-note">${ic('clock', 14)}<span title="Horloge de démo (heure de Montréal)">${esc(U.day(S.now()))}, ${U.time(S.now())}</span></p>
       <button type="button" class="menu-i" data-act="tour-start">${ic('play', 16)}<span>Visite guidée</span></button>
       <button type="button" class="menu-i" data-act="lab" aria-expanded="${!!UI.view.lab}">${ic('flask', 16)}<span>Labo de test</span></button>
       ${TS.AI.link('menu-i')}
       <button type="button" class="menu-i" data-act="reset">${ic('reset', 16)}<span>Réinitialiser</span></button>
       <a class="menu-i" href="../../index.html">${ic('back', 16)}<span>Toutes les démos</span></a>`);
    const more = menu('more-m', ic('menu', 18), 'Plus',
      `<a class="menu-i" href="#/journal">${ic('log', 16)}<span>Journal</span></a>
       <a class="menu-i" href="#/notifications">${ic('bell', 16)}<span>Notifications</span>${unread ? `<b class="menu-n">${unread}</b>` : ''}</a>
       <a class="menu-i" href="#/nouveau">${ic('plus', 16)}<span>Ajouter un appel d’offres</span></a>`);
    const persona = menu('persona', `${UI.avatar(p.id)}${ic('down', 14)}`, 'Rôle actif : ' + p.name + ', ' + p.short + '. Changer de rôle',
      `<p class="menu-note">${ic('user', 14)}<span>Rôle actif</span></p>${Object.values(D.people).map((x) => `<button type="button" aria-pressed="${x.id === p.id}" class="pm${x.id === p.id ? ' is-on' : ''}" data-act="persona" data-id="${x.id}" title="${esc(x.role)}">${UI.avatar(x.id)}<span><b>${esc(x.name)}</b><small>${esc(x.short)}</small></span></button>`).join('')}`);
    return `<header class="topbar">
        <a class="brand" href="#/brief" aria-label="TenderStrike QC, accueil" title="TenderStrike QC">${UI.mark(30)}<span class="brand-n">TenderStrike</span></a>
        <nav class="mainnav" aria-label="Navigation principale">
          ${N.map(([k, href, icon, label]) => `<a href="${href}" class="mn${r.name === k ? ' is-on' : ''}"${r.name === k ? ' aria-current="page"' : ''} title="${esc(k === 'dossier' ? S.def(href.split('/')[2]).buyerShort : label)}">${ic(icon, 17)}<span>${esc(label)}</span>${dot(k)}</a>`).join('')}
        </nav>
        <div class="top-r">
          <button type="button" class="tb-i" data-act="search" aria-label="Rechercher (Ctrl K)" title="Rechercher (Ctrl K)">${ic('search', 18)}</button>
          <a class="tb-i bell${r.name === 'notifications' ? ' is-on' : ''}" href="#/notifications" aria-label="Notifications${unread ? ', ' + unread + ' non lue' + (unread > 1 ? 's' : '') : ''}" title="Notifications">${ic('bell', 18)}${unread ? `<span class="bell-n">${unread > 9 ? '9+' : unread}</span>` : ''}</a>
          ${more}${demo}${persona}
        </div>
      </header>
      <main id="main" class="main main-${r.name}" tabindex="-1">${inner}</main>
      <footer class="foot"><p>${ic('info', 13)} TenderStrike QC · démo V3 · données fictives${S.storageOk ? '' : ' · stockage local indisponible'}</p></footer>
      <nav class="bottomnav" aria-label="Navigation principale mobile">
        ${N.map(([k, href, icon, label]) => `<a href="${href}" class="bn${r.name === k ? ' is-on' : ''}"${r.name === k ? ' aria-current="page"' : ''} title="${esc(label)}">${ic(icon, 22)}<span class="bn-l">${esc(label)}</span>${dot(k)}</a>`).join('')}
      </nav>
      ${UI.view.lab ? TS.Lab.html() : ''}`;
  };

  let lastRoute = '';
  App.render = (opts) => {
    const o = opts || {};
    const r = App.parse();
    if (r.name === 'missing') { UI.toast('Ce dossier n’existe plus (supprimé ou importé ailleurs) : retour au radar.', 'warn'); location.replace('#/radar'); return; }
    const key = routeKey(r);
    const same = key === lastRoute;
    const scrollY = window.scrollY;
    const act = document.activeElement;
    const focusId = act && act.id ? act.id : null;
    const focusSel = act && !act.id && act.dataset && act.dataset.act ? `[data-act="${act.dataset.act}"]${act.dataset.t ? `[data-t="${act.dataset.t}"]` : ''}${act.dataset.id ? `[data-id="${act.dataset.id}"]` : ''}${act.dataset.step ? `[data-step="${act.dataset.step}"]` : ''}${act.dataset.k ? `[data-k="${act.dataset.k}"]` : ''}` : null;
    const vs = U.$('.wb-side .viewer-scroll');
    const viewerTop = vs ? vs.scrollTop : 0;
    const labScroll = U.$('.lab-b') ? U.$('.lab-b').scrollTop : 0;
    if (r.name === 'dossier') {
      UI.view.lastDossier = r.id;
      if (r.tab === 'radiographie' && !S.D(r.id).xrayOpened && !S.needsAcquisition(r.id)) A.openXray(r.id);
      if (['conformite', 'radiographie'].includes(r.tab) && !same && !UI.viewer(r.id).clause) {
        const first = S.compliance(r.id).find((c) => S.HARD.includes(c.status) && c.req) || S.compliance(r.id).find((c) => c.req && c.status !== 'verified');
        const req = first ? S.reqById(r.id, first.req) : null;
        if (req) Object.assign(UI.viewer(r.id), { doc: req.doc, page: req.page, clause: req.clause });
      }
    }
    let inner;
    if (r.name === 'dossier') inner = V[r.tab](r.id);
    else if (r.name === 'radar') inner = V.radar();
    else if (r.name === 'coffre') inner = V.coffre();
    else if (r.name === 'journal') inner = V.journal();
    else if (r.name === 'calendrier') inner = V.calendrier();
    else if (r.name === 'notifications') inner = V.notifications();
    else if (r.name === 'nouveau') inner = V.nouveau();
    else inner = V.brief();
    const app = U.$('#app');
    App.closeTip();
    app.innerHTML = shell(r, inner);
    U.typo(app);
    if (UI.view.lab) { const lb = U.$('.lab-b'); if (lb && same) lb.scrollTop = labScroll; }
    document.title = (r.name === 'dossier' ? S.def(r.id).buyerShort + ' · ' + UI.TABS.find((t) => t[0] === r.tab)[1] : TITLES[r.name]) + ' · TenderStrike QC';
    if (same && !o.top) {
      window.scrollTo(0, scrollY);
      const nvs = U.$('.wb-side .viewer-scroll');
      if (nvs) nvs.scrollTop = viewerTop;
      if (focusId && document.getElementById(focusId)) document.getElementById(focusId).focus({ preventScroll: true });
      else if (focusSel) { const el = U.$(focusSel); if (el) el.focus({ preventScroll: true }); }
    } else {
      window.scrollTo(0, 0);
      if (lastRoute && !UI.view.lab) { const m = U.$('#main'); if (m) m.focus({ preventScroll: true }); }
    }
    const ft = U.$('.ftabs'), fa = U.$('.ftab.is-on');
    if (ft && fa && ft.scrollWidth > ft.clientWidth) ft.scrollLeft = Math.max(0, fa.offsetLeft - ft.offsetLeft - 24);
    if (UI.view.scrollPending) { const sid = UI.view.scrollPending; UI.view.scrollPending = false; UI.scrollViewer(typeof sid === 'string' ? sid : r.id, true); }
    const anchor = UI.view.pendingAnchor || (!same && r.anchor);
    if (anchor) { UI.view.pendingAnchor = null; const el = document.getElementById(anchor); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 1600); } }
    lastRoute = key;
    if (r.name === 'brief' && !UI.view.swept) setTimeout(() => { UI.view.swept = true; }, 50);
    if (TS.Tour) TS.Tour.refresh();
  };
  App.go = (hash) => { if (location.hash === hash) App.render({ top: true }); else location.hash = hash; };

  /* ---------- Utilitaires d’action ---------- */
  const after = (r) => { UI.result(r); App.render(); return r; };
  const tid = (el) => el.dataset.t || (App.parse().id) || S.featured();
  const sampleArq = () => TS.Flow.sampleFile('arq', 'ARQ_Gaudreau');
  App.sampleArq = sampleArq;

  App.openCite = (el, inTour) => {
    const id = el.dataset.t || App.parse().id;
    const clause = el.dataset.clause, doc = el.dataset.doc, page = Number(el.dataset.page);
    if (!S.docs(id)[doc]) return UI.toast('Ce document n’est pas encore publié pour ce dossier.', 'warn');
    Object.assign(UI.viewer(id), { doc, page, clause });
    const origin = el.closest && el.closest('[data-req]') ? `[data-req="${el.closest('[data-req]').dataset.req}"] .req-open` : null;
    UI.dialog(`${UI.viewerHtml(id, { dialog: true })}`, {
      title: esc(S.docs(id)[doc].label) + ' · p. ' + page, cls: 'dlg-viewer dlg-sheet', returnFocus: origin ? U.$(origin) : el, modeless: inTour,
      after: () => UI.scrollViewer(id, false)
    });
  };

  App.addendaDialog = (id, res) => {
    const a = res.addendum, def = S.def(id);
    const rows = (a.changes || []).map((c) => {
      if (c.type === 'qty') { const art = def.articles.find((x) => x.code === c.code); const before = res.before.lines.find((l) => l.a.code === c.code); return `<tr><td>Article ${art.n} · ${esc(art.label.toLowerCase())}</td><td class="num">${before ? U.num(before.qty, art.decimals) : '—'} ${esc(art.unit)}</td><td class="num">${U.num(c.to, art.decimals)} ${esc(art.unit)}</td></tr>`; }
      if (c.type === 'close') return `<tr><td>Clôture</td><td class="num">${esc(U.dayTime(def.close))}</td><td class="num">${esc(U.dayTime(c.to))}</td></tr>`;
      return '';
    }).join('');
    UI.dialog(`<p class="dlg-lead">${ic('alert', 18)}<span>Le contrôle final a trouvé l’${esc(a.label.toLowerCase())}, publié ${esc(U.time(a.publishedAt))} sur SEAO (simulation). L’export est suspendu jusqu’à une nouvelle revue.</span></p>
      <table class="diff"><thead><tr><th scope="col">Élément</th><th scope="col" class="num">Avant</th><th scope="col" class="num">Après</th></tr></thead><tbody>${rows}
        <tr><td>Total avant taxes</td><td class="num">${U.cents(res.before.htC, 0)}</td><td class="num">${U.cents(res.after.htC, 0)}</td></tr>
        ${S.hasBond(id) ? `<tr><td>Garantie requise (${S.bondLabel(id)})</td><td class="num">${U.cents(res.before.bondC, 0)}</td><td class="num">${U.cents(res.after.bondC, 0)}</td></tr>` : ''}
      </tbody></table>
      <ul class="cons">
        ${res.hadPrice ? `<li>${UI.status('pending', 'Périmée')} Approbation du prix : elle portait sur l’ancien bordereau.</li>` : ''}
        ${res.hadPkg ? `<li>${UI.status('pending', 'Périmée')} Approbation du paquet : nouvelle empreinte à approuver.</li>` : ''}
        <li>${UI.status('missing')} Accusé de réception de l’${esc(a.label.toLowerCase())} à signer, et ses champs à revoir.</li>
        <li>${UI.status('verified', 'Conservé')} Vos prix unitaires : seul le total change, car la quantité change.</li>
      </ul>
      <div class="dlg-actions"><a class="btn btn-ghost" href="#/dossier/${id}/prix" data-act="dlg-close-nav">${ic('chart', 16)}<span>Voir le bordereau</span></a><button type="button" class="btn btn-primary" data-act="dlg-close">${ic('check', 16)}<span>Revoir les cartes</span></button></div>`, { title: esc(a.label) + ' détecté : export suspendu', cls: 'dlg-alert' });
  };

  const mfName = (id, e, ext) => 'Manifeste_' + S.def(id).ref + (e.kind === 'draft' ? '_BROUILLON' : '_v' + e.rev) + '_DEMO.' + ext;
  App.doExport = (id, opts) => {
    const o = opts || {};
    const rm = U.reducedMotion() || o.instant;
    let i = 0;
    const finish = () => {
      UI.view.checking = null;
      const res = A.preExportCheck(id);
      if (res.offline) { App.render(); UI.toast('SEAO injoignable : export suspendu. Vérifiez l’avis sur SEAO, puis notez la vérification manuelle.', 'warn'); return res; }
      if (res.addenda) { App.render(); if (!o.quiet) App.addendaDialog(id, res); else UI.toast(res.addendum.label + ' détecté : approbations périmées, export suspendu.', 'warn'); return res; }
      if (!res.ok) { App.render(); UI.toast('Export suspendu : ' + (res.blockers || []).length + ' point(s) à régler.', 'warn'); return res; }
      const entry = A.recordExport(id, 'approved');
      App.render();
      if (!o.noDownload) U.download(mfName(id, entry, 'html'), 'text/html', V.manifest(id, entry).html);
      UI.toast('Paquet exporté' + (o.noDownload ? '' : ' et manifeste téléchargé') + '. Il reste à déposer sur SEAO et à enregistrer le reçu.');
      return res;
    };
    if (rm) return finish();
    const step = () => {
      UI.view.checking = { id, i };
      App.render();
      if (i >= 4) return finish();
      i += 1;
      setTimeout(step, 220);
    };
    step();
    return null;
  };
  App.print = (id, entry) => {
    const m = V.manifest(id, entry);
    const root = U.$('#print-root');
    root.innerHTML = `<style>${m.css}</style>${m.body}`;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) { done(); }
    setTimeout(() => { if (document.body.classList.contains('printing')) done(); }, 60000);
  };
  const lastExport = (id) => { const ex = S.D(id).exports; return ex.slice().reverse().find((e) => e.kind === 'approved') || ex[ex.length - 1]; };

  /* ---------- IA en direct : appels avec repli sur les règles ---------- */
  const whyRules = (id, fallback) => { UI.view['why_' + id] = { text: V.whyRules(id), provenance: null, fallback: fallback || '' }; };
  App.whyAI = async (id) => {
    UI.view['why_' + id] = { text: 'Explication en cours par l’IA en direct…', provenance: null, fallback: '' };
    App.render();
    try { const r = await TS.AI.why(id); UI.view['why_' + id] = { text: r.text, provenance: r.provenance, fallback: '' }; }
    catch (e) { whyRules(id, 'IA indisponible : ' + TS.AI.reason(e) + ' Explication par règles.'); UI.toast('IA en direct indisponible : explication par règles.', 'warn'); }
    App.render();
  };
  App.questionAI = async (id) => {
    const rid = (U.$('#q-req') || {}).value || null;
    const ta = U.$('#q-text'), pv = U.$('#q-prov');
    const btn = U.$('[data-act="q-ai"]');
    if (btn) btn.disabled = true;
    if (pv) pv.innerHTML = ic('clock', 13) + ' Rédaction par l’IA en direct…';
    try {
      const r = await TS.AI.question(id, rid);
      if (ta) ta.value = r.text;
      UI.view.qProv = r.provenance;
      if (pv) { pv.innerHTML = UI.prov(r.provenance) + ' Brouillon proposé par l’IA : relisez-le, rien n’est envoyé sans votre clic.'; U.typo(pv); }
    } catch (e) {
      UI.view.qProv = null;
      if (ta && !ta.value.trim()) ta.value = V.questionDraft(id, rid);
      if (pv) { pv.innerHTML = UI.prov(null) + ' <span class="st st-wait">' + ic('alert', 13) + '<span>' + esc('IA indisponible : ' + TS.AI.reason(e) + ' Brouillon par règles conservé.') + '</span></span>'; U.typo(pv); }
    }
    if (btn) btn.disabled = false;
  };
  App.ntAnalyze = async (useAI) => {
    const nt = UI.view.nt;
    const ta = U.$('#nt-text');
    if (ta) nt.text = ta.value;
    if (!nt.text.trim() && !(useAI && nt.pdf)) return UI.toast('Collez d’abord le texte de l’avis, ou déposez un fichier.', 'warn');
    nt.edits = {};
    if (!useAI) { nt.ex = X.rules(nt.text); App.render(); UI.toast(nt.ex.requirements.length + ' exigences extraites par les règles, avec leur citation.'); return; }
    nt.busy = true; App.render();
    try { nt.ex = await TS.AI.xray(nt.text, nt.pdf); UI.toast('Radiographie par l’IA en direct : ' + nt.ex.requirements.length + ' exigences, citations vérifiées.'); }
    catch (e) {
      const why = TS.AI.reason(e);
      if (nt.text.trim()) { nt.ex = X.rules(nt.text); nt.ex.fallback = 'IA indisponible : ' + why + ' Extraction par règles.'; UI.toast('IA en direct indisponible : extraction par règles.', 'warn'); }
      else { nt.ex = null; UI.toast('IA en direct indisponible (' + why + ') et aucun texte extractible : collez le texte de l’avis.', 'warn'); }
    }
    nt.busy = false; App.render();
  };

  /* ---------- Déclaration (dialogue « Lire et signer ») ---------- */
  App.declDialog = (id, el) => UI.dialog(`<div class="decl-b" data-t="${esc(id)}">${V.declBody(id)}</div>`, { title: 'Déclarations obligatoires', cls: 'dlg-decl dlg-wide', returnFocus: el });
  App.declRefresh = (id) => { const b = U.$('.dlg-decl .decl-b'); if (!b) return; const f = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null; b.innerHTML = V.declBody(id); U.typo(b); if (f) { const x = b.querySelector(`[data-k="${f}"]`); if (x) x.focus(); } };

  /* ---------- Bulle ⓘ : une seule à la fois, fermée au clic extérieur, à Échap et au rendu ---------- */
  let tipFor = null;
  App.closeTip = () => { const t = document.getElementById('tip'); if (t) t.remove(); if (tipFor) { tipFor.setAttribute('aria-expanded', 'false'); tipFor = null; } };
  App.toggleTip = (el) => {
    if (tipFor === el) return App.closeTip();
    App.closeTip();
    const t = document.createElement('div');
    t.id = 'tip'; t.className = 'tip'; t.setAttribute('role', 'status');
    t.textContent = U.typoText(el.dataset.tip || el.title || '');
    (el.closest('dialog') || document.body).appendChild(t);
    const host = t.parentElement === document.body ? null : t.parentElement;
    const b = el.getBoundingClientRect(), hb = host ? host.getBoundingClientRect() : { left: 0, top: 0 };
    const sx = host ? host.scrollLeft : window.scrollX, sy = host ? host.scrollTop : window.scrollY;
    const vw = document.documentElement.clientWidth, w = Math.min(320, vw - 32);
    t.style.width = w + 'px';
    const left = Math.max(16, Math.min(b.left + b.width / 2 - w / 2, vw - 16 - w));
    t.style.left = (left - hb.left + sx) + 'px';
    const below = b.bottom + 8, h = t.offsetHeight;
    const top = below + h > window.innerHeight - 8 && b.top - 8 - h > 8 ? b.top - 8 - h : below;
    t.style.top = (top - hb.top + sy) + 'px';
    el.setAttribute('aria-expanded', 'true');
    el.setAttribute('aria-controls', 'tip');
    tipFor = el;
  };

  /* ---------- Fichiers ---------- */
  const b64 = (buf) => { const bytes = new Uint8Array(buf); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const htmlText = (html) => { const doc = new DOMParser().parseFromString(String(html).replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, '$&\n'), 'text/html'); doc.querySelectorAll('script,style,noscript').forEach((n) => n.remove()); return (doc.body ? doc.body.textContent : '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim(); };
  App.ntFile = async (f) => {
    if (!f) return;
    const nt = UI.view.nt, meta = await U.readFile(f);
    nt.file = meta; nt.pdf = null; nt.note = ''; nt.ex = null;
    const name = f.name.toLowerCase();
    try {
      if (/\.pdf$/.test(name) || f.type === 'application/pdf') {
        const buf = await f.arrayBuffer();
        const r = await X.pdfText(buf);
        nt.pdf = f.size <= 20 * 1024 * 1024 ? { base64: b64(buf), pages: r.pages, name: f.name } : { pages: r.pages, name: f.name };
        if (r.text) { nt.text = r.text; nt.note = 'PDF de ' + r.pages + ' page(s) : texte extrait dans votre navigateur. Vérifiez-le, puis lancez l’analyse.'; }
        else nt.note = r.note + (f.size > 20 * 1024 * 1024 ? ' Fichier trop lourd pour l’IA en direct (20 Mo au plus).' : '');
      } else if (/\.html?$/.test(name) || f.type === 'text/html') { nt.text = htmlText(await f.text()); nt.note = 'Page HTML convertie en texte (balises retirées).'; }
      else { nt.text = await f.text(); nt.note = 'Fichier texte lu dans votre navigateur.'; }
    } catch (e) { nt.note = 'Lecture impossible : ' + (e.message || e) + '.'; }
    App.render();
  };
  App.fixFile = async (kind, f) => { if (!f) return; UI.view['fix_' + kind] = await U.readFile(f); const n = U.$('#fix-name-' + kind); if (n) n.textContent = U.typoText(UI.view['fix_' + kind].name + ' · ' + U.bytes(UI.view['fix_' + kind].size) + ' · empreinte ' + (UI.view['fix_' + kind].hash || '').slice(0, 12)); UI.toast('Fichier lu dans votre navigateur. Indiquez la fin de validité, puis versez-le.'); };
  App.vaultFile = async (f) => { if (!f) return; UI.view.vaultFile = await U.readFile(f); const n = U.$('#vf-name'); if (n) n.textContent = U.typoText(UI.view.vaultFile.name + ' · ' + U.bytes(UI.view.vaultFile.size) + ' · empreinte ' + (UI.view.vaultFile.hash || '').slice(0, 12)); };
  const fixSave = (id, kind, file, sample) => {
    const until = (U.$('#fix-until-' + kind) || {}).value || U.isoDay(new Date(S.nowTs() + 91 * 86400000));
    const v = ['bondcheque', 'bondletter'].includes(kind) ? null : S.bestDoc(kind);
    if (['bondcheque', 'bondletter'].includes(kind)) { const amount = Number((U.$('#fix-amount-' + kind) || {}).value) || 0; const lbl = (D.vaultKinds.find((k) => k[0] === kind) || [, kind])[1]; const r0 = A.vaultAdd({ kind, tender: id, title: (kind === 'bondcheque' ? 'Chèque visé' : 'Lettre de garantie irrévocable') + ' · ' + S.def(id).ref, issuer: kind === 'bondcheque' ? 'Institution financière (fictive)' : 'Institution financière (fictive)', issued: U.isoDay(S.now()), expires: until, amount, file }); UI.view['fix_' + kind] = null; if (r0.ok && sample) r0.msg = lbl + ' d’exemple versé. ' + (r0.msg || ''); return after(r0); }
    const r = v ? A.vaultReplace(v.id, { file, issued: U.isoDay(S.now()), expires: v.expires || !v.indefinite ? until : null }) : A.vaultAdd({ kind, issued: U.isoDay(S.now()), expires: until, file });
    UI.view['fix_' + kind] = null;
    if (r.ok && sample) r.msg = 'Fichier d’exemple versé. ' + (r.msg || '');
    return after(r);
  };

  /* ---------- Clics ---------- */
  const H = (App.handlers = {
    reset: () => UI.dialog(`<p>Toutes vos actions dans cette démo seront effacées de ce navigateur : décisions, prix, pièces versées, dossiers ajoutés, approbations, notifications et journal.</p><div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="dlg-close">Annuler</button><button type="button" class="btn btn-danger" data-act="reset-confirm">${ic('reset', 16)}<span>Réinitialiser</span></button></div>`, { title: 'Réinitialiser la démo ?' }),
    'reset-confirm': () => { UI.closeDialog(); if (TS.Tour) TS.Tour.stop(); S.reset(); Object.assign(UI.view, { viewers: {}, reqFilter: {}, annex: {}, oracleCycle: {}, calMonth: null, lastDossier: null }); V.ntReset(); App.go('#/brief'); UI.toast('Démo réinitialisée : retour au vendredi 23 octobre, 7 h 30.'); },
    undo: (el) => { const t = el.closest('.toast'); if (t) t.remove(); if (S.restore()) { App.render(); UI.toast('Action annulée.'); } else UI.toast('Plus rien à annuler.', 'warn'); },
    'dlg-close': () => UI.closeDialog(),
    'dlg-close-nav': (el, ev) => { ev.preventDefault(); UI.closeDialog(); App.go(el.getAttribute('href')); },
    persona: (el) => { const d = el.closest('details'); if (d) d.open = false; after(A.setPersona(el.dataset.id)); },
    'tour-start': () => TS.Tour && TS.Tour.start(),
    search: () => TS.Search.open(),
    lab: () => { UI.view.lab = !UI.view.lab; App.render(); if (UI.view.lab) { const f = U.$('#lab .lab-tab.is-on'); if (f) f.focus(); } },
    'lab-close': () => { UI.view.lab = false; App.render(); const b = U.$('[data-act="lab"]'); if (b) b.focus(); },
    'lab-tab': (el) => { UI.view.labTab = el.dataset.k; App.render(); const f = U.$('#lab .lab-tab.is-on'); if (f) f.focus(); },
    'lab-preset': (el) => { const r = TS.Lab.runPreset(el.dataset.id); UI.view.lab = false; if (r.route) App.go(r.route); else App.render(); UI.toast(r.msg); },
    'lab-clock': (el) => { const before = S.unread(); const r = A.clockBy(Number(el.dataset.min), el.textContent.trim()); App.render(); UI.toast(r.msg + (S.unread() > before ? ' ' + (S.unread() - before) + ' nouvelle(s) notification(s).' : '')); },
    'lab-clock-to': () => { const v = (U.$('#lab-to') || {}).value; const before = S.unread(); const r = A.clockTo(V.fromLocalInput(v)); App.render(); UI.toast((r.msg || '') + (r.ok && S.unread() > before ? ' ' + (S.unread() - before) + ' nouvelle(s) notification(s).' : ''), r.ok ? '' : 'warn'); },
    'lab-next': () => { const n = S.allDeadlines().find((x) => !x.done && Date.parse(x.at) > S.nowTs()); if (!n) return; const before = S.unread(); const r = A.clockTo(new Date(Date.parse(n.at) + 60000).toISOString()); App.render(); UI.toast(r.msg + ' Passé : ' + n.label + '.' + (S.unread() > before ? ' ' + (S.unread() - before) + ' notification(s).' : '')); },
    'lab-addendum': () => { const id = (U.$('#lab-add-t') || {}).value; if (!id) return; const r = A.publishAddendum(id, null, 'source'); after(r); if (r.ok) UI.toast((r.hadPrice || r.hadPkg ? 'Approbations périmées pour ' + S.def(id).buyerShort + '. ' : '') + 'Accusé de réception à signer.', 'warn'); },
    'lab-revoke': () => { const vid = (U.$('#lab-rev-v') || {}).value; if (!vid) return; after(A.vaultRevoke(vid, (U.$('#lab-rev-why') || {}).value, 'source')); },
    'lab-results': () => { const id = (U.$('#lab-res-t') || {}).value; if (id) after(A.publishResults(id)); },
    'lab-answer': () => { const id = (U.$('#lab-ans-t') || {}).value; if (id) after(A.answerQuestion(id)); },
    'lab-broker': () => { const id = (U.$('#lab-brk-t') || {}).value; if (id) after(A.bond(id, 'issued')); },
    'lab-visit': () => { const id = (U.$('#lab-vis-t') || {}).value; if (id) after(A.visitUpload(id, TS.Flow.sampleFile('visit', 'Attestation_visite_' + S.def(id).ref))); },
    'lab-export': () => { const ok = U.download('TenderStrike_espace_' + U.isoDay(S.now()) + '_DEMO.json', 'application/json', S.exportJson()); UI.toast(ok ? 'Espace de travail exporté (' + S.state.log.length + ' événements).' : 'Téléchargement impossible dans ce navigateur.', ok ? '' : 'warn'); },
    'show-message': (el) => UI.dialog(V.messageDialog(tid(el)), { title: 'Le message du matin', cls: 'dlg-wide' }),
    'copy-sms': (el) => {
      const txt = V.smsText(tid(el));
      const fail = () => UI.toast('Presse-papiers indisponible : sélectionnez le texte du texto et copiez-le manuellement.', 'warn');
      if (S.state.caps.noClipboard || !navigator.clipboard) return fail();
      try { navigator.clipboard.writeText(txt).then(() => UI.toast('Texto copié dans le presse-papiers.'), fail); } catch (e) { fail(); }
    },
    ics: () => { const list = S.allDeadlines(); const ok = U.download('TenderStrike_echeances_DEMO.ics', 'text/calendar', V.ics(list)); UI.toast(ok ? list.length + ' échéances exportées au format iCalendar.' : 'Téléchargement impossible dans ce navigateur.', ok ? '' : 'warn'); },
    'notif-open': (el, ev) => { ev.preventDefault(); A.read(el.dataset.id); App.go(el.getAttribute('href')); },
    'notif-read-all': () => after(A.readAll()),
    'notif-filter': (el) => { UI.view.notifFilter = el.dataset.f; App.render(); },
    cite: (el) => App.openCite(el, TS.Tour && TS.Tour.active),
    'viewer-doc': (el) => { const id = tid(el), doc = el.dataset.doc; const first = S.pages(id).find((p) => p.doc === doc); Object.assign(UI.viewer(id), { doc, page: first ? first.n : 1, clause: null }); UI.view.scrollPending = id; refreshViewer(id); },
    'viewer-step': (el) => {
      const id = tid(el), v = UI.viewer(id); const pages = S.pages(id).filter((p) => p.doc === v.doc).map((p) => p.n);
      const i = Math.max(0, pages.indexOf(v.page)) + Number(el.dataset.dir);
      if (i < 0 || i >= pages.length) return;
      Object.assign(v, { page: pages[i], clause: null }); UI.view.scrollPending = id; refreshViewer(id);
    },
    'req-filter': (el) => { UI.view.reqFilter[tid(el)] = el.dataset.f; App.render(); },
    'decide-open': (el) => UI.dialog(V.decisionDialog(tid(el)), { title: 'Décision : ' + esc(S.def(tid(el)).buyerShort), cls: 'dlg-decide' }),
    decide: (el) => {
      const choice = (U.$('input[name="dec"]:checked') || {}).value || 'proceed';
      const reason = (U.$('#dec-reason') || {}).value || '';
      const owner = (U.$('#dec-owner') || {}).value || 'marc', review = (U.$('#dec-review') || {}).value || U.isoDay(S.now());
      const r = A.decide(tid(el), choice, reason.trim(), owner, review);
      if (r.ok && U.$('.dlg-decide')) UI.closeDialog();
      after(r);
    },
    info: (el) => App.toggleTip(el),
    book: (el) => { const id = tid(el), v = UI.viewer(id); if (!S.docs(id)[v.doc]) return UI.toast('Le devis n’est pas encore obtenu pour ce dossier.', 'warn'); UI.dialog(UI.viewerHtml(id, { dialog: true }), { title: esc(S.docs(id)[v.doc].label) + ' · p. ' + v.page, cls: 'dlg-viewer dlg-sheet', returnFocus: el, after: () => UI.scrollViewer(id, false) }); },
    'decl-open': (el) => App.declDialog(tid(el), el),
    reopen: (el) => after(A.reopen(tid(el))),
    archive: (el) => after(A.archive(tid(el), el.dataset.on !== '')),
    confirm: (el) => after(A.confirm(tid(el), el.dataset.key)),
    'acquire-sample': (el) => { const id = tid(el); TS.Flow.acquire(id); App.render(); UI.toast('Dossier d’exemple versé : la radiographie est prête (lecture simulée).'); },
    'fix-save': (el) => { const f = UI.view['fix_' + el.dataset.kind]; if (!f) return UI.toast('Choisissez d’abord le PDF, ou utilisez le fichier d’exemple.', 'warn'); fixSave(tid(el), el.dataset.kind, f, false); },
    'fix-sample': (el) => fixSave(tid(el), el.dataset.kind, TS.Flow.sampleFile(el.dataset.kind, (D.vaultKinds.find((k) => k[0] === el.dataset.kind) || [, el.dataset.kind])[1]), true),
    'vault-recheck': (el) => after(A.vaultRecheck(el.dataset.v)),
    'visit-assign': (el) => { const id = tid(el); after(A.visitAssign(id, (U.$('#visit-who-' + id) || {}).value || 'denis')); },
    'visit-upload': (el) => { const id = tid(el); after(A.visitUpload(id, TS.Flow.sampleFile('visit', 'Attestation_visite_' + S.def(id).ref))); },
    'q-new': (el) => { UI.view.qProv = null; UI.dialog(V.questionDialog(tid(el), el.dataset.req || null, null), { title: 'Question au donneur d’ouvrage', cls: 'dlg-wide' }); },
    'q-edit': (el) => { UI.view.qProv = null; UI.dialog(V.questionDialog(tid(el), null, el.dataset.q), { title: 'Modifier la question', cls: 'dlg-wide' }); },
    'q-rules': (el) => { const ta = U.$('#q-text'); if (ta) ta.value = U.typoText(V.questionDraft(tid(el), (U.$('#q-req') || {}).value || null)); UI.view.qProv = null; const pv = U.$('#q-prov'); if (pv) pv.innerHTML = UI.prov(null) + ' Brouillon par règles : relisez-le avant d’enregistrer.'; },
    'q-ai': (el) => App.questionAI(tid(el)),
    'q-save': (el) => { const id = tid(el); const r = A.questionSave(id, { id: el.dataset.q || null, text: (U.$('#q-text') || {}).value, req: (U.$('#q-req') || {}).value || null, provenance: UI.view.qProv || 'Règles' }); if (r.ok) UI.closeDialog(); after(r); },
    'q-send': (el) => after(A.questionSend(tid(el), el.dataset.q)),
    'q-del': (el) => after(A.questionDelete(tid(el), el.dataset.q)),
    'oracle-cycle': (el) => { UI.view.oracleCycle[tid(el)] = el.dataset.c; App.render(); },
    record: (el) => UI.dialog(V.recordDialog(tid(el), el.dataset.cycle, el.dataset.firm), { title: 'Source publique du montant' }),
    why: (el) => { whyRules(tid(el)); App.render(); },
    'why-ai': (el) => App.whyAI(tid(el)),
    propose: (el) => after(A.propose(tid(el))),
    'proposal-confirm': (el) => after(A.confirmProposal(tid(el))),
    'proposal-reject': (el) => after(A.rejectProposal(tid(el))),
    'approve-price': (el) => after(A.approvePrice(tid(el))),
    'line-new': (el) => UI.dialog(V.lineDialog(tid(el), null), { title: 'Ajouter un article au bordereau' }),
    'line-edit': (el) => UI.dialog(V.lineDialog(tid(el), el.dataset.code), { title: 'Modifier l’article' }),
    'line-del': (el) => UI.confirm('Supprimer cet article ?', 'L’article et son prix seront retirés du bordereau. Vous pourrez annuler juste après.', 'line-del-confirm', { t: tid(el), code: el.dataset.code }, 'Supprimer'),
    'line-del-confirm': (el) => { UI.closeDialog(); after(A.lineDelete(tid(el), el.dataset.code)); },
    annex: (el) => { UI.view.annex[tid(el)] = el.dataset.id; App.render(); },
    'verify-annex': (el) => after(A.verifyAnnex(tid(el), el.dataset.id)),
    'verify-all': (el) => after(A.verifyAll(tid(el))),
    'ref-save': (el) => { const v = (U.$('#ref-email-' + el.dataset.p) || {}).value; after(A.setRefEmail(tid(el), el.dataset.p, v)); },
    'project-new': () => UI.dialog(V.projectDialog(null), { title: 'Ajouter un projet de référence', cls: 'dlg-wide' }),
    'project-edit': (el) => UI.dialog(V.projectDialog(el.dataset.p), { title: 'Modifier le projet', cls: 'dlg-wide' }),
    'project-remove': (el) => UI.confirm('Retirer ce projet ?', 'Il ne sera plus proposé aux annexes D. Les dossiers qui l’utilisaient seront recalculés. Vous pourrez annuler juste après.', 'project-remove-confirm', { p: el.dataset.p }, 'Retirer'),
    'project-remove-confirm': (el) => { UI.closeDialog(); after(A.projectRemove(el.dataset.p)); },
    bond: (el) => after(A.bond(tid(el), el.dataset.step)),
    ack: (el) => after(A.ack(tid(el), el.dataset.k)),
    'sign-decl': (el) => { const r = A.signDecl(tid(el)); if (r.ok && U.$('.dlg-decl')) UI.closeDialog(); after(r); },
    'approve-package': (el) => after(A.approvePackage(tid(el))),
    export: (el) => App.doExport(tid(el)),
    'manual-check': (el) => after(A.manualCheck(tid(el))),
    'export-draft': (el) => {
      const id = tid(el), entry = A.recordExport(id, 'draft'); App.render();
      U.download(mfName(id, entry, 'html'), 'text/html', V.manifest(id, entry).html);
      UI.toast('Brouillon téléchargé : il liste ' + entry.blockers.length + ' point(s) non résolu(s) et ne peut pas être présenté comme prêt.');
    },
    'dl-html': (el) => { const id = tid(el), e = lastExport(id); if (e) U.download(mfName(id, e, 'html'), 'text/html', V.manifest(id, e).html); },
    'dl-json': (el) => { const id = tid(el), e = lastExport(id); if (e) U.download(mfName(id, e, 'json'), 'application/json', V.manifestJson(id, e)); },
    print: (el) => { const id = tid(el), e = lastExport(id); if (e) App.print(id, e); },
    'receipt-sample': (el) => { const i = U.$('#rc-num'); if (i) { i.value = 'SEAO-DEMO-' + S.def(tid(el)).ref.replace(/\W/g, '').slice(-6) + '-48217'; i.focus(); } },
    receipt: (el) => { const n = (U.$('#rc-num') || {}).value; const w = (U.$('#rc-when') || {}).value; after(A.recordReceipt(tid(el), n, w ? new Date(w).toISOString() : null)); },
    'results-event': (el) => after(A.publishResults(tid(el))),
    outcome: (el) => after(A.outcome(tid(el), el.dataset.k)),
    'radar-view': (el) => { A.radarView(el.dataset.v); App.render(); },
    feedback: (el) => after(A.feedback(el.dataset.id, el.dataset.code)),
    'tender-del': (el) => UI.confirm('Supprimer ce dossier ?', 'Le dossier ajouté par vous, ses prix et ses notifications seront retirés. Le journal garde la trace de la suppression. Vous pourrez annuler juste après.', 'tender-del-confirm', { t: tid(el) }, 'Supprimer le dossier'),
    'tender-del-confirm': (el) => { UI.closeDialog(); const r = A.deleteTender(tid(el)); UI.result(r); if (App.parse().name === 'dossier') App.go('#/radar'); else App.render(); },
    'vault-filter': (el) => { UI.view.vaultFilter = el.dataset.f; App.render(); },
    'vault-new': () => { UI.view.vaultFile = null; UI.dialog(V.vaultDialog('add'), { title: 'Ajouter une pièce au coffre-fort', cls: 'dlg-wide' }); },
    'vault-replace': (el) => { UI.view.vaultFile = null; UI.dialog(V.vaultDialog('replace', el.dataset.v), { title: 'Verser une nouvelle version', cls: 'dlg-wide' }); },
    'vault-edit': (el) => UI.dialog(V.vaultDialog('edit', el.dataset.v), { title: 'Modifier la fiche', cls: 'dlg-wide' }),
    'vault-remove': (el) => { const v = S.state.vault.find((x) => x.id === el.dataset.v); const n = V.usedBy(v.kind).length; UI.confirm('Retirer cette pièce ?', esc(v.title) + (n ? ' est exigée par ' + n + ' dossier(s) ouvert(s) : leur conformité sera recalculée.' : '') + ' Vous pourrez annuler juste après.', 'vault-remove-confirm', { v: v.id }, 'Retirer la pièce'); },
    'vault-remove-confirm': (el) => { UI.closeDialog(); after(A.vaultRemove(el.dataset.v)); },
    'log-filter': (el) => { UI.view.logFilter = el.dataset.f; App.render(); },
    'log-json': () => { U.download('Journal_TenderStrike_DEMO.json', 'application/json', JSON.stringify({ avertissement: 'Démo · données fictives', evenements: S.state.log }, null, 2)); UI.toast('Journal exporté (' + S.state.log.length + ' événements).'); },
    'cal-month': (el) => { const [y, m] = UI.view.calMonth.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + Number(el.dataset.dir), 1)); UI.view.calMonth = d.toISOString().slice(0, 7); App.render(); },
    'cal-today': () => { UI.view.calMonth = U.isoDay(S.now()).slice(0, 7); App.render(); },
    'nt-sample': () => { V.ntReset(); UI.view.nt.text = TS.SAMPLE_NOTICE; App.render(); const t = U.$('#nt-text'); if (t) t.focus(); UI.toast('Avis d’exemple collé (fictif). Lancez l’analyse.'); },
    'nt-clear': () => { V.ntReset(); App.render(); },
    'nt-rules': () => App.ntAnalyze(false),
    'nt-ai': () => App.ntAnalyze(true),
    'nt-seg': (el) => { const p = U.$('#nt-seg-' + el.dataset.i); if (!p) return; const det = p.closest('details'); if (det && !det.open) { det.open = true; UI.view.ntSrcOpen = true; } U.$$('.nt-s.is-flash').forEach((x) => x.classList.remove('is-flash')); p.classList.add('is-flash'); const box = U.$('.nt-source'); if (box && getComputedStyle(box).overflowY !== 'visible' && box.scrollHeight > box.clientHeight) box.scrollTo({ top: p.offsetTop - box.offsetTop - 40, behavior: U.reducedMotion() ? 'auto' : 'smooth' }); else p.scrollIntoView({ block: 'center' }); },
    'nt-create': () => {
      if (!UI.view.nt.ex) return;
      const def = V.ntBuild();
      const r = A.createTender(def);
      UI.result(r);
      if (r.ok) { V.ntReset(); App.go('#/dossier/' + r.id + '/radiographie'); }
    }
  });
  const refreshViewer = (id) => {
    const host = U.$('.dlg-viewer .viewer') ? U.$('.dlg-viewer .dlg-b') : null;
    if (host) {
      const actions = host.querySelector('.dlg-actions');
      host.innerHTML = UI.viewerHtml(id, { dialog: true }) + (actions ? actions.outerHTML : '');
      U.typo(host);
      UI.scrollViewer(id, true);
      UI.view.scrollPending = false;
      return;
    }
    App.render();
  };

  /* ---------- Changements de champs ---------- */
  const C = (App.changes = {
    'fix-file': (el) => App.fixFile(el.dataset.kind, el.files && el.files[0]),
    'vault-file': (el) => App.vaultFile(el.files && el.files[0]),
    'vault-kind': (el) => { UI.view.vaultKind = el.value; const f = el.form; if (!f) return; U.$$('[data-only]', f).forEach((x) => { x.hidden = !x.dataset.only.split(' ').includes(el.value); }); const t = f.querySelector('[name="title"]'); if (t) t.value = (D.vaultKinds.find((k) => k[0] === el.value) || [, ''])[1]; },
    'nt-file': (el) => App.ntFile(el.files && el.files[0]),
    inflation: (el) => after(A.setInflation(tid(el), el.value)),
    'manual-rate': (el) => after(A.setInflation(tid(el), 'manual', el.value)),
    project: (el) => after(A.toggleProject(tid(el), el.dataset.id)),
    decl: (el) => { after(A.toggleDecl(tid(el), el.dataset.k)); App.declRefresh(tid(el)); },
    'radar-filter': (el) => { S.state.radar.filter = el.value; S.save(); App.render(); },
    radius: (el) => { A.radius(Number(el.value)); App.render(); UI.toast('Rayon de ' + el.value + ' km : classement et exclusions recalculés.'); },
    acquire: async (el) => { const files = await Promise.all(Array.from(el.files || []).map(U.readFile)); if (files.length) after(A.acquire(tid(el), files)); },
    'log-tender': (el) => { UI.view.logTender = el.value; App.render(); },
    'cal-filter': (el) => { UI.view.calFilter = el.value; App.render(); },
    'lab-cap': (el) => { A.cap(el.dataset.k, el.checked); App.render(); UI.toast({ offline: el.checked ? 'SEAO injoignable (simulation) : l’export exigera une vérification manuelle.' : 'SEAO de nouveau joignable.', registryDown: el.checked ? 'Registres indisponibles : les vérifications deviennent « Non vérifié ».' : 'Registres de nouveau disponibles.', noClipboard: el.checked ? 'Presse-papiers refusé (simulation).' : 'Presse-papiers rétabli.' }[el.dataset.k]); },
    'lab-import': async (el) => { const f = el.files && el.files[0]; if (!f) return; const r = S.importJson(await f.text()); Object.assign(UI.view, { viewers: {}, reqFilter: {}, annex: {}, oracleCycle: {}, lastDossier: null }); UI.result(r); App.render(); }
  });

  /* ---------- Formulaires ---------- */
  const val = (f, n) => (f.elements[n] ? f.elements[n].value : '');
  const FORMS = {
    line: (f) => { const id = f.dataset.t; const r = A.lineSave(id, { code: f.dataset.code || null, label: val(f, 'label'), unit: val(f, 'unit'), qty: val(f, 'qty'), cost: val(f, 'cost'), price: val(f, 'price') }); if (r.ok) UI.closeDialog(); after(r); },
    vault: (f) => {
      const mode = f.dataset.mode, vid = f.dataset.v, file = UI.view.vaultFile;
      let r;
      if (mode === 'add') { const kind = val(f, 'kind'); r = A.vaultAdd({ kind, title: val(f, 'title'), issuer: val(f, 'issuer'), issued: val(f, 'issued'), expires: val(f, 'expires') || null, indefinite: kind === 'amp' && !val(f, 'expires'), amount: val(f, 'amount') || null, cats: val(f, 'cats') ? val(f, 'cats').split(/[,;\s]+/).filter(Boolean) : undefined, sensitivity: f.elements.restricted && f.elements.restricted.checked ? 'restricted' : 'public', file: file || TS.Flow.sampleFile(kind, val(f, 'title')) }); }
      else if (mode === 'replace') r = A.vaultReplace(vid, { file: file || TS.Flow.sampleFile('doc', (S.state.vault.find((x) => x.id === vid) || {}).title), issued: val(f, 'issued'), expires: val(f, 'expires') || null });
      else { const patch = { title: val(f, 'title'), issuer: val(f, 'issuer'), issued: val(f, 'issued'), expires: val(f, 'expires') || null }; if (f.elements.amount) patch.amount = Number(val(f, 'amount')) || undefined; if (f.elements.cats) patch.cats = val(f, 'cats').split(/[,;\s]+/).filter(Boolean); r = A.vaultUpdate(vid, patch); }
      if (r.ok) { UI.view.vaultFile = null; UI.closeDialog(); }
      after(r);
    },
    project: (f) => { const r = A.projectSave({ id: f.dataset.p || null, trade: val(f, 'trade'), client: val(f, 'client'), object: val(f, 'object'), start: val(f, 'start'), end: val(f, 'end'), value: val(f, 'value'), km: val(f, 'km'), m2: val(f, 'm2'), sites: val(f, 'sites'), contact: val(f, 'contact'), email: val(f, 'email') }); if (r.ok) UI.closeDialog(); after(r); },
    receipt: (f) => H.receipt(f),
    results: (f) => {
      const id = f.dataset.t, bids = [];
      for (let i = 0; i < 3; i++) { const firm = val(f, 'firm' + i).trim(), amount = Number(val(f, 'amt' + i)); if (firm && amount > 0) bids.push({ firm, amount }); }
      const you = Number(val(f, 'you'));
      if (you > 0) bids.push({ firm: D.company.legalName, amount: you, you: true });
      after(A.recordResults(id, bids, 'manual'));
    }
  };

  /* ---------- Saisie des prix et des coûts : mise à jour en direct, validation au changement ---------- */
  const liveLine = (el) => {
    const id = el.dataset.t, d = S.D(id);
    const v = V.parseMoney(el.value);
    const isCost = !!el.dataset.cost;
    const ok = isFinite(v) && (isCost ? v >= 0 : v > 0);
    el.classList.toggle('is-bad', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    if (!ok) return;
    const code = el.dataset.price || el.dataset.cost;
    let prices = d.prices, savedCosts = null;
    if (isCost) { savedCosts = Object.assign({}, d.costs); d.costs[code] = Math.round(v * 100); }
    else prices = Object.assign({}, d.prices, { [code]: Math.round(v * 100) });
    try {
      const T = S.totals(id, prices);
      const l = T.lines.find((x) => x.a.code === code);
      const lt = U.$('#lt-' + id + '-' + code), lm = U.$('#lm-' + id + '-' + code);
      if (lt) lt.textContent = U.cents(l.totalC);
      if (lm) { lm.textContent = U.pct(l.marginRate); lm.classList.toggle('is-low', l.marginRate < (S.def(id).minMargin || 0.1)); }
      const bf = U.$('#bord-foot-' + id); if (bf) { bf.innerHTML = V.bordFoot(id, T); U.typo(bf); }
      const co = U.$('#corridor-' + id); if (co) co.innerHTML = V.corridor(id, S.oracle(id, prices));
    } finally { if (savedCosts) d.costs = savedCosts; }
  };

  App.bind = () => {
    document.addEventListener('click', (ev) => {
      const inMenu = ev.target.closest && ev.target.closest('details.menu');
      U.$$('details.menu[open]').forEach((d) => { if (d !== inMenu) d.open = false; });
      if (inMenu && ev.target.closest('.menu-p a, .menu-p button')) inMenu.open = false;
      if (tipFor && !(ev.target.closest && (ev.target.closest('#tip') || ev.target.closest('[data-act="info"]') === tipFor))) App.closeTip();
      const opt = ev.target.closest && ev.target.closest('.srch-o');
      if (opt) { TS.Search.go(Number(opt.dataset.i)); return; }
      const el = ev.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const h = H[el.dataset.act];
      if (!h) return;
      if (el.tagName === 'A' && !['dlg-close-nav', 'notif-open'].includes(el.dataset.act)) return;
      ev.preventDefault();
      h(el, ev);
    });
    document.addEventListener('change', (ev) => {
      const el = ev.target;
      if (el.dataset && (el.dataset.price || el.dataset.cost)) {
        const v = V.parseMoney(el.value);
        if (el.dataset.price) { if (!isFinite(v) || v <= 0) { UI.toast('Prix invalide : entrez un nombre positif, par exemple 3 880,50.', 'warn'); return; } after(A.setPrice(el.dataset.t, el.dataset.price, v)); }
        else { if (!isFinite(v) || v < 0) { UI.toast('Coût invalide : entrez un nombre positif ou nul.', 'warn'); return; } after(A.setCost(el.dataset.t, el.dataset.cost, v)); }
        return;
      }
      if (el.dataset && el.dataset.nt) { UI.view.nt.edits[el.dataset.nt] = el.type === 'checkbox' ? el.checked : el.value; return; }
      if (el.dataset && el.dataset.ntKeep != null) { UI.view.nt.edits['keep' + el.dataset.ntKeep] = el.checked; return; }
      const k = el.dataset && el.dataset.actChange;
      if (k && C[k]) C[k](el, ev);
    });
    document.addEventListener('input', (ev) => {
      const el = ev.target;
      if (el.dataset && (el.dataset.price || el.dataset.cost)) liveLine(el);
      else if (el.id === 'nt-text') UI.view.nt.text = el.value;
      else if (el.id === 'srch-q') TS.Search.input(el);
      else if (el.dataset && el.dataset.nt) UI.view.nt.edits[el.dataset.nt] = el.type === 'checkbox' ? el.checked : el.value;
    });
    document.addEventListener('submit', (ev) => {
      const f = ev.target;
      if (!f.dataset || !f.dataset.form || !FORMS[f.dataset.form]) return;
      ev.preventDefault();
      FORMS[f.dataset.form](f);
    });
    document.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'k' || ev.key === 'K')) { ev.preventDefault(); if (U.$('.dlg-search') && U.$('#dlg').open) UI.closeDialog(); else TS.Search.open(); return; }
      if (ev.target.id === 'srch-q') { TS.Search.key(ev); return; }
      if (ev.key === 'Enter' && ev.target.dataset && (ev.target.dataset.price || ev.target.dataset.cost)) { ev.preventDefault(); ev.target.blur(); }
      if (ev.key === 'Enter' && ev.target.dataset && ev.target.dataset.ref) { ev.preventDefault(); H['ref-save']({ dataset: { t: ev.target.dataset.t, p: ev.target.dataset.ref } }); }
      if (ev.key === 'Escape') {
        if (tipFor) { const b = tipFor; App.closeTip(); b.focus(); ev.preventDefault(); return; }
        const p = U.$('details.menu[open]'); if (p) { p.open = false; p.querySelector('summary').focus(); return; }
        if (UI.view.lab && !U.$('#dlg').open && !(TS.Tour && TS.Tour.active)) H['lab-close']();
      }
    });
    document.addEventListener('dragover', (ev) => { const z = ev.target.closest && ev.target.closest('[data-drop]'); if (z) { ev.preventDefault(); z.classList.add('is-over'); } });
    document.addEventListener('dragleave', (ev) => { const z = ev.target.closest && ev.target.closest('[data-drop]'); if (z) z.classList.remove('is-over'); });
    document.addEventListener('drop', async (ev) => {
      const z = ev.target.closest && ev.target.closest('[data-drop]');
      if (!z) return;
      ev.preventDefault(); z.classList.remove('is-over');
      const files = Array.from((ev.dataTransfer && ev.dataTransfer.files) || []);
      if (!files.length) return;
      const kind = z.dataset.drop;
      if (kind === 'acquire') { const meta = await Promise.all(files.map(U.readFile)); after(A.acquire(z.dataset.t, meta)); }
      else if (kind === 'fix') App.fixFile(z.dataset.kind, files[0]);
      else if (kind === 'vault') App.vaultFile(files[0]);
      else if (kind === 'new') App.ntFile(files[0]);
    });
    const dlg = U.$('#dlg');
    dlg.addEventListener('close', () => { dlg.innerHTML = ''; });
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) UI.closeDialog(); });
    document.addEventListener('toggle', (ev) => { if (ev.target.classList && ev.target.classList.contains('nt-side')) UI.view.ntSrcOpen = ev.target.open; if (ev.target.classList && ev.target.classList.contains('persona') && ev.target.open) { const b = ev.target.querySelector('.pm.is-on') || ev.target.querySelector('.pm'); if (b) b.focus(); } }, true);
    window.addEventListener('scroll', () => { if (tipFor && !tipFor.closest('dialog')) App.closeTip(); }, { passive: true });
    window.addEventListener('hashchange', () => { if (U.$('#dlg').open && !U.$('.dlg-viewer')) UI.closeDialog(); if (UI.view.lab && UI.isNarrow()) UI.view.lab = false; App.render(); });
    let wide = window.innerWidth;
    window.addEventListener('resize', () => { const w = window.innerWidth; const cross = (b) => (wide <= b) !== (w <= b); if (cross(640) || cross(1023)) App.render(); wide = w; });
    window.addEventListener('storage', (ev) => { if (ev.key === 'tenderstrike-v3') { S.load(); App.render(); } });
    /* Le moniteur d’API du hub peut changer l’état (clé, budget, coupe-circuit) : un rendu, et une bulle seulement si l’état change */
    const aiKey = (st) => st.state + '|' + st.reason;
    let aiNow = TS.AI.status(), pend = 0;
    const onMeter = () => {
      if (pend) return;
      pend = setTimeout(() => {
        pend = 0;
        const st = TS.AI.status();
        if (aiKey(st) === aiKey(aiNow)) return;
        const was = aiNow.state; aiNow = st;
        App.render();
        if (was !== st.state) UI.toast(st.state === 'on' ? 'IA en direct active : elle propose, vous décidez. Les appels sont comptés dans le moniteur d’API.' : st.label + ' : la démo utilise les règles.', st.state === 'on' ? '' : 'warn');
      }, 60);
    };
    if (window.ApiMeter) window.ApiMeter.onChange(onMeter);
    else if (window.LiveAI) window.LiveAI.onChange(onMeter);
  };

  App.start = () => {
    S.scan(); S.save();
    App.bind();
    App.render();
    document.documentElement.classList.add('is-ready');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.start); else App.start();
})();
