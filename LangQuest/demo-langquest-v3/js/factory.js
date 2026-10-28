/* LangQuest V3 — content factory, studio → learner, for any of the 30 courses.
   A template draft (greet / order / way) starts from the course phrase pack or a live-AI
   proposal, is edited (phrases, accepted phrasings, branches, local, scene), passes computed
   gates (schema, semantic check against the real meaning matcher, native review, rights,
   audio plan), and once published is a playable mission built by the same engine as every
   other template mission. Uploaded audio can be attached to a mission or an audio lesson. */
'use strict';
(function () {
  const SV = LQ.studio, U = LQ.ui, S = LQ.store, esc = U.esc, ic = U.icon;
  const FX = LQ.factory = { proposal: {}, busy: {}, cache: {} };
  const sd = () => S.state && S.state.studio;
  const T4all = s => ({ en: s, fr: s, es: s, ru: s });
  const CH = { n: 6, en: 'New from the studio', fr: 'Nouveau du studio', es: 'Nuevo del estudio', ru: 'Новое из студии' };
  FX.BRANCH = {
    greet: [['skip', 'Let the learner skip small talk: saying their name first jumps to goodbye']],
    order: [['alt', 'Offer tea as an alternative drink branch'], ['early', 'Coach a note when the learner thanks before asking the price']],
    way: [['fast', 'First answer is fast with text hidden; asking to slow down branches to a slower repeat']]
  };
  FX.STATUS = { draft: 'Draft', review_needed: 'Review needed', approved: 'Approved', published: 'Published', rejected: 'Rejected' };
  const CONCEPT_LABEL = { hello: 'Learner: hello', fine: 'Learner: I’m fine, and you?', name: 'Learner: my name is {name}', bye: 'Learner: goodbye', thanks: 'Learner: thank you', coffee: 'Learner: a coffee, please', tea: 'Learner: a tea, please', howmuch: 'Learner: how much is it?', where: 'Learner: where is the station?', slower: 'Learner: more slowly, please',
    c_howareyou: 'Local: how are you?', c_name: 'Local: what’s your name?', c_nice: 'Local: nice to meet you', c_what: 'Local: what would you like?', c_here: 'Local: here you are', c_price: 'Local: the price', c_way: 'Local: the directions', c_welcome: 'Local: you’re welcome', c_sorry: 'Local: sorry? (clarify)' };
  FX.conceptLabel = c => CONCEPT_LABEL[c] || c;

  /* Which concepts a template actually uses, found by building it once. */
  const usedCache = {};
  FX.conceptsFor = (tid, kind) => {
    const k = tid + '|' + kind; if (usedCache[k]) return usedCache[k];
    const used = new Set();
    LQ.buildTemplate(tid, kind, { id: 'probe', gid: 'probe', character: null, phrase: c => { used.add(c); return LQ.packPhrase(tid, c); } });
    const learner = LQ.LEARNER_CONCEPTS.filter(c => used.has(c)), chars = Array.from(used).filter(c => !learner.includes(c)).sort();
    return (usedCache[k] = { learner, chars, all: learner.concat(chars) });
  };
  const phraseOf = d => c => { const p = d.phrases[c]; if (!p || !String(p.t || '').trim()) return null; return { t: p.t, r: p.r || '', m: Object.assign({}, LQ.CONCEPTS[c], p.m || {}) }; };
  FX.register = d => { LQ.registerPackIntents(d.id, d.track, phraseOf(d), d.accept || {}); LQ.match.resetPackCache(d.id); };
  FX.touch = d => { d.rev = (d.rev || 0) + 1; d.updated = S.nowIso(); delete FX.cache[d.id]; FX.register(d); };

  FX.blank = (id, tid, kind, src) => {
    const t = LQ.trackById(tid), info = LQ.TEMPLATE_INFO[kind], need = FX.conceptsFor(tid, kind);
    const local = Object.assign({}, t.local || { name: 'A neighbour', role: 'who lives nearby' });
    const phrases = {}; need.all.forEach(c => { const p = LQ.packPhrase(tid, c); if (p) phrases[c] = { t: p.t, r: p.r || '', m: Object.assign({}, p.m) }; });
    return { id, kind: 'template', template: kind, intent: kind, track: tid, source: src || 'en', title: (info.title[src] || info.title.en).replace('{local}', local.name).replace('{city}', t.city), local, scene: info.scene, status: 'draft', created: S.today(), updated: S.nowIso(), publishAt: null, publishedAt: null,
      rights: 'original', audio: 'tts', phrases, accept: {}, branches: { skip: true, alt: true, early: true, fast: true }, provenance: { source: 'rules', label: 'Template + course phrase pack (demo-authored)' }, model: 'Template + course phrase pack (rules)', notes: [], history: [{ at: S.nowIso(), who: 'Content factory', what: 'Created from the “' + info.label + '” template with the ' + t.name + ' phrase pack' }], rev: 0 };
  };
  LQ.seedTemplateDrafts = () => {
    const mk = (id, tid, kind, extra, edit) => { const d = Object.assign(FX.blank(id, tid, kind, 'en'), extra); if (edit) edit(d); return d; };
    return [
      mk('D-203', 'swahili', 'order', { title: 'Order chai at Amani’s kiosk', created: '2026-10-22', updated: '2026-10-22T16:40', status: 'review_needed', local: { name: 'Amani', role: 'who runs the corner kiosk' }, history: [{ at: '2026-10-22T15:05', who: 'Content factory', what: 'Created from the “Order a drink” template with the Swahili phrase pack' }, { at: '2026-10-22T16:40', who: 'Content editor', what: 'Sent to native review' }] },
        d => { d.accept = { tea: ['chai ya maziwa'] }; }),
      mk('D-204', 'greek', 'greet', { title: 'Meet Eleni on the stairs', created: '2026-10-21', updated: '2026-10-22T11:20', status: 'approved', publishAt: '2026-10-24T09:00', reviewedBy: 'Native reviewer (Greek)', history: [{ at: '2026-10-21T10:00', who: 'Content factory', what: 'Created from the “Meet a neighbour” template' }, { at: '2026-10-21T17:30', who: 'Content editor', what: 'Sent to native review' }, { at: '2026-10-22T11:20', who: 'Native reviewer (Greek)', what: 'Approved; scheduled to publish on Sat Oct 24, 9:00 AM' }] }),
      mk('D-205', 'korean', 'way', { title: 'Find the subway with Ji-woo', created: '2026-10-23', updated: '2026-10-23T08:55', scene: 'station', history: [{ at: '2026-10-23T08:55', who: 'Content factory', what: 'Created from the “Ask the way” template; the “slower” line still needs writing' }] },
        d => { d.phrases.slower = { t: '', r: '', m: Object.assign({}, LQ.CONCEPTS.slower) }; }),
      mk('D-206', 'hindi', 'order', { title: 'Order chai at the station', created: '2026-10-19', updated: '2026-10-22T09:00', status: 'published', publishedAt: '2026-10-22', scene: 'station', local: { name: 'Arjun', role: 'who runs the platform tea stall' }, reviewedBy: 'Native reviewer (Hindi)', history: [{ at: '2026-10-19T14:00', who: 'Content factory', what: 'Created from the “Order a drink” template' }, { at: '2026-10-20T10:10', who: 'Native reviewer (Hindi)', what: 'Approved' }, { at: '2026-10-22T09:00', who: 'Administrator', what: 'Published to learners' }] })
    ];
  };

  /* ── the learner-facing mission ── */
  FX.mission = d => {
    const key = d.id + ':' + (d.rev || 0) + ':' + d.status;
    if (FX.cache[d.id] && FX.cache[d.id].key === key) return FX.cache[d.id].m;
    FX.register(d);
    const m = LQ.buildTemplate(d.track, d.template, { id: 'fx-' + d.id, gid: d.id, phrase: phraseOf(d), local: d.local, character: null, title: T4all(d.title), scene: d.scene, factory: true, chapter: Object.assign({}, CH, { n: LQ.templateChapter(d.track) + 1 }), exprPrefix: 'fx-' + d.id + '-', provenance: d.provenance, branches: d.branches });
    m.status = d.status === 'published' ? 'playable' : 'preview';
    m.previewNote = T4all('This mission is a studio draft (' + FX.STATUS[d.status].toLowerCase() + '). It reaches learners only after native review, a rights check and publishing.');
    m.draftId = d.id;
    FX.cache[d.id] = { key, m }; return m;
  };
  const drafts = () => (sd() ? sd().drafts : []).filter(d => d.kind === 'template');
  LQ.factoryMissions = tid => drafts().filter(d => d.track === tid && d.status === 'published').map(FX.mission);
  LQ.factoryMission = id => { const d = drafts().find(x => 'fx-' + x.id === id); return d ? FX.mission(d) : null; };

  /* ── gates, computed from the draft itself ── */
  FX.checks = d => {
    const need = FX.conceptsFor(d.track, d.template), t = LQ.trackById(d.track), issues = [];
    if (!String(d.title || '').trim()) issues.push('The mission needs a title.');
    if (!d.local || !String(d.local.name || '').trim()) issues.push('The local character needs a name.');
    const missing = need.all.filter(c => !d.phrases[c] || !String(d.phrases[c].t || '').trim());
    if (missing.length) issues.push('Missing ' + t.name + ' text: ' + missing.map(FX.conceptLabel).join('; ') + '.');
    const noMean = need.all.filter(c => d.phrases[c] && String(d.phrases[c].t || '').trim() && !String(((d.phrases[c].m || {})[d.source]) || '').trim());
    if (noMean.length) issues.push('Missing ' + S.srcName(d.source) + ' meaning: ' + noMean.map(FX.conceptLabel).join('; ') + '.');
    if (need.learner.includes('name') && d.phrases.name && d.phrases.name.t && !/\{name\}/.test(d.phrases.name.t)) issues.push('The “my name is” line must keep the {name} placeholder.');
    const warn = t.script !== 'Latn' ? need.learner.filter(c => d.phrases[c] && d.phrases[c].t && !d.phrases[c].r).map(FX.conceptLabel) : [];
    const schema = { ok: !issues.length, issues, warn: warn.length ? ['No romanization yet for: ' + warn.join('; ') + '. Learners who chose romanized text will see the native script.'] : [] };
    const sem = { ok: false, issues: [], passed: 0, total: 0 };
    if (!schema.ok) sem.issues.push('Runs once every line has text.');
    else {
      FX.register(d);
      const m = FX.mission(d), nm = s => U.nm(s);
      Object.entries(m.roleplay.turns).forEach(([tk, turn]) => (turn.expect || []).forEach(x => {
        const c = x.intent.split(':')[2], own = [d.phrases[c].t].concat((d.accept || {})[c] || []);
        own.forEach(text => {
          sem.total++;
          if (!LQ.match.intent(x.intent, nm(text)).ok) { sem.issues.push('“' + nm(text) + '” isn’t recognised as “' + FX.conceptLabel(c) + '” in turn ' + tk + '.'); return; }
          // The first matching line in a turn wins, so only an earlier line can steal this one.
          const clash = (turn.expect || []).slice(0, (turn.expect || []).indexOf(x)).filter(y => LQ.match.intent(y.intent, nm(text)).ok).map(y => FX.conceptLabel(y.intent.split(':')[2]));
          if (clash.length) { sem.issues.push('“' + nm(text) + '” would be read as ' + clash.join(', ') + ' in turn ' + tk + ', which is checked first. Make the lines more distinct.'); return; }
          sem.passed++;
        });
      }));
      sem.ok = sem.total > 0 && sem.passed === sem.total;
    }
    const rb = LQ.RIGHTS_BASIS[d.rights] || LQ.RIGHTS_BASIS.unknown;
    const att = (sd().assets || []).find(a => a.attach && a.attach.kind === 'mission' && a.attach.id === 'fx-' + d.id && a.published);
    return { schema, semantic: sem, native: { ok: d.status === 'approved' || d.status === 'published' }, rights: { ok: !!rb.publish, why: rb.why || '' }, audio: { ok: d.audio === 'tts' || !!att, att } };
  };
  FX.gateList = c => [['schema', 'Schema valid', c.schema.ok], ['semantic', 'Semantic check' + (c.semantic.total ? ' (' + c.semantic.passed + '/' + c.semantic.total + ')' : ''), c.semantic.ok], ['native', 'Native review', c.native.ok], ['rights', 'Source rights', c.rights.ok], ['audio', 'Audio plan', c.audio.ok]];

  /* ── list + editor ── */
  const role = () => sd().role;
  const who = () => (LQ.STUDIO_ROLES[role()] || {}).label || role();
  const hist = (d, what) => { d.history = d.history || []; d.history.unshift({ at: S.nowIso(), who: who(), what }); SV.audit(d.id + ': ' + what); };
  const stChip = d => '<span class="st st--' + (d.status === 'draft' ? 'imported_draft' : d.status) + '">' + FX.STATUS[d.status] + '</span>';
  SV.fxRow = d => { const c = FX.checks(d); return '<li><a href="#/studio/draft/' + d.id + '"><strong>' + esc(d.title) + '</strong><span class="muted small">' + esc(SV.tname(d.track) + ' from ' + S.srcName(d.source) + '. Template “' + LQ.TEMPLATE_INFO[d.template].label + '”, ' + d.model) + '</span></a><span class="row2"><button class="btn btn--sm btn--primary" data-act="fx-approve" data-arg="' + d.id + '"' + (SV.can('review', d.track) && c.schema.ok && c.semantic.ok ? '' : ' disabled title="' + esc(!SV.can('review', d.track) ? SV.why('review') : 'Schema and semantic checks must pass first') + '"') + '>Approve</button><button class="btn btn--sm" data-act="fx-reject" data-arg="' + d.id + '"' + (SV.can('review', d.track) ? '' : ' disabled') + '>Reject</button></span></li>'; };
  const SEC = SV.SEC, legacy = SEC.factory;
  SEC.factory = () => {
    let h = SV.head('Content factory', 'Missions for any of the 30 courses start from a communicative template and a phrase set, not from translating a script. Nothing reaches learners until a native reviewer and an administrator sign off. D-201 maps to a hand-written mission script; D-202 is an expression set whose Darija text waits for a native writer. No model was called for either.');
    const aiOn = LQ.ai.on();
    h += '<form class="panelcard stack-sm" data-submit="fx-new"><h2 class="h4">New mission</h2><div class="row3">' +
      '<label class="field"><span>Course</span><select name="track">' + LQ.TRACKS.map(t => '<option value="' + t.id + '"' + (t.id === (FX.lastTrack || 'swahili') ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Template</span><select name="template">' + LQ.TEMPLATE_KINDS.map(k => '<option value="' + k + '">' + esc(LQ.TEMPLATE_INFO[k].label) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>From</span><select name="source">' + LQ.SOURCES.slice(0, 4).map(s => '<option value="' + s.code + '">' + esc(s.name) + '</option>').join('') + '</select></label></div>' +
      '<fieldset class="field"><legend>Start from</legend><div class="seg seg--wrap"><label class="segopt"><input type="radio" name="start" value="pack" checked><span title="Built by rules from the course phrase pack">Phrase pack</span></label><label class="segopt"><input type="radio" name="start" value="ai"' + (aiOn ? '' : ' disabled') + '><span>Live AI</span></label></div></fieldset>' +
      (aiOn ? '' : '<p class="muted small">' + LQ.ai.statusIcon() + '</p>') +
      '<button class="btn btn--sm btn--primary" type="submit"' + (SV.can('factory') ? '' : ' disabled title="' + esc(SV.why('factory')) + '"') + '>' + ic('wand', 'ic--xs') + 'Create draft</button></form>';
    const list = drafts();
    h += '<section class="panelcard"><h2 class="h4">Drafts <span class="muted small">' + list.length + '</span></h2><div class="tablewrap"><table class="tbl" aria-label="Template mission drafts"><thead><tr><th scope="col">Draft</th><th scope="col">Course</th><th scope="col">Template</th><th scope="col">Status</th><th scope="col">Gates</th><th scope="col" class="col-hide">Updated</th></tr></thead><tbody>' +
      list.map(d => { const c = FX.checks(d), g = FX.gateList(c); return '<tr><td><a href="#/studio/draft/' + d.id + '"><strong>' + esc(d.title) + '</strong></a><span class="muted small block">' + esc(d.id) + (d.publishAt && d.status === 'approved' ? ', publishes ' + esc(S.fmtDay(d.publishAt.slice(0, 10)) + ' ' + d.publishAt.slice(11)) : '') + '</span></td><td>' + esc(SV.tname(d.track)) + '</td><td>' + esc(LQ.TEMPLATE_INFO[d.template].label) + '</td><td>' + stChip(d) + '</td><td><span class="gdots" aria-label="' + esc(g.map(x => x[1] + (x[2] ? ' passed' : ' not yet')).join(', ')) + '">' + g.map(x => '<span class="gdot' + (x[2] ? ' is-ok' : '') + '" title="' + esc(x[1]) + '"></span>').join('') + '</span></td><td class="small col-hide">' + esc(S.fmtDay((d.updated || d.created).slice(0, 10))) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    const old = legacy().split('<!--legacy-->')[1] || '';
    return h + '<h2 class="h4">Hand-built drafts</h2>' + old;
  };

  SEC.draft = id => {
    const d = drafts().find(x => x.id === id); if (!d) return SEC.factory();
    const t = LQ.trackById(d.track), c = FX.checks(d), need = FX.conceptsFor(d.track, d.template), info = LQ.TEMPLATE_INFO[d.template];
    const editable = SV.can('edit') && d.status !== 'published', dis = editable ? '' : ' disabled', nonLatin = t.script !== 'Latn';
    let h = '<a class="backlink" href="#/studio/factory">' + ic('back', 'ic--sm') + ' Content factory</a>' + SV.head(d.title || '(untitled)', esc(d.id + ', ' + t.name + ' from ' + S.srcName(d.source) + '. Template “' + info.label + '”. ') + LQ.ai.badge(d.provenance && d.provenance.source === 'live-ai' ? d.provenance : null), stChip(d));
    h += '<ul class="gates gates--row" role="list">' + FX.gateList(c).map(g => '<li class="' + (g[2] ? 'is-ok' : 'is-no') + '">' + ic(g[2] ? 'check' : 'close', 'ic--xs') + esc(g[1]) + '</li>').join('') + '</ul>';
    const probs = c.schema.issues.concat(c.schema.ok ? c.semantic.issues : []).concat(c.rights.ok ? [] : [c.rights.why]);
    if (probs.length) h += '<div class="callout callout--block">' + ic('info') + '<div><strong>Before review</strong><ul class="plain">' + probs.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></div></div>';
    if (c.schema.warn.length) h += '<p class="note">' + ic('info', 'ic--sm') + '<span>' + esc(c.schema.warn[0]) + '</span></p>';
    // workflow buttons
    const all = c.schema.ok && c.semantic.ok && c.rights.ok && c.audio.ok;
    h += '<div class="panelcard"><h2 class="h4">Workflow</h2><div class="row2 wrap">' +
      (['draft', 'rejected'].includes(d.status) ? '<button class="btn btn--sm btn--primary" data-act="fx-submit" data-arg="' + d.id + '"' + (SV.can('request_review') && c.schema.ok && c.semantic.ok && c.rights.ok ? '' : ' disabled title="' + esc(!SV.can('request_review') ? SV.why('request_review') : 'Schema, semantic and rights checks must pass') + '"') + '>' + ic('eye', 'ic--xs') + 'Send to native review</button>' : '') +
      (d.status === 'review_needed' ? '<button class="btn btn--sm btn--primary" data-act="fx-approve" data-arg="' + d.id + '"' + (SV.can('review', d.track) && c.schema.ok && c.semantic.ok ? '' : ' disabled title="' + esc(SV.why('review')) + '"') + '>Approve (native reviewer)</button><button class="btn btn--sm" data-act="fx-reject" data-arg="' + d.id + '"' + (SV.can('review', d.track) ? '' : ' disabled title="' + esc(SV.why('review')) + '"') + '>Send back</button>' : '') +
      (d.status === 'approved' ? '<button class="btn btn--sm btn--primary" data-act="fx-publish" data-arg="' + d.id + '"' + (SV.can('publish') && all ? '' : ' disabled title="' + esc(SV.can('publish') ? 'Every gate must pass' : SV.why('publish')) + '"') + '>' + ic('globe', 'ic--xs') + 'Publish to learners</button>' : '') +
      (d.status === 'published' ? '<button class="btn btn--sm" data-act="fx-unpublish" data-arg="' + d.id + '"' + (SV.can('publish') ? '' : ' disabled title="' + esc(SV.why('publish')) + '"') + '>Unpublish</button><a class="btn btn--sm btn--ghost" href="#/mission/fx-' + d.id + '">Open in the learner app</a>' : '') +
      (['draft', 'rejected'].includes(d.status) ? '<button class="btn btn--sm btn--quiet" data-act="fx-delete" data-arg="' + d.id + '"' + (SV.can('factory') ? '' : ' disabled') + '>Delete draft</button>' : '') + '</div>' +
      (d.status === 'approved' ? '<form class="row2 wrap" data-submit="fx-schedule" data-arg="' + d.id + '"><label class="field field--inline"><span>Or publish automatically on</span><input type="datetime-local" name="at" value="' + esc(d.publishAt || S.nowIso()) + '"></label><button class="btn btn--sm" type="submit"' + (SV.can('publish') ? '' : ' disabled') + '>' + (d.publishAt ? 'Change schedule' : 'Schedule') + '</button>' + (d.publishAt ? '<button class="btn btn--sm btn--quiet" type="button" data-act="fx-unschedule" data-arg="' + d.id + '">Clear</button>' : '') + '</form>' + (d.publishAt ? '<p class="small muted">Publishes when the demo clock reaches ' + esc(S.fmtDay(d.publishAt.slice(0, 10)) + ', ' + d.publishAt.slice(11)) + ', if every gate still passes.</p>' : '') : '') +
      (d.status === 'published' ? '<p class="small muted">Published ' + esc(S.fmtDay(d.publishedAt)) + '. Unpublish to edit; learners keep the progress they made.</p>' : d.status !== 'draft' && d.status !== 'rejected' ? '<p class="small muted">Editing sends it back to draft, and it needs review again.</p>' : '') + '</div>';
    // live AI proposal
    const pr = FX.proposal[d.id];
    h += '<section class="panelcard"><h2 class="h4">Live AI draft (optional)</h2>' + (FX.busy[d.id] ? '<p role="status">' + ic('cpu', 'ic--xs') + ' Asking ' + LQ.ai.MODEL + ' for a proposal…</p>' : pr ? proposalHtml(d, pr) : '<p class="muted small">' + (LQ.ai.on() ? 'Ask ' + LQ.ai.MODEL + ' to propose every line for this template in ' + esc(t.variety) + '. It’s only a proposal: you compare and apply it, and native review still decides.' : esc(LQ.ai.why())) + '</p><button class="btn btn--sm" data-act="fx-ai" data-arg="' + d.id + '"' + (LQ.ai.on() && editable && SV.can('factory') ? '' : ' disabled') + '>' + ic('cpu', 'ic--xs') + 'Propose lines with live AI</button>') + (FX.err && FX.err[d.id] ? '<p class="cap__err">' + ic('info', 'ic--sm') + '<span>' + esc(FX.err[d.id]) + '</span></p>' : '') + '</section>';
    // editor form
    h += '<form class="panelcard stack-sm" data-submit="fx-save" data-arg="' + d.id + '"><h2 class="h4">Mission</h2>' +
      '<div class="row3"><label class="field"><span>Title (' + esc(S.srcName(d.source)) + ')</span><input name="title" maxlength="80" value="' + esc(d.title) + '"' + dis + '></label><label class="field"><span>Local character</span><input name="localName" maxlength="30" value="' + esc(d.local.name) + '"' + dis + '></label><label class="field"><span>Who they are</span><input name="localRole" maxlength="60" value="' + esc(d.local.role) + '"' + dis + '></label></div>' +
      '<div class="row3"><label class="field"><span>Scene</span><select name="scene"' + dis + '>' + ['plaza', 'kiosk', 'station', 'paris-cafe', 'brooklyn-cafe', 'tokyo-cafe'].map(s => '<option value="' + s + '"' + (d.scene === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Source rights</span><select name="rights"' + dis + '>' + Object.entries(LQ.RIGHTS_BASIS).map(([k, r]) => '<option value="' + k + '"' + (d.rights === k ? ' selected' : '') + '>' + esc(r.label) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Audio plan</span><select name="audio"' + dis + '><option value="tts"' + (d.audio === 'tts' ? ' selected' : '') + '>Device voices, labelled as synthetic</option><option value="recording"' + (d.audio !== 'tts' ? ' selected' : '') + '>Native recording (attach in the library)</option></select></label></div>' +
      (d.audio !== 'tts' ? '<p class="small muted">' + (c.audio.att ? 'Recording attached: ' + esc(c.audio.att.id + ' “' + c.audio.att.title + '”') : 'No published recording is attached to fx-' + esc(d.id) + ' yet. Upload one in the library, clear its gates, then attach it here.') + '</p>' : '') +
      '<fieldset class="field"><legend>Branches</legend>' + FX.BRANCH[d.template].map(([k, l]) => '<label class="check"><input type="checkbox" name="br_' + k + '"' + (d.branches[k] !== false ? ' checked' : '') + dis + '><span>' + esc(l) + '</span></label>').join('') + '</fieldset>' +
      '<h3 class="h4">Lines</h3><p class="muted small">Learner lines are what the matcher accepts; add other natural phrasings under “Also accept” (comma-separated). Local lines are what ' + esc(d.local.name) + ' says.</p>' +
      '<div class="tablewrap"><table class="tbl tbl--edit"><thead><tr><th scope="col">Line</th><th scope="col">' + esc(t.name) + '</th>' + (nonLatin ? '<th scope="col">Romanization</th>' : '') + '<th scope="col">Meaning (' + esc(S.srcName(d.source)) + ')</th><th scope="col">Also accept</th></tr></thead><tbody>' +
      need.all.map(cn => { const p = d.phrases[cn] || { t: '', r: '', m: {} }, learner = need.learner.includes(cn); return '<tr class="' + (String(p.t || '').trim() ? '' : 'is-missing') + '"><th scope="row" class="small">' + esc(FX.conceptLabel(cn)) + '</th><td><input name="pt_' + cn + '" value="' + esc(p.t) + '" dir="auto" lang="' + esc(t.tts[0]) + '" aria-label="' + esc(FX.conceptLabel(cn) + ', ' + t.name) + '"' + dis + '></td>' + (nonLatin ? '<td><input name="pr_' + cn + '" value="' + esc(p.r || '') + '" aria-label="' + esc(FX.conceptLabel(cn) + ', romanization') + '"' + dis + '></td>' : '') + '<td><input name="pm_' + cn + '" value="' + esc((p.m || {})[d.source] || '') + '" aria-label="' + esc(FX.conceptLabel(cn) + ', meaning') + '"' + dis + '></td><td>' + (learner ? '<input name="pa_' + cn + '" value="' + esc(((d.accept || {})[cn] || []).join(', ')) + '" dir="auto" aria-label="' + esc(FX.conceptLabel(cn) + ', also accept') + '"' + dis + '>' : '<span class="muted small">—</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (editable ? '<button class="btn btn--sm btn--primary" type="submit">Save and re-run checks</button>' : '<p class="muted small">' + esc(d.status === 'published' ? 'Published drafts are read-only. Unpublish to edit.' : SV.why('edit')) + '</p>') + '</form>';
    // try it
    h += '<section class="panelcard"><h2 class="h4">Try the matcher</h2><form class="row2 wrap" data-submit="fx-try" data-arg="' + d.id + '"><label class="field field--grow"><span>Type what a learner might say</span><input name="q" dir="auto" lang="' + esc(t.tts[0]) + '" value="' + esc(FX.tryQ || '') + '"></label><button class="btn btn--sm" type="submit">Check</button></form>' + (FX.tryRes && FX.tryRes.id === d.id ? '<p class="small">' + esc(FX.tryRes.text) + '</p>' : '') + '</section>';
    h += '<section class="panelcard"><h2 class="h4">History</h2><ol class="auditmini">' + (d.history || []).map(x => '<li><span class="muted small">' + esc(S.fmtDay(x.at.slice(0, 10)) + (x.at.length > 10 ? ' ' + x.at.slice(11) : '')) + '</span><span>' + esc(x.what) + '</span><span class="muted small">' + esc(x.who) + '</span></li>').join('') + '</ol></section>';
    return h;
  };
  function proposalHtml(d, pr) {
    const t = LQ.trackById(d.track), rows = pr.data.phrases;
    return LQ.ai.badge(pr.prov) + '<p><strong>Proposed title:</strong> ' + esc(pr.data.title) + '. <strong>Local:</strong> ' + esc(pr.data.local_name + ', ' + pr.data.local_role) + '</p>' +
      '<div class="tablewrap"><table class="tbl tbl--mini"><thead><tr><th scope="col">Line</th><th scope="col">Now</th><th scope="col">Proposed</th></tr></thead><tbody>' + rows.map(r => { const cur = d.phrases[r.concept] || {}; const same = (cur.t || '') === r.target; return '<tr class="' + (same ? '' : 'is-changed') + '"><th scope="row" class="small">' + esc(FX.conceptLabel(r.concept)) + '</th><td dir="auto">' + esc(cur.t || '—') + '</td><td dir="auto"><span lang="' + esc(t.tts[0]) + '">' + esc(r.target) + '</span>' + (r.romanization ? ' <span class="muted small">' + esc(r.romanization) + '</span>' : '') + '<span class="muted small block">' + esc(r.meaning) + '</span></td></tr>'; }).join('') + '</tbody></table></div>' +
      (pr.data.notes.length ? '<ul class="notes" role="list">' + pr.data.notes.map(n => '<li>' + ic('info', 'ic--xs') + '<span>' + esc(n) + '</span></li>').join('') + '</ul>' : '') +
      '<div class="row2"><button class="btn btn--sm btn--primary" data-act="fx-ai-apply" data-arg="' + d.id + '"' + (SV.can('edit') ? '' : ' disabled') + '>Apply to the draft</button><button class="btn btn--sm btn--ghost" data-act="fx-ai-discard" data-arg="' + d.id + '">Discard</button></div><p class="muted small">Applying keeps it a draft: checks re-run and a native reviewer still has to approve it.</p>';
  }

  /* ── live AI proposal ── */
  FX.aiSchema = concepts => ({ type: 'object', properties: { title: { type: 'string' }, local_name: { type: 'string' }, local_role: { type: 'string' }, phrases: { type: 'array', items: { type: 'object', properties: { concept: { type: 'string', enum: concepts }, target: { type: 'string' }, romanization: { type: 'string' }, meaning: { type: 'string' } }, required: ['concept', 'target', 'romanization', 'meaning'], additionalProperties: false } }, notes: { type: 'array', items: { type: 'string' } } }, required: ['title', 'local_name', 'local_role', 'phrases', 'notes'], additionalProperties: false });
  FX.requestAI = (d) => {
    const t = LQ.trackById(d.track), info = LQ.TEMPLATE_INFO[d.template], need = FX.conceptsFor(d.track, d.template), src = S.srcName(d.source);
    FX.busy[d.id] = true; if (FX.err) delete FX.err[d.id]; LQ.app.render();
    const system = LQ.ai.context(d.track) + ' You draft lines for one LangQuest template mission, for review by a native speaker. Template: “' + info.label + '”: ' + info.outcome.en.replace(/\{local\}/g, 'the local') + ' Write every line as people in ' + t.city + ' really say it, short and A1-friendly. Learner lines are what the learner says; local lines are what the local character says. Keep the placeholder {name} exactly where the learner’s name goes. ' + (t.script !== 'Latn' ? 'Give a learner-friendly romanization for every line. ' : 'Leave romanization empty. ') + 'Meanings, the title and the notes are in ' + src + '. The local character is fictional. Notes: up to three short points for the native reviewer (register, regional choices, anything uncertain).';
    const prompt = 'Lines to write (concept: intended meaning):\n' + need.all.map(c => '- ' + c + ' (' + (need.learner.includes(c) ? 'learner' : 'local') + '): ' + U.L(c === 'c_price' ? (LQ.packPhrase(d.track, c) || {}).m : LQ.CONCEPTS[c], 'en')).join('\n') + '\n\nCurrent draft lines, for reference:\n' + need.all.map(c => '- ' + c + ': ' + ((d.phrases[c] || {}).t || '(empty)')).join('\n');
    return LQ.ai.json({ task: 'Factory draft for ' + d.id, system, prompt, schema: FX.aiSchema(need.all), maxTokens: 2200, effort: 'medium',
      extraCheck: data => { const miss = need.all.filter(c => !data.phrases.some(p => p.concept === c && String(p.target).trim())); const out = miss.length ? ['no line for ' + miss.join(', ')] : []; const nmL = data.phrases.find(p => p.concept === 'name'); if (nmL && !/\{name\}/.test(nmL.target)) out.push('the name line lost {name}'); return out; } })
      .then(res => { FX.busy[d.id] = false; FX.proposal[d.id] = { data: res.data, prov: res.provenance }; hist(d, 'Live AI proposal received (' + LQ.ai.MODEL + '), not applied'); S.save(); LQ.app.render(); })
      .catch(err => { FX.busy[d.id] = false; FX.err = FX.err || {}; FX.err[d.id] = (err.described || LQ.ai.describe(err)) + ' The draft keeps the course phrase pack (rules).'; LQ.app.render(); });
  };

  /* ── publishing (manual or scheduled) ── */
  function publish(d, how) {
    d.status = 'published'; d.publishedAt = S.today(); d.publishAt = null; FX.touch(d);
    hist(d, how || 'Published to learners');
    S.event('lesson.published', 'Mission “' + d.title + '” is playable in ' + SV.tname(d.track));
    SV.bump('mission ' + d.title);
    const n = S.notifyProfiles(pd => pd.enrollments[d.track] && pd.enrollments[d.track].status === 'active', { kind: 'studio', title: 'New mission in ' + SV.tname(d.track) + ': ' + d.title, body: 'Published from the content studio. Demo-authored phrases, reviewed in this demo by a stand-in reviewer.', link: '#/mission/fx-' + d.id });
    if (n) S.event('inbox.delivered', 'New-mission notice sent to ' + n + ' learner' + (n > 1 ? 's' : ''));
  }
  FX.publish = publish;
  S.tickHooks.push(() => {
    const now = S.nowIso();
    drafts().filter(d => d.status === 'approved' && d.publishAt && d.publishAt <= now).forEach(d => {
      const c = FX.checks(d);
      if (c.schema.ok && c.semantic.ok && c.rights.ok && c.audio.ok) publish(d, 'Scheduled publish ran at ' + d.publishAt.replace('T', ' '));
      else { d.publishAt = null; hist(d, 'Scheduled publish skipped: a gate no longer passes'); }
    });
  });

  /* ── attach an uploaded recording to a mission or an audio lesson ── */
  SV.attachSection = a => {
    if (a.kind !== 'upload') return '';
    const tid = a.track;
    const ms = tid ? LQ.missionsFor(tid).filter(m => m.status === 'playable' && !m.firstWords) : [];
    const ls = tid ? LQ.audioCollections().filter(c => c.track === tid && !c.uploaded && !c.archive).flatMap(c => c.chapters.flatMap(ch => ch.lessons.filter(l => l.segs).map(l => ({ id: l.id, title: c.title + ': ' + l.title })))) : [];
    const cur = a.attach ? a.attach.kind + ':' + a.attach.id : '';
    const target = a.attach ? (a.attach.kind === 'mission' ? LQ.missionById(a.attach.id) : null) : null;
    return '<section class="panelcard"><h2 class="h4">Attach to a lesson</h2><p class="muted small">Plays this recording inside a mission’s listening step, or in place of device voices in an audio lesson. Learners hear it only once the asset is published.</p>' +
      (tid ? '<form class="row2 wrap" data-submit="asset-attach" data-arg="' + a.id + '"><label class="field field--grow"><span>Attach to</span><select name="target"><option value="">Not attached</option><optgroup label="Missions">' + ms.map(m => '<option value="mission:' + m.id + '"' + (cur === 'mission:' + m.id ? ' selected' : '') + '>' + esc(U.L(m.title, a.source || 'en')) + '</option>').join('') + '</optgroup>' + (ls.length ? '<optgroup label="Audio lessons">' + ls.map(l => '<option value="lesson:' + l.id + '"' + (cur === 'lesson:' + l.id ? ' selected' : '') + '>' + esc(l.title) + '</option>').join('') + '</optgroup>' : '') + '</select></label><button class="btn btn--sm" type="submit"' + (SV.can('edit') ? '' : ' disabled title="' + esc(SV.why('edit')) + '"') + '>Save attachment</button></form>' : '<p class="muted small">Set the target course first.</p>') +
      (a.attach ? '<p class="small">' + ic('check', 'ic--xs') + ' Attached to ' + esc(a.attach.kind) + ' <strong>' + esc(target ? U.L(target.title, 'en') : a.attach.id) + '</strong>' + (a.published ? '. Live for learners: <a href="#/' + (a.attach.kind === 'mission' ? 'play/' : 'listen/') + esc(a.attach.id) + '">open it</a>.' : '. Publish the asset to make it audible to learners.') + '</p>' : '') + '</section>';
  };

  /* ── actions ── */
  const act = LQ.factoryActs = {};
  const D = el => drafts().find(x => x.id === el.dataset.arg);
  const editBack = (d, what) => { if (d.status === 'review_needed' || d.status === 'approved') { d.status = 'draft'; d.publishAt = null; what += '; back to draft for re-review'; } hist(d, what); FX.touch(d); };
  act['fx-submit'] = el => { const d = D(el); if (!d || !SV.can('request_review')) return; const c = FX.checks(d); if (!c.schema.ok || !c.semantic.ok || !c.rights.ok) { U.toast('Fix the checks first.'); return; } d.status = 'review_needed'; hist(d, 'Sent to native review'); FX.touch(d); S.event('draft.review_requested', d.id + ' “' + d.title + '” waits for a ' + SV.tname(d.track) + ' reviewer'); S.save(); U.toast('Sent to review. It appears in the review queue.'); LQ.app.render(); };
  act['fx-approve'] = el => { const d = D(el); if (!d || !SV.can('review', d.track)) { U.toast(SV.why('review')); return; } const c = FX.checks(d); if (!c.schema.ok || !c.semantic.ok) return; d.status = 'approved'; d.reviewedBy = who(); hist(d, 'Approved by native review'); FX.touch(d); S.event('draft.approved', d.id + ' approved for ' + SV.tname(d.track)); S.save(); LQ.app.render(); };
  act['fx-reject'] = el => { const d = D(el); if (!d || !SV.can('review', d.track)) return; d.status = 'rejected'; d.publishAt = null; hist(d, 'Sent back by the reviewer: needs changes'); FX.touch(d); S.event('draft.rejected', d.id + ' sent back to the editor'); S.save(); LQ.app.render(); };
  act['fx-publish'] = el => { const d = D(el); if (!d || !SV.can('publish')) return; const c = FX.checks(d); if (!(c.schema.ok && c.semantic.ok && c.rights.ok && c.audio.ok && c.native.ok)) { U.toast('Every gate must pass.'); return; } publish(d); S.save(); U.toast('Published. “' + d.title + '” is playable in ' + SV.tname(d.track) + '.'); LQ.app.render(); };
  act['fx-unpublish'] = el => { const d = D(el); if (!d || !SV.can('publish')) return; d.status = 'approved'; hist(d, 'Unpublished'); FX.touch(d); SV.bump('removed mission ' + d.title); S.event('lesson.unpublished', 'Mission “' + d.title + '” withdrawn from learners'); S.save(); LQ.app.render(); };
  act['fx-unschedule'] = el => { const d = D(el); if (!d) return; d.publishAt = null; hist(d, 'Publishing schedule cleared'); S.save(); LQ.app.render(); };
  act['fx-delete'] = el => { const d = D(el); if (!d) return; LQ.app.confirm('Delete draft ' + d.id + '?', '“' + d.title + '” and its history are removed from the studio. You can undo right after.', 'Delete draft', () => { const list = sd().drafts, i = list.indexOf(d); list.splice(i, 1); SV.audit('Deleted draft ' + d.id); S.event('draft.deleted', d.id + ' “' + d.title + '”'); S.save(); location.hash = '#/studio/factory'; U.toast('Draft deleted.', 'info', { undo: () => { list.splice(i, 0, d); SV.audit('Restored draft ' + d.id); S.save(); LQ.app.render(); } }); }); };
  act['fx-ai'] = el => { const d = D(el); if (d && LQ.ai.on()) FX.requestAI(d); };
  act['fx-ai-discard'] = el => { delete FX.proposal[el.dataset.arg]; LQ.app.render(); };
  act['fx-ai-apply'] = el => {
    const d = D(el), pr = FX.proposal[el.dataset.arg]; if (!d || !pr || !SV.can('edit')) return;
    const before = JSON.parse(JSON.stringify(d));
    pr.data.phrases.forEach(p => { d.phrases[p.concept] = { t: p.target, r: p.romanization || '', m: Object.assign({}, LQ.CONCEPTS[p.concept], { [d.source]: p.meaning }) }; });
    d.title = pr.data.title || d.title; d.local = { name: pr.data.local_name || d.local.name, role: pr.data.local_role || d.local.role };
    d.provenance = Object.assign({ label: 'Live AI proposal, applied by an editor' }, pr.prov); d.model = 'Live AI (' + LQ.ai.MODEL + '), edited in the studio';
    d.notes = pr.data.notes.slice(0, 3);
    delete FX.proposal[d.id]; editBack(d, 'Applied the live AI proposal'); S.save(); LQ.app.render();
    U.toast('Applied. Checks re-ran; native review still decides.', 'ok', { undo: () => { Object.keys(d).forEach(k => delete d[k]); Object.assign(d, before); FX.touch(d); S.save(); LQ.app.render(); } });
  };
  LQ.factorySubmit = {
    'fx-new': form => {
      if (!SV.can('factory')) return;
      const f = new FormData(form), tid = f.get('track'), kind = f.get('template'), src = f.get('source');
      const n = Math.max(200, ...sd().drafts.map(x => +String(x.id).replace(/\D/g, '') || 0)) + 1, id = 'D-' + n;
      const d = FX.blank(id, tid, kind, src); FX.lastTrack = tid;
      sd().drafts.unshift(d); FX.register(d); SV.audit('Created draft ' + id + ' (' + LQ.TEMPLATE_INFO[kind].label + ', ' + SV.tname(tid) + ')'); S.event('draft.created', id + ' “' + d.title + '” from the ' + kind + ' template');
      S.save(); location.hash = '#/studio/draft/' + id;
      if (f.get('start') === 'ai' && LQ.ai.on()) setTimeout(() => FX.requestAI(d), 60);
    },
    'fx-save': (form, arg) => {
      const d = drafts().find(x => x.id === arg); if (!d || !SV.can('edit') || d.status === 'published') return;
      const f = new FormData(form), need = FX.conceptsFor(d.track, d.template);
      d.title = (f.get('title') || '').trim(); d.local = { name: (f.get('localName') || '').trim(), role: (f.get('localRole') || '').trim() };
      d.scene = f.get('scene'); d.rights = f.get('rights'); d.audio = f.get('audio');
      (FX.BRANCH[d.template] || []).forEach(([k]) => { d.branches[k] = !!f.get('br_' + k); });
      need.all.forEach(c => { const p = d.phrases[c] = d.phrases[c] || { t: '', r: '', m: {} }; p.t = (f.get('pt_' + c) || '').trim(); if (f.has('pr_' + c)) p.r = (f.get('pr_' + c) || '').trim(); p.m = Object.assign({}, p.m, { [d.source]: (f.get('pm_' + c) || '').trim() }); if (f.has('pa_' + c)) { const list = (f.get('pa_' + c) || '').split(',').map(x => x.trim()).filter(Boolean); if (list.length) d.accept[c] = list; else delete d.accept[c]; } });
      editBack(d, 'Edited lines, branches and settings');
      const c = FX.checks(d); S.save(); LQ.app.render();
      U.toast(c.schema.ok && c.semantic.ok ? 'Saved. Schema and semantic checks pass.' : 'Saved. ' + (c.schema.issues[0] || c.semantic.issues[0] || ''));
    },
    'fx-schedule': (form, arg) => { const d = drafts().find(x => x.id === arg); if (!d || !SV.can('publish')) return; const at = new FormData(form).get('at'); if (!at) return; d.publishAt = at.slice(0, 16); hist(d, 'Scheduled to publish at ' + d.publishAt.replace('T', ' ')); S.save(); U.toast(at.slice(0, 16) <= S.nowIso() ? 'Scheduled for a time already passed: it publishes on the next clock tick.' : 'Scheduled. Move the demo clock forward to see it go live.'); LQ.app.render(); },
    'fx-try': (form, arg) => {
      const d = drafts().find(x => x.id === arg); if (!d) return;
      const q = (new FormData(form).get('q') || '').trim(); FX.tryQ = q; FX.register(d);
      const hits = FX.conceptsFor(d.track, d.template).learner.filter(c => LQ.PK['pk:' + d.id + ':' + c] && LQ.match.intent('pk:' + d.id + ':' + c, q).ok);
      FX.tryRes = { id: d.id, text: q ? (hits.length ? '“' + q + '” counts as: ' + hits.map(FX.conceptLabel).join(', ') + '.' : '“' + q + '” matches no learner line. Add it under “Also accept” if it should.') : 'Type something first.' };
      LQ.app.render();
    },
    'asset-attach': (form, arg) => {
      const a = sd().assets.find(x => x.id === arg); if (!a || !SV.can('edit')) return;
      const v = new FormData(form).get('target');
      if (!v) { a.attach = null; SV.audit('Detached ' + a.id); }
      else { const [kind, ...rest] = v.split(':'); a.attach = { kind, id: rest.join(':') }; SV.audit('Attached ' + a.id + ' to ' + kind + ' ' + a.attach.id); S.event('asset.attached', a.id + ' “' + a.title + '” attached to ' + kind + ' ' + a.attach.id + (a.published ? ' (live)' : ' (waits for publishing)')); }
      S.save(); U.toast(a.attach ? 'Attached.' + (a.published ? ' Learners hear it now.' : ' Publish the asset to make it audible.') : 'Detached.'); LQ.app.render();
    }
  };
})();
