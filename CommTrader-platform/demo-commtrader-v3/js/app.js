/* TradeDesk V3 — hash router, rendering, dialogs (passport, forms, Test lab, search), event delegation and boot. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const V = TD.views; const A = TD.act; const S = TD.store; const E = TD.engine;
  const $ = (q, r) => (r || document).querySelector(q);

  /* ---------- Router ---------- */
  const SECTIONS = ['today', 'inbox', 'trades', 'trade', 'loads', 'load', 'settle', 'book', 'review'];
  function parse(hash) {
    const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    let section = parts[0] || 'today';
    if (!SECTIONS.includes(section)) section = 'today';
    return { section: section, id: parts[1] ? decodeURIComponent(parts[1]) : null, stage: parts[2] || null, navSection: section === 'trade' ? 'trades' : section === 'load' ? 'loads' : section };
  }
  let route = parse(location.hash);
  TD.router = {
    go: function (h) { if (location.hash === h) { route = parse(h); prepare(route); render({ nav: true }); } else location.hash = h; },
    current: function () { return route; }
  };
  const TITLES = { today: 'Today', inbox: 'Trade inbox', trades: 'Trades', trade: 'Trade', loads: 'Loads', load: 'Load', settle: 'Settle', book: 'Physical book', review: 'Review' };

  /* ---------- Render ---------- */
  function focusKey(el) {
    if (!el || el === document.body) return null;
    if (el.id) return '#' + CSS.escape(el.id);
    const act = el.getAttribute('data-act');
    if (act) {
      const ds = ['d', 'n', 'key', 'id', 'c', 'p', 'u', 'f', 'role', 'v', 'i', 'x', 'm', 'form', 'sec', 'ex'].filter((k) => el.dataset[k] != null).map((k) => '[data-' + k + '="' + CSS.escape(el.dataset[k]) + '"]').join('');
      return '[data-act="' + act + '"]' + ds;
    }
    const inp = el.getAttribute('data-input');
    if (inp) return '[data-input="' + inp + '"]' + (el.dataset.key ? '[data-key="' + CSS.escape(el.dataset.key) + '"]' : '') + (el.dataset.id ? '[data-id="' + CSS.escape(el.dataset.id) + '"]' : '') + (el.value && el.type === 'radio' ? '[value="' + CSS.escape(el.value) + '"]' : '');
    if (el.matches('a[href]')) return 'a[href="' + CSS.escape(el.getAttribute('href')) + '"]';
    return null;
  }
  let notifOpen = false; let partyOpen = null;
  function render(opts) {
    opts = opts || {};
    const state = S.get();
    const active = document.activeElement;
    const inLab = active && active.closest && active.closest('#lab-dlg');
    const key = opts.nav || inLab ? null : focusKey(active);
    const r = route;
    const view = { today: V.today, inbox: V.inbox, trades: V.trades, trade: V.trade, loads: V.loads, load: V.load, settle: V.settle, book: V.book, review: V.review }[r.section] || V.today;
    let html;
    try { html = view(state, r); } catch (e) { console.error(e); html = V.band('<div class="page-head"><div><h1>Something went wrong on this screen</h1><p>Reset the demo from the Test lab to restore the sample data.</p></div></div>', 'band-page'); }
    /* Disclosures keep the state the user gave them while the screen re-renders (not across navigation). */
    const folds = {};
    if (!opts.nav) document.querySelectorAll('#main details[id]').forEach((d) => { folds[d.id] = d.open; });
    $('#desk').innerHTML = V.deskbar(state, { section: r.navSection });
    $('#main').innerHTML = html;
    Object.keys(folds).forEach((id) => { const d = document.getElementById(id); if (d && d.tagName === 'DETAILS') d.open = folds[id]; });
    $('#bottom').innerHTML = V.bottomNav(state, { section: r.navSection });
    if (!($('#more-sheet') && $('#more-sheet').open)) $('#more-host').innerHTML = V.moreSheet(state);
    if (notifOpen) setNotif(true);
    document.title = (TITLES[r.section] || 'Today') + (r.id && r.id !== 'new' ? ' · ' + r.id : '') + ' · TradeDesk';
    if (opts.nav) {
      window.scrollTo(0, 0);
      const h1 = $('#main h1');
      if (h1 && !opts.keepFocus) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    } else if (key) {
      const el = $(key);
      if (el) el.focus({ preventScroll: true });
    }
    if ($('#lab-dlg').open) renderLab();
    if (partyOpen && $('#party-dlg').open) $('#party-root').innerHTML = V.passport(state, partyOpen);
    if (TD.tour) TD.tour.refresh();
  }
  TD.render = render;

  function prepare(r) {
    const st = S.get();
    if (r.section === 'inbox') { const id = V.inboxSelected(st, r); if (id && id !== 'new') A.openMessage(id); }
  }
  window.addEventListener('hashchange', () => { route = parse(location.hash); closeMenus(); prepare(route); render({ nav: true }); afterNav(); });
  function afterNav() {
    const st = S.get();
    if (route.section === 'book' && route.id && st.parties[route.id]) openParty(route.id);
    if (route.section === 'book' && route.id && /^DEM-/.test(route.id)) { const row = document.getElementById('dem-' + route.id); if (row) row.scrollIntoView({ block: 'center' }); }
  }

  /* ---------- Menus and dialogs ---------- */
  function closeMenus() {
    const m = $('#role-menu'); const b = $('#who-btn');
    if (m && !m.hidden) { m.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
    const dm = $('#demo-menu'); const db = $('#demo-btn');
    if (dm && !dm.hidden) { dm.hidden = true; if (db) db.setAttribute('aria-expanded', 'false'); }
    document.querySelectorAll('details.nav-more[open], details.ii[open]').forEach((d) => { d.open = false; });
    if (notifOpen) setNotif(false);
  }
  function setNotif(open) {
    notifOpen = open;
    const p = $('#notif-panel'); const b = $('#notif-btn');
    if (p) p.hidden = !open;
    if (b) b.setAttribute('aria-expanded', String(open));
  }
  function showDlg(d) { if (!d) return; if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', ''); }
  function closeDialog(el) {
    const d = el.closest ? el.closest('dialog') : el;
    if (d) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }
  }
  function openParty(id) { partyOpen = id; const dlg = $('#party-dlg'); $('#party-root').innerHTML = V.passport(S.get(), id); showDlg(dlg); const c = dlg.querySelector('[data-act="close-dialog"]'); if (c) c.focus(); }
  $('#party-dlg').addEventListener('close', () => { partyOpen = null; });

  let formCtx = null;
  function openForm(kind, ds) {
    const spec = V.formSpec(kind); if (!spec) return;
    formCtx = { kind: kind, ds: Object.assign({}, ds) };
    const dlg = $('#form-dlg');
    $('#form-root').innerHTML = V.formHtml(S.get(), kind, formCtx.ds);
    showDlg(dlg);
    applyShow(dlg.querySelector('form'));
    const first = dlg.querySelector('.form-grid input:not([type=checkbox]), .form-grid select, .form-grid textarea') || dlg.querySelector('#form-submit');
    if (first) first.focus();
  }
  function applyShow(form) {
    if (!form) return;
    form.querySelectorAll('[data-show]').forEach((el) => { const [k, v] = el.dataset.show.split('='); const c = form.querySelector('[name="' + k + '"]'); el.hidden = !c || c.value !== v; });
  }
  function confirmThen(action, ds, title, msg, ok) { openForm('confirm', Object.assign({ action: action, title: title, msg: msg, ok: ok }, ds)); }

  let labScrollTo = null;
  function renderLab() {
    const dlg = $('#lab-dlg'); const body = dlg.querySelector('.lab-body');
    const top = body ? body.scrollTop : 0;
    const a = document.activeElement; const aid = a && dlg.contains(a) && a.id ? a.id : null;
    const sel = a && aid && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
    $('#lab-root').innerHTML = V.lab(S.get());
    const nb = dlg.querySelector('.lab-body'); if (nb) nb.scrollTop = top;
    if (aid) { const el = document.getElementById(aid); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not a text input */ } } }
  }
  function openLab(sec, id) {
    if (id) TD.labUi.delivery = id;
    const dlg = $('#lab-dlg');
    const wasOpen = dlg.open;
    renderLab(); showDlg(dlg);
    if (sec) jumpLab(sec); else if (!wasOpen) { const b = dlg.querySelector('.lab-body'); if (b) b.scrollTop = 0; const c = dlg.querySelector('[data-act="close-dialog"]'); if (c) c.focus(); }
  }
  function jumpLab(sec) { const t = document.getElementById('lab-' + sec); const b = $('#lab-dlg .lab-body'); if (t && b) { b.scrollTop = t.offsetTop - b.offsetTop - 8; const h = t.querySelector('h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } }
  if (window.LiveAI) window.LiveAI.onChange(() => render());

  /* ---------- File helpers (real browser capabilities) ---------- */
  async function sha256(buf) {
    try {
      if (u.caps.crypto && window.crypto && crypto.subtle) {
        const h = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* fall back */ }
    const bytes = new Uint8Array(buf); let s = '';
    for (let i = 0; i < Math.min(bytes.length, 200000); i++) s += String.fromCharCode(bytes[i]);
    return 'fnv1a-' + u.fnv(s);
  }
  function readText(file, cb) {
    const fr = new FileReader();
    fr.onload = () => cb(String(fr.result || ''));
    fr.onerror = () => TD.ui.toast('That file could not be read. Paste the text instead.', 'warn');
    fr.readAsText(file);
  }
  async function copy(text, okMsg) {
    const ok = await u.copyText(text);
    TD.ui.toast(ok ? okMsg : (u.caps.clipboard ? 'Copy failed: select the text and copy it manually.' : 'Clipboard unavailable (Test lab toggle): select the text and copy it manually.'), ok ? 'ok' : 'warn');
    return ok;
  }
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const numv = (id) => { const v = val(id).trim(); return v === '' ? null : Number(v); };
  const notifySince = (n0) => { const st = S.get(); const add = st.events.filter((e) => e.id > n0); return { all: add.length, attn: add.filter((e) => e.notify).length }; };
  const lastId = () => { const ev = S.get().events; return ev.length ? ev[ev.length - 1].id : 0; };

  function doReset() {
    if (TD.tour) TD.tour.stop(true);
    V._ladderSeen = false;
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    A.reset(); location.hash = '#/today'; route = parse('#/today'); render({ nav: true });
    TD.ui.toast('Demo reset to the morning of Friday, October 23.', 'ok');
  }

  /* ---------- Actions ---------- */
  const tid = () => route.id;
  const act = {
    'tour-start': (el) => { const d = el.closest('dialog'); if (d) closeDialog(d); closeMenus(); TD.tour && TD.tour.start(); },
    'demo-menu': (el) => { const m = $('#demo-menu'); const open = m.hidden; closeMenus(); m.hidden = !open; el.setAttribute('aria-expanded', String(open)); if (open) { const f = m.querySelector('button, a'); f && f.focus(); } },
    tab: (el) => { const st = S.get(); st.ui.tabs = st.ui.tabs || {}; st.ui.tabs[el.dataset.g] = el.dataset.t; render(); const b = document.getElementById('tab-' + el.dataset.g + '-' + el.dataset.t); if (b) b.focus(); },
    'role-menu': (el) => { const dmn = $('#demo-menu'); if (dmn) dmn.hidden = true; const m = $('#role-menu'); const open = m.hidden; m.hidden = !open; el.setAttribute('aria-expanded', String(open)); if (open) { setNotif(false); const f = m.querySelector('[aria-checked="true"]') || m.querySelector('button'); f && f.focus(); } },
    role: (el) => { closeMenus(); const d = el.closest('dialog'); if (d && d.id === 'more-sheet') closeDialog(d); A.setRole(el.dataset.role); },
    reset: () => { closeMenus(); confirmThen('reset', {}, 'Reset the workspace?', 'Everything returns to Friday, October 23, 09:40. Export the workspace from the Test lab first if you want to keep this state.', 'Reset demo'); },
    more: () => showDlg($('#more-sheet')),
    'close-dialog': (el) => closeDialog(el),
    'close-dialog-nav': (el) => closeDialog(el),
    party: (el) => openParty(el.dataset.id),
    'party-approve': (el) => A.approveParty(el.dataset.id),
    'party-delete': (el) => confirmThen('party-delete', { id: el.dataset.id }, 'Delete ' + S.get().parties[el.dataset.id].name + '?', 'Only counterparties that no trade, bid or load references can be deleted. You can undo this.', 'Delete'),
    'verify-carrier': (el) => A.verifyCarrier(el.dataset.id),
    search: (el) => { const d = el.closest('dialog'); if (d) closeDialog(d); closeMenus(); TD.search.open(); },
    notif: () => { const open = !notifOpen; setNotif(open); if (open) { const m = $('#role-menu'); if (m) m.hidden = true; const f = $('#notif-panel a, #notif-panel button'); if (f) f.focus(); } },
    'notif-read': () => { A.markNotifsRead(); setNotif(true); },
    'notif-go': () => { setNotif(false); },
    lab: (el) => { const d = el.closest('dialog'); if (d && d.id !== 'lab-dlg') closeDialog(d); closeMenus(); openLab(el.dataset.sec, el.dataset.id); },
    'lab-jump': (el) => jumpLab(el.dataset.sec),
    'lab-go': () => closeDialog($('#lab-dlg')),
    undo: () => A.undo(),

    ev: (el) => { S.get().ui.evKey = el.dataset.key; render(); const m = document.querySelector('mark.src-mark[data-key="' + el.dataset.key + '"]'); if (m) m.scrollIntoView({ block: 'nearest' }); },
    'ex-accept': (el) => A.acceptField(el.dataset.x, el.dataset.key),
    'ex-accept-all': (el) => A.acceptAll(el.dataset.x),
    'create-from': (el) => { const id = A.createFromExtraction(el.dataset.x); if (id) { if (/^TR-/.test(id)) TD.router.go('#/trade/' + id + '/price'); else if (/^FQ-/.test(id)) { const fq = S.get().fquotes[id]; TD.ui.toast('Carrier quote ' + id + ' ' + S.fqWhere(fq) + '.', 'ok'); } else TD.ui.toast('Created bid ' + id + '. It now appears in the Book and in every matching price ladder.', 'ok'); } },
    'reply-mode': (el) => A.setReplyMode(el.dataset.x, el.dataset.mode),
    'fq-attach': (el) => { if (A.attachFq(el.dataset.fq, el.dataset.t)) TD.ui.toast('Quote ' + el.dataset.fq + ' ' + S.fqWhere(S.get().fquotes[el.dataset.fq]) + '.', 'ok'); },
    'msg-cancel-load': (el) => { const ex = A.openCancellation(el.dataset.id); if (ex) TD.router.go('#/load/' + el.dataset.id); },
    'msg-eta': (el) => { const r = A.applyEta(el.dataset.id, Number(el.dataset.at), (S.get().extraction[el.dataset.x] || {}).msg || 'pasted email'); if (r) TD.ui.toast(el.dataset.id + ': new ETA ' + u.hhmm(Number(el.dataset.at) % 1440) + '. ' + r.text, r.level === 'ok' ? 'ok' : 'warn'); },
    'ex-use-party': (el) => A.setValue(el.dataset.x, 'party', el.dataset.id),
    'ex-intent': (el) => A.setValue(el.dataset.x, 'intent', el.dataset.v),
    'msg-resched': (el) => { const ex = S.get().extraction[el.dataset.x]; const imp = A.reschedulePickup(el.dataset.id, Number(el.dataset.at), (ex && ex.msg) || 'pasted email', ex && ex.values.sameRate); if (imp) { if (ex) { ex.created = el.dataset.id; S.emit({ soft: true }); } TD.ui.toast(el.dataset.id + ' pickup moved. ' + imp.text, imp.outsideContract || imp.layover ? 'warn' : 'ok'); } },
    'msg-delay': (el) => { if (A.delayLoad(el.dataset.id, Number(el.dataset.m))) TD.ui.toast('Logged a ' + el.dataset.m + ' min delay on ' + el.dataset.id + '.', 'ok'); },
    'ai-extract': (el) => { const key = el.dataset.x; const st = S.get(); const m = st.messages.find((x) => x.id === key); const text = m ? m.body : (st.extraction[key] && st.extraction[key].parsed.text) || ''; TD.ai.extract(key, text, m || null).then((r) => TD.ui.toast(r.ok ? 'Live AI proposal ready. Review every field before creating anything.' : 'Live AI failed: ' + (r.error || 'unavailable') + ' Rules used instead.', r.ok ? 'ok' : 'warn')); },
    'ai-reply': (el) => { const key = el.dataset.x; const m = S.get().messages.find((x) => x.id === key); TD.ai.reply(key, m || null); },
    'ai-reply-clear': (el) => { const ex = S.get().extraction[el.dataset.x]; if (ex) { ex.reply = null; ex.replyNotice = null; S.emit({ soft: true }); } },
    'copy-reply': (el) => { const t = document.getElementById('reply-' + el.dataset.x); copy(t ? t.textContent : '', 'Reply copied. Paste it into your email; TradeDesk did not send it.'); },
    'apply-revision': (el) => { if (A.applyRevision(el.dataset.id)) TD.ui.toast('Revision applied. The email stays attached as evidence.', 'ok', { undo: true }); },
    'flag-review': (el) => A.reviewFlag(el.dataset.id),

    'paste-parse': () => { const t = $('#paste-text'); if (!t || !t.value.trim()) { TD.ui.toast('Paste a message first.', 'warn'); return; } A.setPaste(t.value, 'Pasted text'); },
    'paste-ai': () => { const t = $('#paste-text'); if (!t || !t.value.trim()) { TD.ui.toast('Paste a message first.', 'warn'); return; } const key = A.setPasteText(t.value, 'Pasted text'); S.get().ui.aiBusy['PASTE:extract'] = true; TD.ai.extract(key, t.value, null).then((r) => { delete S.get().ui.aiBusy['PASTE:extract']; S.emit({ soft: true }); TD.ui.toast(r.ok ? 'Live AI proposal ready. Review every field.' : 'Live AI failed: ' + (r.error || 'unavailable') + ' Rules used instead.', r.ok ? 'ok' : 'warn'); }); },
    'paste-sample': (el) => { const s = V.SAMPLES[Number(el.dataset.i)]; A.setPaste(s[1], 'Sample: ' + s[0]); },
    'paste-clear': () => A.clearPaste(),

    form: (el) => openForm(el.dataset.form, el.dataset),
    'select-demand': (el) => A.selectDemand(tid(), el.dataset.d),
    scen: (el) => { const tr = S.get().trades[tid()]; A.setScenario(tid(), el.dataset.p === 'down' ? E.downside(tr) : { moisture: tr.moisture, freightPct: 0 }); },
    unit: (el) => A.setUnit(el.dataset.u),
    alloc: (el) => A.setAlloc(tid(), el.dataset.d, Number(el.dataset.n)),
    'confirm-supplier': () => A.confirmSupplier(tid()),
    approve: () => A.approveTrade(tid()),
    revise: () => { if (A.revisePlan(tid())) TD.router.go('#/trade/' + tid() + '/price'); },
    'send-conf': () => A.sendConfirmations(tid()),
    'print-pc': () => { const pa = $('#print-area'); pa.innerHTML = V.confirmationDoc(S.get(), S.get().trades[tid()]); try { window.print(); } catch (e) { TD.ui.toast('Printing is unavailable here.', 'warn'); } },
    rfq: () => A.sendRfq(tid()),
    'refresh-quote': (el) => A.refreshQuote(tid(), el.dataset.c),
    requote: () => A.requoteAll(tid()),
    award: (el) => A.award(tid(), el.dataset.c),
    appts: () => A.requestAppts(tid()),
    'cancel-trade': () => confirmThen('cancel-trade', { id: tid() }, 'Cancel ' + tid() + '?', 'Allocations are reversed, booked loads released and confirmations marked cancelled. Loads already moving block cancellation. You can undo this.', 'Cancel trade'),

    'ex-approve': (el) => A.approveReplacement(el.dataset.ex),
    'ex-requote': (el) => A.requoteException(el.dataset.ex),
    'copy-update': (el) => { const t = document.getElementById('update-' + el.dataset.id); copy(t ? t.textContent : '', 'Update copied for the supplier and the buyer. Not sent.'); },
    'copy-receiver': (el) => { const st = S.get(); const l = E.load(st, el.dataset.id); const tr = st.trades[l.trade]; const b = E.party(st, E.demand(st, l.demand).buyer); copy('Bonjour ' + (b.contact || '').split(' ')[0] + ', le voyage ' + l.id + ' (' + (D.commodities[tr.commodity] || {}).fr + ', ' + String(u.t1(l.planned)).replace('.', ',') + ' t) de ' + V.pname(tr.supplier) + ' arrivera vers ' + u.hhmm(l.etaAt % 1440) + '. Pouvez-vous garder la barrière ouverte jusqu’à ' + u.hhmm((l.cutoffAt + 15) % 1440) + ' au besoin? Merci, ' + D.users.logistics.first, 'Note copied for ' + b.short + '. Not sent.'); A.markWatch(l.id); },
    'copy-bol': (el) => copy('Bonjour, pouvez-vous m’envoyer la photo du connaissement (BOL) du voyage ' + el.dataset.id + '? Merci.', 'Driver reminder copied. Not sent.'),
    advance: (el) => A.advanceLoad(el.dataset.id),
    'cancel-load': (el) => confirmThen('cancel-load', { id: el.dataset.id }, 'Cancel ' + el.dataset.id + '?', 'Only booked loads can be cancelled. The reservation is reversed and the sale delivers short unless you replace it. You can undo this.', 'Cancel load'),
    'load-filter': (el) => { S.get().ui.loadFilter = el.dataset.f; S.save(); render(); },
    'clock-adv': (el) => { const n0 = lastId(); A.advance(Number(el.dataset.m)); const n = notifySince(n0); TD.ui.toast('Clock now ' + u.dayShort(S.get().now) + ' ' + u.hhmm(S.get().now) + ': ' + (n.all - 1) + ' event' + (n.all - 1 === 1 ? '' : 's') + (n.attn ? ', ' + n.attn + ' for attention' : '') + '.', 'ok'); },
    'clock-to': () => { const t = u.fromInputs(val('lab-to-d'), val('lab-to-t') || '09:00'); const n0 = lastId(); if (A.advanceTo(t)) { const n = notifySince(n0); TD.ui.toast('Clock now ' + u.dayShort(S.get().now) + ' ' + u.hhmm(S.get().now) + ': ' + (n.all - 1) + ' events, ' + n.attn + ' for attention.', 'ok'); } },
    'late-ticket': (el) => A.lateTicket(el.dataset.id),

    'settle-approve': (el) => A.approveSettlement(el.dataset.id),
    'settle-export': (el) => { const id = el.dataset.id; const f = A.exportSettlement(id); if (f) { const okd = u.download(f, V.settleCsv(S.get(), id), 'text/csv;charset=utf-8'); TD.ui.toast(okd ? 'Downloaded ' + f + '. Not posted: waiting for accounting.' : 'Download blocked by the browser.', okd ? 'ok' : 'warn'); } },
    'settle-ack': (el) => A.ackSettlement(el.dataset.id),
    claim: (el) => A.resolveClaim(el.dataset.id, el.dataset.v),
    pay: (el) => A.recordPayment(el.dataset.id),
    reminder: (el) => { const st = S.get(); const r = E.receivables(st).find((x) => x.ref === el.dataset.id); const p = E.party(st, r.party) || {}; copy((p.lang === 'en' ? 'Hello ' + (p.contact || '').split(' ')[0] + ', a friendly reminder that invoice ' + r.ref + ' (' + u.cad(u.toCents(r.amount)) + ') was due ' + u.dayShort(r.due) + '. Could you confirm the payment date? Thank you, ' + D.users.finance.first : 'Bonjour ' + (p.contact || '').split(' ')[0] + ', petit rappel : la facture ' + r.ref + ' (' + u.cad(u.toCents(r.amount)) + ') était due le ' + u.dayShort(r.due) + '. Pouvez-vous me confirmer la date de paiement? Merci, ' + D.users.finance.first), 'Reminder copied. Not sent.'); A.draftReminder(r.ref); },

    'demand-withdraw': (el) => confirmThen('demand-withdraw', { id: el.dataset.id }, 'Withdraw ' + el.dataset.id + '?', 'Unapproved plans using it must find another buyer; approvals the buyer has not acknowledged are invalidated. You can undo this.', 'Withdraw'),
    'demand-delete': (el) => confirmThen('demand-delete', { id: el.dataset.id }, 'Delete ' + el.dataset.id + '?', 'Only bids with no reservations can be deleted. You can undo this.', 'Delete'),
    'book-export': () => { const okd = u.download('tradedesk-book-' + u.toDateInput(S.get().now) + '.csv', V.bookCsv(S.get()), 'text/csv;charset=utf-8'); TD.ui.toast(okd ? 'Book exported as CSV.' : 'Download blocked by the browser.', okd ? 'ok' : 'warn'); },
    'policy-submit': () => A.submitPolicy(),
    'policy-approve': () => A.approvePolicy(),
    'policy-withdraw': () => A.withdrawPolicy(),

    scenario: (el) => { if (TD.tour) TD.tour.stop(true); V._ladderSeen = false; A.loadScenario(el.dataset.id); route = parse(location.hash); render({ nav: false }); renderLab(); TD.ui.toast('Loaded “' + S.SCENARIOS.find((s) => s.id === el.dataset.id).label + '”.', 'ok'); },
    'ev-cancel': () => { const id = val('ev-cancel'); const ex = A.openCancellation(id); if (ex) TD.ui.toast('Carrier cancelled ' + id + ': incident ' + ex + ' opened with prepared alternatives.', 'ok'); },
    'ev-delay': () => A.delayLoad(val('ev-delay'), Number(val('ev-delay-m'))),
    'ev-bid': () => { const id = val('ev-bid'); const d = E.demand(S.get(), id); const p = numv('ev-bid-p'); const q = numv('ev-bid-q'); if (p == null && q == null) { TD.ui.toast('Enter a new price or quantity.', 'warn'); return; } const okk = d.priceType === 'basis' ? (p != null ? A.setBasis(id, p) : true) && (q != null ? A.updateDemand(id, { qty: q }, true) : true) : A.injectBidRevision(id, p, q); if (okk) TD.ui.toast(E.party(S.get(), d.buyer).short + ' revised ' + id + '.', 'ok'); },
    'ev-wd': () => { const id = val('ev-wd'); if (A.injectBidWithdraw(id)) TD.ui.toast(id + ' withdrawn by the buyer.', 'ok'); },
    'ev-fut': () => { const id = val('ev-fut'); const dlt = Number(val('ev-fut-d')); if (A.moveFutures(id, dlt)) TD.ui.toast(id + (dlt ? (dlt > 0 ? ' +' : ' ') + dlt : ' refreshed') + ': basis bids and mark-to-market re-priced.', 'ok'); },
    'ev-rev': () => { const id = A.injectSupplierRevision(val('ev-rev'), Number(val('ev-rev-l')), Number(val('ev-rev-m')), val('ev-rev-lang')); if (id) TD.ui.toast('Revision email ' + id + ' is in the inbox.', 'ok'); },
    'ev-late': () => A.lateTicket(val('ev-late')),
    'ev-mail': () => { const st = S.get(); const p = st.parties[val('ev-mail-p')]; const body = val('ev-mail-b').trim(); if (!body) { TD.ui.toast('Write the email body.', 'warn'); return; } const id = A.injectEmail({ from: (p.contact || p.name).replace(/^Dispatch:\s*/, ''), org: p.name, party: p.id, subject: val('ev-mail-k') === 'Buyer demand' ? 'Demande' : 'Offre', lang: /[àâçéèêëîïôûùüÿœ]|\b(je|j’|bonjour|voyages?)\b/i.test(body) ? 'fr' : 'en', kind: val('ev-mail-k'), body: body, originHint: p.kind === 'Supplier' ? { town: p.town, note: 'usual pickup' } : null }); TD.ui.toast('Email ' + id + ' delivered to the inbox.', 'ok'); },
    'sim-delivery': () => { const id = val('sim-load'); if (A.simulateDelivery(id, { originNet: numv('sim-on'), destNet: numv('sim-rn'), originMoisture: val('sim-om'), destMoisture: numv('sim-rm'), testWeight: numv('sim-tw'), grade: val('sim-gr'), waitMins: numv('sim-wait'), invoiceBasis: val('sim-ib'), invoiceQty: numv('sim-iq') })) { closeDialog($('#lab-dlg')); TD.router.go('#/settle/' + id); } },
    'ws-export': () => { const okd = u.download('tradedesk-workspace-' + u.toDateInput(S.get().now) + '-' + u.hhmm(S.get().now).replace(':', '') + '.json', S.exportJson(), 'application/json'); TD.ui.toast(okd ? 'Workspace exported as JSON.' : 'Download blocked by the browser.', okd ? 'ok' : 'warn'); }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) {
      if (!e.target.closest('.who') && !e.target.closest('.notif') && !e.target.closest('.demo') && !e.target.closest('details')) closeMenus();
      const dlg = e.target.closest('dialog');
      if (dlg && e.target === dlg) closeDialog(dlg);
      return;
    }
    if (el.disabled) return;
    const fn = act[el.getAttribute('data-act')];
    const isNavLink = el.tagName === 'A' && /^#\//.test(el.getAttribute('href') || '');
    if (fn) { if (!isNavLink) e.preventDefault(); if (isNavLink) { const d = el.closest('dialog'); if (d) closeDialog(d); } fn(el, e); }
  });

  /* Range inputs update the live region without replacing the slider being dragged. */
  function liveScenario(el) {
    const st = S.get(); const tr = st.trades[route.id]; if (!tr) return;
    tr.scenario = tr.scenario || { moisture: tr.moisture, freightPct: 0 };
    if (el.dataset.input === 'sc-moist') tr.scenario.moisture = Number(el.value);
    if (el.dataset.input === 'sc-fr') tr.scenario.freightPct = Number(el.value);
    const o1 = $('#sc-moist-o'); if (o1) o1.textContent = tr.scenario.moisture != null ? tr.scenario.moisture.toFixed(1) + '%' : '—';
    const o2 = $('#sc-fr-o'); if (o2) o2.textContent = (tr.scenario.freightPct > 0 ? '+' : '') + tr.scenario.freightPct + '%';
    const live = $('#price-live'); if (live && V.priceLive) live.innerHTML = V.priceLive(st, tr);
    if (!st.session.comparedAt && st.session.offerOpenedAt) st.session.comparedAt = Date.now();
  }
  function livePolicy(el) {
    const st = S.get();
    if (st.policy.status === 'simulation') return;
    st.policy[el.dataset.k] = Number(el.value);
    const out = $('#pol-' + el.dataset.k + '-o');
    if (out) out.textContent = el.dataset.k === 'maxExtra' ? 'CAD ' + el.value : el.dataset.k === 'minContrib' ? u.rate(Number(el.value)) + '/t' : el.value + ' min';
    const live = $('#pol-live'); if (live && V.policyLive) live.innerHTML = V.policyLive(st);
  }
  const NUMF = ['qtyValue', 'payload', 'moisture', 'testWeight', 'price', 'basisValue', 'rate', 'fsc', 'delay'];
  document.addEventListener('input', (e) => {
    const el = e.target; const k = el.dataset && el.dataset.input;
    if (k === 'sc-moist' || k === 'sc-fr') liveScenario(el);
    if (k === 'policy') livePolicy(el);
    if (k === 'log-q') { TD.labUi.logQ = el.value; renderLab(); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    const form = el.closest && el.closest('form[data-form]');
    if (form) { applyShow(form); return; }
    const k = el.dataset && el.dataset.input;
    if (!k) return;
    if (k === 'sc-moist' || k === 'sc-fr') { liveScenario(el); S.emit({ soft: true }); }
    else if (k === 'policy') { livePolicy(el); S.emit({ soft: true }); }
    else if (k === 'exv') {
      const f = el.dataset.f; let v = el.value;
      if (f === 'validUntilDate' || f === 'validUntilTime') {
        const d = (document.getElementById('exv-validUntilDate') || {}).value; const t = (document.getElementById('exv-validUntilTime') || {}).value || '17:00';
        A.setValue(el.dataset.x, 'validUntil', d ? u.fromInputs(d, t) : null); return;
      }
      if (f === 'pickupDate' || f === 'pickupTime') {
        const d = (document.getElementById('exv-pickupDate') || {}).value; const t = (document.getElementById('exv-pickupTime') || {}).value || '07:00';
        A.setValue(el.dataset.x, 'pickupAt', d ? u.fromInputs(d, t) : null); return;
      }
      if (f === 'rsToDate' || f === 'rsToTime') {
        const d = (document.getElementById('exv-rsToDate') || {}).value; const t = (document.getElementById('exv-rsToTime') || {}).value || '07:00';
        A.setValue(el.dataset.x, 'rsTo', d ? u.fromInputs(d, t) : null); return;
      }
      if (/^optPrice\d$/.test(f)) { const ex = S.get().extraction[el.dataset.x]; const ob = (ex.values.basisOptions || []).map((o) => Object.assign({}, o)); const i = Number(f.slice(-1)); if (ob[i]) ob[i].price = v.trim() === '' ? null : Number(v); A.setValue(el.dataset.x, 'basisOptions', ob); return; }
      if (f === 'eta') { A.setValue(el.dataset.x, 'eta', v ? u.fromInputs(u.toDateInput(S.get().now), v) : null); return; }
      if (NUMF.includes(f)) v = v.trim() === '' ? null : Number(v);
      else if (f === 'windowStart' || f === 'windowEnd') v = v ? u.fromInputs(v, f === 'windowEnd' ? '23:59' : '00:00') : null;
      else if (v === '') v = null;
      A.setValue(el.dataset.x, f, v);
    }
    else if (k === 'exopt') A.chooseOption(el.dataset.ex, el.value);
    else if (k === 'fq-target') A.setFqTarget(el.dataset.x, el.value);
    else if (k === 'treat') A.treat(el.dataset.id, el.dataset.key, el.value);
    else if (k === 'cap') { u.caps[el.dataset.k] = el.checked; if (el.dataset.k === 'storage' && el.checked) S.save(); render(); TD.ui.toast((el.checked ? 'On: ' : 'Off: ') + el.closest('label').querySelector('strong').textContent + '.', 'ok'); }
    else if (k === 'lab-load') { TD.labUi.delivery = el.value; renderLab(); }
    else if (k === 'log-k') { TD.labUi.logKind = el.value; renderLab(); }
    else if (k === 'bol' && el.files && el.files[0]) {
      const f = el.files[0]; const id = el.dataset.id;
      f.arrayBuffer().then(sha256).then((hash) => A.attachBol(id, { name: f.name, size: f.size, type: f.type || 'unknown', hash: hash })).catch(() => TD.ui.toast('Could not read that file.', 'warn'));
    } else if (k === 'paste-file' && el.files && el.files[0]) {
      const f = el.files[0]; readText(f, (t) => A.setPaste(t, 'File: ' + f.name));
    } else if (k === 'ws-import' && el.files && el.files[0]) {
      const f = el.files[0]; readText(f, (t) => { if (S.importJson(t)) { route = parse(location.hash); render(); renderLab(); TD.ui.toast('Imported ' + f.name + '.', 'ok'); } });
    }
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]'); if (!form || !formCtx) return;
    e.preventDefault();
    const st = S.get();
    const res = V.formValues(st, formCtx.kind, formCtx.ds, form);
    const err = form.querySelector('#form-err');
    if (res.errors.length) { if (err) err.textContent = res.errors.join(' '); const bad = form.querySelector(':invalid'); if (bad) bad.focus(); return; }
    const out = V.formSpec(formCtx.kind).submit(res.values, formCtx.ds);
    if (out) {
      const kind = formCtx.kind; const formCtxDs = formCtx.ds;
      closeDialog(form);
      formCtx = null;
      if (kind === 'demand-new' && typeof out === 'string') TD.ui.toast('Created ' + out + '. It appears in the Book and in every matching price ladder.', 'ok');
      if (kind === 'party-new' && typeof out === 'string') {
        const x = formCtxDs && formCtxDs.x;
        if (x && S.get().extraction[x]) { A.setValue(x, 'party', out); TD.ui.toast('Created ' + S.get().parties[out].name + ' (pending ' + (S.get().parties[out].kind === 'Carrier' ? 'logistics' : 'finance') + ' approval) and linked it to this message.', 'ok'); }
        else { TD.ui.toast('Created ' + S.get().parties[out].name + ' (pending approval).', 'ok'); openParty(out); }
      }
      if (/-edit$/.test(kind) || kind === 'benchmark' || kind === 'freight-manual' || kind === 'quote-manual') TD.ui.toast('Saved. The change is logged.', 'ok', /-edit$/.test(kind) ? { undo: true } : null);
    } else if (err && !err.textContent) err.textContent = 'Not saved: see the message above.';
  });
  document.addEventListener('dragover', (e) => { const z = e.target.closest && e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('is-over'); } });
  document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-drop]'); if (z) z.classList.remove('is-over'); });
  document.addEventListener('drop', (e) => {
    const z = e.target.closest && e.target.closest('[data-drop]'); if (!z) return;
    e.preventDefault(); z.classList.remove('is-over');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) readText(f, (t) => A.setPaste(t, 'Dropped file: ' + f.name));
    else { const t = e.dataTransfer.getData('text'); if (t) A.setPaste(t, 'Dropped text'); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = $('#role-menu'); if (m && !m.hidden) { closeMenus(); const b = $('#who-btn'); b && b.focus(); }
      const dm = $('#demo-menu'); if (dm && !dm.hidden) { closeMenus(); const b = $('#demo-btn'); b && b.focus(); }
      document.querySelectorAll('details.ii[open], details.nav-more[open]').forEach((d) => { d.open = false; });
      if (notifOpen) { setNotif(false); const b = $('#notif-btn'); b && b.focus(); }
    }
  });

  /* ---------- Boot ---------- */
  TD.app = { openParty: openParty, openForm: openForm, openLab: openLab, doReset: doReset, render: render };
  S.load();
  S.subscribe((info) => {
    if (info && info.reset) { route = parse(location.hash); render({ nav: false }); return; }
    render();
  });
  prepare(route);
  render({ nav: true, keepFocus: true });
  afterNav();
  if (TD.tour) TD.tour.boot();
})();
