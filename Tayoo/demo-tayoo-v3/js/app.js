/* Tayoo V3 — app controller: hash router, rendering, event delegation, the request → plan flow (rules or live AI),
   entity forms, global search, the Test lab drawer and workspace import/export. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});
  var R = T.render;
  var $ = function (id) { return document.getElementById(id); };
  var S = function () { return T.store.state; };
  // The phone app is the product on every screen: on a desktop it sits in a device frame, so there is no desktop layout.
  var desktopMQ = { matches: false };
  var A = (T.app = {});
  var esc = T.esc;

  /* ---------------- routing ---------------- */
  var VIEWS = ['today', 'calendar', 'clients', 'listings', 'cma', 'files', 'inbox', 'ledger', 'activity', 'settings', 'more'];
  var WIDE = ['calendar', 'listings', 'cma', 'files', 'inbox'];
  function route() {
    var hsh = (location.hash || '#/').replace(/^#/, '');
    var parts = hsh.split('/').filter(Boolean);
    var view = parts[0] || '';
    if (VIEWS.indexOf(view) < 0) view = '';
    return { view: view, id: parts[1] ? decodeURIComponent(parts[1]) : null };
  }
  A.route = route;
  function viewHTML(r) {
    var v = r.view || 'today';
    if (v === 'clients') return r.id ? R.client(r.id) : R.clients();
    if (v === 'calendar') return R.calendar(r.id);
    if (v === 'listings') return R.listings(r.id);
    if (v === 'cma') return R.cma(r.id);
    if (v === 'files') return R.files(r.id);
    if (v === 'inbox') return R.inbox(r.id);
    if (v === 'ledger') return R.ledger();
    if (v === 'activity') return R.activity();
    if (v === 'settings') return R.settings();
    if (v === 'more') return R.more();
    return R.today();
  }
  function navOf(view) {
    if (['listings', 'cma', 'files', 'inbox', 'ledger', 'activity', 'settings', 'more'].indexOf(view) > -1) return desktopMQ.matches ? view : 'more';
    return view;
  }

  /* ---------------- focus-preserving swap ---------------- */
  var ATTRS = ['data-edit', 'data-filter', 'data-set', 'data-style', 'data-act', 'data-path', 'data-val', 'data-sample', 'data-client', 'data-f', 'data-task', 'data-o', 'data-tx', 'data-key', 'data-choice', 'data-ev', 'data-listing', 'data-row', 'data-receipt', 'data-mode', 'data-lf', 'data-cma', 'data-comp', 'data-k', 'data-cap', 'data-role', 'data-lab', 'data-min', 'data-preset', 'data-cond', 'data-status', 'data-n', 'data-note', 'name', 'value', 'id'];
  function cssEsc(v) { return window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"'); }
  function focusKey(n) {
    var sel = n.tagName.toLowerCase();
    ATTRS.forEach(function (a) { var v = n.getAttribute(a); if (v != null && !(a === 'value' && !(n.type === 'radio' || n.type === 'checkbox'))) sel += '[' + a + '="' + cssEsc(v) + '"]'; });
    var card = n.closest('[data-card]');
    if (card && card !== n) sel = '[data-card="' + card.getAttribute('data-card') + '"] ' + sel;
    return sel;
  }
  function swap(el, html, keepScroll) {
    if (el._html === html) return false;
    var ae = document.activeElement, key = null, sel = null;
    if (ae && ae !== document.body && el.contains(ae)) {
      key = focusKey(ae);
      try { sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { sel = null; }
    }
    var st = el.scrollTop;
    el.innerHTML = html; el._html = html;
    if (keepScroll !== false) el.scrollTop = st;
    if (key) {
      var n = null;
      try { n = el.querySelector(key); } catch (e) { n = null; }
      if (n) { try { n.focus({ preventScroll: true }); if (sel && sel[0] != null && n.setSelectionRange) n.setSelectionRange(sel[0], sel[1]); } catch (e) { /* ignore */ } }
    }
    return true;
  }
  A.swap = swap;
  // keys, budgets and killswitches live on the hub's API monitor; the app only shows its status
  function fillLAI() {}

  /* ---------------- render ---------------- */
  var lastRoute = null, lastAI = null;
  A.render = function () {
    if (A.mute) return;
    var s = S(), r = route(), desk = desktopMQ.matches;
    document.body.classList.toggle('is-desk', desk);
    document.body.classList.toggle('is-wide', desk && WIDE.indexOf(r.view) > -1);
    document.body.classList.toggle('has-thread', s.thread.length > 0);
    document.body.classList.toggle('is-shadow', s.settings.mode === 'shadow');
    document.body.classList.toggle('is-coord', s.role === 'coordinator');
    swap($('top'), R.top());
    swap($('front'), R.front());
    renderThread();
    var aiOn = T.ai.on();
    if (!$('composer') || aiOn !== lastAI) { lastAI = aiOn; A.renderComposer(); }
    var html = viewHTML(r);
    var routeKey = r.view + '/' + (r.id || '');
    var target = $('page');
    var changed = routeKey !== lastRoute;
    swap(target, html, !changed);
    if (changed) target.scrollTop = 0;
    var showPage = !desk && !!r.view;
    $('page').hidden = !showPage;
    $('convo').hidden = showPage;
    var nv0 = navOf(r.view);
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var nv = a.getAttribute('data-nav');
      var on = desk ? (nv === r.view || (nv === 'today' && !r.view)) : ((nv === 'talk' && !r.view) || nv === nv0);
      a.classList.toggle('is-on', on);
      if (on && nv !== 'talk') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var bell = document.querySelectorAll('[data-nav-count="inbox"]'), un = T.unread();
    bell.forEach(function (b) { b.textContent = un ? String(Math.min(99, un)) : ''; b.hidden = !un; });
    if (changed && lastRoute !== null) {
      var t = target.querySelector('.v-title');
      if (t && (r.view || !desk) && !$('lab').contains(document.activeElement)) { try { t.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      if (!r.view && !desk) { var th = $('thread'); if (th) th.scrollTop = th.scrollHeight; }
    }
    lastRoute = routeKey;
    fillLAI(target);
    if (A.labOpen) { swap($('lab-body'), R.lab()); fillLAI($('lab-body')); }
    if (T.tour && T.tour.reposition) T.tour.reposition();
  };

  var nodes = {};
  function msgKey(m) {
    var s = S();
    if (m.kind === 'card') { var c = s.cards[m.cardId]; return m.rev + ':' + (c ? c.rev : 0) + ':' + s.settings.mode + ':' + s.role + ':' + T.ai.on(); }
    if (m.kind === 'receipt') { var r = s.receipts.filter(function (x) { return x.id === m.receiptId; })[0]; return m.rev + ':' + (r ? (r.undone || '') + r.steps.length : 0); }
    return m.rev + ':' + (m.done || 0) + ':' + m.kind;
  }
  function renderThread() {
    var s = S(), ol = $('msgs'), present = {}, appended = null;
    s.thread.forEach(function (m, idx) {
      present[m.id] = 1;
      var key = msgKey(m), node = nodes[m.id];
      if (!node || node._key !== key) {
        var tmp = document.createElement('ol');
        var html = R.message(m);
        if (node) {
          var ae = document.activeElement, fk = null, sel = null;
          if (ae && node.contains(ae)) { fk = focusKey(ae); try { sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { /* ignore */ } }
          tmp.innerHTML = html;
          var nn = tmp.firstElementChild;
          node.replaceWith(nn); node = nn;
          if (fk) { var f = null; try { f = document.querySelector('#msgs ' + fk); } catch (e) { /* ignore */ } if (f) { try { f.focus({ preventScroll: true }); if (sel && sel[0] != null && f.setSelectionRange) f.setSelectionRange(sel[0], sel[1]); } catch (e) { /* ignore */ } } }
        } else {
          tmp.innerHTML = html;
          node = tmp.firstElementChild;
          appended = node;
        }
        node._key = key; nodes[m.id] = node;
      }
      if (ol.children[idx] !== node) ol.insertBefore(node, ol.children[idx] || null);
    });
    Object.keys(nodes).forEach(function (id) { if (!present[id]) { nodes[id].remove(); delete nodes[id]; } });
    if (appended && !A.silentAppend) {
      var th = $('thread');
      requestAnimationFrame(function () {
        var isCard = appended.classList.contains('msg-card');
        var top = appended.offsetTop - (isCard ? 12 : th.clientHeight - appended.offsetHeight - 24);
        th.scrollTo({ top: Math.max(0, isCard ? top : th.scrollHeight), behavior: T.reduced() ? 'auto' : 'smooth' });
      });
    }
  }
  A.resetThreadNodes = function () { Object.keys(nodes).forEach(function (id) { nodes[id].remove(); delete nodes[id]; }); };

  A.renderComposer = function () {
    $('composer-wrap').innerHTML = R.composer();
    autosize($('composer-input'));
  };
  function autosize(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight + 2, window.innerHeight * 0.32) + 'px';
  }

  /* ---------------- toasts & speaking ---------------- */
  var toastT = 0;
  A.toast = function (msg, undo) {
    var t = $('toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button type="button" class="toast-b" data-act="toast-undo">' + esc(undo.label || 'Undo') + '</button>' : '');
    A._undo = undo ? undo.fn : null;
    t.classList.toggle('has-act', !!undo);
    t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); A._undo = null; }, undo ? 8000 : 3600);
  };
  A.onSpeaking = function (on) {
    var el = $('speaking');
    if (el) el.hidden = !on;
  };
  function toConvo() { if (!desktopMQ.matches && route().view) location.hash = '#/'; }

  /* ---------------- drafts & submit ---------------- */
  // A voice request goes straight to Tayoo; Edit takes it back into the composer and withdraws the plan
  A.sendVoice = function (text, source, lang) {
    toConvo();
    var before = S().thread.length;
    return A.submit(text, 'voice', source, lang).then(function (card) {
      var cardId = card && card.id;
      A.toast('Sent.', { label: 'Edit', fn: function () {
        var s = S();
        if (cardId && s.cards[cardId] && (s.cards[cardId].status === 'ready' || s.cards[cardId].status === 'awaiting' || s.cards[cardId].status === 'clarify')) { s.cards[cardId].status = 'cancelled'; s.cards[cardId].withdrawn = true; s.cards[cardId].rev++; }
        T.log('Voice request taken back for editing', 'draft');
        A.setDraft(text, 'voice', source, lang);
      } });
      return card;
    });
  };
  A.setDraft = function (text, kind, source, lang) {
    var s = S();
    s.draft = text; s.draftKind = kind; s.draftSource = source || null; s.draftLang = lang || null;
    T.store.save();
    toConvo();
    A.renderComposer();
    var ta = $('composer-input');
    if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { /* ignore */ } }
    A.render();
  };
  function workSteps(p) {
    var c = p.clientId && T.client(p.clientId), tx = p.txId && T.tx(p.txId);
    switch (p.intent) {
      case 'showing': return ['Matching the client' + (p.isCall ? '' : ' and property'), 'Reading ' + (c ? c.first + '’s' : 'the client’s') + ' memory and consent', 'Checking the authorized listing data', 'Building the plan'];
      case 'recovery': return ['Scanning ' + S().clients.length + ' contacts for promises, unanswered requests and silences', 'Checking consent for every match', 'Drafting one email per eligible contact'];
      case 'file': return ['Opening the ' + (tx ? tx.title : 'transaction') + ' file', 'Comparing dates across documents and your calendar'];
      case 'schedule': case 'reschedule': return ['Resolving the date and time', 'Checking your calendar and travel time'];
      case 'cancel': return ['Finding the appointment', 'Drafting a note to the client'];
      case 'task': return ['Resolving the date and time'];
      case 'listings': return ['Picking the listings', 'Checking email consent', 'Drafting the email'];
      case 'search': return ['Filtering the authorized listing export'];
      case 'cma': return ['Pulling comparable sales'];
      case 'note': return ['Matching the client', 'Comparing with what Tayoo remembers'];
      case 'brief': return ['Collecting the record'];
      default: return ['Reading your request'];
    }
  }
  function sampleChip(id) { var c = T.client(id === 'olivia' ? 'olivia' : id === 'tremblay' ? 'marc' : 'sarah'); return c && !c.deleted ? [{ sample: id }] : []; }
  function help(p) {
    if (p.question) return { text: p.question, chips: [] };
    if (p.unknownName && !p.clientId) {
      var nm = p.unknownName.split(' ');
      return { text: 'I don’t have a client called ' + p.unknownName + ', so I didn’t plan anything and didn’t guess a match. Do you want to add ' + p.unknownName + ' as a new client first? Then ask again.', chips: [{ act: 'new-client', label: 'Add ' + p.unknownName + ' as a client', first: nm[0], last: nm.slice(1).join(' ') }, { label: 'Open Clients', href: '#/clients' }] };
    }
    if (p.clientId && !p.ambiguous) {
      var c = T.client(p.clientId);
      return { text: 'I found ' + T.fullName(c) + ', but not what to do. I can brief you, save a note, book time or send listings.', chips: [{ label: 'Brief me on ' + c.first, text: 'Brief me on ' + c.first }, { label: 'Save a note about ' + c.first, text: 'Remember that ' + c.first + ' ' }, { label: 'Book a showing', text: 'Book a showing with ' + T.fullName(c) + ' ' }] };
    }
    if (['showing', 'schedule', 'reschedule', 'cancel', 'listings', 'note'].indexOf(p.intent) > -1) {
      var rec = T.pendingRecaps().map(function (a) { var cc = T.client(a.client); return { label: T.fullName(cc), text: T.fullName(cc) + ': ' + p.text }; });
      return { text: 'I couldn’t tell which client this is about, so I didn’t plan anything. Who is it? Use a name from your clients, or add them first.', chips: rec.concat([{ label: 'Open Clients', href: '#/clients' }, { label: 'New client', act: 'new-client' }]) };
    }
    return { text: 'I can recap a showing or a call for any client, book, move or cancel appointments, add a task, send or search listings, run a market evaluation, find follow-ups you owe, check a file, or save a note. Nothing in your message matched those yet.', chips: sampleChip('sarah').concat(sampleChip('recovery').length ? [{ sample: 'recovery' }] : [], [{ label: 'Search listings', text: 'Find condos in Saint-Roch under 480k' }, { label: 'Add a task', text: 'Remind me to ' }]) };
  }
  var NEEDS_CLIENT = ['showing', 'note', 'schedule', 'reschedule', 'cancel', 'listings'];
  function build(p, input) {
    var B = T.build;
    if (p.intent === 'brief') return B.brief(p);
    if (p.intent === 'recovery') return B.recovery(p, input);
    if (p.intent === 'file') return B.file(p, input);
    if (p.intent === 'search') return B.search(p);
    if (p.intent === 'cma') return B.cma(p);
    if (p.ambiguous && (NEEDS_CLIENT.indexOf(p.intent) > -1 || p.intent === 'clarify' || p.intent === 'task')) return B.clarifyClient(p, input);
    if (p.unknownName && !p.clientId && ['search', 'recovery', 'cma', 'file', 'brief'].indexOf(p.intent) < 0) return { help: help(p) };
    if (p.together && ['search', 'recovery', 'cma', 'file', 'brief'].indexOf(p.intent) < 0) return { help: { text: 'Your message names ' + p.together.map(function (id) { return T.fullName(T.client(id)); }).join(' and ') + ' together. I plan for one client at a time, so nothing was planned yet. Pick who this is for, then send the other one separately.', chips: p.together.map(function (id) { var cc = T.client(id), others = p.together.filter(function (o) { return o !== id; }).map(function (o) { return T.client(o); }); var t = p.text; others.forEach(function (o) { t = t.replace(new RegExp('\\s*(and|et|&|,|or|ou)\\s+' + o.first + '(\\s+' + o.last + ')?', 'i'), '').replace(new RegExp(o.first + '(\\s+' + o.last + ')?\\s*(and|et|&|,|or|ou)\\s+', 'i'), ''); }); return { label: 'Only ' + T.fullName(cc), text: t }; }) } };
    if (p.intent === 'task') return B.task(p, input);
    if ((p.intent === 'message' || p.intent === 'followup') && p.ambiguous) return B.clarifyClient(p, input);
    if ((p.intent === 'message' || p.intent === 'followup') && p.clientId) return B.multi(T.asCompound(p), input);
    if (!p.clientId || NEEDS_CLIENT.indexOf(p.intent) < 0) return { help: help(p) };
    return B[p.intent](p, input);
  }
  A.buildFor = build;
  // Several requests in one message: one plan with several parts (rules only, so the split stays transparent)
  function buildCompound(cp, input) {
    if (cp.otherClients && cp.otherClients.length && !cp.ambiguous) {
      // two clients in one message: one plan each, every part under the client it is about
      var outs = T.splitCompound(cp).map(function (sc) { var o = T.accountClauses(T.build.multi(sc, input), sc.text); o.card.pendingText = sc.text; return o; });
      var names = outs.map(function (o) { return T.fullName(T.client(o.card.clientId)); });
      return { cards: outs.map(function (o) { return o.card; }), outs: outs, reply: 'Your message is about ' + names.join(' and ') + ', so I made one plan for each. ' + outs.map(function (o) { return o.reply; }).join(' '), say: 'One plan for each client. Nothing happens until you approve.' };
    }
    if (cp.ambiguous) return T.build.clarifyClient(cp, input);
    if (!cp.clientId) return { help: help({ text: cp.text, intent: 'showing', unknownName: cp.unknownName }) };
    return T.build.multi(cp, input);
  }
  A.buildCompound = buildCompound;

  // Puts a builder result in the thread (shared by the composer, forms and Listings actions)
  function present(out, work, p) {
    var s = S();
    var say = out.say;
    if (out.help) {
      work.kind = 'text'; work.text = out.help.text; work.chips = out.help.chips; work.rev++;
      say = out.help.text;
    } else if (out.results) {
      work.kind = 'results'; work.text = out.reply; work.ids = out.results.ids; work.filters = out.results.filters; work.rev++;
    } else if (out.brief) {
      work.kind = 'text'; work.text = 'Here’s your briefing.'; work.rev++;
      T.addMessage({ role: 'tayoo', kind: 'brief', clientId: out.brief.clientId, lines: out.brief.lines });
    } else {
      // the card says the rest: one short line here, the full reply as its tooltip (and spoken, if replies are on)
      work.kind = 'text'; work.full = out.reply; work.text = out.cards ? out.cards.length + ' plans, one per client.' : out.card ? (out.card.type === 'clarify' ? 'Which one?' : out.card.unhandled && out.card.unhandled.length ? 'Here’s the plan. One part needs you.' : 'Here’s the plan.') : out.reply; work.chips = out.chips || null; work.rev++;
      (out.cards || []).forEach(function (cd) {
        s.cards[cd.id] = cd;
        cd.pending = { text: cd.pendingText || p.text, input: work._input, source: work._source };
        T.addMessage({ role: 'tayoo', kind: 'card', cardId: cd.id });
        T.log('Plan drafted: ' + cd.title + ' (by ' + T.actor() + ')', 'draft');
      });
      if (out.cards && out.cards.length) s.context = { clientId: out.cards[out.cards.length - 1].clientId, cardId: out.cards[out.cards.length - 1].id };
      if (out.card) {
        s.cards[out.card.id] = out.card;
        if (out.card.clientId) s.context = { clientId: out.card.clientId, cardId: out.card.id };
        out.card.pending = { text: p.text, input: work._input, source: work._source };
        T.addMessage({ role: 'tayoo', kind: 'card', cardId: out.card.id });
        T.log('Plan drafted' + (out.card.source && out.card.source.provenance && out.card.source.provenance.kind === 'ai' ? ' (live AI)' : '') + ': ' + out.card.title + ' (by ' + T.actor() + ')', 'draft');
      }
    }
    if (p.source && (p.source.kind === 'ai' || p.source.fallback)) work.pv = p.source;
    return say;
  }
  var busy = false;
  A.submit = function (text, input, source, lang, opts) {
    opts = opts || {};
    text = String(text || '').trim();
    if (!text || busy) return Promise.resolve();
    busy = true;
    var s = S();
    T.voice.hush();
    s.draft = ''; s.draftKind = null; s.draftSource = null;
    T.tick(1);
    var rp = T.parse(text), cp = T.parseCompound(text);
    var useAI = T.ai.on() && source !== 'sample' && !opts.rules && !cp && rp.intent !== 'message' && rp.intent !== 'followup';
    T.addMessage({ role: 'broker', kind: input === 'voice' ? 'voice' : 'text', text: rp.text, source: source, lang: rp.lang, by: T.actor() });
    var work = T.addMessage({ role: 'tayoo', kind: 'working', steps: useAI ? ['Sending your text to live AI (' + window.LiveAI.model + ')', 'Checking names, listings and dates against your records', 'Building the plan'] : cp ? ['Splitting your message into ' + cp.clauses.length + ' parts', 'Matching the client and the records in each part', 'Checking your calendar and consent', 'Building one plan'] : workSteps(rp), done: 0 });
    if (cp && T.ai.on() && source !== 'sample') work.note = 'Several requests: read by the rules, part by part.';
    work._input = input; work._source = source;
    T.store.commit();
    A.renderComposer();
    var i = 0;
    function stepTo(n) {
      if (i >= n) return Promise.resolve();
      return T.wait(opts.instant ? 40 : (T.reduced() ? 120 : 330)).then(function () { i++; work.done = i; work.rev++; T.store.commit(); return stepTo(n); });
    }
    var parsed;
    if (useAI) {
      parsed = T.ai.read(text).then(function (p) { return p; }, function (err) {
        var msg = window.LiveAI.describe(err);
        T.log('Live AI failed (' + msg + '); the rules read the request instead', 'ai');
        var p = T.parse(text); p.source = { kind: 'rules', fallback: true, error: msg };
        work.note = 'Live AI failed, so the rules read it. ' + msg;
        return p;
      });
    } else parsed = Promise.resolve(rp);
    return parsed.then(function (p) {
      return stepTo(useAI ? 2 : work.steps.length).then(function () { return p; });
    }).then(function (p) {
      if (useAI) { work.done = 3; work.rev++; }
      var out = cp ? buildCompound(cp, input) : build(p, input);
      if (!out.cards) out = T.accountClauses(out, text);
      var say = present(out, work, p);
      T.store.commit();
      busy = false;
      if (input === 'voice' || out.brief) T.voice.say(say, 'EN');
      return out.card || (out.cards && out.cards[0]) || null;
    }).catch(function (e) { busy = false; throw e; });
  };
  A.isBusy = function () { return busy; };
  // A request built outside the composer (forms, Listings): same builders, same card
  A.planFrom = function (p, said, input) {
    T.tick(1);
    T.addMessage({ role: 'broker', kind: 'text', text: said, by: T.actor(), lang: 'EN' });
    var work = T.addMessage({ role: 'tayoo', kind: 'working', steps: [], done: 0 });
    work._input = input || 'form';
    var out = build(p, input || 'form');
    present(out, work, p);
    T.store.commit();
    if (out.card) A.focusCard(out.card.id);
    else toConvo();
    return out.card || null;
  };
  A.focusCard = function (cardId) {
    toConvo();
    setTimeout(function () { var n = document.querySelector('#msgs [data-card="' + cardId + '"]'); if (n) { n.scrollIntoView({ block: 'start', behavior: T.reduced() ? 'auto' : 'smooth' }); var b = n.querySelector('[data-act="approve"], [data-act="pick-client"], .card-title'); if (b) { if (!b.hasAttribute('tabindex') && b.classList.contains('card-title')) b.setAttribute('tabindex', '-1'); try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } } }, 80);
  };

  A.pickClient = function (cardId, clientId) {
    var s = S(), card = s.cards[cardId];
    if (!card || card.status !== 'clarify') return;
    card.status = 'resolved'; card.picked = clientId; card.rev++;
    var c = T.client(clientId);
    var p = T.parse(card.pending.text), cp = T.parseCompound(card.pending.text, { clientId: clientId });
    p.clientId = clientId; p.ambiguous = null; p.clientWhy = 'You picked ' + T.fullName(c) + '.';
    if (card.source && card.source.provenance) p.source = card.source.provenance;
    if (p.intent === 'clarify') p.intent = 'note';
    T.tick(1);
    var out = cp ? buildCompound(cp, card.pending.input) : build(p, card.pending.input);
    if (!out.cards) out = T.accountClauses(out, card.pending.text);
    if (out.cards) {
      out.cards.forEach(function (cd) { s.cards[cd.id] = cd; cd.pending = card.pending; });
      T.addMessage({ role: 'tayoo', kind: 'text', text: out.reply });
      out.cards.forEach(function (cd) { T.addMessage({ role: 'tayoo', kind: 'card', cardId: cd.id }); });
    } else if (out.card) {
      s.cards[out.card.id] = out.card;
      out.card.pending = card.pending;
      T.addMessage({ role: 'tayoo', kind: 'text', text: out.reply });
      T.addMessage({ role: 'tayoo', kind: 'card', cardId: out.card.id });
    } else if (out.help) T.addMessage({ role: 'tayoo', kind: 'text', text: out.help.text, chips: out.help.chips });
    else if (out.brief) T.addMessage({ role: 'tayoo', kind: 'brief', clientId: out.brief.clientId, lines: out.brief.lines });
    T.store.commit();
  };

  A.brief = function (clientId) {
    toConvo();
    var b = T.briefFor(clientId);
    T.tick(1);
    T.addMessage({ role: 'broker', kind: 'text', text: 'Brief me on ' + T.fullName(T.client(clientId)) + '.', by: T.actor() });
    T.addMessage({ role: 'tayoo', kind: 'brief', clientId: clientId, lines: b.brief.lines });
    T.store.commit();
    T.voice.say(b.say, 'EN');
  };

  // Used by the tour and tests: play a sample end to end without the overlay
  A.runSample = function (id, opts) {
    var smp = T.SAMPLES.filter(function (x) { return x.id === id; })[0];
    return A.submit(smp.text, 'voice', 'sample', smp.lang, opts || { instant: true });
  };

  A.aiDraft = function (cardId, row, btn) {
    var card = S().cards[cardId];
    if (!card || !T.ai.on()) return;
    var facts = T.ai.factsFor(card, row);
    if (btn) { btn.disabled = true; btn.textContent = 'Drafting with live AI…'; }
    T.log('Live AI draft requested for ' + card.title, 'ai');
    return T.ai.draft(facts).then(function (r) {
      T.editCard(cardId, row != null ? 'rows.' + row + '.body' : 'email.body', r.text, { provenance: { kind: 'ai', model: r.provenance.model, ms: r.provenance.ms, fellBack: r.provenance.fellBack } });
      A.toast('Redrafted by live AI in ' + (facts.lang === 'FR' ? 'French' : 'English') + '. Review it before approving.');
    }, function (err) {
      A.toast('Live AI couldn’t draft: ' + window.LiveAI.describe(err) + ' The template draft is unchanged.');
      A.render();
    });
  };

  /* ---------------- workspace replacement (presets, import) ---------------- */
  A.replaceState = function (fn) {
    T.voice.hush();
    if (T.tour && T.tour.active) T.tour.stop(true);
    if (T.capture.open) T.capture.cancel();
    A.mute = true;
    A.resetThreadNodes();
    var res;
    try { res = fn(); } finally { A.mute = false; }
    T.store.save();
    lastRoute = null;
    A.renderComposer();
    A.render();
    return res;
  };
  A.loadPreset = function (id) {
    var snap = JSON.stringify(S());
    A.replaceState(function () { T.lab.preset(id); });
    var p = T.lab.PRESETS.filter(function (x) { return x.id === id; })[0];
    A.toast('Preset loaded: ' + p.label + '.', { label: 'Undo', fn: function () { A.replaceState(function () { T.store.state = JSON.parse(snap); }); A.toast('Previous workspace restored.'); } });
  };
  A.advance = function (iso) {
    var s = S();
    if (!iso || iso <= s.now) { A.toast('The demo clock only moves forward. Pick a later time.'); return; }
    var out = T.advanceTo(iso);
    T.ui.labOut = { to: iso, list: out };
    T.store.commit();
    A.toast('Now ' + T.fmtDT(iso) + '. ' + (out.length ? out.length + ' thing' + (out.length === 1 ? '' : 's') + ' changed; see the inbox.' : 'Nothing was due in between.'));
  };

  /* ---------------- dialogs ---------------- */
  function openDialog(id) {
    var d = $(id);
    if (d.open) return;
    if (d.showModal) { try { d.showModal(); return; } catch (e) { /* fall through */ } }
    d.setAttribute('open', '');
  }
  function closeDialog(id) { var d = $(id); if (!d.open) return; if (d.close) { try { d.close(); return; } catch (e) { /* ignore */ } } d.removeAttribute('open'); }
  // One place for demo tooling: tour, Test lab, samples, mode, reset, the API monitor and the way back to all demos
  A.openDemo = function () {
    var s = S(), shadow = s.settings.mode === 'shadow', ai = T.ai.status();
    var row = function (act, icon, label, val, extra) { return '<li><button type="button" class="dm-row" data-act="' + act + '"' + (extra || '') + '>' + T.icon(icon) + '<span>' + esc(label) + '</span>' + (val ? '<span class="dm-v">' + val + '</span>' : '') + '</button></li>'; };
    $('demo-in').innerHTML = '<header class="dlg-h"><h2 id="demo-h">' + T.icon('flask') + 'Demo</h2><button type="button" class="icon-btn" data-act="demo-close" aria-label="Close" title="Close">' + T.icon('close') + '</button></header>' +
      '<p class="dm-tag"><span class="demo-tag">Fictional data</span><span class="demo-tag">Sends simulated</span></p>' +
      '<ul class="dm-list">' +
      row('tour', 'tour', 'Guided tour') +
      row('samples', 'play', 'Sample dictations') +
      row('lab', 'flask', 'Test lab') +
      row('mode', shadow ? 'eye' : 'check', shadow ? 'Shadow Mode' : 'Approvals', shadow ? 'On' : 'Shadow off', ' data-mode="' + (shadow ? 'active' : 'shadow') + '" aria-label="' + (shadow ? 'Shadow Mode is on. Switch to Approvals' : 'Approvals mode. Switch to Shadow Mode') + '"') +
      '<li><a class="dm-row" href="../../index.html#api">' + T.icon('gauge') + '<span>API monitor</span><span class="dm-v">' + esc(ai.on ? 'AI on' : 'AI off') + '</span></a></li>' +
      row('reset', 'refresh', 'Reset demo') +
      '<li><a class="dm-row" href="../../index.html">' + T.icon('back') + '<span>All demos</span></a></li></ul>';
    openDialog('demo-dlg');
  };
  A.openSamples = function () {
    closeDialog('demo-dlg');
    $('samples-list').innerHTML = T.SAMPLES.map(function (x) {
      return '<li class="smp"><p class="smp-h">' + esc(x.label) + '<span class="muted">' + esc(x.short) + '</span></p><p class="said-text smp-t" lang="' + x.lang.slice(0, 2) + '">' + esc(x.text) + '</p>' +
        '<p class="smp-act"><button type="button" class="btn btn-primary btn-sm" data-act="sample" data-sample="' + x.id + '">' + T.icon('talk') + 'Play as dictation</button><button type="button" class="btn btn-ghost btn-sm" data-act="prefill" data-text="' + esc(x.text) + '">' + T.icon('keyboard') + 'Put it in the composer</button></p></li>';
    }).join('') +
      '<li class="smp smp-try"><p class="smp-h">Try your own wording<span class="muted">Typed requests the rules understand</span></p><ul class="try">' + [
        'Called Yannick: his budget is 560k and parking is preferred. I’ll send him duplex comparables Thursday.',
        'Move Camille’s listing presentation to Monday at 10',
        'Cancel the photographer visit with Marie-Ève',
        'Send Léa the listings that fit her criteria',
        'Find condos in Saint-Roch under 480k with parking',
        'What could Antoine’s house sell for?',
        'Find buyers in Sillery I haven’t talked to in 30 days',
        'Summarize the Simard file',
        'Remind me to call the notary about the Simard file on November 2 at 9'
      ].map(function (t) { return '<li><button type="button" class="btn-link" data-act="prefill" data-text="' + esc(t) + '">' + esc(t) + '</button></li>'; }).join('') + '</ul></li>';
    openDialog('samples-dlg');
  };

  /* ---------------- forms ---------------- */
  A.formCtx = null;
  A.openForm = function (kind, ctx, keepFocus) {
    ctx = ctx || {};
    if ((kind === 'memory' && !T.client(ctx.client)) || (kind === 'doc' && !T.tx(ctx.tx))) return;
    A.formCtx = { kind: kind, ctx: ctx };
    var f = R.forms[kind](ctx);
    var live = kind === 'event' ? R.eventLive(f.values, ctx.id) : '';
    $('form-in').innerHTML = '<form class="eform" data-form="entity" data-kind="' + kind + '" novalidate><header class="dlg-h"><h2 id="form-h">' + esc(f.title) + '</h2><button type="button" class="icon-btn" data-act="form-close" aria-label="Close">' + T.icon('close') + '</button></header>' +
      (f.sub ? '<p class="muted">' + esc(f.sub) + '</p>' : '') + (ctx.errors && Object.keys(ctx.errors).length ? '<p class="form-errs" role="alert">' + T.icon('alert') + 'Check the highlighted field' + (Object.keys(ctx.errors).length === 1 ? '' : 's') + '.</p>' : '') + f.body + live +
      '<p class="dlg-act"><button type="button" class="btn btn-quiet" data-act="form-close">Cancel</button><button type="submit" class="btn btn-primary">' + esc(f.submit) + '</button></p></form>';
    openDialog('form-dlg');
    // focus synchronously, so nothing typed right after opening lands in another field
    var first = $('form-in').querySelector('[aria-invalid="true"]') || $('form-in').querySelector('input:not([type=hidden]):not([type=checkbox]), select, textarea');
    if (first && (!keepFocus || ctx.errors)) { try { first.focus(); } catch (e) { /* ignore */ } }
  };
  function formValues(form) {
    var v = {};
    form.querySelectorAll('[name]').forEach(function (n) { v[n.name] = n.type === 'checkbox' ? n.checked : n.value; });
    return v;
  }
  function again(errs, v) { var fc = A.formCtx; A.openForm(fc.kind, Object.assign({}, fc.ctx, { values: v, errors: errs }), true); }
  function done(msg, hash, undo) { closeDialog('form-dlg'); A.formCtx = null; T.store.commit(); if (hash) location.hash = hash; if (msg) A.toast(msg, undo); }
  function num(x) { var n = +String(x == null ? '' : x).replace(/[^\d.]/g, ''); return n || null; }
  A.submitForm = function (form) {
    var fc = A.formCtx; if (!fc) return;
    var v = formValues(form), ctx = fc.ctx, errs, s = S();
    T.tick(1);
    switch (fc.kind) {
      case 'client':
        errs = T.clients.validate(v, ctx.id);
        if (Object.keys(errs).length) return again(errs, v);
        if (ctx.id) { var ch = T.clients.update(ctx.id, v); return done(ch.length ? ch.length + ' change' + (ch.length === 1 ? '' : 's') + ' saved to ' + v.first + '’s record, with history.' : 'Nothing changed.'); }
        var c = T.clients.create(v);
        return done(T.fullName(c) + ' added. ' + (T.canEmail(c) ? 'Email consent recorded.' : 'No email consent yet, so commercial email stays blocked.'), '#/clients/' + c.id);
      case 'memory': {
        var cl = T.client(ctx.client), p = T.parse('Memory change for ' + T.fullName(cl));
        p.intent = 'note'; p.clientId = cl.id; p.ambiguous = null; p.clientWhy = 'Proposed from ' + cl.first + '’s record.';
        p.budget = num(v.budget); p.fees = num(v.fees); p.features = {}; p.positive = []; p.objections = []; p.spans = []; p.memSets = [];
        if (v.budget && !p.budget) return again({ budget: 'Enter an amount, like 650,000.' }, v);
        if (v.fees && !p.fees) return again({ fees: 'Enter a monthly amount, like 350.' }, v);
        if (v.garage) p.features.garage = v.garage;
        if (v.parking) p.features.parking = v.parking;
        var cur = function (k) { var m = T.memField(cl, k); return m ? String(m.value || '') : ''; };
        if (String(v.areas || '').trim() && String(v.areas).trim() !== cur('areas')) p.memSets.push({ key: 'areas', label: 'Areas', value: String(v.areas).trim() });
        if (String(v.intent || '').trim() && String(v.intent).trim() !== cur('intent')) p.memSets.push({ key: 'intent', label: 'Looking for', value: String(v.intent).trim() });
        if (String(v.note || '').trim()) p.memSets.push({ key: 'notes', label: 'Note', value: String(v.note).trim() });
        if (p.budget == null && p.fees == null && !v.garage && !v.parking && !p.memSets.length) return again({ _: 'Change at least one field.' }, v);
        p.text = 'Propose a memory change for ' + T.fullName(cl) + ': ' + [p.budget ? 'budget ' + T.money(p.budget) : '', p.fees ? 'fees under ' + T.money(p.fees) + '/month' : '', v.garage ? 'garage ' + T.strengthLabel(v.garage).toLowerCase() : '', v.parking ? 'parking ' + T.strengthLabel(v.parking).toLowerCase() : ''].concat(p.memSets.map(function (m) { return m.label.toLowerCase() + ': ' + m.value.replace(/["“”]/g, ''); })).filter(Boolean).join('; ') + '.';
        p.noQuotes = true;
        closeDialog('form-dlg'); A.formCtx = null;
        var card = A.planFrom(p, p.text, 'form');
        if (card) A.toast('Memory Diff ready in the conversation. Nothing changes until you approve.');
        return;
      }
      case 'task': {
        var due = (v.dueDate || '') + 'T' + (v.dueTime || '');
        errs = T.tasks.validate({ title: v.title, due: due });
        if (Object.keys(errs).length) return again(errs, v);
        var t = T.tasks.save({ title: v.title, due: due, client: v.client || null, owner: v.owner, internal: v.internal || !v.client, note: v.note }, ctx.id);
        return done((ctx.id ? 'Task updated: ' : 'Task added: ') + t.title + ', due ' + T.fmtDT(t.due) + (T.isOverdue(t) ? ' (already overdue)' : '') + '.');
      }
      case 'event': {
        errs = T.cal.validate(v);
        if (Object.keys(errs).length) return again(errs, v);
        var e = T.cal.save({ title: v.title.trim(), kind: v.kind, client: v.client || null, listing: v.listing || null, place: v.place, area: v.area, date: v.date, start: v.start, end: v.end }, ctx.id);
        var cf = T.cal.conflicts(e, e.id);
        return done((ctx.id ? 'Event updated' : 'Event added') + ': ' + T.fmtDT(e.date + 'T' + e.start) + '.' + (cf.length ? ' It still conflicts: ' + T.cal.describe(cf[0]) : ''), WIDE.indexOf(route().view) > -1 || !desktopMQ.matches ? '#/calendar/' + e.date : null);
      }
      case 'tx': {
        errs = T.files.validate(v);
        if (Object.keys(errs).length) return again(errs, v);
        var tx = T.files.create(v);
        return done('File created: ' + tx.title + '. ' + tx.conditions.length + ' condition' + (tx.conditions.length === 1 ? '' : 's') + ' with computed deadlines.', '#/files/' + tx.id);
      }
      case 'doc': {
        var tx2 = T.tx(ctx.tx);
        errs = {};
        if (!T.validDate(v.date)) errs.date = 'Pick the document’s date.';
        if (v.states && !T.validDate(v.value)) errs.value = 'Enter the date the document states.';
        if (Object.keys(errs).length) return again(errs, v);
        var label = v.states === 'fin-lender' ? 'Lender approval expected' : v.states ? ((tx2.conditions.filter(function (x) { return x.id === v.states; })[0] || {}).label ? tx2.conditions.filter(function (x) { return x.id === v.states; })[0].label + ' deadline' : ((tx2.keyDates || []).filter(function (x) { return x.id === v.states; })[0] || {}).label) : '';
        T.files.addDoc(tx2.id, { type: v.type, date: v.date, fields: v.states ? [{ key: v.states, label: label, value: v.value, quote: String(v.quote || '').trim() }] : [] });
        var n = T.files.issueCount(tx2);
        return done(v.type + ' added to ' + tx2.title + '. ' + (n ? n + ' item' + (n === 1 ? '' : 's') + ' to check.' : 'Nothing conflicts.'));
      }
      case 'subject': {
        errs = T.cma.validateSubject(v);
        if (Object.keys(errs).length) return again(errs, v);
        var sj = T.cma.setSubject(v);
        return done('Subject added. Comparable sales are pulled from the export.', '#/cma/' + sj.id);
      }
      case 'criteria': {
        closeDialog('form-dlg'); A.formCtx = null;
        A.runRecovery(R.critFrom(v), ctx.card);
        return;
      }
    }
  };
  A.runRecovery = function (crit, oldCardId) {
    var s = S(), old = oldCardId && s.cards[oldCardId];
    if (old && (old.status === 'ready' || old.status === 'awaiting')) { old.status = 'cancelled'; old.replaced = true; old.rev++; }
    T.tick(1);
    T.addMessage({ role: 'broker', kind: 'text', text: 'Find follow-ups I owe: ' + T.critText(crit) + '.', by: T.actor() });
    var out = T.build.recovery(null, 'form', crit);
    var work = T.addMessage({ role: 'tayoo', kind: 'working', steps: [], done: 0 });
    work._input = 'form';
    present(out, work, { text: 'Find follow-ups I owe: ' + T.critText(crit) + '.' });
    if (out.card) out.card.pending = { text: 'Find follow-ups I owe', input: 'form' };
    T.store.commit();
    if (out.card) A.focusCard(out.card.id); else toConvo();
  };
  A.formLive = function () {
    var fc = A.formCtx, form = $('form-in').querySelector('form');
    if (!fc || !form) return;
    var v = formValues(form), live = $('form-live');
    if (!live) return;
    var html = fc.kind === 'event' ? R.eventLive(v, fc.ctx.id) : fc.kind === 'criteria' ? (function () { var n = T.recoveryCandidates(R.critFrom(v)).length; return '<p class="form-live" id="form-live" role="status">' + n + ' contact' + (n === 1 ? '' : 's') + ' match right now.</p>'; })() : null;
    if (html != null && live.outerHTML !== html) live.outerHTML = html;
  };

  /* ---------------- search ---------------- */
  var sr = { active: 0, res: [] };
  A.openSearch = function () {
    if (T.capture.open) return;
    closeDialog('form-dlg'); closeDialog('samples-dlg');
    sr.active = 0;
    var q = $('search-q'); q.value = '';
    A.searchUpdate();
    openDialog('search-dlg');
    setTimeout(function () { q.focus(); }, 20);
  };
  A.searchUpdate = function () {
    var q = $('search-q').value, out = R.searchResults(q, sr.active);
    sr.res = out.res;
    if (sr.active >= out.n) sr.active = Math.max(0, out.n - 1);
    $('search-res').innerHTML = R.searchResults(q, sr.active).html;
    $('search-q').setAttribute('aria-activedescendant', out.n ? 'sr-' + sr.active : '');
    $('search-count').textContent = String(q).trim().length < 2 ? '' : out.n + ' result' + (out.n === 1 ? '' : 's');
    var a = $('sr-' + sr.active); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
  };
  function searchGo(i) {
    var r = sr.res[i]; if (!r) return;
    closeDialog('search-dlg');
    T.log('Search: opened ' + r.type.toLowerCase() + ' “' + r.title + '”', 'search');
    location.hash = r.href;
    A.render();
  }

  /* ---------------- Test lab ---------------- */
  A.labOpen = false;
  A.openLab = function (opener) {
    if (T.capture.open) return;
    A.labOpen = true; A.labOpener = opener || document.activeElement;
    var el = $('lab'); el.hidden = false;
    document.body.classList.add('lab-open');
    $('lab-body')._html = '';
    A.render();
    setTimeout(function () { var b = el.querySelector('#lab-h'); if (b) { b.setAttribute('tabindex', '-1'); try { b.focus(); } catch (e) { /* ignore */ } } }, 30);
  };
  A.closeLab = function () {
    A.labOpen = false;
    $('lab').hidden = true;
    document.body.classList.remove('lab-open');
    var o = A.labOpener; A.labOpener = null;
    if (o && document.body.contains(o)) { try { o.focus(); } catch (e) { /* ignore */ } }
  };
  function labEvent(form) {
    var v = formValues(form), s = S(), r, msg;
    T.tick(1);
    switch (v.type) {
      case 'reply': r = T.lab.reply(v.client, v.text); msg = r === 'observed' ? T.fullName(T.client(v.client)) + ' replied: counted as an observed reply.' : T.fullName(T.client(v.client)) + ' wrote in. No follow-up was waiting, so it’s an inbound message to answer.'; break;
      case 'optout': T.lab.optout(v.client); msg = T.fullName(T.client(v.client)) + ' opted out. Plans that included them now need a refresh.'; break;
      case 'optout-send': r = T.lab.queueOptout(v.client); msg = r ? T.fullName(T.client(v.client)) + ' will opt out while the next batch is sending. Approve a recovery plan that includes them.' : 'An opt-out is already queued for this client.'; break;
      case 'cancel': r = v.appt && T.lab.cancelShowing(v.appt); msg = r ? 'The client cancelled: ' + r.title + ', ' + T.fmtDT(r.date + 'T' + r.start) + '.' : 'Nothing to cancel.'; break;
      case 'lender': r = v.tx && T.lab.lenderChange(v.tx, v.date); msg = r ? 'Lender letter added to the file: approval expected ' + T.fmtDate(v.date, { long: true }) + '.' : 'Pick a file and a valid date.'; break;
      case 'lead':
        errsLead = T.clients.validate({ first: v.first, last: v.last, email: v.email, consent: 'implied', consentSource: 'Website inquiry' });
        if (Object.keys(errsLead).length) { msg = 'Lead not added: ' + errsLead[Object.keys(errsLead)[0]]; break; }
        r = T.lab.newLead(v); msg = 'New lead: ' + T.fullName(r) + ', with implied consent from the inquiry.'; break;
    }
    T.log('Test lab event: ' + v.type, 'lab');
    T.store.commit();
    A.toast(msg);
  }
  var errsLead;

  /* ---------------- export / import / print ---------------- */
  function download(name, text) {
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      return true;
    } catch (x) { return false; }
  }
  A.exportName = function () { return 'tayoo-workspace-' + S().now.replace(/[:T]/g, '-') + '.json'; };
  A.importText = function (text) {
    var snap = JSON.stringify(S()), res;
    A.replaceState(function () { res = T.importJSON(text); });
    if (res.error) { A.toast('Import failed: ' + res.error + ' Nothing changed.'); return res; }
    A.toast('Workspace imported: ' + res.state.clients.length + ' clients, clock at ' + T.fmtDT(res.state.now) + '.', { label: 'Undo', fn: function () { A.replaceState(function () { T.store.state = JSON.parse(snap); }); A.toast('Previous workspace restored.'); } });
    return res;
  };
  A.printCMA = function (id) {
    var html = R.cmaReport(id);
    if (!html) return;
    $('print-root').innerHTML = html;
    T.log('CMA report printed for ' + T.listing(id).address, 'cma');
    T.store.commit();
    try { window.print(); } catch (e) { A.toast('Printing isn’t available here.'); }
  };

  /* ---------------- events ---------------- */
  function cardOf(el) { var c = el.closest('[data-card]'); return c ? c.getAttribute('data-card') : el.getAttribute('data-card'); }
  function undoToast(msg, entry, after) {
    T.store.commit();
    A.toast(msg, entry ? { label: 'Undo', fn: function () { T.restore(entry.id); T.store.commit(); A.toast('Restored.'); if (after) after(); } } : null);
  }
  function task(id) { return S().tasks.filter(function (x) { return x.id === id; })[0]; }
  function evt(id) { return S().appointments.filter(function (x) { return x.id === id; })[0]; }
  document.addEventListener('click', function (e) {
    var sri = e.target.closest('#search-res [data-href]');
    if (sri) { var idx = Array.prototype.indexOf.call(sri.parentNode.children, sri); searchGo(idx); return; }
    if (e.target === $('search-dlg') || e.target === $('form-dlg')) { closeDialog(e.target.id); return; }
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var act = el.getAttribute('data-act'), s = S(), id;
    switch (act) {
      case 'talk': e.preventDefault(); if (T.capture.open) break; closeDialog('samples-dlg'); if (A.labOpen) A.closeLab(); T.capture.show({ origin: el }); break;
      case 'sample': e.preventDefault(); closeDialog('samples-dlg'); closeDialog('demo-dlg'); if (A.labOpen) A.closeLab(); toConvo(); T.capture.show({ sample: el.getAttribute('data-sample'), origin: el }); break;
      case 'suggest': e.preventDefault(); toConvo(); A.submit(el.getAttribute('data-text'), 'text', 'suggestion'); break;
      case 'demo': A.openDemo(); break;
      case 'demo-close': closeDialog('demo-dlg'); break;
      case 'samples': A.openSamples(); break;
      case 'close-samples': closeDialog('samples-dlg'); break;
      case 'cap-stop': T.capture.stop(); break;
      case 'cap-cancel': T.capture.cancel(); break;
      case 'cap-retry': T.capture.retry(); break;
      case 'cap-type': T.capture.typeInstead(); break;
      case 'cap-sample': T.capture.playSample(el.getAttribute('data-sample')); break;
      case 'approve':
        T.approve(cardOf(el)).then(function (r) {
          if (r === 'requested') A.toast('Sent to ' + T.BROKER.first + ' for approval. It waits in his inbox; nothing ran.');
          else if (r === 'stale') A.toast('This plan needs a refresh before it can be approved.');
        });
        break;
      case 'reject': T.reject(cardOf(el)); break;
      case 'refresh-card': id = cardOf(el); var ro = T.refreshCard(id); if (ro && ro.card) A.focusCard(ro.card.id); break;
      case 'ai-draft': A.aiDraft(cardOf(el), el.hasAttribute('data-row') ? +el.getAttribute('data-row') : null, el); break;
      case 'edit-btn': T.editCard(cardOf(el), el.getAttribute('data-path'), el.getAttribute('data-val')); break;
      case 'pick-client': A.pickClient(cardOf(el), el.getAttribute('data-client')); break;
      case 'resolve': {
        var txr = T.tx(el.getAttribute('data-tx'));
        T.resolveConflict(el.getAttribute('data-tx'), el.getAttribute('data-key'), el.getAttribute('data-choice'));
        if (txr && el.getAttribute('data-choice') !== 'none') A.toast('Saved for the ' + txr.title + '. The other value stays in the history.');
        break;
      }
      case 'tx-cal': { var ev1 = T.files.addKeyDateToCalendar(el.getAttribute('data-tx'), el.getAttribute('data-key')); T.store.commit(); if (ev1) A.toast('Added to your calendar: ' + ev1.title + ', ' + T.fmtDT(ev1.date + 'T' + ev1.start) + '. Confirm the time with the notary.'); break; }
      case 'tx-move': { var ev2 = T.files.linkCalendar(el.getAttribute('data-tx'), el.getAttribute('data-key'), el.getAttribute('data-ev')); T.store.commit(); if (ev2) A.toast('Calendar event moved to ' + T.fmtDate(ev2.date, { long: true }) + ' to match the file.'); break; }
      case 'cond': { var cd = T.files.setCondition(el.getAttribute('data-tx'), el.getAttribute('data-cond'), el.getAttribute('data-status')); T.store.commit(); if (cd) A.toast(cd.label + ' condition: ' + cd.status + '. Recorded in the file history.'); break; }
      case 'new-doc': A.openForm('doc', { tx: el.getAttribute('data-tx') }); break;
      case 'new-tx': A.openForm('tx', { client: el.getAttribute('data-client') || '' }); break;
      case 'delete-tx': { var ent = T.files.remove(el.getAttribute('data-tx')); location.hash = '#/files'; undoToast('Transaction deleted.', ent); break; }
      case 'ask': toConvo(); A.submit(el.getAttribute('data-text'), 'text'); break;
      case 'undo': T.undo(el.getAttribute('data-receipt')); break;
      case 'mode':
        closeDialog('demo-dlg');
        s.settings.mode = el.getAttribute('data-mode'); T.log(s.settings.mode === 'shadow' ? 'Shadow Mode on' : 'Approvals mode on', 'settings'); T.store.commit();
        A.toast(s.settings.mode === 'shadow' ? 'Shadow Mode on. Approving records what Tayoo would do; nothing changes.' : 'Approvals mode. Approved plans change local records; sends stay simulated.');
        break;
      case 'toggle-speak': s.settings.speak = !s.settings.speak; if (!s.settings.speak) T.voice.hush(); T.store.commit(); A.toast(s.settings.speak ? 'Spoken replies on.' + (T.voice.canSpeak ? '' : ' No voices are available here, so replies stay on screen.') : 'Spoken replies off.'); break;
      case 'hush': T.voice.hush(); break;
      case 'tour': closeDialog('demo-dlg'); if (A.labOpen) A.closeLab(); T.tour.start(); break;
      case 'reset': closeDialog('demo-dlg'); openDialog('confirm-dlg'); break;
      case 'confirm-reset':
        closeDialog('confirm-dlg');
        A.replaceState(function () { T.store.reset(); });
        location.hash = '#/';
        A.toast('Demo reset. Every record is back to Friday, 2:47 PM.');
        break;
      case 'cancel-reset': closeDialog('confirm-dlg'); break;
      case 'discard': s.draft = ''; s.draftKind = null; T.store.save(); A.renderComposer(); A.toast('Voice draft discarded. Nothing was planned.'); break;
      case 'prefill':
        closeDialog('samples-dlg');
        toConvo();
        s.draft = el.getAttribute('data-text'); s.draftKind = 'text'; T.store.save(); A.renderComposer();
        var ta = $('composer-input'); ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (x) { /* ignore */ }
        break;
      case 'recap': {
        var a = evt(el.getAttribute('data-ev')), c = a && T.client(a.client);
        if (!c) break;
        toConvo();
        s.draft = 'Just finished the showing at ' + (a.place || 'the property') + ' with ' + c.first + '. '; s.draftKind = 'text'; T.store.save(); A.renderComposer();
        var ta2 = $('composer-input'); ta2.focus(); try { ta2.setSelectionRange(ta2.value.length, ta2.value.length); } catch (x) { /* ignore */ }
        A.toast('Say how it went: what ' + c.first + ' liked, concerns, budget, what you promised.');
        break;
      }
      case 'goto-card': A.focusCard(el.getAttribute('data-card')); break;
      case 'brief': A.brief(el.getAttribute('data-client')); break;
      case 'say-brief':
        var m = s.thread.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (m) { var was = s.settings.speak; s.settings.speak = true; T.voice.say(m.lines.join(' '), 'EN'); s.settings.speak = was; if (!T.voice.canSpeak) A.toast('No voices are available here. The briefing text is above.'); }
        break;
      case 'task-done': { var t1 = T.tasks.done(el.getAttribute('data-task')); if (t1) { T.tick(1); T.store.commit(); A.toast('Marked done: ' + t1.title + '.', { label: 'Undo', fn: function () { T.tasks.reopen(t1.id); T.store.commit(); } }); } break; }
      case 'task-reopen': { var t2 = T.tasks.reopen(el.getAttribute('data-task')); T.store.commit(); if (t2) A.toast('Reopened: ' + t2.title + '.'); break; }
      case 'new-task': A.openForm('task', { client: el.getAttribute('data-client') || '' }); break;
      case 'edit-task': A.openForm('task', { id: el.getAttribute('data-task') }); break;
      case 'delete-task': { var t3 = task(el.getAttribute('data-task')); undoToast('Task deleted: ' + (t3 ? t3.title : '') + '.', T.removeTask(el.getAttribute('data-task'))); break; }
      case 'new-event': A.openForm('event', { client: el.getAttribute('data-client') || '', listing: el.getAttribute('data-listing') || '' }); break;
      case 'edit-event': A.openForm('event', { id: el.getAttribute('data-ev') }); break;
      case 'cancel-event': {
        var e3 = T.cal.cancel(el.getAttribute('data-ev'), T.actor());
        if (e3) { T.store.commit(); A.toast('Cancelled in your calendar: ' + e3.title + '. Nobody was notified; ask Tayoo to cancel it with a note to the client instead.', { label: 'Undo', fn: function () { e3.status = 'scheduled'; e3.cancelledBy = null; T.log('Cancellation undone: ' + e3.title, 'undo'); T.store.commit(); } }); }
        break;
      }
      case 'delete-event': { var e4 = evt(el.getAttribute('data-ev')); undoToast('Event deleted: ' + (e4 ? e4.title : '') + '.', T.removeEvent(el.getAttribute('data-ev'))); break; }
      case 'ev-slot': {
        var form = $('form-in').querySelector('form'), st = form.querySelector('[name=start]'), en = form.querySelector('[name=end]');
        var dur = Math.max(15, T.minutesBetween('2000-01-01T' + st.value, '2000-01-01T' + en.value));
        st.value = el.getAttribute('data-t'); en.value = T.addMin(st.value, dur); A.formLive(); st.focus();
        break;
      }
      case 'new-client': A.openForm('client', el.getAttribute('data-first') ? { values: { first: el.getAttribute('data-first'), last: el.getAttribute('data-last') || '', role: 'Buyer', stage: 'Lead', area: 'Montcalm', lang: 'EN', consent: 'unknown', consentDate: T.today(), garage: 'unknown' } } : {}); break;
      case 'edit-client': A.openForm('client', { id: el.getAttribute('data-client') }); break;
      case 'delete-client': {
        var cc = T.client(el.getAttribute('data-client')), name = cc ? T.fullName(cc) : '';
        var ent2 = T.clients.remove(el.getAttribute('data-client'));
        location.hash = '#/clients';
        undoToast(name + ' deleted, with their tasks and events. Plans waiting for them were cancelled.', ent2);
        break;
      }
      case 'memory-form': A.openForm('memory', { client: el.getAttribute('data-client') }); break;
      case 'delete-note': undoToast('Note deleted.', T.clients.removeNote(el.getAttribute('data-client'), el.getAttribute('data-note'))); break;
      case 'plan-note': {
        var cn = T.client(el.getAttribute('data-client')), note = cn && (cn.notes || []).filter(function (x) { return x.id === el.getAttribute('data-note'); })[0];
        if (!note) break;
        toConvo();
        A.submit(T.fold(note.text).indexOf(T.fold(cn.first)) > -1 ? note.text : cn.first + ' ' + cn.last + ': ' + note.text, 'text');
        break;
      }
      case 'unsave': T.clients.toggleSaved(el.getAttribute('data-client'), el.getAttribute('data-listing')); T.store.commit(); A.toast('Removed from ' + T.client(el.getAttribute('data-client')).first + '’s saved listings.'); break;
      case 'recovery-criteria': A.openForm('criteria', { card: cardOf(el) }); break;
      case 'cfilter': T.ui.clientFilter = el.getAttribute('data-f'); A.render(); break;
      case 'tfilter': T.ui.taskFilter = el.getAttribute('data-f'); A.render(); break;
      case 'lf-reset': T.ui.lf = { q: '', area: 'any', type: 'any', max: '', beds: 'any', garage: false }; A.render(); break;
      case 'open-listings': {
        var fl = {}; try { fl = JSON.parse(el.getAttribute('data-filters') || '{}'); } catch (x) { fl = {}; }
        T.ui.lf = { q: '', area: (fl.areas && fl.areas[0]) || 'any', type: (fl.types && fl.types[0]) || 'any', max: fl.max ? String(fl.max) : '', beds: fl.beds ? String(fl.beds) : 'any', garage: !!fl.garage };
        break;
      }
      case 'new-subject': A.openForm('subject', { client: el.getAttribute('data-client') || '' }); break;
      case 'cma-save': { var rep = T.cma.saveReport(el.getAttribute('data-id')); T.store.commit(); if (rep) A.toast('Saved version ' + rep.version + ': ' + T.money(rep.low) + ' to ' + T.money(rep.high) + '.'); break; }
      case 'cma-print': A.printCMA(el.getAttribute('data-id')); break;
      case 'cma-defaults': { var run = T.cma.runFor(el.getAttribute('data-id')); run.rates = T.cma.defaults(T.listing(el.getAttribute('data-id'))); T.log('CMA rates reset to defaults for ' + T.listing(el.getAttribute('data-id')).address, 'cma'); T.store.commit(); break; }
      case 'mark-reply': T.markReply(el.getAttribute('data-o')); A.toast('Reply recorded as confirmed by you.'); break;
      case 'mark-meeting': T.markMeeting(el.getAttribute('data-o')); A.toast('Meeting recorded. It counts once for this contact.'); break;
      case 'read-all': s.inbox.forEach(function (n) { n.read = true; }); T.store.commit(); break;
      case 'open-note': {
        var nt = s.inbox.filter(function (x) { return x.id === el.getAttribute('data-n'); })[0];
        if (!nt) break;
        nt.read = true; T.store.commit();
        var ref = nt.ref || {};
        if (ref.type === 'client' && T.client(ref.id) && !T.client(ref.id).deleted) location.hash = '#/clients/' + ref.id;
        else if (ref.type === 'tx' && T.tx(ref.id)) location.hash = '#/files/' + ref.id;
        else if (ref.type === 'event') { var ae = evt(ref.id); location.hash = '#/calendar/' + (ae ? ae.date : ''); }
        else if (ref.type === 'task') location.hash = '#/calendar';
        else if (ref.type === 'card') A.focusCard(ref.id);
        else if (ref.type === 'outbox') location.hash = '#/inbox/outbox';
        break;
      }
      case 'search': A.openSearch(); break;
      case 'lab': closeDialog('demo-dlg'); if (A.labOpen) A.closeLab(); else A.openLab(el); break;
      case 'lab-close': A.closeLab(); break;
      case 'clock': A.advance(T.addMinutes(s.now, +el.getAttribute('data-min'))); break;
      case 'preset': A.loadPreset(el.getAttribute('data-preset')); break;
      case 'export': if (download(A.exportName(), T.exportJSON())) { T.log('Workspace exported', 'system'); T.store.commit(); A.toast('Exported the workspace as JSON.'); } else A.toast('Export isn’t available in this browser.'); break;
      case 'import': $('import-file').click(); break;
      case 'toast-undo': { var fn = A._undo; A._undo = null; $('toast').classList.remove('is-on'); if (fn) fn(); break; }
      case 'form-close': closeDialog('form-dlg'); A.formCtx = null; break;
    }
  });

  // Press and hold the mic to talk, release to send; a quick tap listens hands-free until a short silence.
  // Recognition starts here, synchronously inside the gesture.
  var press = null;
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest && e.target.closest('[data-act="talk"]');
    if (!el || el.disabled || T.capture.open || (e.button && e.button > 0)) return;
    press = { t: Date.now(), type: e.pointerType };
    closeDialog('samples-dlg'); if (A.labOpen) A.closeLab();
    T.capture.show({ origin: el, hold: true });
    T.capture.holding = true;
  });
  function endPress() {
    if (!press) return;
    var held = Date.now() - press.t, p = press; press = null;
    if (!T.capture.open) return;
    if (held >= 350) return T.capture.release();
    T.capture.hold = false; T.capture.holding = false;
    // a touch press may not count as a gesture for the speech service: the release does, so start again from here
    if (T.capture.error === 'not-allowed' && p.type !== 'mouse') T.capture.retry();
    else if (T.capture.text || T.capture.interim) T.capture.armSilence();
  }
  document.addEventListener('pointerup', endPress);
  document.addEventListener('pointercancel', endPress);
  document.addEventListener('change', function (e) {
    var el = e.target, s = S();
    if (el.id === 'import-file') {
      var f = el.files && el.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { A.importText(String(rd.result || '')); el.value = ''; };
      rd.onerror = function () { A.toast('Couldn’t read that file.'); el.value = ''; };
      rd.readAsText(f);
      return;
    }
    if (el.closest('#form-in')) { A.formLive(); return; }
    if (el.hasAttribute('data-edit')) {
      var id = cardOf(el); if (!id) return;
      var v = el.type === 'checkbox' ? el.checked : el.getAttribute('data-num') ? Number(String(el.value).replace(/[^\d.]/g, '')) : el.value;
      if (el.getAttribute('data-num') && (isNaN(v) || v <= 0 || !String(el.value).trim())) { A.toast('Enter an amount in dollars, like 825,000.'); var cid = cardOf(el); if (cid) { S().cards[cid].rev++; } A.render(); return; }
      T.editCard(id, el.getAttribute('data-edit'), v);
    } else if (el.hasAttribute('data-set')) {
      var k = el.getAttribute('data-set');
      s.settings[k] = el.type === 'checkbox' ? el.checked : el.value;
      if (k === 'speak' && !el.checked) T.voice.hush();
      T.log('Setting changed: ' + k, 'settings');
      T.store.commit();
      A.toast('Saved.');
    } else if (el.hasAttribute('data-style')) {
      s.style[el.getAttribute('data-style')] = el.value; T.store.commit(); A.toast('Style memory saved. New drafts will use it.');
    } else if (el.hasAttribute('data-role')) {
      s.role = el.getAttribute('data-role');
      T.log('Signed in as ' + T.actor() + (s.role === 'coordinator' ? ' (coordinator)' : ' (broker)'), 'lab');
      T.store.commit();
      A.toast(s.role === 'coordinator' ? 'You are Maude, the coordinator. Plans that send or change memory go to Alex.' : 'You are Alex, the broker.');
    } else if (el.hasAttribute('data-cap')) {
      var cap = el.getAttribute('data-cap');
      s.caps[cap] = el.checked;
      var extra = '';
      if (cap === 'offline' && !el.checked) { var n = T.flushOutbox(); extra = n ? ' ' + n + ' queued message' + (n === 1 ? '' : 's') + ' simulated.' : ''; }
      T.log('Capability ' + cap + (el.checked ? ' on' : ' off'), 'lab');
      T.store.commit();
      A.toast({ sr: 'Speech recognition ', voices: 'Voices ', offline: 'Offline ', ai: 'Live AI ' }[cap] + (el.checked ? 'on.' : 'off.') + extra);
    } else if (el.getAttribute('data-lab') === 'ev') {
      T.ui.labEv = el.value; A.render();
      var sel = $('lab-body').querySelector('[data-lab="ev"]'); if (sel) sel.focus();
    } else if (el.hasAttribute('data-cma')) {
      var cid2 = el.getAttribute('data-id'), run = T.cma.runFor(cid2), kind = el.getAttribute('data-cma'), L = T.listing(cid2);
      if (kind === 'condition') { run.condition = el.value; T.log('CMA ' + L.address + ': condition set to ' + el.value, 'cma'); }
      else if (kind === 'include') { run.include[el.getAttribute('data-comp')] = el.checked; T.log('CMA ' + L.address + ': ' + (el.checked ? 'included ' : 'excluded ') + T.listing(el.getAttribute('data-comp')).address, 'cma'); }
      else if (kind === 'rate') {
        var rv = Number(el.value);
        if (isNaN(rv) || rv < 0 || el.value === '') { A.toast('Enter a number zero or above.'); el.value = run.rates[el.getAttribute('data-k')]; return; }
        run.rates[el.getAttribute('data-k')] = rv; T.log('CMA ' + L.address + ': ' + el.getAttribute('data-k') + ' rate set to ' + rv, 'cma');
      }
      run.updated = T.nowISO();
      T.store.commit();
    } else if (el.hasAttribute('data-lf') && el.type !== 'text' && el.type !== 'search') {
      T.ui.lf[el.getAttribute('data-lf')] = el.type === 'checkbox' ? el.checked : el.value; A.render();
    }
  });
  var saveT = 0;
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.id === 'composer-input') {
      var s = S(); s.draft = el.value; if (!s.draftKind) s.draftKind = 'text';
      autosize(el);
      clearTimeout(saveT); saveT = setTimeout(function () { T.store.save(); }, 300);
    } else if (el.getAttribute('data-filter') === 'q') {
      T.ui.clientQ = el.value; A.render();
    } else if (el.hasAttribute('data-lf') && (el.type === 'text' || el.type === 'search')) {
      T.ui.lf[el.getAttribute('data-lf')] = el.value; A.render();
    } else if (el.id === 'search-q') {
      sr.active = 0; A.searchUpdate();
    } else if (el.closest && el.closest('#form-in')) A.formLive();
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, kind = f.getAttribute('data-form');
    if (kind === 'ask') {
      e.preventDefault();
      var s = S(), ta = $('composer-input');
      var k = s.draftKind === 'voice' ? 'voice' : 'text';
      A.submit(ta.value, k, s.draftSource, s.draftLang);
    } else if (kind === 'entity') { e.preventDefault(); A.submitForm(f); }
    else if (kind === 'note') {
      e.preventDefault();
      var tn = f.querySelector('textarea'), n = T.clients.addNote(f.getAttribute('data-client'), tn.value);
      if (!n) { A.toast('Write something first.'); tn.focus(); return; }
      T.tick(1); T.store.commit(); A.toast('Note saved to the record. Use “Plan this” to turn it into an Action Card.');
    } else if (kind === 'lfilter') e.preventDefault();
    else if (kind === 'listing-act') {
      e.preventDefault();
      var btn = e.submitter || f._last, act = btn ? btn.value : 'save', lid = f.getAttribute('data-listing'), L = T.listing(lid);
      var cid = f.querySelector('[name=client]').value, c = T.client(cid);
      if (!c) { A.toast('Pick a client first.'); return; }
      if (act === 'save') {
        if ((c.saved || []).indexOf(lid) > -1) { A.toast('Already saved for ' + c.first + '.'); return; }
        T.clients.toggleSaved(cid, lid); T.tick(1); T.store.commit();
        A.toast('Saved to ' + T.fullName(c) + '’s record.', { label: 'Undo', fn: function () { T.clients.toggleSaved(cid, lid); T.store.commit(); } });
      } else if (act === 'send') {
        var p = T.parse('Send ' + T.fullName(c) + ' the listing at ' + L.address);
        p.intent = 'listings'; p.clientId = cid; p.ambiguous = null; p.listingIds = [lid]; p.clientWhy = 'Picked in Listings.'; p.spans = [];
        A.planFrom(p, 'Send ' + T.fullName(c) + ' the listing at ' + L.address + ' (from Listings).');
      } else if (act === 'visit') {
        var d = f.querySelector('[name=date]').value, tm = f.querySelector('[name=time]').value;
        if (!T.validDate(d) || !T.validTime(tm)) { A.toast('Pick a date and a time for the visit.'); return; }
        var p2 = T.parse('Book a showing with ' + T.fullName(c) + ' at ' + L.address);
        p2.intent = 'schedule'; p2.clientId = cid; p2.ambiguous = null; p2.listingId = lid; p2.listingIds = [lid]; p2.isCall = false; p2.clientWhy = 'Picked in Listings.'; p2.listingWhy = 'Picked in Listings.'; p2.spans = [];
        p2.when = { date: d, time: tm, text: T.fmtDT(d + 'T' + tm), note: 'picked in Listings', timeText: tm };
        A.planFrom(p2, 'Book a showing with ' + T.fullName(c) + ' at ' + L.address + ' on ' + T.fmtDT(d + 'T' + tm) + ' (from Listings).');
      }
    } else if (kind === 'clock-to') {
      e.preventDefault();
      var to = f.querySelector('[name=to]').value;
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(to)) { A.toast('Pick a date and time.'); return; }
      A.advance(to);
    } else if (kind === 'lab-event') { e.preventDefault(); labEvent(f); }
  });
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button[type=submit]'); if (b && b.form) b.form._last = b; }, true);
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if ($('search-dlg').open) closeDialog('search-dlg'); else A.openSearch(); return; }
    if (e.target && e.target.id === 'search-q') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (sr.res.length) { sr.active = (sr.active + (e.key === 'ArrowDown' ? 1 : -1) + sr.res.length) % sr.res.length; A.searchUpdate(); } return; }
      if (e.key === 'Enter') { e.preventDefault(); searchGo(sr.active); return; }
    }
    if (e.target && e.target.id === 'composer-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      var f = $('composer'); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
    if (e.key === 'Escape' && T.capture.open) { e.preventDefault(); T.capture.cancel(); return; }
    if (e.key === 'Escape' && A.labOpen && !document.querySelector('dialog[open]')) { e.preventDefault(); A.closeLab(); return; }
    if (e.key === 'Tab' && T.capture.open) {
      var f2 = Array.prototype.slice.call($('capture').querySelectorAll('button:not([disabled])'));
      if (!f2.length) return;
      var first = f2[0], last = f2[f2.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('toggle', function (e) {
    var el = e.target;
    if (el && el.getAttribute && el.getAttribute('data-ui')) T.ui.open[el.getAttribute('data-ui')] = el.open;
  }, true);
  $('form-dlg').addEventListener('close', function () { A.formCtx = null; });

  window.addEventListener('hashchange', function () { if (!desktopMQ.matches && A.labOpen) A.closeLab(); A.render(); });
  if (window.ApiMeter && ApiMeter.onChange) ApiMeter.onChange(function () { if (!A.mute) { var t = $('top'); if (t) { t._html = ''; swap(t, R.top()); } A.renderComposer(); } });
  if (window.LiveAI) window.LiveAI.onChange(function (on) { T.log('Live AI ' + (on ? 'key added' : 'key removed'), 'ai'); T.store.commit(); });
  window.addEventListener('afterprint', function () { $('print-root').innerHTML = ''; });

  /* ---------------- boot ---------------- */
  A.boot = function () {
    T.store.load();
    T.store.on(A.render);
    A.renderComposer();
    A.render();
    // resume an execution interrupted by a reload (durable cursor)
    var s = S();
    Object.keys(s.cards).forEach(function (k) { if (s.cards[k].status === 'running') T.resume(k); });
    if (T.tour) T.tour.boot();
    document.documentElement.classList.add('is-ready');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', A.boot); else A.boot();
})();
