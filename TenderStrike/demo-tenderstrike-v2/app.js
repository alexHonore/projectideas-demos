// TenderStrike v2 — Public Procurement Intelligence Engine
// Complete SEAO Procurement Workflow with X-Ray Devis, Pricing Oracle, and Compliance Shield

const TENDERS_DB = {
  saintbruno: {
    id: "TS-2026-087",
    seaoNumber: "1894210",
    title: "Ville de Saint-Bruno · Déneigement des Chaussées et Trottoirs (Secteur Ouest · 3 Saisons)",
    buyer: "Ville de Saint-Bruno-de-Montarville",
    region: "Montérégie",
    category: "Déneigement",
    daysLeft: "5j 18h",
    compatibility: 96,
    targetPriceRange: "1 180 000 $ - 1 245 000 $",
    lastWinner: "Déneigement Rive-Nord (1 194 000 $)",
    bondReq: "10% (121 000 $)",
    costBaseline: 885720,
    defaultBid: 1210000,
    term: "3 saisons",
    traps: [
      { icon: "📍", title: "Visite des lieux obligatoire : Ce jeudi à 10h00", desc: "Présence obligatoire constatée au garage municipal. Défaut = Rejet automatique de la soumission sans recours (Clause 1.4)." },
      { icon: "⏱️", title: "Temps de réponse maximal : 45 minutes", desc: "Pénalité de 500 $ / heure de retard lors d'accumulations de neige supérieures à 5 cm (Clause 8.1)." },
      { icon: "🛡️", title: "Assurance responsabilité civile : 5 000 000 $ requise", desc: "Votre certificat en coffre-fort couvre 5 000 000 $ (Intact Assurance valide jusqu'au 31 août 2027) · Conforme." }
    ],
    annexes: {
      annexeA: "Formulaire Officiel de Soumission Ville de Saint-Bruno — Signataire : Alexandre Roy (Propriétaire)",
      annexeB: "Bordereau de Prix Unitaires : 403 333,33 $ CAD / saison (Total 3 saisons : 1 210 000,00 $ CAD avant taxes)",
      annexeC: "Déclaration Solennelle d'Absence de Collusion — Déposée sous serment selon la Loi sur les cités et villes",
      annexeD: "3 Références Municipales Vérifiées : Boucherville (2023-2025), Beloeil (2022-2024), Sainte-Julie (2021-2023)",
      cautionnement: "Cautionnement Numérique 10% (121 000 $) émis par Beneva / La Capitale Assurance Générale"
    }
  },
  longueuil: {
    id: "TS-2026-088",
    seaoNumber: "1895044",
    title: "Ville de Longueuil · Réfection d'Aqueduc et Trottoirs Béton (Rue Saint-Charles)",
    buyer: "Ville de Longueuil",
    region: "Montérégie",
    category: "Génie Civil",
    daysLeft: "11j",
    compatibility: 88,
    targetPriceRange: "2 240 000 $ - 2 390 000 $",
    lastWinner: "Excavation Rive-Sud (2 280 000 $)",
    bondReq: "10% (235 000 $)",
    costBaseline: 1740000,
    defaultBid: 2310000,
    term: "Contrat 18 mois",
    traps: [
      { icon: "🚧", title: "Maintien de la circulation commerciale", desc: "Entrave maximale de 48 heures consécutives sous peine de pénalité de 1 200 $ / jour." },
      { icon: "💧", title: "Alimentation temporaire en eau potable", desc: "Installation d'un réseau provisoire hors-gel certifié BNQ pour 42 résidences riveraines." },
      { icon: "🛡️", title: "Licence RBQ 1.3 Travaux de Génie Civil", desc: "Vérifiée au registre de la Régie du Bâtiment du Québec sans restriction." }
    ],
    annexes: {
      annexeA: "Formulaire de Soumission Longueuil — Travaux d'infrastructures souterraines",
      annexeB: "Bordereau Unitaire Génie Civil : 2 310 000,00 $ CAD avant taxes",
      annexeC: "Engagement de conformité environnementale et gestion des remblais",
      annexeD: "Projets majeurs d'aqueduc réalisés à Saint-Lambert et Boucherville",
      cautionnement: "Cautionnement de soumission 10% (231 000 $) délivré électroniquement"
    }
  },
  csspatriotes: {
    id: "TS-2026-089",
    seaoNumber: "1896120",
    title: "CSS des Patriotes · Entretien Préventif des Systèmes CVC (12 Écoles Primaires)",
    buyer: "Centre de Services Scolaire des Patriotes",
    region: "Montérégie",
    category: "CVC / Bâtiment",
    daysLeft: "14j",
    compatibility: 82,
    targetPriceRange: "815 000 $ - 860 000 $",
    lastWinner: "Ventilation Rive-Sud (824 000 $)",
    bondReq: "5% (42 000 $)",
    costBaseline: 610000,
    defaultBid: 835000,
    term: "2 ans renouvelable",
    traps: [
      { icon: "🏫", title: "Horaires stricts hors présence élèves", desc: "Travaux autorisés uniquement de 16h00 à 23h00 et fins de semaine." },
      { icon: "🔍", title: "Vérification des antécédents judiciaires", desc: "Déclaration d'antécédents requise pour chaque technicien accédant aux établissements scolaires." },
      { icon: "🛡️", title: "Certification frigoriste & gaz naturel", desc: "Présentation des cartes de compétences CCQ pour chaque ouvrier assigné." }
    ],
    annexes: {
      annexeA: "Formulaire d'offre de services CSS des Patriotes",
      annexeB: "Bordereau annuel d'entretien préventif CVC : 417 500,00 $ CAD / an",
      annexeC: "Formulaires de filtrage sécuritaire des techniciens",
      annexeD: "Références en milieu institutionnel scolaire (Commission scolaire Marguerite-Bourgeoys)",
      cautionnement: "Lettre de garantie bancaire 5% (41 750 $)"
    }
  }
};

