// TradeDesk OS v2 — Commercial Operations Engine
const lotsData = [
  { id: "OP-1042", commodity: "Corn", grade: "No. 2 yellow · 14.5% moisture", supplier: "Ferme des Cèdres", from: "Saint-Hyacinthe", buyer: "Meunerie Val-Richelieu", to: "Saint-Jean-sur-Richelieu", tonnes: 240, buy: 224, sell: 268, freight: 21.5, status: "Ready to quote", quality: "Verified", lane: "62 km" },
  { id: "OP-1041", commodity: "Soybeans", grade: "No. 2 IP · 36.8% protein", supplier: "Grains Belle-Rive", from: "Drummondville", buyer: "AgriNutrition Québec", to: "Lévis", tonnes: 180, buy: 518, sell: 562, freight: 24.8, status: "Ready to quote", quality: "Verified", lane: "148 km" },
  { id: "OP-1040", commodity: "Feed wheat", grade: "Feed grade · 13.2% moisture", supplier: "Les Champs du Nord", from: "Joliette", buyer: "Moulins du Saint-Laurent", to: "Trois-Rivières", tonnes: 320, buy: 236, sell: 274, freight: 20.2, status: "Needs review", quality: "COA requested", lane: "97 km" },
  { id: "OP-1039", commodity: "Corn", grade: "No. 2 yellow · 14.1% moisture", supplier: "Ferme du Ruisseau", from: "Granby", buyer: "Aliments Élevage Plus", to: "Sherbrooke", tonnes: 150, buy: 226, sell: 267, freight: 22.0, status: "Ready to quote", quality: "Verified", lane: "91 km" },
  { id: "OP-1038", commodity: "Soybeans", grade: "No. 2 · 37.2% protein", supplier: "Coop des Prairies", from: "Saint-Hyacinthe", buyer: "Protéines Boréales", to: "Bécancour", tonnes: 200, buy: 515, sell: 568, freight: 27.2, status: "Ready to quote", quality: "Verified", lane: "133 km" },
  { id: "OP-1037", commodity: "Feed wheat", grade: "Feed grade · 12.8% moisture", supplier: "Grains de la Vallée", from: "Sorel-Tracy", buyer: "Meunerie Val-Richelieu", to: "Saint-Jean-sur-Richelieu", tonnes: 120, buy: 238, sell: 271, freight: 22.5, status: "Needs review", quality: "Window unconfirmed", lane: "116 km" }
];

const pipelineMovements = [
  { id: "LD-2381", commodity: "Corn #2", origin: "Saint-Hyacinthe", destination: "Saint-Jean", carrier: "Transport Bourassa", tonnes: 38.5, status: "In transit", statusClass: "in-transit", eta: "15:10 Today", margin: "+$22.50/t", total: "+$866.25" },
  { id: "LD-2382", commodity: "Soybeans IP", origin: "Drummondville", destination: "Lévis", carrier: "Express Mondor", tonnes: 37.8, status: "In transit", statusClass: "in-transit", eta: "16:45 Today", margin: "+$19.20/t", total: "+$725.76" },
  { id: "LD-2383", commodity: "Corn #2", origin: "Granby", destination: "Sherbrooke", carrier: "Logistique Richelieu", tonnes: 39.0, status: "Unloading", statusClass: "unloading", eta: "Bay 3 Active", margin: "+$19.00/t", total: "+$741.00" },
  { id: "LD-2379", commodity: "Corn #2", origin: "Sorel-Tracy", destination: "Bécancour", carrier: "Transport Guilbault", tonnes: 38.37, status: "Delivered", statusClass: "delivered", eta: "Reconciled", margin: "+$21.40/t", total: "+$821.12" }
];

const counterparties = [
  { name: "Ferme des Cèdres", type: "Supplier", place: "Saint-Hyacinthe, QC", contact: "Marc Gagnon", volume: "2,480 MT YTD", rating: "98% On-Time" },
  { name: "Meunerie Val-Richelieu", type: "Buyer", place: "Saint-Jean-sur-Richelieu, QC", contact: "Sophie Tremblay", volume: "4,120 MT YTD", rating: "99% Credit OK" },
  { name: "Transport Bourassa", type: "Carrier", place: "Saint-Jean-sur-Richelieu, QC", contact: "Éric Bourassa", volume: "86 loads", rating: "98% Clean Hoppers" },
  { name: "AgriNutrition Québec", type: "Buyer", place: "Lévis, QC", contact: "Julie Fortin", volume: "3,650 MT YTD", rating: "100% Payment" },
  { name: "Grains Belle-Rive", type: "Supplier", place: "Drummondville, QC", contact: "Luc Deschamps", volume: "1,820 MT YTD", rating: "97% Spec Verified" },
  { name: "Express Mondor", type: "Carrier", place: "Lanoraie, QC", contact: "Marie Lavoie", volume: "54 loads", rating: "95% On-Time" }
];

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  renderPipeline();
  renderOpportunities(lotsData);
  renderAllocations();
  renderCounterparties(counterparties);
  calculateMargin();
  setupGlobalSearch();
});

