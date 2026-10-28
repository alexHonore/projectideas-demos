/* LangQuest V3 — Content studio (admin console).
   Real in-browser work: reading dropped audio files (duration, SHA-256, ID3 tags),
   duplicate detection, path parsing, CSV export/import, regression fixtures.
   Simulated (and labelled): multipart upload progress, transcription jobs, provider routing. */
'use strict';
(function () {
  const SV = LQ.studio = { files: {}, byHash: {}, sel: new Set(), filter: 'all', q: '', jobs: {} };
  const U = LQ.ui, S = LQ.store, A = LQ.art, esc = U.esc, ic = U.icon;
  const sd = () => S.state.studio;
  SV.fileUrl = id => SV.files[id] || null;
  const role = () => sd().role;
  const can = (perm, track) => { const r = LQ.STUDIO_ROLES[role()]; if (!r.can.includes(perm)) return false; if (perm === 'review' && track && r.langs && !r.langs.includes(track)) return false; return true; };
  const why = (perm) => 'Your role (' + LQ.STUDIO_ROLES[role()].label + ') can’t ' + ({ edit: 'edit metadata', bulk: 'bulk-edit', transcribe: 'request transcription', request_review: 'request review', rights: 'record rights decisions', publish: 'publish', upload: 'upload', models: 'change model routes', review: 'review this language', factory: 'create drafts' }[perm] || perm) + '. The server enforces this too; hiding a button isn’t authorisation.';
  const audit = (what) => { sd().audit.unshift({ at: S.today(), who: 'You (' + LQ.STUDIO_ROLES[role()].label + ')', role: role(), what }); };
  const tname = id => id ? (LQ.trackById(id) || { name: id }).name : 'Not set';
  SV.STATUS = { imported_draft: 'Imported draft', metadata_needed: 'Metadata needed', rights_unverified: 'Rights unverified', transcription_pending: 'Transcription pending', review_needed: 'Review needed', approved: 'Approved', published: 'Published', unpublished: 'Unpublished', rejected: 'Rejected' };
  SV.statusOf = a => {
    if (a.published) return 'published';
    if (a.rejected) return 'rejected';
    if (a.fresh) return 'imported_draft';
    if (!a.title || !a.track || !a.source) return 'metadata_needed';
    if (!a.chapter || a.order == null || a.order === '') return 'metadata_needed';
    if (!LQ.RIGHTS_BASIS[a.rights].publish) return 'rights_unverified';
    if (a.transcript === 'processing' || (a.kind === 'archive' && a.transcript === 'none' && a.review === 'none')) return 'transcription_pending';
    if (a.review !== 'approved') return 'review_needed';
    return a.unpublishedOnce ? 'unpublished' : 'approved';
  };
  SV.gates = a => [
    ['Title', !!a.title],
    ['Target course and instruction language', !!(a.track && a.source)],
    ['Chapter and order', !!(a.chapter && a.order != null && a.order !== '')],
    ['File integrity (checksum recorded)', !!a.checksum],
    ['Speaker or instructor recorded', !!a.speaker],
    ['Redistribution rights verified', LQ.RIGHTS_BASIS[a.rights].publish],
    ['Editorial and language review approved', a.review === 'approved']
  ];
  const fmtSize = mb => mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : mb >= 1 ? mb.toFixed(1) + ' MB' : Math.max(1, Math.round(mb * 1024)) + ' KB';
  const manifest = () => sd().manifest || 12;
  function bump(what) { sd().manifest = manifest() + 1; S.event('manifest.invalidated', 'Course manifest v' + sd().manifest + ': ' + what); }

  /* ── shell ── */
  const NAV = [['overview', 'Overview', 'layers'], ['library', 'Library', 'folder'], ['review', 'Review', 'eye'], ['factory', 'Factory', 'wand'], ['rights', 'Rights', 'shield'], ['models', 'AI routing', 'cpu'], ['capabilities', 'Speech', 'mic'], ['audit', 'Audit log', 'list'], ['brand', 'Art', 'sparkle']];
  SV.render = (section, arg) => {
    section = section || 'overview';
    const body = (SEC[section] || SEC.overview)(arg);
    return '<div class="studio"><aside class="snav" aria-label="Studio sections"><div class="snav__brand">' + A.orbit('neutral', { size: 36, label: 'LangQuest' }) + '<span><strong>Studio</strong></span></div>' +
      '<label class="field field--dark"><span>Acting as</span><select data-change="studio-role">' + Object.entries(LQ.STUDIO_ROLES).map(([k, r]) => '<option value="' + k + '"' + (k === role() ? ' selected' : '') + '>' + esc(r.label) + '</option>').join('') + '</select></label>' +
      '<nav><ul role="list">' + NAV.slice(0, 5).map(navItem(section)).join('') + '</ul>' +
      '<details class="snav__more"' + (NAV.slice(5).some(n => n[0] === section) ? ' open' : '') + '><summary>' + ic('sliders', 'ic--sm') + '<span>More</span></summary><ul role="list">' + NAV.slice(5).map(navItem(section)).join('') + '</ul></details></nav>' +
      '<a class="snav__back" href="#/home" title="Back to the learner app">' + ic('back', 'ic--sm') + 'Learner app</a></aside>' +
      '<main class="smain" id="studio-main">' + body + '</main><div id="studio-sheet-host" class="sheet-host sheet-host--studio"></div></div>';
  };
  const navItem = section => n => '<li><a href="#/studio/' + n[0] + '" class="snav__a' + (n[0] === section || (section === 'asset' && n[0] === 'library') || (section === 'draft' && n[0] === 'factory') ? ' is-on' : '') + '"' + (n[0] === section ? ' aria-current="page"' : '') + ' title="' + esc(n[1]) + '">' + ic(n[2], 'ic--sm') + '<span>' + n[1] + '</span>' + (n[0] === 'review' && queueCount() ? '<span class="count">' + queueCount() + '</span>' : '') + '</a></li>';
  const inQueue = a => SV.statusOf(a) === 'review_needed' && a.review === 'needed';
  const queueCount = () => sd().assets.filter(inQueue).length + sd().drafts.filter(d => d.status === 'review_needed').length;
  /* Plain-text subtitles become an ⓘ chip; HTML subtitles (draft provenance) stay as one small meta line. */
  const head = (title, sub, extra) => '<header class="shead"><div><h1 class="h2">' + esc(title) + (sub && !/</.test(sub) ? ' ' + U.info(sub, 'About ' + title) : '') + '</h1>' + (sub && /</.test(sub) ? '<p class="muted small">' + sub + '</p>' : '') + '</div>' + (extra || '') + '</header>';
  const SEC = {};
  Object.assign(SV, { SEC, can: (p, t) => can(p, t), why: p => why(p), audit: w => audit(w), head: (a, b, c) => head(a, b, c), tname: id => tname(id), bump: w => bump(w) });

  SEC.overview = () => {
    const as = sd().assets, counts = {}; as.forEach(a => { const s = SV.statusOf(a); counts[s] = (counts[s] || 0) + 1; });
    const mb = as.reduce((x, a) => x + (a.size || 0), 0), gb = mb / 1024;
    const blocked = as.filter(a => ['rights_unverified', 'metadata_needed'].includes(SV.statusOf(a)));
    const order = ['imported_draft', 'metadata_needed', 'rights_unverified', 'transcription_pending', 'review_needed', 'approved', 'published', 'unpublished', 'rejected'];
    let h = head('Overview', 'Everything a learner can hear or read passes through here first. Manifest v' + manifest() + ' is live for the learner app.');
    h += '<div class="kpis kpis--studio"><div><strong>' + as.length + '</strong><span>assets</span></div><div><strong>' + fmtSize(mb) + '</strong><span>stored</span></div><div><strong>' + (counts.published || 0) + '</strong><span>published</span></div><div><strong>' + queueCount() + '</strong><span>in review</span></div><div><strong>' + blocked.length + '</strong><span>blocked</span></div></div>';
    h += '<section class="panelcard"><h2 class="h4">Pipeline</h2><div class="pipe" role="img" aria-label="' + order.filter(k => counts[k]).map(k => counts[k] + ' ' + SV.STATUS[k]).join(', ') + '">' + order.filter(k => counts[k]).map(k => '<span class="pipe__seg st--' + k + '" style="flex:' + counts[k] + '"><span>' + counts[k] + '</span></span>').join('') + '</div><ul class="legend" role="list">' + order.filter(k => counts[k]).map(k => '<li><span class="sw st--' + k + '"></span>' + SV.STATUS[k] + ' <strong>' + counts[k] + '</strong></li>').join('') + '</ul></section>';
    h += '<div class="grid2"><section class="panelcard"><h2 class="h4">Needs attention</h2><ul class="attn" role="list">' + blocked.slice(0, 5).map(a => '<li><a href="#/studio/asset/' + a.id + '" title="' + esc(SV.statusOf(a) === 'rights_unverified' ? LQ.RIGHTS_BASIS[a.rights].label : 'Blocked by ' + SV.gates(a).filter(g => !g[1]).map(g => g[0].toLowerCase()).slice(0, 2).join('; ')) + '"><strong>' + esc(a.title) + '</strong><span class="st st--' + SV.statusOf(a) + '">' + esc(SV.STATUS[SV.statusOf(a)]) + '</span></a></li>').join('') + '</ul></section>' +
      '<section class="panelcard"><h2 class="h4">Storage ' + U.info(gb.toFixed(3) + ' GB × US$0.015 per GB-month (object storage Standard rate quoted in the build spec, Oct 2026). Operations, processing and AI costs need provider telemetry, which isn’t connected in this demo; live API calls are metered on the hub’s API monitor.', 'How storage cost is computed') + '</h2><p class="big">US$' + (gb * 0.015).toFixed(4) + '<span class="small muted"> / month</span></p></section></div>';
    h += '<section class="panelcard"><h2 class="h4">Recent activity</h2><ol class="auditmini">' + sd().audit.slice(0, 4).map(x => '<li><span class="muted small">' + esc(S.fmtDay(x.at)) + '</span><span>' + esc(x.what) + '</span><span class="muted small">' + esc(x.who) + '</span></li>').join('') + '</ol><a class="linkbtn" href="#/studio/audit">Audit log</a></section>';
    return h;
  };

  SEC.library = () => {
    const as = sd().assets.filter(a => (SV.filter === 'all' || SV.statusOf(a) === SV.filter) && (!SV.q || (a.title + ' ' + a.path + ' ' + a.collection + ' ' + tname(a.track) + ' ' + a.speaker).toLowerCase().includes(SV.q.toLowerCase())));
    const counts = {}; sd().assets.forEach(a => { const s = SV.statusOf(a); counts[s] = (counts[s] || 0) + 1; });
    const sel = Array.from(SV.sel).filter(id => sd().assets.some(a => a.id === id));
    let h = head('Library and uploads', 'Masters stay private. A finished upload is not a published lesson: every asset passes the same gates.', '<div class="shead__acts"><button class="btn btn--sm" data-act="lib-export">' + ic('download', 'ic--xs') + 'Export CSV</button><label class="btn btn--sm">' + ic('upload', 'ic--xs') + 'Import labels (CSV)<input type="file" accept=".csv,text/csv" class="sr-only" data-change="lib-import"></label></div>');
    h += '<div class="drop" data-drop="1"><input type="file" id="up-input" class="sr-only" multiple accept="audio/*,.mp3,.m4a,.wav,.aac,.flac" data-change="upload-files"' + (can('upload') ? '' : ' disabled') + '><label for="up-input" class="drop__in">' + ic('upload') + '<span><strong>Drop audio files here, or choose files</strong><span class="muted small">MP3, M4A, WAV, AAC, FLAC. This browser reads each file’s duration, SHA-256 checksum and ID3 tags. Files never leave your machine; the multipart transfer to private storage is simulated.</span></span></label>' + (can('upload') ? '' : '<p class="muted small">' + esc(why('upload')) + '</p>') + '</div>';
    const jobs = Object.values(SV.jobs).filter(j => !j.done);
    if (jobs.length) h += '<ul class="jobs" role="list">' + jobs.map(j => '<li><span>' + esc(j.label) + '</span><span class="meter"><span style="width:' + j.pct + '%"></span></span><span class="small muted">' + j.pct + '%</span></li>').join('') + '</ul>';
    h += '<div class="libtools"><label class="search search--sm">' + ic('search', 'ic--sm') + '<span class="sr-only">Search the library</span><input type="search" data-input="lib-q" value="' + esc(SV.q) + '" placeholder="Title, path, course or speaker"></label>' +
      '<div class="chips" role="group" aria-label="Filter by status"><button class="fchip' + (SV.filter === 'all' ? ' is-on' : '') + '" data-act="lib-filter" data-arg="all" aria-pressed="' + (SV.filter === 'all') + '">All ' + sd().assets.length + '</button>' + Object.keys(SV.STATUS).filter(k => counts[k]).map(k => '<button class="fchip' + (SV.filter === k ? ' is-on' : '') + '" data-act="lib-filter" data-arg="' + k + '" aria-pressed="' + (SV.filter === k) + '">' + SV.STATUS[k] + ' ' + counts[k] + '</button>').join('') + '</div></div>';
    if (sel.length) h += '<form class="bulk" data-submit="bulk-apply"><strong>' + sel.length + ' selected</strong>' +
      '<label><span class="sr-only">Course</span><select name="track"><option value="">Course: keep</option>' + LQ.TRACKS.map(t => '<option value="' + t.id + '">' + esc(t.name) + '</option>').join('') + '</select></label>' +
      '<label><span class="sr-only">Instruction language</span><select name="source"><option value="">Instructions: keep</option>' + LQ.SOURCES.map(s => '<option value="' + s.code + '">' + esc(s.name) + '</option>').join('') + '</select></label>' +
      '<label><span class="sr-only">Chapter</span><input name="chapter" placeholder="Chapter: keep"></label><label><span class="sr-only">Speaker</span><input name="speaker" placeholder="Speaker: keep"></label>' +
      '<button class="btn btn--sm btn--primary" type="submit"' + (can('bulk') ? '' : ' disabled title="' + esc(why('bulk')) + '"') + '>Apply to selection</button><button class="btn btn--sm" type="button" data-act="bulk-path"' + (can('bulk') ? '' : ' disabled') + '>Fill chapter and order from file paths</button><button class="btn btn--sm btn--quiet" type="button" data-act="bulk-clear">Clear</button></form>';
    h += '<div class="tablewrap"><table class="tbl"><caption class="sr-only">Library assets</caption><thead><tr><th scope="col"><input type="checkbox" aria-label="Select all shown" data-change="lib-selall"' + (as.length && as.every(a => SV.sel.has(a.id)) ? ' checked' : '') + '></th><th scope="col">Asset</th><th scope="col">Course</th><th scope="col">Chapter</th><th scope="col">Rights</th><th scope="col">Status</th></tr></thead><tbody>' +
      as.map(a => { const s = SV.statusOf(a); return '<tr class="' + (SV.sel.has(a.id) ? 'is-sel' : '') + '"><td><input type="checkbox" aria-label="Select ' + esc(a.title) + '" data-change="lib-sel" data-arg="' + a.id + '"' + (SV.sel.has(a.id) ? ' checked' : '') + '></td><td><a href="#/studio/asset/' + a.id + '" class="tbl__t"><strong>' + esc(a.title || '(untitled)') + '</strong><span class="muted small">' + esc(a.id + ', ' + a.path) + '</span></a>' + (a.dupOf ? '<span class="tag tag--warn">Same bytes as ' + esc(a.dupOf) + '</span>' : '') + '</td>' +
        '<td>' + esc(tname(a.track)) + '<span class="muted small block">' + (a.source ? 'from ' + esc(S.srcName(a.source)) : 'instructions not set') + '</span></td><td>' + esc(a.chapter || '—') + (a.order != null && a.order !== '' ? '<span class="muted small block">#' + a.order + '</span>' : '') + '</td><td>' + esc(LQ.RIGHTS_BASIS[a.rights].label) + '</td><td><span class="st st--' + s + '">' + SV.STATUS[s] + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
    if (!as.length) h += '<div class="empty">' + A.orbit('curious', { size: 64 }) + '<p>Nothing matches these filters.</p><button class="btn btn--sm" data-act="lib-filter" data-arg="all">Show all</button></div>';
    return h;
  };

  SEC.asset = (id) => {
    const a = sd().assets.find(x => x.id === id); if (!a) return SEC.library();
    const s = SV.statusOf(a), gates = SV.gates(a), rb = LQ.RIGHTS_BASIS[a.rights];
    let h = '<a class="backlink" href="#/studio/library">' + ic('back', 'ic--sm') + ' Library</a>' + head(a.title || '(untitled)', esc(a.id + ', ' + a.path), '<span class="st st--' + s + '">' + SV.STATUS[s] + '</span>');
    if (a.kind === 'upload') h += SV.files[a.id] ? '<audio class="preview" controls src="' + SV.files[a.id] + '" aria-label="Preview the uploaded file"></audio><p class="muted small">Playing your own file from this browser. Original bytes, unaltered.</p>' : '<p class="note">' + ic('upload', 'ic--sm') + '<span>The file isn’t attached in this browser session. Drop it again in the library to re-attach (matched by checksum).</span></p>';
    h += '<div class="grid2"><section class="panelcard"><h2 class="h4">Metadata</h2><form class="stack-sm" data-submit="asset-save" data-arg="' + a.id + '">' +
      '<label class="field"><span>Title</span><input name="title" value="' + esc(a.title) + '"></label><label class="field"><span>Collection</span><input name="collection" value="' + esc(a.collection || '') + '"></label>' +
      '<div class="row2"><label class="field"><span>Chapter</span><input name="chapter" value="' + esc(a.chapter || '') + '"></label><label class="field"><span>Order</span><input name="order" type="number" min="1" value="' + esc(a.order == null ? '' : a.order) + '"></label></div>' +
      '<label class="field"><span>Target course</span><select name="track"><option value="">Not set</option>' + LQ.TRACKS.map(t => '<option value="' + t.id + '"' + (a.track === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Instruction language</span><select name="source"><option value="">Not set</option>' + LQ.SOURCES.map(x => '<option value="' + x.code + '"' + (a.source === x.code ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Speaker or instructor</span><input name="speaker" value="' + esc(a.speaker || '') + '"></label>' +
      (a.id3 ? '<p class="muted small">ID3 tags read from the file: ' + esc(Object.entries(a.id3).map(([k, v]) => k + ' “' + v + '”').join(', ')) + '</p>' : '') +
      '<button class="btn btn--sm btn--primary" type="submit"' + (can('edit') ? '' : ' disabled title="' + esc(why('edit')) + '"') + '>Save metadata</button>' + (can('edit') ? '' : '<p class="muted small">' + esc(why('edit')) + '</p>') + '</form></section>';
    h += '<section class="panelcard"><h2 class="h4">Publishing gates</h2><ul class="gates" role="list">' + gates.map(g => '<li class="' + (g[1] ? 'is-ok' : 'is-no') + '">' + (g[1] ? ic('check', 'ic--sm') : ic('close', 'ic--sm')) + '<span>' + esc(g[0]) + '</span></li>').join('') + '</ul>' +
      (!rb.publish ? '<p class="callout callout--block">' + ic('shield') + '<span><strong>Blocked from learners.</strong> ' + esc(rb.why) + '</span></p>' : '') +
      '<p class="small muted">Size ' + fmtSize(a.size || 0) + (a.duration ? ', duration ' + U.fmtDur(a.duration) : '') + ', checksum ' + esc(a.checksum || 'not computed') + '. Transcript: ' + esc({ none: 'none', processing: 'processing', draft: 'draft, needs review', reviewed: 'reviewed' }[a.transcript] || a.transcript) + '. Review: ' + esc(a.review) + '.</p>' +
      '<div class="stack-sm">' +
      (a.transcript === 'none' ? '<button class="btn btn--sm" data-act="asset-transcribe" data-arg="' + a.id + '"' + (can('transcribe') ? '' : ' disabled title="' + esc(why('transcribe')) + '"') + '>' + ic('wand', 'ic--xs') + 'Request transcription (simulated job)</button>' : '') +
      (a.review === 'none' || a.review === 'rejected' ? '<button class="btn btn--sm" data-act="asset-request-review" data-arg="' + a.id + '"' + (can('request_review') ? '' : ' disabled title="' + esc(why('request_review')) + '"') + '>' + ic('eye', 'ic--xs') + 'Request language review</button>' : '') +
      (a.review === 'needed' ? '<div class="row2"><button class="btn btn--sm btn--primary" data-act="asset-approve" data-arg="' + a.id + '"' + (can('review', a.track) ? '' : ' disabled title="' + esc(why('review')) + '"') + '>Approve review</button><button class="btn btn--sm" data-act="asset-reject" data-arg="' + a.id + '"' + (can('review', a.track) ? '' : ' disabled') + '>Send back</button></div>' + (can('review', a.track) ? '' : '<p class="muted small">' + esc(why('review')) + '</p>') : '') +
      (a.published ? '<button class="btn btn--sm" data-act="asset-unpublish" data-arg="' + a.id + '"' + (can('publish') ? '' : ' disabled title="' + esc(why('publish')) + '"') + '>Unpublish</button>' :
        '<button class="btn btn--sm btn--primary" data-act="asset-publish" data-arg="' + a.id + '"' + (can('publish') && gates.every(g => g[1]) ? '' : ' disabled') + '>' + ic('globe', 'ic--xs') + 'Publish to learners</button>' + (gates.every(g => g[1]) ? (can('publish') ? '' : '<p class="muted small">' + esc(why('publish')) + ' Switch “Acting as” to Administrator.</p>') : '<p class="muted small">Publishing unlocks when every gate passes.</p>')) +
      '</div></section></div>';
    h += '<section class="panelcard"><h2 class="h4">Rights record</h2><form class="stack-sm" data-submit="asset-rights" data-arg="' + a.id + '"><label class="field"><span>Basis</span><select name="rights">' + Object.entries(LQ.RIGHTS_BASIS).map(([k, r]) => '<option value="' + k + '"' + (a.rights === k ? ' selected' : '') + '>' + esc(r.label) + '</option>').join('') + '</select></label><label class="field"><span>Evidence and permitted uses</span><textarea name="note" rows="2">' + esc(a.rightsNote || '') + '</textarea></label>' +
      '<button class="btn btn--sm" type="submit"' + (can('rights') ? '' : ' disabled title="' + esc(why('rights')) + '"') + '>Save rights decision</button>' + (can('rights') ? '' : '<p class="muted small">' + esc(why('rights')) + '</p>') + '</form></section>';
    if (SV.attachSection) h += SV.attachSection(a);
    return h;
  };

  SEC.review = () => {
    const as = sd().assets.filter(inQueue), ds = sd().drafts.filter(d => d.status === 'review_needed');
    let h = head('Review queue', 'Language reviewers approve their own varieties. Approval checks naturalness, dialect, script and cultural fit; a valid JSON file is not a reviewed lesson.');
    h += '<p class="note">' + ic('user', 'ic--sm') + '<span>Acting as <strong>' + esc(LQ.STUDIO_ROLES[role()].label) + '</strong>. ' + (role() === 'language_reviewer' ? 'You can review Spanish (Spain), Arabic (Moroccan) and French.' : role() === 'native_reviewer' ? 'You can review the other 27 courses (Swahili, Greek, Italian and so on), not Spanish (Spain), Darija or French.' : 'Switch “Acting as” to a reviewer role to approve: Language reviewer for es, ary and fr, Native reviewer for the other courses.') + '</span></p>';
    h += '<h2 class="h4">Recordings and scripts</h2>' + (as.length ? '<ul class="queue" role="list">' + as.map(a => '<li><a href="#/studio/asset/' + a.id + '"><strong>' + esc(a.title) + '</strong><span class="muted small">' + esc(tname(a.track) + ', ' + (a.collection || '') + '. Transcript: ' + a.transcript) + '</span></a><span class="row2"><button class="btn btn--sm btn--primary" data-act="asset-approve" data-arg="' + a.id + '"' + (can('review', a.track) ? '' : ' disabled title="' + esc(why('review')) + '"') + '>Approve</button><button class="btn btn--sm" data-act="asset-reject" data-arg="' + a.id + '"' + (can('review', a.track) ? '' : ' disabled') + '>Send back</button></span></li>').join('') + '</ul>' : '<p class="muted">Nothing waiting.</p>');
    h += '<h2 class="h4">Content factory drafts</h2>' + (ds.length ? '<ul class="queue" role="list">' + ds.map(d => draftRow(d)).join('') + '</ul>' : '<p class="muted">Nothing waiting.</p>');
    return h;
  };
  function draftRow(d) {
    if (d.kind === 'template' && SV.fxRow) return SV.fxRow(d);
    const placeholder = (d.expressions || []).some(e => /pending native reviewer/.test(e.target));
    return '<li><a href="#/studio/factory"><strong>' + esc(d.title) + '</strong><span class="muted small">' + esc(tname(d.track) + ' from ' + S.srcName(d.source) + '. ' + d.template + ', ' + d.model) + '</span></a><span class="row2">' +
      '<button class="btn btn--sm btn--primary" data-act="draft-approve" data-arg="' + d.id + '"' + (can('review', d.track) && !placeholder ? '' : ' disabled') + (placeholder ? ' title="Target text is still a placeholder"' : '') + '>Approve</button><button class="btn btn--sm" data-act="draft-reject" data-arg="' + d.id + '"' + (can('review', d.track) ? '' : ' disabled') + '>Reject</button></span>' + (placeholder ? '<span class="muted small block">Target text is still “…pending native reviewer…”, so it can’t be approved. A reviewer must write real Darija first.</span>' : '') + '</li>';
  }

  SEC.rights = () => {
    const groups = {}; sd().assets.forEach(a => { (groups[a.rights] = groups[a.rights] || []).push(a); });
    let h = head('Rights and licensing', 'Only cleared material reaches learners. Owning a copy of a course is not a licence to stream it, remix it or feed it to AI.');
    Object.entries(LQ.RIGHTS_BASIS).forEach(([k, r]) => {
      const list = groups[k] || [];
      h += '<section class="panelcard"><h2 class="h4">' + esc(r.label) + ' <span class="muted small">' + list.length + '</span></h2>' + (r.why ? '<p class="muted small">' + esc(r.why) + '</p>' : '<p class="muted small">Can be published once metadata and review gates pass.</p>') +
        (list.length ? '<ul class="attn" role="list">' + list.map(a => '<li><a href="#/studio/asset/' + a.id + '"><strong>' + esc(a.title) + '</strong><span class="muted small">' + esc(a.rightsNote || 'No evidence recorded') + '</span></a></li>').join('') + '</ul>' : '') + '</section>';
    });
    h += '<section class="panelcard"><h2 class="h4">Takedown impact</h2><p class="muted small">If a contributor withdraws consent, these would be unpublished together: every lesson, transcript and course manifest built from the same recording agreement.</p><ul class="attn" role="list"><li><strong>Agreement 2026-09-14 (Nadia B.)</strong><span class="muted small">4 recordings, 1 draft transcript, 0 published lessons</span></li><li><strong>Community agreement HT-014 / HT-015</strong><span class="muted small">2 recordings, unpublished</span></li></ul></section>';
    return h;
  };

  SEC.factory = () => {
    /* The template-mission factory (js/factory.js) renders above; these are the earlier hand-built drafts. */
    let h = '<!--legacy-->';
    sd().drafts.filter(d => d.kind !== 'template').forEach(d => {
      const g = d.gates, all = Object.values(g).every(Boolean);
      h += '<article class="panelcard draft"><header class="draft__h"><div><h2 class="h4">' + esc(d.title) + '</h2><p class="muted small" title="' + esc(tname(d.track) + ' from ' + S.srcName(d.source) + ', intent ' + d.intent + ', created ' + S.fmtDay(d.created)) + '">' + esc(d.id + ' · ' + tname(d.track)) + '</p></div><span class="st st--' + (d.status === 'published' ? 'published' : d.status === 'rejected' ? 'rejected' : d.status === 'approved' ? 'approved' : 'review_needed') + '">' + esc({ review_needed: 'Review needed', approved: 'Approved', published: 'Published', rejected: 'Rejected', draft: 'Draft' }[d.status]) + '</span></header>' +
        '<ul class="gates gates--row" role="list">' + [['schema', 'Schema valid'], ['semantic', 'Semantic check'], ['native', 'Native review'], ['rights', 'Source rights'], ['audio', 'Audio attached']].map(([k, l]) => '<li class="' + (g[k] ? 'is-ok' : 'is-no') + '">' + ic(g[k] ? 'check' : 'close', 'ic--xs') + l + '</li>').join('') + '</ul>' +
        (d.expressions ? '<table class="tbl tbl--mini"><thead><tr><th scope="col">Target text</th><th scope="col">Meaning (' + esc(S.srcName(d.source)) + ')</th><th scope="col">Register</th></tr></thead><tbody>' + d.expressions.map(e => '<tr><td class="' + (/pending/.test(e.target) ? 'muted' : '') + '" dir="auto">' + esc(e.target) + '</td><td>' + esc(e.meaning) + '</td><td>' + esc(e.register) + '</td></tr>').join('') + '</tbody></table>' : '<p class="small muted" title="' + esc('Mission script with 4 expressions, 3 anticipation prompts and a 4-turn branching dialogue. Provenance: ' + d.model + ', ' + d.template + '.') + '">' + ic('list', 'ic--xs') + ' 4 · 3 · 4</p>') +
        (d.notes.length ? U.info(d.notes.join(' '), 'Draft notes') : '') +
        '<div class="row2">' + (d.status === 'review_needed' ? '<button class="btn btn--sm" data-act="draft-approve" data-arg="' + d.id + '"' + (can('review', d.track) && !(d.expressions || []).some(e => /pending/.test(e.target)) ? '' : ' disabled title="Needs a language reviewer for this variety, and real target text"') + '>Approve</button><button class="btn btn--sm" data-act="draft-reject" data-arg="' + d.id + '"' + (can('review', d.track) ? '' : ' disabled') + '>Reject</button>' : '') +
        (d.status === 'approved' ? '<button class="btn btn--sm btn--primary" data-act="draft-publish" data-arg="' + d.id + '"' + (can('publish') && all ? '' : ' disabled title="' + esc(can('publish') ? 'Every gate must pass' : why('publish')) + '"') + '>Publish</button>' : '') +
        (d.status === 'published' ? '<button class="btn btn--sm" data-act="draft-unpublish" data-arg="' + d.id + '"' + (can('publish') ? '' : ' disabled') + '>Unpublish</button><a class="btn btn--sm btn--ghost" href="#/mission/' + d.mission + '">Open in learner app</a>' : '') + '</div></article>';
    });
    return h;
  };

  SEC.models = () => {
    const ms = sd().models, rg = sd().regression;
    let h = head('AI routing', 'Every task goes through the model gateway. Routes change here, without an app update, and only after the regression suite passes for every published variety.');
    h += '<p class="note">' + ic('info', 'ic--sm') + '<span>No model provider is connected to this demo. Route names are configuration profiles; the regression suite below really runs, against the local meaning matcher that stands in for the evaluator.</span></p>';
    h += '<div class="tablewrap"><table class="tbl"><thead><tr><th scope="col">Task</th><th scope="col">Route</th><th scope="col">Fallback</th><th scope="col">Last tested</th></tr></thead><tbody>' + Object.entries(ms).map(([k, m]) => '<tr><td><strong>' + esc(m.task) + '</strong></td><td>' + esc(m.route) + ' <span class="muted small">v' + m.version + '</span></td><td>' + esc(m.fallback) + '<span class="muted small block">Same variety only</span></td><td>' + esc(S.fmtDay(m.tested)) + '</td></tr>').join('') +
      '<tr><td><strong>Speech recognition</strong></td><td>Browser recognizer (demo)</td><td>Typed answers</td><td>Live</td></tr><tr><td><strong>Speech synthesis</strong></td><td>Device voices, exact locale only</td><td>Text only</td><td>Live</td></tr><tr><td><strong>Pronunciation assessment</strong></td><td>Not connected</td><td>Reference practice</td><td>—</td></tr></tbody></table></div>';
    h += '<form class="panelcard stack-sm" data-submit="model-test"><h2 class="h4">Try a new dialogue route</h2><label class="field"><span>Candidate</span><select name="cand">' + sd().candidates.map(c => '<option value="' + c.id + '">' + esc(c.label + ': ' + c.note) + '</option>').join('') + '</select></label><button class="btn btn--sm" type="submit">' + ic('refresh', 'ic--xs') + 'Run regression suite</button></form>';
    if (rg) {
      const pass = rg.results.filter(r => r.pass).length, cand = sd().candidates.find(c => c.id === rg.cand);
      const missing = ['es-spain', 'ar-moroccan', 'french', 'japanese', 'english'].filter(t => !cand.covers.includes(t));
      h += '<section class="panelcard"><h2 class="h4">Regression: ' + esc(rg.cand) + '</h2><p>' + pass + ' of ' + rg.results.length + ' fixtures behaved as expected (accepted paraphrases pass, negated orders fail).</p>' +
        (missing.length ? '<p class="callout callout--block">' + ic('shield') + '<span><strong>Promotion blocked.</strong> This route doesn’t cover ' + esc(missing.map(tname).join(', ')) + '. Falling back from Darija to Modern Standard Arabic would silently change the variety, which the gateway never allows.</span></p>' : '') +
        '<div class="tablewrap"><table class="tbl tbl--mini"><thead><tr><th scope="col">Course</th><th scope="col">Intent</th><th scope="col">Utterance</th><th scope="col">Expected</th><th scope="col">Result</th></tr></thead><tbody>' + rg.results.map(r => '<tr><td>' + esc(tname(r.track)) + '</td><td>' + esc(r.intent) + '</td><td dir="auto">' + esc(r.text) + '</td><td>' + (r.expect ? 'accept' : 'reject') + '</td><td class="' + (r.pass ? 'ok' : 'bad') + '">' + (r.pass ? 'Pass' : 'Fail') + '</td></tr>').join('') + '</tbody></table></div>' +
        '<button class="btn btn--sm btn--primary" data-act="model-promote"' + (can('models') && !missing.length && pass === rg.results.length ? '' : ' disabled title="' + esc(!can('models') ? why('models') : 'Needs full coverage and a clean run') + '"') + '>Promote to dialogue v' + (ms.dialogue.version + 1) + '</button>' + (can('models') ? '' : '<p class="muted small">' + esc(why('models')) + '</p>') + '</section>';
    }
    return h;
  };

  SEC.capabilities = () => {
    let h = head('Speech capabilities', 'What each course can genuinely do today. Voice and recognizer columns are detected live in this browser; scorer status comes from provider documentation listed in the build spec.');
    h += '<div class="tablewrap"><table class="tbl tbl--caps"><thead><tr><th scope="col">Course</th><th scope="col">Device voice here</th><th scope="col">Recognizer</th><th scope="col">Pronunciation scorer</th><th scope="col">Published native audio</th></tr></thead><tbody>' +
      LQ.TRACKS.map(t => { const vs = U.voiceStatus(t, S.state.enrollments[t.id] || {}); const nat = sd().assets.filter(a => a.track === t.id && a.published && a.kind !== 'script').length; return '<tr><td><strong>' + esc(t.name) + '</strong><span class="muted small block">' + esc(t.internal) + '</span></td><td class="' + (vs.ok ? 'ok' : 'muted') + '">' + esc(vs.ok ? vs.name + ' (' + vs.lang + ')' : 'None for ' + t.tts[0]) + '</td><td class="' + (LQ.speech.hasSR ? '' : 'muted') + '">' + (LQ.speech.hasSR ? 'Browser API present; ' + esc(t.sr) + ' support confirmed on first use' : 'Not available') + '</td><td>' + esc(LQ.ASSESS[t.assess].label) + '</td><td>' + (nat ? nat + ' recording' + (nat > 1 ? 's' : '') : '<span class="muted">None yet</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    return h;
  };
  SEC.audit = () => head('Audit log', 'Every studio action, newest first. Includes the role each action was taken under.') + '<ol class="auditlist">' + sd().audit.map(x => '<li><span class="muted small">' + esc(S.fmtDay(x.at)) + '</span><span>' + esc(x.what) + '</span><span class="muted small">' + esc(x.who) + '</span></li>').join('') + '</ol>';
  SEC.brand = () => {
    let h = head('Mascot and art', 'Orbit and every illustration here are original vectors drawn in code for this demo. No image generator, stock image or traced reference was used.');
    h += '<section class="panelcard"><h2 class="h4">Orbit, the guide: 17 states</h2><p class="muted small">A floating marigold body ringed by an asymmetric cobalt ribbon with a notched tail. Curious, encouraging, never judgmental. Learners can switch Orbit off; every lesson works without it.</p><ul class="orbitgrid" role="list">' + A.ORBIT_STATES.map(s => '<li>' + A.orbit(s, { size: 88 }) + '<span class="small">' + s.replace('_', ' ') + '</span></li>').join('') + '</ul>' +
      '<div class="sizes">' + [24, 40, 64, 96, 160].map(z => '<span>' + A.orbit('happy', { size: z }) + '<span class="small muted">' + z + ' px</span></span>').join('') + '</div></section>';
    h += '<section class="panelcard"><h2 class="h4">Recurring characters</h2><ul class="charsheet" role="list">' + Object.entries(LQ.CHARACTERS).map(([k, c]) => '<li><div class="charsheet__row">' + A.PORTRAIT_EXPRESSIONS.map(e => A.portrait(k, e, { size: 48 })).join('') + '</div><strong>' + esc(c.name) + '</strong><span class="muted small">' + esc(c.place + ', ' + c.variety) + '</span></li>').join('') + '</ul></section>';
    h += '<section class="panelcard"><h2 class="h4">Mission scenes</h2><ul class="scenegrid" role="list">' + A.SCENE_IDS.map(s => '<li>' + A.scene(s) + '<span class="small"><strong>' + esc(s) + '</strong> ' + esc(A.sceneAlt(s)) + '</span></li>').join('') + '</ul><p class="muted small">Scenes carry no baked-in text, so overlays can be localised and read by screen readers.</p></section>';
    return h;
  };

  /* ── uploads: real file reading ── */
  function sha256(buf) { if (!(window.crypto && crypto.subtle)) return Promise.resolve(null); return crypto.subtle.digest('SHA-256', buf).then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('')).catch(() => null); }
  function duration(url) { return new Promise(res => { const au = new Audio(); let done = false; const fin = v => { if (!done) { done = true; res(v); } }; au.preload = 'metadata'; au.onloadedmetadata = () => fin(isFinite(au.duration) ? au.duration : 0); au.onerror = () => fin(0); setTimeout(() => fin(0), 4000); au.src = url; }); }
  function id3(buf) {
    try {
      const b = new Uint8Array(buf); if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return null;
      const ver = b[3], size = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]; let p = 10; const out = {};
      const want = { TIT2: 'title', TPE1: 'artist', TALB: 'album', TRCK: 'track' };
      while (p + 10 < Math.min(size + 10, b.length)) {
        const fid = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]); if (!/^[A-Z0-9]{4}$/.test(fid)) break;
        const fs = ver === 4 ? ((b[p + 4] << 21) | (b[p + 5] << 14) | (b[p + 6] << 7) | b[p + 7]) : ((b[p + 4] << 24) | (b[p + 5] << 16) | (b[p + 6] << 8) | b[p + 7]);
        if (want[fid] && fs > 1) { const enc = b[p + 10], data = b.slice(p + 11, p + 10 + fs); let txt; if (enc === 1 || enc === 2) txt = new TextDecoder(enc === 1 ? 'utf-16' : 'utf-16be').decode(data); else if (enc === 3) txt = new TextDecoder('utf-8').decode(data); else txt = Array.from(data).map(c => String.fromCharCode(c)).join(''); out[want[fid]] = txt.replace(/\u0000/g, '').trim(); }
        p += 10 + fs;
      }
      return Object.keys(out).length ? out : null;
    } catch (e) { return null; }
  }
  SV.handleFiles = (files) => {
    if (!can('upload')) { U.toast(why('upload')); return; }
    Array.from(files).forEach(file => {
      if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|wav|aac|flac|ogg)$/i.test(file.name)) { U.toast(file.name + ' isn’t an audio file, so it was skipped.'); return; }
      const jid = 'j' + Date.now() + Math.random().toString(36).slice(2, 6);
      SV.jobs[jid] = { label: 'Reading ' + file.name, pct: 5 }; LQ.app.render();
      const url = URL.createObjectURL(file);
      file.arrayBuffer().then(buf => Promise.all([sha256(buf), duration(url), Promise.resolve(id3(buf))])).then(([hash, dur, tags]) => {
        const existing = sd().assets.find(a => a.kind === 'upload' && a.hash && a.hash === hash);
        if (existing && !SV.files[existing.id]) { SV.files[existing.id] = url; SV.jobs[jid].done = true; audit('Re-attached ' + file.name + ' to ' + existing.id + ' (checksum match)'); U.toast('Re-attached to ' + existing.id + ': checksum matches.'); S.save(); LQ.app.render(); return; }
        const n = sd().assets.filter(a => a.kind === 'upload').length + 1, id = 'U-' + String(n).padStart(3, '0');
        const path = file.webkitRelativePath || file.name;
        const a = { id, kind: 'upload', fresh: true, title: (tags && tags.title) || file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/^\d+\s*[-.]\s*/, ''), collection: (tags && tags.album) || '', chapter: '', order: null, track: '', source: '', speaker: (tags && tags.artist) || '', duration: Math.round(dur || 0), size: file.size / 1048576, path, mime: file.type || 'audio', rights: 'unknown', rightsNote: '', transcript: 'none', review: 'none', published: false, checksum: hash ? 'sha256:' + hash.slice(0, 4) + '…' + hash.slice(-4) : null, hash, id3: tags, dupOf: existing ? existing.id : null, uploaded: S.today() };
        SV.files[id] = url; sd().assets.unshift(a);
        audit('Uploaded ' + file.name + ' as ' + id + ' (' + fmtSize(a.size) + (a.duration ? ', ' + U.fmtDur(a.duration) : '') + ')' + (existing ? '; same bytes as ' + existing.id + ', kept as a separate logical asset' : ''));
        S.event('upload.finalized', id + ' ' + file.name + ' (simulated transfer, real checksum)');
        // simulated multipart transfer progress, clearly labelled
        SV.jobs[jid].label = 'Uploading ' + file.name + ' to private storage (simulated)';
        let pct = 20; const tick = () => { pct += 20; SV.jobs[jid].pct = Math.min(100, pct); if (pct >= 100) { SV.jobs[jid].done = true; a.fresh = false; S.save(); } LQ.app.render(); if (pct < 100) setTimeout(tick, 180); };
        S.save(); setTimeout(tick, 180);
      }).catch(() => { SV.jobs[jid].done = true; U.toast('Couldn’t read ' + file.name + '.'); LQ.app.render(); });
    });
  };
  function csvEsc(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  SV.exportCsv = () => {
    const cols = ['id', 'path', 'title', 'collection', 'chapter', 'order', 'track', 'source', 'speaker', 'rights', 'status', 'size_mb', 'duration_s', 'checksum'];
    const rows = [cols.join(',')].concat(sd().assets.map(a => [a.id, a.path, a.title, a.collection, a.chapter, a.order, a.track, a.source, a.speaker, a.rights, SV.statusOf(a), (a.size || 0).toFixed(3), a.duration || 0, a.checksum].map(csvEsc).join(',')));
    LQ.app.download('langquest-library.csv', rows.join('\n'), 'text/csv');
    audit('Exported library CSV (' + sd().assets.length + ' rows)');
  };
  SV.importCsv = (file) => {
    if (!can('bulk')) { U.toast(why('bulk')); return; }
    file.text().then(txt => {
      const lines = txt.split(/\r?\n/).filter(Boolean); if (lines.length < 2) { U.toast('That CSV has no data rows.'); return; }
      const parse = l => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
      const head = parse(lines[0]).map(x => x.trim()); let n = 0;
      lines.slice(1).forEach(l => { const v = parse(l), row = {}; head.forEach((h, i) => { row[h] = v[i]; }); const a = sd().assets.find(x => x.id === row.id || (row.path && x.path === row.path)); if (!a) return; ['title', 'collection', 'chapter', 'track', 'source', 'speaker'].forEach(k => { if (row[k] !== undefined && row[k] !== '') a[k] = row[k]; }); if (row.order) a.order = +row.order; a.fresh = false; n++; });
      audit('Imported labels from ' + file.name + ' (' + n + ' assets updated)'); S.save(); U.toast(n + ' assets updated from the CSV.'); LQ.app.render();
    });
  };
  const title = s => s.replace(/^[\d\s._-]+/, '').replace(/[-_]+/g, ' ').replace(/\b\w/, c => c.toUpperCase());

  /* ── actions ── */
  const act = LQ.studioActs = {};
  act['lib-filter'] = el => { SV.filter = el.dataset.arg; LQ.app.render(); };
  act['lib-export'] = () => SV.exportCsv();
  act['bulk-clear'] = () => { SV.sel.clear(); LQ.app.render(); };
  act['bulk-path'] = () => {
    let n = 0; SV.sel.forEach(id => { const a = sd().assets.find(x => x.id === id); if (!a) return; const parts = a.path.split('/'); const file = parts[parts.length - 1], folder = parts[parts.length - 2]; const num = file.match(/^(\d+)/); if (folder) { a.chapter = title(folder); n++; } if (num) a.order = +num[1]; a.fresh = false; });
    audit('Filled chapter and order from file paths for ' + n + ' assets (path kept as legacy metadata)'); S.save(); U.toast('Chapter and order filled for ' + n + ' assets.'); LQ.app.render();
  };
  act['asset-transcribe'] = el => { const a = sd().assets.find(x => x.id === el.dataset.arg); a.transcript = 'processing'; audit('Requested transcription for ' + a.id + ' (simulated job)'); S.event('transcode.requested', a.id + ': transcription job queued (simulated)'); S.save(); LQ.app.render(); setTimeout(() => { a.transcript = 'draft'; if (a.review === 'none') a.review = 'needed'; S.event('transcript.ready', a.id + ': draft transcript ready for review (simulated, no audio processed)'); S.save(); LQ.app.render(); }, 1600); };
  act['asset-request-review'] = el => { const a = sd().assets.find(x => x.id === el.dataset.arg); a.review = 'needed'; a.rejected = false; audit('Requested language review for ' + a.id); S.save(); LQ.app.render(); };
  act['asset-approve'] = el => { const a = sd().assets.find(x => x.id === el.dataset.arg); if (!can('review', a.track)) { U.toast(why('review')); return; } a.review = 'approved'; if (a.transcript === 'draft') a.transcript = 'reviewed'; audit('Approved review for ' + a.id + ' “' + a.title + '”'); S.event('review.approved', a.id + ' ' + a.title); S.save(); LQ.app.render(); };
  act['asset-reject'] = el => { const a = sd().assets.find(x => x.id === el.dataset.arg); a.review = 'rejected'; audit('Sent ' + a.id + ' back to the editor'); S.save(); LQ.app.render(); };
  act['asset-publish'] = el => { const a = sd().assets.find(x => x.id === el.dataset.arg); if (!can('publish') || !SV.gates(a).every(g => g[1])) return; a.published = true; audit('Published ' + a.id + ' “' + a.title + '” to learners'); S.notifyProfiles(pd => pd.enrollments[a.track] && pd.enrollments[a.track].status === 'active', { kind: 'studio', title: 'New audio in ' + tname(a.track) + ': ' + a.title, body: 'A recording cleared the rights and review gates and is now in your Audio tab.', link: '#/audio' }); S.event('lesson.published', a.title + ' (' + tname(a.track) + ')'); bump('added ' + a.title); S.save(); U.toast('Published. It’s now in the learner app’s Audio tab.'); LQ.app.render(); };
  act['asset-unpublish'] = el => { const a = sd().assets.find(x => x.id === el.dataset.arg); a.published = false; a.unpublishedOnce = true; audit('Unpublished ' + a.id); S.event('lesson.unpublished', a.title); bump('removed ' + a.title); S.save(); LQ.app.render(); };
  act['draft-approve'] = el => { const d = sd().drafts.find(x => x.id === el.dataset.arg); if (!can('review', d.track)) return; d.status = 'approved'; d.gates.native = true; d.notes.push('Approved by ' + LQ.STUDIO_ROLES[role()].label + ' on ' + S.fmtDay(S.today()) + '.'); audit('Approved draft ' + d.id + ' “' + d.title + '”'); S.save(); LQ.app.render(); };
  act['draft-reject'] = el => { const d = sd().drafts.find(x => x.id === el.dataset.arg); d.status = 'rejected'; d.notes.push('Rejected on ' + S.fmtDay(S.today()) + ': stays unpublished even though its JSON is valid.'); audit('Rejected draft ' + d.id); S.save(); LQ.app.render(); };
  act['draft-publish'] = el => { const d = sd().drafts.find(x => x.id === el.dataset.arg); if (!can('publish')) return; d.status = 'published'; d.publishedAt = S.today(); audit('Published draft ' + d.id + ' as mission “' + d.title + '”'); S.event('lesson.published', 'Mission “' + d.title + '” is playable'); bump('mission ' + d.title); LQ.applyPublication(); if (d.mission) S.notifyProfiles(pd => pd.enrollments[d.track] && pd.enrollments[d.track].status === 'active', { kind: 'studio', title: 'New mission in ' + tname(d.track) + ': ' + d.title, body: 'Published from the content studio after native review.', link: '#/mission/' + d.mission }); S.save(); U.toast('Published. The mission is now playable in the learner app.'); LQ.app.render(); };
  act['draft-unpublish'] = el => { const d = sd().drafts.find(x => x.id === el.dataset.arg); d.status = 'approved'; audit('Unpublished mission ' + d.id); bump('removed mission ' + d.title); LQ.applyPublication(); S.save(); LQ.app.render(); };
  act['model-promote'] = () => { const rg = sd().regression, m = sd().models.dialogue; m.route = rg.cand; m.version++; m.tested = S.today(); audit('Promoted ' + rg.cand + ' to dialogue v' + m.version + ' after a clean regression run'); S.event('model.promoted', 'Character dialogue now on ' + rg.cand + ' (v' + m.version + '). No app update needed.'); sd().regression = null; S.save(); LQ.app.render(); };
  LQ.studioSubmit = {
    'asset-save': (form, arg) => { if (!can('edit')) return; const a = sd().assets.find(x => x.id === arg), f = new FormData(form); ['title', 'collection', 'chapter', 'track', 'source', 'speaker'].forEach(k => { a[k] = (f.get(k) || '').trim(); }); a.order = f.get('order') ? +f.get('order') : null; a.fresh = false; audit('Edited metadata for ' + a.id); S.save(); U.toast('Saved. Status: ' + SV.STATUS[SV.statusOf(a)] + '.'); LQ.app.render(); },
    'asset-rights': (form, arg) => { if (!can('rights')) return; const a = sd().assets.find(x => x.id === arg), f = new FormData(form); a.rights = f.get('rights'); a.rightsNote = f.get('note'); a.fresh = false; audit('Rights decision for ' + a.id + ': ' + LQ.RIGHTS_BASIS[a.rights].label); S.save(); LQ.app.render(); },
    'bulk-apply': (form) => { if (!can('bulk')) return; const f = new FormData(form); let n = 0; SV.sel.forEach(id => { const a = sd().assets.find(x => x.id === id); if (!a) return; ['track', 'source', 'chapter', 'speaker'].forEach(k => { const v = (f.get(k) || '').trim(); if (v) a[k] = v; }); a.fresh = false; n++; }); audit('Bulk-labelled ' + n + ' assets'); S.save(); U.toast(n + ' assets updated.'); LQ.app.render(); },
    'factory-new': (form) => { if (!can('factory')) return; const f = new FormData(form), tid = f.get('track'), src = f.get('source'), intent = f.get('intent'); const n = sd().drafts.length + 201; const meanings = { request_drink: { en: ['I’d like a coffee, please.', 'Could I have some water?'], fr: ['Je voudrais un café, s’il vous plaît.', 'Je pourrais avoir de l’eau ?'], es: ['Quisiera un café, por favor.', '¿Me da agua?'], ru: ['Можно мне кофе, пожалуйста?', 'Можно воды?'] }, ask_directions: { en: ['Excuse me, where is the station?', 'Is it far?'], fr: ['Pardon, où est la gare ?', 'C’est loin ?'], es: ['Perdón, ¿dónde está la estación?', '¿Está lejos?'], ru: ['Простите, где вокзал?', 'Это далеко?'] }, make_plans: { en: ['Are you free on Saturday?', 'What time?'], fr: ['Tu es libre samedi ?', 'À quelle heure ?'], es: ['¿Estás libre el sábado?', '¿A qué hora?'], ru: ['Ты свободен в субботу?', 'Во сколько?'] } };
      sd().drafts.unshift({ id: 'D-' + n, title: intent + ' for ' + tname(tid), mission: null, track: tid, source: src, intent, kind: 'expressions', status: 'review_needed', model: 'scripted template (no model called)', template: 'expression-set v1.4', created: S.today(), gates: { schema: true, semantic: false, native: false, rights: true, audio: false }, expressions: meanings[intent][src].map(m => ({ target: '…pending native reviewer…', meaning: m, register: 'polite' })), notes: ['Semantic check waits for real target text.'] });
      audit('Generated draft D-' + n + ' (' + intent + ', ' + tname(tid) + ' from ' + S.srcName(src) + ')'); S.save(); LQ.app.render(); },
    'model-test': (form) => { const cand = new FormData(form).get('cand'); const results = LQ.FIXTURES.map(([track, intent, text, expect]) => { const ok = LQ.match.intent(intent, text).ok; return { track, intent, text, expect, pass: ok === expect }; }); const c = sd().candidates.find(x => x.id === cand); results.forEach(r => { if (!c.covers.includes(r.track)) r.pass = false; }); sd().regression = { cand, results, at: S.today() }; audit('Ran regression suite for ' + cand + ': ' + results.filter(r => r.pass).length + '/' + results.length + ' pass'); S.save(); LQ.app.render(); }
  };
  LQ.studioChange = {
    'studio-role': el => { sd().role = el.value; audit('Switched role to ' + LQ.STUDIO_ROLES[el.value].label); S.save(); LQ.app.render(); },
    'lib-sel': el => { if (el.checked) SV.sel.add(el.dataset.arg); else SV.sel.delete(el.dataset.arg); LQ.app.render(); },
    'lib-selall': el => { const shown = sd().assets.filter(a => (SV.filter === 'all' || SV.statusOf(a) === SV.filter)); shown.forEach(a => el.checked ? SV.sel.add(a.id) : SV.sel.delete(a.id)); LQ.app.render(); },
    'upload-files': el => { SV.handleFiles(el.files); el.value = ''; },
    'lib-import': el => { if (el.files[0]) SV.importCsv(el.files[0]); el.value = ''; }
  };
})();
