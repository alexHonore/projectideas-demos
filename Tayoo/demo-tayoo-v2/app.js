// Tayoo Voice v2 — AI Real Estate Assistant Engine
// Complete Mobile Copilot with Law 25 CRM, Action Cards, and Speech Engine

const CLIENTS_DATA = [
  {
    id: 'sarah', name: 'Sarah Mitchell', initials: 'SM', role: 'Buyer', area: 'Sillery · Québec',
    budget: 775000, status: 'Active', language: 'English', email: 'sarah.mitchell@example.com',
    note: 'Looking for a bright, low-maintenance home near transit. Private garage required.',
    source: 'Buyer consultation · Oct 18', consent: 'Email permitted · Express', last: 'Showing yesterday',
    phone: '(418) 555-0142', matches: ['p1', 'p2']
  },
  {
    id: 'marc', name: 'Marc Tremblay', initials: 'MT', role: 'Seller', area: 'Sainte-Foy · Québec',
    budget: 695000, status: 'Under contract', language: 'French', email: 'marc.tremblay@example.com',
    note: 'Selling before relocating to Montréal. Inspection report is ready to review. Financing date pending broker confirmation.',
    source: 'Call note · Oct 21', consent: 'Email permitted · Express', last: 'Updated 2 hours ago',
    phone: '(418) 555-0199', matches: []
  },
  {
    id: 'olivia', name: 'Olivia Chen', initials: 'OC', role: 'Buyer', area: 'Montcalm · Québec',
    budget: 650000, status: 'Follow up', language: 'English', email: 'olivia.chen@example.com',
    note: 'Requested two-bedroom condos with home office and natural light. Asked to reconnect when new listings appear.',
    source: 'Email · Oct 16', consent: 'Email permitted · Express', last: 'No reply in 7 days',
    phone: '(514) 555-0187', matches: ['p2']
  },
  {
    id: 'samuel', name: 'Samuel Roy', initials: 'SR', role: 'Buyer', area: 'Limoilou · Québec',
    budget: 525000, status: 'Follow up', language: 'French', email: 'samuel.roy@example.com',
    note: 'First-time home buyer. Pre-approval Desjardins received; would like to tour duplexes this weekend.',
    source: 'Buyer call · Oct 19', consent: 'Email permitted · Express', last: 'Commitment overdue',
    phone: '(418) 555-0128', matches: []
  },
  {
    id: 'sophie', name: 'Sophie Laurent', initials: 'SL', role: 'Seller', area: 'Cap-Rouge · Québec',
    budget: 780000, status: 'Nurturing', language: 'French', email: 'sophie.laurent@example.com',
    note: 'Considering a move next spring. Requested no promotional marketing for now. Warm advisory contact only.',
    source: 'Email preference · Oct 10', consent: 'Opted out of promo · Advisory OK', last: 'Last contact Oct 10',
    phone: '(418) 555-0164', matches: []
  },
  {
    id: 'thomas', name: 'Thomas Wilson', initials: 'TW', role: 'Buyer', area: 'Sillery · Québec',
    budget: 850000, status: 'New lead', language: 'English', email: 'thomas.wilson@example.com',
    note: 'Interested in detached homes. Imported record requires explicit communication consent verification under Law 25.',
    source: 'Web inquiry · Oct 20', consent: 'Consent verification required', last: 'New inquiry today',
    phone: '(514) 555-0112', matches: ['p3']
  }
];

const PROPERTIES_DATA = [
  {
    id: 'p1', address: '1280 Avenue du Parc', area: 'Sillery, Québec', price: 749000,
    beds: 3, baths: 2, size: 1420, fees: 285, year: 2015, garage: true,
    matchHighlight: 'Lower condo fees ($285) · Expansive west-facing windows',
    lockbox: 'MasterLock #4829', mls: 'CENTRIS #24198210',
    cmaNotes: 'Priced at $527/sqft. Comparable units sold at $535–$548/sqft in Q3.'
  },
  {
    id: 'p2', address: '845 Rue des Érables', area: 'Montcalm, Québec', price: 775000,
    beds: 3, baths: 2, size: 1550, fees: 310, year: 2018, garage: true,
    matchHighlight: 'Private underground garage · 2 min to Cartier Avenue & RTC transit',
    lockbox: 'SentriLock Bluetooth #7712', mls: 'CENTRIS #18920144',
    cmaNotes: 'Priced at $500/sqft. High retention building with $140k in contingency reserve.'
  },
  {
    id: 'p3', address: '2160 Chemin Saint-Louis', area: 'Sillery, Québec', price: 819000,
    beds: 4, baths: 3, size: 1840, fees: 0, year: 2012, garage: true,
    matchHighlight: 'Detached single-family · Expansive ground floor home office',
    lockbox: 'Supra iBox #9021', mls: 'CENTRIS #28471900',
    cmaNotes: 'Detached property. Land assessment $320k. Roof replaced in 2023.'
  }
];

