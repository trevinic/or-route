/**
 * OR-Route - Logica Applicativa Frontend
 * Gestione Multi-Modello (CVRP, VRPTW, CARP, EV/IF), Canvas Rendering,
 * Wizard di Selezione Aziendale, e Calcolatore ROI.
 */

// Stato Applicazione Globale
const State = {
  activeTab: 'tab-carp',
  cvrpConfig: null,
  cvrpResult: null,
  vrptwConfig: null,
  vrptwResult: null,
  carpConfig: null,
  carpResult: null,
  evConfig: null,
  evResult: null,
  vrppdConfig: null,
  vrppdResult: null,
  mdvrpConfig: null,
  mdvrpResult: null,
  vehicleColors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'],
  leafletMaps: {}
};

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, duration = 3500) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.innerText = message;
  toast.style.display = 'block';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

// ==========================================
// TAB SWITCHER
// ==========================================
function switchModelFromDropdown(tabId) {
  if (tabId) {
    switchMainTab(tabId, null);
  }
}

function switchMainTab(tabId, btnElement) {
  State.activeTab = tabId;
  
  // Sincronizza il menù a tendina Modelli nella barra header
  const headerSelect = document.getElementById('headerModelSelect');
  if (headerSelect) {
    const hasOption = !!headerSelect.querySelector(`option[value="${tabId}"]`);
    headerSelect.value = hasOption ? tabId : '';
  }

  // Aggiorna classi bottoni navigazione se presenti
  document.querySelectorAll('.model-tab').forEach(b => b.classList.remove('active'));
  if (btnElement && btnElement.classList && btnElement.classList.contains('model-tab')) {
    btnElement.classList.add('active');
  } else {
    const navBtn = document.getElementById('tabBtn' + tabId.replace('tab-', '').charAt(0).toUpperCase() + tabId.replace('tab-', '').slice(1)) 
                || document.querySelector(`.model-tab[onclick*="'${tabId}'"]`);
    if (navBtn) navBtn.classList.add('active');
  }

  // Mostra/nascondi sezioni
  const sections = ['tab-selector', 'tab-cvrp', 'tab-vrptw', 'tab-carp', 'tab-intermediate', 'tab-vrppd', 'tab-mdvrp', 'tab-roi', 'tab-faq'];
  sections.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === tabId) ? 'block' : 'none';
  });

  // Riporta sempre la visualizzazione in cima alla scheda selezionata
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const targetSection = document.getElementById(tabId);
  if (targetSection) {
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Aggiorna l'hash URL per consentire ricaricamento o link diretto
  try {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, null, '#' + tabId);
    }
  } catch (_) {}

  // Render o caricamento se non ancora eseguito (SENZA auto-solving)
  if (tabId === 'tab-cvrp') {
    if (!State.cvrpConfig) loadCvrpConfig();
    else drawRouteCanvas('cvrpCanvas', State.cvrpConfig, State.cvrpResult || null);
  } else if (tabId === 'tab-vrptw') {
    if (!State.vrptwConfig) loadVrptwConfig();
    else drawRouteCanvas('vrptwCanvas', State.vrptwConfig, State.vrptwResult || null);
  } else if (tabId === 'tab-carp') {
    if (!State.carpConfig) loadCarpConfig();
  } else if (tabId === 'tab-intermediate') {
    if (!State.evConfig) loadEvConfig();
    else drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
  } else if (tabId === 'tab-vrppd') {
    if (!State.vrppdConfig) loadVrppdConfig();
    else drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, State.vrppdResult || null);
  } else if (tabId === 'tab-mdvrp') {
    if (!State.mdvrpConfig) loadMdvrpConfig();
    else drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  }

  // Invalida dimensione mappa Leaflet dopo la visualizzazione per garantire il rendering fluido delle mattonelle Stradario
  setTimeout(() => {
    const mapIdMap = {
      'tab-cvrp': 'cvrpMap',
      'tab-vrptw': 'vrptwMap',
      'tab-intermediate': 'evMap',
      'tab-vrppd': 'vrppdMap',
      'tab-mdvrp': 'mdvrpMap'
    };
    const targetMapId = mapIdMap[tabId];
    if (targetMapId && State.leafletMaps && State.leafletMaps[targetMapId]) {
      try { State.leafletMaps[targetMapId].invalidateSize(); } catch (_) {}
    }
  }, 120);
}

// ==========================================
// 1. WIZARD: SELETTORE GUIDATO E FLOTTA ETEROGENEA
// ==========================================
const wizardAnswers = {
  type: 'streets',
  pickupDelivery: 'no',
  multiDepot: 'no',
  timeWindows: 'no',
  intermediate: 'no',
  stopMinutes: 6.0,
  recommendedModel: 'carp',
  fleetCategories: [
    {
      id: 'cat_furgoni',
      name: 'Furgone Patente B (City)',
      qty: 2,
      capacity: 1500,
      driverRate: 20.0,
      crewSize: 1,
      shiftHours: 7.0,
      vehicleDaily: 25.0,
      calculatedFixedCost: 165.0,
      costPerKm: 0.90
    },
    {
      id: 'cat_compattatori',
      name: 'Compattatore Medio 2 Assi',
      qty: 2,
      capacity: 4500,
      driverRate: 22.0,
      crewSize: 1,
      shiftHours: 7.0,
      vehicleDaily: 35.0,
      calculatedFixedCost: 189.0,
      costPerKm: 1.25
    }
  ]
};

function selectWizardOption(step, value, btn) {
  wizardAnswers[step] = value;
  
  if (btn) {
    const container = btn.closest('.wizard-options');
    if (container) {
      container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }
  }
  
  evaluateWizard();
}

function renderWizardFleetTable() {
  const tbody = document.getElementById('wizardFleetBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  wizardAnswers.fleetCategories.forEach((cat, idx) => {
    // Ricalcolo costo fisso riga
    cat.calculatedFixedCost = (cat.driverRate * cat.crewSize * cat.shiftHours) + cat.vehicleDaily;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${cat.name}" onchange="updateWizardFleetCategory(${idx}, 'name', this.value)">
      </td>
      <td>
        <input type="number" class="cell-inp" style="width: 100%; text-align: center;" min="1" max="50" value="${cat.qty}" onchange="updateWizardFleetCategory(${idx}, 'qty', parseInt(this.value)||1)">
      </td>
      <td>
        <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="100" max="50000" step="100" value="${cat.capacity}" onchange="updateWizardFleetCategory(${idx}, 'capacity', parseFloat(this.value)||1000)">
      </td>
      <td>
        <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="10" max="100" step="1" value="${cat.driverRate}" onchange="updateWizardFleetCategory(${idx}, 'driverRate', parseFloat(this.value)||20)">
      </td>
      <td>
        <select class="cell-inp" style="width: 100%;" onchange="updateWizardFleetCategory(${idx}, 'crewSize', parseInt(this.value)||1)">
          <option value="1" ${cat.crewSize === 1 ? 'selected' : ''}>1 (Solo autista)</option>
          <option value="2" ${cat.crewSize === 2 ? 'selected' : ''}>2 (Autista+Operatore)</option>
        </select>
      </td>
      <td>
        <input type="number" class="cell-inp" style="width: 100%; text-align: center;" min="4" max="14" step="0.5" value="${cat.shiftHours}" onchange="updateWizardFleetCategory(${idx}, 'shiftHours', parseFloat(this.value)||7)">
      </td>
      <td>
        <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0" max="500" step="5" value="${cat.vehicleDaily}" onchange="updateWizardFleetCategory(${idx}, 'vehicleDaily', parseFloat(this.value)||0)">
      </td>
      <td style="font-weight: 700; color: #34d399; font-size: 13.5px; text-align: right; padding-right: 10px;">
        ${cat.calculatedFixedCost.toFixed(2)} €
      </td>
      <td>
        <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0.2" max="10.0" step="0.05" value="${cat.costPerKm}" onchange="updateWizardFleetCategory(${idx}, 'costPerKm', parseFloat(this.value)||1.2)">
      </td>
      <td style="text-align: center;">
        <button class="btn-del" onclick="removeWizardFleetRow(${idx})" title="Rimuovi tipologia mezzo">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  recalcWizardFleetTotals();
}

function updateWizardFleetCategory(index, field, value) {
  if (index >= 0 && index < wizardAnswers.fleetCategories.length) {
    wizardAnswers.fleetCategories[index][field] = value;
    // Ricalcolo del costo fisso
    const cat = wizardAnswers.fleetCategories[index];
    cat.calculatedFixedCost = (cat.driverRate * cat.crewSize * cat.shiftHours) + cat.vehicleDaily;
    renderWizardFleetTable();
    evaluateWizard();
  }
}

function addWizardFleetRow() {
  const newIdx = wizardAnswers.fleetCategories.length + 1;
  wizardAnswers.fleetCategories.push({
    id: `cat_custom_${Date.now()}`,
    name: `Nuova Tipologia Mezzo ${newIdx}`,
    qty: 1,
    capacity: 3500,
    driverRate: 22.0,
    crewSize: 1,
    shiftHours: 7.0,
    vehicleDaily: 30.0,
    calculatedFixedCost: 184.0,
    costPerKm: 1.20
  });
  renderWizardFleetTable();
  evaluateWizard();
  showToast('Nuova tipologia di mezzo aggiunta alla flotta!');
}

function removeWizardFleetRow(index) {
  if (wizardAnswers.fleetCategories.length <= 1) {
    showToast('È necessario mantenere almeno una tipologia di mezzo nella flotta!');
    return;
  }
  wizardAnswers.fleetCategories.splice(index, 1);
  renderWizardFleetTable();
  evaluateWizard();
}

function loadWizardFleetPreset(presetType) {
  if (presetType === 'rsu_mixed') {
    wizardAnswers.fleetCategories = [
      {
        id: 'cat_vasca',
        name: 'Furgone Vasca Ribaltabile (Patente B)',
        qty: 2,
        capacity: 1500,
        driverRate: 20.0,
        crewSize: 1,
        shiftHours: 7.0,
        vehicleDaily: 25.0,
        calculatedFixedCost: 165.0,
        costPerKm: 0.90
      },
      {
        id: 'cat_comp2assi',
        name: 'Compattatore Posteriore 2 Assi',
        qty: 3,
        capacity: 4500,
        driverRate: 22.0,
        crewSize: 2,
        shiftHours: 7.0,
        vehicleDaily: 45.0,
        calculatedFixedCost: 353.0,
        costPerKm: 1.35
      }
    ];
  } else if (presetType === 'express_delivery') {
    wizardAnswers.fleetCategories = [
      {
        id: 'cat_cityvan',
        name: 'City Van Consegne Rapide',
        qty: 3,
        capacity: 1200,
        driverRate: 20.0,
        crewSize: 1,
        shiftHours: 7.5,
        vehicleDaily: 22.0,
        calculatedFixedCost: 172.0,
        costPerKm: 0.85
      },
      {
        id: 'cat_vanmaxi',
        name: 'Furgone Gran Volume Maxi',
        qty: 2,
        capacity: 2500,
        driverRate: 22.0,
        crewSize: 1,
        shiftHours: 7.5,
        vehicleDaily: 32.0,
        calculatedFixedCost: 197.0,
        costPerKm: 1.05
      }
    ];
  } else if (presetType === 'heavy_haul') {
    wizardAnswers.fleetCategories = [
      {
        id: 'cat_motrice2assi',
        name: 'Motrice Pesante 2 Assi (RSU/Merci)',
        qty: 2,
        capacity: 5000,
        driverRate: 22.0,
        crewSize: 1,
        shiftHours: 7.0,
        vehicleDaily: 40.0,
        calculatedFixedCost: 194.0,
        costPerKm: 1.35
      },
      {
        id: 'cat_camion3assi',
        name: 'Camion Pesante 3 Assi / Scarrabile',
        qty: 2,
        capacity: 11000,
        driverRate: 24.0,
        crewSize: 2,
        shiftHours: 7.0,
        vehicleDaily: 75.0,
        calculatedFixedCost: 411.0,
        costPerKm: 1.95
      }
    ];
  } else {
    // Monotipo Standard
    wizardAnswers.fleetCategories = [
      {
        id: 'cat_standard',
        name: 'Compattatore Medio 2 Assi Standard',
        qty: 3,
        capacity: 4500,
        driverRate: 22.0,
        crewSize: 1,
        shiftHours: 7.0,
        vehicleDaily: 35.0,
        calculatedFixedCost: 189.0,
        costPerKm: 1.20
      }
    ];
  }

  renderWizardFleetTable();
  evaluateWizard();
  showToast(`Preset flotta applicato con successo!`);
}

function recalcWizardFleetTotals() {
  let totVehicles = 0;
  let totCapacity = 0;
  let totFixedCost = 0;
  let weightedKmCostSum = 0;

  wizardAnswers.fleetCategories.forEach(cat => {
    totVehicles += cat.qty;
    totCapacity += (cat.qty * cat.capacity);
    totFixedCost += (cat.qty * cat.calculatedFixedCost);
    weightedKmCostSum += (cat.qty * cat.costPerKm);
  });

  const avgKmCost = totVehicles > 0 ? (weightedKmCostSum / totVehicles) : 1.20;

  const vehEl = document.getElementById('wizTotalVehicles');
  if (vehEl) vehEl.innerText = `${totVehicles} mezzi`;

  const capEl = document.getElementById('wizTotalCapacity');
  if (capEl) capEl.innerText = `${totCapacity.toLocaleString('it-IT')} kg`;

  const fixEl = document.getElementById('wizTotalFixedCost');
  if (fixEl) fixEl.innerText = `${totFixedCost.toFixed(2)} €/turno`;

  const kmEl = document.getElementById('wizAvgCostKm');
  if (kmEl) kmEl.innerText = `${avgKmCost.toFixed(2)} €/km`;

  // Badge Riepilogo Flotta
  const summaryParts = wizardAnswers.fleetCategories.map(c => `${c.qty}x ${c.name}`);
  const badgeSummary = document.getElementById('wizBadgeFleetSummary');
  if (badgeSummary) badgeSummary.innerText = summaryParts.join(' + ') || '--';

  const badgeCap = document.getElementById('wizBadgeCapacity');
  if (badgeCap) badgeCap.innerText = `${totCapacity.toLocaleString('it-IT')} kg`;

  const badgeFix = document.getElementById('wizBadgeFixedCost');
  if (badgeFix) badgeFix.innerText = `${totFixedCost.toFixed(2)} €/turno`;

  const badgeKm = document.getElementById('wizBadgeCostKm');
  if (badgeKm) badgeKm.innerText = `${avgKmCost.toFixed(2)} €/km`;
}

function evaluateWizard() {
  const resCard = document.getElementById('wizardResult');
  const title = document.getElementById('wizardModelTitle');
  const desc = document.getElementById('wizardModelDesc');
  const ctaBtn = document.getElementById('wizardCtaBtn');

  const stopMin = parseFloat(document.getElementById('wizStopMinutes')?.value) || 6.0;
  wizardAnswers.stopMinutes = stopMin;

  recalcWizardFleetTotals();

  if (!resCard) return;
  resCard.style.display = 'block';

  // Logica di raccomandazione modello
  if (wizardAnswers.pickupDelivery === 'yes') {
    wizardAnswers.recommendedModel = 'vrppd';
    if (title) title.innerText = '🎯 Modello Consigliato: VRPPD (Pickup and Delivery Problem)';
    if (desc) desc.innerText = 'La tua attività prevede ordini in cui ciascun cliente richiede un ritiro e una successiva consegna effettuati dallo stesso mezzo nel corso del medesimo giro (corrieri espressi, navette merci, ritiri ingombranti e recapito a impianto). Il modello VRPPD sincronizza i percorsi rispettando la precedenza Ritiro ➔ Consegna e il carico dinamico a bordo.';
    if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello VRPPD Accoppiato ➔';

  } else if (wizardAnswers.multiDepot === 'yes') {
    wizardAnswers.recommendedModel = 'mdvrp';
    if (title) title.innerText = '🎯 Modello Consigliato: MDVRP (Multi-Depot Vehicle Routing Problem)';
    if (desc) desc.innerText = 'L\'azienda dispone di più magazzini territoriali, cantieri operativi o centri di raccolta dislocati. I veicoli partono e tornano al rispettivo Home Depot. Il modello MDVRP clusterizza e assegna in modo matematicamente ottimale i clienti al deposito più conveniente, eliminando sovrapposizioni e abbattendo i km di trasferimento.';
    if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello MDVRP Multi-Sito ➔';

  } else if (wizardAnswers.type === 'streets') {
    wizardAnswers.recommendedModel = 'carp';
    if (title) title.innerText = '🎯 Modello Consigliato: CARP (Capacitated Arc Routing Problem)';
    if (desc) desc.innerText = 'La tua flotta opera lungo la rete viaria continua (igiene urbana, raccolta differenziata porta a porta, spazzatrici, sgombero neve, pulizia caditoie, ispezione condotte). Il modello CARP ottimizza i tracciati su archi stradali, abbatte fino al 35% di transiti a vuoto (deadheading) e garantisce il 100% di copertura delle vie con il minor numero di mezzi.';
    if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello CARP & Apri Mappa GIS ➔';

  } else if (wizardAnswers.intermediate === 'yes') {
    wizardAnswers.recommendedModel = 'intermediate';
    if (title) title.innerText = '🎯 Modello Consigliato: WCVRPTW-IF / EV-VRP (Scarichi Intermedi o Flotta Elettrica)';
    if (desc) desc.innerText = 'I veicoli devono effettuare soste intermedie obbligatorie prima del rientro (svuotamento compattatori in impianti TMB/discariche o ricarica rapida alle colonnine DC per furgoni elettrici). Il modello gestisce cicli multipli con azzeramento di carico o ripristino della batteria a metà turno.';
    if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello con Impianti Intermedi ➔';

  } else if (wizardAnswers.timeWindows === 'yes') {
    wizardAnswers.recommendedModel = 'vrptw';
    if (title) title.innerText = '🎯 Modello Consigliato: VRPTW (Vehicle Routing with Time Windows)';
    if (desc) desc.innerText = 'I clienti richiedono consegne in orari tassativi (es. farmacie, supermercati con slot di scarico merci, alimentari deperibili, appuntamenti tecnici). Il modello VRPTW calcola gli itinerari garantendo il rispetto del 100% delle finestre temporali ed eliminando le attese a vuoto.';
    if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello VRPTW (Finestre Orarie) ➔';

  } else {
    wizardAnswers.recommendedModel = 'cvrp';
    if (title) title.innerText = '🎯 Modello Consigliato: CVRP (Capacitated Vehicle Routing Problem)';
    if (desc) desc.innerText = 'Distribuisci merci o pacchi a singoli indirizzi da un magazzino centrale con vincoli di carico massimo dei furgoni. Il modello CVRP standard minimizza i km totali percorsi e massimizza la saturazione dei veicoli (risparmio medio del 18-24% su carburante e flotta).';
    if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello CVRP Logistica ➔';
  }
}

async function applyWizardParametersToModel() {
  const model = wizardAnswers.recommendedModel || 'carp';
  
  // Unroll della flotta eterogenea definita dall'utente
  const concreteVehicles = [];
  wizardAnswers.fleetCategories.forEach(cat => {
    for (let i = 1; i <= cat.qty; i++) {
      const suffix = cat.qty > 1 ? `_${i}` : '';
      const cleanName = cat.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + suffix;
      concreteVehicles.push({
        name: cleanName,
        category: cat.name,
        capacity: cat.capacity,
        capacity_kg: cat.capacity,
        fixed_cost: cat.calculatedFixedCost,
        cost_per_km: cat.costPerKm
      });
    }
  });

  const totVehicles = concreteVehicles.length;
  const avgKmCost = concreteVehicles.reduce((acc, v) => acc + v.cost_per_km, 0) / (totVehicles || 1);

  if (model === 'carp') {
    if (!State.carpConfig) await loadCarpConfig();
    if (State.carpConfig) {
      State.carpConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity_kg: v.capacity_kg,
        fixed_cost: v.fixed_cost
      }));
      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.carpConfig)
        });
      } catch (e) { console.warn('Errore salvataggio config CARP:', e); }
    }
    renderCarpTables();
    switchMainTab('tab-carp', null);
    showToast(`Flotta eterogenea (${totVehicles} mezzi) applicata al CARP! Verifica le tratte, poi premi 'Risolvi'.`);

  } else if (model === 'vrppd') {
    if (!State.vrppdConfig) await loadVrppdConfig();
    if (State.vrppdConfig) {
      State.vrppdConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity: v.capacity,
        fixed_cost: v.fixed_cost,
        description: v.category
      }));
      State.vrppdConfig.cost_per_km = Math.round(avgKmCost * 100) / 100;
      try {
        await fetch('/api/vrppd/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.vrppdConfig)
        });
      } catch (e) { console.warn('Errore salvataggio VRPPD:', e); }
    }
    renderVrppdTables();
    switchMainTab('tab-vrppd', null);
    showToast(`Flotta eterogenea (${totVehicles} mezzi) applicata al VRPPD! Inserisci o verifica le coordinate, poi premi 'Risolvi'.`);

  } else if (model === 'mdvrp') {
    if (!State.mdvrpConfig) await loadMdvrpConfig();
    if (State.mdvrpConfig) {
      const depots = State.mdvrpConfig.depots || [];
      const numDepots = depots.length || 1;
      State.mdvrpConfig.vehicles = concreteVehicles.map((v, idx) => ({
        name: v.name,
        home_depot: depots[idx % numDepots] ? depots[idx % numDepots].id : 'DEP_1',
        capacity: v.capacity,
        fixed_cost: v.fixed_cost
      }));
      State.mdvrpConfig.cost_per_km = Math.round(avgKmCost * 100) / 100;
      try {
        await fetch('/api/mdvrp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.mdvrpConfig)
        });
      } catch (e) { console.warn('Errore salvataggio MDVRP:', e); }
    }
    renderMdvrpTables();
    switchMainTab('tab-mdvrp', null);
    showToast(`Flotta eterogenea (${totVehicles} mezzi) ripartita su MDVRP! Inserisci o verifica le coordinate, poi premi 'Risolvi'.`);

  } else if (model === 'vrptw') {
    if (!State.vrptwConfig) await loadVrptwConfig();
    if (State.vrptwConfig) {
      State.vrptwConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity: v.capacity,
        fixed_cost: v.fixed_cost
      }));
      State.vrptwConfig.cost_per_km = Math.round(avgKmCost * 100) / 100;
      try {
        await fetch('/api/vrptw/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.vrptwConfig)
        });
      } catch (e) { console.warn('Errore salvataggio VRPTW:', e); }
    }
    renderVrptwTables();
    switchMainTab('tab-vrptw', null);
    showToast(`Flotta eterogenea (${totVehicles} mezzi) applicata al VRPTW! Inserisci o verifica orari e coordinate, poi premi 'Risolvi'.`);

  } else if (model === 'intermediate') {
    if (!State.evConfig) await loadEvConfig();
    if (State.evConfig) {
      State.evConfig.vehicles = concreteVehicles.map((v, i) => ({
        name: v.name,
        capacity: v.capacity,
        battery_kwh: 60.0 + (i * 10.0),
        fixed_cost: v.fixed_cost
      }));
      try {
        await fetch('/api/ev_vrp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.evConfig)
        });
      } catch (e) { console.warn('Errore salvataggio EV-VRP:', e); }
    }
    renderEvTables();
    switchMainTab('tab-intermediate', null);
    showToast(`Flotta (${totVehicles} mezzi) applicata a WCVRPTW-IF / EV-VRP! Inserisci o verifica le coordinate, poi premi 'Risolvi'.`);

  } else {
    // CVRP
    if (!State.cvrpConfig) await loadCvrpConfig();
    if (State.cvrpConfig) {
      State.cvrpConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity: v.capacity,
        fixed_cost: v.fixed_cost
      }));
      State.cvrpConfig.cost_per_km = Math.round(avgKmCost * 100) / 100;
      try {
        await fetch('/api/cvrp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.cvrpConfig)
        });
      } catch (e) { console.warn('Errore salvataggio CVRP:', e); }
    }
    renderCvrpTables();
    switchMainTab('tab-cvrp', null);
    showToast(`Flotta eterogenea (${totVehicles} mezzi) applicata al CVRP! Inserisci o verifica le coordinate, poi premi 'Risolvi'.`);
  }

  saveToLocalStorage();
}

