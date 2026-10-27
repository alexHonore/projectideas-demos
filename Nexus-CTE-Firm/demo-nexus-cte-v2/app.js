// Nexus CTE v2 — M&A Advisory Platform Engine
// Complete Transaction Management, EBITDA Normalization, VDR, and Succession Radar

const MANDATES_DATA = {
  boreal: {
    name: "Atelier Boréal Inc.",
    sector: "Usinage & Fabrication Industrielle",
    city: "Saint-Georges (Chaudière-Appalaches)",
    revenue: 3800000,
    reportedEbitda: 540000,
    salaryAdj: 140000,
    perks: 35000,
    rentAdj: 105000,
    multiple: 4.8,
    ownerAge: 63,
    employees: 28,
    status: "Teaser Anonyme Prêt",
    targetEv: 3936000
  },
  meridien: {
    name: "Groupe Méridien Inc.",
    sector: "Distribution d'Équipements Électriques",
    city: "Lévis / Québec",
    revenue: 7900000,
    reportedEbitda: 1180000,
    salaryAdj: 210000,
    perks: 45000,
    rentAdj: 215000,
    multiple: 5.2,
    ownerAge: 61,
    employees: 45,
    status: "Dataroom Ouverte (Audit FTQ)",
    targetEv: 8580000
  },
  logistique: {
    name: "Logistique Saint-Laurent",
    sector: "Transport Spécialisé & Entreposage",
    city: "Trois-Rivières (Mauricie)",
    revenue: 11200000,
    reportedEbitda: 1680000,
    salaryAdj: 250000,
    perks: 60000,
    rentAdj: 310000,
    multiple: 5.4,
    ownerAge: 66,
    employees: 58,
    status: "LOI Signée (12,4 M$)",
    targetEv: 12420000
  }
};

const VDR_DOCUMENTS = {
  "Etats_Financiers_Audites_2024_2025.pdf": {
    title: "Groupe Méridien Inc. — États Financiers Audités 2024–2025",
    firm: "MALLETTE SENCRL · RAPPORT DE L'AUDITEUR INDÉPENDANT",
    date: "OCTOBRE 2026",
    rows: [
      { label: "Produits des activités ordinaires (Ventes)", val: "7 894 210 $ CAD" },
      { label: "Coût des marchandises vendues & intrants", val: "4 620 180 $ CAD" },
      { label: "Bénéfice brut d'exploitation", val: "3 274 030 $ CAD" },
      { label: "Frais administratifs & rémunération dirigeants", val: "2 094 030 $ CAD" },
      { label: "BAIIA / EBITDA Comptable Déclaré", val: "1 180 000 $ CAD" },
      { label: "Retraitements Normalisés Agréés par Nexus CTE", val: "+470 000 $ CAD" },
      { label: "BAIIA Normalisé Certifié pour Diligence", val: "1 650 000 $ CAD", highlight: true }
    ],
    note: "Opinion sans réserve délivrée le 14 octobre 2026. Bilan audité sous normes NCECF canadiennes."
  },
  "Bail_Commercial_Lévis_2022_2032.pdf": {
    title: "Bail Commercial Notarié — Édifice Industriel Lévis (24 000 pi²)",
    firm: "ÉTUDE NOTARIALE ROY & ASSOCIÉS · LÉVIS",
    date: "JUILLET 2022 (RECONDUCTION 10 ANS)",
    rows: [
      { label: "Superficie totale des ateliers et bureaux", val: "24 000 pi² avec ponts roulants 10t" },
      { label: "Loyer de base annuel actuel", val: "185 000 $ net net net" },
      { label: "Ajustement à la juste valeur marchande", val: "+65 000 $ / an (Inclus au modèle)" },
      { label: "Option d'achat de la bâtisse en première priorité", val: "Accordée à l'acquéreur de l'entreprise", highlight: true },
      { label: "Date d'échéance du bail actuel", val: "31 décembre 2032" }
    ],
    note: "La société immobilière liée au cédant accepte un bail renouvelable de 10 ans avec option d'achat à 2,8 M$."
  },
  "Inventaire_Equipements_Valeur_Liquidative.pdf": {
    title: "Inventaire & Évaluation Liquidative de la Flotte et Équipements",
    firm: "ÉVALUATIONS INDUSTRIELLES DU QUÉBEC INC.",
    date: "SEPTEMBRE 2026",
    rows: [
      { label: "Valeur aux livres nette comptable (VNC)", val: "1 420 000 $ CAD" },
      { label: "Valeur ordonnée de liquidation", val: "2 150 000 $ CAD" },
      { label: "Juste valeur marchande en exploitation continue (OLV)", val: "3 280 000 $ CAD", highlight: true },
      { label: "Dette résiduelle sur crédit-bail machinerie", val: "280 000 $ CAD (Prise en charge déduite)" }
    ],
    note: "Toutes les machines CNC 5 axes sont entretenues selon le protocole constructeur. Zéro arriéré d'entretien."
  },
  "Organigramme_Personnel_Cle_Retention.pdf": {
    title: "Organigramme Opérationnel & Ententes de Rétention des Cadres",
    firm: "NEXUS CTE · PLAN DE TRANSITION DE RELÈVE",
    date: "OCTOBRE 2026",
    rows: [
      { label: "Directeur des opérations (22 ans d'ancienneté)", val: "Entente de rétention 24 mois signée" },
      { label: "Contremaître d'atelier & 3 machinistes chevronnés", val: "Clauses de non-sollicitation actives" },
      { label: "Directrice financière & approvisionnements", val: "Prête pour cogestion avec le repreneur" },
      { label: "Masse salariale totale normalisée", val: "1 840 000 $ CAD / an", highlight: true }
    ],
    note: "L'équipe de 45 employés est 100% autonome sur les opérations quotidiennes sans dépendance directe au cédant."
  }
};

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupValuationLab();
  setupDataroomViewer();
});