let isRecording = false;
let wavePhase = 0;
let waveIntensity = 0.2;
let activeModel = 'neural';

document.addEventListener("DOMContentLoaded", () => {
  setupDeviceSwitcher();
  setupBottomNav();
  setupCanvasWaveform();
  setupVoiceInteraction();
  renderClients(CLIENTS_DATA);
  renderProperties();
  setupConflictResolver();
});

// Toast notification helper
function showToast(msg) {
  const toast = document.getElementById("toast-notify");
  if (!toast) return;
  toast.innerHTML = `<span style="margin-right:6px">⚡</span>${msg}`;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// Device Viewport Switcher
function setupDeviceSwitcher() {
  const btnPhone = document.getElementById("btn-phone-view");
  const btnFluid = document.getElementById("btn-fluid-view");

  if (btnPhone) {
    btnPhone.addEventListener("click", () => {
      document.body.classList.remove("mode-fluid");
      document.body.classList.add("mode-phone");
      btnPhone.classList.add("active");
      btnFluid.classList.remove("active");
    });
  }

  if (btnFluid) {
    btnFluid.addEventListener("click", () => {
      document.body.classList.remove("mode-phone");
      document.body.classList.add("mode-fluid");
      btnFluid.classList.add("active");
      btnPhone.classList.remove("active");
    });
  }
}

// Bottom Nav handling
function setupBottomNav() {
  const navTabs = document.querySelectorAll(".nav-tab");
  const panes = document.querySelectorAll(".tab-pane");

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const paneName = tab.getAttribute("data-pane");
      const targetPaneId = "pane-" + paneName;
      navTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      panes.forEach(p => p.classList.add("hidden"));
      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) targetPane.classList.remove("hidden");

      const scrollEl = document.querySelector(".scroll-content");
      if (scrollEl) scrollEl.scrollTop = 0;
    });
  });
}

// Model switcher
window.switchModel = function(modelName) {
  activeModel = modelName;
  showToast(`Active Copilot Model: ${modelName === 'neural' ? 'Tayoo Neural Core' : modelName}`);
};

// Animated Canvas Waveform
function setupCanvasWaveform() {
  const canvas = document.getElementById("voice-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function drawWave() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    const cy = height / 2;

    ctx.beginPath();
    ctx.lineWidth = 2.5;

    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, "rgba(139, 92, 246, 0.15)");
    grad.addColorStop(0.5, isRecording ? "rgba(236, 72, 153, 1)" : "rgba(139, 92, 246, 0.85)");
    grad.addColorStop(1, "rgba(6, 182, 212, 0.15)");
    ctx.strokeStyle = grad;

    for (let x = 0; x < width; x += 3) {
      const amp = isRecording ? 24 * waveIntensity : 8;
      const freq = isRecording ? 0.06 : 0.025;
      const y = cy + Math.sin(x * freq + wavePhase) * Math.cos(x * 0.015) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    wavePhase += isRecording ? 0.18 : 0.04;
    requestAnimationFrame(drawWave);
  }

  drawWave();
}

// Web Speech Synthesis
window.speakVoice = function(text, lang = "fr-CA") {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

function playChime(freq = 520) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch (e) {}
}