// ==========================================
// BACKUP LOCALE: EXPORT & IMPORT IMPOSTAZIONI
// ==========================================
function exportPlatformSettings() {
  const exportData = {
    platform: "OR-Route",
    version: "2.5",
    export_date: new Date().toISOString(),
    wizard_answers: wizardAnswers,
    carp_config: State.carpConfig,
    cvrp_config: State.cvrpConfig,
    vrptw_config: State.vrptwConfig,
    ev_vrp_config: State.evConfig,
    vrppd_config: State.vrppdConfig,
    mdvrp_config: State.mdvrpConfig
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `or_route_impostazioni_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📥 Backup impostazioni scaricato con successo in formato JSON!');
}

function handleImportConfigFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data) throw new Error('File vuoto o non valido.');

      // Ripristino risposte del wizard e flotta eterogenea
      if (data.wizard_answers) {
        Object.assign(wizardAnswers, data.wizard_answers);
        if (wizardAnswers.fleetCategories && wizardAnswers.fleetCategories.length > 0) {
          renderWizardFleetTable();
        }
        if (document.getElementById('wizStopMinutes')) {
          document.getElementById('wizStopMinutes').value = wizardAnswers.stopMinutes || 6.0;
        }
        recalcWizardFleetTotals();
      }

      // Ripristino CARP
      if (data.carp_config) {
        State.carpConfig = data.carp_config;
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.carpConfig)
        });
        renderCarpTables();
      }

      // Ripristino CVRP
      if (data.cvrp_config) {
        State.cvrpConfig = data.cvrp_config;
        await fetch('/api/cvrp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.cvrpConfig)
        });
        renderCvrpTables();
      }

      // Ripristino VRPTW
      if (data.vrptw_config) {
        State.vrptwConfig = data.vrptw_config;
        await fetch('/api/vrptw/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.vrptwConfig)
        });
        renderVrptwTables();
      }

      // Ripristino EV-VRP
      if (data.ev_vrp_config) {
        State.evConfig = data.ev_vrp_config;
        await fetch('/api/ev_vrp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.evConfig)
        });
        renderEvTables();
      }

      // Ripristino VRPPD
      if (data.vrppd_config) {
        State.vrppdConfig = data.vrppd_config;
        await fetch('/api/vrppd/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.vrppdConfig)
        });
        renderVrppdTables();
      }

      // Ripristino MDVRP
      if (data.mdvrp_config) {
        State.mdvrpConfig = data.mdvrp_config;
        await fetch('/api/mdvrp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.mdvrpConfig)
        });
        renderMdvrpTables();
      }

      saveToLocalStorage();
      showToast('📤 Backup importato e tutte le impostazioni ripristinate con successo!');
      evaluateWizard();
    } catch (err) {
      alert('Errore durante l\'importazione del file di backup: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function saveToLocalStorage() {
  try {
    const cache = {
      wizard_answers: wizardAnswers,
      carp_config: State.carpConfig,
      cvrp_config: State.cvrpConfig,
      vrptw_config: State.vrptwConfig,
      ev_vrp_config: State.evConfig,
      vrppd_config: State.vrppdConfig,
      mdvrp_config: State.mdvrpConfig
    };
    localStorage.setItem('or_route_local_backup', JSON.stringify(cache));
  } catch (e) {
    console.warn('Errore salvataggio localStorage:', e);
  }
}

// ==========================================
// 2. MODELLO CVRP: LOGISTICA & CONSEGNE MERCI
// ==========================================
async function loadCvrpConfig() {
  try {
    const res = await fetch('/api/cvrp/config');
    State.cvrpConfig = await res.json();
    renderCvrpTables();
    drawRouteCanvas('cvrpCanvas', State.cvrpConfig, State.cvrpResult || null);
  } catch (e) {
    console.error('Errore caricamento CVRP:', e);
  }
}

function renderCvrpTables() {
  if (!State.cvrpConfig) return;

  // 0. Deposito CVRP
  const dep = State.cvrpConfig.depot;
  if (dep) {
    const nameInp = document.getElementById('cvrpDepotName');
    const latInp = document.getElementById('cvrpDepotLat');
    const lonInp = document.getElementById('cvrpDepotLon');
    if (nameInp) nameInp.value = dep.name || 'Hub Centrale';
    if (latInp) latInp.value = dep.lat !== undefined ? dep.lat : 45.4642;
    if (lonInp) lonInp.value = dep.lon !== undefined ? dep.lon : 9.1900;
  }

  // Conteggio Clienti
  const countEl = document.getElementById('cvrpCustomerCount');
  if (countEl && State.cvrpConfig.customers) {
    countEl.innerText = `${State.cvrpConfig.customers.length} clienti / destinazioni`;
  }

  // Costo Chilometrico
  const costPerKmInput = document.getElementById('cvrpCostPerKm');
  if (costPerKmInput && State.cvrpConfig.cost_per_km !== undefined) {
    costPerKmInput.value = State.cvrpConfig.cost_per_km;
  }

  // 1. Tabella Clienti con Coordinate Modificabili
  const tbody = document.getElementById('cvrpCustomersBody');
  if (tbody && State.cvrpConfig.customers) {
    tbody.innerHTML = '';
    State.cvrpConfig.customers.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${c.name || ''}" 
            onchange="updateCvrpCustomerField(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 82px;" value="${c.lat}" 
            onchange="updateCvrpCustomerCoord(${idx}, 'lat', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 82px;" value="${c.lon}" 
            onchange="updateCvrpCustomerCoord(${idx}, 'lon', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 80px;" min="10" step="20" value="${c.demand}" 
            onchange="updateCvrpCustomerDemand(${idx}, this.value)">
        </td>
        <td style="text-align: center;">
          <button class="btn-danger-outline" title="Rimuovi cliente" onclick="removeCvrpCustomer(${idx})">&times;</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 2. Tabella Veicoli CVRP
  const vbody = document.getElementById('cvrpVehiclesBody');
  if (vbody && State.cvrpConfig.vehicles) {
    vbody.innerHTML = '';
    State.cvrpConfig.vehicles.forEach((v, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>🚐 ${v.name}</b></td>
        <td>
          <input type="number" class="cell-inp" min="100" step="100" value="${v.capacity}" 
            onchange="updateCvrpVehicleCapacity(${idx}, this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" min="0" step="5" value="${v.fixed_cost}" 
            onchange="updateCvrpVehicleCost(${idx}, this.value)">
        </td>
        <td style="text-align: center;">
          <button class="btn-danger-outline" title="Rimuovi veicolo" onclick="removeCvrpVehicle(${idx})">&times;</button>
        </td>
      `;
      vbody.appendChild(tr);
    });
  }

  // 3. Bilancio Capacità Flotta vs Domanda Merci
  updateCvrpFleetCapacitySummary();
}

function updateCvrpDepot(field, val) {
  if (!State.cvrpConfig || !State.cvrpConfig.depot) return;
  if (field === 'lat' || field === 'lon') {
    State.cvrpConfig.depot[field] = parseFloat(val) || 0;
  } else {
    State.cvrpConfig.depot[field] = val;
  }
  drawRouteCanvas('cvrpCanvas', State.cvrpConfig, State.cvrpResult || null);
}

function updateCvrpCustomerField(idx, field, val) {
  if (!State.cvrpConfig || !State.cvrpConfig.customers || !State.cvrpConfig.customers[idx]) return;
  State.cvrpConfig.customers[idx][field] = val;
}

function updateCvrpCustomerCoord(idx, coord, val) {
  if (!State.cvrpConfig || !State.cvrpConfig.customers || !State.cvrpConfig.customers[idx]) return;
  State.cvrpConfig.customers[idx][coord] = parseFloat(val) || 0;
  drawRouteCanvas('cvrpCanvas', State.cvrpConfig, State.cvrpResult || null);
}