// Toast notification helper
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>${msg}</span>`;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
}

// Navigation handling
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view-content");
  const breadcrumb = document.getElementById("active-breadcrumb");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.getAttribute("data-tab");
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      views.forEach(v => v.classList.add("hidden"));
      const targetView = document.getElementById(`view-${tab}`);
      if (targetView) targetView.classList.remove("hidden");

      const label = item.querySelector("span").textContent;
      if (breadcrumb) breadcrumb.textContent = label;
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  });

  const btnNouveau = document.getElementById("btn-nouveau-mandat");
  if (btnNouveau) {
    btnNouveau.addEventListener("click", () => {
      showToast("Assistant de qualification de cédant ouvert (Prise d'information confidentielle Loi 25).");
    });
  }
}

// Valuation & Normalization Lab
function setupValuationLab() {
  const mandateSelect = document.getElementById("val-mandate-select");
  const revenueInput = document.getElementById("val-revenue");
  const reportedEbitdaInput = document.getElementById("val-reported-ebitda");
  const salaryAdjInput = document.getElementById("val-salary-adj");
  const chkVehicules = document.getElementById("chk-vehicules");
  const chkLoyer = document.getElementById("chk-loyer");
  const chkNonrec = document.getElementById("chk-nonrec");
  const sliderMultiple = document.getElementById("slider-multiple");

  const dispMultiple = document.getElementById("disp-multiple");
  const dispEv = document.getElementById("disp-ev");
  const dispEbitdaNorm = document.getElementById("disp-ebitda-norm");
  const dispBaseEbitda = document.getElementById("disp-base-ebitda");
  const dispAddSalary = document.getElementById("disp-add-salary");
  const dispAddPerks = document.getElementById("disp-add-perks");
  const dispAddRent = document.getElementById("disp-add-rent");
  const dispFinalNorm = document.getElementById("disp-final-norm");
  const dispMultipleApplied = document.getElementById("disp-multiple-applied");

  function recalculate() {
    const baseEbitda = parseFloat(reportedEbitdaInput.value) || 0;
    const salaryAdj = parseFloat(salaryAdjInput.value) || 0;
    const perks = chkVehicules.checked ? 35000 : 0;
    const rentAdj = (chkLoyer.checked ? 65000 : 0) + (chkNonrec.checked ? 40000 : 0);
    const multiple = parseFloat(sliderMultiple.value) || 4.8;

    const normEbitda = baseEbitda + salaryAdj + perks + rentAdj;
    const enterpriseValue = normEbitda * multiple;

    if (dispMultiple) dispMultiple.textContent = `${multiple.toFixed(1)}x Multiple`;
    if (dispMultipleApplied) dispMultipleApplied.textContent = `${multiple.toFixed(2)}x`;
    if (dispBaseEbitda) dispBaseEbitda.textContent = `${baseEbitda.toLocaleString('fr-CA')} $`;
    if (dispAddSalary) dispAddSalary.textContent = `+${salaryAdj.toLocaleString('fr-CA')} $`;
    if (dispAddPerks) dispAddPerks.textContent = `+${perks.toLocaleString('fr-CA')} $`;
    if (dispAddRent) dispAddRent.textContent = `+${rentAdj.toLocaleString('fr-CA')} $`;
    if (dispFinalNorm) dispFinalNorm.textContent = `${normEbitda.toLocaleString('fr-CA')} $ CAD`;

    if (dispEv) dispEv.innerHTML = `${Math.round(enterpriseValue).toLocaleString('fr-CA')} $ <small>CAD</small>`;
    if (dispEbitdaNorm) dispEbitdaNorm.innerHTML = `Sur un EBITDA normalisé de <strong>${normEbitda.toLocaleString('fr-CA')} $ CAD</strong>`;
  }

  [reportedEbitdaInput, salaryAdjInput, chkVehicules, chkLoyer, chkNonrec, sliderMultiple].forEach(el => {
    if (el) el.addEventListener("input", recalculate);
  });

  if (mandateSelect) {
    mandateSelect.addEventListener("change", () => {
      const selected = MANDATES_DATA[mandateSelect.value];
      if (selected) {
        revenueInput.value = selected.revenue;
        reportedEbitdaInput.value = selected.reportedEbitda;
        salaryAdjInput.value = selected.salaryAdj;
        sliderMultiple.value = selected.multiple;
        recalculate();
        showToast(`Paramètres financiers chargés pour ${selected.name}`);
      }
    });
  }

  const btnSave = document.getElementById("btn-save-valuation");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      showToast("Rapport de valorisation normalisé généré & exporté sous filigrane sécurisé !");
    });
  }

  const btnReset = document.getElementById("btn-reset-val");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (mandateSelect) mandateSelect.value = "boreal";
      revenueInput.value = 3800000;
      reportedEbitdaInput.value = 540000;
      salaryAdjInput.value = 140000;
      sliderMultiple.value = 4.8;
      chkVehicules.checked = true;
      chkLoyer.checked = true;
      chkNonrec.checked = true;
      recalculate();
      showToast("Valeurs remises à l'état de référence.");
    });
  }

  recalculate();
}

// Navigation Shortcut Helpers
window.openValuationFor = function(name, revenue, ebitda, multiple) {
  const navValuation = document.querySelector('[data-tab="valuation"]');
  if (navValuation) navValuation.click();

  const revInput = document.getElementById("val-revenue");
  const ebitdaInput = document.getElementById("val-reported-ebitda");
  const multSlider = document.getElementById("slider-multiple");

  if (revInput) revInput.value = revenue;
  if (ebitdaInput) ebitdaInput.value = ebitda;
  if (multSlider) multSlider.value = multiple;

  const event = new Event('input', { bubbles: true });
  if (multSlider) multSlider.dispatchEvent(event);

  showToast(`Modélisation ouverte pour ${name}`);
};

window.openDataroomFor = function(mandateName) {
  const navDataroom = document.querySelector('[data-tab="dataroom"]');
  if (navDataroom) navDataroom.click();
  showToast(`Accès sécurisé ouvert pour la Dataroom de ${mandateName}`);
};

// Virtual Dataroom Document Viewer
function setupDataroomViewer() {
  window.previewDoc = function(filename) {
    const docData = VDR_DOCUMENTS[filename];
    if (!docData) return;

    // Update active row
    document.querySelectorAll(".vdr-file-item").forEach(item => item.classList.remove("active"));
    const clickedItem = Array.from(document.querySelectorAll(".vdr-file-item")).find(el => el.textContent.includes(filename));
    if (clickedItem) clickedItem.classList.add("active");

    const titleEl = document.getElementById("preview-doc-title");
    const previewBox = document.querySelector(".vdr-preview-box");
    if (!previewBox) return;

    const docSheet = previewBox.querySelector(".doc-sheet");
    if (!docSheet) return;

    docSheet.innerHTML = `
      <div class="doc-header">
        <span>${docData.firm}</span>
        <span>${docData.date}</span>
      </div>
      <h3 id="preview-doc-title">${docData.title}</h3>
      <div class="doc-body-text">
        <p>Document officiel vérifié sous mandat de confidentialité Nexus CTE :</p>
        <div class="doc-table">
          ${docData.rows.map(r => `
            <div class="doc-tr ${r.highlight ? 'highlight' : ''}">
              <span>${r.label}</span>
              <strong>${r.val}</strong>
            </div>
          `).join("")}
        </div>
        <p style="font-size:11px; color:#94a3b8; font-style:italic; margin-top:14px;">
          Note de conformité : ${docData.note}
        </p>
      </div>
    `;

    showToast(`Affichage du document vérifié : ${filename}`);
  };
}