let activeTenderKey = "saintbruno";

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupOracleSimulator();
  setupActionButtons();
  setupFilterPills();
  setupModalPreviews();
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
}

// Category filter pills in Radar view
function setupFilterPills() {
  const pills = document.querySelectorAll(".filter-pills .f-pill");
  const rows = document.querySelectorAll(".tenders-list .tender-row");

  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");

      const cat = pill.textContent.split(" ")[0].trim();
      rows.forEach(row => {
        if (cat === "Tout") {
          row.style.display = "flex";
        } else if (row.textContent.includes(cat)) {
          row.style.display = "flex";
        } else {
          row.style.display = "none";
        }
      });
      showToast(`Filtre appliqué : ${cat}`);
    });
  });
}

// Load a specific tender into the entire suite
window.loadTender = function(key) {
  const tender = TENDERS_DB[key];
  if (!tender) return;
  activeTenderKey = key;

  // Update slider min/max/value
  const slider = document.getElementById("slider-bid");
  if (slider) {
    slider.min = Math.round(tender.costBaseline * 1.1);
    slider.max = Math.round(tender.defaultBid * 1.25);
    slider.value = tender.defaultBid;
    slider.dispatchEvent(new Event('input'));
  }

  // Update Traps in X-Ray
  const trapsBox = document.querySelector(".traps-box");
  if (trapsBox) {
    trapsBox.innerHTML = `
      <div class="traps-title">⚠️ ${tender.traps.length} CLAUSES CRITIQUES EXTRAITES (${tender.buyer})</div>
      ${tender.traps.map(t => `
        <div class="trap-item">
          <div class="trap-icon">${t.icon}</div>
          <div class="trap-content">
            <strong>${t.title}</strong>
            <p>${t.desc}</p>
          </div>
        </div>
      `).join("")}
    `;
  }

  // Update Auto-Assembly list
  const assemblyFiles = document.querySelector(".assembly-files");
  if (assemblyFiles && tender.annexes) {
    assemblyFiles.innerHTML = `
      <h4>Pièces Administratives Générées · ${tender.buyer}</h4>
      <div class="doc-row" onclick="previewDossierDoc('annexeA')">
        <span>📄 Annexe A — Formulaire Officiel de Soumission</span>
        <strong class="emerald-text">Complété & Signé ↗</strong>
      </div>
      <div class="doc-row" onclick="previewDossierDoc('annexeB')">
        <span>📄 Annexe B — Bordereau des Prix Unitaires (${tender.defaultBid.toLocaleString('fr-CA')} $ CAD)</span>
        <strong class="emerald-text">Complété & Signé ↗</strong>
      </div>
      <div class="doc-row" onclick="previewDossierDoc('annexeC')">
        <span>📄 Annexe C — Déclaration Solennelle de Non-Collusion</span>
        <strong class="emerald-text">Complété & Signé ↗</strong>
      </div>
      <div class="doc-row" onclick="previewDossierDoc('annexeD')">
        <span>📄 Annexe D — Fiches de 3 Projets Comparables Réalisés</span>
        <strong class="emerald-text">Sélectionnés Auto ↗</strong>
      </div>
      <div class="doc-row" onclick="previewDossierDoc('cautionnement')">
        <span>📄 Cautionnement Numérique ${tender.bondReq}</span>
        <strong class="emerald-text">Scellé ↗</strong>
      </div>
    `;
  }

  showToast(`Dossier actif : ${tender.buyer} (SEAO #${tender.seaoNumber})`);
};