function updateCvrpFleetCapacitySummary() {
  const sumEl = document.getElementById('cvrpFleetCapacitySummary');
  if (!sumEl || !State.cvrpConfig) return;

  const totalDemand = (State.cvrpConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
  const totalCapacity = (State.cvrpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);

  if (totalCapacity < totalDemand) {
    const missing = totalDemand - totalCapacity;
    sumEl.style.background = 'rgba(239, 68, 68, 0.15)';
    sumEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    sumEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <span style="color: #f87171; font-weight: 700;">⚠️ Portata Flotta Insufficiente!</span> 
          Portata: <b>${totalCapacity.toLocaleString()} kg</b> &lt; Richiesta: <b>${totalDemand.toLocaleString()} kg</b> (Mancano ${missing.toLocaleString()} kg).
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="autoScaleCvrpFleet()" style="font-size: 11.5px; padding: 4px 10px;">
            ⚡ Adatta Flotta Automaticamente
          </button>
          <button class="btn btn-sm btn-secondary" onclick="filterCvrpCustomersByCapacity()" style="font-size: 11.5px; padding: 4px 10px;">
            ✂️ Riduci Clienti per Flotta Attuale
          </button>
        </div>
      </div>
    `;
  } else {
    const marginPct = totalDemand > 0 ? (((totalCapacity / totalDemand) - 1) * 100).toFixed(0) : 0;
    sumEl.style.background = 'rgba(16, 185, 129, 0.1)';
    sumEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    sumEl.innerHTML = `
      <span style="color: #34d399; font-weight: 700;">✅ Flotta Idonea:</span> 
      Portata Flotta <b>${totalCapacity.toLocaleString()} kg</b> per <b>${totalDemand.toLocaleString()} kg</b> di merce (Margine sicurezza: +${marginPct}%).
    `;
  }
}

function updateCvrpCustomerDemand(idx, val) {
  State.cvrpConfig.customers[idx].demand = parseFloat(val) || 50;
  updateCvrpFleetCapacitySummary();
}

function updateCvrpVehicleCapacity(idx, val) {
  State.cvrpConfig.vehicles[idx].capacity = parseFloat(val) || 1000;
  updateCvrpFleetCapacitySummary();
}

function updateCvrpVehicleCost(idx, val) {
  State.cvrpConfig.vehicles[idx].fixed_cost = parseFloat(val) || 50;
}

function updateCvrpCostPerKm(val) {
  if (!State.cvrpConfig) return;
  State.cvrpConfig.cost_per_km = parseFloat(val) || 1.15;
}

function addCvrpCustomer() {
  const name = prompt('Nome del cliente / punto vendita:', 'Nuovo Cliente');
  if (!name) return;
  const demand = prompt('Domanda merci (kg o colli):', '250');
  
  const dep = State.cvrpConfig.depot;
  const offsetLat = (Math.random() - 0.5) * 0.15;
  const offsetLon = (Math.random() - 0.5) * 0.25;

  const newId = State.cvrpConfig.customers.length + 1;
  State.cvrpConfig.customers.push({
    id: newId,
    name: name,
    lat: Number((dep.lat + offsetLat).toFixed(4)),
    lon: Number((dep.lon + offsetLon).toFixed(4)),
    demand: parseFloat(demand) || 200
  });
  renderCvrpTables();
  drawRouteCanvas('cvrpCanvas', State.cvrpConfig, State.cvrpResult || null);
  showToast('Nuovo cliente aggiunto!');
}

function removeCvrpCustomer(idx) {
  if (confirm(`Rimuovere il cliente '${State.cvrpConfig.customers[idx].name}'?`)) {
    State.cvrpConfig.customers.splice(idx, 1);
    renderCvrpTables();
    drawRouteCanvas('cvrpCanvas', State.cvrpConfig, State.cvrpResult || null);
  }
}

function addCvrpVehicleRow() {
  if (!State.cvrpConfig) return;
  if (!State.cvrpConfig.vehicles) State.cvrpConfig.vehicles = [];
  const nextNum = State.cvrpConfig.vehicles.length + 1;
  State.cvrpConfig.vehicles.push({
    name: `Furgone_${nextNum}`,
    capacity: 1000,
    fixed_cost: 60.0
  });
  renderCvrpTables();
  showToast(`Furgone_${nextNum} aggiunto alla flotta.`);
}

function removeCvrpVehicle(idx) {
  if (!State.cvrpConfig || !State.cvrpConfig.vehicles) return;
  if (State.cvrpConfig.vehicles.length <= 1) {
    alert("È necessario mantenere almeno un veicolo nella flotta CVRP.");
    return;
  }
  const name = State.cvrpConfig.vehicles[idx].name;
  if (confirm(`Rimuovere '${name}' dalla flotta?`)) {
    State.cvrpConfig.vehicles.splice(idx, 1);
    renderCvrpTables();
    showToast(`${name} rimosso.`);
  }
}

function autoScaleCvrpFleet(andSolve = false) {
  if (!State.cvrpConfig) return;
  const totalDemand = (State.cvrpConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
  const totalCapacity = (State.cvrpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);
  const missing = Math.max(0, (totalDemand * 1.15) - totalCapacity);
  const stdCap = 1200;
  const numToAdd = Math.max(1, Math.ceil(missing / stdCap));

  for (let i = 0; i < numToAdd; i++) {
    const nextNum = State.cvrpConfig.vehicles.length + 1;
    State.cvrpConfig.vehicles.push({
      name: `Furgone_Eco_${nextNum}`,
      capacity: stdCap,
      fixed_cost: 65.0
    });
  }
  renderCvrpTables();
  showToast(`Aggiunti ${numToAdd} furgoni per coprire l'intera domanda merci!`);
  if (andSolve) {
    solveCvrp();
  }
}

function filterCvrpCustomersByCapacity(andSolve = false) {
  if (!State.cvrpConfig) return;
  const totalCapacity = (State.cvrpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);
  const dep = State.cvrpConfig.depot;

  // Ordina i clienti per distanza dal deposito centrale
  const sorted = [...State.cvrpConfig.customers].sort((a, b) => {
    const da = Math.hypot(a.lat - dep.lat, a.lon - dep.lon);
    const db = Math.hypot(b.lat - dep.lat, b.lon - dep.lon);
    return da - db;
  });

  let accumulated = 0;
  const kept = [];
  for (const c of sorted) {
    if (accumulated + c.demand <= totalCapacity) {
      kept.push(c);
      accumulated += c.demand;
    }
  }
  if (kept.length === 0 && sorted.length > 0) kept.push(sorted[0]);

  State.cvrpConfig.customers = kept;
  renderCvrpTables();
  drawRouteCanvas('cvrpCanvas', State.cvrpConfig, null);
  showToast(`Area ridotta a ${kept.length} clienti compatibili con la flotta attuale.`);
  if (andSolve) {
    solveCvrp();
  }
}

async function solveCvrp() {
  const btn = document.getElementById('btnSolveCvrp');
  if (btn) {
    btn.innerText = '⏳ Calcolo Ottimo...';
    btn.disabled = true;
  }
  showToast('Risoluzione modello CVRP (PuLP / MILP)...');

  try {
    const res = await fetch('/api/cvrp/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.cvrpConfig)
    });
    const data = await res.json();
    State.cvrpResult = data;

    const totalDemand = (State.cvrpConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
    const totalCapacity = (State.cvrpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);

    // Se non ottimale o flotta insufficiente, segnala e proponi alternative
    if (!data.is_optimal || data.status === 'Infeasible' || totalCapacity < totalDemand) {
      if (document.getElementById('cvrpStatus')) {
        document.getElementById('cvrpStatus').innerText = data.status || 'Infeasible';
        document.getElementById('cvrpStatus').className = 'kpi-val red';
      }
      showFleetShortageModal('cvrp', {
        modelName: 'CVRP (Consegne Merci)',
        totalDemand: totalDemand,
        totalCapacity: totalCapacity,
        numVehicles: (State.cvrpConfig.vehicles || []).length,
        avgVehCap: 1200,
        onAutoScale: autoScaleCvrpFleet,
        onCrop: filterCvrpCustomersByCapacity
      });
      return;
    }

    // Aggiornamento KPI
    document.getElementById('cvrpStatus').innerText = data.status;
    document.getElementById('cvrpCost').innerText = data.objective_value ? `${data.objective_value.toFixed(2)} €` : 'N/D';
    document.getElementById('cvrpKm').innerText = `${data.total_distance_km} km`;
    document.getElementById('cvrpDemand').innerText = `${data.total_demand.toLocaleString()} kg`;

    // Render report veicoli
    renderCvrpVehicleReport(data);

    // Render su Canvas
    drawRouteCanvas('cvrpCanvas', State.cvrpConfig, data);
    showToast('CVRP risolto con successo!');
  } catch (e) {
    alert('Errore risoluzione CVRP: ' + e);
  } finally {
    if (btn) {
      btn.innerText = '⚡ Risolvi & Ottimizza Flotta';
      btn.disabled = false;
    }
  }
}

function renderCvrpVehicleReport(data) {
  const container = document.getElementById('cvrpReportList');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(data.vehicles || {}).forEach(([vName, vInfo], idx) => {
    const color = State.vehicleColors[idx % State.vehicleColors.length];
    const div = document.createElement('div');
    div.style.cssText = 'background: #090f1d; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 12px;';
    
    const fixedCost = parseFloat(vInfo.fixed_cost) || 0;
    const kmCost = parseFloat(vInfo.km_cost) || 0;
    const totalCost = fixedCost + kmCost;

    if (vInfo.used) {
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <b style="color: ${color}; font-size: 14px;">🚐 ${vName}</b>
          <span class="badge-free" style="background: rgba(16,185,129,0.15); color: #34d399; font-weight: 700;">ATTIVO</span>
        </div>
        <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">
          Carico a bordo: <b>${vInfo.total_load} kg</b> su ${vInfo.capacity} kg (${vInfo.saturation_pct}%) | 
          Percorrenza: <b>${vInfo.distance_km} km</b>
        </div>
        <div style="background: #17243c; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
          <div style="background: ${color}; height: 100%; width: ${Math.min(vInfo.saturation_pct, 100)}%;"></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; font-size: 12px; margin-bottom: 10px;">
          <div>Costo Fisso: <b>${fixedCost.toFixed(2)} €</b></div>
          <div>Costo Km: <b>${kmCost.toFixed(2)} €</b></div>
          <div style="color: #38bdf8;">Totale Mezzo: <b>${totalCost.toFixed(2)} €</b></div>
        </div>
        <div style="font-size: 12px;">
          Sequenza fermate: ${(vInfo.stops || []).map(s => `<span class="code-tag" style="margin: 2px;">${s.is_depot ? '🏠 Deposito' : s.name}</span>`).join(' ➔ ')}
        </div>
      `;
    } else {
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <b style="color: var(--text-muted);">🚐 ${vName}</b>
          <span style="font-size: 12px; color: var(--text-muted);">NON NECESSARIO (Costo fisso risparmiato: ${fixedCost.toFixed(2)} €)</span>
        </div>
      `;
    }
    container.appendChild(div);
  });
}

// ==========================================
// 3. MODELLO VRPTW: FINESTRE TEMPORALI VINCOLANTI
// ==========================================
async function loadVrptwConfig() {
  try {
    const res = await fetch('/api/vrptw/config');
    State.vrptwConfig = await res.json();
    renderVrptwTables();
    drawRouteCanvas('vrptwCanvas', State.vrptwConfig, State.vrptwResult || null);
  } catch (e) {
    console.error('Errore caricamento VRPTW:', e);
  }
}

function renderVrptwTables() {
  if (!State.vrptwConfig) return;

  // 0. Deposito VRPTW
  const dep = State.vrptwConfig.depot;
  if (dep) {
    const nameInp = document.getElementById('vrptwDepotName');
    const latInp = document.getElementById('vrptwDepotLat');
    const lonInp = document.getElementById('vrptwDepotLon');
    const readyInp = document.getElementById('vrptwDepotReady');
    const dueInp = document.getElementById('vrptwDepotDue');
    if (nameInp) nameInp.value = dep.name || 'Hub Logistico';
    if (latInp) latInp.value = dep.lat !== undefined ? dep.lat : 45.4642;
    if (lonInp) lonInp.value = dep.lon !== undefined ? dep.lon : 9.1900;
    if (readyInp) readyInp.value = minutesToTime(dep.ready_time !== undefined ? dep.ready_time : 0);
    if (dueInp) dueInp.value = minutesToTime(dep.due_time !== undefined ? dep.due_time : 480);
  }

  // Input Costo al km e Velocità Media
  const costPerKmInput = document.getElementById('vrptwCostPerKm');
  if (costPerKmInput && State.vrptwConfig.cost_per_km !== undefined) {
    costPerKmInput.value = State.vrptwConfig.cost_per_km;
  }
  const speedInput = document.getElementById('vrptwSpeedKmh');
  if (speedInput && State.vrptwConfig.speed_kmh !== undefined) {
    speedInput.value = State.vrptwConfig.speed_kmh;
  }

  // 1. Tabella Clienti & Finestre con Coordinate ed Orari Modificabili
  const tbody = document.getElementById('vrptwCustomersBody');
  if (tbody && State.vrptwConfig.customers) {
    tbody.innerHTML = '';
    State.vrptwConfig.customers.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${c.name || ''}" 
            onchange="updateVrptwCustomerField(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 76px;" value="${c.lat}" 
            onchange="updateVrptwCustomerCoord(${idx}, 'lat', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 76px;" value="${c.lon}" 
            onchange="updateVrptwCustomerCoord(${idx}, 'lon', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 74px;" min="10" step="20" value="${c.demand}" 
            onchange="updateVrptwCustomerDemand(${idx}, this.value)">
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px;">
            <input type="time" class="cell-inp" style="width: 74px; font-size: 11px; padding: 4px 5px;" value="${minutesToTime(c.ready_time)}" 
              onchange="updateVrptwTimeWindow(${idx}, 'ready', this.value)">
            <span style="color: var(--text-muted);">-</span>
            <input type="time" class="cell-inp" style="width: 74px; font-size: 11px; padding: 4px 5px;" value="${minutesToTime(c.due_time)}" 
              onchange="updateVrptwTimeWindow(${idx}, 'due', this.value)">
          </div>
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 58px;" min="5" step="5" value="${c.service_time}" 
            onchange="updateVrptwServiceTime(${idx}, this.value)"> min
        </td>
        <td style="text-align: center;">
          <button class="btn-danger-outline" title="Rimuovi cliente" onclick="removeVrptwCustomer(${idx})">&times;</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 2. Tabella Veicoli VRPTW
  const vbody = document.getElementById('vrptwVehiclesBody');
  if (vbody && State.vrptwConfig.vehicles) {
    vbody.innerHTML = '';
    State.vrptwConfig.vehicles.forEach((v, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>🚚 ${v.name}</b></td>
        <td>
          <input type="number" class="cell-inp" min="200" step="100" value="${v.capacity}" 
            onchange="updateVrptwVehicleCapacity(${idx}, this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" min="0" step="5" value="${v.fixed_cost}" 
            onchange="updateVrptwVehicleCost(${idx}, this.value)">
        </td>
        <td style="text-align: center;">
          <button class="btn-danger-outline" title="Rimuovi veicolo" onclick="removeVrptwVehicle(${idx})">&times;</button>
        </td>
      `;
      vbody.appendChild(tr);
    });
  }

  // 3. Bilancio Capacità Flotta vs Richiesta
  updateVrptwFleetCapacitySummary();
}

function updateVrptwDepot(field, val) {
  if (!State.vrptwConfig || !State.vrptwConfig.depot) return;
  if (field === 'lat' || field === 'lon') {
    State.vrptwConfig.depot[field] = parseFloat(val) || 0;
  } else {
    State.vrptwConfig.depot[field] = val;
  }
  drawRouteCanvas('vrptwCanvas', State.vrptwConfig, State.vrptwResult || null);
}

function updateVrptwDepotTime(field, timeStr) {
  if (!State.vrptwConfig || !State.vrptwConfig.depot) return;
  State.vrptwConfig.depot[field] = timeToMinutes(timeStr, 8);
}

function updateVrptwCustomerField(idx, field, val) {
  if (!State.vrptwConfig || !State.vrptwConfig.customers || !State.vrptwConfig.customers[idx]) return;
  State.vrptwConfig.customers[idx][field] = val;
}

function updateVrptwCustomerCoord(idx, coord, val) {
  if (!State.vrptwConfig || !State.vrptwConfig.customers || !State.vrptwConfig.customers[idx]) return;
  State.vrptwConfig.customers[idx][coord] = parseFloat(val) || 0;
  drawRouteCanvas('vrptwCanvas', State.vrptwConfig, State.vrptwResult || null);
}

function updateVrptwTimeWindow(idx, type, timeStr) {
  if (!State.vrptwConfig || !State.vrptwConfig.customers || !State.vrptwConfig.customers[idx]) return;
  const mins = timeToMinutes(timeStr, 8);
  if (type === 'ready') {
    State.vrptwConfig.customers[idx].ready_time = mins;
  } else {
    State.vrptwConfig.customers[idx].due_time = mins;
  }
}

function timeToMinutes(timeStr, baseH = 8) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return Math.max(0, ((h * 60) + m) - (baseH * 60));
}

function minutesToTime(mins, baseH = 8) {
  const total = Math.round(mins) + baseH * 60;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function updateVrptwCustomerDemand(idx, val) {
  State.vrptwConfig.customers[idx].demand = parseFloat(val) || 50;
  updateVrptwFleetCapacitySummary();
}

function updateVrptwServiceTime(idx, val) {
  State.vrptwConfig.customers[idx].service_time = parseFloat(val) || 15;
}

function updateVrptwVehicleCapacity(idx, val) {
  State.vrptwConfig.vehicles[idx].capacity = parseFloat(val) || 1000;
  updateVrptwFleetCapacitySummary();
}

function updateVrptwVehicleCost(idx, val) {
  State.vrptwConfig.vehicles[idx].fixed_cost = parseFloat(val) || 70;
}

function updateVrptwCostPerKm(val) {
  if (!State.vrptwConfig) return;
  State.vrptwConfig.cost_per_km = parseFloat(val) || 1.25;
}

function updateVrptwSpeedKmh(val) {
  if (!State.vrptwConfig) return;
  State.vrptwConfig.speed_kmh = parseFloat(val) || 38.0;
}

function addVrptwCustomerRow() {
  const name = prompt('Nome della destinazione / punto vendita:', 'Nuovo Punto Vendita');
  if (!name) return;
  const demand = prompt('Domanda merci (kg):', '350');
  const service = prompt('Tempo di scarico sul posto (minuti):', '20');

  const dep = State.vrptwConfig.depot;
  const offsetLat = (Math.random() - 0.5) * 0.12;
  const offsetLon = (Math.random() - 0.5) * 0.18;

  const newId = State.vrptwConfig.customers.length + 1;
  State.vrptwConfig.customers.push({
    id: newId,
    name: name,
    lat: Number((dep.lat + offsetLat).toFixed(4)),
    lon: Number((dep.lon + offsetLon).toFixed(4)),
    demand: parseFloat(demand) || 300,
    ready_time: 60,
    due_time: 300,
    service_time: parseFloat(service) || 20
  });
  renderVrptwTables();
  drawRouteCanvas('vrptwCanvas', State.vrptwConfig, State.vrptwResult || null);
  showToast('Nuovo punto consegna VRPTW aggiunto!');
}

function removeVrptwCustomer(idx) {
  if (confirm(`Rimuovere '${State.vrptwConfig.customers[idx].name}'?`)) {
    State.vrptwConfig.customers.splice(idx, 1);
    renderVrptwTables();
    drawRouteCanvas('vrptwCanvas', State.vrptwConfig, State.vrptwResult || null);
  }
}

function addVrptwVehicleRow() {
  if (!State.vrptwConfig) return;
  if (!State.vrptwConfig.vehicles) State.vrptwConfig.vehicles = [];
  const nextNum = State.vrptwConfig.vehicles.length + 1;
  State.vrptwConfig.vehicles.push({
    name: `Furgone_Frigo_${nextNum}`,
    capacity: 1500,
    fixed_cost: 80.0
  });
  renderVrptwTables();
  showToast(`Furgone_Frigo_${nextNum} aggiunto alla flotta.`);
}

function removeVrptwVehicle(idx) {
  if (!State.vrptwConfig || !State.vrptwConfig.vehicles) return;
  if (State.vrptwConfig.vehicles.length <= 1) {
    alert("È necessario mantenere almeno un veicolo nella flotta VRPTW.");
    return;
  }
  const name = State.vrptwConfig.vehicles[idx].name;
  if (confirm(`Rimuovere '${name}' dalla flotta?`)) {
    State.vrptwConfig.vehicles.splice(idx, 1);
    renderVrptwTables();
    showToast(`${name} rimosso.`);
  }
}

function updateVrptwFleetCapacitySummary() {
  const sumEl = document.getElementById('vrptwFleetCapacitySummary');
  if (!sumEl || !State.vrptwConfig) return;

  const totalDemand = (State.vrptwConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
  const totalCapacity = (State.vrptwConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);

  if (totalCapacity < totalDemand) {
    const missing = totalDemand - totalCapacity;
    sumEl.style.background = 'rgba(239, 68, 68, 0.15)';
    sumEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    sumEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <span style="color: #f87171; font-weight: 700;">⚠️ Portata Flotta Insufficiente per le consegne con finestre orarie!</span> 
          Portata: <b>${totalCapacity.toLocaleString()} kg</b> &lt; Richiesta: <b>${totalDemand.toLocaleString()} kg</b> (Mancano ${missing.toLocaleString()} kg).
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="autoScaleVrptwFleet(false)" style="font-size: 11.5px; padding: 4px 10px;">
            ⚡ Adatta Flotta Automaticamente
          </button>
          <button class="btn btn-sm btn-secondary" onclick="filterVrptwCustomersByCapacity(false)" style="font-size: 11.5px; padding: 4px 10px;">
            ✂️ Riduci Destinazioni per Flotta Attuale
          </button>
        </div>
      </div>
    `;
  } else {
    const marginPct = totalDemand > 0 ? (((totalCapacity / totalDemand) - 1) * 100).toFixed(0) : 0;
    sumEl.style.background = 'rgba(16, 185, 129, 0.1)';
    sumEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    sumEl.innerHTML = `
      <span style="color: #34d399; font-weight: 700;">✅ Flotta Idonea:</span> 
      Portata Flotta <b>${totalCapacity.toLocaleString()} kg</b> per <b>${totalDemand.toLocaleString()} kg</b> di merce (Margine sicurezza: +${marginPct}%).
    `;
  }
}

function autoScaleVrptwFleet(andSolve = false) {
  if (!State.vrptwConfig) return;
  const totalDemand = (State.vrptwConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
  const totalCapacity = (State.vrptwConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);
  const missing = Math.max(0, (totalDemand * 1.15) - totalCapacity);
  const stdCap = 1500;
  const numToAdd = Math.max(1, Math.ceil(missing / stdCap));

  for (let i = 0; i < numToAdd; i++) {
    const nextNum = State.vrptwConfig.vehicles.length + 1;
    State.vrptwConfig.vehicles.push({
      name: `Furgone_Frigo_${nextNum}`,
      capacity: stdCap,
      fixed_cost: 80.0
    });
  }
  renderVrptwTables();
  showToast(`Aggiunti ${numToAdd} furgoni refrigerati per coprire le consegne!`);
  if (andSolve) {
    solveVrptw();
  }
}

function filterVrptwCustomersByCapacity(andSolve = false) {
  if (!State.vrptwConfig) return;
  const totalCapacity = (State.vrptwConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);
  const dep = State.vrptwConfig.depot;

  const sorted = [...State.vrptwConfig.customers].sort((a, b) => {
    const da = Math.hypot(a.lat - dep.lat, a.lon - dep.lon);
    const db = Math.hypot(b.lat - dep.lat, b.lon - dep.lon);
    return da - db;
  });

  let accumulated = 0;
  const kept = [];
  for (const c of sorted) {
    if (accumulated + c.demand <= totalCapacity) {
      kept.push(c);
      accumulated += c.demand;
    }
  }
  if (kept.length === 0 && sorted.length > 0) kept.push(sorted[0]);

  State.vrptwConfig.customers = kept;
  renderVrptwTables();
  drawRouteCanvas('vrptwCanvas', State.vrptwConfig, null);
  showToast(`Destinazioni ridotte a ${kept.length} per la flotta attuale.`);
  if (andSolve) {
    solveVrptw();
  }
}

async function solveVrptw() {
  const btn = document.getElementById('btnSolveVrptw');
  if (btn) {
    btn.innerText = '⏳ Calcolo Orari & Tappe...';
    btn.disabled = true;
  }
  showToast('Risoluzione VRPTW con finestre temporali vincolanti...');

  try {
    const res = await fetch('/api/vrptw/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.vrptwConfig)
    });
    const data = await res.json();
    State.vrptwResult = data;

    const totalDemand = (State.vrptwConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
    const totalCapacity = (State.vrptwConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);

    // Se non ottimale o flotta insufficiente, segnala e proponi alternative
    if (!data.is_optimal || data.status === 'Infeasible' || totalCapacity < totalDemand) {
      if (document.getElementById('vrptwStatus')) {
        document.getElementById('vrptwStatus').innerText = data.status || 'Infeasible';
        document.getElementById('vrptwStatus').className = 'kpi-val red';
      }
      showFleetShortageModal('vrptw', {
        modelName: 'VRPTW (Finestre Orarie Tassative)',
        totalDemand: totalDemand,
        totalCapacity: totalCapacity,
        numVehicles: (State.vrptwConfig.vehicles || []).length,
        avgVehCap: 1500,
        onAutoScale: autoScaleVrptwFleet,
        onCrop: filterVrptwCustomersByCapacity
      });
      return;
    }

    // Aggiornamento KPI
    document.getElementById('vrptwStatus').innerText = data.status;
    document.getElementById('vrptwCost').innerText = data.objective_value ? `${data.objective_value.toFixed(2)} €` : 'N/D';
    document.getElementById('vrptwKm').innerText = `${data.total_distance_km} km`;

    // Render report veicoli VRPTW
    renderVrptwVehicleReport(data);

    // Render timeline oraria
    renderVrptwTimeline(data);

    // Render su Canvas
    drawRouteCanvas('vrptwCanvas', State.vrptwConfig, data);
    showToast('VRPTW risolto: finestre orarie rispettate!');
  } catch (e) {
    alert('Errore risoluzione VRPTW: ' + e);
  } finally {
    if (btn) {
      btn.innerText = '⚡ Risolvi VRPTW con Finestre Orarie';
      btn.disabled = false;
    }
  }
}

function renderVrptwVehicleReport(data) {
  const container = document.getElementById('vrptwReportList');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(data.vehicles || {}).forEach(([vName, vInfo], idx) => {
    const color = State.vehicleColors[idx % State.vehicleColors.length];
    const div = document.createElement('div');
    div.style.cssText = 'background: #090f1d; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 12px;';
    
    const fixedCost = parseFloat(vInfo.fixed_cost) || 0;
    const kmCost = parseFloat(vInfo.km_cost) || 0;
    const totalCost = fixedCost + kmCost;

    if (vInfo.used) {
      const stopsCount = (vInfo.stops || []).filter(s => !s.is_depot).length;
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <b style="color: ${color}; font-size: 14px;">🚚 ${vName}</b>
          <span class="badge-free" style="background: rgba(16,185,129,0.15); color: #34d399; font-weight: 700;">ATTIVO</span>
        </div>
        <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">
          Carico a bordo: <b>${vInfo.total_load} kg</b> su ${vInfo.capacity} kg (${vInfo.saturation_pct}%) | 
          Percorrenza: <b>${vInfo.distance_km} km</b> | Fermate: <b>${stopsCount} clienti</b>
        </div>
        <div style="background: #17243c; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
          <div style="background: ${color}; height: 100%; width: ${Math.min(vInfo.saturation_pct, 100)}%;"></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; font-size: 12px;">
          <div>Costo Fisso: <b>${fixedCost.toFixed(2)} €</b></div>
          <div>Costo Km: <b>${kmCost.toFixed(2)} €</b></div>
          <div style="color: #38bdf8;">Totale Mezzo: <b>${totalCost.toFixed(2)} €</b></div>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <b style="color: var(--text-muted);">🚚 ${vName}</b>
          <span style="font-size: 12px; color: var(--text-muted);">NON NECESSARIO (Costo fisso evitato: ${fixedCost.toFixed(2)} €)</span>
        </div>
      `;
    }
    container.appendChild(div);
  });
}

function renderVrptwTimeline(data) {
  const container = document.getElementById('vrptwTimelineList');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(data.vehicles || {}).forEach(([vName, vInfo], vIdx) => {
    if (!vInfo.used) return;
    const color = State.vehicleColors[vIdx % State.vehicleColors.length];

    const vHeader = document.createElement('div');
    vHeader.style.cssText = `margin-top: 14px; margin-bottom: 8px; font-weight: 700; color: ${color}; font-size: 13.5px;`;
    vHeader.innerHTML = `🚚 ${vName} (Km: ${vInfo.distance_km} km | Carico: ${vInfo.total_load} kg)`;
    container.appendChild(vHeader);

    (vInfo.stops || []).forEach(stop => {
      const item = document.createElement('div');
      item.className = `timeline-item ${stop.is_depot ? 'depot' : ''}`;
      item.style.borderLeftColor = color;
      item.innerHTML = `
        <div>
          <b>${stop.is_depot ? '🏠 ' + stop.name : '📍 ' + stop.name}</b>
          ${!stop.is_depot ? `<div style="font-size: 11.5px; color: var(--text-muted);">Finestra ammessa: ${stop.window} (Scarico: ${stop.demand} kg)</div>` : ''}
        </div>
        <div>
          <span class="time-badge">Arrivo/Inizio: ${stop.service_start_time}</span>
        </div>
      `;
      container.appendChild(item);
    });
  });
}

function formatMinutesToTime(min) {
  if (typeof min !== 'number' || isNaN(min)) return '';
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ==========================================
// 4. MOTORE MAPPE INTERATTIVE GIS (LEAFLET)
// Apertura predefinita su Stradario (OpenStreetMap)
// ==========================================
function createCustomMarkerIcon(content, bg, borderColor = '#ffffff', size = 28) {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${bg};
      border: 2px solid ${borderColor};
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: ${size * 0.48}px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      color: #ffffff;
      font-weight: 700;
      line-height: 1;
    ">${content}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

function getOrCreateLeafletMap(mapId) {
  const container = document.getElementById(mapId);
  if (!container || !window.L) return null;

  if (State.leafletMaps && State.leafletMaps[mapId]) {
    return State.leafletMaps[mapId];
  }

  const map = L.map(mapId, {
    zoomControl: true,
    preferCanvas: true
  });

  // 1. Stradario (OpenStreetMap) - APERTURA PREDEFINITA
  const stradarioLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  });

  // 2. Mappa Stradale Esri
  const esriStreetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri'
  });

  // 3. Satellite Esri
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri'
  });

  // Apertura predefinita su Stradario
  stradarioLayer.addTo(map);

  // Controllo Layer (Stradario / Esri / Satellite)
  const baseLayers = {
    "🗺️ Stradario (OpenStreetMap)": stradarioLayer,
    "🛣️ Mappa Stradale (Esri)": esriStreetLayer,
    "🛰️ Satellite (Esri)": satelliteLayer
  };
  L.control.layers(baseLayers, null, { position: 'topright', collapsed: true }).addTo(map);

  // LayerGroup dinamico per marker e rotte
  map._routeLayerGroup = L.layerGroup().addTo(map);

  State.leafletMaps[mapId] = map;
  return map;
}

function renderLeafletRouteMap(mapId, type, config, solution) {
  const map = getOrCreateLeafletMap(mapId);
  if (!map || !config) return;

  map._routeLayerGroup.clearLayers();
  const bounds = L.latLngBounds();

  function addPoint(lat, lon) {
    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
      bounds.extend([lat, lon]);
    }
  }

  // 1. GESTIONE DEI DEPOSITI
  if (type === 'mdvrp') {
    (config.depots || []).forEach((d, idx) => {
      addPoint(d.lat, d.lon);
      const depColor = d.color || State.vehicleColors[idx % State.vehicleColors.length];
      const icon = createCustomMarkerIcon('🏢', depColor, '#ffffff', 32);
      L.marker([d.lat, d.lon], { icon })
        .bindPopup(`<b>🏢 Deposito Base: ${d.name || d.id}</b><br>ID: ${d.id}<br>GPS: ${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}`)
        .addTo(map._routeLayerGroup);
    });
  } else if (config.depot) {
    addPoint(config.depot.lat, config.depot.lon);
    const icon = createCustomMarkerIcon('🏢', '#ef4444', '#ffffff', 32);
    let popupHtml = `<b>🏢 Hub / Deposito Centrale</b><br><b>${config.depot.name || 'Hub'}</b><br>GPS: ${config.depot.lat.toFixed(5)}, ${config.depot.lon.toFixed(5)}`;
    if (type === 'vrptw' && config.depot.open_min !== undefined) {
      popupHtml += `<br>Orario Hub: <b>${formatMinutesToTime(config.depot.open_min)} - ${formatMinutesToTime(config.depot.close_min)}</b>`;
    }
    L.marker([config.depot.lat, config.depot.lon], { icon })
      .bindPopup(popupHtml)
      .addTo(map._routeLayerGroup);
  }

  // 2. GESTIONE IMPIANTI INTERMEDI (EV-VRP)
  if (type === 'ev' && (config.intermediate_facilities || config.facilities)) {
    const facs = config.intermediate_facilities || config.facilities || [];
    facs.forEach(f => {
      addPoint(f.lat, f.lon);
      const icon = createCustomMarkerIcon('⚡', '#059669', '#34d399', 28);
      L.marker([f.lat, f.lon], { icon })
        .bindPopup(`<b>⚡ Impianto / Ricarica ${f.id}</b><br><b>${f.name}</b><br>Tipo: ${f.type || 'Ricarica Fast'}<br>Potenza: ${f.power_kw || 100} kW<br>GPS: ${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}`)
        .addTo(map._routeLayerGroup);
    });
  }

  // 3. GESTIONE RICHIESTE RITIRO/CONSEGNA (VRPPD)
  if (type === 'vrppd' && config.requests) {
    config.requests.forEach(req => {
      if (req.pickup) {
        addPoint(req.pickup.lat, req.pickup.lon);
        const iconP = createCustomMarkerIcon('P', '#10b981', '#ffffff', 26);
        L.marker([req.pickup.lat, req.pickup.lon], { icon: iconP })
          .bindPopup(`<b>🟢 Ritiro (${req.id})</b><br><b>${req.pickup.name}</b><br>Carico da prelevare: <b>+${req.demand_kg} kg</b><br>GPS: ${req.pickup.lat.toFixed(5)}, ${req.pickup.lon.toFixed(5)}`)
          .addTo(map._routeLayerGroup);
      }
      if (req.delivery) {
        addPoint(req.delivery.lat, req.delivery.lon);
        const iconD = createCustomMarkerIcon('D', '#f59e0b', '#ffffff', 26);
        L.marker([req.delivery.lat, req.delivery.lon], { icon: iconD })
          .bindPopup(`<b>🟠 Consegna (${req.id})</b><br><b>${req.delivery.name}</b><br>Carico da recapitare: <b>-${req.demand_kg} kg</b><br>GPS: ${req.delivery.lat.toFixed(5)}, ${req.delivery.lon.toFixed(5)}`)
          .addTo(map._routeLayerGroup);
      }
      if (req.pickup && req.delivery) {
        L.polyline([[req.pickup.lat, req.pickup.lon], [req.delivery.lat, req.delivery.lon]], {
          color: '#94a3b8',
          weight: 1.5,
          dashArray: '5, 6',
          opacity: 0.5
        }).addTo(map._routeLayerGroup);
      }
    });
  }

  // 4. GESTIONE CLIENTI NORMALI (CVRP, VRPTW, EV, MDVRP)
  if (config.customers && type !== 'vrppd') {
    config.customers.forEach(c => {
      addPoint(c.lat, c.lon);
      const icon = createCustomMarkerIcon(c.id, '#0284c7', '#ffffff', 24);
      let popupHtml = `<b>📍 Cliente #${c.id}: ${c.name}</b><br>Carico Richiesto: <b>${c.demand_kg} kg</b><br>GPS: ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`;
      if (type === 'vrptw') {
        popupHtml += `<br>Finestra Oraria: <b>${formatMinutesToTime(c.ready_time)} - ${formatMinutesToTime(c.due_time)}</b><br>Tempo scarico: ${c.service_time} min`;
      }
      L.marker([c.lat, c.lon], { icon })
        .bindPopup(popupHtml)
        .addTo(map._routeLayerGroup);
    });
  }

  // 5. TRACCIAMENTO DEI PERCORSI VEICOLI RISOLTI
  if (solution) {
    if (type === 'vrppd' || type === 'mdvrp') {
      const nodesMap = {};
      if (type === 'vrppd') {
        if (config.depot) nodesMap[config.depot.id] = config.depot;
        (config.requests || []).forEach(r => {
          if (r.pickup) nodesMap[r.pickup.id] = r.pickup;
          if (r.delivery) nodesMap[r.delivery.id] = r.delivery;
        });
      } else {
        (config.depots || []).forEach(d => nodesMap[d.id] = d);
        (config.customers || []).forEach(c => nodesMap[c.id] = c);
      }

      (solution.vehicles || []).forEach((v, vIdx) => {
        if (!v.used || !v.route_nodes || v.route_nodes.length < 2) return;
        const color = State.vehicleColors[vIdx % State.vehicleColors.length];
        const latLngs = [];
        v.route_nodes.forEach(nid => {
          const nd = nodesMap[nid];
          if (nd && typeof nd.lat === 'number' && typeof nd.lon === 'number') {
            latLngs.push([nd.lat, nd.lon]);
          }
        });
        if (latLngs.length >= 2) {
          const polyline = L.polyline(latLngs, {
            color: color,
            weight: 4,
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(map._routeLayerGroup);
          polyline.bindTooltip(`<b>${v.name || v.id || ('Mezzo ' + (vIdx + 1))}</b> (${v.route_nodes.length} tappe)`, { sticky: true });
        }
      });
    } else if (solution.vehicles) {
      Object.entries(solution.vehicles).forEach(([vName, vInfo], vIdx) => {
        if (!vInfo.used || !vInfo.stops || vInfo.stops.length < 2) return;
        const color = State.vehicleColors[vIdx % State.vehicleColors.length];
        const latLngs = [];
        vInfo.stops.forEach(s => {
          if (typeof s.lat === 'number' && typeof s.lon === 'number') {
            latLngs.push([s.lat, s.lon]);
          }
        });
        if (latLngs.length >= 2) {
          const polyline = L.polyline(latLngs, {
            color: color,
            weight: 4,
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(map._routeLayerGroup);
          const totalLoad = vInfo.total_demand || vInfo.total_load || vInfo.total_collected || 0;
          polyline.bindTooltip(`<b>${vName}</b> &mdash; Carico: ${totalLoad} kg (${latLngs.length} fermate)`, { sticky: true });
        }
      });
    }
  }

  // 6. CENTRATURA AUTOMATICA SULLE COORDINATE
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
  } else {
    map.setView([45.4642, 9.1900], 12);
  }
}

// ==========================================
// 4. CANVAS / LEAFLET ROUTE RENDERER (CVRP & VRPTW)
// ==========================================
function drawRouteCanvas(canvasId, config, solution) {
  const mapId = (canvasId === 'cvrpCanvas') ? 'cvrpMap' : (canvasId === 'vrptwCanvas' ? 'vrptwMap' : null);
  if (mapId && window.L && document.getElementById(mapId)) {
    renderLeafletRouteMap(mapId, canvasId === 'cvrpCanvas' ? 'cvrp' : 'vrptw', config, solution);
    return;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas || !config) return;
  const ctx = canvas.getContext('2d');
  
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio || 600;
  canvas.height = rect.height * window.devicePixelRatio || 400;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  const w = rect.width;
  const h = rect.height;

  // Background
  ctx.fillStyle = '#080d18';
  ctx.fillRect(0, 0, w, h);

  // Bounding box
  const allPoints = [];
  if (config.depot) allPoints.push(config.depot);
  if (config.customers && config.customers.length > 0) allPoints.push(...config.customers);
  if (allPoints.length === 0) return;

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  allPoints.forEach(p => {
    if (typeof p.lat === 'number') {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
    if (typeof p.lon === 'number') {
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
  });

  if (minLat === maxLat) { minLat -= 0.05; maxLat += 0.05; }
  if (minLon === maxLon) { minLon -= 0.05; maxLon += 0.05; }

  const pad = 50;
  const scaleX = (lon) => pad + ((lon - minLon) / (maxLon - minLon || 1)) * (w - pad * 2);
  const scaleY = (lat) => h - (pad + ((lat - minLat) / (maxLat - minLat || 1)) * (h - pad * 2));

  // 1. Percorsi Veicoli
  if (solution && solution.vehicles) {
    Object.entries(solution.vehicles || {}).forEach(([vName, vInfo], vIdx) => {
      if (!vInfo.used || !vInfo.stops || vInfo.stops.length < 2) return;
      const color = State.vehicleColors[vIdx % State.vehicleColors.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();

      vInfo.stops.forEach((stop, i) => {
        const x = scaleX(stop.lon);
        const y = scaleY(stop.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();

      for (let i = 0; i < vInfo.stops.length - 1; i++) {
        const p1 = { x: scaleX(vInfo.stops[i].lon), y: scaleY(vInfo.stops[i].lat) };
        const p2 = { x: scaleX(vInfo.stops[i + 1].lon), y: scaleY(vInfo.stops[i + 1].lat) };
        drawArrow(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, Math.atan2(p2.y - p1.y, p2.x - p1.x), color);
      }
    });
  } else {
    // Banner informativo su canvas: non ancora calcolato
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillRect(20, 14, w - 40, 28);
    ctx.strokeRect(20, 14, w - 40, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📍 Coordinate posizionate sulla mappa. Modifica i parametri, poi premi "⚡ Risolvi" per tracciare i percorsi.', w / 2, 32);
    ctx.textAlign = 'left';
  }

  // 2. Nodi Clienti
  config.customers.forEach((c) => {
    const x = scaleX(c.lon);
    const y = scaleY(c.lat);

    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10.5px Outfit, sans-serif';
    ctx.fillText(`${c.name} (${c.demand}kg)`, x + 9, y + 3);
  });

  // 3. Deposito Centrale
  const depX = scaleX(config.depot.lon);
  const depY = scaleY(config.depot.lat);

  ctx.beginPath();
  ctx.arc(depX, depY, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(depX, depY, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11.5px Outfit, sans-serif';
  ctx.fillText('🏢 ' + config.depot.name, depX + 12, depY - 4);
}

function drawArrow(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-7, -4);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ==========================================
// 5. MODELLO CARP: RACCOLTA PORTA A PORTA & RETE STRADALE
// ==========================================
async function loadCarpConfig() {
  try {
    const res = await fetch('/api/config');
    State.carpConfig = await res.json();
    renderCarpTables();
  } catch (e) {
    console.error('Errore caricamento CARP:', e);
  }
}

function renderCarpTables() {
  if (!State.carpConfig) return;

  // 1. Tabella Strade
  const tbody = document.getElementById('carpStreetsBody');
  const countEl = document.getElementById('carpStreetsCount');
  if (countEl && State.carpConfig.streets) {
    countEl.innerText = `${State.carpConfig.streets.length} tratte viarie`;
  }

  if (tbody && State.carpConfig.streets) {
    tbody.innerHTML = '';
    State.carpConfig.streets.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'carp-street-row';
      tr.dataset.name = (s.name || '').toLowerCase();
      tr.dataset.nodes = `${s.u}-${s.v}`;
      tr.innerHTML = `
        <td><b>${s.name}</b><br><small style="color:var(--text-muted);">${s.description || ''}</small></td>
        <td><span class="code-tag">${s.u} &rarr; ${s.v}</span></td>
        <td>
          <input type="number" class="cell-inp" min="0" step="50" value="${s.demand_kg}"
            onchange="updateCarpStreetDemand(${idx}, this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" min="0.5" step="0.5" value="${s.transit_cost}"
            onchange="updateCarpStreetTransit(${idx}, this.value)">
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 2. Tabella Veicoli / Compattatori
  const vbody = document.getElementById('carpVehiclesBody');
  if (vbody && State.carpConfig.vehicles) {
    vbody.innerHTML = '';
    State.carpConfig.vehicles.forEach((v, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <b>🚛 ${v.name}</b>
          ${v.description ? `<br><small style="color:var(--text-muted);">${v.description}</small>` : ''}
        </td>
        <td>
          <input type="number" class="cell-inp" min="500" step="250" value="${v.capacity_kg}"
            onchange="updateCarpVehicleCapacity(${idx}, this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" min="0" step="10" value="${v.fixed_cost}"
            onchange="updateCarpVehicleCost(${idx}, this.value)">
        </td>
        <td>
          <button class="btn-danger-outline" title="Rimuovi Compattatore" onclick="removeCarpVehicle(${idx})">&times;</button>
        </td>
      `;
      vbody.appendChild(tr);
    });
  }

  // 3. Bilancio Capacità Flotta vs Domanda Totale
  updateCarpFleetCapacitySummary();
}

function updateCarpFleetCapacitySummary() {
  const sumEl = document.getElementById('carpFleetCapacitySummary');
  if (!sumEl || !State.carpConfig) return;

  const totalDemand = (State.carpConfig.streets || []).reduce((acc, s) => acc + (parseFloat(s.demand_kg) || 0), 0);
  const totalCapacity = (State.carpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity_kg) || 0), 0);

  if (totalCapacity < totalDemand) {
    const missing = totalDemand - totalCapacity;
    sumEl.style.background = 'rgba(239, 68, 68, 0.15)';
    sumEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    sumEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <span style="color: #f87171; font-weight: 700;">⚠️ Portata Flotta Insufficiente per quest'area!</span> 
          Portata totale: <b>${totalCapacity.toLocaleString()} kg</b> &lt; Rifiuti stimati: <b>${totalDemand.toLocaleString()} kg</b> (Mancano ${missing.toLocaleString()} kg).
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="autoScaleCarpFleet()" style="font-size: 11.5px; padding: 4px 10px;">
            ⚡ Adatta Flotta Automaticamente
          </button>
          <button class="btn btn-sm btn-secondary" onclick="cropCarpSectorByCurrentCapacity()" style="font-size: 11.5px; padding: 4px 10px;">
            ✂️ Riduci Area alla Capacità Flotta Attuale
          </button>
        </div>
      </div>
    `;
  } else {
    const marginPct = totalDemand > 0 ? (((totalCapacity / totalDemand) - 1) * 100).toFixed(0) : 0;
    sumEl.style.background = 'rgba(16, 185, 129, 0.1)';
    sumEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    sumEl.innerHTML = `
      <span style="color: #34d399; font-weight: 700;">✅ Flotta Idonea:</span> 
      Portata Flotta <b>${totalCapacity.toLocaleString()} kg</b> per <b>${totalDemand.toLocaleString()} kg</b> di rifiuti stimati (Margine sicurezza: +${marginPct}%).
    `;
  }
}

function filterCarpStreets(query) {
  const q = (query || '').toLowerCase().trim();
  const rows = document.querySelectorAll('.carp-street-row');
  rows.forEach(r => {
    const name = r.dataset.name || '';
    const nodes = r.dataset.nodes || '';
    if (!q || name.includes(q) || nodes.includes(q)) {
      r.style.display = '';
    } else {
      r.style.display = 'none';
    }
  });
}

function addCarpVehicleRow() {
  if (!State.carpConfig) return;
  if (!State.carpConfig.vehicles) State.carpConfig.vehicles = [];
  const nextNum = State.carpConfig.vehicles.length + 1;
  State.carpConfig.vehicles.push({
    name: `Compattatore_${nextNum}`,
    capacity_kg: 4500,
    fixed_cost: 100.0,
    description: `Compattatore RSU #${nextNum}`
  });
  renderCarpTables();
  showToast(`Compattatore_${nextNum} aggiunto alla flotta.`);
}

function removeCarpVehicle(idx) {
  if (!State.carpConfig || !State.carpConfig.vehicles) return;
  if (State.carpConfig.vehicles.length <= 1) {
    alert("È necessario mantenere almeno un veicolo nella flotta di raccolta.");
    return;
  }
  const name = State.carpConfig.vehicles[idx].name;
  if (confirm(`Rimuovere '${name}' dalla flotta?`)) {
    State.carpConfig.vehicles.splice(idx, 1);
    renderCarpTables();
    showToast(`${name} rimosso.`);
  }
}

function updateCarpVehicleCapacity(idx, val) {
  if (!State.carpConfig || !State.carpConfig.vehicles[idx]) return;
  State.carpConfig.vehicles[idx].capacity_kg = parseFloat(val) || 4500;
  updateCarpFleetCapacitySummary();
}

function updateCarpVehicleCost(idx, val) {
  if (!State.carpConfig || !State.carpConfig.vehicles[idx]) return;
  State.carpConfig.vehicles[idx].fixed_cost = parseFloat(val) || 100.0;
}

function updateCarpStreetDemand(idx, val) {
  State.carpConfig.streets[idx].demand_kg = parseFloat(val) || 0;
  updateCarpFleetCapacitySummary();
}

function updateCarpStreetTransit(idx, val) {
  State.carpConfig.streets[idx].transit_cost = parseFloat(val) || 1.0;
}

function autoScaleCarpFleet(andSolve = false) {
  if (!State.carpConfig) return;
  const totalDemand = (State.carpConfig.streets || []).reduce((acc, s) => acc + (parseFloat(s.demand_kg) || 0), 0);
  const totalCapacity = (State.carpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity_kg) || 0), 0);
  const missing = Math.max(0, (totalDemand * 1.20) - totalCapacity);
  const stdCap = 4500;
  const numToAdd = Math.max(1, Math.ceil(missing / stdCap));

  for (let i = 0; i < numToAdd; i++) {
    const nextNum = (State.carpConfig.vehicles || []).length + 1;
    State.carpConfig.vehicles.push({
      name: `Compattatore_${nextNum}`,
      capacity_kg: stdCap,
      fixed_cost: 100.0,
      description: `Compattatore RSU #${nextNum} (Auto-scale)`
    });
  }
  renderCarpTables();
  showToast(`Flotta aumentata automaticamente di ${numToAdd} compattatori per coprire l'intera area!`);
  if (andSolve) {
    solveCarp();
  }
}

async function cropCarpSectorByCurrentCapacity(andSolve = false) {
  if (!State.carpConfig) return;
  const totalCapacity = (State.carpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity_kg) || 0), 0);
  showToast('Riduzione area in corso per la capacità attuale dei mezzi...');
  try {
    const res = await fetch('/api/crop_sector_by_capacity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_capacity_kg: totalCapacity })
    });
    const data = await res.json();
    if (data.success) {
      State.carpConfig = data.config;
      renderCarpTables();
      showToast(`Area ridotta con successo attorno al deposito per i mezzi attuali (${totalCapacity.toLocaleString()} kg).`);
      if (andSolve) {
        solveCarp();
      }
    } else {
      if (typeof showErrorModal === 'function') {
        showErrorModal('Errore Riduzione Area', 'Non è stato possibile ridurre il settore attorno al deposito.', data.error || 'Dati non validi');
      } else {
        alert('Errore riduzione area: ' + (data.error || 'Dati non validi'));
      }
    }
  } catch (e) {
    if (typeof showErrorModal === 'function') {
      showErrorModal('Errore Comunicazione Server', 'Impossibile completare la richiesta di riduzione area.', e.toString());
    } else {
      alert('Errore comunicazione server: ' + e);
    }
  }
}

async function applyCarpSectorSize(val) {
  if (val === 'keep') return;
  const maxS = parseInt(val);
  showToast('Partizionamento settore stradale in corso...');
  try {
    const res = await fetch('/api/filter_sector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_streets: maxS })
    });
    const data = await res.json();
    if (data.success) {
      State.carpConfig = data.config;
      renderCarpTables();
      
      const totalDemand = (State.carpConfig.streets || []).reduce((acc, s) => acc + (parseFloat(s.demand_kg) || 0), 0);
      const totalCapacity = (State.carpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity_kg) || 0), 0);
      
      if (totalCapacity < totalDemand) {
        autoScaleCarpFleet();
      } else {
        showToast(`Settore aggiornato: ${State.carpConfig.streets.length} tratte viarie.`);
      }
    } else {
      if (typeof showErrorModal === 'function') {
        showErrorModal('Errore Filtro Settore', 'Non è stato possibile estrarre il settore operativo.', data.error || 'Dati non validi');
      } else {
        alert('Errore filtro settore: ' + (data.error || 'Dati non validi'));
      }
    }
  } catch (e) {
    if (typeof showErrorModal === 'function') {
      showErrorModal('Errore Richiesta Settore', 'Si è verificato un errore durante l\'estrazione del settore viario.', e.toString());
    } else {
      alert('Errore richiesta settore: ' + e);
    }
  }
}

async function solveCarp() {
  const btn = document.getElementById('btnSolveCarp');
  if (btn) {
    btn.innerText = '⏳ Risoluzione MILP...';
    btn.disabled = true;
  }
  showToast('Risoluzione CARP (Single-Commodity Flow)...');

  try {
    const totalDemand = (State.carpConfig.streets || []).reduce((acc, s) => acc + (parseFloat(s.demand_kg) || 0), 0);
    const totalCapacity = (State.carpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity_kg) || 0), 0);

    if (totalCapacity < totalDemand) {
      showFleetShortageModal('carp', {
        modelName: 'CARP (Servizi Stradali & Rifiuti)',
        totalDemand: totalDemand,
        totalCapacity: totalCapacity,
        numVehicles: (State.carpConfig.vehicles || []).length,
        avgVehCap: 4500,
        onAutoScale: autoScaleCarpFleet,
        onCrop: cropCarpSectorByCurrentCapacity
      });
      return;
    }

    const res = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.carpConfig)
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error || `Errore HTTP ${res.status}: Impossibile risolvere CARP o generare mappa`);
    }
    State.carpResult = data;

    if (!data.is_optimal || data.status === 'Infeasible') {
      if (document.getElementById('carpStatus')) {
        document.getElementById('carpStatus').innerText = data.status || 'Infeasible';
        document.getElementById('carpStatus').className = 'kpi-val red';
      }
      showFleetShortageModal('carp', {
        modelName: 'CARP (Servizi Stradali & Rifiuti)',
        totalDemand: totalDemand,
        totalCapacity: totalCapacity,
        numVehicles: (State.carpConfig.vehicles || []).length,
        avgVehCap: 4500,
        onAutoScale: autoScaleCarpFleet,
        onCrop: cropCarpSectorByCurrentCapacity
      });
      return;
    }

    document.getElementById('carpStatus').innerText = data.status;
    document.getElementById('carpCost').innerText = data.objective_value ? `${data.objective_value.toFixed(2)} €` : 'N/D';
    document.getElementById('carpDemand').innerText = `${(data.total_demand_kg || 0).toLocaleString()} kg`;

    // Render report veicoli
    renderCarpVehicleReport(data);

    // Ricarica Iframe Mappa Folium
    const iframe = document.getElementById('carpMapIframe');
    if (iframe) {
      iframe.src = '/output/percorso_raccolta.html?t=' + Date.now();
    }
    showToast('CARP risolto: mappa GIS e report mezzi aggiornati!');
  } catch (e) {
    if (typeof showErrorModal === 'function') {
      showErrorModal('Errore Ottimizzazione CARP & Mappa GIS', 'Si è verificato un errore durante la risoluzione del modello matematico o la generazione della mappa Folium.', e.message || e.toString());
    } else {
      alert('Errore CARP: ' + e);
    }
  } finally {
    if (btn) {
      btn.innerText = '⚡ Risolvi & Aggiorna Mappa GIS';
      btn.disabled = false;
    }
  }
}