// Voice Interaction
function setupVoiceInteraction() {
  const micBtn = document.getElementById("btn-main-mic");
  const micRing = document.getElementById("mic-ring");
  const statusLabel = document.getElementById("voice-status-caption");

  if (!micBtn) return;

  micBtn.addEventListener("click", () => {
    if (!isRecording) {
      isRecording = true;
      waveIntensity = 1.0;
      micRing.classList.add("active-pulse");
      statusLabel.textContent = "Listening... Speak naturally (showing recap, CMA, inspection)";
      statusLabel.style.color = "#ec4899";
      playChime(600);

      setTimeout(() => {
        isRecording = false;
        waveIntensity = 0.2;
        micRing.classList.remove("active-pulse");
        statusLabel.textContent = "Processing speech with Tayoo Neural...";
        playChime(800);

        setTimeout(() => {
          statusLabel.textContent = "Action Card Ready for Approval";
          statusLabel.style.color = "#10b981";
          simulateVoiceCommand('recap-showing');
        }, 600);
      }, 1900);
    }
  });
}

// Voice Workflows Simulation
window.simulateVoiceCommand = function(type) {
  const cardSlot = document.getElementById("live-action-card-slot");
  const statusLabel = document.getElementById("voice-status-caption");
  const micRing = document.getElementById("mic-ring");

  isRecording = true;
  if (micRing) micRing.classList.add("active-pulse");
  playChime(500);

  setTimeout(() => {
    isRecording = false;
    if (micRing) micRing.classList.remove("active-pulse");
    statusLabel.textContent = "Synthesizing Broker Intent & Legal Requirements...";

    setTimeout(() => {
      statusLabel.textContent = "New Action Card Created";
      statusLabel.style.color = "#10b981";

      if (type === 'lead-elise') {
        cardSlot.innerHTML = `
          <div class="action-card">
            <div class="ac-header">
              <span class="ac-badge propose">PROPOSED ACTION</span>
              <small class="ac-timestamp">Voice · Cap-Rouge Seller</small>
            </div>
            <h3 class="ac-title">Seller Lead Intake & Discovery Plan</h3>
            <div class="ac-meta">
              <span>Client: <strong>Élise Bergeron (Cap-Rouge)</strong></span>
              <span>Target Valuation: <strong>~$630,000 CAD</strong></span>
            </div>
            <div class="ac-notes">
              "Planning a spring sale. Requested an initial advisory conversation before listing preparation. Clean title, detached bungalow."
            </div>
            <div class="ac-plan">
              <div class="plan-step"><span class="step-check">✓</span> Create seller CRM file & log Law 25 express consent</div>
              <div class="plan-step"><span class="step-check">✓</span> Pull 4 Cap-Rouge comparable sales (2025–2026 Q3)</div>
              <div class="plan-step"><span class="step-check">✓</span> Draft warm discovery email proposing discovery call for Oct 25</div>
            </div>
            <div class="ac-footer">
              <button class="btn-ac-approve" onclick="executeCurrentCard(this)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Approve & Dispatch Discovery Email
              </button>
              <button class="btn-ac-edit" onclick="speakVoice('Nouvelle opportunité vendeur enregistrée pour Élise Bergeron à Cap-Rouge. Estimation six cent trente mille dollars.')">🔊 Listen</button>
            </div>
          </div>
        `;
        speakVoice("Fiche vendeur préparée pour Élise Bergeron à Cap-Rouge.");
      } else if (type === 'schedule-inspection') {
        cardSlot.innerHTML = `
          <div class="action-card">
            <div class="ac-header">
              <span class="ac-badge propose">PROPOSED ACTION</span>
              <small class="ac-timestamp">Voice · Inspection Clause</small>
            </div>
            <h3 class="ac-title">Book Pre-Purchase Inspection</h3>
            <div class="ac-meta">
              <span>Property: <strong>850 Rue Rachel Est</strong></span>
              <span>Client: <strong>Marc Tremblay</strong></span>
            </div>
            <div class="ac-notes">
              "Inspection clause expires Tuesday. Booking preferred building inspector Jean Cloutier. Confirming roof and foundation inspection."
            </div>
            <div class="ac-plan">
              <div class="plan-step"><span class="step-check">✓</span> Confirm Inspector Jean Cloutier availability (Friday 14:00)</div>
              <div class="plan-step"><span class="step-check">✓</span> Send OACIQ Clause 13.1 Inspection Notice to listing broker</div>
              <div class="plan-step"><span class="step-check">✓</span> Retrieve SentriLock digital entry code for inspector access</div>
            </div>
            <div class="ac-footer">
              <button class="btn-ac-approve" onclick="executeCurrentCard(this)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Approve & Dispatch Notice
              </button>
              <button class="btn-ac-edit" onclick="speakVoice('Avis d\'inspection préparé pour Marc Tremblay. Inspecteur Jean Cloutier confirmé pour quatorze heures.')">🔊 Listen</button>
            </div>
          </div>
        `;
        speakVoice("Avis d'inspection prêt pour transmission.");
      } else if (type === 'move-sarah') {
        cardSlot.innerHTML = `
          <div class="action-card">
            <div class="ac-header">
              <span class="ac-badge propose">PROPOSED ACTION</span>
              <small class="ac-timestamp">Voice · Availability Conflict</small>
            </div>
            <h3 class="ac-title">Reschedule Showing · Sarah Mitchell</h3>
            <div class="ac-meta">
              <span>Current: <strong>14:00 PM (1280 Ave du Parc)</strong></span>
              <span>Proposed: <strong>15:45 PM (Conflict Free)</strong></span>
            </div>
            <div class="ac-notes">
              "Client requested later showing due to work meeting. 15:45 avoids the 14:00 inspection overlap entirely."
            </div>
            <div class="ac-plan">
              <div class="plan-step"><span class="step-check">✓</span> Move showing slot from 14:00 to 15:45 in broker calendar</div>
              <div class="plan-step"><span class="step-check">✓</span> Send SMS appointment update to Sarah Mitchell</div>
              <div class="plan-step"><span class="step-check">✓</span> Notify seller broker of 15:45 arrival time</div>
            </div>
            <div class="ac-footer">
              <button class="btn-ac-approve" onclick="executeCurrentCard(this)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Approve Reschedule & Send SMS
              </button>
              <button class="btn-ac-edit" onclick="speakVoice('Rescheduling showing for Sarah Mitchell to three forty-five PM. Conflict successfully resolved.')">🔊 Listen</button>
            </div>
          </div>
        `;
        speakVoice("Showing for Sarah Mitchell moved to 3:45 PM.");
      } else {
        // Default showing recap for 420 Saint-Denis
        cardSlot.innerHTML = `
          <div class="action-card" id="current-action-card">
            <div class="ac-header">
              <span class="ac-badge propose">PROPOSED ACTION</span>
              <small class="ac-timestamp">Voice · Just now</small>
            </div>
            <h3 class="ac-title">Showing Recap & Buyer Follow-Up</h3>
            <div class="ac-meta">
              <span>Listing: <strong>420 Rue Saint-Denis, Apt 4</strong></span>
              <span>Client: <strong>Sophie Lemieux (Pre-approved)</strong></span>
            </div>
            <div class="ac-notes">
              "Buyer loved natural light and exposed brick. Hesitant on condo fees ($480/m). Requesting 2025 syndic financials and contingency fund study."
            </div>
            <div class="ac-plan">
              <div class="plan-step"><span class="step-check">✓</span> Attach 2025 Syndic Financial Statements & Reserve Fund Audit</div>
              <div class="plan-step"><span class="step-check">✓</span> Draft personalized email with comparable Plateau condo fee benchmarks</div>
              <div class="plan-step"><span class="step-check">✓</span> Set CRM task: Follow up Thursday 10:00 AM</div>
            </div>
            <div class="ac-footer">
              <button class="btn-ac-approve" id="btn-approve-action" onclick="executeCurrentCard(this)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Approve & Execute (3 Steps)
              </button>
              <button class="btn-ac-edit" onclick="speakActionCardSummary()">🔊 Listen</button>
            </div>
          </div>
        `;
        speakActionCardSummary();
      }
      showToast("Action card generated! Review plan and tap Approve.");
    }, 450);
  }, 1000);
};