// Interactive Pricing Oracle Simulator
function setupOracleSimulator() {
  const slider = document.getElementById("slider-bid");
  const dispPrice = document.getElementById("disp-bid-price");
  const dispWinProb = document.getElementById("disp-win-prob");
  const dispWinSub = document.getElementById("disp-win-sub");
  const dispMargin = document.getElementById("disp-bid-margin");
  const dispSeason = document.getElementById("disp-season-price");

  function recalculate() {
    const tender = TENDERS_DB[activeTenderKey] || TENDERS_DB.saintbruno;
    const price = parseFloat(slider.value) || tender.defaultBid;
    dispPrice.textContent = `${price.toLocaleString('fr-CA')} $ CAD`;

    const seasonPrice = Math.round(price / 3);
    dispSeason.textContent = `${seasonPrice.toLocaleString('fr-CA')} $ / an`;

    const cost = tender.costBaseline;
    const grossProfit = price - cost;
    const marginPct = ((grossProfit / price) * 100).toFixed(1);
    dispMargin.textContent = `${marginPct}% (${Math.round(grossProfit).toLocaleString('fr-CA')} $)`;

    // Probability calculation relative to baseline default bid
    const target = tender.defaultBid;
    const ratio = price / target;
    let prob = 0;
    let sub = "";

    if (ratio < 0.96) {
      prob = 96.5;
      sub = "Probabilité maximale, mais attention à la rentabilité d'exécution";
    } else if (ratio <= 1.01) {
      prob = 87.4;
      sub = "Corridor optimal : Prix compétitif et marge saine (Sécurisé)";
    } else if (ratio <= 1.05) {
      prob = 62.1;
      sub = "Concurrentiel si le rival principal ajuste ses tarifs à la hausse";
    } else if (ratio <= 1.10) {
      prob = 34.5;
      sub = "Risque élevé : Dépasse la moyenne historique d'ouverture";
    } else {
      prob = 12.0;
      sub = "Très faible probabilité de remporter l'adjudication";
    }

    dispWinProb.textContent = `${prob.toFixed(1)}%`;
    dispWinSub.textContent = sub;

    if (prob > 70) {
      dispWinProb.className = "bm-val emerald-text";
    } else if (prob > 40) {
      dispWinProb.className = "bm-val amber-text";
    } else {
      dispWinProb.className = "bm-val";
      dispWinProb.style.color = "#ef4444";
    }
  }

  if (slider) {
    slider.addEventListener("input", recalculate);
    recalculate();
  }

  const lockBtn = document.getElementById("btn-lock-price");
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      const price = parseFloat(slider.value) || 1210000;
      showToast(`Prix de ${price.toLocaleString('fr-CA')} $ verrouillé dans le Bordereau Officiel SEAO !`);
      const assemblyTab = document.querySelector('[data-tab="assembly"]');
      if (assemblyTab) assemblyTab.click();
    });
  }
}

// Global quick actions
window.openXRayForFeatured = function() {
  loadTender('saintbruno');
  const xrayTab = document.querySelector('[data-tab="xray"]');
  if (xrayTab) xrayTab.click();
  showToast("Radiographie 180 pages chargée pour Ville de Saint-Bruno.");
};

window.openOracleSimulator = function() {
  loadTender('saintbruno');
  const oracleTab = document.querySelector('[data-tab="oracle"]');
  if (oracleTab) oracleTab.click();
  showToast("Simulateur Oracle des Prix ouvert.");
};

// Document Preview Modal in Auto-Assembly
function setupModalPreviews() {
  window.previewDossierDoc = function(annexeKey) {
    const tender = TENDERS_DB[activeTenderKey] || TENDERS_DB.saintbruno;
    const docText = tender.annexes[annexeKey];
    if (!docText) return;

    showToast(`Inspection du document scellé : ${docText.split('—')[0]}`);
  };
}

// Setup Action Buttons
function setupActionButtons() {
  const exportTop = document.getElementById("btn-export-dossier-top");
  if (exportTop) {
    exportTop.addEventListener("click", () => {
      const assemblyTab = document.querySelector('[data-tab="assembly"]');
      if (assemblyTab) assemblyTab.click();
    });
  }

  const finalDownload = document.getElementById("btn-final-download");
  if (finalDownload) {
    finalDownload.addEventListener("click", () => {
      const tender = TENDERS_DB[activeTenderKey] || TENDERS_DB.saintbruno;
      showToast(`Génération du paquet scellé... Téléchargement prêt (Dossier_Soumission_${tender.region}_SEAO.zip)`);
    });
  }
}