function renderCarpVehicleReport(data) {
  const container = document.getElementById('carpVehiclesReport');
  if (!container) return;
  container.innerHTML = '';

  const carpVehicleColors = ['#1f77b4', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

  const streetNameMap = {};
  if (State.carpConfig && State.carpConfig.streets) {
    State.carpConfig.streets.forEach(s => {
      const k1 = `${s.u}-${s.v}`;
      const k2 = `${s.v}-${s.u}`;
      streetNameMap[k1] = s.name;
      streetNameMap[k2] = s.name;
    });
  }

  const vehiclesEntries = Object.entries(data.vehicles || {});
  if (vehiclesEntries.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); font-size:12.5px;">Nessun dato veicolo disponibile.</div>';
    return;
  }

  vehiclesEntries.forEach(([vName, vInfo], idx) => {
    const color = carpVehicleColors[idx % carpVehicleColors.length];
    const card = document.createElement('div');
    card.style.cssText = 'background: #090f1d; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 12px;';

    const fixedCost = parseFloat(vInfo.fixed_cost) || 0;
    const movements = vInfo.movements || [];
    const opCost = movements.reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0);
    const totalCost = fixedCost + opCost;
    const capacity = parseFloat(vInfo.capacity) || 1;
    const collected = parseFloat(vInfo.total_collected) || 0;
    const satPct = capacity > 0 ? ((collected / capacity) * 100).toFixed(1) : '0.0';

    const serviceMoves = movements.filter(m => m.type === 'SERVIZIO');
    const transitMoves = movements.filter(m => m.type === 'TRANSITO');
    const transitCount = transitMoves.reduce((acc, m) => acc + (m.times || 1), 0);

    if (vInfo.used) {
      let movesHtml = '';
      movements.forEach(m => {
        const sName = streetNameMap[`${m.u}-${m.v}`] || `Tratta ${m.u} &rarr; ${m.v}`;
        if (m.type === 'SERVIZIO') {
          movesHtml += `
            <div style="font-size: 11.5px; padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
              <span><b style="color: #34d399;">[SERVIZIO]</b> ${sName} (${m.u} &rarr; ${m.v})</span>
              <span style="color: var(--text-secondary);">${m.demand_kg} kg | Costo: ${parseFloat(m.cost).toFixed(1)} €</span>
            </div>
          `;
        } else {
          movesHtml += `
            <div style="font-size: 11.5px; padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; color: var(--text-muted);">
              <span><b style="color: #fbbf24;">[TRANSITO]</b> ${sName} (${m.u} &rarr; ${m.v}) ${m.times > 1 ? `(${m.times}x a vuoto)` : ''}</span>
              <span>Costo: ${parseFloat(m.cost).toFixed(1)} €</span>
            </div>
          `;
        }
      });

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${color};"></span>
            <b style="color: ${color}; font-size: 14.5px;">🚛 ${vName}</b>
          </div>
          <span class="badge-free" style="background: rgba(16,185,129,0.15); color: #34d399; font-weight: 700;">ATTIVO</span>
        </div>

        <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">
          Rifiuti Caricati: <b>${collected.toLocaleString()} kg</b> su ${capacity.toLocaleString()} kg (${satPct}%)
        </div>

        <div style="background: #17243c; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
          <div style="background: ${color}; height: 100%; width: ${Math.min(parseFloat(satPct), 100)}%;"></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; font-size: 12px; margin-bottom: 10px;">
          <div>Costo Fisso: <b>${fixedCost.toFixed(2)} €</b></div>
          <div>Costo Operativo: <b>${opCost.toFixed(2)} €</b></div>
          <div style="color: #38bdf8;">Totale Mezzo: <b>${totalCost.toFixed(2)} €</b></div>
        </div>

        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
          <span class="code-tag" style="color: #34d399; border-color: rgba(52,211,153,0.3); font-size: 11px;">
            ✅ ${serviceMoves.length} tratte con raccolta
          </span>
          <span class="code-tag" style="color: #fbbf24; border-color: rgba(251,191,36,0.3); font-size: 11px;">
            🔄 ${transitCount} transiti a vuoto (deadhead)
          </span>
        </div>

        <details style="margin-top: 6px;">
          <summary style="cursor: pointer; font-size: 11.5px; color: var(--text-muted); outline: none;">
            ▶ Mostra sequenza completa movimenti (${movements.length} tratte)
          </summary>
          <div style="margin-top: 8px; max-height: 160px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 4px;">
            ${movesHtml}
          </div>
        </details>
      `;
    } else {
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #475569;"></span>
            <b style="color: var(--text-muted); font-size: 13.5px;">🚛 ${vName}</b>
          </div>
          <span style="font-size: 11.5px; color: var(--text-muted);">NON UTILIZZATO</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
          Flotta attiva sufficiente a coprire l'intera domanda. Costo fisso evitato: <b>${fixedCost.toFixed(2)} €</b>.
        </div>
      `;
    }

    container.appendChild(card);
  });
}