window.speakActionCardSummary = function() {
  speakVoice("Compte-rendu de visite pour Sophie Lemieux au quatre cent vingt rue Saint-Denis. Trois actions préparées pour approbation.");
};

window.executeCurrentCard = function(btn) {
  playChime(880);
  const card = btn.closest(".action-card");
  const badge = card.querySelector(".ac-badge");
  badge.className = "ac-badge executed";
  badge.textContent = "EXECUTED & SYNCHRONIZED";

  btn.outerHTML = `
    <div style="flex: 1; text-align: center; color: var(--accent-emerald); font-size: 12px; font-weight: 700; padding: 10px; background: rgba(16,185,129,0.15); border-radius: 8px;">
      ✓ All 3 Steps Successfully Executed & Synchronized with CRM
    </div>
  `;
  showToast("🎉 Actions completed! CRM updated, client notified, task scheduled.");
  speakVoice("Actions exécutées avec succès. Client notifié et tâche enregistrée dans l'agenda.");
};

// Conflict Resolver
function setupConflictResolver() {
  const solveBtn = document.getElementById("btn-solve-conflict");
  if (solveBtn) {
    solveBtn.addEventListener("click", () => {
      const conflictBox = document.getElementById("conflict-box");
      const schedItem = document.getElementById("sched-laurier-item");

      if (conflictBox) conflictBox.style.display = "none";
      if (schedItem) {
        schedItem.querySelector(".time-label").textContent = "15:30 PM";
        schedItem.querySelector(".time-content strong").textContent = "Private Showing: 1205 Ave Laurier (Rescheduled)";
        schedItem.querySelector(".time-content span").textContent = "Buyer: Marc Tremblay · Confirmed for 15:30";
      }

      playChime(660);
      showToast("Conflict resolved! Moved Laurier showing to 15:30. SMS notification sent to Marc Tremblay.");
      speakVoice("Conflit résolu. Visite de l'avenue Laurier déplacée à quinze heures trente.");
    });
  }
}

