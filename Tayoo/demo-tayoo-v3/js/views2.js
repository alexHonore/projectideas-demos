/* Tayoo V3 — module views: calendar and tasks, listings, the CMA studio, transaction files, inbox and outbox,
   the mobile "More" page, entity forms, global search results and the Test lab drawer. */
(function () {
  'use strict';
  var T = window.Tayoo, R = T.render, h = T.esc, I = T.icon;
  var S = function () { return T.store.state; };
  var vHead = R.vHead;
  T.ui.lf = T.ui.lf || { q: '', area: 'any', type: 'any', max: '', beds: 'any', garage: false };
  T.ui.taskFilter = T.ui.taskFilter || 'open';
  T.ui.labEv = T.ui.labEv || 'reply';

  var AREAS = function () { return Object.keys(T.AREAS); };
  var TYPES = ['Condo', 'Townhouse', 'Semi-detached', 'Detached', 'Bungalow', 'Duplex', 'Triplex'];
  var STAGES = ['Lead', 'Active', 'Nurture', 'Pre-listing', 'Listed', 'Under contract', 'Closed'];
  var ROLES = ['Buyer', 'Seller', 'Buyer and seller', 'Seller lead'];
  var EVENT_KINDS = [['showing', 'Showing'], ['meeting', 'Meeting'], ['call', 'Phone call'], ['open-house', 'Open house'], ['deed', 'Deed of sale'], ['internal', 'Internal']];
  function sortedClients() { return S().clients.slice().sort(function (a, b) { return a.last.localeCompare(b.last, 'fr') || a.first.localeCompare(b.first, 'fr'); }); }
  function clientOpts(blank) { return (blank ? [['', blank]] : []).concat(sortedClients().map(function (c) { return [c.id, T.fullName(c) + ' (' + c.role.toLowerCase() + ', ' + c.area + ')']; })); }
  function opt(list, v) { return list.map(function (x) { var k = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + h(k) + '"' + (String(v) === String(k) ? ' selected' : '') + '>' + h(l) + '</option>'; }).join(''); }
  function chip(text, cls) { return '<span class="tag' + (cls ? ' ' + cls : '') + '">' + text + '</span>'; }

  /* ======================= calendar & tasks ======================= */
  R.calendar = function (id) {
    var s = S(), today = T.today(), from = T.validDate(id) ? id : today, to = T.addDays(from, 6);
    var tf = T.ui.taskFilter;
    var tasks = s.tasks.filter(function (t) { return tf === 'all' ? true : tf === 'overdue' ? T.isOverdue(t) : tf === 'done' ? t.status === 'done' : t.status === 'open'; })
      .sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    var week = T.cal.active().filter(function (a) { return a.date >= from && a.date <= to; });
    var nConf = week.filter(function (a) { return T.cal.conflicts(a, a.id).length; }).length;
    var counts = { open: s.tasks.filter(function (t) { return t.status === 'open'; }).length, overdue: s.tasks.filter(T.isOverdue).length, done: s.tasks.filter(function (t) { return t.status === 'done'; }).length, all: s.tasks.length };
    return vHead('Calendar', h(T.fmtDate(from)) + ' to ' + h(T.fmtDate(to)) + '. ' + h(T.tzLabel(from)) + '. Travel times between neighbourhoods are estimates.', { tools: R.ib('new-event', 'plus', 'New event', '', 'v-tool') }) +
      '<div class="tools"><div class="seg" role="group" aria-label="Seven days"><a class="btn btn-ghost btn-sm" href="#/calendar/' + T.addDays(from, -7) + '" aria-label="Previous seven days" title="Previous week">' + I('back') + '</a><a class="btn btn-ghost btn-sm" href="#/calendar"' + (from === today ? ' aria-current="date"' : '') + '>' + h(T.fmtDate(from, { noDay: true })) + '</a><a class="btn btn-ghost btn-sm" href="#/calendar/' + T.addDays(from, 7) + '" aria-label="Next seven days" title="Next week">' + I('chevron') + '</a></div>' +
      (nConf ? '<span class="tag tag-warn" title="' + nConf + ' event' + (nConf === 1 ? '' : 's') + ' this week overlap or leave too little travel time. Each one is flagged below.">' + I('alert') + nConf + '</span>' : '') + '</div>' +
      '<div class="cal-cols"><section class="blk"><h3 class="blk-h">Agenda</h3>' + R.agendaDays(from, 7, false) + '</section>' +
      '<section class="blk"><h3 class="blk-h">Tasks ' + R.ib('new-task', 'plus', 'New task', '', 'blk-link') + '</h3><div class="fchips" role="group" aria-label="Show tasks">' + [['open', 'Open'], ['overdue', 'Overdue'], ['done', 'Done'], ['all', 'All']].map(function (x) { return '<button type="button" data-act="tfilter" data-f="' + x[0] + '" aria-pressed="' + (tf === x[0]) + '">' + x[1] + ' <span class="n">' + counts[x[0]] + '</span></button>'; }).join('') + '</div>' +
      (tasks.length ? '<ul class="tasks">' + tasks.map(R.taskRow).join('') + '</ul>' : '<p class="empty">' + I('check') + 'No ' + (tf === 'all' ? '' : tf + ' ') + 'tasks.</p>') + '</section></div>';
  };

  /* ======================= listings ======================= */
  function listingRow(L, extra) {
    return '<li><a class="lst" href="#/listings/' + L.id + '" title="' + h(L.area + ' · ' + L.type + ', ' + L.beds + ' bd' + (L.size ? ', ' + L.size.toLocaleString('en-CA') + ' sq ft' : '') + ', built ' + L.built + (L.fees ? ', fees ' + T.money(L.fees) + '/mo' : '') + ', garage ' + L.garage + (extra ? '. ' + extra : '')) + '"><span class="lst-main"><span class="lst-a">' + h(L.address.split(',')[0]) + '</span></span>' +
      (extra ? '<span class="lst-x" aria-label="' + h(extra) + '">' + I('people') + '</span>' : '') + '<span class="lst-n"><span class="lst-p">' + (L.price ? T.money(L.price) : '—') + '</span></span></a></li>';
  }
  R.listingFilters = function () {
    var f = T.ui.lf;
    return { q: f.q, areas: f.area !== 'any' ? [f.area] : [], types: f.type !== 'any' ? [f.type] : [], max: +String(f.max).replace(/[^\d]/g, '') || null, beds: f.beds !== 'any' ? +f.beds : null, garage: !!f.garage };
  };
  R.listings = function (id) {
    if (id) return R.listingDetail(id);
    var f = T.ui.lf, ff = R.listingFilters(), list = T.filterListings(ff);
    var src = T.LISTINGS_SOURCE;
    var nf = (f.area !== 'any') + (f.type !== 'any') + !!f.max + (f.beds !== 'any') + !!f.garage;
    return vHead('Listings', T.LISTINGS.length + ' active listings from the ' + h(src.label.charAt(0).toLowerCase() + src.label.slice(1)) + ', imported ' + h(T.fmtDate(src.imported, { noDay: true })) + '. The Centris/QPAREB feed isn’t connected.') +
      '<form class="lf" data-form="lfilter" role="search" aria-label="Filter listings">' +
      '<label class="search lf-q">' + I('search') + '<input type="search" placeholder="Address or number" aria-label="Address or listing number" value="' + h(f.q) + '" data-lf="q"></label>' +
      '<details class="lf-more" data-ui="lf-more"' + (T.ui.open['lf-more'] || nf ? ' open' : '') + '><summary aria-label="Filters" title="Filters">' + I('filter') + (nf ? '<span class="n">' + nf + '</span>' : '') + '</summary><div class="lf-grid">' +
      '<label class="fld"><span>Area</span><select data-lf="area">' + opt([['any', 'Any area']].concat(AREAS()), f.area) + '</select></label>' +
      '<label class="fld"><span>Type</span><select data-lf="type">' + opt([['any', 'Any type']].concat(TYPES), f.type) + '</select></label>' +
      '<label class="fld"><span>Max price</span><input type="text" inputmode="numeric" placeholder="e.g. 600,000" value="' + h(f.max) + '" data-lf="max"></label>' +
      '<label class="fld"><span>Bedrooms</span><select data-lf="beds">' + opt([['any', 'Any'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']], f.beds) + '</select></label>' +
      '<label class="check lf-g" title="Unknown garages are excluded"><input type="checkbox" data-lf="garage"' + (f.garage ? ' checked' : '') + '><span>Garage</span></label>' +
      '</div></details></form>' +
      '<p class="muted cl-count" role="status" title="' + h(T.filterText(ff)) + '">' + list.length + ' of ' + T.LISTINGS.length + (nf || f.q ? ' <button type="button" class="btn-link" data-act="lf-reset">Clear</button>' : '') + '</p>' +
      (list.length ? '<ul class="lsts">' + list.map(function (L) { var sv = S().clients.filter(function (c) { return (c.saved || []).indexOf(L.id) > -1; }); return listingRow(L, sv.length ? 'Saved for ' + sv.map(function (c) { return h(c.first); }).join(', ') : ''); }).join('') + '</ul>' : '<p class="empty">' + I('search') + 'No listing matches. Widen a filter.</p>');
  };
  // A sensible default client for a listing: a buyer who looks in that area, else any active buyer
  function bestBuyer(L) {
    var cs = sortedClients().filter(function (c) { return /Buyer/.test(c.role) && c.stage !== 'Closed' && T.consentOf(c) !== 'opted-out'; });
    return cs.filter(function (c) { var a = T.memField(c, 'areas'); return c.area === L.area || (a && String(a.value).indexOf(L.area) > -1); })[0] || cs[0] || sortedClients()[0];
  }
  R.listingDetail = function (id) {
    var s = S(), L = T.listing(id);
    if (!L || /^SOLD-/.test(id) || L.subject) return vHead('Listing not found', 'Not in the authorized export.', { back: '#/listings', backLabel: 'Listings' });
    var savers = s.clients.filter(function (c) { return (c.saved || []).indexOf(id) > -1; });
    var visits = s.appointments.filter(function (a) { return a.listing === id; });
    var r = T.cma.compute(id);
    var facts = [['Price', T.money(L.price)], ['Type', L.type], ['Bedrooms', L.beds], ['Living area', L.size ? L.size.toLocaleString('en-CA') + ' sq ft' : 'Unknown'], ['Built', L.built], ['Condo fees', L.fees ? T.money(L.fees) + '/month' : 'None'], ['Garage', L.garage === 'unknown' ? 'Unknown in the data' : L.garage], ['Listing number', L.id]];
    var tomorrow = T.addDays(T.today(), 1);
    return vHead(L.address, h(L.area) + ', ' + h(L.type.toLowerCase()) + ', ' + T.money(L.price) + '. From the authorized export of ' + h(T.fmtDate(T.LISTINGS_SOURCE.imported, { noDay: true })) + '. Saving changes the client record right away; an email or a visit becomes an Action Card, with consent, conflicts and travel checked there.', { back: '#/listings', backLabel: 'Listings' }) +
      '<dl class="facts">' + facts.map(function (x) { return '<div><dt>' + h(x[0]) + '</dt><dd>' + h(String(x[1])) + '</dd></div>'; }).join('') + '</dl>' +
      '<section class="blk"><h3 class="blk-h">For a client</h3>' +
      '<form class="lact" data-form="listing-act" data-listing="' + id + '">' +
      '<label class="fld fld-wide"><span>Client</span><select name="client" id="la-client">' + opt(clientOpts(), (savers[0] || bestBuyer(L) || {}).id) + '</select></label>' +
      '<div class="lact-row"><button type="submit" name="do" value="save" class="btn btn-ghost btn-sm">' + I('plus') + 'Save to client</button><button type="submit" name="do" value="send" class="btn btn-ghost btn-sm">' + I('mail') + 'Draft an email</button></div>' +
      '<div class="lact-row"><label class="fld"><span>Visit date</span><input type="date" name="date" value="' + tomorrow + '" min="' + T.today() + '"></label><label class="fld"><span>Time</span><input type="time" name="time" value="10:00" step="900"></label><button type="submit" name="do" value="visit" class="btn btn-primary btn-sm">' + I('calendar') + 'Plan a visit</button></div>' +
      '</form></section>' +
      '<section class="blk"><h3 class="blk-h">Market <a class="blk-link" href="#/cma/' + id + '" aria-label="Open in the CMA studio" title="CMA studio">' + I('ledger') + '</a></h3>' + (r && r.n ? '<p class="mk" title="' + r.n + ' comparable sales, ' + h(r.quality.toLowerCase()) + '"><strong>' + T.money(r.low) + ' – ' + T.money(r.high) + '</strong> <span class="tag">' + (L.price >= r.point ? '+' : '−') + Math.abs(Math.round((L.price - r.point) / r.point * 100)) + '%</span></p>' : '<p class="muted">Not enough sales.</p>') + '</section>' +
      '<section class="blk"><h3 class="blk-h">In your records</h3>' + (savers.length || visits.length ? '<ul class="res-list">' + savers.map(function (c) { return '<li><a href="#/clients/' + c.id + '"><span class="res-a">Saved for ' + h(T.fullName(c)) + '</span><span class="res-s">' + h(c.role) + ', ' + h(c.stage) + '</span></a><button type="button" class="btn-link" data-act="unsave" data-client="' + c.id + '" data-listing="' + id + '">Remove</button></li>'; }).join('') + visits.map(function (a) { var c = T.client(a.client); return '<li><a href="#/calendar/' + a.date + '"><span class="res-a">' + h(a.title) + (c ? ' with ' + h(T.fullName(c)) : '') + (a.status === 'cancelled' ? ' (cancelled)' : '') + '</span><span class="res-s">' + h(T.fmtDT(a.date + 'T' + a.start)) + '</span></a></li>'; }).join('') + '</ul>' : '<p class="muted">—</p>') + '</section>';
  };

  /* ======================= CMA studio ======================= */
  var CONDITIONS = [['not assessed', 'Not assessed yet'], ['needs work', 'Needs work (−8%)'], ['average', 'Average (0%)'], ['good', 'Good (+3%)'], ['renovated', 'Renovated (+7%)']];
  var RATES = [['trend', 'Market trend', '% per month'], ['sqft', 'Living area', '$ per sq ft'], ['bed', 'Bedroom', '$ each'], ['garage', 'Garage', '$'], ['age', 'Age', '$ per year']];
  function adjCell(v) { return '<span class="adj ' + (v > 0 ? 'is-up' : v < 0 ? 'is-down' : '') + '">' + (v > 0 ? '+' : v < 0 ? '−' : '') + T.money(Math.abs(v)).replace('C$', '$') + '</span>'; }
  R.cma = function (id) {
    var s = S();
    if (!id) {
      var evaluated = Object.keys(s.cmaRuns).filter(function (k) { return !/^SUBJ-/.test(k) && T.listing(k); });
      return vHead('CMA studio', 'Comparative market analysis from ' + T.SOLD.length + ' sales in the ' + h(T.SOLD_SOURCE.label.charAt(0).toLowerCase() + T.SOLD_SOURCE.label.slice(1)) + '. Deterministic: the same inputs always give the same range. Not an appraisal.', { tools: R.ib('new-subject', 'plus', 'New subject property', '', 'v-tool') }) +
        '<section class="blk"><h3 class="blk-h">Subjects <a class="blk-link" href="#/listings" aria-label="Check an active listing" title="Check an active listing">' + I('home') + '</a></h3>' + (s.subjects.length ? '<ul class="res-list">' + s.subjects.map(function (x) { var c = x.client && T.client(x.client); return '<li><a href="#/cma/' + x.id + '" title="' + h(x.type + ', ' + x.size + ' sq ft' + (c ? ', ' + T.fullName(c) : '')) + '"><span class="res-a">' + h(x.address) + '</span><span class="res-s">' + h(x.area) + '</span></a></li>'; }).join('') + '</ul>' : '<p class="empty">None yet.</p>') + '</section>' +
        (evaluated.length ? '<section class="blk"><h3 class="blk-h">Listings you checked</h3><ul class="lsts">' + evaluated.map(function (k) { return listingRow(T.listing(k)); }).join('') + '</ul></section>' : '') +
        (s.cmaReports.length ? '<section class="blk"><h3 class="blk-h">Saved versions</h3><ul class="res-list">' + s.cmaReports.map(function (rp) { return '<li><a href="#/cma/' + rp.subjectId + '"><span class="res-a">' + h(rp.address) + ' · v' + rp.version + '</span><span class="res-s">' + T.money(rp.low) + ' to ' + T.money(rp.high) + ', ' + h(rp.quality.toLowerCase()) + ', ' + rp.n + ' comparables, condition ' + h(rp.condition) + ' · ' + h(T.fmtDT(rp.at)) + ' · #' + h(rp.fp) + '</span></a></li>'; }).join('') + '</ul></section>' : '');
    }
    var r = T.cma.compute(id);
    if (!r) return vHead('Subject not found', 'This property isn’t in the listings or your CMA subjects.', { back: '#/cma', backLabel: 'CMA studio' });
    var subj = r.subject, run = r.run, c = subj.client && T.client(subj.client), reps = s.cmaReports.filter(function (x) { return x.subjectId === id; });
    var inc = r.rows.filter(function (x) { return x.include; }).length;
    return vHead(subj.address, 'Comparative market analysis. ' + h(subj.area) + ', ' + h(subj.type.toLowerCase()) + ', ' + subj.size.toLocaleString('en-CA') + ' sq ft, ' + subj.beds + ' bedrooms, built ' + subj.built + ', garage ' + h(subj.garage) + (subj.price ? '. Listed at ' + T.money(subj.price) : '') + (c ? '. For <a href="#/clients/' + c.id + '">' + h(T.fullName(c)) + '</a>' : '') + '. Deterministic, not an appraisal.', { back: '#/cma', backLabel: 'CMA studio' }) +
      '<div class="cma-res' + (r.n ? '' : ' is-empty') + '">' +
      (r.n ? '<p class="cma-k">Indicated range</p><p class="cma-range">' + T.money(r.low) + ' <span aria-hidden="true">–</span><span class="sr-only">to</span> ' + T.money(r.high) + '</p><p class="cma-pt" title="' + h('Median of ' + r.n + ' adjusted sales' + (r.n >= 4 ? '; the range is the middle half' : '; the range is lowest to highest')) + '">Estimate <strong>' + T.money(r.point) + '</strong></p>' +
        '<p class="cma-q"><span class="tag ' + (/Strong/.test(r.quality) ? 'tag-ok' : /Moderate/.test(r.quality) ? '' : 'tag-warn') + '">' + h(r.quality) + '</span><span class="muted" title="Spread across included sales">±' + r.dispersion + '%</span>' +
        (subj.price ? '<span class="tag" title="' + h('List price ' + T.money(subj.price) + ' vs the point estimate') + '">' + I('home') + (subj.price >= r.point ? '+' : '−') + Math.abs(Math.round((subj.price - r.point) / r.point * 1000) / 10) + '%</span>' : '') + '</p>' : '<p class="cma-k">No range yet</p>') +
      (r.note ? '<details class="caution cma-note"><summary title="' + h(r.note) + '">' + I('alert') + '<span>' + h(r.noteShort || 'Note') + '</span>' + I('info') + '</summary><p class="v-sub">' + h(r.note) + '</p></details>' : '') +
      '<p class="cma-fp" title="' + h('Inputs fingerprint · ' + T.cma.version + ' · ' + T.fmtDate(T.today(), { noDay: true })) + '">#' + h(r.fp || '—') + '</p></div>' +
      '<div class="tools"><button type="button" class="btn btn-primary btn-sm" data-act="cma-save" data-id="' + id + '"' + (r.n ? '' : ' disabled') + '>' + I('check') + 'Save v' + (reps.length + 1) + '</button>' + (r.n ? R.ib('cma-print', 'print', 'Printable report', ' data-id="' + id + '"') : '') + '</div>' +
      '<section class="blk"><h3 class="blk-h">Condition</h3><label class="fld" title="Applied as a percentage of each comparable’s price against its recorded condition. Unknown on either side means no condition adjustment, and the report says so."><select data-cma="condition" data-id="' + id + '" aria-label="Condition you observed">' + opt(CONDITIONS, run.condition) + '</select></label></section>' +
      '<section class="blk"><h3 class="blk-h">Comparables <span class="n" title="' + inc + ' of ' + r.rows.length + ' included">' + inc + '/' + r.rows.length + '</span></h3>' +
      (r.rows.length ? '<ol class="comps">' + r.rows.map(function (x) {
        var k = 'cma-' + id + '-' + x.comp.id;
        return '<li class="comp' + (x.include ? '' : ' is-off') + '"><label class="inc"><input type="checkbox" data-cma="include" data-id="' + id + '" data-comp="' + x.comp.id + '"' + (x.include ? ' checked' : '') + ' aria-label="Include ' + h(x.comp.address) + '"></label>' +
          '<div class="comp-main"><p class="comp-a">' + h(x.comp.address) + '</p><p class="comp-s" title="' + h(x.comp.area + ', ' + x.comp.type.toLowerCase() + ', built ' + x.comp.built + ', ' + x.comp.condition) + '">' + x.comp.size + ' sq ft · ' + x.comp.beds + ' bd · ' + h(T.fmtDate(x.comp.sold, { noDay: true })) + '</p>' +
          '<details class="comp-adj" data-ui="' + k + '"' + (T.ui.open[k] ? ' open' : '') + '><summary title="Adjustments">' + (x.net > 0 ? '+' : '') + x.net + '%' + (x.flags.length ? ' · ' + I('alert') + x.flags.length : '') + '</summary><table class="adj-t"><tbody>' + x.adj.map(function (a) { return '<tr><th scope="row">' + h(a.k) + '</th><td>' + h(a.why) + '</td><td>' + adjCell(a.v) + '</td></tr>'; }).join('') + '<tr class="adj-tot"><th scope="row">Total</th><td>' + T.money(x.comp.price) + ' sold → adjusted</td><td>' + adjCell(x.total) + '</td></tr></tbody></table>' + (x.flags.length ? '<p class="muted">' + h(x.flags.join('. ')) + '.</p>' : '') + '</details></div>' +
          '<div class="comp-n"><p class="comp-p">' + T.money(x.adjusted) + '</p><p class="comp-s">sold ' + T.money(x.comp.price) + '</p></div></li>';
      }).join('') + '</ol>' : '<p class="empty">No comparable sale fits this subject.</p>') +
      (r.excluded.length ? '<details class="alt-ex" data-ui="cmaex-' + id + '"' + (T.ui.open['cmaex-' + id] ? ' open' : '') + '><summary>' + r.excluded.length + ' sales not comparable</summary><ul>' + r.excluded.map(function (p) { return '<li><span>' + h(p.comp.address) + ' (' + h(p.comp.area) + ')</span><span class="muted">' + h(p.why) + '</span></li>'; }).join('') + '</ul></details>' : '') + '</section>' +
      '<details class="blk blk-d" data-ui="cma-rates-' + id + '"' + (T.ui.open['cma-rates-' + id] ? ' open' : '') + '><summary class="blk-h" title="Defaults depend on the property type. Every change re-runs the same rules and changes the inputs fingerprint.">Rates' + I('down') + '</summary><p>' + R.ib('cma-defaults', 'refresh', 'Reset the rates to defaults', ' data-id="' + id + '"') + '</p><div class="rates">' + RATES.map(function (x) {
        return '<label class="fld"><span>' + h(x[1]) + ' <em class="unit">' + h(x[2]) + '</em></span><input type="number" step="any" min="0" value="' + run.rates[x[0]] + '" data-cma="rate" data-k="' + x[0] + '" data-id="' + id + '"></label>';
      }).join('') + '</div></details>' +
      (reps.length ? '<section class="blk"><h3 class="blk-h">Saved versions</h3><ol class="tl">' + reps.map(function (rp) { return '<li><time>v' + rp.version + '</time><span>' + T.money(rp.low) + ' to ' + T.money(rp.high) + ' (' + h(rp.quality.toLowerCase()) + ', ' + rp.n + ' comparables, condition ' + h(rp.condition) + '), ' + h(T.fmtDT(rp.at)) + ' by ' + h(rp.by) + ' · #' + h(rp.fp) + '</span></li>'; }).join('') + '</ol></section>' : '');
  };
  // The printable report: same numbers, plain layout, fictional-data footer
  R.cmaReport = function (id) {
    var r = T.cma.compute(id); if (!r || !r.n) return '';
    var subj = r.subject, used = r.rows.filter(function (x) { return x.include; });
    return '<article class="rep"><header><p class="rep-k">Comparative market analysis · demo, fictional data</p><h1>' + h(subj.address) + '</h1><p>' + h(subj.area) + ', ' + h(subj.type.toLowerCase()) + ', ' + subj.size + ' sq ft, ' + subj.beds + ' bedrooms, built ' + subj.built + ', garage ' + h(subj.garage) + '. Condition: ' + h(r.run.condition) + '.</p></header>' +
      '<section><h2>Indicated range</h2><p class="rep-range">' + T.money(r.low) + ' to ' + T.money(r.high) + '</p><p>Point estimate ' + T.money(r.point) + ', median of ' + r.n + ' adjusted sales. ' + h(r.quality) + ' (spread ' + r.dispersion + '%).' + (r.note ? ' ' + h(r.note) : '') + '</p></section>' +
      '<section><h2>Comparables used</h2><table><thead><tr><th>Address</th><th>Sold</th><th>Price</th><th>Adjustments</th><th>Adjusted</th></tr></thead><tbody>' + used.map(function (x) { return '<tr><td>' + h(x.comp.address) + ', ' + h(x.comp.area) + '</td><td>' + h(x.comp.sold) + '</td><td>' + T.money(x.comp.price) + '</td><td>' + x.adj.filter(function (a) { return a.v; }).map(function (a) { return h(a.k) + ' ' + (a.v > 0 ? '+' : '−') + T.money(Math.abs(a.v)); }).join('; ') + '</td><td>' + T.money(x.adjusted) + '</td></tr>'; }).join('') + '</tbody></table></section>' +
      '<section><h2>Method</h2><p>' + h(T.cma.version) + ': same property type group, same or adjacent area, living area within 40%, sold in the last 12 months. Rates: trend ' + r.run.rates.trend + '%/month, ' + T.money(r.run.rates.sqft) + '/sq ft, ' + T.money(r.run.rates.bed) + ' per bedroom, ' + T.money(r.run.rates.garage) + ' per garage, ' + T.money(r.run.rates.age) + ' per year of age (capped at 40). Inputs fingerprint #' + h(r.fp) + '.</p><p>Prepared by ' + h(T.BROKER.name) + ', ' + h(T.BROKER.agency) + ', on ' + h(T.fmtDate(T.today(), { long: true })) + ', from the ' + h(T.SOLD_SOURCE.label.toLowerCase()) + '. This is a broker’s market analysis, not an appraisal. All data is fictional.</p></section></article>';
  };

  /* ======================= transaction files ======================= */
  R.files = function (id) {
    if (id) return R.fileDetail(id);
    var s = S();
    return vHead('Files', s.transactions.length + ' transactions. Tayoo compares every condition deadline and key date with the documents and your calendar.', { tools: R.ib('new-tx', 'plus', 'New transaction', '', 'v-tool') }) +
      (s.transactions.length ? '<ul class="files">' + s.transactions.map(function (tx) {
        var chk = T.files.check(tx), c = T.client(tx.client), n = chk.issues.length, nxt = chk.open.filter(function (o) { return o.date && o.date >= T.today(); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
        return '<li><a class="fl" href="#/files/' + tx.id + '" title="' + h(tx.property + (c ? ' · ' + T.fullName(c) : '') + '. ' + (nxt ? 'Next: ' + nxt.item.toLowerCase() + ', ' + T.fmtDate(nxt.date, { noDay: true }) : 'Nothing open')) + '"><span class="fl-main"><span class="fl-t">' + h(tx.title) + '</span><span class="fl-s">' + h(tx.stage) + '</span></span><span class="fl-n">' + (n ? chip(I('alert') + n, 'tag-warn') : chip(I('check'), 'tag-ok')) + '</span></a></li>';
      }).join('') + '</ul>' : '<p class="empty">None yet.</p>');
  };
  var COND_ST = { open: 'Open', satisfied: 'Satisfied', waived: 'Waived' };
  R.fileDetail = function (id) {
    var tx = T.tx(id), s = S();
    if (!tx) return vHead('File not found', 'This transaction doesn’t exist, or it was deleted.', { back: '#/files', backLabel: 'Files' });
    var c = T.client(tx.client), chk = T.files.check(tx), issues = R.fileIssues(tx, false);
    return vHead(tx.title, h(tx.property) + '. ' + h(tx.side) + ' side, ' + h(tx.stage.toLowerCase()) + (tx.price ? ', ' + T.money(tx.price) : '') + (tx.accepted ? ', accepted ' + h(T.fmtDate(tx.accepted, { long: true })) : '') + '. ' + h(tx.counterpart) + '. You record each condition’s outcome; Tayoo doesn’t decide whether a legal condition is met.', { back: '#/files', backLabel: 'Files' }) +
      '<div class="tools">' + (c ? '<a class="btn btn-ghost btn-sm" href="#/clients/' + c.id + '">' + R.avatar(c, 'sm') + h(c.first) + '</a>' : '') + R.ib('ask', 'talk', 'Ask Tayoo about this file', ' data-text="' + h('Summarize the ' + tx.title + ' file') + '"') + R.ib('new-doc', 'upload', 'Add a document', ' data-tx="' + tx.id + '"') + '</div>' +
      '<section class="blk"><h3 class="blk-h">To check</h3>' + (issues || '<p class="empty">' + I('check') + 'All in order.</p>') + (chk.notes.length ? chk.notes.map(function (x) { return '<p class="muted">' + h(x.label) + '</p>'; }).join('') : '') + '</section>' +
      (tx.conditions.length ? '<section class="blk"><h3 class="blk-h">Conditions</h3><ul class="conds">' + tx.conditions.map(function (cd) {
        var late = cd.status === 'open' && cd.deadline < T.today();
        return '<li class="cond cond-' + cd.status + '" title="Source: ' + h(cd.source) + '"><div><p><strong>' + h(cd.label) + '</strong> ' + chip(h(COND_ST[cd.status] || cd.status), cd.status === 'open' ? (late ? 'tag-warn' : '') : 'tag-ok') + '</p><p class="muted">' + h(T.fmtDate(cd.deadline)) + (late ? ' (passed)' : cd.status === 'open' ? ' · ' + T.daysBetween(T.today(), cd.deadline) + ' d' : '') + '</p></div>' +
          '<p class="cond-act">' + (cd.status === 'open' ? R.ib('cond', 'check', 'Mark ' + cd.label.toLowerCase() + ' satisfied', ' data-tx="' + tx.id + '" data-cond="' + cd.id + '" data-status="satisfied"', 'is-ok') + R.ib('cond', 'ban', 'Mark ' + cd.label.toLowerCase() + ' waived', ' data-tx="' + tx.id + '" data-cond="' + cd.id + '" data-status="waived"') : R.ib('cond', 'undo', 'Reopen ' + cd.label.toLowerCase(), ' data-tx="' + tx.id + '" data-cond="' + cd.id + '" data-status="open"')) + '</p></li>';
      }).join('') + '</ul></section>' : '') +
      '<section class="blk"><h3 class="blk-h">Key dates</h3>' + ((tx.keyDates || []).length ? '<ul class="conds">' + tx.keyDates.map(function (kd) {
        var ev = s.appointments.filter(function (a) { return a.tx === tx.id && a.ref === kd.id && a.status !== 'cancelled'; })[0];
        return '<li class="cond" title="Source: ' + h(kd.source) + (ev ? '. Calendar: ' + h(T.fmtDT(ev.date + 'T' + ev.start)) : '') + '"><div><p><strong>' + h(kd.label) + '</strong> ' + (kd.done ? chip('Done', 'tag-ok') : '') + '</p><p class="muted">' + h(T.fmtDate(kd.date)) + (ev ? ' · ' + I('calendar') : '') + '</p></div></li>';
      }).join('') + '</ul>' : '<p class="muted">—</p>') + '</section>' +
      '<details class="blk blk-d" data-ui="fd-docs-' + tx.id + '"' + (T.ui.open['fd-docs-' + tx.id] ? ' open' : '') + '><summary class="blk-h">Documents <span class="n">' + tx.docs.length + '</span>' + I('down') + '</summary><ul class="flist">' + tx.docs.map(function (d) { return '<li>' + I('file', 'ok') + '<div><p>' + h(d.type) + (d.addedBy ? ' <span class="muted">(added by ' + h(d.addedBy) + ')</span>' : '') + '</p><p class="muted">' + h(T.fmtDate(d.date, { noDay: true })) + (d.fields.length ? ' · states: ' + d.fields.map(function (f) { return h(f.label) + ' ' + h(T.fmtDate(f.value, { noDay: true })); }).join('; ') : '') + '</p>' + d.fields.filter(function (f) { return f.quote; }).map(function (f) { return '<blockquote class="said-text">“' + h(f.quote) + '”</blockquote>'; }).join('') + '</div></li>'; }).join('') + '</ul></details>' +
      (tx.history.length ? '<details class="blk blk-d" data-ui="fd-hist-' + tx.id + '"' + (T.ui.open['fd-hist-' + tx.id] ? ' open' : '') + '><summary class="blk-h">History <span class="n">' + tx.history.length + '</span>' + I('down') + '</summary><ol class="tl tl-wide">' + tx.history.map(function (x) { return '<li><time>' + h(T.fmtDate(x.at, { noDay: true })) + '</time><span>' + h(x.text) + '</span></li>'; }).join('') + '</ol></details>' : '') +
      '<p class="danger-zone">' + R.ib('delete-tx', 'trash', 'Delete this transaction', ' data-tx="' + tx.id + '"', 'danger') + '</p>';
  };

  /* ======================= inbox & outbox ======================= */
  var KIND_ICON = { reply: 'mail', consent: 'ban', overdue: 'clock', recap: 'talk', window: 'clock', deadline: 'alert', file: 'file', cancel: 'calendar', lead: 'people', approval: 'task', system: 'refresh' };
  R.inbox = function (id) {
    var s = S(), tab = id === 'outbox' ? 'outbox' : 'notes', unread = T.unread();
    var tabs = '<div class="tabs-in" role="group" aria-label="Inbox sections"><a href="#/inbox"' + (tab === 'notes' ? ' aria-current="page"' : '') + '>Notifications' + (unread ? ' <span class="n">' + unread + '</span>' : '') + '</a><a href="#/inbox/outbox"' + (tab === 'outbox' ? ' aria-current="page"' : '') + '>Outbox <span class="n">' + s.outbox.length + '</span></a></div>';
    if (tab === 'outbox') {
      var q = s.outbox.filter(function (m) { return m.status === 'queued'; }).length;
      return vHead('Outbox', 'Every message Tayoo would have sent, newest first. Nothing here left this browser.') + tabs +
        (q ? '<p class="warn">' + I('clock') + '<span>' + q + ' queued while offline. Switch “Offline” off in the Test lab to flush them (still simulated).</span></p>' : '') +
        (s.outbox.length ? '<ul class="outbox">' + s.outbox.map(function (m) {
          var k = 'ob-' + m.id;
          return '<li><details data-ui="' + k + '"' + (T.ui.open[k] ? ' open' : '') + '><summary title="To ' + h(m.name) + ' <' + h(m.to) + '> · ' + h(m.kind) + ' · ' + h(T.fmtDT(m.at)) + '"><span class="ob-main"><span class="ob-s">' + h(m.subject) + '</span><span class="ob-t">' + h(m.name) + '</span></span>' + chip(m.status === 'queued' ? I('clock') + 'Queued' : I('hollow') + 'Simulated', m.status === 'queued' ? 'tag-warn' : '') + (m.reply ? chip(I('mail'), 'tag-ok') : '') + '</summary>' +
            '<pre class="ob-body" lang="' + (m.lang === 'FR' ? 'fr' : 'en') + '">' + h(m.body) + (m.footer ? '\n\n' + h(m.footer) : '') + '</pre>' + (m.reply ? '<p class="ob-reply">' + I('mail') + '<span>Reply ' + h(T.fmtDT(m.reply.at)) + ': “' + h(m.reply.text) + '”</span></p>' : '') + '<p class="muted"><a href="#/clients/' + m.client + '">Open ' + h(m.name) + '</a></p></details></li>';
        }).join('') + '</ul>' : '<p class="empty">' + I('mail') + 'Nothing yet.</p>');
    }
    return vHead('Inbox', 'Replies, opt-outs, deadlines, overdue promises and approval requests from every module, newest first.', { tools: unread ? R.ib('read-all', 'check', 'Mark all as read', '', 'v-tool') : '' }) + tabs +
      (s.inbox.length ? '<ul class="notes-l">' + s.inbox.map(function (n) {
        return '<li class="nt' + (n.read ? '' : ' is-unread') + '"><button type="button" class="nt-b" data-act="open-note" data-n="' + n.id + '" title="' + h(n.body) + '"><span class="nt-ic nt-' + h(n.kind) + '" aria-hidden="true">' + I(KIND_ICON[n.kind] || 'alert') + '</span><span class="nt-main"><span class="nt-t">' + (n.read ? '' : '<span class="sr-only">Unread: </span>') + h(n.title) + '</span><span class="nt-w">' + h(T.relDay(n.at) === 'Today' ? 'Today' : T.fmtDate(n.at, { noDay: true })) + ' ' + h(T.fmtTime(n.at.slice(11, 16))) + '</span></span></button></li>';
      }).join('') + '</ul>' : '<p class="empty">' + I('mail') + 'Nothing yet.</p>');
  };

  /* ======================= more (mobile) ======================= */
  R.more = function () {
    var s = S(), links = [
      ['#/listings', 'home', 'Listings', T.LISTINGS.length],
      ['#/cma', 'ledger', 'CMA studio', s.subjects.length || ''],
      ['#/files', 'file', 'Files', s.transactions.length],
      ['#/inbox', 'mail', 'Inbox', T.unread() || ''],
      ['#/ledger', 'activity', 'Recovery ledger', ''],
      ['#/activity', 'task', 'Activity', s.receipts.length || ''],
      ['#/settings', 'settings', 'Settings', '']
    ];
    return vHead('More') + '<ul class="more">' + links.map(function (x) { return '<li><a href="' + x[0] + '">' + I(x[1]) + '<span><strong>' + h(x[2]) + '</strong></span>' + (x[3] !== '' ? '<span class="n">' + x[3] + '</span>' : '') + I('chevron') + '</a></li>'; }).join('') +
      '<li><button type="button" data-act="demo">' + I('flask') + '<span><strong>Demo</strong></span>' + I('chevron') + '</button></li></ul>';
  };

  /* ======================= forms ======================= */
  function F(o) {
    var id = 'f-' + o.name, desc = [];
    if (o.hint) desc.push(id + '-h');
    if (o.err) desc.push(id + '-e');
    var a = ' id="' + id + '" name="' + o.name + '"' + (desc.length ? ' aria-describedby="' + desc.join(' ') + '"' : '') + (o.err ? ' aria-invalid="true"' : '') + (o.attrs || '');
    var tail = (o.hint ? '<span class="fld-hint" id="' + id + '-h">' + h(o.hint) + '</span>' : '') + (o.err ? '<span class="fld-err" id="' + id + '-e">' + I('alert') + h(o.err) + '</span>' : '');
    if (o.type === 'checkbox') return '<label class="check' + (o.wide ? ' fld-wide' : '') + '"><input type="checkbox"' + a + (o.value ? ' checked' : '') + '><span>' + h(o.label) + '</span></label>';
    var ctl = o.type === 'select' ? '<select' + a + '>' + opt(o.opts, o.value == null ? '' : o.value) + '</select>' :
      o.type === 'textarea' ? '<textarea rows="' + (o.rows || 3) + '"' + a + '>' + h(o.value || '') + '</textarea>' :
        '<input type="' + (o.type || 'text') + '" value="' + h(o.value == null ? '' : o.value) + '"' + a + '>';
    return '<div class="fld' + (o.wide ? ' fld-wide' : '') + (o.err ? ' has-err' : '') + '"><label for="' + id + '">' + h(o.label) + (o.req ? ' <em class="req">required</em>' : '') + '</label>' + ctl + tail + '</div>';
  }
  var CONSENT_OPTS = [['express', 'Express consent'], ['implied', 'Implied consent (valid 6 months)'], ['unknown', 'Unknown, no evidence'], ['opted-out', 'Opted out']];
  var STRENGTH_OPTS = [['unknown', 'Not discussed'], ['required', 'Required'], ['preferred', 'Preferred'], ['none', 'Not needed']];
  R.forms = {
    client: function (ctx) {
      var c = ctx.id ? T.client(ctx.id) : null, v = ctx.values || (c ? { first: c.first, last: c.last, role: c.role, stage: c.stage, area: c.area, lang: c.lang, email: c.email, phone: c.phone, consent: c.consent.email.status, consentSource: c.consent.email.source, consentDate: c.consent.email.date } : { role: 'Buyer', stage: 'Lead', area: 'Montcalm', lang: 'FR', consent: 'unknown', consentDate: T.today(), garage: 'unknown' }), e = ctx.errors || {};
      return { title: c ? 'Edit ' + T.fullName(c) : 'New client', sub: c ? 'Contact details and consent change the record directly, with history. Preferences go through “Propose a memory change”, so you review a Memory Diff first.' : 'Required: first and last name. Consent defaults to unknown, which blocks commercial email until you record evidence.', submit: c ? 'Save changes' : 'Create client',
        body: '<div class="fgrid">' + F({ name: 'first', label: 'First name', value: v.first, err: e.first, req: 1, attrs: ' autocomplete="off"' }) + F({ name: 'last', label: 'Last name', value: v.last, err: e.last, req: 1, attrs: ' autocomplete="off"' }) +
          F({ name: 'role', label: 'Role', type: 'select', opts: ROLES, value: v.role }) + F({ name: 'stage', label: 'Stage', type: 'select', opts: STAGES, value: v.stage }) +
          F({ name: 'area', label: 'Area', type: 'select', opts: AREAS(), value: v.area }) + F({ name: 'lang', label: 'Language for messages', type: 'select', opts: [['FR', 'French'], ['EN', 'English']], value: v.lang }) +
          F({ name: 'email', label: 'Email', type: 'email', value: v.email, err: e.email, attrs: ' autocomplete="off"' }) + F({ name: 'phone', label: 'Phone', type: 'tel', value: v.phone, attrs: ' autocomplete="off"' }) +
          F({ name: 'consent', label: 'Email consent', type: 'select', opts: CONSENT_OPTS, value: v.consent, hint: 'Implied consent expires six months after its date (CASL).' }) + F({ name: 'consentDate', label: 'Consent date', type: 'date', value: v.consentDate || T.today() }) +
          F({ name: 'consentSource', label: 'Consent evidence', value: v.consentSource, err: e.consentSource, wide: 1, hint: 'Where it came from: signed form, website inquiry, email, call…' }) +
          (c ? '' : F({ name: 'intent', label: 'Looking for', value: v.intent, wide: 1, hint: 'e.g. “Two-bedroom condo near transit”' }) + F({ name: 'budget', label: 'Budget (max, $)', value: v.budget, err: e.budget, attrs: ' inputmode="numeric"' }) + F({ name: 'garage', label: 'Garage', type: 'select', opts: STRENGTH_OPTS, value: v.garage })) + '</div>' };
    },
    memory: function (ctx) {
      var c = T.client(ctx.client), v = ctx.values || {}, e = ctx.errors || {};
      var mf = function (k) { var m = T.memField(c, k); return m ? m.display : 'Not on file'; };
      var cur = function (k) { var m = T.memField(c, k); return m ? m.value : ''; };
      return { title: 'Propose a memory change for ' + c.first, sub: 'Fill only what changed. Tayoo turns it into a Memory Diff on an Action Card: before and after, field by field, applied only when you approve.', submit: 'Prepare the card',
        body: '<div class="fgrid">' + F({ name: 'budget', label: 'Budget (max, $)', value: v.budget, err: e.budget, hint: 'Now: ' + mf('budget'), attrs: ' inputmode="numeric"' }) + F({ name: 'fees', label: 'Condo fees (max, $/month)', value: v.fees, err: e.fees, hint: 'Now: ' + mf('fees'), attrs: ' inputmode="numeric"' }) +
          F({ name: 'garage', label: 'Garage', type: 'select', opts: [['', 'No change']].concat(STRENGTH_OPTS.slice(1)), value: v.garage || '', hint: 'Now: ' + mf('garage') }) + F({ name: 'parking', label: 'Parking', type: 'select', opts: [['', 'No change']].concat(STRENGTH_OPTS.slice(1)), value: v.parking || '', hint: 'Now: ' + mf('parking') }) +
          F({ name: 'areas', label: 'Areas', value: v.areas != null ? v.areas : cur('areas'), wide: 1, hint: 'Comma-separated, e.g. “Montcalm, Saint-Sauveur”' }) + F({ name: 'intent', label: 'Looking for', value: v.intent != null ? v.intent : cur('intent'), wide: 1 }) +
          F({ name: 'note', label: 'Anything else to remember', type: 'textarea', value: v.note, wide: 1, rows: 2 }) + (e._ ? '<p class="fld-err fld-wide">' + I('alert') + h(e._) + '</p>' : '') + '</div>' };
    },
    task: function (ctx) {
      var t = ctx.id ? S().tasks.filter(function (x) { return x.id === ctx.id; })[0] : null, e = ctx.errors || {};
      var v = ctx.values || (t ? { title: t.title, dueDate: t.due.slice(0, 10), dueTime: t.due.slice(11, 16), client: t.client || '', owner: t.owner, note: t.note || '' } : { dueDate: T.addDays(T.today(), 1), dueTime: S().settings.morning, client: ctx.client || '', owner: T.actor() });
      return { title: t ? 'Edit task' : 'New task', sub: 'A task is a commitment with a due time. It counts toward follow-up coverage when it’s linked to a client and not internal.', submit: t ? 'Save task' : 'Add task',
        body: '<div class="fgrid">' + F({ name: 'title', label: 'Task', value: v.title, err: e.title, req: 1, wide: 1 }) + F({ name: 'dueDate', label: 'Due date', type: 'date', value: v.dueDate, err: e.due }) + F({ name: 'dueTime', label: 'Due time', type: 'time', value: v.dueTime, attrs: ' step="900"' }) +
          F({ name: 'client', label: 'Client', type: 'select', opts: clientOpts('No client (internal)'), value: v.client }) + F({ name: 'owner', label: 'Owner', type: 'select', opts: [T.BROKER.name, T.BROKER.coordinator], value: v.owner }) +
          F({ name: 'internal', label: 'Internal (doesn’t count as a client follow-up)', type: 'checkbox', value: v.internal || (t && t.internal), wide: 1 }) + F({ name: 'note', label: 'Note', type: 'textarea', value: v.note, wide: 1, rows: 2 }) + '</div>' };
    },
    event: function (ctx) {
      var a = ctx.id ? S().appointments.filter(function (x) { return x.id === ctx.id; })[0] : null, e = ctx.errors || {};
      var v = ctx.values || (a ? { title: a.title, kind: a.kind, client: a.client || '', listing: a.listing || '', place: a.place || '', area: a.area || '', date: a.date, start: a.start, end: a.end } : { kind: 'showing', client: ctx.client || '', listing: ctx.listing || '', date: T.addDays(T.today(), 1), start: '10:00', end: '10:45', area: '' });
      return { values: v, title: a ? 'Edit event' : 'New event', sub: 'Conflicts are checked as you type, including travel time between neighbourhoods. You can still save a conflicting event; it stays flagged.', submit: a ? 'Save event' : 'Add event', live: true,
        body: '<div class="fgrid">' + F({ name: 'title', label: 'Title', value: v.title, err: e.title, req: 1, wide: 1 }) + F({ name: 'kind', label: 'Kind', type: 'select', opts: EVENT_KINDS, value: v.kind }) +
          F({ name: 'client', label: 'Client', type: 'select', opts: clientOpts('No client'), value: v.client }) +
          F({ name: 'listing', label: 'Listing', type: 'select', opts: [['', 'No listing']].concat(T.LISTINGS.map(function (L) { return [L.id, L.address + ' (' + L.area + ')']; })), value: v.listing, wide: 1 }) +
          F({ name: 'place', label: 'Place', value: v.place }) + F({ name: 'area', label: 'Area (for travel time)', type: 'select', opts: [['', 'From the listing or client']].concat(AREAS()), value: v.area }) +
          F({ name: 'date', label: 'Date', type: 'date', value: v.date, err: e.date }) + F({ name: 'start', label: 'Start', type: 'time', value: v.start, err: e.start, attrs: ' step="300"' }) + F({ name: 'end', label: 'End', type: 'time', value: v.end, err: e.end, attrs: ' step="300"' }) + '</div>' };
    },
    tx: function (ctx) {
      var v = ctx.values || { side: 'Buyer', accepted: T.today(), inspDays: '10', finDays: '21', client: ctx.client || '' }, e = ctx.errors || {};
      return { title: 'New transaction', sub: 'Condition deadlines are computed from the acceptance date, as a promise to purchase states them. Check the result against the signed document.', submit: 'Create file',
        body: '<div class="fgrid">' + F({ name: 'client', label: 'Client', type: 'select', opts: clientOpts('Pick a client'), value: v.client, err: e.client, req: 1, wide: 1 }) + F({ name: 'side', label: 'Side', type: 'select', opts: ['Buyer', 'Seller'], value: v.side }) +
          F({ name: 'area', label: 'Area', type: 'select', opts: [['', 'Client’s area']].concat(AREAS()), value: v.area || '' }) + F({ name: 'property', label: 'Property address', value: v.property, err: e.property, req: 1, wide: 1 }) +
          F({ name: 'price', label: 'Accepted price ($)', value: v.price, err: e.price, req: 1, attrs: ' inputmode="numeric"' }) + F({ name: 'accepted', label: 'Accepted on', type: 'date', value: v.accepted, err: e.accepted, req: 1 }) +
          F({ name: 'inspDays', label: 'Inspection condition (days)', type: 'number', value: v.inspDays, err: e.inspDays, hint: 'Empty or 0: no inspection condition', attrs: ' min="0" max="120"' }) + F({ name: 'finDays', label: 'Financing condition (days)', type: 'number', value: v.finDays, err: e.finDays, attrs: ' min="0" max="120"' }) +
          F({ name: 'deed', label: 'Deed of sale (if known)', type: 'date', value: v.deed, err: e.deed }) + F({ name: 'counterpart', label: 'Other party', value: v.counterpart }) + '</div>' };
    },
    doc: function (ctx) {
      var tx = T.tx(ctx.tx), v = ctx.values || { type: 'Amendment', date: T.today(), states: '' }, e = ctx.errors || {};
      var states = [['', 'No date (for the record only)']].concat(tx.conditions.filter(function (c) { return c.status === 'open'; }).map(function (c) { return [c.id, c.label + ' deadline']; }), (tx.keyDates || []).filter(function (k) { return !k.done; }).map(function (k) { return [k.id, k.label]; }), tx.conditions.some(function (c) { return c.id === 'fin' && c.status === 'open'; }) ? [['fin-lender', 'Lender approval expected']] : []);
      return { title: 'Add a document to ' + tx.title, sub: 'If the document states a date, enter it as written. Tayoo compares it with the file and the calendar and flags any difference; it never overwrites a date on its own.', submit: 'Add document',
        body: '<div class="fgrid">' + F({ name: 'type', label: 'Document', type: 'select', opts: ['Amendment', 'Lender letter', 'Inspection report', 'Notary letter', 'Promise to Purchase', 'Counter-proposal', 'Other'], value: v.type }) + F({ name: 'date', label: 'Dated', type: 'date', value: v.date, err: e.date }) +
          F({ name: 'states', label: 'It states a date for', type: 'select', opts: states, value: v.states }) + F({ name: 'value', label: 'Date as written', type: 'date', value: v.value, err: e.value }) +
          F({ name: 'quote', label: 'Exact words (optional)', type: 'textarea', value: v.quote, wide: 1, rows: 2 }) + '</div>' };
    },
    subject: function (ctx) {
      var v = ctx.values || { type: 'Detached', area: (ctx.client && T.client(ctx.client) ? T.client(ctx.client).area : 'Montcalm'), garage: 'unknown', client: ctx.client || '', beds: '3', built: '1990' }, e = ctx.errors || {};
      return { title: 'New CMA subject', sub: 'The property you’re pricing. Comparable sales are pulled from the authorized export by type, area and size.', submit: 'Run the CMA',
        body: '<div class="fgrid">' + F({ name: 'address', label: 'Address', value: v.address, err: e.address, req: 1, wide: 1 }) + F({ name: 'area', label: 'Area', type: 'select', opts: AREAS(), value: v.area }) + F({ name: 'type', label: 'Type', type: 'select', opts: TYPES, value: v.type }) +
          F({ name: 'size', label: 'Living area (sq ft)', type: 'number', value: v.size, err: e.size, req: 1, attrs: ' min="200" max="20000"' }) + F({ name: 'beds', label: 'Bedrooms', type: 'number', value: v.beds, err: e.beds, attrs: ' min="0" max="19"' }) +
          F({ name: 'built', label: 'Year built', type: 'number', value: v.built, err: e.built, attrs: ' min="1701" max="2026"' }) + F({ name: 'garage', label: 'Garage', type: 'select', opts: [['unknown', 'Unknown'], ['yes', 'Yes'], ['no', 'No']], value: v.garage }) +
          F({ name: 'client', label: 'Client (optional)', type: 'select', opts: clientOpts('No client'), value: v.client, wide: 1 }) + '</div>' };
    },
    criteria: function (ctx) {
      var cr = ctx.values || (ctx.card && S().cards[ctx.card] && S().cards[ctx.card].criteria) || T.critDefault();
      var n = T.recoveryCandidates(R.critFrom(cr)).length;
      return { title: 'Recovery segment', sub: 'Pick who to look at. The same consent rules apply to every segment: opted-out contacts are listed and excluded, unknown or expired consent goes to review.', submit: 'Find them', live: true,
        body: '<div class="fgrid">' + F({ name: 'role', label: 'Role', type: 'select', opts: [['any', 'Anyone'], ['Buyer', 'Buyers'], ['Seller', 'Sellers']], value: cr.role }) + F({ name: 'stage', label: 'Stage', type: 'select', opts: [['any', 'Any stage']].concat(STAGES.filter(function (x) { return x !== 'Closed'; })), value: cr.stage }) +
          F({ name: 'area', label: 'Area', type: 'select', opts: [['any', 'Any area']].concat(AREAS()), value: cr.area }) + F({ name: 'lang', label: 'Language', type: 'select', opts: [['any', 'Either'], ['FR', 'French'], ['EN', 'English']], value: cr.lang }) +
          F({ name: 'days', label: 'No contact for at least (days)', type: 'number', value: cr.days || '', attrs: ' min="1" max="730"', hint: 'Empty: 21 days of silence counts' }) + F({ name: 'signal', label: 'Reason', type: 'select', opts: [['any', 'Any reason'], ['promise', 'A promise overdue'], ['unanswered', 'An unanswered message'], ['dormant', 'Gone quiet']], value: cr.signal }) +
          F({ name: 'budgetMin', label: 'Budget from ($)', value: cr.budgetMin || '', attrs: ' inputmode="numeric"' }) + F({ name: 'budgetMax', label: 'Budget up to ($)', value: cr.budgetMax || '', attrs: ' inputmode="numeric"' }) + '</div>' +
          '<p class="form-live" id="form-live" role="status">' + n + ' contact' + (n === 1 ? '' : 's') + ' match right now.</p>' };
    }
  };
  R.critFrom = function (v) {
    var num = function (x) { var n = +String(x || '').replace(/[^\d]/g, ''); return n || null; };
    return { role: v.role || 'any', stage: v.stage || 'any', area: v.area || 'any', lang: v.lang || 'any', days: num(v.days), signal: v.signal || 'any', budgetMin: num(v.budgetMin), budgetMax: num(v.budgetMax) };
  };
  // Live part of the event form: conflicts and travel for the values typed so far
  R.eventLive = function (v, id) {
    if (!T.validDate(v.date) || !T.validTime(v.start) || !T.validTime(v.end) || v.end <= v.start) return '<p class="form-live" id="form-live" role="status">' + I('clock') + 'Enter a date, a start and an end to check your calendar.</p>';
    var L = v.listing && T.listing(v.listing), c = v.client && T.client(v.client);
    var e = { date: v.date, start: v.start, end: v.end, kind: v.kind, area: v.kind === 'call' ? '' : (v.area || (L ? L.area : c ? c.area : '')) };
    var conf = T.cal.conflicts(e, id);
    if (!conf.length) return '<p class="form-live is-ok" id="form-live" role="status">' + I('check') + T.weekday(v.date) + ' ' + T.fmtTime(v.start) + ' to ' + T.fmtTime(v.end) + ' is free' + (e.area ? ', travel to ' + h(e.area) + ' included' : '') + '.</p>';
    var sug = T.cal.suggest(v.date, Math.max(15, T.minutesBetween(v.date + 'T' + v.start, v.date + 'T' + v.end)), e.area, v.start, id);
    return '<div class="form-live is-warn" id="form-live" role="status">' + conf.map(function (x) { return '<p>' + I('alert') + h(T.cal.describe(x)) + '</p>'; }).join('') + (sug.length ? '<p>Free that day: ' + sug.map(function (t) { return '<button type="button" class="btn-link" data-act="ev-slot" data-t="' + t + '">' + T.fmtTime(t) + '</button>'; }).join(' or ') + '</p>' : '') + '</div>';
  };

  /* ======================= search ======================= */
  R.searchResults = function (q, active) {
    var res = T.search(q);
    if (String(q || '').trim().length < 2) return { html: '<li class="sr-empty" role="presentation">Type at least two letters: a client, an address, a listing number, a file, a task…</li>', n: 0, res: [] };
    if (!res.length) return { html: '<li class="sr-empty" role="presentation">Nothing matches “' + h(q) + '”.</li>', n: 0, res: [] };
    return { html: res.map(function (r, i) { return '<li role="option" id="sr-' + i + '" aria-selected="' + (i === active) + '" class="sr-i' + (i === active ? ' is-active' : '') + '" data-href="' + h(r.href) + '"><span class="sr-k">' + h(r.type) + '</span><span class="sr-main"><span class="sr-t">' + h(r.title) + '</span><span class="sr-s">' + h(r.sub) + '</span></span></li>'; }).join(''), n: res.length, res: res };
  };

  /* ======================= Test lab ======================= */
  function labSec(title, body, sub) { return '<section class="lab-sec"><h3>' + h(title) + (sub ? ' <span class="muted">' + sub + '</span>' : '') + '</h3>' + body + '</section>'; }
  R.lab = function () {
    var s = S(), ai = T.ai.status(), ev = T.ui.labEv, now = T.nowISO();
    var upcoming = T.cal.active().filter(function (a) { return a.client && T.client(a.client) && (a.date + 'T' + a.start) >= now; });
    var finTx = s.transactions.filter(function (tx) { return tx.conditions.some(function (c) { return c.id === 'fin' && c.status === 'open'; }); });
    var cl = function () { return '<label class="fld"><span>Client</span><select name="client">' + opt(clientOpts(), (sortedClients()[0] || {}).id) + '</select></label>'; };
    var fields = '';
    if (ev === 'reply') fields = cl() + '<label class="fld"><span>Their words (optional)</span><input type="text" name="text" placeholder="Default: “Yes, I’m still interested…”"></label>';
    else if (ev === 'optout' || ev === 'optout-send') fields = cl();
    else if (ev === 'cancel') fields = upcoming.length ? '<label class="fld"><span>Appointment</span><select name="appt">' + opt(upcoming.map(function (a) { return [a.id, T.fmtDT(a.date + 'T' + a.start) + ' · ' + a.title + ' · ' + T.fullName(T.client(a.client))]; })) + '</select></label>' : '<p class="muted">No upcoming appointment with a client.</p>';
    else if (ev === 'lender') fields = finTx.length ? '<label class="fld"><span>File</span><select name="tx">' + opt(finTx.map(function (tx) { return [tx.id, tx.title + ' (financing ' + T.fmtDate(tx.conditions.filter(function (c) { return c.id === 'fin'; })[0].deadline, { noDay: true }) + ')']; })) + '</select></label><label class="fld"><span>Lender now expects approval on</span><input type="date" name="date" value="' + T.addDays(T.today(), 10) + '"></label>' : '<p class="muted">No file has an open financing condition.</p>';
    else if (ev === 'lead') fields = '<div class="lab-2"><label class="fld"><span>First name</span><input type="text" name="first" value="Noémie"></label><label class="fld"><span>Last name</span><input type="text" name="last" value="Caron"></label></div><label class="fld"><span>Email</span><input type="email" name="email" value="noemie.caron@example.net"></label><div class="lab-2"><label class="fld"><span>Area</span><select name="area">' + opt(AREAS(), 'Limoilou') + '</select></label><label class="fld"><span>Language</span><select name="lang">' + opt([['FR', 'French'], ['EN', 'English']], 'FR') + '</select></label></div><label class="fld"><span>Message</span><input type="text" name="message" value="Bonjour, je cherche un condo de deux chambres à Limoilou."></label>';
    var last = T.ui.labOut;
    return '<header class="lab-h"><div><h2 id="lab-h">' + I('flask') + 'Test lab</h2><p class="muted">Demo tooling, not part of Tayoo. It changes fictional data in this browser only.</p></div><button type="button" class="icon-btn" data-act="lab-close" aria-label="Close the Test lab">' + I('close') + '</button></header>' +
      labSec('Demo clock', '<p class="lab-now"><strong>' + h(T.fmtDT(now, { long: true })) + '</strong><span class="muted">' + h(T.tzLabel(T.today())) + '</span></p>' +
        '<div class="lab-row">' + [[60, '+1 hour'], [1440, '+1 day'], [10080, '+1 week']].map(function (x) { return '<button type="button" class="btn btn-ghost btn-sm" data-act="clock" data-min="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<form class="lab-row" data-form="clock-to"><label class="fld"><span>Jump to</span><input type="datetime-local" name="to" min="' + now + '" value="' + T.addMinutes(now, 1440 * 3) + '"></label><button type="submit" class="btn btn-ghost btn-sm">Go</button></form>' +
        '<p class="lab-note">The clock only moves forward. Each move runs the time rules: tasks go overdue, finished showings ask for a recap, 14-day reply windows close, implied consent expires, file deadlines pass or come due, and plans older than a day need a refresh before approval.</p>' +
        (last ? '<div class="lab-out" role="status"><p><strong>' + (last.list.length ? last.list.length + ' consequence' + (last.list.length === 1 ? '' : 's') : 'No consequence') + '</strong> of moving to ' + h(T.fmtDT(last.to)) + '</p>' + (last.list.length ? '<ul>' + last.list.slice(0, 8).map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + (last.list.length > 8 ? '<li>…and ' + (last.list.length - 8) + ' more in the inbox</li>' : '') + '</ul>' : '') + '</div>' : '')) +
      labSec('Scenario presets', '<p class="lab-note">Loading one replaces the workspace (you can undo right after, or export first).</p><ul class="presets">' + T.lab.PRESETS.map(function (p) { return '<li><div><p><strong>' + h(p.label) + '</strong></p><p class="muted">' + h(p.desc) + '</p></div><button type="button" class="btn btn-ghost btn-sm" data-act="preset" data-preset="' + p.id + '" aria-label="Load preset: ' + h(p.label) + '">Load</button></li>'; }).join('') + '</ul>') +
      labSec('Inject an event', '<form class="lab-ev" data-form="lab-event"><label class="fld"><span>Event</span><select name="type" data-lab="ev">' + opt([['reply', 'A client replies by email'], ['optout', 'A client opts out now'], ['optout-send', 'A client opts out during the next send'], ['cancel', 'A client cancels an appointment'], ['lender', 'The lender changes the financing date'], ['lead', 'A new website lead arrives']], ev) + '</select></label>' + fields + '<button type="submit" class="btn btn-primary btn-sm">' + I('play') + 'Inject</button></form>') +
      labSec('Capabilities', '<p class="lab-note">Switch one off to test the fallback in any browser.</p>' + [['sr', 'Speech recognition', 'Untick to test a browser without it: capture offers samples and typing only.'], ['voices', 'Voices for spoken replies', 'Untick: replies stay on screen.'], ['offline', 'Offline', 'Tick: sends wait in the outbox, live AI pauses; untick to flush.'], ['ai', 'Live AI allowed', 'Still needs an API key below.']].map(function (x) {
        return '<label class="check lab-cap"><input type="checkbox" data-cap="' + x[0] + '"' + (s.caps[x[0]] ? ' checked' : '') + '><span><strong>' + h(x[1]) + '</strong> <span class="muted">' + h(x[2]) + '</span></span></label>';
      }).join('')) +
      labSec('Role', '<div class="seg-r" role="radiogroup" aria-label="Signed in as">' + [['broker', T.BROKER.name + ', broker'], ['coordinator', T.BROKER.coordinator + ', coordinator']].map(function (x) { return '<label class="radio-s"><input type="radio" name="lab-role" data-role="' + x[0] + '"' + (s.role === x[0] ? ' checked' : '') + '><span>' + h(x[1]) + '</span></label>'; }).join('') + '</div><p class="lab-note">The coordinator prepares; plans that send or change memory wait for the broker.</p>') +
      labSec('Live AI', '<p class="ai-state ai-' + (ai.state || 'off') + '">' + I(ai.state === 'paused' ? 'pause' : 'spark') + '<span><strong>' + (ai.on ? 'On' : ai.state === 'paused' ? 'Paused' : 'Off') + '</strong> · ' + h(ai.why) + '</span></p><p><a class="btn btn-ghost btn-sm" href="../../index.html#api">' + I('gauge') + 'API monitor</a></p>') +
      labSec('Event log', '<ol class="lab-log">' + s.events.slice(0, 30).map(function (e) { return '<li><time>' + h(T.fmtDate(e.at, { noDay: true })) + ' ' + h(T.fmtTime(e.at.slice(11, 16))) + '</time><span class="lab-k">' + h(e.kind) + '</span><span>' + h(e.text) + '</span></li>'; }).join('') + '</ol>' + (s.events.length ? '' : '<p class="muted">Nothing yet.</p>') + '<p><a class="btn-link" href="#/activity">Full log in Activity</a></p>', s.events.length + ' events') +
      labSec('Workspace', '<div class="lab-row"><button type="button" class="btn btn-ghost btn-sm" data-act="export">' + I('download') + 'Export JSON</button><button type="button" class="btn btn-ghost btn-sm" data-act="import">' + I('upload') + 'Import JSON</button><button type="button" class="btn btn-quiet btn-sm" data-act="reset">' + I('refresh') + 'Reset demo</button></div><p class="lab-note">An export holds the whole workspace: records, conversation, cards, receipts, clock and settings. Import it here or in another browser to get the same state back.</p>');
  };
})();