// ==========================================
// 6. MODELLO EV-VRP & WCVRPTW-IF (SCARICHI INTERMEDI & FLOTTE ELETTRICHE)
// ==========================================
async function loadEvConfig() {
  try {
    const res = await fetch('/api/ev_vrp/config');
    State.evConfig = await res.json();
    renderEvTables();
    drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
  } catch (e) {
    console.error('Errore caricamento EV-VRP:', e);
  }
}

function renderEvTables() {
  if (!State.evConfig) return;

  // 0. Deposito EV
  const dep = State.evConfig.depot;
  if (dep) {
    const nameInp = document.getElementById('evDepotName');
    const latInp = document.getElementById('evDepotLat');
    const lonInp = document.getElementById('evDepotLon');
    if (nameInp) nameInp.value = dep.name || 'Hub Flotta EV';
    if (latInp) latInp.value = dep.lat !== undefined ? dep.lat : 45.4642;
    if (lonInp) lonInp.value = dep.lon !== undefined ? dep.lon : 9.1900;
  }

  // Conteggio Clienti
  const countEl = document.getElementById('evCustomerCount');
  if (countEl && State.evConfig.customers) {
    countEl.innerText = `${State.evConfig.customers.length} clienti / punti`;
  }

  // Costo kWh e Consumo
  const kwhCostInp = document.getElementById('evKwhCost');
  if (kwhCostInp && State.evConfig.kwh_cost !== undefined) {
    kwhCostInp.value = State.evConfig.kwh_cost;
  }
  const kwhPerKmInp = document.getElementById('evKwhPerKm');
  if (kwhPerKmInp && State.evConfig.kwh_per_km !== undefined) {
    kwhPerKmInp.value = State.evConfig.kwh_per_km;
  }

  // 1. Tabella Clienti con Coordinate Modificabili
  const cBody = document.getElementById('evCustomersBody');
  if (cBody && State.evConfig.customers) {
    cBody.innerHTML = '';
    State.evConfig.customers.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${c.name || ''}"
            onchange="updateEvCustomerField(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${c.lat}"
            onchange="updateEvCustomerCoord(${idx}, 'lat', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${c.lon}"
            onchange="updateEvCustomerCoord(${idx}, 'lon', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 80px;" min="10" step="50" value="${c.demand}"
            onchange="updateEvCustomerDemand(${idx}, this.value)">
        </td>
        <td style="text-align: center;">
          <button class="btn-danger-outline" title="Rimuovi cliente" onclick="removeEvCustomer(${idx})">&times;</button>
        </td>
      `;
      cBody.appendChild(tr);
    });
  }

  // 2. Tabella Impianti Intermedi con Coordinate Modificabili
  const fBody = document.getElementById('evFacilitiesBody');
  if (fBody && State.evConfig.intermediate_facilities) {
    fBody.innerHTML = '';
    State.evConfig.intermediate_facilities.forEach((f, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${f.name || ''}"
            onchange="updateEvFacilityField(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${f.lat}"
            onchange="updateEvFacilityCoord(${idx}, 'lat', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${f.lon}"
            onchange="updateEvFacilityCoord(${idx}, 'lon', this.value)">
        </td>
        <td>
          <select class="cell-inp" style="width: 100%;" onchange="updateEvFacilityField(${idx}, 'type', this.value)">
            <option value="recharge" ${f.type === 'recharge' ? 'selected' : ''}>⚡ Colonnina DC 150kW</option>
            <option value="dump" ${f.type === 'dump' ? 'selected' : ''}>🔄 Scarico TMB Rifiuti</option>
            <option value="both" ${f.type === 'both' ? 'selected' : ''}>⚡🔄 Multi-servizio</option>
          </select>
        </td>
        <td style="text-align: center;">
          <button class="btn-danger-outline" title="Rimuovi impianto" onclick="removeEvFacility(${idx})">&times;</button>
        </td>
      `;
      fBody.appendChild(tr);
    });
  }

  // 3. Tabella Flotta Veicoli EV
  const vBody = document.getElementById('evVehiclesBody');
  if (vBody && State.evConfig.vehicles) {
    vBody.innerHTML = '';
    State.evConfig.vehicles.forEach((v, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>🔋 ${v.name}</b></td>
        <td>
          <input type="number" class="cell-inp" min="100" step="100" value="${v.capacity}"
            onchange="updateEvVehicleCapacity(${idx}, this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" min="10" step="5" value="${v.battery_kwh}"
            onchange="updateEvVehicleBattery(${idx}, this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" min="0" step="5" value="${v.fixed_cost}"
            onchange="updateEvVehicleCost(${idx}, this.value)">
        </td>
        <td>
          <button class="btn-danger-outline" title="Rimuovi mezzo EV" onclick="removeEvVehicle(${idx})">&times;</button>
        </td>
      `;
      vBody.appendChild(tr);
    });
  }

  // 4. Bilancio Capacità Flotta EV
  updateEvFleetCapacitySummary();
}

function updateEvFleetCapacitySummary() {
  const sumEl = document.getElementById('evFleetCapacitySummary');
  if (!sumEl || !State.evConfig) return;

  const totalDemand = (State.evConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
  const totalCapacity = (State.evConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);

  if (totalCapacity < totalDemand) {
    const missing = totalDemand - totalCapacity;
    sumEl.style.background = 'rgba(239, 68, 68, 0.15)';
    sumEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    sumEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <span style="color: #f87171; font-weight: 700;">⚠️ Portata Flotta EV Insufficiente!</span> 
          Portata: <b>${totalCapacity.toLocaleString()} kg</b> &lt; Domanda: <b>${totalDemand.toLocaleString()} kg</b> (Mancano ${missing.toLocaleString()} kg).
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="autoScaleEvFleet()" style="font-size: 11.5px; padding: 4px 10px;">
            ⚡ Adatta Flotta Automaticamente
          </button>
          <button class="btn btn-sm btn-secondary" onclick="filterEvCustomersByCapacity()" style="font-size: 11.5px; padding: 4px 10px;">
            ✂️ Riduci Clienti per Flotta Attuale
          </button>
        </div>
      </div>
    `;
  } else {
    const marginPct = totalDemand > 0 ? (((totalCapacity / totalDemand) - 1) * 100).toFixed(0) : 0;
    sumEl.style.background = 'rgba(16, 185, 129, 0.1)';
    sumEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    sumEl.innerHTML = `
      <span style="color: #34d399; font-weight: 700;">✅ Flotta EV Idonea:</span> 
      Portata Flotta <b>${totalCapacity.toLocaleString()} kg</b> per <b>${totalDemand.toLocaleString()} kg</b> di carico (Margine: +${marginPct}%).
    `;
  }
}

function updateEvDepot(field, val) {
  if (!State.evConfig || !State.evConfig.depot) return;
  if (field === 'lat' || field === 'lon') {
    State.evConfig.depot[field] = parseFloat(val) || 0;
  } else {
    State.evConfig.depot[field] = val;
  }
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
}

function updateEvCustomerField(idx, field, val) {
  if (!State.evConfig || !State.evConfig.customers || !State.evConfig.customers[idx]) return;
  State.evConfig.customers[idx][field] = val;
}

function updateEvCustomerCoord(idx, coord, val) {
  if (!State.evConfig || !State.evConfig.customers || !State.evConfig.customers[idx]) return;
  State.evConfig.customers[idx][coord] = parseFloat(val) || 0;
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
}

function updateEvFacilityField(idx, field, val) {
  if (!State.evConfig || !State.evConfig.intermediate_facilities || !State.evConfig.intermediate_facilities[idx]) return;
  State.evConfig.intermediate_facilities[idx][field] = val;
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
}

function updateEvFacilityCoord(idx, coord, val) {
  if (!State.evConfig || !State.evConfig.intermediate_facilities || !State.evConfig.intermediate_facilities[idx]) return;
  State.evConfig.intermediate_facilities[idx][coord] = parseFloat(val) || 0;
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
}

function updateEvCustomerDemand(idx, val) {
  State.evConfig.customers[idx].demand = parseFloat(val) || 100;
  updateEvFleetCapacitySummary();
}

function updateEvVehicleCapacity(idx, val) {
  State.evConfig.vehicles[idx].capacity = parseFloat(val) || 1000;
  updateEvFleetCapacitySummary();
}

function updateEvVehicleBattery(idx, val) {
  State.evConfig.vehicles[idx].battery_kwh = parseFloat(val) || 50;
}

function updateEvVehicleCost(idx, val) {
  State.evConfig.vehicles[idx].fixed_cost = parseFloat(val) || 60;
}

function updateEvKwhCost(val) {
  if (!State.evConfig) return;
  State.evConfig.kwh_cost = parseFloat(val) || 0.38;
}

function updateEvKwhPerKm(val) {
  if (!State.evConfig) return;
  State.evConfig.kwh_per_km = parseFloat(val) || 0.45;
}

function addEvCustomerRow() {
  const name = prompt('Nome del cliente / punto di raccolta:', 'Nuovo Punto EV');
  if (!name) return;
  const demand = prompt('Domanda merci (kg):', '300');

  const dep = State.evConfig.depot;
  const offsetLat = (Math.random() - 0.5) * 0.14;
  const offsetLon = (Math.random() - 0.5) * 0.20;

  const newId = State.evConfig.customers.length + 10;
  State.evConfig.customers.push({
    id: newId,
    name: name,
    lat: Number((dep.lat + offsetLat).toFixed(4)),
    lon: Number((dep.lon + offsetLon).toFixed(4)),
    demand: parseFloat(demand) || 250
  });
  renderEvTables();
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
  showToast('Nuovo cliente EV aggiunto!');
}

function removeEvCustomer(idx) {
  if (confirm(`Rimuovere '${State.evConfig.customers[idx].name}'?`)) {
    State.evConfig.customers.splice(idx, 1);
    renderEvTables();
    drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
  }
}

function addEvFacilityRow() {
  const name = prompt('Nome impianto intermedio o stazione di ricarica:', 'Colonnina Fast DC Sud');
  if (!name) return;

  const dep = State.evConfig.depot;
  const offsetLat = (Math.random() - 0.5) * 0.10;
  const offsetLon = (Math.random() - 0.5) * 0.12;

  const newId = (State.evConfig.intermediate_facilities || []).length + 100;
  State.evConfig.intermediate_facilities.push({
    id: newId,
    name: name,
    type: 'recharge',
    lat: Number((dep.lat + offsetLat).toFixed(4)),
    lon: Number((dep.lon + offsetLon).toFixed(4))
  });
  renderEvTables();
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
  showToast('Nuovo impianto di ricarica intermedio aggiunto!');
}

function removeEvFacility(idx) {
  if (confirm(`Rimuovere l'impianto '${State.evConfig.intermediate_facilities[idx].name}'?`)) {
    State.evConfig.intermediate_facilities.splice(idx, 1);
    renderEvTables();
    drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
  }
}

function addEvVehicleRow() {
  if (!State.evConfig) return;
  if (!State.evConfig.vehicles) State.evConfig.vehicles = [];
  const nextNum = State.evConfig.vehicles.length + 1;
  State.evConfig.vehicles.push({
    name: `EV_Van_${nextNum}`,
    capacity: 1500,
    battery_kwh: 75.0,
    fixed_cost: 70.0
  });
  renderEvTables();
  showToast(`EV_Van_${nextNum} aggiunto alla flotta elettrica.`);
}

function removeEvVehicle(idx) {
  if (!State.evConfig || !State.evConfig.vehicles) return;
  if (State.evConfig.vehicles.length <= 1) {
    alert("È necessario mantenere almeno un veicolo nella flotta EV.");
    return;
  }
  const name = State.evConfig.vehicles[idx].name;
  if (confirm(`Rimuovere '${name}' dalla flotta?`)) {
    State.evConfig.vehicles.splice(idx, 1);
    renderEvTables();
    showToast(`${name} rimosso.`);
  }
}

function autoScaleEvFleet(andSolve = false) {
  if (!State.evConfig) return;
  const totalDemand = (State.evConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
  const totalCapacity = (State.evConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);
  const missing = Math.max(0, (totalDemand * 1.15) - totalCapacity);
  const stdCap = 1500;
  const numToAdd = Math.max(1, Math.ceil(missing / stdCap));

  for (let i = 0; i < numToAdd; i++) {
    const nextNum = State.evConfig.vehicles.length + 1;
    State.evConfig.vehicles.push({
      name: `EV_Van_${nextNum}`,
      capacity: stdCap,
      battery_kwh: 75.0,
      fixed_cost: 70.0
    });
  }
  renderEvTables();
  showToast(`Aggiunti ${numToAdd} veicoli alla flotta elettrica!`);
  if (andSolve) {
    solveEvVrp();
  }
}

function filterEvCustomersByCapacity(andSolve = false) {
  if (!State.evConfig) return;
  const totalCapacity = (State.evConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);
  const dep = State.evConfig.depot;

  const sorted = [...State.evConfig.customers].sort((a, b) => {
    const da = Math.hypot(a.lat - dep.lat, a.lon - dep.lon);
    const db = Math.hypot(b.lat - dep.lat, b.lon - dep.lon);
    return da - db;
  });

  let accumulated = 0;
  const kept = [];
  for (const c of sorted) {
    if (accumulated + c.demand <= totalCapacity) {
      kept.push(c);
      accumulated += c.demand;
    }
  }
  if (kept.length === 0 && sorted.length > 0) kept.push(sorted[0]);

  State.evConfig.customers = kept;
  renderEvTables();
  drawEvCanvas('evCanvas', State.evConfig, null);
  showToast(`Clienti ridotti a ${kept.length} per la capacità della flotta elettrica.`);
  if (andSolve) {
    solveEvVrp();
  }
}

async function solveEvVrp() {
  const btn = document.getElementById('btnSolveEv');
  if (btn) {
    btn.innerText = '⏳ Calcolo Cicli & Ricariche...';
    btn.disabled = true;
  }
  showToast('Risoluzione modello EV-VRP con soste intermedie...');

  try {
    const res = await fetch('/api/ev_vrp/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.evConfig)
    });
    const data = await res.json();
    State.evResult = data;

    const totalDemand = (State.evConfig.customers || []).reduce((acc, c) => acc + (parseFloat(c.demand) || 0), 0);
    const totalCapacity = (State.evConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);

    // Se non ottimale o flotta insufficiente, segnala e proponi alternative
    if (!data.is_optimal || data.status === 'Infeasible' || totalCapacity < totalDemand) {
      if (document.getElementById('evStatus')) {
        document.getElementById('evStatus').innerText = data.status || 'Infeasible';
        document.getElementById('evStatus').className = 'kpi-val red';
      }
      showFleetShortageModal('ev', {
        modelName: 'EV-VRP & WCVRPTW-IF (Flotta Elettrica)',
        totalDemand: totalDemand,
        totalCapacity: totalCapacity,
        numVehicles: (State.evConfig.vehicles || []).length,
        avgVehCap: 1200,
        onAutoScale: autoScaleEvFleet,
        onCrop: filterEvCustomersByCapacity
      });
      return;
    }

    // Aggiornamento KPI
    document.getElementById('evStatus').innerText = data.status;
    document.getElementById('evCost').innerText = data.objective_value ? `${data.objective_value.toFixed(2)} €` : 'N/D';
    document.getElementById('evKwh').innerText = `${data.total_kwh} kWh`;
    document.getElementById('evKm').innerText = `${data.total_km} km`;

    // Render report veicoli EV
    renderEvVehicleReport(data);

    // Render su Canvas
    drawEvCanvas('evCanvas', State.evConfig, data);
    showToast('Flotta elettrica ottimizzata con soste intermedie!');
  } catch (e) {
    alert('Errore risoluzione EV-VRP: ' + e);
  } finally {
    if (btn) {
      btn.innerText = '⚡ Risolvi Flotta Elettrica';
      btn.disabled = false;
    }
  }
}

function renderEvVehicleReport(data) {
  const container = document.getElementById('evReportList');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(data.vehicles || {}).forEach(([vName, vInfo], idx) => {
    const color = State.vehicleColors[idx % State.vehicleColors.length];
    const div = document.createElement('div');
    div.style.cssText = 'background: #090f1d; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 12px;';

    const fixedCost = parseFloat(vInfo.fixed_cost) || 0;
    const energyCost = parseFloat(vInfo.energy_cost) || 0;
    const totalCost = parseFloat(vInfo.cost) || (fixedCost + energyCost);

    const stopsHtml = (vInfo.stops || []).map(s => {
      if (s.type === 'depot') {
        return `<span class="code-tag" style="margin: 2px; color: #34d399; border-color: rgba(52,211,153,0.3);">🏠 ${s.name}</span>`;
      } else if (s.type === 'facility') {
        return `<span class="code-tag" style="margin: 2px; color: #fbbf24; border-color: rgba(251,191,36,0.3); font-weight:700;">⚡ ${s.name} (${s.action})</span>`;
      } else {
        return `<span class="code-tag" style="margin: 2px;">📍 ${s.name} (${s.demand}kg)</span>`;
      }
    }).join(' ➔ ');

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <b style="color: ${color}; font-size: 14px;">🔋 ${vName}</b>
        <span class="badge-free" style="background: rgba(16,185,129,0.15); color: #34d399; font-weight: 700;">ATTIVO</span>
      </div>
      <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">
        Carico a bordo: <b>${vInfo.total_load} kg</b> su ${vInfo.capacity} kg (${vInfo.saturation_pct}%) | 
        Energia: <b>${vInfo.kwh_used} kWh</b> (${vInfo.total_km} km percorsi)
      </div>
      <div style="background: #17243c; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
        <div style="background: ${color}; height: 100%; width: ${Math.min(vInfo.saturation_pct, 100)}%;"></div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; font-size: 12px; margin-bottom: 10px;">
        <div>Costo Fisso Mezzo: <b>${fixedCost.toFixed(2)} €</b></div>
        <div>Costo Ricariche DC: <b>${energyCost.toFixed(2)} €</b></div>
        <div style="color: #38bdf8;">Totale Mezzo EV: <b>${totalCost.toFixed(2)} €</b></div>
      </div>
      <div style="font-size: 12px; line-height: 1.6;">
        Sequenza soste & ricariche: ${stopsHtml}
      </div>
    `;

    container.appendChild(div);
  });
}

function drawEvCanvas(canvasId, config, solution) {
  if (canvasId === 'evCanvas' && window.L && document.getElementById('evMap')) {
    renderLeafletRouteMap('evMap', 'ev', config, solution);
    return;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas || !config) return;
  const ctx = canvas.getContext('2d');

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio || 600;
  canvas.height = rect.height * window.devicePixelRatio || 400;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;

  ctx.fillStyle = '#080d18';
  ctx.fillRect(0, 0, w, h);

  const allPoints = [];
  if (config.depot) allPoints.push(config.depot);
  if (config.intermediate_facilities && config.intermediate_facilities.length > 0) allPoints.push(...config.intermediate_facilities);
  if (config.customers && config.customers.length > 0) allPoints.push(...config.customers);
  if (allPoints.length === 0) return;

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  allPoints.forEach(p => {
    if (typeof p.lat === 'number') {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
    if (typeof p.lon === 'number') {
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
  });

  if (minLat === maxLat) { minLat -= 0.05; maxLat += 0.05; }
  if (minLon === maxLon) { minLon -= 0.05; maxLon += 0.05; }

  const pad = 50;
  const scaleX = (lon) => pad + ((lon - minLon) / (maxLon - minLon || 1)) * (w - pad * 2);
  const scaleY = (lat) => h - (pad + ((lat - minLat) / (maxLat - minLat || 1)) * (h - pad * 2));

  // 1. Tracciati Veicoli EV
  if (solution && solution.vehicles) {
    Object.entries(solution.vehicles || {}).forEach(([vName, vInfo], vIdx) => {
      if (!vInfo.used || !vInfo.stops || vInfo.stops.length < 2) return;
      const color = State.vehicleColors[vIdx % State.vehicleColors.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();

      vInfo.stops.forEach((stop, i) => {
        const x = scaleX(stop.lon);
        const y = scaleY(stop.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();

      for (let i = 0; i < vInfo.stops.length - 1; i++) {
        const p1 = { x: scaleX(vInfo.stops[i].lon), y: scaleY(vInfo.stops[i].lat) };
        const p2 = { x: scaleX(vInfo.stops[i + 1].lon), y: scaleY(vInfo.stops[i + 1].lat) };
        drawArrow(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, Math.atan2(p2.y - p1.y, p2.x - p1.x), color);
      }
    });
  } else {
    // Banner informativo su canvas
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillRect(20, 14, w - 40, 28);
    ctx.strokeRect(20, 14, w - 40, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📍 Nodi EV e impianti caricati. Modifica o aggiungi coordinate, poi premi "⚡ Risolvi" per ottimizzare.', w / 2, 32);
    ctx.textAlign = 'left';
  }

  // 2. Clienti
  config.customers.forEach((c) => {
    const x = scaleX(c.lon);
    const y = scaleY(c.lat);

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px Outfit, sans-serif';
    ctx.fillText(`${c.name} (${c.demand}kg)`, x + 8, y + 3);
  });

  // 3. Impianti Intermedi (Colonnine Fast DC / TMB)
  (config.intermediate_facilities || []).forEach(f => {
    const x = scaleX(f.lon);
    const y = scaleY(f.lat);

    // Rombo / Diamante giallo ambra
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x, y + 9);
    ctx.lineTo(x - 9, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 10.5px Outfit, sans-serif';
    ctx.fillText('⚡ ' + f.name, x + 10, y + 3);
  });

  // 4. Deposito Centrale
  const depX = scaleX(config.depot.lon);
  const depY = scaleY(config.depot.lat);

  ctx.beginPath();
  ctx.arc(depX, depY, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(depX, depY, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11.5px Outfit, sans-serif';
  ctx.fillText('🏢 ' + config.depot.name, depX + 12, depY - 4);
}

// ==========================================
// 5. MODELLO VRPPD (PICKUP AND DELIVERY PROBLEM)
// ==========================================
async function loadVrppdConfig() {
  try {
    const res = await fetch('/api/vrppd/config');
    State.vrppdConfig = await res.json();
    renderVrppdTables();
    drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, State.vrppdResult || null);
  } catch (e) {
    console.error('Errore caricamento VRPPD:', e);
    showToast('Errore nel caricamento della configurazione VRPPD');
  }
}

function renderVrppdTables() {
  if (!State.vrppdConfig) return;

  // 0. Deposito VRPPD
  const dep = State.vrppdConfig.depot;
  if (dep) {
    const nameInp = document.getElementById('vrppdDepotName');
    const latInp = document.getElementById('vrppdDepotLat');
    const lonInp = document.getElementById('vrppdDepotLon');
    if (nameInp) nameInp.value = dep.name || 'Hub Centrale';
    if (latInp) latInp.value = dep.lat !== undefined ? dep.lat : 45.4642;
    if (lonInp) lonInp.value = dep.lon !== undefined ? dep.lon : 9.1900;
  }

  // 1. Tabella Richieste Accoppiate (P & D) con Coordinate Modificabili
  const reqBody = document.getElementById('vrppdRequestsBody');
  if (reqBody) {
    reqBody.innerHTML = '';
    const reqs = State.vrppdConfig.requests || [];
    const countEl = document.getElementById('vrppdReqCount');
    if (countEl) countEl.innerText = `${reqs.length} richieste`;

    reqs.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${r.name}" onchange="updateVrppdRequest(${idx}, 'name', this.value)">
          <small style="color: var(--text-muted); font-size: 11px;">ID: ${r.id}</small>
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="1" max="10000" step="10" value="${r.demand_kg}" onchange="updateVrppdRequest(${idx}, 'demand_kg', parseFloat(this.value)||10)">
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <input type="text" class="cell-inp" style="width: 100%; font-size: 11.5px; font-weight:600; color:#34d399;" value="${r.pickup.name || ''}" placeholder="Nome Ritiro" onchange="updateVrppdPoint(${idx}, 'pickup', 'name', this.value)">
            <div style="display: flex; gap: 4px; font-size: 11px;">
              <span>Lat: <input type="number" step="0.0001" class="cell-inp" style="width: 72px;" value="${r.pickup.lat}" onchange="updateVrppdPoint(${idx}, 'pickup', 'lat', this.value)"></span>
              <span>Lon: <input type="number" step="0.0001" class="cell-inp" style="width: 72px;" value="${r.pickup.lon}" onchange="updateVrppdPoint(${idx}, 'pickup', 'lon', this.value)"></span>
            </div>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <input type="text" class="cell-inp" style="width: 100%; font-size: 11.5px; font-weight:600; color:#fb923c;" value="${r.delivery.name || ''}" placeholder="Nome Consegna" onchange="updateVrppdPoint(${idx}, 'delivery', 'name', this.value)">
            <div style="display: flex; gap: 4px; font-size: 11px;">
              <span>Lat: <input type="number" step="0.0001" class="cell-inp" style="width: 72px;" value="${r.delivery.lat}" onchange="updateVrppdPoint(${idx}, 'delivery', 'lat', this.value)"></span>
              <span>Lon: <input type="number" step="0.0001" class="cell-inp" style="width: 72px;" value="${r.delivery.lon}" onchange="updateVrppdPoint(${idx}, 'delivery', 'lon', this.value)"></span>
            </div>
          </div>
        </td>
        <td style="text-align: center;">
          <button class="btn-del" onclick="removeVrppdRequest(${idx})" title="Rimuovi richiesta">✕</button>
        </td>
      `;
      reqBody.appendChild(tr);
    });
  }

  // 2. Tabella Veicoli VRPPD
  const vehBody = document.getElementById('vrppdVehiclesBody');
  if (vehBody) {
    vehBody.innerHTML = '';
    const vehs = State.vrppdConfig.vehicles || [];

    vehs.forEach((v, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${v.name}" onchange="updateVrppdVehicle(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="100" max="40000" step="50" value="${v.capacity}" onchange="updateVrppdVehicle(${idx}, 'capacity', parseFloat(this.value)||1000)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0" max="1000" step="5" value="${v.fixed_cost}" onchange="updateVrppdVehicle(${idx}, 'fixed_cost', parseFloat(this.value)||0)">
        </td>
        <td style="text-align: center;">
          <button class="btn-del" onclick="removeVrppdVehicle(${idx})" title="Rimuovi veicolo">✕</button>
        </td>
      `;
      vehBody.appendChild(tr);
    });
  }

  // Costo per km
  const kmInp = document.getElementById('vrppdCostPerKm');
  if (kmInp && State.vrppdConfig.cost_per_km !== undefined) {
    kmInp.value = State.vrppdConfig.cost_per_km;
  }

  // Bilancio capacità vs domanda
  updateVrppdFleetCapacitySummary();
}

function updateVrppdFleetCapacitySummary() {
  const sumEl = document.getElementById('vrppdFleetCapacitySummary');
  if (!sumEl || !State.vrppdConfig) return;

  const totCap = (State.vrppdConfig.vehicles || []).reduce((a, b) => a + (Number(b.capacity) || 0), 0);
  const totDemand = (State.vrppdConfig.requests || []).reduce((a, b) => a + (Number(b.demand_kg) || 0), 0);

  if (totCap < totDemand) {
    const missing = totDemand - totCap;
    sumEl.style.background = 'rgba(239, 68, 68, 0.15)';
    sumEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    sumEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <span style="color: #f87171; font-weight: 700;">⚠️ Portata Flotta Insufficiente per le richieste di trasporto!</span> 
          Portata: <b>${totCap.toLocaleString()} kg</b> &lt; Somma Richieste: <b>${totDemand.toLocaleString()} kg</b> (Mancano ${missing.toLocaleString()} kg).
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="autoScaleVrppdFleet(false)" style="font-size: 11.5px; padding: 4px 10px;">
            ⚡ Adatta Flotta Automaticamente
          </button>
          <button class="btn btn-sm btn-secondary" onclick="filterVrppdRequestsByCapacity(false)" style="font-size: 11.5px; padding: 4px 10px;">
            ✂️ Riduci Richieste per Flotta Attuale
          </button>
        </div>
      </div>
    `;
  } else {
    const marginPct = totDemand > 0 ? (((totCap / totDemand) - 1) * 100).toFixed(0) : 0;
    sumEl.style.background = 'rgba(16, 185, 129, 0.1)';
    sumEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    sumEl.innerHTML = `
      <span style="color: #34d399; font-weight: 700;">✅ Flotta Idonea:</span> 
      Portata Flotta <b>${totCap.toLocaleString()} kg</b> per <b>${totDemand.toLocaleString()} kg</b> di richieste (Margine: +${marginPct}%).
    `;
  }
}

function autoScaleVrppdFleet(andSolve = false) {
  if (!State.vrppdConfig) return;
  const totCap = (State.vrppdConfig.vehicles || []).reduce((a, b) => a + (Number(b.capacity) || 0), 0);
  const totDemand = (State.vrppdConfig.requests || []).reduce((a, b) => a + (Number(b.demand_kg) || 0), 0);
  const missing = Math.max(0, (totDemand * 1.15) - totCap);
  const stdCap = 900;
  const numToAdd = Math.max(1, Math.ceil(missing / stdCap));

  for (let i = 0; i < numToAdd; i++) {
    const nextNum = (State.vrppdConfig.vehicles || []).length + 1;
    State.vrppdConfig.vehicles.push({
      name: `Furgone_Express_${nextNum}`,
      capacity: stdCap,
      fixed_cost: 85.0,
      description: 'Furgone VRPPD (Auto-scale)'
    });
  }
  renderVrppdTables();
  showToast(`Aggiunti ${numToAdd} furgoni per coprire tutte le spedizioni!`);
  if (andSolve) {
    solveVrppd();
  }
}

function filterVrppdRequestsByCapacity(andSolve = false) {
  if (!State.vrppdConfig) return;
  const totalCapacity = (State.vrppdConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);
  const dep = State.vrppdConfig.depot;

  const sorted = [...(State.vrppdConfig.requests || [])].sort((a, b) => {
    const da = Math.hypot((a.pickup?.lat || 0) - dep.lat, (a.pickup?.lon || 0) - dep.lon);
    const db = Math.hypot((b.pickup?.lat || 0) - dep.lat, (b.pickup?.lon || 0) - dep.lon);
    return da - db;
  });

  let accumulated = 0;
  const kept = [];
  for (const r of sorted) {
    if (accumulated + (r.demand_kg || 0) <= totalCapacity) {
      kept.push(r);
      accumulated += (r.demand_kg || 0);
    }
  }
  if (kept.length === 0 && sorted.length > 0) kept.push(sorted[0]);

  State.vrppdConfig.requests = kept;
  renderVrppdTables();
  drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, null);
  showToast(`Richieste ridotte a ${kept.length} per la capacità attuale dei mezzi.`);
  if (andSolve) {
    solveVrppd();
  }
}

function updateVrppdDepot(field, val) {
  if (!State.vrppdConfig || !State.vrppdConfig.depot) return;
  if (field === 'lat' || field === 'lon') {
    State.vrppdConfig.depot[field] = parseFloat(val) || 0;
  } else {
    State.vrppdConfig.depot[field] = val;
  }
  drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, State.vrppdResult || null);
}

function updateVrppdPoint(reqIdx, pointType, field, val) {
  if (!State.vrppdConfig || !State.vrppdConfig.requests || !State.vrppdConfig.requests[reqIdx]) return;
  const pt = State.vrppdConfig.requests[reqIdx][pointType];
  if (!pt) return;
  if (field === 'lat' || field === 'lon') {
    pt[field] = parseFloat(val) || 0;
  } else {
    pt[field] = val;
  }
  drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, State.vrppdResult || null);
}