// Render CRM Clients Directory
function renderClients(list) {
  const container = document.getElementById("clients-container");
  if (!container) return;

  container.innerHTML = list.map(c => `
    <div class="client-card" onclick="openClientModal('${c.id}')">
      <div class="client-top">
        <div class="client-av">${c.initials}</div>
        <div class="client-info">
          <strong>${c.name}</strong>
          <span>${c.role} · Budget: $${(c.budget / 1000).toLocaleString('en-US')}k · ${c.area}</span>
        </div>
        <span class="status-pill ${c.status === 'Active' || c.status === 'Under contract' ? 'hot' : 'active'}">
          ${c.status}
        </span>
      </div>
      <div class="client-foot">
        <span style="font-size:11px; color:#a5b4fc;">🛡️ ${c.consent}</span>
        <small style="color:var(--text-dim);">${c.last}</small>
      </div>
    </div>
  `).join("");
}

window.filterClients = function(role, btn) {
  document.querySelectorAll(".crm-chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  const filtered = role === 'all' ? CLIENTS_DATA : CLIENTS_DATA.filter(c => c.role === role);
  renderClients(filtered);
};

// Render Properties Directory
function renderProperties() {
  const container = document.getElementById("properties-container");
  if (!container) return;

  container.innerHTML = PROPERTIES_DATA.map(p => `
    <div class="client-card" onclick="openPropertyModal('${p.id}')">
      <div class="client-top">
        <div class="client-av" style="background: linear-gradient(135deg, #06b6d4, #3b82f6); color:#fff; font-size:11px; font-weight:700;">MLS</div>
        <div class="client-info">
          <strong>${p.address}</strong>
          <span>${p.area} · $${p.price.toLocaleString('en-US')} CAD</span>
        </div>
        <span class="status-pill hot">$${Math.round(p.price / p.size)}/sqft</span>
      </div>
      <div style="font-size:11px; color:#cbd5e1; margin: 8px 0;">
        ${p.beds} beds · ${p.baths} baths · ${p.size} sqft · Condo fees: $${p.fees}/mo
      </div>
      <div class="client-foot">
        <span style="color:var(--accent-emerald); font-size:11px;">✓ ${p.matchHighlight}</span>
        <small style="color:var(--text-dim); font-family:var(--font-mono);">${p.lockbox}</small>
      </div>
    </div>
  `).join("");
}

// Dialog Modal Inspectors
window.openClientModal = function(clientId) {
  const c = CLIENTS_DATA.find(x => x.id === clientId);
  if (!c) return;

  const titleEl = document.getElementById("dialog-title");
  const contentEl = document.getElementById("dialog-content");

  titleEl.textContent = `Client Dossier · ${c.name}`;
  contentEl.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
      <div class="client-av" style="width:44px; height:44px; font-size:16px;">${c.initials}</div>
      <div>
        <h4 style="color:#fff; font-size:16px; margin-bottom:2px;">${c.name}</h4>
        <span style="color:var(--text-muted); font-size:12px;">${c.role} · ${c.area}</span>
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:12px; margin-bottom:14px; font-size:12px; line-height:1.6;">
      <div>Budget / Target: <strong>$${c.budget.toLocaleString('en-US')} CAD</strong></div>
      <div>Phone: <strong>${c.phone}</strong></div>
      <div>Email: <strong>${c.email}</strong></div>
      <div>Law 25 Consent: <strong style="color:#6ee7b7;">${c.consent}</strong></div>
      <div>Source: <em>${c.source}</em></div>
    </div>

    <div style="margin-bottom:14px;">
      <h5 style="color:#a5b4fc; font-size:11px; font-weight:700; margin-bottom:6px; letter-spacing:0.5px;">BROKER INTELLIGENCE NOTES</h5>
      <p style="color:#e2e8f0; font-size:12px; line-height:1.5; background:#141b30; padding:10px; border-radius:8px;">
        "${c.note}"
      </p>
    </div>

    <div style="display:flex; gap:8px;">
      <button class="btn-ac-approve" onclick="simulateVoiceCommand('move-sarah'); closeDialog();">
        ⚡ Generate Voice Action Card
      </button>
      <button class="btn-ac-edit" onclick="speakVoice('Dossier client pour ${c.name}. Budget de ${(c.budget / 1000)} mille dollars.')">
        🔊 Read Summary
      </button>
    </div>
  `;

  document.getElementById("mobile-dialog").showModal();
};

window.openPropertyModal = function(propId) {
  const p = PROPERTIES_DATA.find(x => x.id === propId);
  if (!p) return;

  const titleEl = document.getElementById("dialog-title");
  const contentEl = document.getElementById("dialog-content");

  titleEl.textContent = `Property Specs · ${p.address}`;
  contentEl.innerHTML = `
    <div style="margin-bottom:14px;">
      <span style="font-size:10px; color:#06b6d4; font-weight:700; font-family:var(--font-mono);">${p.mls}</span>
      <h4 style="color:#fff; font-size:17px; margin:4px 0;">${p.address}</h4>
      <span style="color:var(--text-muted); font-size:12px;">${p.area} · Built in ${p.year}</span>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; font-size:12px;">
      <div style="background:#141b30; padding:10px; border-radius:8px;">
        <span style="color:var(--text-dim); display:block; font-size:10px;">PRICE</span>
        <strong style="color:#6ee7b7; font-size:15px;">$${p.price.toLocaleString('en-US')}</strong>
      </div>
      <div style="background:#141b30; padding:10px; border-radius:8px;">
        <span style="color:var(--text-dim); display:block; font-size:10px;">LIVING AREA</span>
        <strong style="color:#fff; font-size:15px;">${p.size} sqft</strong>
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:12px; margin-bottom:14px; font-size:12px; line-height:1.6;">
      <div>Bedrooms / Baths: <strong>${p.beds} beds · ${p.baths} baths</strong></div>
      <div>Condo Fees: <strong>$${p.fees}/month</strong></div>
      <div>Lockbox Entry: <strong style="color:#f59e0b; font-family:var(--font-mono);">${p.lockbox}</strong></div>
      <div>Garage: <strong>${p.garage ? 'Yes (Underground heated)' : 'Street with permit'}</strong></div>
    </div>

    <div style="margin-bottom:14px;">
      <h5 style="color:#a5b4fc; font-size:11px; font-weight:700; margin-bottom:6px; letter-spacing:0.5px;">CMA VALUATION BENCHMARK</h5>
      <p style="color:#cbd5e1; font-size:12px; line-height:1.5; background:#141b30; padding:10px; border-radius:8px;">
        ${p.cmaNotes}
      </p>
    </div>

    <button class="btn-ac-approve" onclick="simulateVoiceCommand('recap-showing'); closeDialog();">
      🎙️ Start Voice Showing Recap for this Property
    </button>
  `;

  document.getElementById("mobile-dialog").showModal();
};

window.closeDialog = function() {
  document.getElementById("mobile-dialog").close();
};