// Toast notification helper
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>${msg}</span>`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3400);
}

// Navigation handling
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view-panel");
  const breadcrumb = document.getElementById("active-breadcrumb-label");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.getAttribute("data-tab");
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      views.forEach(v => v.classList.add("hidden"));
      const target = document.getElementById(`view-${tab}`);
      if (target) target.classList.remove("hidden");

      const label = item.querySelector("span").textContent;
      if (breadcrumb) breadcrumb.textContent = label;
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  });
}

// Global Search
function setupGlobalSearch() {
  const input = document.getElementById("global-search-input");
  if (!input) return;
  input.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filteredLots = lotsData.filter(l => l.commodity.toLowerCase().includes(q) || l.supplier.toLowerCase().includes(q) || l.buyer.toLowerCase().includes(q));
    renderOpportunities(filteredLots);
    const filteredParties = counterparties.filter(p => p.name.toLowerCase().includes(q) || p.place.toLowerCase().includes(q) || p.type.toLowerCase().includes(q));
    renderCounterparties(filteredParties);
  });
}

// Render Pipeline
function renderPipeline(filter = "all") {
  const tbody = document.getElementById("pipeline-tbody");
  if (!tbody) return;

  const data = filter === "all" ? pipelineMovements : pipelineMovements.filter(m => m.statusClass === filter);

  tbody.innerHTML = data.map(m => `
    <tr>
      <td>
        <strong class="cell-title">${m.id}</strong>
        <span class="cell-sub">${m.commodity}</span>
      </td>
      <td>
        <strong class="cell-title">${m.origin}</strong>
        <span class="cell-sub">➔ ${m.destination}</span>
      </td>
      <td>
        <strong class="cell-title">${m.tonnes} MT</strong>
        <span class="cell-sub">${m.carrier}</span>
      </td>
      <td>
        <strong style="color: var(--primary-emerald); font-family: var(--font-mono);">${m.margin}</strong>
        <span class="cell-sub">${m.total} Net</span>
      </td>
      <td>
        <span class="status-tag ${m.statusClass}">${m.status}</span>
        <span class="cell-sub">${m.eta}</span>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openMovementModal('${m.id}')">Inspect</button>
      </td>
    </tr>
  `).join("");
}

window.filterPipeline = function(type, btn) {
  document.querySelectorAll(".card-head .pill-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderPipeline(type);
};

// Render Opportunities Grid
function renderOpportunities(lots) {
  const container = document.getElementById("lots-grid");
  if (!container) return;

  container.innerHTML = lots.map(l => {
    const spread = l.sell - l.buy - l.freight;
    return `
      <div class="lot-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span class="badge-cyan">${l.id}</span>
          <span style="font-size:11px; color:var(--text-dim);">${l.lane}</span>
        </div>
        <h4 style="font-size:15px; color:#fff; margin-bottom:4px;">${l.commodity}</h4>
        <p style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">${l.grade}</p>
        <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px; font-size:11px; margin-bottom:12px;">
          <div>Origin: <strong>${l.supplier} (${l.from})</strong></div>
          <div>Buyer: <strong>${l.buyer} (${l.to})</strong></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:14px;">
          <span>Volume: <strong>${l.tonnes} MT</strong></span>
          <span style="color:var(--primary-emerald);">Spread: <strong>+$${spread.toFixed(2)}/t</strong></span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary btn-sm btn-block" onclick="loadLotIntoSim('${l.id}')">Simulate Spread</button>
          <button class="btn btn-outline btn-sm" onclick="openLotModal('${l.id}')">COA Spec</button>
        </div>
      </div>
    `;
  }).join("");
}

window.filterLots = function(type, btn) {
  document.querySelectorAll("#view-opportunities .pill-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const filtered = type === "all" ? lotsData : lotsData.filter(l => l.commodity.includes(type));
  renderOpportunities(filtered);
};

// Render Physical Allocations
function renderAllocations() {
  const container = document.getElementById("alloc-container");
  if (!container) return;

  const allocs = [
    { lot: "LOT-QC-Corn-401", supplier: "Ferme des Cèdres (Saint-Hyacinthe)", buyer: "Meunerie Val-Richelieu", total: 1500, allocated: 1260, contract: "CT-0914" },
    { lot: "LOT-QC-Soy-405", supplier: "Grains Belle-Rive (Drummondville)", buyer: "AgriNutrition Québec", total: 800, allocated: 620, contract: "CT-0913" },
    { lot: "LOT-QC-Wheat-409", supplier: "Les Champs du Nord (Joliette)", buyer: "Moulins du Saint-Laurent", total: 600, allocated: 600, contract: "CT-0912" }
  ];

  container.innerHTML = allocs.map(a => {
    const pct = Math.round((a.allocated / a.total) * 100);
    return `
      <div class="alloc-card">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <strong style="color:#fff; font-size:13px;">${a.lot}</strong>
          <span class="badge-emerald">${a.contract}</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">Origin: ${a.supplier}</div>
        <div style="height:6px; background:#162f28; border-radius:3px; overflow:hidden; margin-bottom:10px;">
          <div style="height:100%; width:${pct}%; background:var(--primary-emerald);"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-dim); margin-bottom:12px;">
          <span>Allocated: <strong>${a.allocated} MT</strong> (${pct}%)</span>
          <span>Free: <strong>${a.total - a.allocated} MT</strong></span>
        </div>
        <button class="btn btn-outline btn-sm btn-block" onclick="showToast('Capacity reserved for ${a.contract}. Zero double-allocation risk.')">Manage Allocation</button>
      </div>
    `;
  }).join("");
}

// Render Counterparties Directory
function renderCounterparties(list) {
  const container = document.getElementById("parties-container");
  if (!container) return;

  container.innerHTML = list.map(p => `
    <div class="party-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="badge-cyan">${p.type}</span>
        <span style="font-size:10px; color:var(--primary-emerald);">${p.rating}</span>
      </div>
      <h4 style="font-size:15px; color:#fff; margin-bottom:4px;">${p.name}</h4>
      <p style="font-size:11px; color:var(--text-dim); margin-bottom:12px;">${p.place}</p>
      <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); border-top:1px solid var(--border-subtle); padding-top:10px;">
        <span>Contact: <strong>${p.contact}</strong></span>
        <span>${p.volume}</span>
      </div>
    </div>
  `).join("");
}

window.filterParties = function(type, btn) {
  document.querySelectorAll("#view-counterparties .pill-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const filtered = type === "all" ? counterparties : counterparties.filter(p => p.type === type);
  renderCounterparties(filtered);
};

// Delivered Margin Lab Simulator
window.calculateMargin = function() {
  const cif = parseFloat(document.getElementById("sim-buyer-select").value) || 268;
  const buy = parseFloat(document.getElementById("sim-buy-price").value) || 224;
  const tonnes = parseFloat(document.getElementById("sim-tonnes").value) || 240;
  const freight = parseFloat(document.getElementById("slider-freight").value) || 21.5;
  const moisture = parseFloat(document.getElementById("slider-moisture").value) || 0;

  document.getElementById("disp-freight-val").textContent = `$${freight.toFixed(2)} / t`;
  document.getElementById("disp-moisture-val").textContent = `${moisture.toFixed(1)}% (-$${(moisture * 2.8).toFixed(2)}/t)`;

  const dockage = moisture * 2.8;
  const netSpread = cif - buy - freight - dockage;
  const totalDeskProfit = netSpread * tonnes;
  const roi = ((netSpread / (buy + freight)) * 100).toFixed(1);

  document.getElementById("disp-net-spread").innerHTML = `$${netSpread.toFixed(2)} <small>/ tonne</small>`;
  document.getElementById("disp-total-profit").innerHTML = `Desk Contribution: <strong style="color:var(--primary-emerald);">+$${totalDeskProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD</strong>`;

  document.getElementById("wf-cif").textContent = `$${cif.toFixed(2)} / t`;
  document.getElementById("wf-fob").textContent = `-$${buy.toFixed(2)} / t`;
  document.getElementById("wf-freight").textContent = `-$${freight.toFixed(2)} / t`;
  document.getElementById("wf-dockage").textContent = `-$${dockage.toFixed(2)} / t`;
  document.getElementById("wf-net").textContent = `+$${netSpread.toFixed(2)} / t`;
  document.getElementById("wf-roi").textContent = `${roi}% per turn`;
};

window.updateSimFromLot = function() {
  const lotId = document.getElementById("sim-lot-select").value;
  const lot = lotsData.find(l => l.id === lotId);
  if (lot) {
    document.getElementById("sim-buy-price").value = lot.buy;
    document.getElementById("sim-tonnes").value = lot.tonnes;
    document.getElementById("slider-freight").value = lot.freight;
    calculateMargin();
  }
};

window.loadLotIntoSim = function(lotId) {
  document.querySelector('[data-tab="margin-lab"]').click();
  document.getElementById("sim-lot-select").value = lotId;
  updateSimFromLot();
  showToast(`Loaded ${lotId} into Delivered Margin Simulator.`);
};

window.resetSim = function() {
  document.getElementById("sim-buy-price").value = 224;
  document.getElementById("sim-tonnes").value = 240;
  document.getElementById("slider-freight").value = 21.5;
  document.getElementById("slider-moisture").value = 0;
  calculateMargin();
  showToast("Simulation parameters reset.");
};

window.issueTradeConfirmation = function() {
  showToast("Binding Sales Confirmation CT-2026-X49 generated & archived in Trade Book!");
};

window.lockArbitrageTrade = function(tonnes, comm, spread, profit) {
  showToast(`Arbitrage locked: ${tonnes} MT ${comm} at +$${spread.toFixed(2)}/t (+$${profit.toLocaleString('en-CA')} net)!`);
};

window.approveSettlement = function() {
  const btn = document.getElementById("btn-approve-settlement");
  btn.outerHTML = `<span class="badge-emerald" style="padding:8px 14px; font-size:12px;">✓ Reconciled & Exported to General Ledger</span>`;
  showToast("Settlement approved! Variance of 0.28% accepted under commercial tolerance.");
};

window.injectParsedLot = function() {
  showToast("Ferme Beauregard 500 MT Corn #2 successfully injected into live trade catalog!");
  document.querySelector('[data-tab="opportunities"]').click();
};

// Modal Helpers
const dialog = document.getElementById("modal-dialog");

function openModal(title, sub, bodyHtml, actionsHtml) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-sub").textContent = sub;
  document.getElementById("modal-content").innerHTML = bodyHtml;
  document.getElementById("modal-actions").innerHTML = actionsHtml;
  dialog.showModal();
}

window.closeModal = function() {
  dialog.close();
};

window.openMovementModal = function(id) {
  const m = pipelineMovements.find(x => x.id === id);
  openModal(
    `Movement ${m.id} · ${m.commodity}`,
    `${m.origin} ➔ ${m.destination} (${m.carrier})`,
    `
      <div style="background:rgba(0,0,0,0.3); padding:14px; border-radius:8px; margin-bottom:14px;">
        <div>Carrier: <strong>${m.carrier}</strong></div>
        <div>Tonnage: <strong>${m.tonnes} MT</strong></div>
        <div>ETA: <strong>${m.eta}</strong></div>
        <div>Delivered Margin: <strong style="color:var(--primary-emerald);">${m.margin}</strong></div>
      </div>
      <div style="font-size:12px; color:var(--text-muted); line-height:1.6;">
        Electronic Bill of Lading (e-BOL) verified. Scale ticket matches origin gross weight. Driver telematics active along Hwy 20 East.
      </div>
    `,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Close</button><button class="btn btn-primary btn-sm" onclick="showToast('e-BOL dispatched to carrier.'); closeModal();">Dispatch e-BOL</button>`
  );
};