function updateVrppdRequest(idx, field, val) {
  if (State.vrppdConfig && State.vrppdConfig.requests && State.vrppdConfig.requests[idx]) {
    State.vrppdConfig.requests[idx][field] = val;
    renderVrppdTables();
  }
}

function removeVrppdRequest(idx) {
  if (!State.vrppdConfig || !State.vrppdConfig.requests) return;
  if (State.vrppdConfig.requests.length <= 1) {
    showToast('È necessario mantenere almeno una richiesta di ritiro/consegna!');
    return;
  }
  State.vrppdConfig.requests.splice(idx, 1);
  renderVrppdTables();
  drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, State.vrppdResult || null);
  showToast('Richiesta VRPPD rimossa');
}

function addVrppdRequestRow() {
  if (!State.vrppdConfig) return;
  if (!State.vrppdConfig.requests) State.vrppdConfig.requests = [];
  const dep = State.vrppdConfig.depot;
  const num = State.vrppdConfig.requests.length + 1;

  const pLat = Number((dep.lat + (Math.random() - 0.5) * 0.08).toFixed(4));
  const pLon = Number((dep.lon + (Math.random() - 0.5) * 0.10).toFixed(4));
  const dLat = Number((dep.lat + (Math.random() - 0.5) * 0.08).toFixed(4));
  const dLon = Number((dep.lon + (Math.random() - 0.5) * 0.10).toFixed(4));

  State.vrppdConfig.requests.push({
    id: `REQ_${num}`,
    name: `Richiesta Spedizione ${num}`,
    demand_kg: 250.0,
    pickup: {
      id: `P${num}`,
      name: `Ritiro Mittente ${num}`,
      lat: pLat,
      lon: pLon
    },
    delivery: {
      id: `D${num}`,
      name: `Consegna Destinatario ${num}`,
      lat: dLat,
      lon: dLon
    }
  });

  renderVrppdTables();
  drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, State.vrppdResult || null);
  showToast(`Nuova richiesta di ritiro e consegna aggiunta!`);
}

