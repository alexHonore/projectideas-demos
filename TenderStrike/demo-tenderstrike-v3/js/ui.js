/* Composants partagés : statuts, citations, visionneuse, dialogues, toasts (avec annulation), en-tête de dossier. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U, S = TS.S;
  const UI = (TS.UI = {});
  const esc = U.esc, ic = U.icon;

  UI.view = { viewers: {}, reqFilter: {}, oracleCycle: {}, annex: {}, vaultFilter: 'all', logFilter: 'all', logTender: 'all', calMonth: null, swept: false };
  UI.viewer = (id) => { if (!UI.view.viewers[id]) UI.view.viewers[id] = { doc: 'devis', clause: null, page: (S.pages(id)[0] || { n: 1 }).n }; return UI.view.viewers[id]; };

  const STATUS = {
    verified: ['ok', 'check', 'Vérifié'], expired: ['bad', 'x', 'Expiré à la clôture'], missing: ['bad', 'minus', 'Manquant'],
    insufficient: ['bad', 'alert', 'Montant insuffisant'], failed: ['bad', 'x', 'Non admissible'], suspended: ['bad', 'lock', 'Révoqué'],
    pending: ['wait', 'clock', 'À compléter'], unverified: ['wait', 'q', 'Non vérifié'], unknown: ['wait', 'q', 'Inconnu'],
    na: ['muted', 'minus', 'Non applicable'], risk: ['risk', 'alert', 'Risque commercial'], info: ['muted', 'info', 'À savoir']
  };
  UI.status = (k, label) => { const s = STATUS[k] || STATUS.info; return `<span class="st st-${s[0]}">${ic(s[1], 14)}<span>${esc(label || s[2])}</span></span>`; };
  UI.stage = (k) => {
    const cls = { matched: 'stg-new', review: 'stg-review', prep: 'stg-prep', approval: 'stg-approval', ready: 'stg-ready', submitted: 'stg-done', opened: 'stg-done', awarded: 'stg-done', lost: 'stg-muted', cancelled: 'stg-muted', declined: 'stg-muted', missed: 'stg-bad' }[k] || 'stg-new';
    return `<span class="stg ${cls}">${esc(S.stageLabel(k))}</span>`;
  };
  UI.prov = (p) => (p && p.source === 'live-ai' || (p && p.source === 'ai') ? `<span class="prov prov-ai">${ic('bolt', 12)}IA en direct · ${esc(p.model || 'claude-opus-5-5')}${p.ms != null ? ' · ' + U.num(p.ms / 1000, 1) + ' s' : ''}</span>` : `<span class="prov">${ic('list', 12)}Règles</span>`);
  UI.cite = (id, req, label) => {
    if (!req) return '';
    const docs = S.docs(id);
    const docLabel = (docs[req.doc] || { label: 'Document' }).label;
    const lbl = label || (docLabel === 'Cahier des charges' ? 'Devis' : docLabel) + ' · ' + req.sec + ' · p. ' + req.page;
    return `<button type="button" class="cite${req.unverifiedQuote ? ' cite-warn' : ''}" data-act="cite" data-t="${esc(id)}" data-clause="${esc(req.clause)}" data-doc="${esc(req.doc)}" data-page="${req.page}" aria-label="Ouvrir la source : ${esc(docLabel)}, ${esc(req.sec)}, page ${req.page}">${ic('doc', 13)}<span>${esc(lbl)}</span></button>`;
  };
  UI.btn = (label, act, opts) => {
    const o = opts || {};
    const attrs = Object.entries(o.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
    return `<button type="button" class="btn ${o.cls || ''}" data-act="${esc(act)}"${attrs}${o.disabled ? ' disabled aria-disabled="true"' : ''}${o.id ? ` id="${o.id}"` : ''}${o.title ? ` title="${esc(o.title)}"` : ''}>${o.icon ? ic(o.icon, 16) : ''}<span>${label}</span></button>`;
  };
  UI.avatar = (id, size) => {
    const p = D.people[id];
    if (!p) return `<span class="av av-sys${size ? ' av-' + size : ''}" aria-hidden="true">${id === 'source' ? 'S' : id === 'lab' ? 'L' : ic('bolt', 12)}</span>`;
    return `<span class="av av-${id}${size ? ' av-' + size : ''}" aria-hidden="true">${p.initials}</span>`;
  };
  UI.mark = (size) => `<svg class="mark" width="${size || 30}" height="${size || 30}" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="9" fill="#172338"/><path d="M22 7 10 22h10l-2 11 13-17H21z" fill="#FFE45E"/></svg>`;
  UI.trade = (k) => esc(D.tradeLabels[k] || k);

  /* ---------- Visionneuse ---------- */
  UI.viewerHtml = (id, opts) => {
    const o = opts || {};
    const v = UI.viewer(id);
    const docs = S.docs(id);
    if (!docs[v.doc]) v.doc = 'devis';
    const meta = docs[v.doc];
    const pages = S.pages(id).filter((p) => p.doc === v.doc);
    const def = S.def(id);
    const reqByClause = {};
    S.requirements(id).forEach((r) => { reqByClause[r.clause] = r; });
    let prev = 0;
    const body = pages.map((p) => {
      let gap = '';
      if (p.n - prev > 1 && !def.custom) gap = `<div class="pgap" aria-hidden="true">Pages ${prev + 1} à ${p.n - 1} non affichées dans la démo</div>`;
      prev = p.n;
      const blocks = p.blocks.map((b) => {
        if (b.t === 'kicker') return `<p class="pkick">${esc(b.x)}</p>`;
        if (b.t === 'title') return `<h3 class="pt">${esc(b.x)}</h3>`;
        if (b.t === 'subtitle') return `<p class="ps">${esc(b.x)}</p>`;
        if (b.t === 'h') return `<h4 class="ph">${esc(b.x)}</h4>`;
        if (b.t === 'note') return `<p class="pnote">${esc(b.x)}</p>`;
        if (b.t === 'dl') return `<dl class="pdl">${b.rows.map((r) => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>`;
        if (b.t === 'clause') {
          const r = reqByClause[b.id];
          const on = v.clause === b.id;
          const kind = r ? (r.kind === 'trap' ? 'trap' : r.kind === 'pill' ? 'pill' : r.kind === 'gap' ? 'gap' : 'req') : 'req';
          const note = r ? `<span class="mnote mnote-${kind}">${kind === 'trap' ? 'Piège éliminatoire' : kind === 'pill' ? 'Clause de risque' : kind === 'gap' ? 'Lecture incomplète' : 'Exigence'} · ${esc(r.title)}</span>` : '';
          return `<p class="pc pc-${kind}${on ? ' is-on' : ''}" id="clause-${esc(id)}-${esc(b.id)}" data-clause-id="${esc(b.id)}"><mark class="hlmark">${esc(b.x)}</mark>${note}</p>`;
        }
        return `<p>${esc(b.x)}</p>`;
      }).join('');
      return `${gap}<article class="page${p.cover ? ' page-cover' : ''}${p.scan ? ' page-scan' : ''}" data-page="${p.n}" aria-label="${esc(meta.label)}, page ${p.n} sur ${meta.pages}">
        <header class="page-h"><span>${esc(def.buyerShort)} · ${esc(def.ref)}</span><span>${esc(meta.short)}</span></header>
        ${p.scan ? '<div class="scan" aria-hidden="true"></div>' : ''}
        <div class="page-b">${blocks}</div>
        <footer class="page-f"><span>${def.custom ? 'Texte fourni par vous' : 'Document fictif · démonstration'}</span><span>Page ${p.n} de ${meta.pages}</span></footer>
      </article>`;
    }).join('');
    const tabs = Object.values(docs).map((d) => `<button type="button" class="vtab${d.id === v.doc ? ' is-on' : ''}" data-act="viewer-doc" data-t="${esc(id)}" data-doc="${d.id}" aria-pressed="${d.id === v.doc}">${esc(d.label)} <small>${d.pages} p.</small></button>`).join('');
    const keyPages = pages.map((p) => p.n);
    const idx = Math.max(0, keyPages.indexOf(v.page));
    return `<section class="viewer${o.dialog ? ' viewer-in-dialog' : ''}" aria-label="Documents d’appel d’offres">
      <div class="viewer-bar">
        <div class="vtabs" role="group" aria-label="Document affiché">${tabs}</div>
        <div class="vnav">
          <button type="button" class="icon-btn" data-act="viewer-step" data-t="${esc(id)}" data-dir="-1" aria-label="Page clé précédente"${idx <= 0 ? ' disabled' : ''}>${ic('back', 16)}</button>
          <span class="vpage" aria-live="polite">p. ${v.page} / ${meta.pages}</span>
          <button type="button" class="icon-btn" data-act="viewer-step" data-t="${esc(id)}" data-dir="1" aria-label="Page clé suivante"${idx >= keyPages.length - 1 ? ' disabled' : ''}>${ic('arrow', 16)}</button>
        </div>
      </div>
      <div class="viewer-scroll" tabindex="0" aria-label="Pages du document, défilables">${body || '<p class="kempty">Aucune page disponible.</p>'}</div>
      <p class="viewer-foot">${esc(S.bundleLabel(id))} · ${S.bundlePages(id)} pages au dossier · ${pages.length} pages ${def.custom ? '' : 'clés '}affichées</p>
    </section>`;
  };
  UI.scrollViewer = (id, smooth) => {
    const v = UI.viewer(id);
    U.$$('.viewer-scroll').forEach((root) => {
      let el = v.clause ? root.querySelector('#clause-' + CSS.escape(id) + '-' + CSS.escape(v.clause)) : null;
      if (!el) el = root.querySelector(`.page[data-page="${v.page}"]`);
      if (!el) return;
      const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 60;
      root.scrollTo({ top: Math.max(0, top), behavior: smooth && !U.reducedMotion() ? 'smooth' : 'auto' });
    });
  };
  UI.isNarrow = () => window.matchMedia('(max-width: 1023px)').matches;

  /* ---------- Toasts, dialogues ---------- */
  UI.toast = (msg, kind, undo) => {
    if (!msg) return;
    const host = U.$('#toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.innerHTML = `<span>${esc(U.typoText(msg))}</span>${undo ? '<button type="button" class="toast-undo" data-act="undo">Annuler</button>' : ''}`;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, undo ? 8000 : 4200);
  };
  UI.result = (r) => { if (r && r.msg && !r.silent) UI.toast(r.msg, r.ok === false ? 'warn' : '', r.undo); return r; };
  UI.dialog = (html, opts) => {
    const o = opts || {};
    const d = U.$('#dlg');
    if (d.open && !!o.modeless !== d.classList.contains('is-modeless')) { try { d.close(); } catch (e) { d.removeAttribute('open'); } }
    d.className = 'dlg' + (o.cls ? ' ' + o.cls : '') + (o.modeless ? ' is-modeless' : '');
    d.innerHTML = `<div class="dlg-in">${o.title ? `<header class="dlg-h"><h2 id="dlg-title">${o.title}</h2><button type="button" class="icon-btn" data-act="dlg-close" aria-label="Fermer">${ic('close', 18)}</button></header>` : ''}<div class="dlg-b">${html}</div></div>`;
    d.setAttribute('aria-labelledby', 'dlg-title');
    UI.dialogReturn = o.returnFocus || document.activeElement;
    if (!d.open) { try { if (o.modeless) d.show(); else d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
    U.typo(d);
    if (o.after) o.after(d);
    const f = d.querySelector('[autofocus]') || d.querySelector('.dlg-b input, .dlg-b textarea, .dlg-b select, .dlg-b button, .dlg-b a') || d.querySelector('button');
    if (f) f.focus();
    return d;
  };
  UI.closeDialog = () => {
    const d = U.$('#dlg');
    if (d && d.open) { try { d.close(); } catch (e) { d.removeAttribute('open'); } }
    const r = UI.dialogReturn; UI.dialogReturn = null;
    if (r && document.contains(r)) r.focus();
  };
  UI.confirm = (title, body, act, data, label) => UI.dialog(`<p>${body}</p><div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="dlg-close">Annuler</button>${UI.btn(label || 'Confirmer', act, { cls: 'btn-danger', data })}</div>`, { title });

  /* ---------- Icône d’information (ⓘ) : le détail reste disponible sans occuper l’écran ---------- */
  UI.info = (text, label) => `<button type="button" class="info-btn" data-act="info" data-tip="${esc(text)}" aria-label="${esc(label || 'Détails')}" title="${esc(text)}">${ic('info', 16)}</button>`;
  UI.chip = (icon, text, cls, tip) => `<span class="chip2${cls ? ' ' + cls : ''}"${tip ? ` title="${esc(tip)}"` : ''}>${icon ? ic(icon, 14) : ''}<span>${esc(text)}</span></span>`;
  UI.iconBtn = (icon, label, act, data, cls) => `<button type="button" class="icon-btn${cls ? ' ' + cls : ''}" data-act="${esc(act)}"${Object.entries(data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')} aria-label="${esc(label)}" title="${esc(label)}">${ic(icon, 17)}</button>`;

  /* ---------- En-tête de dossier : titre, échéance, étape; le reste derrière ⓘ ---------- */
  UI.TABS = [['radiographie', 'Radiographie', 'eye'], ['prix', 'Prix', 'chart'], ['conformite', 'Conformité', 'shield'], ['formulaires', 'Formulaires', 'doc'], ['revue', 'Revue', 'stamp'], ['historique', 'Historique', 'log']];
  UI.dossierHead = (id, tab) => {
    const t = S.def(id), k = S.stage(id);
    const blockers = S.hardBlockers(id).length;
    const fs = S.fieldStats(id);
    const badge = { prix: S.priceApproved(id) ? '✓' : '', conformite: blockers ? String(blockers) : '', formulaires: U.pct(fs.share, 0), revue: S.D(id).receipt ? '✓' : '' };
    const close = S.close(id);
    const past = S.nowTs() > Date.parse(close);
    const about = t.buyer + (t.custom ? ' (ajouté par vous)' : ' (fictive)') + ' · appel d’offres ' + t.ref + (t.seao !== '—' ? ' · avis SEAO ' + t.seao : '') + ' · ' + t.term + ' · ' + S.bundleLabel(id) + ' · clôture ' + U.dayTime(close) + ', heure de Montréal.';
    return `<div class="dhead">
      <div class="dh-row">
        <a class="icon-btn dh-back" href="#/radar" aria-label="Retour au radar" title="Retour au radar">${ic('back', 17)}</a>
        <div class="dh-main"><p class="dbuyer">${esc(t.buyerShort)} · ${UI.trade(t.trade)}</p><h1 class="dtitle">${esc(t.title)}</h1></div>
        <div class="dh-side">
          <span class="closing${past ? ' is-past' : ''}" title="Clôture : ${esc(U.dayTime(close))}, heure de Montréal">${ic('clock', 15)}<span class="closing-n">${past ? 'Clôturé' : U.countdown(S.now(), close)}</span></span>
          ${UI.stage(k)}
          ${UI.iconBtn('doc', 'Ouvrir le devis (' + S.bundleLabel(id) + ')', 'book', { t: id }, 'dh-book')}
          ${UI.info(about, 'À propos de cet appel d’offres')}
        </div>
      </div>
      <nav class="ftabs" aria-label="Sections du dossier">${UI.TABS.map(([tid, label, icon]) => `<a href="#/dossier/${id}/${tid}" class="ftab${tab === tid ? ' is-on' : ''}"${tab === tid ? ' aria-current="page"' : ''} title="${esc(label)}">${ic(icon, 16)}<span class="ftab-l">${label}</span>${badge[tid] ? `<span class="ftab-b${tid === 'conformite' && blockers ? ' is-bad' : ''}">${badge[tid]}</span>` : ''}</a>`).join('')}</nav>
    </div>`;
  };
})();
