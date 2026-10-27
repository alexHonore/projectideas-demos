/* Tayoo V3 — fictional seed data.
   Everything here is invented for the demo: people, addresses, prices, emails, phone numbers (555 range).
   Demo date: Friday, October 23, 2026, 2:47 PM Eastern. */
(function () {
  'use strict';
  var T = (window.Tayoo = window.Tayoo || {});

  T.DEMO = {
    today: '2026-10-23',
    startClock: 14 * 60 + 47, // 2:47 PM
    tzLabel: 'Eastern Time (EDT until Nov 1)'
  };

  T.BROKER = {
    first: 'Alex',
    name: 'Alex Lavoie',
    initials: 'AL',
    title: 'Residential real estate broker',
    titleFr: 'Courtier immobilier résidentiel',
    agency: 'Courtage Boréal',
    phone: '418-555-0142',
    email: 'alex.lavoie@courtageboreal.example',
    coordinator: 'Maude Girard'
  };

  // Provenance labels (spec TY-03 / investment report "confidence by field")
  T.PROV = {
    verified: { label: 'Verified from source', short: 'Verified', icon: 'check' },
    agent: { label: 'Agent-provided', short: 'You said', icon: 'pen' },
    inferred: { label: 'Inferred', short: 'Inferred', icon: 'spark' },
    conflicting: { label: 'Conflicting', short: 'Conflict', icon: 'alert' },
    unknown: { label: 'Unknown', short: 'Unknown', icon: 'question' }
  };

  function mem(key, label, value, display, prov, source, date) {
    return { key: key, label: label, value: value, display: display, prov: prov, source: source, date: date };
  }

  function clients() {
    return [
      /* ---------- Hero: post-showing ---------- */
      {
        id: 'sarah', stage: 'Active', first: 'Sarah', last: 'Mitchell', role: 'Buyer', area: 'Sillery', lang: 'EN',
        email: 'sarah.mitchell@example.com', phone: '418-555-0117',
        consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-09-12' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-23',
        memory: [
          mem('intent', 'Looking for', 'Condo or townhouse, 2+ bedrooms', 'Condo or townhouse, 2+ bedrooms', 'verified', 'Buyer consultation form', '2026-09-12'),
          mem('budget', 'Budget (max)', 775000, 'C$775,000', 'agent', 'Call note', '2026-10-02'),
          mem('areas', 'Areas', 'Sillery, Montcalm', 'Sillery, Montcalm', 'agent', 'Buyer consultation', '2026-09-12'),
          mem('garage', 'Garage', 'preferred', 'Preferred', 'agent', 'Buyer consultation', '2026-09-12'),
          mem('fees', 'Condo fees (max)', null, 'Not discussed yet', 'unknown', 'No source', null),
          mem('financing', 'Financing', 'Pre-approved (amount not on file)', 'Pre-approved (amount not on file)', 'agent', 'Call note', '2026-10-01'),
          mem('timeline', 'Move by', 'March 2027', 'March 2027', 'agent', 'Buyer consultation', '2026-09-12'),
          mem('likes', 'Liked so far', 'Bright, south-facing rooms', 'Bright, south-facing rooms', 'inferred', 'Two showing notes', '2026-10-09')
        ],
        history: [
          { date: '2026-10-02', field: 'Budget (max)', from: 'C$725,000', to: 'C$775,000', by: 'Alex Lavoie', source: 'Call note' }
        ],
        timeline: [
          { date: '2026-10-23', text: 'Showing at 1280 Avenue du Parc, unit 3 (2:00 PM)', kind: 'meeting' },
          { date: '2026-10-09', text: 'Showing at 1365 Avenue Maguire, unit 7', kind: 'meeting' },
          { date: '2026-10-02', text: 'Call: budget raised to C$775,000', kind: 'call' },
          { date: '2026-09-12', text: 'Buyer consultation; consent to email recorded', kind: 'note' }
        ]
      },
      {
        id: 'louis', stage: 'Active', first: 'Louis', last: 'Bergeron', role: 'Buyer', area: 'Saint-Roch', lang: 'FR',
        email: 'louis.bergeron@example.com', phone: '418-555-0164',
        consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-09-21' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-23',
        memory: [
          mem('intent', 'Looking for', 'Condo, 2 bedrooms', 'Condo, 2 bedrooms', 'verified', 'Buyer consultation form', '2026-09-21'),
          mem('budget', 'Budget (max)', 450000, 'C$450,000', 'agent', 'Buyer consultation', '2026-09-21'),
          mem('areas', 'Areas', 'Saint-Roch, Saint-Sauveur', 'Saint-Roch, Saint-Sauveur', 'agent', 'Buyer consultation', '2026-09-21'),
          mem('parking', 'Parking', 'preferred', 'Preferred', 'agent', 'Buyer consultation', '2026-09-21'),
          mem('fees', 'Condo fees (max)', null, 'Not discussed yet', 'unknown', 'No source', null)
        ],
        history: [],
        timeline: [
          { date: '2026-10-23', text: 'Showing at 455 Rue Saint-Vallier Est, unit 6 (11:00 AM)', kind: 'meeting' },
          { date: '2026-09-21', text: 'Buyer consultation (in French)', kind: 'note' }
        ]
      },
      /* ---------- Recovery queue: eligible (10) ---------- */
      {
        id: 'olivia', stage: 'Active', first: 'Olivia', last: 'Chen', role: 'Buyer', area: 'Montcalm', lang: 'EN',
        email: 'olivia.chen@example.com', phone: '418-555-0181',
        consent: { email: { status: 'express', source: 'Website inquiry form', date: '2026-10-02' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-16',
        memory: [
          mem('intent', 'Looking for', 'Two-bedroom condo with a home office', 'Two-bedroom condo with a home office', 'verified', 'Email from Olivia', '2026-10-16'),
          mem('budget', 'Budget (max)', 650000, 'C$650,000', 'agent', 'Call note', '2026-10-05'),
          mem('areas', 'Areas', 'Montcalm', 'Montcalm', 'verified', 'Website inquiry form', '2026-10-02'),
          mem('garage', 'Garage', null, 'Not discussed yet', 'unknown', 'No source', null)
        ],
        history: [],
        timeline: [{ date: '2026-10-16', text: 'Email: asked for two-bedroom options with an office; you replied “early next week”', kind: 'email' }],
        recovery: {
          kind: 'promise', order: 1,
          reason: 'Asked for two-bedroom options with an office. You promised them “early next week” on Oct 16. Nothing recorded since.',
          evidence: [
            { source: 'Email from Olivia', date: '2026-10-16', quote: 'Could you send me a few two-bedroom options with space for an office?' },
            { source: 'Your reply', date: '2026-10-16', quote: 'I’ll send some early next week.' }
          ],
          line: { EN: 'I owe you those two-bedroom options with room for an office, and I’m sorry it took longer than I said. Are you still focused on Montcalm, around C$650,000?' }
        }
      },
      {
        id: 'samuel', stage: 'Active', first: 'Samuel', last: 'Roy', role: 'Buyer', area: 'Limoilou', lang: 'FR',
        email: 'samuel.roy@example.com', phone: '418-555-0129',
        consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-09-19' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-19',
        memory: [
          mem('intent', 'Looking for', 'Duplex, first purchase', 'Duplex, first purchase', 'verified', 'Buyer consultation form', '2026-09-19'),
          mem('budget', 'Budget (max)', 525000, 'C$525,000', 'agent', 'Call note', '2026-10-19'),
          mem('financing', 'Financing', 'Pre-approval received', 'Pre-approval received', 'agent', 'Call note', '2026-10-19')
        ],
        history: [],
        timeline: [{ date: '2026-10-19', text: 'Call: pre-approval received; wants duplex showings next weekend', kind: 'call' }],
        recovery: {
          kind: 'promise', order: 2,
          reason: 'Pre-approved on Oct 19 and wants to see duplexes next weekend. You promised a list by Wednesday, Oct 21.',
          evidence: [{ source: 'Your call note', date: '2026-10-19', quote: 'Send Samuel a Limoilou duplex list by Wednesday.' }],
          line: { FR: 'Je vous dois toujours la liste de duplex à Limoilou, désolé du retard. Est-ce que vous visez toujours le week-end du 31 octobre pour les visites, avec un budget d’environ 525 000 $ ?' }
        }
      },
      {
        id: 'antoine', stage: 'Lead', first: 'Antoine', last: 'Pelletier', role: 'Seller lead', area: 'Cap-Rouge', lang: 'FR',
        email: 'antoine.pelletier@example.com', phone: '418-555-0153',
        consent: { email: { status: 'implied', source: 'Inquiry call (implied consent, 6 months)', date: '2026-10-08', expires: '2027-04-08' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-08',
        memory: [
          mem('intent', 'Wants', 'Know what his Cap-Rouge home could sell for', 'Know what his Cap-Rouge home could sell for', 'agent', 'Inquiry call', '2026-10-08'),
          mem('condition', 'Condition', null, 'Not assessed. Ask before any evaluation', 'unknown', 'No source', null)
        ],
        history: [],
        timeline: [{ date: '2026-10-08', text: 'Inquiry call: asked for a market evaluation; you said “next week”', kind: 'call' }],
        recovery: {
          kind: 'promise', order: 3,
          reason: 'Asked what his Cap-Rouge home could sell for. You promised a market evaluation “next week” on Oct 8. No evaluation recorded.',
          evidence: [{ source: 'Your call note', date: '2026-10-08', quote: 'CMA for Antoine next week. Needs condition details first.' }],
          line: { FR: 'Je vous avais promis une analyse comparative de marché pour votre maison de Cap-Rouge, et je suis en retard, toutes mes excuses. Pourrions-nous prendre dix minutes cette semaine pour confirmer l’état de la maison et les rénovations récentes ?' }
        }
      },
      {
        id: 'emilie', stage: 'Lead', first: 'Émilie', last: 'Bouchard', role: 'Buyer', area: 'Montcalm', lang: 'FR',
        email: 'emilie.bouchard@example.com', phone: '418-555-0172',
        consent: { email: { status: 'implied', source: 'Email inquiry (implied consent, 6 months)', date: '2026-10-20', expires: '2027-04-20' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-20',
        memory: [mem('intent', 'Looking for', 'Triplex in Montcalm (investor)', 'Triplex in Montcalm (investor)', 'inferred', 'Email inquiry', '2026-10-20')],
        history: [],
        timeline: [{ date: '2026-10-20', text: 'Email: is the Montcalm triplex still available?', kind: 'email' }],
        recovery: {
          kind: 'unanswered', order: 4,
          reason: 'Asked on Oct 20 whether a Montcalm triplex is still available. No reply recorded after 3 days.',
          evidence: [{ source: 'Email from Émilie', date: '2026-10-20', quote: 'Est-ce que le triplex à Montcalm est toujours disponible ?' }],
          line: { FR: 'Merci pour votre message du 20 octobre au sujet du triplex à Montcalm, et désolé pour le délai. Je vérifie sa disponibilité auprès du courtier inscripteur et je vous reviens. Souhaitez-vous aussi recevoir des options semblables ?' }
        }
      },
      {
        id: 'isabelle', stage: 'Active', first: 'Isabelle', last: 'Fortin', role: 'Buyer', area: 'Sainte-Foy', lang: 'FR',
        email: 'isabelle.fortin@example.com', phone: '418-555-0136',
        consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-09-02' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-17',
        memory: [mem('intent', 'Looking for', 'Bungalow in Sainte-Foy', 'Bungalow in Sainte-Foy', 'verified', 'Buyer consultation form', '2026-09-02')],
        history: [],
        timeline: [{ date: '2026-10-17', text: 'Text (logged by you): asked for a second showing of the Sainte-Foy bungalow', kind: 'note' }],
        recovery: {
          kind: 'unanswered', order: 5,
          reason: 'Asked on Oct 17 for a second showing of the Sainte-Foy bungalow. It was never scheduled.',
          evidence: [{ source: 'Text, logged by you', date: '2026-10-17', quote: 'Possible de revoir le bungalow la semaine prochaine ?' }],
          line: { FR: 'Vous m’aviez demandé une deuxième visite du bungalow à Sainte-Foy. Quelles disponibilités auriez-vous la semaine prochaine ? Je m’occupe de la coordonner avec le courtier inscripteur.' }
        }
      },
      {
        id: 'julie', stage: 'Active', first: 'Julie', last: 'Gagnon', role: 'Buyer', area: 'Charlesbourg', lang: 'FR',
        email: 'julie.gagnon@example.com', phone: '418-555-0190',
        consent: { email: { status: 'express', source: 'Open-house sign-in (consent box checked)', date: '2026-10-04' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-04',
        memory: [mem('intent', 'Looking for', 'Family home in Charlesbourg', 'Family home in Charlesbourg', 'agent', 'Open house conversation', '2026-10-04')],
        history: [],
        timeline: [{ date: '2026-10-04', text: 'Open house: “call me after Thanksgiving”', kind: 'meeting' }],
        recovery: {
          kind: 'promise', order: 6,
          reason: 'At the Oct 4 open house she asked you to call after Thanksgiving (Oct 12). No contact since.',
          evidence: [{ source: 'Your open-house note', date: '2026-10-04', quote: 'Julie: rappeler après l’Action de grâce.' }],
          line: { FR: 'À la visite libre du 4 octobre, vous m’aviez demandé de vous relancer après l’Action de grâce. Est-ce un bon moment pour reparler de votre projet à Charlesbourg ?' }
        }
      },
      {
        id: 'raj', stage: 'Active', first: 'Raj', last: 'Patel', role: 'Buyer', area: 'Sillery', lang: 'EN',
        email: 'raj.patel@example.com', phone: '418-555-0147',
        consent: { email: { status: 'express', source: 'Website inquiry form', date: '2026-09-28' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-13',
        memory: [mem('intent', 'Looking for', 'Home within a short commute of Université Laval', 'Home within a short commute of Université Laval', 'verified', 'Email from Raj', '2026-10-13')],
        history: [],
        timeline: [{ date: '2026-10-13', text: 'Email: asked about commuting from Sillery to Université Laval', kind: 'email' }],
        recovery: {
          kind: 'unanswered', order: 7,
          reason: 'Asked on Oct 13 about commuting from Sillery to Université Laval. No reply recorded after 10 days.',
          evidence: [{ source: 'Email from Raj', date: '2026-10-13', quote: 'How long is the commute from Sillery to Université Laval?' }],
          line: { EN: 'You asked about getting from Sillery to Université Laval, and I’m sorry I didn’t get back to you sooner. Would a quick call this week work to go over the neighbourhoods that fit your commute?' }
        }
      },
      {
        id: 'chloe', stage: 'Active', first: 'Chloé', last: 'Martin', role: 'Buyer', area: 'Saint-Sauveur', lang: 'EN',
        email: 'chloe.martin@example.com', phone: '418-555-0108',
        consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-09-15' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-01',
        memory: [mem('timeline', 'Lease ends', 'January 31, 2027', 'January 31, 2027', 'agent', 'Call note', '2026-10-01')],
        history: [],
        timeline: [{ date: '2026-10-01', text: 'Call: lease ends Jan 31', kind: 'call' }],
        recovery: {
          kind: 'dormant', order: 8,
          reason: 'Her lease ends January 31 (she told you Oct 1). No contact in 22 days.',
          evidence: [{ source: 'Your call note', date: '2026-10-01', quote: 'Lease ends Jan 31. Wants to start visits in November.' }],
          line: { EN: 'With your lease ending on January 31, I wanted to check in. Would it help to line up a few showings in November, like you mentioned?' }
        }
      },
      {
        id: 'david', stage: 'Active', first: 'David', last: 'Okafor', role: 'Buyer', area: 'Sainte-Foy', lang: 'EN',
        email: 'david.okafor@example.com', phone: '418-555-0195',
        consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-08-27' }, sms: { status: 'not-configured' } },
        lastContact: '2026-09-25',
        memory: [mem('search', 'Saved search', 'Sainte-Foy bungalows under C$600,000', 'Sainte-Foy bungalows under C$600,000', 'verified', 'Saved search', '2026-08-27')],
        history: [],
        timeline: [{ date: '2026-09-25', text: 'Call: still looking, no rush', kind: 'call' }],
        recovery: {
          kind: 'dormant', order: 9,
          reason: 'Active buyer with a saved search for Sainte-Foy bungalows under C$600,000. No contact in 28 days.',
          evidence: [{ source: 'Your call note', date: '2026-09-25', quote: 'Still looking, no rush. Check in mid-October.' }],
          line: { EN: 'You asked me to check in around mid-October. Are you still looking for a bungalow in Sainte-Foy under C$600,000? If timing, budget or area has changed, I’ll adjust your search.' }
        }
      },
      {
        id: 'kevin', stage: 'Nurture', first: 'Kevin', last: 'Nguyen', role: 'Buyer', area: 'Lévis', lang: 'EN',
        email: 'kevin.nguyen@example.com', phone: '418-555-0111',
        consent: { email: { status: 'express', source: 'Newsletter sign-up', date: '2026-03-03' }, sms: { status: 'not-configured' } },
        lastContact: '2026-09-18',
        memory: [mem('intent', 'Looking for', 'Townhouse in Lévis', 'Townhouse in Lévis', 'agent', 'Call note', '2026-09-18')],
        history: [],
        timeline: [{ date: '2026-09-18', text: 'Call: thinking about Lévis next year', kind: 'call' }],
        recovery: {
          kind: 'dormant', order: 10,
          reason: 'No contact in 35 days. Opened three listing emails this week (a weak signal on its own).',
          evidence: [{ source: 'Your call note', date: '2026-09-18', quote: 'Kevin: maybe Lévis next year.' }, { source: 'Email opens (weak signal)', date: '2026-10-21', quote: '3 opens of listing emails' }],
          line: { EN: 'It’s been a while since we talked about Lévis. Are you still thinking about a townhouse there? Happy to set up a short call whenever it suits you.' }
        }
      },
      /* ---------- Recovery queue: consent review (2) ---------- */
      {
        id: 'thomas', stage: 'Lead', first: 'Thomas', last: 'Wilson', role: 'Buyer', area: 'Sillery', lang: 'EN',
        email: 'thomas.wilson@example.com', phone: '418-555-0123',
        consent: { email: { status: 'unknown', source: 'Imported from an open-house sign-in sheet, with no consent evidence', date: '2026-10-04' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-04',
        memory: [mem('intent', 'Looking for', 'Detached home', 'Detached home', 'inferred', 'Sign-in sheet note', '2026-10-04')],
        history: [],
        timeline: [{ date: '2026-10-04', text: 'Signed in at the Sillery open house', kind: 'meeting' }],
        recovery: { kind: 'dormant', order: 11, reason: 'Signed in at the Oct 4 open house and asked about detached homes. Never contacted.', evidence: [{ source: 'Sign-in sheet (import)', date: '2026-10-04', quote: 'Interested in detached, Sillery' }] }
      },
      {
        id: 'nadia', stage: 'Lead', first: 'Nadia', last: 'Benali', role: 'Buyer', area: 'Vieux-Québec', lang: 'FR',
        email: 'nadia.benali@example.com', phone: '418-555-0168',
        consent: { email: { status: 'unknown', source: 'Referral from a colleague, with no communication permission recorded', date: '2026-10-09' }, sms: { status: 'not-configured' } },
        lastContact: null,
        memory: [mem('intent', 'Looking for', 'Condo in Vieux-Québec', 'Condo in Vieux-Québec', 'inferred', 'Colleague referral', '2026-10-09')],
        history: [],
        timeline: [{ date: '2026-10-09', text: 'Referred by a colleague', kind: 'note' }],
        recovery: { kind: 'unanswered', order: 12, reason: 'Referred on Oct 9 for a condo in Vieux-Québec. Never contacted.', evidence: [{ source: 'Referral note', date: '2026-10-09', quote: 'Nadia cherche un condo dans le Vieux.' }] }
      },
      /* ---------- Recovery queue: opted out (2) ---------- */
      {
        id: 'sophie', stage: 'Nurture', first: 'Sophie', last: 'Laurent', role: 'Seller', area: 'Cap-Rouge', lang: 'FR',
        email: 'sophie.laurent@example.com', phone: '418-555-0185',
        consent: { email: { status: 'opted-out', source: 'Unsubscribed with the newsletter link', date: '2026-10-10' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-10',
        memory: [mem('intent', 'Considering', 'Selling next spring', 'Selling next spring', 'agent', 'Call note', '2026-09-30')],
        history: [],
        timeline: [{ date: '2026-10-10', text: 'Unsubscribed from commercial emails', kind: 'consent' }],
        recovery: { kind: 'dormant', order: 13, reason: 'Considering a sale next spring. No contact since Oct 10.', evidence: [{ source: 'Unsubscribe', date: '2026-10-10', quote: 'Newsletter unsubscribe link' }] }
      },
      {
        id: 'mathieu', stage: 'Nurture', first: 'Mathieu', last: 'Lévesque', role: 'Buyer', area: 'Beauport', lang: 'FR',
        email: 'mathieu.levesque@example.com', phone: '418-555-0102',
        consent: { email: { status: 'opted-out', source: 'Asked by phone not to receive commercial messages (recorded by you)', date: '2026-09-30' }, sms: { status: 'not-configured' } },
        lastContact: '2026-09-30',
        memory: [mem('intent', 'Looking for', 'Bungalow in Beauport', 'Bungalow in Beauport', 'agent', 'Call note', '2026-09-12')],
        history: [],
        timeline: [{ date: '2026-09-30', text: 'Asked not to receive commercial messages', kind: 'consent' }],
        recovery: { kind: 'dormant', order: 14, reason: 'Looking in Beauport. No contact since Sep 30.', evidence: [{ source: 'Your call note', date: '2026-09-30', quote: 'Ne plus lui envoyer de courriels promotionnels.' }] }
      },
      /* ---------- Covered relationships ---------- */
      {
        id: 'sarahc', stage: 'Listed', first: 'Sarah', last: 'Côté', role: 'Seller', area: 'Charlesbourg', lang: 'FR',
        email: 'sarah.cote@example.com', phone: '418-555-0114',
        consent: { email: { status: 'express', source: 'Listing agreement', date: '2026-09-08' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-21',
        memory: [mem('intent', 'Selling', 'Semi-detached home, Charlesbourg', 'Semi-detached home, Charlesbourg', 'verified', 'Listing agreement', '2026-09-08')],
        history: [], timeline: [{ date: '2026-10-21', text: 'Call: wants a monthly sales update', kind: 'call' }]
      },
      {
        id: 'marc', stage: 'Under contract', first: 'Marc', last: 'Tremblay', role: 'Seller', area: 'Sainte-Foy', lang: 'FR',
        email: 'marc.tremblay@example.com', phone: '418-555-0131',
        consent: { email: { status: 'express', source: 'Listing agreement', date: '2026-08-18' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-21',
        memory: [
          mem('intent', 'Selling', '2875 Rue Lapointe, Sainte-Foy (under contract)', '2875 Rue Lapointe, Sainte-Foy (under contract)', 'verified', 'Promise to Purchase', '2026-10-09'),
          mem('style', 'Prefers', 'Short updates by email, in French', 'Short updates by email, in French', 'agent', 'Call note', '2026-08-18'),
          mem('move', 'Moving to', 'Montréal (Rosemont), job starts in January', 'Montréal (Rosemont), job starts in January', 'agent', 'Call note', '2026-08-18')
        ],
        history: [], timeline: [{ date: '2026-10-21', text: 'Call: asked about the financing condition', kind: 'call' }]
      },
      {
        id: 'emma', stage: 'Active', first: 'Emma', last: 'Gagnon', role: 'Buyer', area: 'Montcalm', lang: 'EN',
        email: 'emma.gagnon@example.com', phone: '418-555-0159',
        consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-07-30' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-21',
        memory: [mem('intent', 'Looking for', 'Condo in Montcalm, near Avenue Cartier', 'Condo in Montcalm, near Avenue Cartier', 'verified', 'Buyer consultation form', '2026-07-30')],
        history: [], timeline: [{ date: '2026-10-21', text: 'Showing booked after recovery follow-up (confirmed by you)', kind: 'meeting' }, { date: '2026-10-14', text: 'Replied to your Oct 13 follow-up', kind: 'email' }]
      },
      {
        id: 'philippe', stage: 'Active', first: 'Philippe', last: 'Ouellet', role: 'Buyer', area: 'Limoilou', lang: 'FR',
        email: 'philippe.ouellet@example.com', phone: '418-555-0176',
        consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-06-11' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-15',
        memory: [mem('financing', 'Financing', 'Meeting his lender in early November', 'Meeting his lender in early November', 'agent', 'Email from Philippe', '2026-10-15')],
        history: [], timeline: [{ date: '2026-10-15', text: 'Replied to your Oct 13 follow-up', kind: 'email' }]
      },
      { id: 'camille', stage: 'Pre-listing', first: 'Camille', last: 'Dubé', role: 'Seller', area: 'Lévis', lang: 'FR', email: 'camille.dube@example.com', phone: '418-555-0143', consent: { email: { status: 'express', source: 'Seller inquiry form', date: '2026-10-11' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-19', memory: [mem('intent', 'Selling', 'Cottage in Lévis, spring listing', 'Cottage in Lévis, spring listing', 'agent', 'Call note', '2026-10-19')], history: [], timeline: [] },
      { id: 'hugo', stage: 'Listed', first: 'Hugo', last: 'Lefebvre', role: 'Seller', area: 'Sillery', lang: 'EN', email: 'hugo.lefebvre@example.com', phone: '418-555-0188', consent: { email: { status: 'express', source: 'Listing agreement', date: '2026-09-29' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-22', memory: [mem('intent', 'Selling', '2160 Chemin Saint-Louis, Sillery (listed C$869,000)', '2160 Chemin Saint-Louis, Sillery (listed C$869,000)', 'verified', 'Listing agreement', '2026-09-29')], history: [], timeline: [] },
      { id: 'lea', stage: 'Active', first: 'Léa', last: 'Morin', role: 'Buyer', area: 'Charlesbourg', lang: 'FR', email: 'lea.morin@example.com', phone: '418-555-0120', consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-09-09' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-20', memory: [], history: [], timeline: [] },
      { id: 'vincent', stage: 'Pre-listing', first: 'Vincent', last: 'Girard', role: 'Seller', area: 'Beauport', lang: 'FR', email: 'vincent.girard@example.com', phone: '418-555-0137', consent: { email: { status: 'express', source: 'Listing agreement', date: '2026-10-01' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-21', memory: [], history: [], timeline: [] },
      { id: 'annie', stage: 'Active', first: 'Annie', last: 'Thibault', role: 'Buyer', area: 'Lévis', lang: 'FR', email: 'annie.thibault@example.com', phone: '418-555-0161', consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-08-14' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-20', memory: [], history: [], timeline: [] },
      { id: 'gabriel', stage: 'Under contract', first: 'Gabriel', last: 'Simard', role: 'Buyer', area: 'Saint-Sauveur', lang: 'FR', email: 'gabriel.simard@example.com', phone: '418-555-0198', consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-08-20' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-19', memory: [], history: [], timeline: [] },
      { id: 'marieeve', stage: 'Listed', first: 'Marie-Ève', last: 'Poulin', role: 'Seller', area: 'Sillery', lang: 'FR', email: 'marieeve.poulin@example.com', phone: '418-555-0105', consent: { email: { status: 'express', source: 'Listing agreement', date: '2026-10-06' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-22', memory: [], history: [], timeline: [] },
      { id: 'jonathan', stage: 'Active', first: 'Jonathan', last: 'Lee', role: 'Buyer', area: 'Sainte-Foy', lang: 'EN', email: 'jonathan.lee@example.com', phone: '418-555-0126', consent: { email: { status: 'express', source: 'Website inquiry form', date: '2026-09-03' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-20', memory: [], history: [], timeline: [] },
      { id: 'sofia', stage: 'Active', first: 'Sofia', last: 'Rossi', role: 'Buyer', area: 'Vieux-Québec', lang: 'EN', email: 'sofia.rossi@example.com', phone: '418-555-0150', consent: { email: { status: 'express', source: 'Buyer consultation form', date: '2026-09-24' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-22', memory: [], history: [], timeline: [] },
      { id: 'benoit', stage: 'Listed', first: 'Benoît', last: 'Gauthier', role: 'Seller', area: 'Charlesbourg', lang: 'FR', email: 'benoit.gauthier@example.com', phone: '418-555-0134', consent: { email: { status: 'express', source: 'Listing agreement', date: '2026-10-13' }, sms: { status: 'not-configured' } }, lastContact: '2026-10-21', memory: [], history: [], timeline: [] },
      {
        id: 'yannick', stage: 'Lead', first: 'Yannick', last: 'Paré', role: 'Buyer', area: 'Beauport', lang: 'FR',
        email: 'yannick.pare@example.com', phone: '418-555-0177',
        consent: { email: { status: 'implied', source: 'Inquiry form (implied consent, 6 months)', date: '2026-04-30', expires: '2026-10-30' }, sms: { status: 'not-configured' } },
        lastContact: '2026-10-15',
        memory: [mem('intent', 'Looking for', 'Duplex in Beauport or Limoilou to live in one unit', 'Duplex in Beauport or Limoilou to live in one unit', 'agent', 'Call note', '2026-10-15'), mem('budget', 'Budget (max)', 560000, 'C$560,000', 'agent', 'Call note', '2026-10-15')],
        history: [], timeline: [{ date: '2026-10-15', text: 'Call: wants duplex comparables', kind: 'call' }]
      },
      {
        id: 'helene', stage: 'Closed', first: 'Hélène', last: 'Bisson', role: 'Seller', area: 'Montcalm', lang: 'FR',
        email: 'helene.bisson@example.com', phone: '418-555-0119',
        consent: { email: { status: 'express', source: 'Listing agreement', date: '2026-06-02' }, sms: { status: 'not-configured' } },
        lastContact: '2026-09-25',
        memory: [mem('intent', 'Sold', '760 Avenue De Bourlamaque, Montcalm (closed Sep 25)', '760 Avenue De Bourlamaque, Montcalm (closed Sep 25)', 'verified', 'Deed of sale', '2026-09-25')],
        history: [], timeline: [{ date: '2026-09-25', text: 'Deed of sale signed; file closed', kind: 'meeting' }]
      }
    ];
  }

  /* Authorized listing data: a fictional "authorized export" imported Oct 22, 2026.
     The QPAREB/Centris feed is NOT connected in this demo (spec TY-12). */
  T.LISTINGS_SOURCE = { label: 'Authorized listing export (demo CSV)', imported: '2026-10-22', records: 12 };
  T.LISTINGS = [
    { id: 'DEMO-4402', address: '1280 Avenue du Parc, unit 3', area: 'Sillery', type: 'Condo', price: 749000, fees: 410, garage: 'yes', beds: 2, built: 2015, size: 1120 },
    { id: 'DEMO-4471', address: '1755 Chemin du Foulon, unit 4', area: 'Sillery', type: 'Condo', price: 789000, fees: 298, garage: 'yes', beds: 2, built: 2018, size: 1240 },
    { id: 'DEMO-4486', address: '1046 Avenue Moncton', area: 'Montcalm', type: 'Townhouse', price: 815000, fees: 165, garage: 'yes', beds: 3, built: 2009, size: 1380 },
    { id: 'DEMO-4490', address: '1220 Avenue Maguire, unit 2', area: 'Sillery', type: 'Condo', price: 699000, fees: 340, garage: 'unknown', beds: 2, built: 2012, size: 1050 },
    { id: 'DEMO-4493', address: '905 Avenue Holland, unit 1', area: 'Montcalm', type: 'Condo', price: 735000, fees: 395, garage: 'yes', beds: 2, built: 2016, size: 1090 },
    { id: 'DEMO-4501', address: '1365 Avenue Maguire, unit 7', area: 'Sillery', type: 'Condo', price: 812000, fees: 330, garage: 'no', beds: 2, built: 2019, size: 1160 },
    { id: 'DEMO-4388', address: '2160 Chemin Saint-Louis', area: 'Sillery', type: 'Detached', price: 869000, fees: 0, garage: 'yes', beds: 4, built: 2012, size: 2240 },
    { id: 'DEMO-5110', address: '455 Rue Saint-Vallier Est, unit 6', area: 'Saint-Roch', type: 'Condo', price: 459000, fees: 385, garage: 'no', beds: 2, built: 2014, size: 980 },
    { id: 'DEMO-5124', address: '710 Rue de la Couronne, unit 5', area: 'Saint-Roch', type: 'Condo', price: 469000, fees: 290, garage: 'yes', beds: 2, built: 2017, size: 1010 },
    { id: 'DEMO-5131', address: '385 Boulevard Charest Est, unit 9', area: 'Saint-Roch', type: 'Condo', price: 449000, fees: 310, garage: 'yes', beds: 2, built: 2013, size: 960 },
    { id: 'DEMO-5140', address: '250 Rue du Roi, unit 3', area: 'Saint-Roch', type: 'Condo', price: 489000, fees: 270, garage: 'yes', beds: 2, built: 2020, size: 1040 },
    { id: 'DEMO-5152', address: '620 Rue Saint-Joseph Est, unit 2', area: 'Saint-Roch', type: 'Condo', price: 439000, fees: 255, garage: 'unknown', beds: 2, built: 2011, size: 940 },
    { id: 'DEMO-5203', address: '1450 3e Avenue', area: 'Limoilou', type: 'Duplex', price: 519000, fees: 0, garage: 'no', beds: 4, built: 1948, size: 1960 },
    { id: 'DEMO-5207', address: '1855 4e Avenue', area: 'Limoilou', type: 'Duplex', price: 545000, fees: 0, garage: 'no', beds: 5, built: 1952, size: 2140 },
    { id: 'DEMO-5215', address: '2280 1re Avenue, unit 3', area: 'Limoilou', type: 'Condo', price: 429000, fees: 240, garage: 'no', beds: 2, built: 2015, size: 980 },
    { id: 'DEMO-5311', address: '1290 Rue Einstein', area: 'Sainte-Foy', type: 'Bungalow', price: 579000, fees: 0, garage: 'yes', beds: 3, built: 1972, size: 1180 },
    { id: 'DEMO-5318', address: '3045 Chemin Sainte-Foy', area: 'Sainte-Foy', type: 'Bungalow', price: 612000, fees: 0, garage: 'no', beds: 3, built: 1968, size: 1250 },
    { id: 'DEMO-5402', address: '14 Rue des Grisons', area: 'Lévis', type: 'Townhouse', price: 389000, fees: 120, garage: 'yes', beds: 3, built: 2011, size: 1320 },
    { id: 'DEMO-5410', address: '8120 1re Avenue', area: 'Charlesbourg', type: 'Semi-detached', price: 469000, fees: 0, garage: 'yes', beds: 3, built: 1995, size: 1410 },
    { id: 'DEMO-5502', address: '4460 Rue Saint-Félix', area: 'Cap-Rouge', type: 'Detached', price: 735000, fees: 0, garage: 'yes', beds: 4, built: 1989, size: 2050 },
    { id: 'DEMO-5601', address: '950 Avenue Murray', area: 'Montcalm', type: 'Triplex', price: 1095000, fees: 0, garage: 'no', beds: 6, built: 1928, size: 3100 },
    { id: 'DEMO-5705', address: '12 Rue Sainte-Ursule, unit 3', area: 'Vieux-Québec', type: 'Condo', price: 559000, fees: 410, garage: 'no', beds: 1, built: 1890, size: 820 }
  ];
  T.LISTINGS_SOURCE.records = T.LISTINGS.length;

  /* Authorized sold-data export (demo CSV, imported Oct 22, 2026): comparables for the CMA studio. */
  T.SOLD_SOURCE = { label: 'Authorized sold-data export (demo CSV)', imported: '2026-10-22' };
  T.SOLD = [
    { id: 'SOLD-101', address: '1300 Avenue du Parc, unit 1', area: 'Sillery', type: 'Condo', beds: 2, size: 1080, garage: 'yes', built: 2014, sold: '2026-09-18', price: 712000, condition: 'good' },
    { id: 'SOLD-102', address: '1745 Chemin du Foulon, unit 2', area: 'Sillery', type: 'Condo', beds: 2, size: 1210, garage: 'yes', built: 2017, sold: '2026-07-30', price: 768000, condition: 'good' },
    { id: 'SOLD-103', address: '1240 Avenue Maguire, unit 5', area: 'Sillery', type: 'Condo', beds: 2, size: 1020, garage: 'no', built: 2010, sold: '2026-06-12', price: 618000, condition: 'average' },
    { id: 'SOLD-104', address: '1390 Avenue Maguire, unit 3', area: 'Sillery', type: 'Condo', beds: 3, size: 1330, garage: 'yes', built: 2019, sold: '2026-08-21', price: 865000, condition: 'good' },
    { id: 'SOLD-111', address: '1020 Avenue Moncton', area: 'Montcalm', type: 'Townhouse', beds: 3, size: 1350, garage: 'yes', built: 2008, sold: '2026-05-29', price: 789000, condition: 'good' },
    { id: 'SOLD-112', address: '880 Avenue Holland, unit 4', area: 'Montcalm', type: 'Condo', beds: 2, size: 1060, garage: 'yes', built: 2015, sold: '2026-09-04', price: 701000, condition: 'unknown' },
    { id: 'SOLD-113', address: '965 Avenue Murray', area: 'Montcalm', type: 'Triplex', beds: 6, size: 3050, garage: 'no', built: 1931, sold: '2026-04-17', price: 1040000, condition: 'average' },
    { id: 'SOLD-121', address: '480 Rue Saint-Vallier Est, unit 2', area: 'Saint-Roch', type: 'Condo', beds: 2, size: 1000, garage: 'no', built: 2013, sold: '2026-08-07', price: 452000, condition: 'average' },
    { id: 'SOLD-122', address: '700 Rue de la Couronne, unit 8', area: 'Saint-Roch', type: 'Condo', beds: 2, size: 990, garage: 'yes', built: 2016, sold: '2026-09-25', price: 474000, condition: 'good' },
    { id: 'SOLD-123', address: '360 Boulevard Charest Est, unit 4', area: 'Saint-Roch', type: 'Condo', beds: 2, size: 950, garage: 'yes', built: 2012, sold: '2026-06-26', price: 438000, condition: 'average' },
    { id: 'SOLD-124', address: '275 Rue du Roi, unit 6', area: 'Saint-Roch', type: 'Condo', beds: 1, size: 720, garage: 'no', built: 2018, sold: '2026-07-15', price: 339000, condition: 'good' },
    { id: 'SOLD-131', address: '1420 3e Avenue', area: 'Limoilou', type: 'Duplex', beds: 4, size: 1900, garage: 'no', built: 1946, sold: '2026-08-28', price: 498000, condition: 'average' },
    { id: 'SOLD-132', address: '1880 4e Avenue', area: 'Limoilou', type: 'Duplex', beds: 5, size: 2180, garage: 'no', built: 1950, sold: '2026-06-05', price: 552000, condition: 'good' },
    { id: 'SOLD-133', address: '1610 8e Avenue', area: 'Limoilou', type: 'Duplex', beds: 4, size: 1840, garage: 'yes', built: 1955, sold: '2026-09-30', price: 531000, condition: 'renovated' },
    { id: 'SOLD-141', address: '1310 Rue Einstein', area: 'Sainte-Foy', type: 'Bungalow', beds: 3, size: 1160, garage: 'yes', built: 1970, sold: '2026-07-09', price: 566000, condition: 'good' },
    { id: 'SOLD-142', address: '3010 Chemin Sainte-Foy', area: 'Sainte-Foy', type: 'Bungalow', beds: 3, size: 1220, garage: 'no', built: 1966, sold: '2026-05-22', price: 579000, condition: 'average' },
    { id: 'SOLD-143', address: '2840 Rue Lapointe', area: 'Sainte-Foy', type: 'Bungalow', beds: 4, size: 1380, garage: 'yes', built: 1974, sold: '2026-09-11', price: 655000, condition: 'good' },
    { id: 'SOLD-151', address: '4410 Rue Saint-Félix', area: 'Cap-Rouge', type: 'Detached', beds: 4, size: 2010, garage: 'yes', built: 1987, sold: '2026-08-14', price: 712000, condition: 'good' },
    { id: 'SOLD-152', address: '4520 Rue Saint-Félix', area: 'Cap-Rouge', type: 'Detached', beds: 3, size: 1780, garage: 'yes', built: 1992, sold: '2026-06-19', price: 648000, condition: 'average' },
    { id: 'SOLD-153', address: '1150 Rue de la Seigneurie', area: 'Cap-Rouge', type: 'Detached', beds: 4, size: 2240, garage: 'yes', built: 1984, sold: '2026-04-24', price: 739000, condition: 'needs work' },
    { id: 'SOLD-161', address: '8090 1re Avenue', area: 'Charlesbourg', type: 'Semi-detached', beds: 3, size: 1390, garage: 'yes', built: 1994, sold: '2026-07-23', price: 452000, condition: 'average' },
    { id: 'SOLD-162', address: '8215 1re Avenue', area: 'Charlesbourg', type: 'Semi-detached', beds: 3, size: 1450, garage: 'no', built: 1997, sold: '2026-09-08', price: 461000, condition: 'good' },
    { id: 'SOLD-171', address: '22 Rue des Grisons', area: 'Lévis', type: 'Townhouse', beds: 3, size: 1300, garage: 'yes', built: 2010, sold: '2026-08-03', price: 376000, condition: 'good' },
    { id: 'SOLD-172', address: '9 Rue des Grisons', area: 'Lévis', type: 'Townhouse', beds: 3, size: 1280, garage: 'yes', built: 2012, sold: '2026-05-15', price: 365000, condition: 'unknown' },
    { id: 'SOLD-181', address: '2110 Chemin Saint-Louis', area: 'Sillery', type: 'Detached', beds: 4, size: 2180, garage: 'yes', built: 2010, sold: '2026-07-02', price: 842000, condition: 'good' },
    { id: 'SOLD-182', address: '2245 Chemin Saint-Louis', area: 'Sillery', type: 'Detached', beds: 4, size: 2320, garage: 'yes', built: 2014, sold: '2026-09-22', price: 905000, condition: 'renovated' },
    { id: 'SOLD-183', address: '2080 Chemin Saint-Louis', area: 'Sillery', type: 'Detached', beds: 3, size: 1960, garage: 'yes', built: 2006, sold: '2026-05-08', price: 768000, condition: 'average' }
  ];

  /* Neighbourhood grid (km, rough) used for travel estimates between appointments. */
  T.AREAS = {
    'Vieux-Québec': [0, 0], 'Saint-Roch': [-0.8, -0.9], 'Saint-Sauveur': [-2.0, -1.1], 'Limoilou': [-0.5, -2.6], 'Montcalm': [-1.6, 0.6],
    'Sillery': [-4.8, 1.6], 'Sainte-Foy': [-6.5, 0.2], 'Cap-Rouge': [-11, 1.5], 'Charlesbourg': [0.5, -7], 'Beauport': [3.5, -5], 'Lévis': [1.5, 3.5]
  };
  T.AREA_NEAR = {
    'Sillery': ['Montcalm', 'Sainte-Foy'], 'Montcalm': ['Sillery', 'Saint-Sauveur', 'Vieux-Québec'], 'Sainte-Foy': ['Sillery', 'Cap-Rouge'], 'Cap-Rouge': ['Sainte-Foy'],
    'Saint-Roch': ['Saint-Sauveur', 'Limoilou', 'Vieux-Québec'], 'Saint-Sauveur': ['Saint-Roch', 'Montcalm'], 'Limoilou': ['Saint-Roch', 'Charlesbourg', 'Beauport'],
    'Vieux-Québec': ['Saint-Roch', 'Montcalm'], 'Charlesbourg': ['Limoilou', 'Beauport'], 'Beauport': ['Charlesbourg', 'Limoilou'], 'Lévis': []
  };

  // Street index used by the parser to resolve spoken addresses
  T.PLACES = [
    { id: 'DEMO-4402', number: '1280', street: 'parc', label: '1280 Avenue du Parc, unit 3' },
    { id: 'DEMO-5110', number: '455', street: 'saint-vallier', label: '455 Rue Saint-Vallier Est, unit 6' },
    { id: 'DEMO-4471', number: '1755', street: 'foulon', label: '1755 Chemin du Foulon, unit 4' },
    { id: 'DEMO-4486', number: '1046', street: 'moncton', label: '1046 Avenue Moncton' },
    { id: 'DEMO-4388', number: '2160', street: 'saint-louis', label: '2160 Chemin Saint-Louis' },
    { id: 'tremblay', number: '2875', street: 'lapointe', label: '2875 Rue Lapointe' }
  ];

  function appointments() {
    return [
      { id: 'a1', area: 'Saint-Roch', status: 'scheduled', date: '2026-10-23', start: '09:30', end: '10:00', title: 'Team check-in', who: 'Maude Girard (coordinator)', place: 'Courtage Boréal office, Saint-Roch', kind: 'internal' },
      { id: 'a2', area: 'Saint-Roch', status: 'scheduled', date: '2026-10-23', start: '11:00', end: '11:40', title: 'Showing', client: 'louis', place: '455 Rue Saint-Vallier Est, unit 6', listing: 'DEMO-5110', kind: 'showing' },
      { id: 'a3', area: 'Sillery', status: 'scheduled', date: '2026-10-23', start: '14:00', end: '14:45', title: 'Showing', client: 'sarah', place: '1280 Avenue du Parc, unit 3', listing: 'DEMO-4402', kind: 'showing' },
      { id: 'a4', area: '', status: 'scheduled', date: '2026-10-23', start: '16:30', end: '16:50', title: 'Call: financing update', client: 'marc', place: 'Phone', kind: 'call', tx: 'tx-tremblay' },
      { id: 'a5', area: 'Lévis', status: 'scheduled', date: '2026-10-23', start: '18:00', end: '19:00', title: 'Listing presentation', client: 'camille', place: 'Rue Saint-Laurent, Lévis', kind: 'meeting', tx: null },
      { id: 'a6', area: 'Sillery', status: 'scheduled', date: '2026-10-24', start: '10:00', end: '12:00', title: 'Open house', client: 'hugo', place: '2160 Chemin Saint-Louis', kind: 'open-house' },
      { id: 'a7', area: 'Sillery', status: 'scheduled', date: '2026-10-27', start: '10:00', end: '11:00', title: 'Photographer visit', client: 'marieeve', place: 'Sillery', kind: 'meeting' },
      { id: 'a8', area: 'Beauport', status: 'scheduled', date: '2026-10-29', start: '13:30', end: '14:30', title: 'Pricing review', client: 'vincent', place: 'Beauport', kind: 'meeting' },
      { id: 'a10', area: 'Lévis', status: 'scheduled', date: '2026-10-27', start: '09:00', end: '11:00', title: 'Inspection: Thibault purchase', client: 'annie', place: '27 Rue Fraser, Lévis', kind: 'meeting', tx: 'tx-thibault', ref: 'insp' },
      { id: 'a9', area: 'Saint-Roch', status: 'scheduled', date: '2026-11-19', start: '10:00', end: '11:00', title: 'Deed of sale: Simard purchase', client: 'gabriel', place: 'Notary office, Rue Saint-Joseph Est', kind: 'deed', tx: 'tx-simard', ref: 'deed' }
    ];
  }

  function tasks() {
    return [
      { id: 't-olivia', client: 'olivia', title: 'Send Olivia two-bedroom options with an office', due: '2026-10-20T09:00', owner: 'Alex Lavoie', source: 'Your email reply, Oct 16', status: 'open' },
      { id: 't-samuel', client: 'samuel', title: 'Send Samuel a Limoilou duplex list', due: '2026-10-21T17:00', owner: 'Alex Lavoie', source: 'Call note, Oct 19', status: 'open' },
      { id: 't-antoine', client: 'antoine', title: 'Prepare a market evaluation for Antoine (Cap-Rouge)', due: '2026-10-16T17:00', owner: 'Alex Lavoie', source: 'Call note, Oct 8', status: 'open' },
      { id: 't-marc', client: 'marc', title: 'Confirm financing status with the buyers’ broker', due: '2026-10-23T17:00', owner: 'Alex Lavoie', source: 'Call note, Oct 14', status: 'open' },
      { id: 't-hugo', client: 'hugo', title: 'Print open-house sign-in sheets (with consent box)', due: '2026-10-24T09:30', owner: 'Maude Girard', source: 'Team check-in, Oct 23', status: 'open', internal: true },
      { id: 't-sarahc', client: 'sarahc', title: 'Send Sarah Côté the Charlesbourg sales update', due: '2026-10-28T10:00', owner: 'Alex Lavoie', source: 'Call note, Oct 21', status: 'open' },
      { id: 't-emma', client: 'emma', title: 'Offer Emma a pre-offer call', due: '2026-10-26T12:00', owner: 'Alex Lavoie', source: 'Showing note, Oct 21', status: 'open' },
      { id: 't-philippe', client: 'philippe', title: 'Check in on Philippe’s lender meeting', due: '2026-11-02T10:00', owner: 'Alex Lavoie', source: 'Email from Philippe, Oct 15', status: 'open' },
      { id: 't-lea', client: 'lea', title: 'Send Léa the inspection checklist', due: '2026-10-27T10:00', owner: 'Maude Girard', source: 'Call note, Oct 20', status: 'open' },
      { id: 't-annie', client: 'annie', title: 'Confirm Sunday showings with Annie', due: '2026-10-26T18:00', owner: 'Alex Lavoie', source: 'Email, Oct 20', status: 'open' },
      { id: 't-gabriel', client: 'gabriel', title: 'Send Gabriel the lender’s document checklist', due: '2026-10-30T10:00', owner: 'Alex Lavoie', source: 'Call note, Oct 19', status: 'open' },
      { id: 't-jonathan', client: 'jonathan', title: 'Share condo-fee comparison with Jonathan', due: '2026-10-28T15:00', owner: 'Alex Lavoie', source: 'Email, Oct 20', status: 'open' },
      { id: 't-sofia', client: 'sofia', title: 'Check in with Sofia after her trip', due: '2026-11-03T10:00', owner: 'Alex Lavoie', source: 'Call note, Oct 22', status: 'open' },
      { id: 't-benoit', client: 'benoit', title: 'Send Benoît the signed listing agreement copy', due: '2026-10-29T12:00', owner: 'Maude Girard', source: 'Listing signing, Oct 21', status: 'open' },
      { id: 't-yannick', client: 'yannick', title: 'Send Yannick duplex comparables for Beauport and Limoilou', due: '2026-11-05T10:00', owner: 'Alex Lavoie', source: 'Call note, Oct 15', status: 'open' }
    ];
  }

  // Ledger history since the pilot moved from Shadow Mode to approval-required (Oct 12).
  T.LEDGER_SEED = {
    activeSince: '2026-10-12',
    baseline: { window: 'Sep 14–27, 2026', recapManual: 14, recapReview: 3, followManual: 6, followReview: 1 },
    shadow: { window: 'Sep 28 – Oct 11', proposals: 31, didYourself: 19, missed: 12, stillOpen: ['antoine', 'thomas', 'nadia', 'david'] },
    recaps: [
      { date: '2026-10-12', client: 'Emma Gagnon' }, { date: '2026-10-13', client: 'Léa Morin' }, { date: '2026-10-14', client: 'Gabriel Simard' },
      { date: '2026-10-15', client: 'Annie Thibault' }, { date: '2026-10-16', client: 'Jonathan Lee' }, { date: '2026-10-17', client: 'Sofia Rossi' },
      { date: '2026-10-19', client: 'Samuel Roy' }, { date: '2026-10-21', client: 'Emma Gagnon' }, { date: '2026-10-22', client: 'Hugo Lefebvre' }
    ],
    commitmentsDone: [
      { title: 'Send Emma the Montcalm shortlist', due: '2026-10-12', done: '2026-10-12' },
      { title: 'Book Léa’s inspection', due: '2026-10-13', done: '2026-10-13' },
      { title: 'Call Vincent about pricing', due: '2026-10-13', done: '2026-10-13' },
      { title: 'Send Gabriel the school-bus routes he asked for', due: '2026-10-14', done: '2026-10-14' },
      { title: 'Share Hugo’s listing photos', due: '2026-10-15', done: '2026-10-14' },
      { title: 'Confirm Annie’s showing', due: '2026-10-15', done: '2026-10-15' },
      { title: 'Send Marc the inspection report', due: '2026-10-16', done: '2026-10-16' },
      { title: 'Reply to Jonathan about condo fees', due: '2026-10-16', done: '2026-10-16' },
      { title: 'Order Marie-Ève’s photographer', due: '2026-10-19', done: '2026-10-19' },
      { title: 'Send Sofia the Vieux-Québec list', due: '2026-10-19', done: '2026-10-18' },
      { title: 'Benoît: listing agreement signing', due: '2026-10-21', done: '2026-10-21' },
      { title: 'Book Emma’s showing', due: '2026-10-21', done: '2026-10-21' },
      { title: 'Update Sarah Côté on two visits', due: '2026-10-22', done: '2026-10-21' }
    ],
    // Earlier recovery batch: approved Oct 13 (fictional history)
    outreach: [
      { id: 'o-emma', client: 'emma', name: 'Emma Gagnon', sent: '2026-10-13', status: 'replied', reply: '2026-10-14', replyKind: 'observed', meeting: '2026-10-21', meetingKind: 'confirmed', messages: 2 },
      { id: 'o-philippe', client: 'philippe', name: 'Philippe Ouellet', sent: '2026-10-13', status: 'replied', reply: '2026-10-15', replyKind: 'observed', meeting: null, messages: 1 },
      { id: 'o-annie', client: 'annie', name: 'Annie Thibault', sent: '2026-10-13', status: 'awaiting', windowEnd: '2026-10-27', messages: 1 },
      { id: 'o-gabriel', client: 'gabriel', name: 'Gabriel Simard', sent: '2026-10-13', status: 'awaiting', windowEnd: '2026-10-27', messages: 1 },
      { id: 'o-jonathan', client: 'jonathan', name: 'Jonathan Lee', sent: '2026-10-13', status: 'awaiting', windowEnd: '2026-10-27', messages: 1 }
    ],
    health: { approved: 21, edited: 8, rejected: 2, optOuts: 0 }
  };

  /* Transactions: conditions, deadlines and documents with the dates extracted from them.
     The check engine compares every recorded date with the documents and the calendar. */
  function transactions() {
    return [
      {
        id: 'tx-tremblay', title: 'Tremblay sale', client: 'marc', side: 'Seller', stage: 'Conditional',
        property: '2875 Rue Lapointe, Sainte-Foy', area: 'Sainte-Foy', price: 642000, accepted: '2026-10-09',
        counterpart: 'Félix and Julia Roussel (buyers), represented by Julien Caron (another agency)',
        conditions: [
          { id: 'insp', label: 'Inspection', deadline: '2026-10-16', status: 'satisfied', closedOn: '2026-10-16', source: 'Inspection report, p. 1' },
          { id: 'fin', label: 'Financing', deadline: '2026-10-28', status: 'open', source: 'Your call note, Oct 14' }
        ],
        keyDates: [{ id: 'deed', label: 'Deed of sale', date: '2026-11-27', source: 'Buyers’ broker email, Oct 14' }],
        docs: [
          { id: 'd1', type: 'Promise to Purchase', date: '2026-10-09', fields: [{ key: 'fin', label: 'Financing deadline', value: '2026-10-30', page: 'p. 3', quote: '…within twenty-one (21) days following the acceptance of the promise…', calc: 'Accepted Oct 9 + 21 days = Oct 30' }] },
          { id: 'd2', type: 'Seller’s Declarations', date: '2026-10-09', fields: [] },
          { id: 'd3', type: 'Inspection report', date: '2026-10-15', fields: [] },
          { id: 'd4', type: 'Call note', date: '2026-10-14', fields: [{ key: 'fin', label: 'Financing deadline', value: '2026-10-28', quote: 'Buyers say financing by the 28th.' }] }
        ],
        resolutions: {}, history: []
      },
      {
        id: 'tx-simard', title: 'Simard purchase', client: 'gabriel', side: 'Buyer', stage: 'Conditional',
        property: '312 Rue Saint-Vallier Ouest, unit 4, Saint-Sauveur', area: 'Saint-Sauveur', price: 389000, accepted: '2026-10-14',
        counterpart: 'Seller represented by Courtage Laurentides (fictional)',
        conditions: [
          { id: 'insp', label: 'Inspection', deadline: '2026-10-21', status: 'satisfied', closedOn: '2026-10-20', source: 'Inspection report, p. 1' },
          { id: 'fin', label: 'Financing', deadline: '2026-11-04', status: 'open', source: 'Promise to Purchase, p. 3' }
        ],
        keyDates: [{ id: 'deed', label: 'Deed of sale', date: '2026-11-20', source: 'Promise to Purchase, p. 4' }],
        docs: [
          { id: 'd1', type: 'Promise to Purchase', date: '2026-10-14', fields: [{ key: 'fin', label: 'Financing deadline', value: '2026-11-04', page: 'p. 3', quote: '…within twenty-one (21) days following the acceptance…', calc: 'Accepted Oct 14 + 21 days = Nov 4' }, { key: 'deed', label: 'Deed of sale', value: '2026-11-20', page: 'p. 4', quote: 'The deed of sale shall be signed on or before November 20, 2026.' }] },
          { id: 'd2', type: 'Inspection report', date: '2026-10-20', fields: [] }
        ],
        resolutions: {}, history: []
      },
      {
        id: 'tx-poulin', title: 'Poulin listing', client: 'marieeve', side: 'Seller', stage: 'Listed',
        property: '1462 Avenue James-LeMoine, Sillery', area: 'Sillery', price: 1150000, accepted: null,
        counterpart: 'No offer yet', conditions: [],
        keyDates: [{ id: 'expiry', label: 'Listing agreement ends', date: '2027-01-06', source: 'Listing agreement, Oct 6' }],
        docs: [{ id: 'd1', type: 'Listing agreement', date: '2026-10-06', fields: [{ key: 'expiry', label: 'Listing agreement ends', value: '2027-01-06', page: 'p. 1', quote: 'This contract ends on January 6, 2027.' }] }],
        resolutions: {}, history: []
      },
      {
        id: 'tx-thibault', title: 'Thibault purchase', client: 'annie', side: 'Buyer', stage: 'Conditional',
        property: '27 Rue Fraser, Lévis', area: 'Lévis', price: 368000, accepted: '2026-10-20',
        counterpart: 'Seller represented by Courtage Rive-Sud (fictional)',
        conditions: [
          { id: 'insp', label: 'Inspection', deadline: '2026-10-30', status: 'open', source: 'Promise to Purchase, p. 2' },
          { id: 'fin', label: 'Financing', deadline: '2026-11-10', status: 'open', source: 'Promise to Purchase, p. 3' }
        ],
        keyDates: [],
        contacts: [{ role: 'Notary', name: 'Me Hélène Fortier', email: 'h.fortier.notaire@example.com' }],
        docs: [{ id: 'd1', type: 'Promise to Purchase', date: '2026-10-20', fields: [{ key: 'insp', label: 'Inspection deadline', value: '2026-10-30', page: 'p. 2', quote: '…within ten (10) days following the acceptance…', calc: 'Accepted Oct 20 + 10 days = Oct 30' }, { key: 'fin', label: 'Financing deadline', value: '2026-11-10', page: 'p. 3', quote: '…within twenty-one (21) days following the acceptance…', calc: 'Accepted Oct 20 + 21 days = Nov 10' }] }],
        resolutions: {}, history: []
      },
      {
        id: 'tx-bisson', title: 'Bisson sale', client: 'helene', side: 'Seller', stage: 'Closed',
        property: '760 Avenue De Bourlamaque, Montcalm', area: 'Montcalm', price: 598000, accepted: '2026-08-20',
        counterpart: 'Buyer represented by another agency', conditions: [
          { id: 'insp', label: 'Inspection', deadline: '2026-08-27', status: 'satisfied', closedOn: '2026-08-26', source: 'Inspection report' },
          { id: 'fin', label: 'Financing', deadline: '2026-09-10', status: 'satisfied', closedOn: '2026-09-08', source: 'Lender commitment letter' }
        ],
        keyDates: [{ id: 'deed', label: 'Deed of sale', date: '2026-09-25', source: 'Notary confirmation', done: true }],
        docs: [{ id: 'd1', type: 'Deed of sale (notary copy)', date: '2026-09-25', fields: [] }],
        resolutions: {}, history: []
      }
    ];
  }

  T.SAMPLES = [
    {
      id: 'sarah', label: 'Recap Sarah’s 2:00 showing', short: 'Sarah’s showing recap', lang: 'en-CA',
      text: 'Just finished the showing at 1280 Avenue du Parc with Sarah. She loved the natural light, but the condo fees felt too high. She wants to stay under 350 a month. Her budget is now 825,000 and a garage is essential now. I promised to send her two alternatives tomorrow morning.'
    },
    {
      id: 'recovery', label: 'Find follow-ups I owe', short: 'Opportunity recovery', lang: 'en-CA',
      text: 'Find the clients I haven’t followed up with, prioritize them, and prepare messages for me to review.'
    },
    {
      id: 'tremblay', label: 'Check the Tremblay file', short: 'Transaction check', lang: 'en-CA',
      text: 'Summarize the Tremblay file and tell me what needs attention.'
    },
    {
      id: 'louis', label: 'Recap Louis’s visit, in French', short: 'Récap en français', lang: 'fr-CA',
      text: 'Visite terminée avec Louis au 455 rue Saint-Vallier Est. Il a adoré la terrasse, mais il trouve les frais de condo trop élevés. Son budget passe à 480 000 $ et le stationnement est maintenant essentiel. Je lui ai promis d’envoyer deux options lundi matin.'
    },
    {
      id: 'olivia', label: 'Book a showing for Olivia', short: 'Scheduling with a conflict', lang: 'en-CA',
      text: 'Book a second showing with Olivia tomorrow at 10.'
    }
  ];

  T.seed = function () {
    return {
      version: 4,
      now: T.DEMO.today + 'T14:47',
      role: 'broker',
      caps: { sr: true, voices: true, offline: false, ai: true },
      settings: { mode: 'active', speak: true, recLang: 'en-CA', morning: '09:00', useAI: true },
      style: { formality: 'warm', length: 'short', emoji: 'never', signEN: 'Talk soon,\nAlex', signFR: 'Au plaisir,\nAlex' },
      clients: clients(),
      appointments: appointments(),
      tasks: tasks(),
      transactions: transactions(),
      outreach: JSON.parse(JSON.stringify(T.LEDGER_SEED.outreach)),
      outbox: [],
      inbox: [],
      pendingEvents: [{ id: 'pe-1', type: 'optout-during-send', client: 'kevin', note: 'Kevin will reply “Please take me off your list” to an earlier newsletter while the next batch is sending.' }],
      subjects: [],
      cmaRuns: {},
      cmaReports: [],
      trash: [],
      thread: [],
      cards: {},
      receipts: [],
      events: [],
      draft: '',
      counters: { recaps: 0, shadowRuns: 0, approved: 0, edited: 0, rejected: 0, optOuts: 0, msg: 0, card: 0, id: 0 },
      tour: { step: 0, active: false, seen: false }
    };
  };
})();