function updateVrppdVehicle(idx, field, val) {
  if (State.vrppdConfig && State.vrppdConfig.vehicles && State.vrppdConfig.vehicles[idx]) {
    State.vrppdConfig.vehicles[idx][field] = val;
    renderVrppdTables();
  }
}

function removeVrppdVehicle(idx) {
  if (!State.vrppdConfig || !State.vrppdConfig.vehicles) return;
  if (State.vrppdConfig.vehicles.length <= 1) {
    showToast('È necessario mantenere almeno un veicolo nella flotta VRPPD!');
    return;
  }
  State.vrppdConfig.vehicles.splice(idx, 1);
  renderVrppdTables();
  showToast('Veicolo VRPPD rimosso');
}

function addVrppdVehicleRow() {
  if (!State.vrppdConfig) return;
  if (!State.vrppdConfig.vehicles) State.vrppdConfig.vehicles = [];
  const nextNum = State.vrppdConfig.vehicles.length + 1;
  State.vrppdConfig.vehicles.push({
    name: `Furgone_Express_${nextNum}`,
    capacity: 900.0,
    fixed_cost: 85.0,
    description: 'Furgone per ritiri e consegne congiunte'
  });
  renderVrppdTables();
  showToast(`Furgone_Express_${nextNum} aggiunto alla flotta VRPPD!`);
}

function updateVrppdCostPerKm(val) {
  if (State.vrppdConfig) {
    State.vrppdConfig.cost_per_km = parseFloat(val) || 1.25;
  }
}

async function solveVrppd() {
  const btn = document.getElementById('btnSolveVrppd');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ Risoluzione MILP VRPPD...';
  }

  const statEl = document.getElementById('vrppdStatus');
  if (statEl) {
    statEl.innerText = 'Calcolo in corso...';
    statEl.className = 'kpi-val amber';
  }

  try {
    const totCap = (State.vrppdConfig.vehicles || []).reduce((a, b) => a + (Number(b.capacity) || 0), 0);
    const totDemand = (State.vrppdConfig.requests || []).reduce((a, b) => a + (Number(b.demand_kg) || 0), 0);

    const res = await fetch('/api/vrppd/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.vrppdConfig)
    });
    const data = await res.json();
    State.vrppdResult = data;

    // Se non ottimale o flotta insufficiente, segnala e proponi alternative
    if (!data.is_optimal || data.status === 'Infeasible' || totCap < totDemand) {
      if (statEl) {
        statEl.innerText = data.status || 'Infeasible';
        statEl.className = 'kpi-val red';
      }
      showFleetShortageModal('vrppd', {
        modelName: 'VRPPD (Ritiri & Consegne Accoppiati)',
        totalDemand: totDemand,
        totalCapacity: totCap,
        numVehicles: (State.vrppdConfig.vehicles || []).length,
        avgVehCap: 900,
        onAutoScale: autoScaleVrppdFleet,
        onCrop: filterVrppdRequestsByCapacity
      });
      return;
    }

    if (statEl) {
      statEl.innerText = data.status || 'Ottimale';
      statEl.className = data.is_optimal ? 'kpi-val green' : 'kpi-val amber';
    }

    const costEl = document.getElementById('vrppdCost');
    if (costEl) costEl.innerText = `${(data.total_cost || 0).toFixed(2)} €`;

    const servedEl = document.getElementById('vrppdServed');
    if (servedEl) servedEl.innerText = `${data.requests_served || 0} / ${data.total_requests || 0}`;

    const kmEl = document.getElementById('vrppdKm');
    if (kmEl) kmEl.innerText = `${(data.total_km || 0).toFixed(1)} km`;

    renderVrppdReportList(data);
    drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, data);
    showToast(`VRPPD Ottimizzato! Costo totale: ${(data.total_cost || 0).toFixed(2)} €`);

  } catch (e) {
    console.error('Errore solve VRPPD:', e);
    showToast('Errore durante la risoluzione del modello VRPPD');
    if (statEl) {
      statEl.innerText = 'Errore';
      statEl.className = 'kpi-val red';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '⚡ Risolvi VRPPD Accoppiato';
    }
  }
}

function renderVrppdReportList(res) {
  const container = document.getElementById('vrppdReportList');
  if (!container) return;

  container.innerHTML = '';
  const vehs = res.vehicles || [];

  vehs.forEach((v, idx) => {
    const color = State.vehicleColors[idx % State.vehicleColors.length];
    const isUsed = v.used;
    const card = document.createElement('div');
    card.style.background = isUsed ? 'rgba(15, 23, 42, 0.75)' : 'rgba(15, 23, 42, 0.35)';
    card.style.border = isUsed ? `1px solid ${color}` : '1px dashed rgba(255,255,255,0.1)';
    card.style.borderRadius = '8px';
    card.style.padding = '12px 16px';
    card.style.marginBottom = '12px';

    let stopBadges = '';
    (v.detailed_stops || []).forEach(st => {
      let badgeStyle = 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);';
      let icon = '🏢';
      if (st.type === 'pickup') {
        badgeStyle = 'background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);';
        icon = '🟢';
      } else if (st.type === 'delivery') {
        badgeStyle = 'background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3);';
        icon = '🟠';
      }
      stopBadges += `
        <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11.5px; margin: 3px 2px; ${badgeStyle}">
          ${icon} <b>${st.name}</b> (Carico a bordo: ${st.load_onboard_after} kg)
        </span> ➔
      `;
    });
    // Rimuovi ultima freccia
    stopBadges = stopBadges.replace(/➔\s*$/, '');

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
          <b style="font-size: 14px; color: ${color};">${v.name}</b>
          <span style="font-size: 11px; color: var(--text-muted);">(Portata: ${v.capacity} kg)</span>
        </div>
        <div>
          ${isUsed 
            ? `<span class="code-tag" style="color: #34d399; font-weight: 700;">IN SERVIZIO</span>` 
            : `<span class="code-tag" style="color: var(--text-muted);">NON NECESSARIO</span>`}
        </div>
      </div>

      ${isUsed ? `
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.5;">
          <b>Sequenza Operativa di Visita (Ritiro ➔ Consegna):</b><br>
          <div style="margin-top: 4px;">${stopBadges}</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11.5px;">
          <div><span style="color: var(--text-muted);">Km Percorsi:</span> <b>${v.km} km</b></div>
          <div><span style="color: var(--text-muted);">Costo Fisso:</span> <b>${v.fixed_cost.toFixed(2)} €</b></div>
          <div><span style="color: var(--text-muted);">Costo Marcia:</span> <b>${v.km_cost.toFixed(2)} €</b></div>
          <div><span style="color: var(--text-muted);">Costo Totale:</span> <b style="color: #34d399;">${v.total_cost.toFixed(2)} €</b></div>
          <div><span style="color: var(--text-muted);">Carico Massimo:</span> <b>${v.max_load_carried} kg</b></div>
        </div>
      ` : `
        <div style="font-size: 12px; color: var(--text-muted);">
          Mezzo lasciato a riposo in rimessa (risparmiati ${v.fixed_cost.toFixed(2)} € di ingaggio giornaliero).
        </div>
      `}
    `;
    container.appendChild(card);
  });
}

function drawVrppdCanvas(canvasId, config, result) {
  if (canvasId === 'vrppdCanvas' && window.L && document.getElementById('vrppdMap')) {
    renderLeafletRouteMap('vrppdMap', 'vrppd', config, result);
    return;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas || !config) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth || 600;
  const h = canvas.height = 360;

  ctx.clearRect(0, 0, w, h);

  // Raccolta coordinate
  const pts = [config.depot];
  (config.requests || []).forEach(r => {
    pts.push(r.pickup);
    pts.push(r.delivery);
  });

  const lats = pts.map(p => p.lat);
  const lons = pts.map(p => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const pad = 40;
  const scaleX = lon => pad + ((lon - minLon) / ((maxLon - minLon) || 1)) * (w - 2 * pad);
  const scaleY = lat => (h - pad) - ((lat - minLat) / ((maxLat - minLat) || 1)) * (h - 2 * pad);

  // 1. Traccia linee tratteggiate tra coppie Ritiro (P) e Consegna (D)
  (config.requests || []).forEach(r => {
    const px = scaleX(r.pickup.lon);
    const py = scaleY(r.pickup.lat);
    const dx = scaleX(r.delivery.lon);
    const dy = scaleY(r.delivery.lat);

    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(dx, dy);
    ctx.stroke();
    ctx.restore();
  });

  // 2. Disegna percorsi dei veicoli ottimizzati
  if (result && result.vehicles) {
    result.vehicles.forEach((v, vIdx) => {
      if (!v.used || !v.route_nodes || v.route_nodes.length < 2) return;
      const color = State.vehicleColors[vIdx % State.vehicleColors.length];

      const nodesMap = { [config.depot.id]: config.depot };
      (config.requests || []).forEach(r => {
        nodesMap[r.pickup.id] = r.pickup;
        nodesMap[r.delivery.id] = r.delivery;
      });

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let i = 0; i < v.route_nodes.length; i++) {
        const nid = v.route_nodes[i];
        const nd = nodesMap[nid];
        if (!nd) continue;
        const x = scaleX(nd.lon);
        const y = scaleY(nd.lat);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Frecce direzionali
      for (let i = 0; i < v.route_nodes.length - 1; i++) {
        const n1 = nodesMap[v.route_nodes[i]];
        const n2 = nodesMap[v.route_nodes[i + 1]];
        if (!n1 || !n2) continue;
        const x1 = scaleX(n1.lon);
        const y1 = scaleY(n1.lat);
        const x2 = scaleX(n2.lon);
        const y2 = scaleY(n2.lat);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(midX + 7 * Math.cos(angle), midY + 7 * Math.sin(angle));
        ctx.lineTo(midX + 7 * Math.cos(angle + 2.5), midY + 7 * Math.sin(angle + 2.5));
        ctx.lineTo(midX + 7 * Math.cos(angle - 2.5), midY + 7 * Math.sin(angle - 2.5));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  } else {
    // Banner informativo su canvas per VRPPD
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillRect(20, 14, w - 40, 28);
    ctx.strokeRect(20, 14, w - 40, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📍 Richieste caricate sulla mappa. Modifica o aggiungi punti P/D, poi premi "⚡ Risolvi" per calcolare i percorsi.', w / 2, 32);
    ctx.textAlign = 'left';
  }

  // 3. Disegna nodi Ritiro (P)
  (config.requests || []).forEach(r => {
    const x = scaleX(r.pickup.lon);
    const y = scaleY(r.pickup.lat);

    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillText(`${r.pickup.id} (+${r.demand_kg}kg)`, x + 9, y - 2);
  });

  // 4. Disegna nodi Consegna (D)
  (config.requests || []).forEach(r => {
    const x = scaleX(r.delivery.lon);
    const y = scaleY(r.delivery.lat);

    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fed7aa';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillText(`${r.delivery.id} (-${r.demand_kg}kg)`, x + 9, y + 10);
  });

  // 5. Deposito Centrale
  const depX = scaleX(config.depot.lon);
  const depY = scaleY(config.depot.lat);

  ctx.beginPath();
  ctx.arc(depX, depY, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(depX, depY, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11.5px Outfit, sans-serif';
  ctx.fillText('🏢 ' + config.depot.name, depX + 12, depY - 4);
}

// ==========================================
// 6. MODELLO MDVRP (MULTI-DEPOT VRP)
// ==========================================
async function loadMdvrpConfig() {
  try {
    const res = await fetch('/api/mdvrp/config');
    State.mdvrpConfig = await res.json();
    renderMdvrpTables();
    drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  } catch (e) {
    console.error('Errore caricamento MDVRP:', e);
    showToast('Errore nel caricamento della configurazione MDVRP');
  }
}

function renderMdvrpTables() {
  if (!State.mdvrpConfig) return;

  // 1. Tabella Depositi
  const depBody = document.getElementById('mdvrpDepotsBody');
  if (depBody) {
    depBody.innerHTML = '';
    const deps = State.mdvrpConfig.depots || [];

    deps.forEach((d, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${d.name}" onchange="updateMdvrpDepot(${idx}, 'name', this.value)">
          <small style="color: var(--text-muted); font-size: 11px;">ID: ${d.id}</small>
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${d.lat}" onchange="updateMdvrpDepotCoord(${idx}, 'lat', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${d.lon}" onchange="updateMdvrpDepotCoord(${idx}, 'lon', this.value)">
        </td>
        <td>
          <input type="color" value="${d.color || '#3b82f6'}" style="width: 32px; height: 24px; border: none; background: none; cursor: pointer;" onchange="updateMdvrpDepot(${idx}, 'color', this.value)">
        </td>
        <td style="text-align: center;">
          <button class="btn-del" onclick="removeMdvrpDepot(${idx})" title="Rimuovi deposito">✕</button>
        </td>
      `;
      depBody.appendChild(tr);
    });
  }

  // 2. Tabella Clienti
  const custBody = document.getElementById('mdvrpCustomersBody');
  if (custBody) {
    custBody.innerHTML = '';
    const custs = State.mdvrpConfig.customers || [];

    custs.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${c.name}" onchange="updateMdvrpCustomer(${idx}, 'name', this.value)">
          <small style="color: var(--text-muted); font-size: 11px;">ID: ${c.id}</small>
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${c.lat}" onchange="updateMdvrpCustomerCoord(${idx}, 'lat', this.value)">
        </td>
        <td>
          <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${c.lon}" onchange="updateMdvrpCustomerCoord(${idx}, 'lon', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="10" max="20000" step="50" value="${c.demand}" onchange="updateMdvrpCustomer(${idx}, 'demand', parseFloat(this.value)||100)">
        </td>
        <td style="text-align: center;">
          <button class="btn-del" onclick="removeMdvrpCustomer(${idx})" title="Rimuovi cliente">✕</button>
        </td>
      `;
      custBody.appendChild(tr);
    });
  }

  // 3. Tabella Veicoli con selettore Home Depot
  const vehBody = document.getElementById('mdvrpVehiclesBody');
  if (vehBody) {
    vehBody.innerHTML = '';
    const vehs = State.mdvrpConfig.vehicles || [];
    const deps = State.mdvrpConfig.depots || [];

    vehs.forEach((v, idx) => {
      let depotOptions = '';
      deps.forEach(d => {
        depotOptions += `<option value="${d.id}" ${v.home_depot === d.id ? 'selected' : ''}>${d.name}</option>`;
      });

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${v.name}" onchange="updateMdvrpVehicle(${idx}, 'name', this.value)">
        </td>
        <td>
          <select class="cell-inp" style="width: 100%;" onchange="updateMdvrpVehicle(${idx}, 'home_depot', this.value)">
            ${depotOptions}
          </select>
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="100" max="40000" step="50" value="${v.capacity}" onchange="updateMdvrpVehicle(${idx}, 'capacity', parseFloat(this.value)||1000)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0" max="1000" step="5" value="${v.fixed_cost}" onchange="updateMdvrpVehicle(${idx}, 'fixed_cost', parseFloat(this.value)||0)">
        </td>
        <td style="text-align: center;">
          <button class="btn-del" onclick="removeMdvrpVehicle(${idx})" title="Rimuovi veicolo">✕</button>
        </td>
      `;
      vehBody.appendChild(tr);
    });
  }

  // Costo al km
  const kmInp = document.getElementById('mdvrpCostPerKm');
  if (kmInp && State.mdvrpConfig.cost_per_km !== undefined) {
    kmInp.value = State.mdvrpConfig.cost_per_km;
  }

  // Bilancio capacità vs domanda
  updateMdvrpFleetCapacitySummary();
}

