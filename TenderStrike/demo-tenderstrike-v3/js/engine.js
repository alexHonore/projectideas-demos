/* Moteur générique : un seul chemin de code pour chaque dossier (semé ou créé).
   État persistant, horloge de démo, coffre-fort, calculs (prix, corridor, conformité, champs),
   étapes, échéances, notifications, journal unique et actions. */
(function () {
  'use strict';
  const TS = (window.TS = window.TS || {});
  const D = TS.DATA, U = TS.U;
  const KEY = 'tenderstrike-v3';
  const SCHEMA = 4;
  const BASE = Date.parse(D.now);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const DAY = 86400000;

  const S = (TS.S = { state: null, listeners: [], undo: null });

  /* ---------- état initial ---------- */
  const seedLog = () => [
    { at: '2026-10-08T09:20:00-04:00', actor: 'sylvie', tender: 'ts-052', what: 'Décision : Poursuivre', detail: 'Renouvellement d’un contrat que vous exécutez.', ver: 'Devis v1' },
    { at: '2026-10-20T15:12:00-04:00', actor: 'sylvie', tender: 'ts-052', what: 'Reçu officiel enregistré · dossier déposé', detail: 'Numéro Reçu SEAO fictif LAH-11-0042.', ver: 'Devis v1' },
    { at: '2026-10-21T10:40:00-04:00', actor: 'marc', tender: 'ts-031', what: 'Visite obligatoire effectuée', detail: 'Denis Gaudreau a signé le registre; attestation de visite remise par la Ville.', ver: 'Devis v1' },
    { at: '2026-10-21T15:10:00-04:00', actor: 'sylvie', tender: 'ts-044', what: 'Décision : Poursuivre', detail: 'Client actuel; personnel disponible; visite à faire le 28 octobre.', ver: 'Devis v1' },
    { at: '2026-10-22T16:40:00-04:00', actor: 'source', tender: 'ts-031', what: 'Addenda n° 1 publié sur SEAO', detail: 'Trottoirs 18,2 → 21,4 km par saison; nouvel article 6; nouveau bordereau.', ver: 'Addenda n° 1' },
    { at: '2026-10-23T06:00:00-04:00', actor: 'system', what: 'Ingestion SEAO', detail: '312 avis et 6 addenda lus; instantanés bruts conservés.', ver: '' },
    { at: '2026-10-23T06:48:00-04:00', actor: 'system', tender: 'ts-031', what: 'Radiographie terminée', detail: '186 pages lues; exigences reliées à leur page; Annexe F lue à 68 %.', ver: 'Devis v1 + addenda n° 1' },
    { at: '2026-10-23T07:30:00-04:00', actor: 'system', what: 'Brief de 7 h 30 préparé', detail: 'Courriel et texto pour Sylvie Gaudreau (envoi simulé dans la démo).', ver: '' }
  ];
  const seedInbox = () => [
    { id: 'n-brief-1023', at: '2026-10-23T07:30:00-04:00', type: 'brief', title: 'Brief du vendredi 23 octobre prêt', body: 'Mont-Saint-Aubin Nord : 2 bloqueurs avant l’export. 5 dossiers suivis.', href: '#/brief', read: false },
    { id: 'n-add1-031', at: '2026-10-22T16:40:00-04:00', type: 'addendum', tender: 'ts-031', title: 'Addenda n° 1 · Mont-Saint-Aubin Nord', body: 'Trottoirs 18,2 → 21,4 km; nouvel article 6. Accusé de réception requis.', href: '#/dossier/ts-031/radiographie', read: false },
    { id: 'n-arq-15', at: '2026-10-18T08:00:00-04:00', type: 'expiry', title: 'Rappel : attestation de Revenu Québec', body: 'Expire le 2 novembre, avant 4 clôtures. Rappel texto simulé à Josée.', href: '#/coffre', read: true }
  ];
  const initial = () => ({
    schema: SCHEMA,
    persona: 'sylvie',
    clock: 0,
    caps: { offline: false, registryDown: false, noClipboard: false },
    radar: { view: 'list', radius: D.company.radiusKm, feedback: {}, filter: 'all' },
    vault: clone(D.vault),
    projects: clone(D.projects),
    custom: {},
    dossiers: {},
    openings: [],
    inbox: seedInbox(),
    fired: { 'exp-15:v-arq:1': true },
    seq: 1,
    log: seedLog()
  });

  S.load = () => {
    let saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    S.state = saved && saved.schema === SCHEMA ? Object.assign(initial(), saved) : initial();
    S.storageOk = true;
    try { window.localStorage.setItem(KEY + ':probe', '1'); window.localStorage.removeItem(KEY + ':probe'); } catch (e) { S.storageOk = false; }
  };
  S.save = () => { try { window.localStorage.setItem(KEY, JSON.stringify(S.state)); } catch (e) { S.storageOk = false; } };
  S.on = (fn) => S.listeners.push(fn);
  S.emit = () => S.listeners.forEach((fn) => fn());
  S.reset = () => { try { window.localStorage.removeItem(KEY); } catch (e) { /* stockage indisponible */ } S.state = initial(); S.save(); S.emit(); };
  S.exportJson = () => JSON.stringify({ app: 'tenderstrike-v3', schema: SCHEMA, exportedAt: S.nowIso(), note: 'Démo · données fictives', state: S.state }, null, 2);
  S.importJson = (text) => {
    let o;
    try { o = JSON.parse(text); } catch (e) { return { ok: false, msg: 'Fichier illisible : ce n’est pas du JSON valide.' }; }
    if (!o || o.app !== 'tenderstrike-v3' || !o.state) return { ok: false, msg: 'Ce fichier ne provient pas de TenderStrike V3.' };
    if (o.schema !== SCHEMA || o.state.schema !== SCHEMA) return { ok: false, msg: 'Version d’espace de travail incompatible (' + o.schema + ' au lieu de ' + SCHEMA + ').' };
    const st = o.state;
    if (!Array.isArray(st.vault) || !Array.isArray(st.log) || typeof st.dossiers !== 'object') return { ok: false, msg: 'Espace de travail incomplet : coffre-fort, journal ou dossiers manquants.' };
    S.state = Object.assign(initial(), st);
    S.save(); S.emit();
    return { ok: true, msg: 'Espace de travail importé : ' + Object.keys(st.dossiers).length + ' dossier(s), ' + st.log.length + ' événements.' };
  };

  /* ---------- annulation (actions destructrices) ---------- */
  S.snapshot = (label) => { S.undo = { label, state: clone(S.state), at: Date.now() }; };
  S.restore = () => { if (!S.undo) return false; S.state = S.undo.state; S.undo = null; S.save(); S.emit(); return true; };

  /* ---------- horloge ---------- */
  S.now = () => new Date(BASE + S.state.clock * 60000);
  S.nowTs = () => BASE + S.state.clock * 60000;
  S.nowIso = () => S.now().toISOString();
  const tick = (min) => { S.state.clock += min || 3; };

  S.person = (id) => D.people[id || S.state.persona];
  S.can = (perm) => S.person().can.includes(perm);
  S.actorName = (a) => (a === 'system' ? 'TenderStrike' : a === 'source' ? 'SEAO' : a === 'lab' ? 'Labo de test' : a === 'denis' ? 'Denis Gaudreau (contremaître)' : (D.people[a] ? D.people[a].name : a));
  S.nextId = (p) => { S.state.seq = (S.state.seq || 1) + 1; return p + '-' + S.state.seq; };

  const log = (tender, what, detail, extra) => {
    const x = extra || {};
    tick(x.min);
    S.state.log.push(Object.assign({ at: S.nowIso(), actor: x.actor || S.state.persona, tender: tender || null, what, detail: detail || '', ver: tender ? S.bundleLabel(tender) : '', rev: tender ? S.D(tender).rev : undefined }, x.diff ? { diff: x.diff } : {}));
  };
  const notify = (n) => {
    const id = n.id || S.nextId('n');
    if (S.state.inbox.some((x) => x.id === id)) return;
    S.state.inbox.unshift(Object.assign({ id, at: S.nowIso(), read: false }, n));
  };
  S.log = log; S.notify = notify;
  const commit = () => { S.save(); S.emit(); };
  S.commit = commit;
  const touch = (id) => { S.D(id).rev += 1; };

  /* ---------- appels d’offres et dossiers ---------- */
  S.tenders = () => TS.TENDERS.concat(Object.values(S.state.custom || {}));
  S.def = (id) => TS.TENDERS.find((t) => t.id === id) || (S.state.custom || {})[id] || null;
  S.exists = (id) => !!S.def(id);
  const blankDossier = () => ({ xrayOpened: false, decision: null, prices: {}, costs: {}, inflation: 'ipc', manualRate: 3, proposal: null, priceApproval: null, addenda: [], extraAddenda: [], ack: {}, projects: null, refEmails: {}, verified: {}, decl: {}, declSigned: null, bond: { status: 'none' }, packageApproval: null, exports: [], receipt: null, results: null, outcome: null, confirmations: {}, questions: [], visitAttendee: null, acquired: null, manualCheck: null, rev: 1, archived: false });
  S.D = (id) => {
    const st = S.state;
    if (!st.dossiers[id]) {
      const def = S.def(id);
      const d = blankDossier();
      if (def) {
        def.articles.forEach((a) => { d.prices[a.code] = Math.round(a.price * 100); });
        const seed = def.seedState || {};
        ['xrayOpened', 'decision', 'addenda', 'bond', 'declSigned', 'decl', 'receipt'].forEach((k) => { if (seed[k] !== undefined) d[k] = clone(seed[k]); });
        d.projects = S.defaultProjects(def);
        st.dossiers[id] = d;
        if (seed.allVerified) S.annexes(id).forEach((a) => { d.verified[a.id] = { hash: a.hash, at: seed.packageSeed, by: 'josee' }; });
        if (seed.priceApprovalSeed) d.priceApproval = { hash: S.priceHash(id), ht: S.totals(id).htC, bundle: S.bundleKey(id), at: seed.priceApprovalSeed, by: 'sylvie' };
        if (seed.packageSeed) {
          d.packageApproval = { hash: S.packageHash(id), rev: d.rev, at: seed.packageSeed, by: 'sylvie', bundle: S.bundleKey(id) };
          d.exports.push({ kind: 'approved', hash: S.packageHash(id), rev: d.rev, at: seed.packageSeed, by: 'sylvie', bundle: S.bundleKey(id), blockers: [] });
          if (d.receipt) Object.assign(d.receipt, { rev: d.rev, hash: S.packageHash(id), at: d.receipt.when });
        }
      } else st.dossiers[id] = d;
    }
    return st.dossiers[id];
  };

  /* addenda : scénarisés dans la définition, ou générés (labo, réponses aux questions) */
  S.allAddenda = (id) => (S.def(id).addenda || []).concat(S.D(id).extraAddenda || []);
  S.published = (id) => { const pub = S.D(id).addenda; return S.allAddenda(id).filter((a) => pub.includes(a.id)).sort((a, b) => a.n - b.n); };
  S.pendingAddenda = (id) => S.allAddenda(id).filter((a) => !S.D(id).addenda.includes(a.id));
  S.bundleKey = (id) => S.D(id).addenda.slice().sort().join('+') || 'v1';
  S.bundleLabel = (id) => { const p = S.published(id); return 'Devis v1' + (p.length ? ' + addenda n° ' + p.map((a) => a.n).join(' et n° ') : ''); };
  S.bundlePages = (id) => (S.def(id).pagesTotal || 0) + S.published(id).reduce((s, a) => s + (a.pages || 1), 0);
  S.close = (id) => { let c = S.def(id).close; S.published(id).forEach((a) => (a.changes || []).forEach((ch) => { if (ch.type === 'close') c = ch.to; })); return c; };
  S.opening = (id) => { let c = S.def(id).opening; S.published(id).forEach((a) => (a.changes || []).forEach((ch) => { if (ch.type === 'close' && ch.opening) c = ch.opening; })); return c; };
  S.qtyOf = (id, a) => { let q = a.qty; S.published(id).forEach((ad) => (ad.changes || []).forEach((ch) => { if (ch.type === 'qty' && ch.code === a.code) q = ch.to; })); return q; };
  S.changedCodes = (id) => S.published(id).filter((a) => !a.seeded).flatMap((a) => (a.changes || []).filter((c) => c.type === 'qty').map((c) => c.code));
  S.qtyBefore = (id, a) => { let q = a.qty; const pub = S.published(id); const lastIdx = pub.map((ad, i) => ((ad.changes || []).some((c) => c.type === 'qty' && c.code === a.code) ? i : -1)).filter((i) => i >= 0).pop(); pub.forEach((ad, i) => { if (i === lastIdx) return; (ad.changes || []).forEach((ch) => { if (ch.type === 'qty' && ch.code === a.code) q = ch.to; }); }); return q; };
  S.articles = (id) => S.def(id).articles.filter((a) => S.qtyOf(id, a) > 0 || a.custom);
  S.docs = (id) => {
    const def = S.def(id);
    const out = { devis: { id: 'devis', label: def.docLabel || 'Cahier des charges', short: def.docShort || 'Devis v1', pages: def.pagesTotal } };
    S.published(id).forEach((a) => { out[a.id] = { id: a.id, label: a.label, short: a.label, pages: a.pages || (a.pageDefs || []).length || 1 }; });
    return out;
  };
  S.pages = (id) => {
    const def = S.def(id);
    let pages = (def.pages || []).map((p) => Object.assign({ doc: 'devis' }, p));
    S.published(id).forEach((a) => { (a.pageDefs || []).forEach((p) => pages.push(Object.assign({}, p, { doc: a.id }))); });
    return pages;
  };
  S.requirements = (id) => {
    const def = S.def(id);
    let reqs = (def.requirements || []).slice();
    S.published(id).forEach((a) => { (a.reqs || []).forEach((r) => reqs.push(r)); reqs.push({ id: 'r-ack-' + a.id, clause: 'c-' + a.id + '-ack', doc: a.id, page: (a.pageDefs || []).length || 1, sec: 'accusé', assess: 'eligibility', kind: 'req', title: 'Accusé de réception · ' + a.label.toLowerCase(), plain: 'Formulaire signé à joindre au paquet.', rule: { type: 'ack', add: a.id }, conf: 0.96 }); });
    return reqs;
  };
  S.reqById = (id, rid) => S.requirements(id).find((r) => r.id === rid);
  S.clauseText = (id, clause) => { const b = S.pages(id).flatMap((p) => p.blocks).find((x) => x.id === clause); return b ? b.x : ''; };

  /* ---------- bordereau ---------- */
  S.lines = (id, prices) => {
    const d = S.D(id), p = prices || d.prices;
    const changed = S.changedCodes(id);
    return S.articles(id).map((a) => {
      const qty = S.qtyOf(id, a);
      const priceC = p[a.code] || 0;
      const costU = d.costs[a.code] != null ? d.costs[a.code] / 100 : a.cost;
      const totalC = Math.round(qty * priceC);
      const costC = Math.round(qty * costU * 100);
      return { a, qty, priceC, costU, totalC, costC, marginRate: totalC ? (totalC - costC) / totalC : 0, changed: changed.includes(a.code), before: changed.includes(a.code) ? S.qtyBefore(id, a) : null };
    });
  };
  S.totals = (id, prices) => {
    const def = S.def(id);
    const lines = S.lines(id, prices);
    const htC = lines.reduce((s, l) => s + l.totalC, 0);
    const costC = lines.reduce((s, l) => s + l.costC, 0);
    const tpsC = Math.round(htC * D.taxes.tps), tvqC = Math.round(htC * D.taxes.tvq);
    const ttcC = htC + tpsC + tvqC;
    const bondBase = def.bondBasis === 'ht' ? htC : ttcC;
    const bondC = def.bondAmount ? Math.round(def.bondAmount * 100) : Math.round(bondBase * (def.bondRate || 0));
    return { lines, htC, costC, tpsC, tvqC, ttcC, bondC, marginC: htC - costC, margin: htC ? (htC - costC) / htC : 0 };
  };
  /* Garantie de soumission : taux (TTC ou HT) ou montant fixe */
  S.hasBond = (id) => { const d = S.def(id); return !!(d && (d.bondRate > 0 || d.bondAmount > 0)); };
  S.bondLabel = (id, long) => { const d = S.def(id); return d.bondAmount ? U.money(d.bondAmount) + ' (montant fixe)' : U.num(d.bondRate * 100, 0) + ' % ' + (d.bondBasis === 'ht' ? (long ? 'avant taxes' : 'HT') : 'TTC'); };
  S.bondAccepts = (id, k) => { const f = S.def(id).bondFormKeys || []; return !f.length || f.includes(k); };
  S.bondCap = (bondC) => Math.ceil((bondC / 100) * 1.08 / 5000) * 5000;

  /* ---------- historique (semé + ouvertures enregistrées) ---------- */
  S.history = (id) => {
    const def = S.def(id);
    const own = (def.cycles || []).map((c) => Object.assign({ origin: 'seed' }, c));
    const rec = S.state.openings.filter((o) => o.family && o.family === def.family && o.tender !== id).map((o) => Object.assign({ origin: 'recorded' }, o));
    return rec.concat(own).sort((a, b) => b.year - a.year || String(b.openedAt || '').localeCompare(String(a.openedAt || '')));
  };
  S.inflationFactor = (id, c) => {
    const d = S.D(id), k = d.inflation;
    if (k === 'ipc') return D.cpiNow / (c.cpi || D.cpiNow);
    if (k === 'composite') return c.composite || 1;
    if (k === 'manual') return Math.pow(1 + (Number(d.manualRate) || 0) / 100, Math.max(0, 2026 - c.year));
    return 1;
  };
  S.oracle = (id, prices) => {
    const def = S.def(id), d = S.D(id);
    const T = S.totals(id, prices);
    const refOf = (code, c) => { const a = def.articles.find((x) => x.code === code); return a && a.ref != null ? a.ref : (c && c.refs && c.refs[code]) || 0; };
    const basket = T.lines.reduce((s, l) => s + l.qty * (l.a.ref || 0), 0);
    const cycles = S.history(id).map((c) => {
      const cb = Object.keys(c.qtys || {}).reduce((s, code) => s + c.qtys[code] * refOf(code, c) * ((c.qtyScale && c.qtyScale[code]) || 1), 0);
      const scope = cb > 0 && basket > 0 ? basket / cb : 1;
      const infl = S.inflationFactor(id, c);
      const out = Object.assign({}, c, { basket: cb, scope, infl, factor: scope * infl });
      if (c.bids) {
        out.bids = c.bids.map((b) => Object.assign({}, b, { adjusted: b.amount * scope * infl }));
        const conform = out.bids.filter((b) => b.status !== 'nonconform').sort((x, y) => x.amount - y.amount);
        out.winner = conform[0]; out.second = conform[1];
        out.spread = out.second ? (out.second.amount - out.winner.amount) / out.winner.amount : null;
      }
      if (c.award) out.awardAdj = c.award.amount * scope * infl;
      return out;
    });
    const withBids = cycles.filter((c) => c.bids && c.second);
    const mode = withBids.length ? 'bids' : cycles.some((c) => c.award || c.bids) ? 'award' : 'none';
    const current = T.htC / 100;
    const floor = T.costC / 100 / (1 - (def.minMargin || 0.1));
    const res = { T, cycles, mode, current, floor, basket, refInternal: T.lines.filter((l) => l.a.refInternal) };
    if (mode === 'bids') {
      const recent = withBids[0];
      const spreads = withBids.map((c) => c.spread);
      const meanSpread = spreads.reduce((s, x) => s + x, 0) / spreads.length;
      const A1 = recent.winner.adjusted;
      const zoneLo = Math.max(floor, A1 * (1 - meanSpread / 2));
      const zoneHi = A1;
      const feasible = floor < zoneHi;
      const conformAll = cycles.flatMap((c) => (c.bids || []).filter((b) => b.status !== 'nonconform').map((b) => Object.assign({ cycle: c.year }, b)));
      Object.assign(res, { recent, meanSpread, A1, zoneLo, zoneHi, feasible, target: feasible ? (zoneLo + zoneHi) / 2 : floor, conformAll,
        below: conformAll.filter((b) => current < b.adjusted).length,
        rank: recent.bids.filter((b) => b.status !== 'nonconform' && !b.you && b.adjusted < current).length + 1,
        rankOf: recent.bids.filter((b) => b.status !== 'nonconform').length,
        zoneState: !feasible ? 'infeasible' : current < floor ? 'below-floor' : current < zoneLo ? 'below' : current <= zoneHi * 1.0005 ? 'in' : 'above' });
    } else {
      const ref = cycles.find((c) => c.awardAdj != null || c.winner);
      const A1 = ref ? (ref.awardAdj != null ? ref.awardAdj : ref.winner.adjusted) : null;
      const target = T.costC / 100 / (1 - (def.minMargin || 0.1) - 0.04);
      Object.assign(res, { A1, refCycle: ref, target, feasible: true, zoneState: 'nozone', vsA1: A1 ? (current - A1) / A1 : null });
    }
    return res;
  };
  S.buildProposal = (id) => {
    const O = S.oracle(id), d = S.D(id);
    const ratio = O.target / O.current;
    const to = {};
    S.articles(id).forEach((a) => { const v = d.prices[a.code] * ratio; to[a.code] = v >= 10000 ? Math.round(v / 100) * 100 : Math.round(v); });
    return { ratio, to, before: O, after: S.oracle(id, to) };
  };
  S.priceHash = (id) => U.sha256(JSON.stringify({ b: S.bundleKey(id), p: S.D(id).prices, q: S.lines(id).map((l) => l.qty) }));
  S.priceApproved = (id) => { const pa = S.D(id).priceApproval; return !!(pa && pa.hash === S.priceHash(id)); };

  /* ---------- coffre-fort ---------- */
  S.vaultDocs = (kind, tender) => S.state.vault.filter((v) => v.kind === kind && !v.removed && (!tender || v.tender === tender));
  S.bestDoc = (kind, tender) => S.vaultDocs(kind, tender).sort((a, b) => (b.indefinite ? 1 : 0) - (a.indefinite ? 1 : 0) || String(b.expires || '9999').localeCompare(String(a.expires || '9999')))[0];
  S.endOf = (isoDay) => Date.parse(isoDay + 'T23:59:00-05:00');
  S.equipmentCounts = () => { const c = {}; D.equipment.forEach((e) => { c[e.cat] = (c[e.cat] || 0) + e.count; }); return c; };
  S.vaultStatus = (v) => {
    const now = S.nowTs();
    if (v.revoked) return { k: 'suspended', label: 'Révoquée' };
    if (v.indefinite) {
      if (v.checkedAt && now - Date.parse(v.checkedAt) > (v.reviewDays || 14) * DAY) return { k: 'unverified', label: 'Statut à revérifier' };
      return { k: 'verified', label: 'Sans échéance · statut vérifié' };
    }
    if (!v.expires) {
      if (v.checkedAt && now - Date.parse(v.checkedAt) > (v.reviewDays || 14) * DAY) return { k: 'unverified', label: 'Vérification périmée' };
      return { k: 'verified', label: 'Vérifiée · sans échéance' };
    }
    const exp = S.endOf(v.expires);
    if (exp < now) return { k: 'expired', label: 'Expirée' };
    const closes = S.openDossierIds().filter((id) => S.requirements(id).some((r) => r.rule && r.rule.type === 'vault' && r.rule.kind === v.kind) && Date.parse(S.close(id)) > exp);
    if (closes.length) return { k: 'expired', label: 'Expire avant ' + closes.length + ' clôture' + (closes.length > 1 ? 's' : '') };
    const days = Math.round((exp - now) / DAY);
    if (days < 90) return { k: 'pending', label: 'Expire dans ' + days + ' jours' };
    return { k: 'verified', label: 'Valide' };
  };

  /* ---------- références ---------- */
  S.projects = () => S.state.projects.filter((p) => !p.removed);
  S.projectMetric = (p, metric) => (metric === 'km' ? p.km || 0 : metric === 'value' ? p.value || 0 : metric === 'm2' ? p.m2 || 0 : metric === 'sites' ? p.sites || 0 : 1);
  S.projectTest = (def, p) => {
    const e = def.experience;
    if (!e) return { ok: false, why: 'Aucune exigence d’expérience' };
    const tradeOk = p.trade === e.trade;
    const inPeriod = p.end >= e.since || (e.metric === 'm2' && p.end >= S.nowIso().slice(0, 10));
    const metricOk = S.projectMetric(p, e.metric) >= e.min && (e.metric !== 'km' || e.min === 0 || p.km > 0);
    const ok = tradeOk && inPeriod && metricOk;
    const unit = e.metric === 'km' ? 'km' : e.metric === 'value' ? '$' : e.metric === 'm2' ? 'm²' : '';
    const why = !tradeOk ? 'Autre métier (' + (D.tradeLabels[p.trade] || p.trade) + ')' : !inPeriod ? 'Terminé le ' + U.date(p.end + 'T12:00:00-04:00') + ', avant la période exigée' : !metricOk ? (e.metric === 'value' ? 'Valeur de ' + U.money(p.value) + ', sous le minimum de ' + U.money(e.min) : 'Sous le minimum de ' + U.num(e.min, 0) + ' ' + unit) : 'Répond aux critères';
    return { tradeOk, inPeriod, metricOk, ok, why };
  };
  S.defaultProjects = (def) => (def.experience ? S.projects().filter((p) => S.projectTest(def, p).ok).slice(0, def.experience.count).map((p) => p.id) : []);
  S.selectedProjects = (id) => { const d = S.D(id); return (d.projects || []).filter((pid) => S.projects().some((p) => p.id === pid)); };
  S.qualifying = (id) => { const def = S.def(id); return S.selectedProjects(id).filter((pid) => S.projectTest(def, S.projects().find((p) => p.id === pid)).ok).length; };

  /* ---------- annexes et champs ---------- */
  const C = D.company;
  const fld = (label, value, prov, opts) => Object.assign({ label, value, prov, eligible: true }, opts || {});
  const man = (label, value, prov, opts) => Object.assign({ label, value, prov, eligible: false, manual: true }, opts || {});
  S.annexes = (id) => {
    const def = S.def(id), d = S.D(id), T = S.totals(id);
    const signed = d.declSigned;
    const list = [];
    list.push({ id: 'A', title: 'Annexe A · Formulaire de soumission', fields: [
      fld('Nom légal', C.legalName, 'Registraire des entreprises, consulté le 2 septembre 2026; confirmé par Sylvie Gaudreau'),
      fld('Nom commercial', C.tradeName, 'Profil de l’entreprise'),
      fld('NEQ', C.neq, 'Registraire des entreprises; confirmé par Sylvie Gaudreau'),
      fld('Adresse du siège', C.address, 'Registraire des entreprises'),
      fld('Téléphone', C.phone, 'Profil de l’entreprise'),
      fld('Courriel pour les avis', C.email, 'Profil de l’entreprise'),
      fld('Numéro de TPS', C.tps, 'Profil fiscal, vérifié par Josée Tremblay le 3 août 2026'),
      fld('Numéro de TVQ', C.tvq, 'Profil fiscal, vérifié par Josée Tremblay le 3 août 2026'),
      fld('Autorisation AMP n°', C.amp, 'Coffre-fort : autorisation AMP'),
      fld('Personne-ressource', C.contact, 'Profil de l’entreprise'),
      fld('Courriel de la signataire', 'sylvie@gaudreau.example', 'Profil de l’entreprise'),
      fld('Signataire autorisée', C.signatory, 'Coffre-fort : résolution du CA n° 2026-03'),
      fld('Titre de la signataire', C.signatoryTitle, 'Coffre-fort : résolution du CA n° 2026-03'),
      fld('Résolution', C.resolution, 'Coffre-fort : Resolution_CA_2026-03.pdf'),
      man('Prix total, taxes incluses', U.cents(T.ttcC), 'Reporté du bordereau (Annexe B); votre prix', { filled: T.htC > 0, price: true }),
      man('Signature', signed ? 'Signée par Sylvie Gaudreau (simulation)' : '', 'Méthode acceptée par SEAO, hors démo', { filled: !!signed, sign: true }),
      man('Date', signed ? U.date(signed.at) : '', 'Saisie au moment de la signature', { filled: !!signed })
    ] });
    list.push({ id: 'B', title: 'Annexe B · Bordereau de prix (' + S.bundleLabel(id).replace('Devis v1 + ', '').replace('Devis v1', 'version originale') + ')', fields: [fld('Nom légal', C.legalName, 'Registraire des entreprises'), fld('NEQ', C.neq, 'Registraire des entreprises')].concat(T.lines.map((l) => man('Art. ' + l.a.n + ' · prix unitaire', U.cents(l.priceC), 'Saisi par vous dans l’onglet Prix', { filled: l.priceC > 0, price: true }))) });
    list.push({ id: 'C', title: 'Annexe C · Déclaration du soumissionnaire', fields: [fld('Nom légal', C.legalName, 'Registraire des entreprises'), fld('NEQ', C.neq, 'Registraire des entreprises'), fld('Adresse', C.address, 'Registraire des entreprises'), fld('Signataire', C.signatory + ', ' + C.signatoryTitle.toLowerCase(), 'Résolution du CA n° 2026-03')]
      .concat((def.declItems || []).map((x, i) => man(x, d.decl['d' + (i + 1)] ? 'Déclaré' : '', 'Lu et coché par la signataire seulement', { filled: !!d.decl['d' + (i + 1)], decl: true })))
      .concat([man('Signature', signed ? 'Signée (simulation)' : '', 'Méthode acceptée par SEAO, hors démo', { filled: !!signed, sign: true })]) });
    if (def.experience) {
      const dFields = [];
      const metricLbl = { km: 'kilomètres de voies', value: 'valeur du contrat', m2: 'superficie entretenue', sites: 'nombre de sites' }[def.experience.metric] || 'portée';
      S.selectedProjects(id).forEach((pid, i) => {
        const p = S.projects().find((x) => x.id === pid);
        const k = 'Projet ' + (i + 1);
        dFields.push(fld(k + ' · client', p.client, 'Fiche projet du coffre-fort'));
        dFields.push(fld(k + ' · objet', p.object, 'Fiche projet du coffre-fort'));
        dFields.push(fld(k + ' · période', U.date(p.start + 'T12:00:00-04:00') + ' au ' + U.date(p.end + 'T12:00:00-04:00'), 'Fiche projet'));
        dFields.push(fld(k + ' · ' + metricLbl, def.experience.metric === 'value' ? U.money(p.value) : def.experience.metric === 'm2' ? U.num(p.m2 || 0, 0) + ' m²' : p.km ? U.num(p.km, 1) + ' km' : (p.sites || 0) + ' sites', 'Fiche projet, mesuré au contrat'));
        dFields.push(fld(k + ' · valeur', U.money(p.value), 'Fiche projet, montant avant taxes'));
        const email = p.email || d.refEmails[pid] || '';
        dFields.push(fld(k + ' · référence', email ? p.contact + ' · ' + email : '', email ? (p.email ? 'Fiche projet; consentement de divulgation au dossier' : 'Saisi par vous') : 'Courriel absent du coffre-fort : à compléter', { filled: !!email, user: !p.email && !!email, editable: !p.email ? pid : null }));
      });
      list.push({ id: 'D', title: 'Annexe D · Expérience du soumissionnaire', fields: dFields });
    }
    if ((def.equipment || []).length) {
      const cats = def.equipment.map((e) => e.cat);
      const eFields = [];
      D.equipment.filter((e) => cats.includes(e.cat)).forEach((e, i) => {
        const k = 'Ligne ' + (i + 1);
        const gpsKnown = e.gps != null || d.confirmations.gps;
        eFields.push(fld(k + ' · désignation', e.label, 'Liste d’équipement du 1er octobre 2026'));
        eFields.push(fld(k + ' · nombre', String(e.count), 'Liste d’équipement'));
        eFields.push(fld(k + ' · possession', e.mode, e.mode.startsWith('Location') ? 'Contrat de location au coffre-fort' : 'Liste d’équipement'));
        eFields.push(fld(k + ' · année', e.year, 'Liste d’équipement'));
        eFields.push(fld(k + ' · GPS', e.attachment ? 'Accessoire, sans GPS propre' : gpsKnown ? (e.gps != null ? e.gps + ' sur ' + e.count : '1 sur 1 (confirmé par le loueur)') : '', gpsKnown || e.attachment ? 'Liste d’équipement' : 'Non documenté pour l’unité louée', { filled: !!(e.attachment || gpsKnown), gps: true }));
      });
      list.push({ id: 'E', title: 'Annexe E · Liste d’équipement', fields: eFields });
    }
    S.published(id).forEach((a) => {
      list.push({ id: 'K' + a.n, title: 'Accusé de réception · ' + a.label.toLowerCase(), fields: [
        fld('Appel d’offres', def.ref, 'Avis SEAO ' + def.seao), fld('Addenda', 'N° ' + a.n + (a.publishedAt ? ' du ' + U.date(a.publishedAt) : ''), a.label + ', p. 1'), fld('Soumissionnaire', C.legalName, 'Registraire des entreprises'),
        man('Signature', d.ack[a.id] ? 'Signée (simulation)' : '', 'Signataire autorisée', { filled: !!d.ack[a.id], sign: true })
      ] });
    });
    list.forEach((a) => {
      a.fields.forEach((x) => { if (x.filled == null) x.filled = !!x.value; });
      a.eligible = a.fields.filter((x) => x.eligible).length;
      a.prefilled = a.fields.filter((x) => x.eligible && x.filled).length;
      a.manual = a.fields.filter((x) => x.manual).length;
      a.manualDone = a.fields.filter((x) => x.manual && x.filled).length;
      a.hash = U.sha256(JSON.stringify(a.fields.filter((x) => x.eligible).map((x) => [x.label, x.value])));
      const v = d.verified[a.id];
      a.verified = !!(v && v.hash === a.hash);
      a.stale = !!(v && v.hash !== a.hash);
    });
    return list;
  };
  S.fieldStats = (id) => {
    const A = S.annexes(id);
    const sum = (k) => A.reduce((s, a) => s + a[k], 0);
    const eligible = sum('eligible'), prefilled = sum('prefilled'), manual = sum('manual'), manualDone = sum('manualDone');
    const total = eligible + manual;
    return { A, eligible, prefilled, manual, manualDone, total, share: total ? prefilled / total : 0, verifiedFields: A.filter((a) => a.verified).reduce((s, a) => s + a.prefilled, 0), allVerified: A.every((a) => a.verified), missingEligible: eligible - prefilled, refMissing: A.some((a) => a.id === 'D' && a.fields.some((x) => x.eligible && !x.filled && x.editable)) };
  };

  /* ---------- conformité (évaluée à la date et à l’heure de clôture, avec l’horloge de démo) ---------- */
  const HARD = ['expired', 'missing', 'insufficient', 'failed', 'suspended'];
  const SOFT = ['pending', 'unverified'];
  S.HARD = HARD; S.SOFT = SOFT;
  S.evalRule = (id, r) => {
    const def = S.def(id), d = S.D(id), now = S.nowTs();
    const closeTs = Date.parse(S.close(id));
    const rule = r.rule || {};
    const vaultCheck = (kind, label) => {
      const v = S.bestDoc(kind);
      if (!v) return { k: 'missing', detail: 'Aucune pièce de ce type au coffre-fort.', fix: 'vault:' + kind, vault: null };
      if (v.revoked) return { k: 'suspended', detail: 'Révoquée le ' + U.date(v.revoked.at) + ' : ' + v.revoked.reason, fix: 'vault:' + kind, vault: v };
      if (v.expires) {
        const exp = S.endOf(v.expires);
        if (exp < closeTs) return { k: 'expired', detail: (exp < now ? 'Expirée depuis le ' : 'Valide jusqu’au ') + U.date(v.expires + 'T12:00:00-05:00') + ' : ' + (exp < now ? 'elle ne couvre pas' : 'elle aura expiré avant') + ' la clôture du ' + U.date(S.close(id)) + ' à ' + U.time(S.close(id)) + '.', fix: 'vault:' + kind, vault: v };
        return { k: 'verified', detail: (label || v.title) + ' valide jusqu’au ' + U.date(v.expires + 'T12:00:00-05:00') + (v.versions && v.versions.length ? ' (version ' + (v.versions.length + 1) + ')' : '') + '.', vault: v };
      }
      return { k: 'verified', detail: v.verified, vault: v };
    };
    const registry = (kind) => {
      const v = S.bestDoc(kind);
      if (!v) return { k: 'missing', detail: 'Aucune vérification au coffre-fort.', fix: 'vault:' + kind };
      if (v.revoked) return { k: 'suspended', detail: (kind === 'amp' ? 'Autorisation révoquée' : 'Inscription constatée au registre') + ' le ' + U.date(v.revoked.at) + ' : ' + v.revoked.reason, fix: 'vault:' + kind, vault: v };
      if (S.state.caps.registryDown) return { k: 'unverified', detail: 'Registre indisponible (Labo de test) : le dernier résultat ne vaut pas une vérification. Non vérifié.', fix: 'recheck:' + v.id, vault: v };
      if (v.checkedAt && now - Date.parse(v.checkedAt) > (v.reviewDays || 14) * DAY) return { k: 'unverified', detail: 'Dernière vérification le ' + U.date(v.checkedAt) + ', il y a plus de ' + (v.reviewDays || 14) + ' jours : à revérifier avant le dépôt.', fix: 'recheck:' + v.id, vault: v };
      return { k: 'verified', detail: (kind === 'amp' ? 'Durée indéterminée depuis le 2 avril 2026 : statut « autorisée » vérifié au REA le ' : 'Registre consulté le ') + U.date(v.checkedAt || v.issued) + (v.checkedAt ? ' à ' + U.time(v.checkedAt) : '') + '.', vault: v };
    };
    switch (rule.type) {
      case 'vault': return vaultCheck(rule.kind);
      case 'amp': {
        if (rule.threshold) { const v = S.totals(id).ttcC / 100; if (v < rule.threshold) return { k: 'na', detail: 'Exigée à partir de ' + U.money(rule.threshold) + ' : votre prix de ' + U.money(Math.round(v)) + ' taxes incluses est sous le seuil (à revoir si le prix change).' }; }
        return registry('amp');
      }
      case 'rena': return registry('rena');
      case 'rbq': {
        const v = S.bestDoc('rbq');
        if (!v) return { k: 'missing', detail: 'Aucune licence RBQ au coffre-fort.', fix: 'vault:rbq' };
        const missing = rule.cats.filter((c) => !(v.cats || []).includes(c));
        if (missing.length) return { k: 'failed', detail: 'Sous-catégorie exigée absente de votre licence (' + (v.cats || []).join(', ') + ') : ' + missing.map((c) => (c === 'ventilation' ? 'ventilation et chauffage' : c)).join(', ') + '. Obtenir une sous-catégorie prend des mois : non remédiable avant la clôture.', vault: v };
        return vaultCheck('rbq', 'Licence RBQ (sous-catégorie ' + rule.cats.join(', ') + ')');
      }
      case 'insurance': {
        const v = S.bestDoc('insurance');
        if (!v) return { k: 'missing', detail: 'Aucun certificat d’assurance au coffre-fort.', fix: 'vault:insurance' };
        if ((v.amount || 0) < rule.min) return { k: 'insufficient', detail: 'Couverture de ' + U.money(v.amount || 0) + ' pour ' + U.money(rule.min) + ' exigés.', fix: 'vault:insurance', vault: v };
        const base = vaultCheck('insurance');
        if (base.k === 'verified') base.detail = 'Certificat de ' + U.money(v.amount) + ' (exigé : ' + U.money(rule.min) + ') valide jusqu’au ' + U.date(v.expires + 'T12:00:00-05:00') + '.';
        return base;
      }
      case 'visit': {
        if (!def.visit || !def.visit.mandatory) return { k: 'na', detail: 'Aucune visite obligatoire.' };
        const v = S.bestDoc('visit', id);
        if (!def.visit.at && !v) return { k: 'pending', detail: 'Visite obligatoire : date et heure à confirmer auprès du donneur d’ouvrage.', fix: 'visit-assign' };
        if (v) return { k: 'verified', detail: 'Attestation de visite au coffre-fort (' + U.date(v.issued + 'T12:00:00-04:00') + ').', vault: v };
        const at = Date.parse(def.visit.at);
        if (now < at) return { k: 'pending', detail: 'Visite prévue le ' + TS.when(def.visit.at) + ' ' + def.visit.place + '. ' + (d.visitAttendee ? 'Participant : ' + S.actorName(d.visitAttendee) + '.' : 'Aucun participant assigné.'), fix: 'visit-assign' };
        if (now < at + DAY) return { k: 'pending', detail: 'Visite passée le ' + TS.when(def.visit.at) + ' : versez l’attestation remise sur place.', fix: 'visit-upload' };
        return { k: 'failed', detail: 'Aucune attestation plus de 24 h après la visite du ' + TS.when(def.visit.at) + '. Sans elle, la soumission ne peut pas être conforme. Versez-la si vous l’avez.', fix: 'visit-upload' };
      }
      case 'experience': {
        const e = def.experience, q = S.qualifying(id);
        if (!e) return { k: 'na', detail: '' };
        return q >= e.count ? { k: 'verified', detail: q + ' référence(s) admissible(s) sur ' + e.count + ' exigée(s) : ' + S.selectedProjects(id).map((pid) => S.projects().find((p) => p.id === pid).client).join(', ') + '.' } : { k: 'missing', detail: q + ' référence(s) admissible(s) sur ' + e.count + ' exigée(s). On ne peut pas présenter ' + q + ' projet(s) comme ' + e.count + ' : ajoutez un projet admissible au coffre-fort ou déclinez.', fix: 'exp' };
      }
      case 'bond': {
        if (!S.hasBond(id)) return { k: 'na', detail: 'Aucune garantie de soumission exigée.' };
        const T = S.totals(id), b = d.bond;
        const forms = def.bondFormKeys || [], labels = (def.bondForms || []).join(', ');
        const accepts = (k) => !forms.length || forms.includes(k);
        const ALT = { bondcheque: ['cheque', 'traite', 'mandat'], bondletter: ['lettre-garantie', 'lettre-credit'] };
        let short = null;
        /* Toute forme admise par le devis et présente au coffre-fort (chèque visé, lettre irrévocable) satisfait l’exigence */
        for (const kind of Object.keys(ALT)) {
          if (!ALT[kind].some(accepts)) continue;
          const v = S.vaultDocs(kind).filter((x) => (!x.tender || x.tender === id) && !x.revoked && (!x.expires || S.endOf(x.expires) >= closeTs)).sort((x, y) => (y.amount || 0) - (x.amount || 0))[0];
          if (!v) continue;
          if ((v.amount || 0) * 100 >= T.bondC) return { k: 'verified', detail: v.title + ' de ' + U.money(v.amount || 0) + ' au coffre-fort : forme admise' + (labels ? ' (' + labels + ')' : '') + ', couvre le montant requis de ' + U.cents(T.bondC) + '.', vault: v };
          short = v;
        }
        if (short && !(b.status === 'issued' && accepts('cautionnement') && b.cap * 100 >= T.bondC)) return { k: 'insufficient', detail: short.title + ' de ' + U.money(short.amount || 0) + ' pour un montant requis de ' + U.cents(T.bondC) + '.', fix: 'vault:' + short.kind, vault: short };
        if (b.status === 'issued') {
          if (!accepts('cautionnement')) return { k: 'missing', detail: 'Le devis n’admet que : ' + labels + '. La lettre de cautionnement du courtier ne satisfait pas l’exigence.', fix: 'vault:' + (forms.some((f) => ALT.bondcheque.includes(f)) ? 'bondcheque' : 'bondletter') };
          const ok = b.cap * 100 >= T.bondC;
          return ok ? { k: 'verified', detail: 'Lettre d’engagement du courtier (cautionnement) jusqu’à ' + U.money(b.cap) + ' pour un montant requis de ' + U.cents(T.bondC) + '.' + (labels ? ' Formes admises : ' + labels + '.' : '') } : { k: 'insufficient', detail: 'Le montant requis (' + U.cents(T.bondC) + ') dépasse la garantie émise (' + U.money(b.cap) + ').', fix: 'bond' };
        }
        if (!accepts('cautionnement')) return { k: 'pending', detail: 'Formes admises : ' + labels + ' (pas de cautionnement) : versez la pièce au coffre-fort. Montant requis : ' + U.cents(T.bondC) + ' (' + S.bondLabel(id, true) + ').', fix: 'vault:' + (forms.some((f) => ALT.bondcheque.includes(f)) ? 'bondcheque' : 'bondletter') };
        return { k: 'pending', detail: (b.status === 'requested' ? 'Demandée au courtier (envoi simulé) : en attente de la lettre. ' : 'À obtenir du courtier. ') + 'Montant requis actuel : ' + U.cents(T.bondC) + ' (' + S.bondLabel(id, true) + ').' + (labels ? ' Formes admises : ' + labels + '.' : ''), fix: 'bond' };
      }
      case 'sheet': return { k: 'verified', detail: 'Le bordereau de la dernière version (' + S.bundleLabel(id) + ') est utilisé; l’original est exclu du paquet.' };
      case 'ack': return d.ack[rule.add] ? { k: 'verified', detail: 'Signé (simulation) le ' + U.dayTime(d.ack[rule.add].at) + '.' } : { k: 'missing', detail: 'Formulaire à signer par la signataire autorisée.', fix: 'sign' };
      case 'equipment': {
        const own = S.equipmentCounts();
        const short = (def.equipment || []).filter((e) => (own[e.cat] || 0) < e.min);
        if (short.length) return { k: 'unknown', detail: 'Équipement insuffisant : ' + short.map((e) => e.cat + ' (' + (own[e.cat] || 0) + ' sur ' + e.min + ')').join(', ') + '. Location à confirmer.' };
        const shared = S.sharedCapacity(id);
        if (shared.length) return { k: 'unknown', detail: 'Suffisant pour ce contrat seul. Avec ' + shared.map((s) => s.name).join(' et ') + ', il faudrait ' + shared[0].need + ' ' + shared[0].cat + 's pour ' + shared[0].own + ' disponibles : capacité à confirmer.' };
        return { k: 'verified', detail: (def.equipment || []).map((e) => (own[e.cat] || 0) + ' ' + e.cat + (own[e.cat] > 1 ? 's' : '') + ' (min. ' + e.min + ')').join(', ') + '.' };
      }
      case 'confirm': return d.confirmations[rule.key] ? { k: 'verified', detail: rule.done } : { k: 'unknown', detail: rule.unknown, act: 'confirm:' + rule.key, actLabel: rule.action };
      case 'perf': { const T = S.totals(id); const need = T.ttcC / 100 * (rule.rate || 0.1); const room = D.surety.aggregate - D.surety.committed; return need <= Math.min(D.surety.single, room) ? { k: 'verified', detail: 'Garanties post-adjudication de ' + U.money(Math.round(need)) + ', sous votre plafond de ' + U.money(D.surety.single) + ' par contrat (' + U.msShort(D.surety.committed) + ' engagés sur ' + U.msShort(D.surety.aggregate) + ').' } : { k: 'unknown', detail: 'Garanties post-adjudication de ' + U.money(Math.round(need)) + ' : au-delà de votre marge de cautionnement disponible.' }; }
      default:
        if (r.kind === 'pill') return { k: 'risk', detail: r.risk || '' };
        return { k: 'info', detail: '' };
    }
  };
  S.sharedCapacity = (id) => {
    const def = S.def(id);
    if (!(def.equipment || []).length) return [];
    const own = S.equipmentCounts();
    const others = S.tenders().filter((t) => t.id !== id && t.trade === def.trade && (t.equipment || []).length && ['prep', 'approval', 'ready', 'submitted', 'opened', 'awarded'].includes(S.stage(t.id)));
    const out = [];
    def.equipment.forEach((e) => {
      const need = e.min + others.reduce((s, t) => s + ((t.equipment.find((x) => x.cat === e.cat) || {}).min || 0), 0);
      if (others.length && need > (own[e.cat] || 0)) out.push({ cat: e.cat, need, own: own[e.cat] || 0, name: others.map((t) => t.buyerShort).join(', ') });
    });
    return out;
  };
  S.compliance = (id) => {
    const def = S.def(id), d = S.D(id);
    const items = [];
    if (S.needsAcquisition(id)) items.push({ id: 'acq', label: 'Documents d’appel d’offres', status: 'missing', detail: 'Le cahier des charges n’a pas encore été obtenu sur SEAO : aucune exigence ne peut être vérifiée.', fix: 'acquire' });
    else S.requirements(id).filter((r) => r.assess === 'eligibility' && r.rule).forEach((r) => {
      const e = S.evalRule(id, r);
      if (e.k === 'na') return;
      items.push({ id: r.id, req: r.id, label: r.title, status: e.k, detail: e.detail, fix: e.fix, vault: e.vault });
    });
    items.push({ id: 'decl', label: 'Déclaration du soumissionnaire (Annexe C)', status: d.declSigned ? 'verified' : 'pending', detail: d.declSigned ? 'Lue et signée par la signataire (simulation).' : (def.declItems || []).length + ' déclarations à lire et à cocher par la signataire, puis signature.', fix: d.declSigned ? null : 'sign' });
    items.push({ id: 'price', label: 'Prix approuvé (approbation commerciale)', status: S.priceApproved(id) ? 'verified' : 'pending', detail: S.priceApproved(id) ? 'Bordereau approuvé à ' + U.cents(S.totals(id).htC) + ' avant taxes.' : d.priceApproval ? 'L’approbation porte sur une version précédente : prix ou quantités modifiés.' : 'Prix unitaires à approuver par la propriétaire.', fix: S.priceApproved(id) ? null : 'price' });
    const fs = S.fieldStats(id);
    items.push({ id: 'fields', label: 'Champs pré-remplis revus', status: fs.allVerified && !fs.refMissing ? 'verified' : 'pending', detail: fs.refMissing ? 'Un champ requis est vide à l’Annexe D (courriel d’une référence).' : fs.allVerified ? 'Les ' + fs.prefilled + ' champs pré-remplis ont été revus.' : fs.A.filter((a) => !a.verified).length + ' annexe(s) à revoir avant l’approbation.', fix: fs.allVerified && !fs.refMissing ? null : 'fields' });
    if (!S.requirements(id).some((r) => r.rule && r.rule.type === 'rbq')) items.push({ id: 'rbq', label: 'Licence RBQ', status: 'na', detail: 'Le devis n’exige aucune licence RBQ pour ce contrat. Votre licence reste au coffre-fort.' });
    return items;
  };
  S.blockers = (id) => S.compliance(id).filter((i) => HARD.includes(i.status) || SOFT.includes(i.status));
  S.hardBlockers = (id) => S.compliance(id).filter((i) => HARD.includes(i.status));
  S.needsAcquisition = (id) => !!(S.def(id).acquisition && !S.D(id).acquired);

  /* ---------- paquet ---------- */
  S.packageContent = (id) => {
    const d = S.D(id), T = S.totals(id);
    const docs = ['arq', 'cnesst', 'amp', 'rena', 'insurance', 'rbq', 'background', 'bondcheque', 'bondletter'].map((k) => { const v = S.bestDoc(k); return v ? k + ':' + (v.hash || v.id) + ':' + (v.versions ? v.versions.length : 0) + ':' + (v.revoked ? 'r' : '') : k + ':none'; });
    const visit = S.bestDoc('visit', id);
    return { tender: S.def(id).ref, bundle: S.bundleKey(id), prices: d.prices, totalHt: T.htC, ttc: T.ttcC, docs, visit: visit ? visit.id : null, projects: S.selectedProjects(id), refEmails: d.refEmails, decl: !!d.declSigned, ack: Object.keys(d.ack).sort(), bond: d.bond.status === 'issued' ? d.bond.cap : null, conf: Object.keys(d.confirmations).sort() };
  };
  S.packageHash = (id) => U.sha256(JSON.stringify(S.packageContent(id)));
  S.packageApproved = (id) => { const pa = S.D(id).packageApproval; return !!(pa && pa.hash === S.packageHash(id)); };
  S.exportedCurrent = (id) => S.D(id).exports.some((e) => e.kind === 'approved' && e.hash === S.packageHash(id));
  S.attachments = (id) => {
    const def = S.def(id), d = S.D(id);
    const files = [['Formulaire_soumission_AnnexeA.pdf', 'Annexe A'], ['Bordereau_prix_' + S.bundleKey(id).replace(/\+/g, '_') + '.pdf', 'Annexe B'], ['Declaration_soumissionnaire_AnnexeC.pdf', 'Annexe C']];
    if (def.experience) files.push(['Experience_AnnexeD.pdf', 'Annexe D']);
    if ((def.equipment || []).length) files.push(['Equipement_AnnexeE.pdf', 'Annexe E']);
    S.published(id).forEach((a) => files.push(['Accuse_reception_addenda' + a.n + '.pdf', a.label]));
    S.compliance(id).filter((c) => c.vault).forEach((c) => files.push([c.vault.file || (c.vault.id + '.pdf'), c.vault.title + (c.vault.versions && c.vault.versions.length ? ' (v' + (c.vault.versions.length + 1) + ')' : '')]));
    const visit = S.bestDoc('visit', id); if (visit && !files.some((f) => f[0] === visit.file)) files.push([visit.file, 'Visite des lieux']);
    if (d.bond.status === 'issued') files.push(['Garantie_soumission_Courtage_Boreal.pdf', 'Garantie de soumission']);
    const content = JSON.stringify(S.packageContent(id));
    const seen = {};
    return files.filter((f) => (seen[f[0]] ? false : (seen[f[0]] = true))).map(([name, role]) => ({ name, role, hash: U.sha256(name + '|' + content) }));
  };

  /* ---------- étapes ---------- */
  S.STAGES = [['matched', 'Correspondance'], ['review', 'En revue'], ['prep', 'En préparation'], ['approval', 'Approbation requise'], ['ready', 'Prêt à déposer'], ['submitted', 'Déposé'], ['result', 'Résultat']];
  const STAGE_LABEL = { matched: 'Correspondance', review: 'En revue', prep: 'En préparation', approval: 'Approbation requise', ready: 'Prêt à déposer', submitted: 'Déposé', opened: 'Ouvert · résultats publiés', awarded: 'Adjugé', lost: 'Perdu', cancelled: 'Annulé', declined: 'Décliné', missed: 'Clôturé sans dépôt' };
  S.stageLabel = (k) => STAGE_LABEL[k] || k;
  S.stage = (id) => {
    const d = S.D(id);
    if (d.outcome) return d.outcome.kind;
    if (d.results) return 'opened';
    if (d.receipt) return 'submitted';
    if (d.decision && d.decision.choice === 'decline') return 'declined';
    if (S.nowTs() > Date.parse(S.close(id))) return 'missed';
    if (S.packageApproved(id)) return 'ready';
    if (d.decision && d.decision.choice === 'proceed') {
      const b = S.blockers(id);
      return b.every((i) => ['price', 'decl', 'fields'].includes(i.id) || /^r-ack/.test(i.id)) ? 'approval' : 'prep';
    }
    if (d.decision || d.xrayOpened) return 'review';
    return 'matched';
  };
  S.column = (id) => { const k = S.stage(id); return ['opened', 'awarded', 'lost', 'cancelled'].includes(k) ? 'result' : k; };
  S.isOpen = (id) => !['submitted', 'opened', 'awarded', 'lost', 'cancelled', 'declined', 'missed'].includes(S.stage(id)) && !S.D(id).archived;
  S.openDossierIds = () => S.tenders().filter((t) => S.isOpen(t.id) && !S.excluded(t.id)).map((t) => t.id);
  S.excluded = (id) => { const def = S.def(id); if (def.excludedReason && !S.D(id).decision) return def.excludedReason; if (!def.custom && def.distance > S.state.radar.radius && !S.D(id).decision && !S.D(id).receipt) return 'Hors de votre rayon : ' + def.distance + ' km pour ' + S.state.radar.radius + ' km. Ouvrez le dossier pour le traiter quand même.'; return null; };
  S.nextAction = (id) => {
    const k = S.stage(id), d = S.D(id), base = '#/dossier/' + id + '/';
    if (S.needsAcquisition(id)) return { label: 'Obtenir les documents', href: base + 'radiographie' };
    if (k === 'matched') return { label: 'Revoir la radiographie', href: base + 'radiographie' };
    if (k === 'review') return d.decision ? { label: 'Investiguer les points ouverts', href: base + 'radiographie' } : { label: 'Décider : poursuivre ou non', href: base + 'radiographie' };
    if (k === 'prep') { const hb = S.hardBlockers(id); return hb.length ? { label: 'Régler ' + hb.length + ' bloqueur' + (hb.length > 1 ? 's' : ''), href: base + 'conformite' } : { label: 'Continuer la préparation', href: base + 'prix' }; }
    if (k === 'approval') return { label: 'Revoir et approuver', href: base + 'revue' };
    if (k === 'ready') return S.exportedCurrent(id) ? { label: 'Déposer sur SEAO et enregistrer le reçu', href: base + 'revue' } : { label: 'Exporter le paquet approuvé', href: base + 'revue' };
    if (k === 'submitted') return S.nowTs() >= Date.parse(S.opening(id)) ? { label: 'Enregistrer les résultats d’ouverture', href: base + 'revue' } : { label: 'Attendre l’ouverture du ' + U.dateShort(S.opening(id)), href: base + 'revue' };
    if (k === 'opened') return { label: 'Enregistrer l’issue', href: base + 'revue' };
    if (k === 'missed') return { label: 'Voir pourquoi', href: base + 'revue' };
    return { label: 'Ouvrir le dossier', href: base + 'radiographie' };
  };
  S.progressSteps = (id) => {
    const d = S.D(id), base = '#/dossier/' + id + '/';
    return [
      { k: 'xray', label: 'Radiographie', done: d.xrayOpened && !S.needsAcquisition(id), href: base + 'radiographie' },
      { k: 'decide', label: 'Décision', done: !!d.decision, href: base + 'radiographie' },
      { k: 'price', label: 'Prix', done: S.priceApproved(id) || !!d.receipt, href: base + 'prix' },
      { k: 'shield', label: 'Conformité', done: (S.hardBlockers(id).length === 0 && !S.compliance(id).some((c) => c.id === 'r-bond' && c.status !== 'verified')) || !!d.receipt, href: base + 'conformite' },
      { k: 'forms', label: 'Formulaires', done: (S.fieldStats(id).allVerified && !S.fieldStats(id).refMissing) || !!d.receipt, href: base + 'formulaires' },
      { k: 'approve', label: 'Approbation', done: S.packageApproved(id) || !!d.receipt, href: base + 'revue' },
      { k: 'export', label: 'Export', done: S.exportedCurrent(id) || !!d.receipt, href: base + 'revue' },
      { k: 'receipt', label: 'Reçu officiel', done: !!d.receipt, href: base + 'revue' }
    ];
  };

  /* ---------- tâches ---------- */
  S.tasks = (id) => {
    const def = S.def(id), d = S.D(id);
    return D.taskTemplates.filter((t) => (t.when === 'acquisition' ? def.acquisition : t.when === 'bond' ? (def.bondRate > 0 || def.bondAmount > 0) : true)).map((t) => {
      let done = false;
      switch (t.id) {
        case 't-decide': done = !!d.decision; break;
        case 't-acquire': done = !!d.acquired; break;
        case 't-blockers': done = S.hardBlockers(id).filter((i) => i.fix && /^vault:|^visit|^exp/.test(i.fix)).length === 0; break;
        case 't-price': done = S.priceApproved(id) || !!d.receipt; break;
        case 't-bond': done = d.bond.status === 'issued'; break;
        case 't-fields': done = S.fieldStats(id).allVerified || !!d.receipt; break;
        case 't-sign': done = !!d.declSigned && S.published(id).every((a) => d.ack[a.id]); break;
        case 't-confirm': done = !S.requirements(id).some((r) => r.rule && r.rule.type === 'confirm' && !d.confirmations[r.rule.key]); break;
        case 't-export': done = S.exportedCurrent(id) || !!d.receipt; break;
        case 't-receipt': done = !!d.receipt; break;
      }
      return Object.assign({}, t, { done });
    });
  };
  S.effortLeft = (id) => S.tasks(id).filter((t) => !t.done).reduce((s, t) => s + t.min, 0);

  /* ---------- échéances (calendrier) ---------- */
  S.deadlines = (id) => {
    const def = S.def(id), d = S.D(id), out = [];
    const close = S.close(id);
    const ctx = { tender: id, buyer: def.buyerShort };
    if (def.visit && def.visit.at) out.push(Object.assign({ id: id + ':visit', kind: 'Visite', at: def.visit.at, label: def.visit.mandatory ? 'Visite obligatoire des lieux' : 'Visite facultative', note: (def.visitAssumed ? 'Heure non précisée : fin de journée supposée · ' : '') + def.visit.place, done: !!S.bestDoc('visit', id) || !def.visit.mandatory && S.nowTs() > Date.parse(def.visit.at) }, ctx));
    if (def.questionsDeadline) out.push(Object.assign({ id: id + ':questions', kind: 'Questions', at: def.questionsDeadline, label: 'Date limite des questions', note: (def.questionsAssumed ? 'Heure non précisée : 23 h 59 supposé, à confirmer · ' : '') + (d.questions.length ? d.questions.length + ' question(s) posée(s)' : 'Aucune question posée'), done: S.nowTs() > Date.parse(def.questionsDeadline) }, ctx));
    if (S.hasBond(id)) { const t = new Date(Date.parse(close) - 8 * DAY); t.setUTCHours(16, 0, 0, 0); out.push(Object.assign({ id: id + ':bond', kind: 'Garantie', at: t.toISOString(), label: 'Demande de garantie au courtier (interne)', note: 'Le courtier demande 5 jours ouvrables', done: ['requested', 'issued'].includes(d.bond.status) || !!d.receipt }, ctx)); }
    const ap = new Date(Date.parse(close) - 2 * DAY); ap.setUTCHours(22, 0, 0, 0);
    out.push(Object.assign({ id: id + ':approval', kind: 'Interne', at: ap.toISOString(), label: 'Approbation interne du paquet', note: 'Sylvie Gaudreau', done: S.packageApproved(id) || !!d.receipt }, ctx));
    out.push(Object.assign({ id: id + ':close', kind: 'Clôture', at: close, label: 'Clôture : réception des soumissions', note: S.published(id).some((a) => (a.changes || []).some((c) => c.type === 'close')) ? 'Date modifiée par addenda' : 'Heure de Montréal', done: !!d.receipt }, ctx));
    out.push(Object.assign({ id: id + ':opening', kind: 'Ouverture', at: S.opening(id), label: 'Ouverture publique', note: 'Résultats à enregistrer', done: !!d.results }, ctx));
    return out;
  };
  S.allDeadlines = () => {
    const out = [];
    S.tenders().forEach((t) => { if (S.D(t.id).archived) return; if (S.excluded(t.id) && !S.D(t.id).decision) return; S.deadlines(t.id).forEach((x) => out.push(x)); });
    S.state.vault.filter((v) => !v.removed && !v.revoked).forEach((v) => {
      if (v.expires) out.push({ id: v.id + ':exp', kind: 'Expiration', at: v.expires + 'T23:59:00-05:00', label: 'Fin de validité : ' + v.title, note: 'Coffre-fort', vault: v.id, done: false });
      if (v.annual) out.push({ id: v.id + ':annual', kind: 'Expiration', at: v.annual + 'T17:00:00-05:00', label: 'Mise à jour annuelle AMP', note: 'Coffre-fort', vault: v.id, done: false });
      if (v.checkedAt) out.push({ id: v.id + ':recheck', kind: 'Registre', at: new Date(Date.parse(v.checkedAt) + (v.reviewDays || 14) * DAY).toISOString(), label: 'Revérification : ' + v.title, note: 'Résultat périmé après ' + (v.reviewDays || 14) + ' jours', vault: v.id, done: false });
    });
    return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  };

  /* ---------- dossier mis en avant dans le brief ---------- */
  S.featured = () => {
    const open = S.openDossierIds();
    return open.sort((a, b) => Date.parse(S.close(a)) - Date.parse(S.close(b)))[0] || S.tenders()[0].id;
  };

  /* ---------- balayage de l’horloge : rappels, expirations, échéances, clôtures ---------- */
  S.scan = () => {
    const st = S.state, now = S.nowTs();
    const once = (key, n) => { if (st.fired[key]) return; st.fired[key] = true; notify(n); };
    st.vault.filter((v) => !v.removed && !v.revoked && v.expires).forEach((v) => {
      const exp = S.endOf(v.expires), ver = (v.versions || []).length + 1;
      if (now >= exp - 15 * DAY && now < exp) once('exp-15:' + v.id + ':' + ver, { type: 'expiry', title: 'Rappel : ' + v.title, body: 'Expire le ' + U.date(v.expires + 'T12:00:00-05:00') + '. Rappel texto simulé à Josée (15 jours avant).', href: '#/coffre' });
      if (now >= exp) once('exp:' + v.id + ':' + ver, { type: 'expired', title: v.title + ' expirée', body: 'Expirée le ' + U.date(v.expires + 'T12:00:00-05:00') + '. Les dossiers ouverts qui l’exigent sont bloqués.', href: '#/coffre' });
    });
    st.vault.filter((v) => !v.removed && v.checkedAt).forEach((v) => { if (now - Date.parse(v.checkedAt) > (v.reviewDays || 14) * DAY) once('stale:' + v.id + ':' + v.checkedAt, { type: 'registry', title: 'Vérification périmée : ' + v.title, body: 'Plus de ' + (v.reviewDays || 14) + ' jours depuis la dernière vérification. Revérifiez avant tout dépôt.', href: '#/coffre' }); });
    S.tenders().forEach((t) => {
      const id = t.id, d = S.D(id);
      if (d.archived || (S.excluded(id) && !d.decision)) return;
      S.deadlines(id).forEach((x) => {
        const at = Date.parse(x.at);
        if (x.done) return;
        if (now >= at - 2 * DAY && now < at && ['Visite', 'Questions', 'Clôture', 'Garantie', 'Interne'].includes(x.kind) && S.isOpen(id)) once('due48:' + x.id + ':' + x.at, { type: 'deadline', tender: id, title: 'Dans moins de 48 h : ' + x.label, body: t.buyerShort + ' · ' + U.dayTime(x.at), href: '#/dossier/' + id + '/revue' });
        if (now >= at && x.kind === 'Visite' && t.visit && t.visit.mandatory && S.isOpen(id)) once('visit-passed:' + id, { type: 'deadline', tender: id, title: 'Visite passée : ' + t.buyerShort, body: 'Versez l’attestation de visite, sinon la soumission ne pourra pas être conforme.', href: '#/dossier/' + id + '/conformite' });
      });
      if (!d.receipt && !(d.decision && d.decision.choice === 'decline') && now > Date.parse(S.close(id)) && (d.decision || d.xrayOpened)) once('missed:' + id + ':' + S.close(id), { type: 'missed', tender: id, title: 'Clôture passée sans dépôt : ' + t.buyerShort, body: 'SEAO n’accepte plus de soumission depuis le ' + U.dayTime(S.close(id)) + '.', href: '#/dossier/' + id + '/revue' });
      if (d.receipt && !d.results && now >= Date.parse(S.opening(id))) once('opening:' + id, { type: 'opening', tender: id, title: 'Ouverture publique passée : ' + t.buyerShort, body: 'Enregistrez les résultats lus à l’ouverture (ou simulez leur publication dans le Labo de test).', href: '#/dossier/' + id + '/revue' });
    });
    const day = U.isoDay(S.now());
    const at730 = ['-04:00', '-05:00'].map((o) => Date.parse(day + 'T07:30:00' + o)).find((ts) => U.time(ts).indexOf('7') === 0) || now;
    if (now >= at730 && day !== '2026-10-23') once('brief:' + day, { type: 'brief', title: 'Brief du ' + U.day(S.now()) + ' prêt', body: S.openDossierIds().length + ' dossier(s) ouverts · ' + S.openDossierIds().reduce((s, id) => s + S.hardBlockers(id).length, 0) + ' bloqueur(s) au total.', href: '#/brief' });
  };
  S.unread = () => S.state.inbox.filter((n) => !n.read).length;

  S.load();
})();