window.openLotModal = function(id) {
  const l = lotsData.find(x => x.id === id);
  openModal(
    `Certificate of Analysis (COA) · ${l.id}`,
    `${l.supplier} · ${l.commodity}`,
    `
      <div style="background:rgba(0,0,0,0.3); padding:14px; border-radius:8px; margin-bottom:14px;">
        <div>Grade: <strong>${l.grade}</strong></div>
        <div>Testing Facility: <strong>Laboratoire Agronomique St-Hyacinthe</strong></div>
        <div>Quality Evidence: <strong style="color:var(--primary-emerald);">${l.quality}</strong></div>
      </div>
      <p style="font-size:12px; color:var(--text-muted);">
        Certified sampling report indicates full compliance with destination feed mill receiving specifications.
      </p>
    `,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Close</button>`
  );
};

window.openNewMatchModal = function() {
  openModal(
    "New Commercial Trade Match",
    "Select supply lot and buyer destination",
    `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <label style="font-size:11px; color:var(--text-muted);">Select Supply Lot:
          <select class="input-field" style="margin-top:4px;">
            <option>OP-1042 · Corn #2 (Ferme des Cèdres · 240 MT)</option>
            <option>OP-1041 · Soybeans IP (Grains Belle-Rive · 180 MT)</option>
          </select>
        </label>
        <label style="font-size:11px; color:var(--text-muted);">Select Destination Buyer:
          <select class="input-field" style="margin-top:4px;">
            <option>Meunerie Val-Richelieu · Saint-Jean (Bid $268/t)</option>
            <option>AgriNutrition Québec · Lévis (Bid $562/t)</option>
          </select>
        </label>
      </div>
    `,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button><button class="btn btn-primary btn-sm" onclick="showToast('Matched trade generated!'); closeModal();">Create Match</button>`
  );
};

window.inspectNode = function(name, type, info) {
  const box = document.getElementById("radar-info-box");
  box.innerHTML = `
    <div class="tele-head">
      <span class="badge-cyan">${type}</span>
      <small>Facility Node</small>
    </div>
    <strong style="display:block; font-size:13px; color:#fff; margin-bottom:4px;">${name}</strong>
    <div class="tele-stat">${info}</div>
  `;
  showToast(`Inspecting facility waypoint: ${name}`);
};