function updateMdvrpFleetCapacitySummary() {
  const sumEl = document.getElementById('mdvrpFleetCapacitySummary');
  if (!sumEl || !State.mdvrpConfig) return;

  const totCap = (State.mdvrpConfig.vehicles || []).reduce((a, b) => a + (Number(b.capacity) || 0), 0);
  const totDemand = (State.mdvrpConfig.customers || []).reduce((a, b) => a + (Number(b.demand) || 0), 0);

  if (totCap < totDemand) {
    const missing = totDemand - totCap;
    sumEl.style.background = 'rgba(239, 68, 68, 0.15)';
    sumEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    sumEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <span style="color: #f87171; font-weight: 700;">⚠️ Portata Flotta Multi-Sito Insufficiente!</span> 
          Portata: <b>${totCap.toLocaleString()} kg</b> &lt; Domanda: <b>${totDemand.toLocaleString()} kg</b> (Mancano ${missing.toLocaleString()} kg).
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="autoScaleMdvrpFleet(false)" style="font-size: 11.5px; padding: 4px 10px;">
            ⚡ Adatta Flotta Automaticamente
          </button>
          <button class="btn btn-sm btn-secondary" onclick="filterMdvrpCustomersByCapacity(false)" style="font-size: 11.5px; padding: 4px 10px;">
            ✂️ Riduci Clienti per Flotta Attuale
          </button>
        </div>
      </div>
    `;
  } else {
    const marginPct = totDemand > 0 ? (((totCap / totDemand) - 1) * 100).toFixed(0) : 0;
    sumEl.style.background = 'rgba(16, 185, 129, 0.1)';
    sumEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    sumEl.innerHTML = `
      <span style="color: #34d399; font-weight: 700;">✅ Flotta Idonea:</span> 
      Portata Flotta <b>${totCap.toLocaleString()} kg</b> per <b>${totDemand.toLocaleString()} kg</b> di domanda (Margine: +${marginPct}%).
    `;
  }
}

function autoScaleMdvrpFleet(andSolve = false) {
  if (!State.mdvrpConfig) return;
  const totCap = (State.mdvrpConfig.vehicles || []).reduce((a, b) => a + (Number(b.capacity) || 0), 0);
  const totDemand = (State.mdvrpConfig.customers || []).reduce((a, b) => a + (Number(b.demand) || 0), 0);
  const missing = Math.max(0, (totDemand * 1.15) - totCap);
  const stdCap = 2500;
  const numToAdd = Math.max(1, Math.ceil(missing / stdCap));
  const deps = State.mdvrpConfig.depots || [];

  for (let i = 0; i < numToAdd; i++) {
    const nextNum = (State.mdvrpConfig.vehicles || []).length + 1;
    const assignedDep = deps.length > 0 ? deps[i % deps.length].id : 'DEP_1';
    State.mdvrpConfig.vehicles.push({
      name: `Camion_MD_${nextNum}`,
      home_depot: assignedDep,
      capacity: stdCap,
      fixed_cost: 80.0
    });
  }
  renderMdvrpTables();
  showToast(`Aggiunti ${numToAdd} camion alla flotta multi-deposito!`);
  if (andSolve) {
    solveMdvrp();
  }
}

function filterMdvrpCustomersByCapacity(andSolve = false) {
  if (!State.mdvrpConfig) return;
  const totalCapacity = (State.mdvrpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity) || 0), 0);
  const deps = State.mdvrpConfig.depots || [];

  const sorted = [...(State.mdvrpConfig.customers || [])].sort((a, b) => {
    const minDa = deps.length > 0 ? Math.min(...deps.map(d => Math.hypot(a.lat - d.lat, a.lon - d.lon))) : 0;
    const minDb = deps.length > 0 ? Math.min(...deps.map(d => Math.hypot(b.lat - d.lat, b.lon - d.lon))) : 0;
    return minDa - minDb;
  });

  let accumulated = 0;
  const kept = [];
  for (const c of sorted) {
    if (accumulated + (c.demand || 0) <= totalCapacity) {
      kept.push(c);
      accumulated += (c.demand || 0);
    }
  }
  if (kept.length === 0 && sorted.length > 0) kept.push(sorted[0]);

  State.mdvrpConfig.customers = kept;
  renderMdvrpTables();
  drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, null);
  showToast(`Clienti ridotti a ${kept.length} per la capacità attuale dei mezzi.`);
  if (andSolve) {
    solveMdvrp();
  }
}

function updateMdvrpDepot(idx, field, val) {
  if (State.mdvrpConfig && State.mdvrpConfig.depots && State.mdvrpConfig.depots[idx]) {
    State.mdvrpConfig.depots[idx][field] = val;
    drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  }
}

function updateMdvrpDepotCoord(idx, coord, val) {
  if (State.mdvrpConfig && State.mdvrpConfig.depots && State.mdvrpConfig.depots[idx]) {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      State.mdvrpConfig.depots[idx][coord] = num;
      drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
    }
  }
}

function removeMdvrpDepot(idx) {
  if (!State.mdvrpConfig || !State.mdvrpConfig.depots) return;
  if (State.mdvrpConfig.depots.length <= 1) {
    showToast('È necessario mantenere almeno un deposito nel modello MDVRP!');
    return;
  }
  const removedId = State.mdvrpConfig.depots[idx].id;
  State.mdvrpConfig.depots.splice(idx, 1);

  // Se qualche veicolo aveva questo home_depot, riassegnalo al primo disponibile
  const fallback = State.mdvrpConfig.depots[0].id;
  (State.mdvrpConfig.vehicles || []).forEach(v => {
    if (v.home_depot === removedId) v.home_depot = fallback;
  });

  renderMdvrpTables();
  drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  showToast('Deposito MDVRP rimosso');
}

function addMdvrpDepotRow() {
  if (!State.mdvrpConfig) return;
  if (!State.mdvrpConfig.depots) State.mdvrpConfig.depots = [];
  const num = State.mdvrpConfig.depots.length + 1;
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];
  const baseLat = State.mdvrpConfig.depots[0] ? State.mdvrpConfig.depots[0].lat : 45.75;
  const baseLon = State.mdvrpConfig.depots[0] ? State.mdvrpConfig.depots[0].lon : 12.25;

  State.mdvrpConfig.depots.push({
    id: `DEP_${num}`,
    name: `Magazzino Hub ${num}`,
    lat: Number((baseLat + (Math.random() - 0.5) * 0.15).toFixed(4)),
    lon: Number((baseLon + (Math.random() - 0.5) * 0.18).toFixed(4)),
    color: colors[(num - 1) % colors.length]
  });

  renderMdvrpTables();
  drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  showToast(`Nuovo magazzino hub aggiunto!`);
}

function updateMdvrpCustomer(idx, field, val) {
  if (State.mdvrpConfig && State.mdvrpConfig.customers && State.mdvrpConfig.customers[idx]) {
    State.mdvrpConfig.customers[idx][field] = val;
    drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  }
}

function updateMdvrpCustomerCoord(idx, coord, val) {
  if (State.mdvrpConfig && State.mdvrpConfig.customers && State.mdvrpConfig.customers[idx]) {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      State.mdvrpConfig.customers[idx][coord] = num;
      drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
    }
  }
}

function removeMdvrpCustomer(idx) {
  if (!State.mdvrpConfig || !State.mdvrpConfig.customers) return;
  if (State.mdvrpConfig.customers.length <= 1) {
    showToast('È necessario mantenere almeno un cliente!');
    return;
  }
  State.mdvrpConfig.customers.splice(idx, 1);
  renderMdvrpTables();
  drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  showToast('Cliente MDVRP rimosso');
}

function addMdvrpCustomerRow() {
  if (!State.mdvrpConfig) return;
  if (!State.mdvrpConfig.customers) State.mdvrpConfig.customers = [];
  const num = State.mdvrpConfig.customers.length + 1;
  const baseLat = State.mdvrpConfig.depots[0] ? State.mdvrpConfig.depots[0].lat : 45.75;
  const baseLon = State.mdvrpConfig.depots[0] ? State.mdvrpConfig.depots[0].lon : 12.25;

  State.mdvrpConfig.customers.push({
    id: `CUST_${num}`,
    name: `Punto Consegna ${num}`,
    lat: Number((baseLat + (Math.random() - 0.5) * 0.20).toFixed(4)),
    lon: Number((baseLon + (Math.random() - 0.5) * 0.25).toFixed(4)),
    demand: 350.0
  });

  renderMdvrpTables();
  drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  showToast(`Nuovo cliente MDVRP aggiunto!`);
}

function updateMdvrpVehicle(idx, field, val) {
  if (State.mdvrpConfig && State.mdvrpConfig.vehicles && State.mdvrpConfig.vehicles[idx]) {
    State.mdvrpConfig.vehicles[idx][field] = val;
    renderMdvrpTables();
  }
}

function removeMdvrpVehicle(idx) {
  if (!State.mdvrpConfig || !State.mdvrpConfig.vehicles) return;
  if (State.mdvrpConfig.vehicles.length <= 1) {
    showToast('È necessario mantenere almeno un veicolo nella flotta MDVRP!');
    return;
  }
  State.mdvrpConfig.vehicles.splice(idx, 1);
  renderMdvrpTables();
  showToast('Veicolo MDVRP rimosso');
}

function addMdvrpVehicleRow() {
  if (!State.mdvrpConfig) return;
  if (!State.mdvrpConfig.vehicles) State.mdvrpConfig.vehicles = [];
  const nextNum = State.mdvrpConfig.vehicles.length + 1;
  const defaultDep = (State.mdvrpConfig.depots && State.mdvrpConfig.depots[0]) ? State.mdvrpConfig.depots[0].id : 'DEP_1';

  State.mdvrpConfig.vehicles.push({
    name: `Camion_MD_${nextNum}`,
    home_depot: defaultDep,
    capacity: 2500.0,
    fixed_cost: 80.0
  });

  renderMdvrpTables();
  showToast(`Camion_MD_${nextNum} aggiunto alla flotta MDVRP!`);
}

function updateMdvrpCostPerKm(val) {
  if (State.mdvrpConfig) {
    State.mdvrpConfig.cost_per_km = parseFloat(val) || 1.20;
  }
}

async function solveMdvrp() {
  const btn = document.getElementById('btnSolveMdvrp');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ Risoluzione MILP Multi-Sito...';
  }

  const statEl = document.getElementById('mdvrpStatus');
  if (statEl) {
    statEl.innerText = 'Calcolo in corso...';
    statEl.className = 'kpi-val amber';
  }

  try {
    const totCap = (State.mdvrpConfig.vehicles || []).reduce((a, b) => a + (Number(b.capacity) || 0), 0);
    const totDemand = (State.mdvrpConfig.customers || []).reduce((a, b) => a + (Number(b.demand) || 0), 0);

    const res = await fetch('/api/mdvrp/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.mdvrpConfig)
    });
    const data = await res.json();
    State.mdvrpResult = data;

    // Se non ottimale o flotta insufficiente, segnala e proponi alternative
    if (!data.is_optimal || data.status === 'Infeasible' || totCap < totDemand) {
      if (statEl) {
        statEl.innerText = data.status || 'Infeasible';
        statEl.className = 'kpi-val red';
      }
      showFleetShortageModal('mdvrp', {
        modelName: 'MDVRP (Multi-Deposito)',
        totalDemand: totDemand,
        totalCapacity: totCap,
        numVehicles: (State.mdvrpConfig.vehicles || []).length,
        avgVehCap: 2500,
        onAutoScale: autoScaleMdvrpFleet,
        onCrop: filterMdvrpCustomersByCapacity
      });
      return;
    }

    if (statEl) {
      statEl.innerText = data.status || 'Ottimale';
      statEl.className = data.is_optimal ? 'kpi-val green' : 'kpi-val amber';
    }

    const costEl = document.getElementById('mdvrpCost');
    if (costEl) costEl.innerText = `${(data.total_cost || 0).toFixed(2)} €`;

    const depEl = document.getElementById('mdvrpDepotsCount');
    if (depEl) depEl.innerText = `${(data.depots_used || []).length} / ${(data.depots || []).length}`;

    const kmEl = document.getElementById('mdvrpKm');
    if (kmEl) kmEl.innerText = `${(data.total_km || 0).toFixed(1)} km`;

    renderMdvrpReportList(data);
    drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, data);
    showToast(`MDVRP Ottimizzato con successo! Costo: ${(data.total_cost || 0).toFixed(2)} €`);

  } catch (e) {
    console.error('Errore solve MDVRP:', e);
    showToast('Errore durante la risoluzione del modello MDVRP');
    if (statEl) {
      statEl.innerText = 'Errore';
      statEl.className = 'kpi-val red';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '⚡ Risolvi MDVRP Multi-Sito';
    }
  }
}

function renderMdvrpReportList(res) {
  const container = document.getElementById('mdvrpReportList');
  if (!container) return;

  container.innerHTML = '';
  const vehs = res.vehicles || [];

  // Mappa colori depositi
  const depColors = {};
  (res.depots || []).forEach(d => {
    depColors[d.id] = d.color || '#3b82f6';
  });

  vehs.forEach((v, idx) => {
    const depColor = depColors[v.home_depot] || State.vehicleColors[idx % State.vehicleColors.length];
    const isUsed = v.used;
    const card = document.createElement('div');
    card.style.background = isUsed ? 'rgba(15, 23, 42, 0.75)' : 'rgba(15, 23, 42, 0.35)';
    card.style.border = isUsed ? `1px solid ${depColor}` : '1px dashed rgba(255,255,255,0.1)';
    card.style.borderRadius = '8px';
    card.style.padding = '12px 16px';
    card.style.marginBottom = '12px';

    let stopBadges = '';
    (v.stops || []).forEach(st => {
      let isDepot = st.is_depot;
      let badgeStyle = isDepot 
        ? `background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4);`
        : `background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);`;
      let icon = isDepot ? '🏢' : '📍';
      stopBadges += `
        <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11.5px; margin: 3px 2px; ${badgeStyle}">
          ${icon} <b>${st.name}</b> ${!isDepot ? `(${st.demand} kg)` : ''}
        </span> ➔
      `;
    });
    stopBadges = stopBadges.replace(/➔\s*$/, '');

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 12px; height: 12px; border-radius: 3px; background: ${depColor}; display: inline-block;"></span>
          <b style="font-size: 14px; color: ${depColor};">${v.name}</b>
          <span class="code-tag" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 11px;">
            Home Depot: ${v.home_depot}
          </span>
        </div>
        <div>
          ${isUsed 
            ? `<span class="code-tag" style="color: #34d399; font-weight: 700;">IN MISSIONE</span>` 
            : `<span class="code-tag" style="color: var(--text-muted);">NON ASSEGNATO</span>`}
        </div>
      </div>

      ${isUsed ? `
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.5;">
          <b>Itinerario di Partenza e Rientro nel Deposito:</b><br>
          <div style="margin-top: 4px;">${stopBadges}</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11.5px;">
          <div><span style="color: var(--text-muted);">Km Percorsi:</span> <b>${v.km} km</b></div>
          <div><span style="color: var(--text-muted);">Carico Servito:</span> <b>${v.total_load} / ${v.capacity} kg</b></div>
          <div><span style="color: var(--text-muted);">Costo Fisso:</span> <b>${v.fixed_cost.toFixed(2)} €</b></div>
          <div><span style="color: var(--text-muted);">Costo Marcia:</span> <b>${v.km_cost.toFixed(2)} €</b></div>
          <div><span style="color: var(--text-muted);">Costo Totale:</span> <b style="color: #34d399;">${v.total_cost.toFixed(2)} €</b></div>
        </div>
      ` : `
        <div style="font-size: 12px; color: var(--text-muted);">
          Veicolo rimasto parcheggiato nel magazzino ${v.home_depot} (costo fisso azzerato).
        </div>
      `}
    `;
    container.appendChild(card);
  });
}

function drawMdvrpCanvas(canvasId, config, result) {
  if (canvasId === 'mdvrpCanvas' && window.L && document.getElementById('mdvrpMap')) {
    renderLeafletRouteMap('mdvrpMap', 'mdvrp', config, result);
    return;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas || !config) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth || 600;
  const h = canvas.height = 360;

  ctx.clearRect(0, 0, w, h);

  const pts = [...(config.depots || []), ...(config.customers || [])];
  const lats = pts.map(p => p.lat);
  const lons = pts.map(p => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const pad = 40;
  const scaleX = lon => pad + ((lon - minLon) / ((maxLon - minLon) || 1)) * (w - 2 * pad);
  const scaleY = lat => (h - pad) - ((lat - minLat) / ((maxLat - minLat) || 1)) * (h - 2 * pad);

  // Mappa nodi
  const nodesMap = {};
  (config.depots || []).forEach(d => nodesMap[d.id] = d);
  (config.customers || []).forEach(c => nodesMap[c.id] = c);

  // Mappa colori depositi
  const depColors = {};
  (config.depots || []).forEach(d => {
    depColors[d.id] = d.color || '#3b82f6';
  });

  // 1. Tracciamento tratte dei veicoli
  if (result && result.vehicles) {
    result.vehicles.forEach((v, idx) => {
      if (!v.used || !v.route_nodes || v.route_nodes.length < 2) return;
      const strokeColor = depColors[v.home_depot] || State.vehicleColors[idx % State.vehicleColors.length];

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (let i = 0; i < v.route_nodes.length; i++) {
        const nid = v.route_nodes[i];
        const nd = nodesMap[nid];
        if (!nd) continue;
        const x = scaleX(nd.lon);
        const y = scaleY(nd.lat);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Frecce direzionali
      for (let i = 0; i < v.route_nodes.length - 1; i++) {
        const n1 = nodesMap[v.route_nodes[i]];
        const n2 = nodesMap[v.route_nodes[i + 1]];
        if (!n1 || !n2) continue;
        const x1 = scaleX(n1.lon);
        const y1 = scaleY(n1.lat);
        const x2 = scaleX(n2.lon);
        const y2 = scaleY(n2.lat);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(midX + 6 * Math.cos(angle), midY + 6 * Math.sin(angle));
        ctx.lineTo(midX + 6 * Math.cos(angle + 2.5), midY + 6 * Math.sin(angle + 2.5));
        ctx.lineTo(midX + 6 * Math.cos(angle - 2.5), midY + 6 * Math.sin(angle - 2.5));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  } else {
    // Banner indicatore stato coordinate
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(w / 2 - 230, 16, 460, 32);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.strokeRect(w / 2 - 230, 16, 460, 32);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📍 Coordinate caricate sulla mappa. Premi "⚡ Risolvi" per calcolare i percorsi', w / 2, 36);
    ctx.restore();
  }

  // 2. Disegna Clienti
  (config.customers || []).forEach(c => {
    const x = scaleX(c.lon);
    const y = scaleY(c.lat);

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#a78bfa';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ddd6fe';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillText(`${c.name} (${c.demand}kg)`, x + 8, y + 3);
  });

  // 3. Disegna Depositi (Grandi quadrati colorati)
  (config.depots || []).forEach(d => {
    const x = scaleX(d.lon);
    const y = scaleY(d.lat);
    const dColor = d.color || '#3b82f6';

    // Alone esterno
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x - 14, y - 14, 28, 28);

    // Quadrato deposito
    ctx.fillStyle = dColor;
    ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 10, y - 10, 20, 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('🏢 ' + d.name, x + 14, y + 4);
  });
}

// ==========================================
// 7. CALCOLATORE ROI & RIDUZIONE CO2
// ==========================================
function calculateRoi() {
  const numVehicles = parseFloat(document.getElementById('roiVehicles').value) || 10;
  const kmPerDay = parseFloat(document.getElementById('roiKm').value) || 180;
  const consumption = parseFloat(document.getElementById('roiConsumption').value) || 11.0;
  const fuelCost = parseFloat(document.getElementById('roiFuelCost').value) || 1.82;
  const workDays = 250;

  const kmSavedPct = 0.18;
  const totalKmYear = numVehicles * kmPerDay * workDays;
  const kmSavedYear = totalKmYear * kmSavedPct;
  
  const litersSaved = (kmSavedYear / 100) * consumption;
  const moneySaved = litersSaved * fuelCost;
  const maintenanceSaved = kmSavedYear * 0.08;
  const totalSavings = moneySaved + maintenanceSaved;
  const co2Tons = (litersSaved * 2.65) / 1000;

  document.getElementById('resMoneySaved').innerText = `${Math.round(totalSavings).toLocaleString()} €/anno`;
  document.getElementById('resKmSaved').innerText = `${Math.round(kmSavedYear).toLocaleString()} km`;
  document.getElementById('resLitersSaved').innerText = `${Math.round(litersSaved).toLocaleString()} litri`;
  document.getElementById('resCo2Saved').innerText = `${co2Tons.toFixed(1)} t CO2`;
}

// ==========================================
// FAQ & DISPENSA TEORICA: FILTRAGGIO CATEGORIE
// ==========================================
function filterFaqGroup(category, btnElement) {
  document.querySelectorAll('.faq-filter-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  }

  const groups = document.querySelectorAll('#tab-faq .faq-group');
  groups.forEach(g => {
    if (category === 'all') {
      g.style.display = 'block';
    } else {
      g.style.display = (g.getAttribute('data-category') === category) ? 'block' : 'none';
    }
  });
}

function toggleAllFaq(shouldOpen) {
  const items = document.querySelectorAll('#tab-faq .faq-item');
  items.forEach(it => {
    if (shouldOpen) {
      it.setAttribute('open', '');
    } else {
      it.removeAttribute('open');
    }
  });
  updateFaqArrows();
  showToast(shouldOpen ? 'Tutte le risposte delle FAQ sono state espanse.' : 'Tutte le FAQ sono state compresse.');
}

function updateFaqArrows() {
  document.querySelectorAll('#tab-faq .faq-item').forEach(it => {
    const arrow = it.querySelector('.faq-arrow');
    if (arrow) {
      arrow.innerText = it.hasAttribute('open') ? '▲' : '▼';
    }
  });
}

// ==========================================
// MODAL SEGNALAZIONE SUPERAMENTO FLOTTA & ALTERNATIVE
// ==========================================
function showFleetShortageModal(modelKey, opts) {
  const modal = document.getElementById('fleetCapacityModal');
  if (!modal) return;

  const titleEl = document.getElementById('fleetCapacityModalTitle');
  const msgEl = document.getElementById('fleetCapacityModalMessage');
  const statsEl = document.getElementById('fleetCapacityModalStats');
  const btnScale = document.getElementById('btnModalAutoScale');
  const btnCrop = document.getElementById('btnModalCropFleet');

  const modelName = opts.modelName || 'Modello di Calcolo';
  const totalDemand = Math.round(opts.totalDemand || 0);
  const totalCapacity = Math.round(opts.totalCapacity || 0);
  const numVehicles = opts.numVehicles || 0;
  const missing = Math.max(0, totalDemand - totalCapacity);
  const avgVehCap = opts.avgVehCap || 1000;
  const estMissingVeh = Math.max(1, Math.ceil(missing / avgVehCap));

  if (titleEl) {
    titleEl.innerHTML = `<span>⚠️</span> Flotta Insufficiente &mdash; ${modelName}`;
  }

  if (msgEl) {
    msgEl.innerHTML = `Il solutore matematico non è riuscito a generare una soluzione ottima perché il numero di mezzi inseriti (<b>${numVehicles} veicoli</b>) o la portata complessiva della flotta (<b>${totalCapacity.toLocaleString()} kg</b>) non è sufficiente per coprire l'intera domanda di carico richiesta dalla mappa (<b>${totalDemand.toLocaleString()} kg</b>).`;
  }

  if (statsEl) {
    statsEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
        <div><span style="color: var(--text-muted); font-size: 11px;">Mezzi Attuali:</span><br><b style="color: #f87171;">${numVehicles} veicoli</b></div>
        <div><span style="color: var(--text-muted); font-size: 11px;">Portata Attuale:</span><br><b>${totalCapacity.toLocaleString()} kg</b></div>
        <div><span style="color: var(--text-muted); font-size: 11px;">Carico da Servire:</span><br><b>${totalDemand.toLocaleString()} kg</b></div>
        <div><span style="color: var(--text-muted); font-size: 11px;">Deficit / Mancanti:</span><br><b style="color: #f87171;">-${missing.toLocaleString()} kg (~+${estMissingVeh} mezzi)</b></div>
      </div>
    `;
  }

  if (btnScale) {
    btnScale.onclick = () => {
      closeFleetCapacityModal();
      if (typeof opts.onAutoScale === 'function') {
        opts.onAutoScale(true); // true = rilancia calcolo dopo aver scalato la flotta
      }
    };
  }

  if (btnCrop) {
    btnCrop.onclick = () => {
      closeFleetCapacityModal();
      if (typeof opts.onCrop === 'function') {
        opts.onCrop(true); // true = rilancia calcolo dopo aver ridotto i punti
      }
    };
  }

  modal.style.display = 'flex';
}

function closeFleetCapacityModal() {
  const modal = document.getElementById('fleetCapacityModal');
  if (modal) modal.style.display = 'none';
}

// ==========================================
// AVVIO DOMContentLoaded
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  const hash = (window.location.hash || '').replace('#', '');
  if (hash && document.getElementById(hash) && hash !== 'tab-selector' && hash !== 'tab-faq') {
    switchMainTab(hash);
  } else {
    const sel = document.getElementById('headerModelSelect');
    const defaultModel = (sel && sel.value) ? sel.value : 'tab-carp';
    switchMainTab(defaultModel);
  }
  renderWizardFleetTable();
  calculateRoi();
  evaluateWizard();

  // Listener per aggiornare le freccette dell'accordion FAQ
  document.querySelectorAll('#tab-faq .faq-item summary').forEach(s => {
    s.addEventListener('click', () => {
      setTimeout(updateFaqArrows, 15);
    });
  });
});

