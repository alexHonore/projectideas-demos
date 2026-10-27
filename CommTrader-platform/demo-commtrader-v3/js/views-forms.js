/* TradeDesk V3 — create and edit dialogs. One renderer for every form; each spec maps to store actions,
   which validate again and log to the event log. Destructive actions go through a confirmation. */
(function () {
  'use strict';
  const TD = (window.TD = window.TD || {});
  const D = TD.DATA; const u = TD.u; const E = TD.engine; const S = TD.store; const A = TD.act;
  const { esc, icon } = u;
  const V = TD.views;

  const COMMODITIES = () => Object.keys(D.commodities).map((k) => [k, D.commodities[k].label]);
  const partiesOf = (state, kind, all) => Object.values(state.parties).filter((p) => p.kind === kind && (all || p.status !== 'On hold')).map((p) => [p.id, p.name + (p.status !== 'Approved' ? ' (' + p.status.toLowerCase() + ')' : '')]);
  const TOWNS = () => D.towns.map((t) => [t, t]);
  const dateOf = (min) => (min == null ? '' : u.toDateInput(min));
  const day = (n) => (Math.floor(TD.store.get().now / 1440) + n) * 1440;

  const SPECS = {
    'trade-new': {
      title: 'New lot by hand', intro: 'For an offer taken by phone or in person. It creates a lot and an opportunity; nothing is bought until approval.', submitLabel: 'Create lot',
      fields: (state) => [
        { name: 'supplier', label: 'Supplier', type: 'select', options: [['', 'Choose…']].concat(partiesOf(state, 'Supplier')), required: true, hint: 'Not listed? Create the counterparty first in the Book.' },
        { name: 'commodity', label: 'Commodity', type: 'select', options: COMMODITIES(), value: 'corn' },
        { name: 'qtyLoads', label: 'Loads', type: 'number', value: 4, min: 1, max: 60, step: 1, required: true, half: true },
        { name: 'payload', label: 'Tonnes per load', type: 'number', value: 38.5, min: 20, max: 45, step: 0.1, required: true, half: true },
        { name: 'price', label: 'Purchase price, CAD/t FOB farm', type: 'number', min: 1, max: 1999, step: 0.01, required: true, half: true },
        { name: 'origin', label: 'Origin', type: 'select', options: [['', 'Choose…']].concat(TOWNS()), required: true, half: true },
        { name: 'windowStart', label: 'Pickup from', type: 'date', value: dateOf(day(3)), required: true, half: true },
        { name: 'windowEnd', label: 'Pickup until', type: 'date', value: dateOf(day(6)), required: true, half: true },
        { name: 'moisture', label: 'Moisture, %', type: 'number', min: 5, max: 35, step: 0.1, half: true, hint: 'Leave empty if unknown: compatibility stays unknown.' },
        { name: 'moistureSource', label: 'Moisture evidence', type: 'select', options: [['Supplier statement', 'Supplier statement'], ['Supplier farm meter', 'Supplier farm meter'], ['Lab sample', 'Lab sample']], half: true },
        { name: 'testWeight', label: 'Test weight, lb/bu', type: 'number', min: 30, max: 70, step: 0.1, half: true },
        { name: 'grade', label: 'Grade', type: 'text', placeholder: 'No. 2 yellow', half: true },
        { name: 'certainty', label: 'Firmness', type: 'select', options: [['stated', 'Stated by the supplier'], ['tentative', 'Tentative (“probably”, “maybe”)']] },
        { name: 'validUntil', label: 'Price firm until (optional)', type: 'datetime', value: ['', '12:00'], hint: 'The offer lapses at that time on the demo clock and must be re-confirmed.' }
      ],
      submit: (v) => { const id = A.createTrade(v); if (id) TD.router.go('#/trade/' + id + '/price'); return id; }
    },
    'trade-edit': {
      title: (ds) => 'Edit ' + ds.id, intro: 'Changing quantity, price, origin or window invalidates an approval and reverses its reservations. Locked once freight is awarded.', submitLabel: 'Save changes',
      fields: (state, ds) => { const t = state.trades[ds.id]; const f = SPECS['trade-new'].fields(state).filter((x) => x.name !== 'certainty'); const val = { supplier: t.supplier || '', commodity: t.commodity, qtyLoads: t.qtyLoads, payload: t.payload, price: t.price, origin: t.origin || '', windowStart: dateOf(t.windowStart), windowEnd: dateOf(t.windowEnd), moisture: t.moisture, moistureSource: t.moistureSource || 'Supplier statement', testWeight: t.testWeight, grade: t.grade || '', validUntil: t.validUntil != null ? [dateOf(t.validUntil), u.hhmm(t.validUntil % 1440)] : ['', '12:00'] }; f.forEach((x) => { x.value = val[x.name]; }); return f; },
      submit: (v, ds) => { const t = TD.store.get().trades[ds.id]; const patch = {}; Object.keys(v).forEach((k) => { const cur = t[k] == null ? null : t[k]; if (v[k] !== cur && !(v[k] == null && cur == null)) patch[k] = v[k]; }); if (!Object.keys(patch).length) return true; return A.updateTrade(ds.id, patch); }
    },
    'demand-new': {
      title: 'New buyer bid or sale contract', intro: 'A bid is valid until a time you set; a contract has a window but no expiry. Basis bids price as futures (USD/bu × USD/CAD × bu/t) plus basis.', submitLabel: 'Create',
      fields: (state, ds) => [
        { name: 'kind', label: 'Type', type: 'select', options: [['Open bid', 'Open bid'], ['Contract', 'Sale contract']] },
        { name: 'buyer', label: 'Buyer', type: 'select', options: [['', 'Choose…']].concat(partiesOf(state, 'Buyer')), required: true },
        { name: 'commodity', label: 'Commodity', type: 'select', options: COMMODITIES(), value: ds.commodity || 'corn', half: true },
        { name: 'qty', label: 'Quantity, t', type: 'number', min: 1, max: 100000, step: 0.1, value: 154, required: true, half: true },
        { name: 'tolPct', label: 'Tolerance, ±%', type: 'number', min: 0, max: 10, step: 0.5, value: 5, half: true },
        { name: 'priceType', label: 'Price', type: 'select', options: [['flat', 'Flat CAD/t delivered'], ['basis', 'Basis over a futures month']], value: 'flat', half: true },
        { name: 'price', label: 'Flat price, CAD/t delivered', type: 'number', min: 1, max: 1999, step: 0.01, show: 'priceType=flat', half: true },
        { name: 'month', label: 'Futures month', type: 'select', options: [['CZ26', 'CZ26 (corn, Dec)'], ['SX26', 'SX26 (soybeans, Nov)']], show: 'priceType=basis', half: true },
        { name: 'basis', label: 'Basis, CAD/t', type: 'number', min: -200, max: 200, step: 0.01, show: 'priceType=basis', half: true },
        { name: 'windowStart', label: 'Delivery from', type: 'date', value: dateOf(day(3)), required: true, half: true },
        { name: 'windowEnd', label: 'Delivery until', type: 'date', value: dateOf(day(9)), required: true, half: true },
        { name: 'validUntil', label: 'Bid valid until', type: 'datetime', value: [dateOf(day(1)), '17:00'], show: 'kind=Open bid', hint: 'The demo clock makes it expire: plans relying on it can no longer be approved.' }
      ],
      submit: (v) => A.createDemand(v)
    },
    'demand-edit': {
      title: (ds) => 'Edit ' + ds.id, intro: 'A revision invalidates unapproved plans and approvals the buyer has not acknowledged. Acknowledged contracts keep their terms.', submitLabel: 'Save changes',
      fields: (state, ds) => { const d = E.demand(state, ds.id); return [
        { name: 'qty', label: 'Quantity, t', type: 'number', min: 1, max: 100000, step: 0.1, value: d.qty, required: true, half: true },
        { name: 'tolPct', label: 'Tolerance, ±%', type: 'number', min: 0, max: 10, step: 0.5, value: d.tolPct, half: true },
        d.priceType === 'basis' ? { name: 'basis', label: d.month + ' basis, CAD/t', type: 'number', min: -200, max: 200, step: 0.01, value: d.basis, half: true } : { name: 'price', label: 'Flat price, CAD/t delivered', type: 'number', min: 1, max: 1999, step: 0.01, value: d.price, half: true },
        { name: 'windowStart', label: 'Delivery from', type: 'date', value: dateOf(d.windowStart), half: true },
        { name: 'windowEnd', label: 'Delivery until', type: 'date', value: dateOf(d.windowEnd), half: true },
        d.kind === 'Contract' ? null : { name: 'validUntil', label: 'Bid valid until', type: 'datetime', value: d.validUntil != null ? [dateOf(d.validUntil), u.hhmm(d.validUntil % 1440)] : [dateOf(day(1)), '17:00'] }
      ].filter(Boolean); },
      submit: (v, ds) => { const d = E.demand(TD.store.get(), ds.id); const patch = {}; Object.keys(v).forEach((k) => { if (v[k] != null && v[k] !== d[k]) patch[k] = v[k]; }); if (patch.qty != null && !(patch.qty > 0)) return false; if (patch.windowEnd != null && patch.windowEnd < (patch.windowStart != null ? patch.windowStart : d.windowStart)) { TD.ui.toast('The window ends before it starts.', 'warn'); return false; } return Object.keys(patch).length ? A.updateDemand(ds.id, patch) : true; }
    },
    'party-new': {
      title: 'New counterparty', intro: 'Starts pending and is screened (simulated), with KYC to verify (legal entity, signing authority, bank details; credit for buyers). Finance approves buyers and suppliers, logistics approves carriers. Whoever creates it cannot approve it.', submitLabel: 'Create counterparty',
      fields: (state, ds) => [
        { name: 'kind', label: 'Role', type: 'select', options: [['Supplier', 'Supplier'], ['Buyer', 'Buyer'], ['Carrier', 'Carrier']], value: (ds && ds.kind) || 'Supplier' },
        { name: 'name', label: 'Legal name', type: 'text', required: true, minlength: 3, placeholder: 'Ferme Exemple inc.', value: (ds && ds.name) || '', hint: ds && ds.x ? 'Prefilled from the message signature. Check it against the NEQ register.' : null },
        { name: 'short', label: 'Short name', type: 'text', half: true },
        { name: 'town', label: 'Town', type: 'select', options: [['', 'Choose…']].concat(TOWNS()), required: true, half: true, value: (ds && ds.town) || '' },
        { name: 'contact', label: 'Contact', type: 'text', half: true, value: (ds && ds.contact) || '' },
        { name: 'lang', label: 'Language', type: 'select', options: [['fr', 'French'], ['en', 'English']], half: true, value: (ds && ds.lang) || 'fr' },
        { name: 'creditLimit', label: 'Credit limit, CAD', type: 'number', min: 0, max: 5000000, step: 1000, value: 150000, show: 'kind=Buyer', half: true },
        { name: 'termsDays', label: 'Payment terms, days', type: 'number', min: 0, max: 90, step: 1, value: 15, show: 'kind=Buyer', half: true },
        { name: 'maxMoisture', label: 'Moisture max, %', type: 'number', min: 10, max: 20, step: 0.1, value: 15.5, show: 'kind=Buyer', half: true },
        { name: 'shrink', label: 'Shrink per point, %', type: 'number', min: 0, max: 3, step: 0.1, value: 1.3, show: 'kind=Buyer', half: true },
        { name: 'drying', label: 'Drying per point, CAD/t', type: 'number', min: 0, max: 10, step: 0.05, value: 2.5, show: 'kind=Buyer', half: true },
        { name: 'minTestWeight', label: 'Test weight min, lb/bu', type: 'number', min: 0, max: 70, step: 0.5, show: 'kind=Buyer', half: true },
        { name: 'equipment', label: 'Equipment', type: 'text', value: (ds && ds.equipment) || '8-axle B-train hoppers', show: 'kind=Carrier', hint: ds && ds.equipment ? 'As stated in the quote. Logistics confirms the axle configuration before approving.' : null },
        { name: 'factor', label: 'Rate vs lane history', type: 'number', min: 0.8, max: 1.3, step: 0.01, value: 1.0, show: 'kind=Carrier', half: true },
        { name: 'verifiedPayload', label: 'Axle configuration declared', type: 'checkbox', show: 'kind=Carrier', half: true }
      ],
      submit: (v) => A.createParty(v)
    },
    'party-edit': {
      title: (ds) => 'Edit ' + TD.store.get().parties[ds.id].name, intro: 'Credit limits change only with finance authority. Edits are logged.', submitLabel: 'Save changes',
      fields: (state, ds) => { const p = state.parties[ds.id]; const f = [
        { name: 'short', label: 'Short name', type: 'text', value: p.short || '', half: true },
        { name: 'contact', label: 'Contact', type: 'text', value: p.contact || '', half: true },
        { name: 'lang', label: 'Language', type: 'select', options: [['fr', 'French'], ['en', 'English']], value: p.lang || 'fr', half: true }];
        if (p.kind === 'Buyer') f.push({ name: 'creditLimit', label: 'Credit limit, CAD', type: 'number', min: 0, max: 5000000, step: 1000, value: p.creditLimit || 0, half: true }, { name: 'termsDays', label: 'Payment terms, days', type: 'number', min: 0, max: 90, step: 1, value: p.termsDays || 15, half: true }, { name: 'maxMoisture', label: 'Moisture max, %', type: 'number', min: 10, max: 20, step: 0.1, value: (p.rule || {}).maxMoisture, half: true });
        if (p.kind === 'Supplier') f.push({ name: 'loadMins', label: 'Loading time, min', type: 'number', min: 10, max: 240, step: 5, value: p.loadMins || 45, half: true });
        if (p.kind === 'Carrier') f.push({ name: 'equipment', label: 'Equipment', type: 'text', value: p.equipment || '' });
        return f; },
      submit: (v, ds) => { const p = TD.store.get().parties[ds.id]; const patch = {}; Object.keys(v).forEach((k) => { const cur = k === 'maxMoisture' ? (p.rule || {}).maxMoisture : p[k]; if (v[k] != null && v[k] !== cur) patch[k] = v[k]; }); return Object.keys(patch).length ? A.updateParty(ds.id, patch) : true; }
    },
    'quote-manual': {
      title: 'Record a phone quote', intro: 'Rates as quoted, in CAD/t per lane. A fuel surcharge is added before ranking; the quote expires like any other.', submitLabel: 'Record quote',
      fields: (state, ds) => { const t = state.trades[ds.id]; const alloc = t.approval && t.approval.valid ? t.approval.snapshot.alloc : t.alloc; return [{ name: 'carrier', label: 'Carrier', type: 'select', options: Object.values(state.parties).filter((p) => p.kind === 'Carrier' && p.status === 'Approved').map((p) => [p.id, p.name]) }]
        .concat(Object.keys(alloc).filter((k) => alloc[k]).map((k) => { const ln = E.lane(state, t.origin, E.demand(state, k).buyer); return { name: 'rate_' + k, label: 'Rate to ' + E.party(state, E.demand(state, k).buyer).town + ', CAD/t', type: 'number', min: 1, max: 200, step: 0.01, value: ln ? ln.rate : '', required: true, half: true }; }))
        .concat([{ name: 'fsc', label: 'Fuel surcharge, %', type: 'number', min: 0, max: 30, step: 0.1, value: 0, half: true }, { name: 'validHours', label: 'Valid for, hours', type: 'number', min: 1, max: 72, step: 1, value: 4, half: true }]); },
      submit: (v, ds) => { const rates = {}; Object.keys(v).forEach((k) => { if (/^rate_/.test(k)) rates[k.slice(5)] = v[k]; }); return A.addManualQuote(ds.id, { carrier: v.carrier, rates: rates, fsc: v.fsc, validUntil: TD.store.get().now + (v.validHours || 4) * 60 }); }
    },
    'freight-manual': {
      title: 'Indicative freight', intro: 'A desk estimate, not a quote: it lets the lane be priced and approved within the 10% freight variance policy.', submitLabel: 'Use this rate',
      fields: (state, ds) => { const t = state.trades[ds.id]; const dm = E.demand(state, ds.d); const b = E.party(state, dm.buyer); return [{ name: 'rate', label: t.origin + ' → ' + b.town + ', CAD/t all-in', type: 'number', min: 1, max: 200, step: 0.01, required: true, value: t.freightManual && t.freightManual[ds.d] || '' }]; },
      submit: (v, ds) => A.setFreightManual(ds.id, ds.d, v.rate)
    },
    'benchmark': {
      title: (ds) => 'Enter ' + ds.id, intro: (ds) => 'Manual entry with a timestamp. Basis bids and mark-to-market re-price immediately. Current: ' + E.benchmark(TD.store.get(), ds.id).value.toFixed(4) + ' ' + E.benchmark(TD.store.get(), ds.id).unit + ', entered ' + V.when(E.benchmark(TD.store.get(), ds.id).at) + '.', submitLabel: 'Enter price',
      fields: (state, ds) => [{ name: 'value', label: E.benchmark(state, ds.id).label + ', ' + E.benchmark(state, ds.id).unit, type: 'number', min: 0.0001, max: 100, step: 0.0001, required: true, value: E.benchmark(state, ds.id).value }],
      submit: (v, ds) => A.setBenchmark(ds.id, v.value)
    },
    'confirm': {
      title: (ds) => ds.title || 'Are you sure?', intro: (ds) => ds.msg || '', submitLabel: (ds) => ds.ok || 'Confirm', danger: true,
      fields: () => [],
      submit: (v, ds) => { const fn = CONFIRM[ds.action]; return fn ? fn(ds) : false; }
    }
  };
  const CONFIRM = {
    'cancel-trade': (ds) => A.cancelTrade(ds.id) && (TD.ui.toast('Cancelled ' + ds.id + '.', 'ok', { undo: true }), true),
    'cancel-load': (ds) => A.cancelLoad(ds.id) && (TD.ui.toast('Cancelled ' + ds.id + '.', 'ok', { undo: true }), true),
    'demand-withdraw': (ds) => A.withdrawDemand(ds.id) && (TD.ui.toast('Withdrew ' + ds.id + '.', 'ok', { undo: true }), true),
    'demand-delete': (ds) => A.deleteDemand(ds.id) && (TD.ui.toast('Deleted ' + ds.id + '.', 'ok', { undo: true }), true),
    'party-delete': (ds) => A.deleteParty(ds.id) && (TD.ui.toast('Deleted the counterparty.', 'ok', { undo: true }), true),
    'reset': () => { TD.app.doReset(); return true; },
    'import': () => true
  };

  function fieldHtml(f) {
    const id = 'f-' + f.name;
    const req = f.required ? ' required' : '';
    const show = f.show ? ' data-show="' + esc(f.show) + '"' : '';
    let ctl;
    if (f.type === 'select') ctl = '<select id="' + id + '" name="' + f.name + '" class="inp"' + req + '>' + f.options.map((o) => '<option value="' + esc(o[0]) + '"' + (String(f.value == null ? '' : f.value) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    else if (f.type === 'checkbox') ctl = '<input type="checkbox" id="' + id + '" name="' + f.name + '"' + (f.value ? ' checked' : '') + '>';
    else if (f.type === 'datetime') ctl = '<span class="ctl-row"><input type="date" id="' + id + '" name="' + f.name + '" class="inp" value="' + esc(f.value[0]) + '"' + req + '><input type="time" id="' + id + '-t" name="' + f.name + '__t" class="inp" value="' + esc(f.value[1]) + '" aria-label="' + esc(f.label) + ', time"></span>';
    else if (f.type === 'textarea') ctl = '<textarea id="' + id + '" name="' + f.name + '" class="inp" rows="4"' + req + '>' + esc(f.value || '') + '</textarea>';
    else ctl = '<input type="' + (f.type === 'number' ? 'number' : f.type) + '" id="' + id + '" name="' + f.name + '" class="inp' + (f.type === 'number' ? ' num' : '') + '" value="' + esc(f.value == null ? '' : f.value) + '"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + (f.step != null ? ' step="' + f.step + '"' : '') + (f.minlength ? ' minlength="' + f.minlength + '"' : '') + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.type === 'number' ? ' inputmode="decimal"' : '') + req + '>';
    return '<div class="fld' + (f.half ? ' is-half' : '') + (f.type === 'checkbox' ? ' is-check' : '') + '"' + show + '>' + (f.type === 'checkbox' ? ctl + '<label for="' + id + '">' + esc(f.label) + '</label>' : '<label for="' + id + '">' + esc(f.label) + (f.required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' + ctl) + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</div>';
  }
  const val = (x, ds) => (typeof x === 'function' ? x(ds) : x);

  V.formHtml = function (state, kind, ds) {
    const spec = SPECS[kind]; if (!spec) return '';
    const fields = spec.fields(state, ds);
    return '<form class="form" data-form="' + esc(kind) + '" novalidate><div class="form-head"><h2 id="form-title">' + esc(val(spec.title, ds)) + '</h2><button type="button" class="icon-btn" data-act="close-dialog" aria-label="Close">' + icon('x', 18) + '</button></div>' +
      (val(spec.intro, ds) ? '<p class="form-intro">' + esc(val(spec.intro, ds)) + '</p>' : '') +
      '<div class="form-grid">' + fields.map(fieldHtml).join('') + '</div><p class="form-err" role="alert" id="form-err"></p>' +
      '<div class="form-foot"><button type="button" class="btn ghost" data-act="close-dialog">Cancel</button><button type="submit" class="btn ' + (spec.danger ? 'danger' : 'primary') + '" id="form-submit">' + esc(val(spec.submitLabel, ds)) + '</button></div></form>';
  };
  /* Read and coerce the form; numbers stay numbers, dates become demo minutes. Returns null when invalid. */
  V.formValues = function (state, kind, ds, form) {
    const spec = SPECS[kind]; const fields = spec.fields(state, ds);
    const out = {}; const errs = [];
    fields.forEach((f) => {
      const wrap = form.querySelector('[name="' + f.name + '"]'); if (!wrap) return;
      const holder = wrap.closest('.fld'); if (holder && holder.hidden) return;
      let v;
      if (f.type === 'checkbox') v = wrap.checked;
      else if (f.type === 'number') { const raw = wrap.value.trim(); v = raw === '' ? null : Number(raw); if (v != null && (!isFinite(v) || (f.min != null && v < f.min) || (f.max != null && v > f.max))) errs.push(f.label + ' must be between ' + f.min + ' and ' + f.max + '.'); }
      else if (f.type === 'date') { v = wrap.value ? u.fromInputs(wrap.value, /until|End/i.test(f.name + f.label) ? '23:59' : '00:00') : null; }
      else if (f.type === 'datetime') { const t = form.querySelector('[name="' + f.name + '__t"]'); v = wrap.value ? u.fromInputs(wrap.value, t && t.value ? t.value : '17:00') : null; }
      else v = wrap.value.trim();
      if (f.required && (v == null || v === '')) errs.push(f.label + ' is required.');
      if (f.minlength && v && v.length < f.minlength) errs.push(f.label + ' is too short.');
      out[f.name] = v === '' && f.type === 'select' && f.name === 'supplier' ? null : v;
    });
    if (out.windowStart != null && out.windowEnd != null && out.windowEnd < out.windowStart) errs.push('The window ends before it starts.');
    return { values: out, errors: errs };
  };
  V.formSpec = (k) => SPECS[k];
  V.formSubmitLabel = (k, ds) => val(SPECS[k].submitLabel, ds);
})();
