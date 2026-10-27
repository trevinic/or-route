/**
 * OR-Route - Logica Applicativa Frontend
 * Gestione Multi-Modello (CVRP, VRPTW, CARP, EV/IF), Canvas Rendering,
 * Wizard di Selezione Aziendale, e Calcolatore ROI.
 */

// Stato Applicazione Globale
const State = {
  activeTab: 'tab-carp',
  hasImportedConfigFile: false,
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
  pcarpConfig: null,
  pcarpResult: null,
  pcarpSelectedDay: 'ALL',
  carptwConfig: null,
  carptwResult: null,
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

  // Sincronizza lo stato attivo del tasto Home nella barra header
  const btnHome = document.getElementById('btnHeaderHome');
  if (btnHome) {
    if (tabId === 'tab-selector') {
      btnHome.classList.add('active');
    } else {
      btnHome.classList.remove('active');
    }
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
  const sections = ['tab-selector', 'tab-cvrp', 'tab-vrptw', 'tab-carp', 'tab-intermediate', 'tab-vrppd', 'tab-mdvrp', 'tab-pcarp', 'tab-carptw', 'tab-roi', 'tab-faq'];
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

  // Aggiorna l'hash URL per consentire ricaricamento o link diretto (mantiene l'URL pulito sulla Home)
  try {
    if (window.history && window.history.replaceState) {
      if (tabId === 'tab-selector') {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, null, cleanUrl);
      } else {
        window.history.replaceState(null, null, '#' + tabId);
      }
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
  } else if (tabId === 'tab-pcarp') {
    if (!State.pcarpConfig) loadPcarpConfig();
    else drawPcarpCanvas('pcarpCanvas', State.pcarpConfig, State.pcarpResult || null);
  } else if (tabId === 'tab-carptw') {
    if (!State.carptwConfig) loadCarptwConfig();
    else drawCarptwCanvas('carptwCanvas', State.carptwConfig, State.carptwResult || null);
  }

  // Invalida dimensione mappa Leaflet dopo la visualizzazione per garantire il rendering fluido delle mattonelle Stradario
  setTimeout(() => {
    const mapIdMap = {
      'tab-cvrp': 'cvrpMap',
      'tab-vrptw': 'vrptwMap',
      'tab-intermediate': 'evMap',
      'tab-vrppd': 'vrppdMap',
      'tab-mdvrp': 'mdvrpMap',
      'tab-pcarp': 'pcarpMap',
      'tab-carptw': 'carptwMap'
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
  periodicCalendar: 'no',
  streetTimeWindows: 'no',
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

  syncWizardFleetToModels();
}

function getWizardConcreteVehicles() {
  const concreteVehicles = [];
  if (!wizardAnswers || !wizardAnswers.fleetCategories) return concreteVehicles;
  wizardAnswers.fleetCategories.forEach(cat => {
    const qty = parseInt(cat.qty) || 1;
    for (let i = 1; i <= qty; i++) {
      const suffix = qty > 1 ? `_${i}` : '';
      const cleanName = (cat.name || 'Mezzo').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + suffix;
      concreteVehicles.push({
        name: cleanName,
        category: cat.name || 'Standard',
        capacity: parseFloat(cat.capacity) || 1000,
        capacity_kg: parseFloat(cat.capacity) || 1000,
        fixed_cost: parseFloat(cat.calculatedFixedCost) || 0,
        cost_per_km: parseFloat(cat.costPerKm) || 1.2
      });
    }
  });
  return concreteVehicles;
}

function syncWizardFleetToModels() {
  if (State.hasImportedConfigFile) return;
  const concreteVehicles = getWizardConcreteVehicles();
  if (!concreteVehicles.length) return;

  // CVRP
  if (State.cvrpConfig) {
    State.cvrpConfig.vehicles = concreteVehicles.map(v => ({
      name: v.name,
      capacity: v.capacity,
      fixed_cost: v.fixed_cost,
      cost_per_km: v.cost_per_km
    }));
    if (State.activeTab === 'tab-cvrp') renderCvrpTables();
  }

  // VRPTW
  if (State.vrptwConfig) {
    State.vrptwConfig.vehicles = concreteVehicles.map(v => ({
      name: v.name,
      capacity: v.capacity,
      fixed_cost: v.fixed_cost,
      cost_per_km: v.cost_per_km
    }));
    if (State.activeTab === 'tab-vrptw') renderVrptwTables();
  }

  // CARP
  if (State.carpConfig) {
    const carpDemand = (State.carpConfig.streets || []).reduce((acc, s) => acc + (parseFloat(s.demand_kg) || 0), 0);
    const wizCap = concreteVehicles.reduce((acc, v) => acc + (parseFloat(v.capacity_kg) || 0), 0);
    const curCap = (State.carpConfig.vehicles || []).reduce((acc, v) => acc + (parseFloat(v.capacity_kg) || 0), 0);
    if (!State.carpConfig.vehicles || State.carpConfig.vehicles.length === 0 || wizCap >= carpDemand || curCap < carpDemand) {
      State.carpConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity_kg: v.capacity_kg,
        fixed_cost: v.fixed_cost,
        description: v.category
      }));
    }
    if (State.activeTab === 'tab-carp') renderCarpTables();
  }

  // EV-VRP
  if (State.evConfig) {
    State.evConfig.vehicles = concreteVehicles.map((v, idx) => ({
      name: v.name,
      capacity: v.capacity,
      battery_kwh: 60 + (idx * 10),
      fixed_cost: v.fixed_cost,
      kwh_cost: 0.38,
      kwh_per_km: 0.45
    }));
    if (State.activeTab === 'tab-intermediate') renderEvTables();
  }

  // VRPPD
  if (State.vrppdConfig) {
    State.vrppdConfig.vehicles = concreteVehicles.map(v => ({
      name: v.name,
      capacity: v.capacity,
      fixed_cost: v.fixed_cost,
      cost_per_km: v.cost_per_km,
      description: v.category
    }));
    if (State.activeTab === 'tab-vrppd') renderVrppdTables();
  }

  // MDVRP
  if (State.mdvrpConfig) {
    const firstDep = (State.mdvrpConfig.depots && State.mdvrpConfig.depots[0]) ? State.mdvrpConfig.depots[0].id : '';
    State.mdvrpConfig.vehicles = concreteVehicles.map(v => ({
      name: v.name,
      home_depot: firstDep,
      capacity: v.capacity,
      fixed_cost: v.fixed_cost,
      cost_per_km: v.cost_per_km
    }));
    if (State.activeTab === 'tab-mdvrp') renderMdvrpTables();
  }

  // PCARP
  if (State.pcarpConfig) {
    State.pcarpConfig.vehicles = concreteVehicles.map(v => ({
      name: v.name,
      capacity_kg: v.capacity_kg || v.capacity,
      fixed_cost: v.fixed_cost,
      cost_per_km: v.cost_per_km,
      description: v.category
    }));
    if (State.activeTab === 'tab-pcarp') renderPcarpTables();
  }

  // CARPTW
  if (State.carptwConfig) {
    State.carptwConfig.vehicles = concreteVehicles.map(v => ({
      name: v.name,
      capacity_kg: v.capacity_kg || v.capacity,
      fixed_cost: v.fixed_cost,
      cost_per_km: v.cost_per_km,
      description: v.category
    }));
    if (State.activeTab === 'tab-carptw') renderCarptwTables();
  }
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
  if (wizardAnswers.type === 'streets') {
    if (wizardAnswers.periodicCalendar === 'yes') {
      wizardAnswers.recommendedModel = 'pcarp';
      if (title) title.innerText = '🎯 Modello Consigliato: PCARP (Periodic Capacitated Arc Routing Problem)';
      if (desc) desc.innerText = 'La tua flotta opera su rete stradale per la raccolta differenziata porta a porta organizzata su calendario settimanale multi-giorno (es. Lun-Sab) con frazioni alternate (Umido, Carta, Plastica, Secco, Vetro). Il modello PCARP bilancia uniformemente i carichi di lavoro sui 6 giorni, eliminando colli di bottiglia e abbattendo i km di trasferimento.';
      if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello PCARP Settimanale ➔';

    } else if (wizardAnswers.streetTimeWindows === 'yes') {
      wizardAnswers.recommendedModel = 'carptw';
      if (title) title.innerText = '🎯 Modello Consigliato: CARPTW (Arc Routing con Finestre Orarie su Strade & ZTL)';
      if (desc) desc.innerText = 'I servizi di spazzamento o raccolta lungo le vie richiedono il rispetto di orari tassativi (es. ZTL prima delle 07:30, strade scolastiche prima delle 08:00, pulizia post-mercato rionale). Il modello CARPTW pianifica i percorsi garantendo il 100% di rispetto delle finestre orarie ed eliminando i tempi morti di attesa.';
      if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello CARPTW con Orari ➔';

    } else if (wizardAnswers.intermediate === 'yes') {
      wizardAnswers.recommendedModel = 'intermediate';
      if (title) title.innerText = '🎯 Modello Consigliato: WCVRPTW-IF / EV-VRP (Scarichi Intermedi o Flotta Elettrica)';
      if (desc) desc.innerText = 'I compattatori devono effettuare soste intermedie obbligatorie prima del rientro (svuotamento compattatori in impianti TMB/discariche o ricarica rapida alle colonnine DC per furgoni elettrici). Il modello gestisce cicli multipli con azzeramento di carico o ripristino della batteria a metà turno.';
      if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello con Impianti Intermedi ➔';

    } else {
      wizardAnswers.recommendedModel = 'carp';
      if (title) title.innerText = '🎯 Modello Consigliato: CARP (Capacitated Arc Routing Problem)';
      if (desc) desc.innerText = 'La tua flotta opera lungo la rete viaria continua (igiene urbana, raccolta differenziata porta a porta, spazzatrici, sgombero neve, pulizia caditoie, ispezione condotte). Il modello CARP ottimizza i tracciati su archi stradali, abbatte fino al 35% di transiti a vuoto (deadheading) e garantisce il 100% di copertura delle vie con il minor numero di mezzi.';
      if (ctaBtn) ctaBtn.innerText = '⚡ Inietta Questa Flotta nel Modello CARP & Apri Mappa GIS ➔';
    }

  } else {
    // Punti / Clienti
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

    } else if (wizardAnswers.intermediate === 'yes') {
      wizardAnswers.recommendedModel = 'intermediate';
      if (title) title.innerText = '🎯 Modello Consigliato: WCVRPTW-IF / EV-VRP (Scarichi Intermedi o Flotta Elettrica)';
      if (desc) desc.innerText = 'I veicoli devono effettuare soste intermedie obbligatorie prima del rientro (svuotamento in discariche o ricarica rapida alle colonnine DC per furgoni elettrici). Il modello gestisce cicli multipli con azzeramento di carico o ripristino della batteria a metà turno.';
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
}

async function applyWizardParametersToModel() {
  const model = wizardAnswers.recommendedModel || 'carp';
  
  // Unroll della flotta eterogenea definita dall'utente
  const concreteVehicles = getWizardConcreteVehicles();
  const totVehicles = concreteVehicles.length;
  const avgKmCost = concreteVehicles.reduce((acc, v) => acc + v.cost_per_km, 0) / (totVehicles || 1);

  if (model === 'carp') {
    if (!State.carpConfig || !State.carpConfig.streets || State.carpConfig.streets.length === 0) {
      await loadCarpConfig();
    }
    if (State.carpConfig) {
      State.carpConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity_kg: v.capacity_kg,
        fixed_cost: v.fixed_cost,
        description: v.category
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

    // Inietta flotta & Apri Mappa GIS Folium
    const iframe = document.getElementById('carpMapIframe');
    if (iframe) {
      iframe.removeAttribute('srcdoc');
      iframe.src = '/output/percorso_raccolta.html?t=' + Date.now();
      setTimeout(() => {
        iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
    showToast(`Flotta eterogenea (${totVehicles} mezzi) applicata al CARP e Mappa GIS aperta!`);

  } else if (model === 'pcarp') {
    if (!State.pcarpConfig) await loadPcarpConfig();
    if (State.pcarpConfig) {
      State.pcarpConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity_kg: v.capacity_kg || v.capacity,
        fixed_cost: v.fixed_cost,
        cost_per_km: v.cost_per_km,
        description: v.category
      }));
      try {
        await fetch('/api/pcarp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.pcarpConfig)
        });
      } catch (e) { console.warn('Errore salvataggio PCARP:', e); }
    }
    renderPcarpTables();
    switchMainTab('tab-pcarp', null);
    showToast(`Flotta eterogenea (${totVehicles} mezzi) applicata al PCARP! Verifica il calendario e premi 'Risolvi'.`);

  } else if (model === 'carptw') {
    if (!State.carptwConfig) await loadCarptwConfig();
    if (State.carptwConfig) {
      State.carptwConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity_kg: v.capacity_kg || v.capacity,
        fixed_cost: v.fixed_cost,
        cost_per_km: v.cost_per_km,
        description: v.category
      }));
      try {
        await fetch('/api/carptw/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.carptwConfig)
        });
      } catch (e) { console.warn('Errore salvataggio CARPTW:', e); }
    }
    renderCarptwTables();
    switchMainTab('tab-carptw', null);
    showToast(`Flotta eterogenea (${totVehicles} mezzi) applicata al CARPTW! Verifica le finestre orarie e premi 'Risolvi'.`);

  } else if (model === 'vrppd') {
    if (!State.vrppdConfig) await loadVrppdConfig();
    if (State.vrppdConfig) {
      State.vrppdConfig.vehicles = concreteVehicles.map(v => ({
        name: v.name,
        capacity: v.capacity,
        fixed_cost: v.fixed_cost,
        cost_per_km: v.cost_per_km,
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
        fixed_cost: v.fixed_cost,
        cost_per_km: v.cost_per_km
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
        fixed_cost: v.fixed_cost,
        cost_per_km: v.cost_per_km
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
        fixed_cost: v.fixed_cost,
        kwh_cost: 0.38,
        kwh_per_km: 0.45
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
        fixed_cost: v.fixed_cost,
        cost_per_km: v.cost_per_km
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
    mdvrp_config: State.mdvrpConfig,
    pcarp_config: State.pcarpConfig,
    carptw_config: State.carptwConfig
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

  showToast('📥 Configurazione scaricata con successo in formato JSON!');
}

function handleImportConfigFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data) throw new Error('File vuoto o non valido.');

      State.hasImportedConfigFile = true;

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

      // Ripristino PCARP
      if (data.pcarp_config) {
        State.pcarpConfig = data.pcarp_config;
        await fetch('/api/pcarp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.pcarpConfig)
        });
        renderPcarpTables();
      }

      // Ripristino CARPTW
      if (data.carptw_config) {
        State.carptwConfig = data.carptw_config;
        await fetch('/api/carptw/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(State.carptwConfig)
        });
        renderCarptwTables();
      }

      saveToLocalStorage();
      showToast('📤 Configurazione caricata e tutte le impostazioni ripristinate con successo!');
      evaluateWizard();
    } catch (err) {
      alert('Errore durante il caricamento della configurazione: ' + err.message);
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
      mdvrp_config: State.mdvrpConfig,
      pcarp_config: State.pcarpConfig,
      carptw_config: State.carptwConfig
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
  if (!State.cvrpConfig) {
    try {
      const res = await fetch('/api/cvrp/config');
      if (res.ok) State.cvrpConfig = await res.json();
    } catch (e) {
      console.error('Errore caricamento CVRP:', e);
    }
  }
  if (!State.cvrpConfig) {
    State.cvrpConfig = {
      name: 'CVRP Flotta Personalizzata',
      cost_per_km: 1.20,
      depot: { name: 'Hub Logistico', lat: 45.385, lon: 10.95 },
      customers: [],
      vehicles: []
    };
  }
  if (!State.hasImportedConfigFile && typeof syncWizardFleetToModels === 'function') {
    syncWizardFleetToModels();
  }
  renderCvrpTables();
  renderLeafletRouteMap('cvrpMap', 'cvrp', State.cvrpConfig, State.cvrpResult || null);
  drawRouteCanvas('cvrpCanvas', State.cvrpConfig, State.cvrpResult || null);
}

function renderCvrpTables() {
  if (!State.cvrpConfig) return;

  // 0. Deposito CVRP
  const dep = State.cvrpConfig.depot;
  const nameInp = document.getElementById('cvrpDepotName');
  const latInp = document.getElementById('cvrpDepotLat');
  const lonInp = document.getElementById('cvrpDepotLon');
  if (nameInp) nameInp.value = (dep && dep.name) ? dep.name : '';
  if (latInp) latInp.value = (dep && dep.lat !== null && dep.lat !== undefined && !isNaN(dep.lat) && dep.lat !== '') ? dep.lat : '';
  if (lonInp) lonInp.value = (dep && dep.lon !== null && dep.lon !== undefined && !isNaN(dep.lon) && dep.lon !== '') ? dep.lon : '';

  // Conteggio Clienti
  const countEl = document.getElementById('cvrpCustomerCount');
  const custs = State.cvrpConfig.customers || [];
  if (countEl) {
    countEl.innerText = `${custs.length} clienti / destinazioni`;
  }

  // Costo Chilometrico
  const costPerKmInput = document.getElementById('cvrpCostPerKm');
  if (costPerKmInput && State.cvrpConfig.cost_per_km !== undefined) {
    costPerKmInput.value = State.cvrpConfig.cost_per_km;
  }

  // 1. Tabella Clienti con Coordinate Modificabili
  const tbody = document.getElementById('cvrpCustomersBody');
  if (tbody) {
    tbody.innerHTML = '';
    if (custs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px;">Nessun cliente presente. Clicca su <b>+ Nuovo Cliente</b> per inserire le coordinate o importa un file.</td></tr>';
    } else {
      custs.forEach((c, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${c.name || ''}" 
              onchange="updateCvrpCustomerField(${idx}, 'name', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 82px;" value="${c.lat != null ? c.lat : ''}" 
              onchange="updateCvrpCustomerCoord(${idx}, 'lat', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 82px;" value="${c.lon != null ? c.lon : ''}" 
              onchange="updateCvrpCustomerCoord(${idx}, 'lon', this.value)">
          </td>
          <td>
            <input type="number" class="cell-inp" style="width: 80px;" min="10" step="20" value="${c.demand || ''}" 
              onchange="updateCvrpCustomerDemand(${idx}, this.value)">
          </td>
          <td style="text-align: center;">
            <button class="btn-danger-outline" title="Rimuovi cliente" onclick="removeCvrpCustomer(${idx})">&times;</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // 2. Tabella Veicoli CVRP
  const vbody = document.getElementById('cvrpVehiclesBody');
  if (vbody && State.cvrpConfig.vehicles) {
    vbody.innerHTML = '';
    State.cvrpConfig.vehicles.forEach((v, idx) => {
      const kmCost = (v.cost_per_km !== undefined && v.cost_per_km !== null) ? v.cost_per_km : (State.cvrpConfig.cost_per_km || 1.15);
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
        <td>
          <input type="number" class="cell-inp" min="0.1" step="0.05" value="${kmCost}" 
            onchange="updateCvrpVehicleKmCost(${idx}, this.value)">
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
  if (!State.cvrpConfig) return;
  if (!State.cvrpConfig.depot) State.cvrpConfig.depot = {};
  if (field === 'lat' || field === 'lon') {
    const num = parseFloat(val);
    State.cvrpConfig.depot[field] = isNaN(num) ? null : num;
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
  const num = parseFloat(val);
  State.cvrpConfig.customers[idx][coord] = isNaN(num) ? null : num;
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

function updateCvrpVehicleKmCost(idx, val) {
  if (State.cvrpConfig && State.cvrpConfig.vehicles && State.cvrpConfig.vehicles[idx]) {
    State.cvrpConfig.vehicles[idx].cost_per_km = parseFloat(val) || 1.15;
  }
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
  const baseLat = (dep && typeof dep.lat === 'number' && !isNaN(dep.lat) && dep.lat !== null) ? dep.lat : 45.4642;
  const baseLon = (dep && typeof dep.lon === 'number' && !isNaN(dep.lon) && dep.lon !== null) ? dep.lon : 9.1900;
  const offsetLat = (Math.random() - 0.5) * 0.15;
  const offsetLon = (Math.random() - 0.5) * 0.25;

  if (!State.cvrpConfig.customers) State.cvrpConfig.customers = [];
  const newId = State.cvrpConfig.customers.length + 1;
  State.cvrpConfig.customers.push({
    id: newId,
    name: name,
    lat: Number((baseLat + offsetLat).toFixed(4)),
    lon: Number((baseLon + offsetLon).toFixed(4)),
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
    fixed_cost: 60.0,
    cost_per_km: State.cvrpConfig.cost_per_km || 1.15
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
      fixed_cost: 65.0,
      cost_per_km: State.cvrpConfig.cost_per_km || 1.15
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
  if (!State.cvrpConfig || !State.cvrpConfig.customers || State.cvrpConfig.customers.length === 0) {
    showToast('⚠️ Inserisci almeno un cliente e il deposito prima di avviare il calcolo!');
    return;
  }
  const dep = State.cvrpConfig.depot;
  if (!dep || dep.lat == null || dep.lon == null || isNaN(dep.lat) || isNaN(dep.lon)) {
    showToast('⚠️ Inserisci le coordinate del deposito centrale prima di avviare il calcolo!');
    return;
  }

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
  if (!State.vrptwConfig) {
    try {
      const res = await fetch('/api/vrptw/config');
      if (res.ok) State.vrptwConfig = await res.json();
    } catch (e) {
      console.error('Errore caricamento VRPTW:', e);
    }
  }
  if (!State.vrptwConfig) {
    State.vrptwConfig = {
      name: 'VRPTW Flotta Personalizzata',
      cost_per_km: 1.20,
      avg_speed_kmh: 40,
      depot: { name: 'Piattaforma Distribuzione', lat: 44.512, lon: 11.398, ready_time: 0, due_time: 480 },
      customers: [],
      vehicles: []
    };
  }
  if (!State.hasImportedConfigFile && typeof syncWizardFleetToModels === 'function') {
    syncWizardFleetToModels();
  }
  renderVrptwTables();
  renderLeafletRouteMap('vrptwMap', 'vrptw', State.vrptwConfig, State.vrptwResult || null);
  drawRouteCanvas('vrptwCanvas', State.vrptwConfig, State.vrptwResult || null);
}

function renderVrptwTables() {
  if (!State.vrptwConfig) return;

  // 0. Deposito VRPTW
  const dep = State.vrptwConfig.depot;
  const nameInp = document.getElementById('vrptwDepotName');
  const latInp = document.getElementById('vrptwDepotLat');
  const lonInp = document.getElementById('vrptwDepotLon');
  const readyInp = document.getElementById('vrptwDepotReady');
  const dueInp = document.getElementById('vrptwDepotDue');
  if (nameInp) nameInp.value = (dep && dep.name) ? dep.name : '';
  if (latInp) latInp.value = (dep && dep.lat !== null && dep.lat !== undefined && !isNaN(dep.lat) && dep.lat !== '') ? dep.lat : '';
  if (lonInp) lonInp.value = (dep && dep.lon !== null && dep.lon !== undefined && !isNaN(dep.lon) && dep.lon !== '') ? dep.lon : '';
  if (readyInp) readyInp.value = (dep && dep.ready_time != null) ? minutesToTime(dep.ready_time) : '';
  if (dueInp) dueInp.value = (dep && dep.due_time != null) ? minutesToTime(dep.due_time) : '';

  // Conteggio Clienti
  const countEl = document.getElementById('vrptwCustomerCount');
  const custs = State.vrptwConfig.customers || [];
  if (countEl) {
    countEl.innerText = `${custs.length} destinazioni`;
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
  if (tbody) {
    tbody.innerHTML = '';
    if (custs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 18px;">Nessuna destinazione presente. Clicca su <b>+ Nuovo Cliente</b> per inserire le coordinate e finestre orarie.</td></tr>';
    } else {
      custs.forEach((c, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${c.name || ''}" 
              onchange="updateVrptwCustomerField(${idx}, 'name', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 76px;" value="${c.lat != null ? c.lat : ''}" 
              onchange="updateVrptwCustomerCoord(${idx}, 'lat', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 76px;" value="${c.lon != null ? c.lon : ''}" 
              onchange="updateVrptwCustomerCoord(${idx}, 'lon', this.value)">
          </td>
          <td>
            <input type="number" class="cell-inp" style="width: 74px;" min="10" step="20" value="${c.demand || ''}" 
              onchange="updateVrptwCustomerDemand(${idx}, this.value)">
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="time" class="cell-inp" style="width: 74px; font-size: 11px; padding: 4px 5px;" value="${minutesToTime(c.ready_time != null ? c.ready_time : 0)}" 
                onchange="updateVrptwTimeWindow(${idx}, 'ready', this.value)">
              <span style="color: var(--text-muted);">-</span>
              <input type="time" class="cell-inp" style="width: 74px; font-size: 11px; padding: 4px 5px;" value="${minutesToTime(c.due_time != null ? c.due_time : 480)}" 
                onchange="updateVrptwTimeWindow(${idx}, 'due', this.value)">
            </div>
          </td>
          <td>
            <input type="number" class="cell-inp" style="width: 58px;" min="5" step="5" value="${c.service_time != null ? c.service_time : 15}" 
              onchange="updateVrptwServiceTime(${idx}, this.value)"> min
          </td>
          <td style="text-align: center;">
            <button class="btn-danger-outline" title="Rimuovi cliente" onclick="removeVrptwCustomer(${idx})">&times;</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // 2. Tabella Veicoli VRPTW
  const vbody = document.getElementById('vrptwVehiclesBody');
  if (vbody && State.vrptwConfig.vehicles) {
    vbody.innerHTML = '';
    State.vrptwConfig.vehicles.forEach((v, idx) => {
      const kmCost = (v.cost_per_km !== undefined && v.cost_per_km !== null) ? v.cost_per_km : (State.vrptwConfig.cost_per_km || 1.25);
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
        <td>
          <input type="number" class="cell-inp" min="0.1" step="0.05" value="${kmCost}" 
            onchange="updateVrptwVehicleKmCost(${idx}, this.value)">
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
  if (!State.vrptwConfig) return;
  if (!State.vrptwConfig.depot) State.vrptwConfig.depot = {};
  if (field === 'lat' || field === 'lon') {
    const num = parseFloat(val);
    State.vrptwConfig.depot[field] = isNaN(num) ? null : num;
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
  const num = parseFloat(val);
  State.vrptwConfig.customers[idx][coord] = isNaN(num) ? null : num;
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

function updateVrptwVehicleKmCost(idx, val) {
  if (State.vrptwConfig && State.vrptwConfig.vehicles && State.vrptwConfig.vehicles[idx]) {
    State.vrptwConfig.vehicles[idx].cost_per_km = parseFloat(val) || 1.25;
  }
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
  const baseLat = (dep && typeof dep.lat === 'number' && !isNaN(dep.lat) && dep.lat !== null) ? dep.lat : 45.4642;
  const baseLon = (dep && typeof dep.lon === 'number' && !isNaN(dep.lon) && dep.lon !== null) ? dep.lon : 9.1900;
  const offsetLat = (Math.random() - 0.5) * 0.12;
  const offsetLon = (Math.random() - 0.5) * 0.18;

  if (!State.vrptwConfig.customers) State.vrptwConfig.customers = [];
  const newId = State.vrptwConfig.customers.length + 1;
  State.vrptwConfig.customers.push({
    id: newId,
    name: name,
    lat: Number((baseLat + offsetLat).toFixed(4)),
    lon: Number((baseLon + offsetLon).toFixed(4)),
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
    fixed_cost: 80.0,
    cost_per_km: State.vrptwConfig.cost_per_km || 1.25
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
      fixed_cost: 80.0,
      cost_per_km: State.vrptwConfig.cost_per_km || 1.25
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
  if (!State.vrptwConfig || !State.vrptwConfig.customers || State.vrptwConfig.customers.length === 0) {
    showToast('⚠️ Inserisci almeno una destinazione e l\'hub prima di avviare il calcolo!');
    return;
  }
  const dep = State.vrptwConfig.depot;
  if (!dep || dep.lat == null || dep.lon == null || isNaN(dep.lat) || isNaN(dep.lon)) {
    showToast('⚠️ Inserisci le coordinate dell\'hub logistico prima di avviare il calcolo!');
    return;
  }

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
    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon) && lat !== null && lon !== null) {
      bounds.extend([lat, lon]);
    }
  }

  // 1. GESTIONE DEI DEPOSITI
  if (type === 'mdvrp') {
    (config.depots || []).forEach((d, idx) => {
      if (typeof d.lat !== 'number' || typeof d.lon !== 'number' || isNaN(d.lat) || isNaN(d.lon) || d.lat === null || d.lon === null) return;
      addPoint(d.lat, d.lon);
      const depColor = d.color || State.vehicleColors[idx % State.vehicleColors.length];
      const icon = createCustomMarkerIcon('🏢', depColor, '#ffffff', 32);
      L.marker([d.lat, d.lon], { icon })
        .bindPopup(`<b>🏢 Deposito Base: ${d.name || d.id}</b><br>ID: ${d.id}<br>GPS: ${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}`)
        .addTo(map._routeLayerGroup);
    });
  } else if (config.depot && typeof config.depot.lat === 'number' && typeof config.depot.lon === 'number' && !isNaN(config.depot.lat) && !isNaN(config.depot.lon) && config.depot.lat !== null && config.depot.lon !== null) {
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
      if (typeof f.lat !== 'number' || typeof f.lon !== 'number' || isNaN(f.lat) || isNaN(f.lon) || f.lat === null || f.lon === null) return;
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
      if (req.pickup && typeof req.pickup.lat === 'number' && typeof req.pickup.lon === 'number' && !isNaN(req.pickup.lat) && !isNaN(req.pickup.lon) && req.pickup.lat !== null && req.pickup.lon !== null) {
        addPoint(req.pickup.lat, req.pickup.lon);
        const iconP = createCustomMarkerIcon('P', '#10b981', '#ffffff', 26);
        L.marker([req.pickup.lat, req.pickup.lon], { icon: iconP })
          .bindPopup(`<b>🟢 Ritiro (${req.id})</b><br><b>${req.pickup.name}</b><br>Carico da prelevare: <b>+${req.demand_kg} kg</b><br>GPS: ${req.pickup.lat.toFixed(5)}, ${req.pickup.lon.toFixed(5)}`)
          .addTo(map._routeLayerGroup);
      }
      if (req.delivery && typeof req.delivery.lat === 'number' && typeof req.delivery.lon === 'number' && !isNaN(req.delivery.lat) && !isNaN(req.delivery.lon) && req.delivery.lat !== null && req.delivery.lon !== null) {
        addPoint(req.delivery.lat, req.delivery.lon);
        const iconD = createCustomMarkerIcon('D', '#f59e0b', '#ffffff', 26);
        L.marker([req.delivery.lat, req.delivery.lon], { icon: iconD })
          .bindPopup(`<b>🟠 Consegna (${req.id})</b><br><b>${req.delivery.name}</b><br>Carico da recapitare: <b>-${req.demand_kg} kg</b><br>GPS: ${req.delivery.lat.toFixed(5)}, ${req.delivery.lon.toFixed(5)}`)
          .addTo(map._routeLayerGroup);
      }
      if (req.pickup && req.delivery && typeof req.pickup.lat === 'number' && typeof req.delivery.lat === 'number' && !isNaN(req.pickup.lat) && !isNaN(req.delivery.lat)) {
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
  if (config.customers && type !== 'vrppd' && type !== 'pcarp' && type !== 'carptw') {
    config.customers.forEach(c => {
      if (typeof c.lat !== 'number' || typeof c.lon !== 'number' || isNaN(c.lat) || isNaN(c.lon) || c.lat === null || c.lon === null) return;
      addPoint(c.lat, c.lon);
      const icon = createCustomMarkerIcon(c.id, '#0284c7', '#ffffff', 24);
      let popupHtml = `<b>📍 Cliente #${c.id}: ${c.name}</b><br>Carico Richiesto: <b>${c.demand_kg || c.demand || 0} kg</b><br>GPS: ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`;
      if (type === 'vrptw') {
        popupHtml += `<br>Finestra Oraria: <b>${formatMinutesToTime(c.ready_time)} - ${formatMinutesToTime(c.due_time)}</b><br>Tempo scarico: ${c.service_time} min`;
      }
      L.marker([c.lat, c.lon], { icon })
        .bindPopup(popupHtml)
        .addTo(map._routeLayerGroup);
    });
  }

  // 4.5 GESTIONE STRADE E ARCHI (PCARP & CARPTW)
  if ((type === 'pcarp' || type === 'carptw') && config.streets) {
    config.streets.forEach(s => {
      if (typeof s.lat1 === 'number' && typeof s.lon1 === 'number' && typeof s.lat2 === 'number' && typeof s.lon2 === 'number') {
        addPoint(s.lat1, s.lon1);
        addPoint(s.lat2, s.lon2);
        const arcColor = (type === 'carptw') ? '#fbbf24' : '#38bdf8';
        const poly = L.polyline([[s.lat1, s.lon1], [s.lat2, s.lon2]], {
          color: arcColor,
          weight: 4,
          opacity: 0.65
        }).addTo(map._routeLayerGroup);

        let tooltipHtml = `<b>🛣️ ${s.name}</b><br>Lunghezza: ${s.length_km} km | Carico: ${s.demand_kg} kg`;
        if (type === 'pcarp') {
          tooltipHtml += `<br>Giorni: <b>${(s.days || []).join(', ') || 'Tutti'}</b>`;
        } else if (type === 'carptw') {
          tooltipHtml += `<br>Finestra Oraria: <b>${s.ready_time || '06:00'} - ${s.due_time || '14:00'}</b> (Durata: ${s.serv_min || 15} min)`;
          if (s.reason) tooltipHtml += `<br><i>${s.reason}</i>`;
        }
        poly.bindTooltip(tooltipHtml, { sticky: true });
      }
    });
  }

  // 5. TRACCIAMENTO DEI PERCORSI VEICOLI RISOLTI
  if (solution) {
    if (type === 'pcarp') {
      const depLat = (config.depot && typeof config.depot.lat === 'number') ? config.depot.lat : 45.667;
      const depLon = (config.depot && typeof config.depot.lon === 'number') ? config.depot.lon : 12.245;
      
      const daysToRender = (State.pcarpSelectedDay && State.pcarpSelectedDay !== 'ALL')
        ? [State.pcarpSelectedDay]
        : Object.keys(solution.daily_solutions || {});

      let globalVehCount = 0;
      daysToRender.forEach(dName => {
        const daySol = (solution.daily_solutions && solution.daily_solutions[dName]) || null;
        if (!daySol || !daySol.vehicles) return;
        Object.entries(daySol.vehicles).forEach(([vName, vInfo]) => {
          if (!vInfo.used || !vInfo.streets_served || vInfo.streets_served.length === 0) return;
          const color = State.vehicleColors[globalVehCount % State.vehicleColors.length];
          globalVehCount++;
          const latLngs = [[depLat, depLon]];
          vInfo.streets_served.forEach(st => {
            if (typeof st.lat1 === 'number' && typeof st.lon1 === 'number') latLngs.push([st.lat1, st.lon1]);
            if (typeof st.lat2 === 'number' && typeof st.lon2 === 'number') latLngs.push([st.lat2, st.lon2]);
          });
          latLngs.push([depLat, depLon]);
          const polyline = L.polyline(latLngs, {
            color: color,
            weight: 4,
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(map._routeLayerGroup);
          polyline.bindTooltip(`<b>${vName} (${dName})</b><br>Carico: ${vInfo.total_load} kg | Km: ${vInfo.total_km} km | Costo: ${vInfo.cost} €`, { sticky: true });
        });
      });
    } else if (type === 'carptw' && solution.vehicles) {
      Object.entries(solution.vehicles).forEach(([vName, vInfo], vIdx) => {
        if (!vInfo.used || !vInfo.stops || vInfo.stops.length < 2) return;
        const color = State.vehicleColors[vIdx % State.vehicleColors.length];
        const latLngs = [];
        vInfo.stops.forEach(st => {
          if (st.type === 'depot' && typeof st.lat === 'number' && typeof st.lon === 'number') {
            latLngs.push([st.lat, st.lon]);
          } else if (st.type === 'street') {
            if (typeof st.entry_lat === 'number' && typeof st.entry_lon === 'number') latLngs.push([st.entry_lat, st.entry_lon]);
            if (typeof st.exit_lat === 'number' && typeof st.exit_lon === 'number') latLngs.push([st.exit_lat, st.exit_lon]);
          }
        });
        if (latLngs.length >= 2) {
          const polyline = L.polyline(latLngs, {
            color: color,
            weight: 4,
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(map._routeLayerGroup);
          polyline.bindTooltip(`<b>${vName}</b> &mdash; Carico: ${vInfo.total_load} kg (${vInfo.total_km} km, ${vInfo.total_wait_min} min attesa)`, { sticky: true });
        }
      });
    } else if (type === 'vrppd' || type === 'mdvrp') {
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
  if (config.depot && typeof config.depot.lat === 'number' && !isNaN(config.depot.lat) && config.depot.lat !== null) allPoints.push(config.depot);
  if (config.customers && config.customers.length > 0) {
    config.customers.forEach(c => {
      if (typeof c.lat === 'number' && !isNaN(c.lat) && c.lat !== null) allPoints.push(c);
    });
  }
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
  if (!State.carpConfig) {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        State.carpConfig = await res.json();
      }
    } catch (e) {
      console.error('Errore caricamento CARP:', e);
    }
  }
  if (!State.carpConfig) {
    State.carpConfig = {
      name: 'CARP Servizio Stradale',
      depot: { name: 'Sede / Deposito Aziendale', lat: 45.951391386254286, lon: 12.312502178579223, node_id: 0 },
      streets: [],
      vehicles: []
    };
  }
  if (!State.hasImportedConfigFile && typeof syncWizardFleetToModels === 'function') {
    syncWizardFleetToModels();
  }
  renderCarpTables();
}

// ==========================================
// GESTIONE FRAZIONI RIFIUTI CARP (STIME FAQ & DATI STORICI AZIENDALI)
// ==========================================
State.carpFractions = [
  { id: 'umido', icon: '🥑', name: 'Umido / Organico (FORSU)', faqRange: '0,80 – 1,10', faqMin: 0.80, faqAvg: 0.95, faqMax: 1.10, rate: 0.95, selected: true, note: 'Bisettimanale (Peso elevato)' },
  { id: 'carta', icon: '📦', name: 'Carta e Cartone', faqRange: '0,70 – 1,40', faqMin: 0.70, faqAvg: 1.00, faqMax: 1.40, rate: 1.00, selected: false, note: 'Settimanale (Compatt. 1:3)' },
  { id: 'vetro', icon: '🍾', name: 'Vetro', faqRange: '0,60 – 1,00', faqMin: 0.60, faqAvg: 0.80, faqMax: 1.00, rate: 0.80, selected: false, note: 'Quindicinale (Non compatt.)' },
  { id: 'plastica', icon: '🧴', name: 'Plastica e Lattine', faqRange: '0,25 – 0,40', faqMin: 0.25, faqAvg: 0.32, faqMax: 0.40, rate: 0.32, selected: false, note: 'Settimanale (Satura volume m³*)' },
  { id: 'secco', icon: '🗑️', name: 'Secco Residuo (PAYT)', faqRange: '0,20 – 0,35', faqMin: 0.20, faqAvg: 0.28, faqMax: 0.35, rate: 0.28, selected: false, note: 'Tariffa Puntuale (2-3 sett.)' }
];
State.carpCustomHistoricalMode = false;

function getActiveCarpFractionRate() {
  const selected = (State.carpFractions || []).filter(f => f.selected);
  if (selected.length === 0) return 0.0;
  const sum = selected.reduce((acc, f) => acc + (parseFloat(f.rate) || 0), 0);
  return Math.round(sum * 100) / 100;
}

function getActiveCarpFractionsLabel() {
  if (State.carpCustomHistoricalMode) {
    return 'Calibrazione da Pesata Storica Aziendale';
  }
  const selected = (State.carpFractions || []).filter(f => f.selected);
  if (selected.length === 0) return 'Nessuna frazione selezionata';
  if (selected.length === State.carpFractions.length) return 'Tutte le 5 Frazioni (Settimana Completa)';
  return selected.map(f => `${f.icon} ${f.name.split(' (')[0]}`).join(' + ');
}

function isStreetCollectible(s) {
  if (!s) return false;
  if (s.id === 'R0' || (s.name && s.name.toLowerCase().includes('raccordo cantiere deposito'))) return false;
  const desc = (s.description || '').toLowerCase();
  if (desc.includes('superstrada') || desc.includes('transito veloce')) return false;
  return true;
}

function getStreetLengthMeters(s) {
  const lm = parseFloat(s.length_m);
  if (!isNaN(lm) && lm > 0) return lm;
  const tc = parseFloat(s.transit_cost);
  if (!isNaN(tc) && tc > 0) return Math.round(tc * 100.0);
  return 100.0;
}

function getCarpActiveNetworkStats() {
  const streets = (State.carpConfig && State.carpConfig.streets) ? State.carpConfig.streets : [];
  let totalMeters = 0;
  let activeCount = 0;
  streets.forEach(s => {
    if (isStreetCollectible(s)) {
      totalMeters += getStreetLengthMeters(s);
      activeCount += 1;
    }
  });
  return {
    totalMeters: totalMeters,
    totalKm: totalMeters / 1000.0,
    activeCount: activeCount,
    totalStreets: streets.length
  };
}

function renderCarpFractionsConfig() {
  const tbody = document.getElementById('carpFractionsConfigBody');
  if (tbody && State.carpFractions) {
    tbody.innerHTML = '';
    State.carpFractions.forEach((f, idx) => {
      const tr = document.createElement('tr');
      if (f.selected) {
        tr.style.background = 'rgba(56, 189, 248, 0.08)';
      }
      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" ${f.selected ? 'checked' : ''} onchange="toggleCarpFraction('${f.id}', this.checked)" style="cursor: pointer; accent-color: #38bdf8; width: 15px; height: 15px;">
        </td>
        <td>
          <b style="color: ${f.selected ? '#38bdf8' : 'var(--text-main)'};">${f.icon} ${f.name}</b>
          <br><small style="color: var(--text-muted); font-size: 10px;">${f.note}</small>
        </td>
        <td>
          <span class="code-tag" style="font-size: 10.5px; color: #94a3b8;">${f.faqRange} kg/m</span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px;">
            <input type="number" class="cell-inp" style="width: 65px; font-size: 11.5px; font-weight: 700; color: ${f.selected ? '#34d399' : 'var(--text-secondary)'};" min="0.05" max="10.0" step="0.05" value="${f.rate.toFixed(2)}" onchange="updateCarpFractionRate('${f.id}', this.value)">
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const summaryEl = document.getElementById('carpActiveFractionSummary');
  const rate = getActiveCarpFractionRate();
  const totalDemand = ((State.carpConfig && State.carpConfig.streets) || []).reduce((acc, s) => acc + (parseFloat(s.demand_kg) || 0), 0);
  const qt = (totalDemand / 100.0).toFixed(1);
  if (summaryEl) {
    const label = getActiveCarpFractionsLabel();
    summaryEl.innerHTML = `
      Giro: <b style="color:#38bdf8;">${label}</b> (${rate.toFixed(2)} kg/m) &rarr; Totale: <b style="color:#fbbf24;">${totalDemand.toLocaleString()} kg (${qt} qt)</b>
    `;
  }

  const unlockBtn = document.getElementById('btnUnlockManualStreets');
  if (unlockBtn && State.carpConfig && State.carpConfig.streets) {
    const hasManual = State.carpConfig.streets.some(s => s.manual_override);
    unlockBtn.style.display = hasManual ? 'inline-flex' : 'none';
  }
}

function toggleCarpFraction(fracId, checked) {
  const f = (State.carpFractions || []).find(x => x.id === fracId);
  if (!f) return;
  f.selected = !!checked;
  // Assicura che almeno 1 frazione resti attiva se l'utente deseleziona tutto per errore
  if (!State.carpFractions.some(x => x.selected)) {
    f.selected = true;
    showToast('ℹ️ Almeno una frazione merceologica deve essere attiva per il giro di raccolta.');
  }
  State.carpCustomHistoricalMode = false;
  applyCarpFractionsToStreets(false);
}

function updateCarpFractionRate(fracId, val) {
  const f = (State.carpFractions || []).find(x => x.id === fracId);
  if (!f) return;
  const num = parseFloat(val);
  f.rate = (!isNaN(num) && num >= 0.01) ? Math.round(num * 100) / 100 : f.faqAvg;
  State.carpCustomHistoricalMode = false;
  if (f.selected) {
    applyCarpFractionsToStreets(false);
  } else {
    renderCarpFractionsConfig();
    renderCarpMunicipalitySummaryTable();
  }
}

function setCarpFractionPreset(mode) {
  (State.carpFractions || []).forEach(f => {
    if (mode === 'min') f.rate = f.faqMin;
    else if (mode === 'max') f.rate = f.faqMax;
    else f.rate = f.faqAvg;
  });
  State.carpCustomHistoricalMode = false;
  applyCarpFractionsToStreets(true);
  const label = mode === 'min' ? 'Minimo FAQ' : (mode === 'max' ? 'Massimo FAQ' : 'Medio FAQ');
  showToast(`Applicati coefficienti teorici '${label}' e ricalcolata la rete stradale.`);
}

function applyCarpFractionsToStreets(autoResizeFleet = false) {
  if (!State.carpConfig || !State.carpConfig.streets) return;
  const rate = getActiveCarpFractionRate();
  const factor = (State.carpConfig.settings && State.carpConfig.settings.service_speed_factor)
    ? parseFloat(State.carpConfig.settings.service_speed_factor) : 1.8;

  State.carpConfig.streets.forEach(s => {
    if (!isStreetCollectible(s)) {
      s.demand_kg = 0;
      return;
    }
    if (s.manual_override) {
      return; // Preserva le vie modificate manualmente con dati storici puntuali
    }
    const lengthM = getStreetLengthMeters(s);
    s.length_m = Math.round(lengthM * 10) / 10;
    if (rate > 0) {
      const raw = Math.round((lengthM * rate) / 10.0) * 10.0;
      s.demand_kg = Math.max(10, raw);
    } else {
      s.demand_kg = 0;
    }
    const tCost = parseFloat(s.transit_cost) || Math.max(0.5, Math.round((lengthM / 100.0) * 100) / 100);
    s.service_cost = s.demand_kg > 0 ? Math.max(0.9, Math.round(tCost * factor * 100) / 100) : tCost;
  });

  if (State.carpConfig.settings) {
    State.carpConfig.settings.demand_per_meter = rate;
  }

  if (autoResizeFleet) {
    resizeCarpFleetToMatchDemand();
  }

  renderCarpTables();
}

function resizeCarpFleetToMatchDemand() {
  if (!State.carpConfig) return;
  const totalDemand = (State.carpConfig.streets || []).reduce((acc, s) => acc + (parseFloat(s.demand_kg) || 0), 0);
  const existing = State.carpConfig.vehicles || [];
  const avgCap = existing.length > 0
    ? (existing.reduce((a, v) => a + (parseFloat(v.capacity_kg) || 4500), 0) / existing.length)
    : 4500;
  const avgFixed = existing.length > 0
    ? (existing.reduce((a, v) => a + (parseFloat(v.fixed_cost) || 100), 0) / existing.length)
    : 100.0;

  // Calcola numero ottimale di compattatori con margine operativo del 20%
  const targetCount = Math.max(2, Math.floor(totalDemand / (avgCap * 0.80)) + 1);
  const newVehicles = [];
  for (let i = 0; i < targetCount; i++) {
    if (i < existing.length) {
      newVehicles.push(existing[i]);
    } else {
      newVehicles.push({
        name: `Compattatore_${i + 1}`,
        capacity_kg: Math.round(avgCap),
        fixed_cost: Math.round(avgFixed * 100) / 100,
        description: `Compattatore RSU #${i + 1}`
      });
    }
  }
  State.carpConfig.vehicles = newVehicles;
}

function applyCarpHistoricalTotalKg() {
  if (!State.carpConfig || !State.carpConfig.streets) return;
  const inp = document.getElementById('carpHistoricalTotalKg');
  const targetTotal = parseFloat(inp ? inp.value : 0);
  if (isNaN(targetTotal) || targetTotal <= 0) {
    showToast('⚠️ Inserisci un valore valido in kg dalla bolla di pesata storica (es. 36800).');
    return;
  }

  // Calcola quanti kg sono già bloccati manualmente e quanti metri sono liberi
  let lockedKg = 0;
  let unlockedMeters = 0;
  State.carpConfig.streets.forEach(s => {
    if (!isStreetCollectible(s)) return;
    if (s.manual_override) {
      lockedKg += (parseFloat(s.demand_kg) || 0);
    } else {
      unlockedMeters += getStreetLengthMeters(s);
    }
  });

  const remainingKg = Math.max(0, targetTotal - lockedKg);
  if (unlockedMeters <= 0) {
    showToast('Tutte le vie hanno un valore manuale bloccato. Sbloccale prima di riproporzionare.');
    return;
  }

  const effectiveRate = remainingKg / unlockedMeters;
  State.carpConfig.streets.forEach(s => {
    if (!isStreetCollectible(s) || s.manual_override) return;
    const lm = getStreetLengthMeters(s);
    s.demand_kg = Math.max(5, Math.round((lm * effectiveRate) / 5.0) * 5.0);
  });

  State.carpCustomHistoricalMode = true;
  resizeCarpFleetToMatchDemand();
  renderCarpTables();
  showToast(`✅ Domanda riproporzionata su ${targetTotal.toLocaleString()} kg storici (${effectiveRate.toFixed(2)} kg/m medi)!`);
}

function unlockCarpStreetManual(idx) {
  if (!State.carpConfig || !State.carpConfig.streets || !State.carpConfig.streets[idx]) return;
  delete State.carpConfig.streets[idx].manual_override;
  applyCarpFractionsToStreets(false);
  showToast('Via sbloccata e riallineata alla stima della frazione.');
}

function unlockAllCarpManualStreets() {
  if (!State.carpConfig || !State.carpConfig.streets) return;
  State.carpConfig.streets.forEach(s => { delete s.manual_override; });
  applyCarpFractionsToStreets(false);
  showToast('🔓 Tutte le vie modificate manualmente sono state riallineate ai coefficienti di frazione.');
}

function simulateSingleCarpFraction(fracId) {
  if (!State.carpFractions) return;
  if (fracId === 'ALL') {
    State.carpFractions.forEach(f => { f.selected = true; });
  } else {
    State.carpFractions.forEach(f => { f.selected = (f.id === fracId); });
  }
  State.carpCustomHistoricalMode = false;
  applyCarpFractionsToStreets(true);
  solveCarp();
}

function renderCarpMunicipalitySummaryTable() {
  const tbody = document.getElementById('carpMunicipalitySummaryBody');
  const titleEl = document.getElementById('carpSummaryTitle');
  const badgeEl = document.getElementById('carpSummaryNetBadge');
  if (!tbody || !State.carpConfig) return;

  const stats = getCarpActiveNetworkStats();
  const placeName = State.carpConfig.place_name
    || (document.getElementById('inpOsmPlace') ? document.getElementById('inpOsmPlace').value.trim() : '')
    || 'Comune Caricato';

  if (titleEl) {
    titleEl.innerText = `Prospetto Frazioni & Stime di Carico — ${placeName}`;
  }
  if (badgeEl) {
    badgeEl.innerText = `${stats.totalKm.toFixed(1)} km rete (${stats.activeCount} vie con raccolta)`;
  }
  const netKpi = document.getElementById('carpNetworkKpi');
  if (netKpi) {
    netKpi.innerHTML = `${stats.totalKm.toFixed(1)} km <span style="font-size:11.5px; color:#34d399; font-weight:600;">(${stats.activeCount} vie)</span>`;
  }

  const vehicles = State.carpConfig.vehicles || [];
  const avgCap = vehicles.length > 0
    ? (vehicles.reduce((a, v) => a + (parseFloat(v.capacity_kg) || 4500), 0) / vehicles.length)
    : 4500;

  tbody.innerHTML = '';

  let sumMinRate = 0;
  let sumMaxRate = 0;
  let sumActiveRate = 0;

  (State.carpFractions || []).forEach(f => {
    sumMinRate += f.faqMin;
    sumMaxRate += f.faqMax;
    sumActiveRate += f.rate;

    // Calcola il carico esatto che questa frazione genera sulle vie del comune
    let estKg = 0;
    (State.carpConfig.streets || []).forEach(s => {
      if (isStreetCollectible(s)) {
        const lm = getStreetLengthMeters(s);
        estKg += Math.max(10, Math.round((lm * f.rate) / 10.0) * 10.0);
      }
    });
    const estQt = (estKg / 100.0).toFixed(1);
    const estTrucksWeight = Math.max(1, Math.ceil(estKg / (avgCap * 0.85)));
    let fleetLabel = `~${estTrucksWeight} mezzi`;
    if (f.id === 'plastica') {
      const estTrucksVol = Math.max(estTrucksWeight + 1, Math.ceil((estKg * 1.9) / (avgCap * 0.85)));
      fleetLabel = `~${estTrucksWeight} (peso) / ~${estTrucksVol} (vol.*)`;
    }

    const isSoleSelected = !State.carpCustomHistoricalMode
      && f.selected
      && State.carpFractions.filter(x => x.selected).length === 1;

    const tr = document.createElement('tr');
    if (f.selected && !State.carpCustomHistoricalMode) {
      tr.style.background = 'rgba(52, 211, 153, 0.10)';
      tr.style.borderLeft = '3px solid #34d399';
    }
    tr.innerHTML = `
      <td>
        <b>${f.icon} ${f.name}</b>
        ${f.selected && !State.carpCustomHistoricalMode ? '<span class="code-tag" style="margin-left:4px; color:#34d399; border-color:rgba(52,211,153,0.4); font-size:9.5px;">NEL GIRO</span>' : ''}
      </td>
      <td><span style="color:var(--text-muted);">${f.faqRange} kg/m</span></td>
      <td><b style="color:#38bdf8;">${f.rate.toFixed(2)} kg/m</b></td>
      <td>
        <b style="color:#fbbf24;">${estQt} qt</b>
        <span style="color:var(--text-muted); font-size:10.5px;">(${estKg.toLocaleString()} kg)</span>
      </td>
      <td><span style="color:var(--text-secondary);">${fleetLabel}</span></td>
      <td style="text-align: center;">
        <button type="button" class="btn ${isSoleSelected ? 'btn-primary' : 'btn-secondary'} btn-sm" style="font-size:10.5px; padding:3px 8px;" onclick="simulateSingleCarpFraction('${f.id}')">
          ${isSoleSelected ? '✅ Attivo' : '⚡ Simula'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Riga Giro Attuale (se sono selezionate più frazioni insieme o storico manuale)
  const selectedFracs = (State.carpFractions || []).filter(x => x.selected);
  const currentActualKg = (State.carpConfig.streets || []).reduce((acc, s) => acc + (parseFloat(s.demand_kg) || 0), 0);
  const currentActualQt = (currentActualKg / 100.0).toFixed(1);
  const currentEffRate = stats.totalMeters > 0 ? (currentActualKg / stats.totalMeters) : getActiveCarpFractionRate();
  const currentTrucks = Math.max(1, Math.ceil(currentActualKg / (avgCap * 0.85)));

  if (selectedFracs.length > 1 || State.carpCustomHistoricalMode) {
    const trCur = document.createElement('tr');
    trCur.style.background = 'rgba(56, 189, 248, 0.14)';
    trCur.innerHTML = `
      <td><b style="color:#38bdf8;">🎯 Giro Attuale (${getActiveCarpFractionsLabel()})</b></td>
      <td><span style="color:var(--text-muted);">Personalizzato</span></td>
      <td><b style="color:#38bdf8;">${currentEffRate.toFixed(2)} kg/m</b></td>
      <td><b style="color:#34d399;">${currentActualQt} qt</b> <span style="color:var(--text-muted); font-size:10.5px;">(${currentActualKg.toLocaleString()} kg)</span></td>
      <td><b style="color:#34d399;">~${currentTrucks} mezzi</b></td>
      <td style="text-align:center;"><span class="code-tag" style="color:#38bdf8; font-size:10px;">ATTIVO</span></td>
    `;
    tbody.appendChild(trCur);
  }

  // Riga Somma Settimanale Tutte le 5 Frazioni
  let totalWeekKg = 0;
  (State.carpConfig.streets || []).forEach(s => {
    if (isStreetCollectible(s)) {
      const lm = getStreetLengthMeters(s);
      totalWeekKg += Math.max(10, Math.round((lm * sumActiveRate) / 10.0) * 10.0);
    }
  });
  const totalWeekQt = (totalWeekKg / 100.0).toFixed(1);
  const allSelected = selectedFracs.length === (State.carpFractions || []).length && !State.carpCustomHistoricalMode;

  const trTotal = document.createElement('tr');
  trTotal.style.background = 'rgba(245, 158, 11, 0.08)';
  trTotal.style.borderTop = '2px solid rgba(255, 255, 255, 0.12)';
  trTotal.innerHTML = `
    <td><b>🔄 Somma Tutte le 5 Frazioni (Intera Settimana)</b></td>
    <td><span style="color:var(--text-muted);">${sumMinRate.toFixed(2).replace('.', ',')} – ${sumMaxRate.toFixed(2).replace('.', ',')} kg/m</span></td>
    <td><b style="color:#fbbf24;">${sumActiveRate.toFixed(2)} kg/m</b></td>
    <td>
      <b style="color:#fbbf24;">${totalWeekQt} qt</b>
      <span style="color:var(--text-muted); font-size:10.5px;">(${totalWeekKg.toLocaleString()} kg)</span>
    </td>
    <td><span style="color:var(--text-secondary);">Ciclo 6 giorni</span></td>
    <td style="text-align: center;">
      <button type="button" class="btn ${allSelected ? 'btn-primary' : 'btn-secondary'} btn-sm" style="font-size:10.5px; padding:3px 8px;" onclick="simulateSingleCarpFraction('ALL')">
        ${allSelected ? '✅ Attivo' : '⚡ Simula'}
      </button>
    </td>
  `;
  tbody.appendChild(trTotal);
}

function renderCarpTables() {
  if (!State.carpConfig) return;

  // Renderizza selettore frazioni e tabella riassuntiva del comune
  renderCarpFractionsConfig();
  renderCarpMunicipalitySummaryTable();

  // 0. Deposito CARP
  const dep = State.carpConfig.depot || {};
  const depInfo = State.carpConfig.depot_info || {};
  const node0 = (State.carpConfig.nodes || []).find(n => n.id === 0) || {};
  const depName = dep.name || depInfo.address || node0.name || '';
  const depLat = dep.lat ?? depInfo.exact_lat ?? node0.lat;
  const depLon = dep.lon ?? depInfo.exact_lon ?? node0.lon;
  const nameInp = document.getElementById('carpDepotName');
  const latInp = document.getElementById('carpDepotLat');
  const lonInp = document.getElementById('carpDepotLon');
  if (nameInp) nameInp.value = depName;
  if (latInp) latInp.value = (depLat !== null && depLat !== undefined && !isNaN(depLat) && depLat !== '') ? depLat : '';
  if (lonInp) lonInp.value = (depLon !== null && depLon !== undefined && !isNaN(depLon) && depLon !== '') ? depLon : '';

  // 1. Tabella Strade
  const tbody = document.getElementById('carpStreetsBody');
  const countEl = document.getElementById('carpStreetsCount');
  const streets = State.carpConfig.streets || [];
  if (countEl) {
    countEl.innerText = `${streets.length} tratte viarie`;
  }

  if (tbody) {
    tbody.innerHTML = '';
    if (streets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 22px;">Nessuna tratta stradale caricata. Clicca su <b>🌍 Importa da OpenStreetMap</b> per caricare la rete viaria della tua zona.</td></tr>';
    } else {
      streets.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'carp-street-row';
        tr.dataset.name = (s.name || '').toLowerCase();
        tr.dataset.nodes = `${s.u}-${s.v}`;
        const lm = getStreetLengthMeters(s);
        const manualBadge = s.manual_override
          ? `<button type="button" onclick="unlockCarpStreetManual(${idx})" title="Dato storico manuale bloccato. Clicca per sbloccare" style="background:rgba(245,158,11,0.2); border:1px solid rgba(245,158,11,0.5); color:#fbbf24; border-radius:4px; font-size:10px; padding:1px 5px; cursor:pointer; margin-left:4px;">🔒 Manuale</button>`
          : '';
        tr.innerHTML = `
          <td>
            <b>${s.name}</b> ${manualBadge}
            <br><small style="color:var(--text-muted);">${s.description || ''} (${lm.toFixed(0)} m)</small>
          </td>
          <td><span class="code-tag">${s.u} &rarr; ${s.v}</span></td>
          <td>
            <input type="number" class="cell-inp" min="0" step="10" value="${s.demand_kg}"
              style="${s.manual_override ? 'border-color:#fbbf24; color:#fbbf24; font-weight:700;' : ''}"
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
  }

  // Mappa Iframe Folium: se vuota, mostra messaggio, altrimenti carica la mappa esistente
  const iframe = document.getElementById('carpMapIframe');
  if (iframe) {
    if (streets.length === 0) {
      iframe.srcdoc = `<!DOCTYPE html><html><body style="background:#080d18;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;"><div><span style="font-size:36px;">🗺️</span><br><br><b style="color:#e2e8f0;font-size:14px;">Mappa GIS CARP Vuota</b><br><span style="color:#64748b;font-size:12px;">Nessuna tratta stradale presente.<br>Clicca su '🌍 Importa da OpenStreetMap' per scaricare la rete viaria della tua zona.</span></div></body></html>`;
    } else if (iframe.src === 'about:blank' || !iframe.src || iframe.src.endsWith('about:blank')) {
      iframe.removeAttribute('srcdoc');
      iframe.src = '/output/percorso_raccolta.html?t=' + Date.now();
    }
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

function updateCarpDepot(field, val) {
  if (!State.carpConfig) return;
  if (!State.carpConfig.depot) State.carpConfig.depot = {};
  if (!State.carpConfig.depot_info) State.carpConfig.depot_info = {};
  const node0 = (State.carpConfig.nodes || []).find(n => n.id === 0);
  if (field === 'lat' || field === 'lon') {
    const num = parseFloat(val);
    const cleanNum = isNaN(num) ? null : num;
    State.carpConfig.depot[field] = cleanNum;
    if (field === 'lat') {
      State.carpConfig.depot_info.exact_lat = cleanNum;
      if (node0 && cleanNum !== null) node0.lat = cleanNum;
    } else {
      State.carpConfig.depot_info.exact_lon = cleanNum;
      if (node0 && cleanNum !== null) node0.lon = cleanNum;
    }
  } else {
    State.carpConfig.depot[field] = val;
    if (field === 'name') {
      State.carpConfig.depot_info.address = val;
      if (node0 && val) node0.name = val;
    }
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
  if (!State.carpConfig || !State.carpConfig.streets || !State.carpConfig.streets[idx]) return;
  State.carpConfig.streets[idx].demand_kg = parseFloat(val) || 0;
  State.carpConfig.streets[idx].manual_override = true;
  renderCarpTables();
}

function updateCarpStreetTransit(idx, val) {
  const t = parseFloat(val) || 1.0;
  State.carpConfig.streets[idx].transit_cost = t;
  const factor = (State.carpConfig.settings && State.carpConfig.settings.service_speed_factor) ? parseFloat(State.carpConfig.settings.service_speed_factor) : 1.8;
  State.carpConfig.streets[idx].service_cost = (State.carpConfig.streets[idx].demand_kg > 0) ? Math.round(t * factor * 100) / 100 : t;
  State.carpConfig.streets[idx].length_m = Math.round(t * 100);
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
  if (!State.carpConfig || !State.carpConfig.streets || State.carpConfig.streets.length === 0) {
    showToast('⚠️ Nessuna tratta stradale presente. Importa prima la rete da OpenStreetMap!');
    return;
  }

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

    const solvedKg = data.total_demand_kg || 0;
    const solvedQt = (solvedKg / 100.0).toFixed(1);
    document.getElementById('carpStatus').innerText = data.status;
    document.getElementById('carpCost').innerText = data.objective_value ? `${data.objective_value.toFixed(2)} €` : 'N/D';
    document.getElementById('carpDemand').innerText = `${solvedQt} qt (${solvedKg.toLocaleString()} kg)`;

    // Calcolo KPI aggiuntivi Layout 1 (Compattatori Attivi, Saturazione Media, Rete & Efficienza)
    const vEntries = Object.entries(data.vehicles || {});
    const usedVehicles = vEntries.filter(([_, v]) => v.used);
    const usedCount = usedVehicles.length;
    const totalVehCount = vEntries.length || (State.carpConfig.vehicles || []).length;
    const activeVehKpi = document.getElementById('carpActiveVehiclesKpi');
    if (activeVehKpi) {
      activeVehKpi.innerText = `${usedCount} / ${totalVehCount} Mezzi`;
    }

    const avgSatKpi = document.getElementById('carpAvgSaturationKpi');
    if (avgSatKpi) {
      const totalUsedCap = usedVehicles.reduce((acc, [_, v]) => acc + (parseFloat(v.capacity) || 4500), 0);
      const totalUsedCol = usedVehicles.reduce((acc, [_, v]) => acc + (parseFloat(v.total_collected) || 0), 0);
      const avgSat = totalUsedCap > 0 ? ((totalUsedCol / totalUsedCap) * 100.0).toFixed(1) : '0.0';
      avgSatKpi.innerText = `${avgSat}%`;
    }

    const netStats = getCarpActiveNetworkStats();
    const netKpi = document.getElementById('carpNetworkKpi');
    if (netKpi) {
      netKpi.innerHTML = `${netStats.totalKm.toFixed(1)} km <span style="font-size:11.5px; color:#34d399; font-weight:600;">(${netStats.activeCount} vie)</span>`;
    }

    // Aggiorna ed evidenzia la Tabella Riassuntiva Merceologica del Comune
    renderCarpMunicipalitySummaryTable();
    const sumCard = document.getElementById('carpMunicipalitySummaryCard');
    if (sumCard) {
      sumCard.style.borderColor = '#34d399';
      sumCard.style.boxShadow = '0 0 18px rgba(52, 211, 153, 0.15)';
    }

    // Render report veicoli (Tabella Comparativa Flotta del Layout 2)
    renderCarpVehicleReport(data);

    // Ricarica Iframe Mappa Folium
    const iframe = document.getElementById('carpMapIframe');
    if (iframe) {
      iframe.removeAttribute('srcdoc');
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

function toggleCarpVehicleMovesRow(rowId, btnEl) {
  const detailRow = document.getElementById(rowId);
  if (!detailRow) return;
  const isHidden = detailRow.style.display === 'none';
  detailRow.style.display = isHidden ? 'table-row' : 'none';
  if (btnEl) {
    const count = btnEl.dataset.count || '';
    btnEl.innerHTML = isHidden ? `🔼 Chiudi (${count})` : `🔍 Vedi ${count} Vie`;
  }
}

function renderCarpVehicleReport(data) {
  const container = document.getElementById('carpVehiclesReport');
  if (!container) return;
  container.innerHTML = '';

  const carpVehicleColors = ['#1f77b4', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
  const hideUnused = document.getElementById('chkHideUnusedCarpVehicles')?.checked || false;

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

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-responsive';
  tableWrap.style.cssText = 'border: 1px solid var(--border-color); border-radius: 8px; overflow-x: auto;';

  let rowsHtml = '';
  vehiclesEntries.forEach(([vName, vInfo], idx) => {
    if (hideUnused && !vInfo.used) return;

    const color = vInfo.used ? carpVehicleColors[idx % carpVehicleColors.length] : '#64748b';
    const fixedCost = parseFloat(vInfo.fixed_cost) || 0;
    const movements = vInfo.movements || [];
    const opCost = movements.reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0);
    const totalCost = vInfo.used ? (fixedCost + opCost) : 0;
    const capacity = parseFloat(vInfo.capacity) || 4500;
    const collected = parseFloat(vInfo.total_collected) || 0;
    const collectedQt = (collected / 100.0).toFixed(1);
    const satPct = capacity > 0 ? ((collected / capacity) * 100).toFixed(1) : '0.0';

    const serviceMoves = movements.filter(m => m.type === 'SERVIZIO');
    const transitMoves = movements.filter(m => m.type === 'TRANSITO');
    const transitCount = transitMoves.reduce((acc, m) => acc + (m.times || 1), 0);
    const detailRowId = `carpVehMoves_${idx}`;

    let movesHtml = '';
    if (vInfo.used) {
      movements.forEach((m, mIdx) => {
        const sName = streetNameMap[`${m.u}-${m.v}`] || `Tratta ${m.u} &rarr; ${m.v}`;
        if (m.type === 'SERVIZIO') {
          movesHtml += `
            <div style="font-size: 11.5px; padding: 5px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
              <span><b style="color: #34d399;">${mIdx + 1}. [SERVIZIO]</b> ${sName} <span class="code-tag" style="font-size:10px;">${m.u} &rarr; ${m.v}</span></span>
              <span style="color: var(--text-secondary);"><b>${m.demand_kg} kg</b> | Costo: ${parseFloat(m.cost).toFixed(1)} €</span>
            </div>
          `;
        } else {
          movesHtml += `
            <div style="font-size: 11.5px; padding: 5px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; color: var(--text-muted);">
              <span><b style="color: #fbbf24;">${mIdx + 1}. [TRANSITO]</b> ${sName} <span class="code-tag" style="font-size:10px;">${m.u} &rarr; ${m.v}</span> ${m.times > 1 ? `(${m.times}x a vuoto)` : ''}</span>
              <span>Costo: ${parseFloat(m.cost).toFixed(1)} €</span>
            </div>
          `;
        }
      });
    }

    rowsHtml += `
      <tr style="${vInfo.used ? '' : 'opacity: 0.55;'}">
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 11px; height: 11px; border-radius: 50%; background: ${color};"></span>
            <b style="color: ${vInfo.used ? color : 'var(--text-muted)'}; font-size: 13px;">🚛 ${vName}</b>
          </div>
        </td>
        <td>
          <span class="code-tag" style="color: ${vInfo.used ? '#34d399' : '#94a3b8'}; border-color: ${vInfo.used ? 'rgba(52,211,153,0.35)' : 'rgba(148,163,184,0.25)'}; font-size: 10.5px;">
            ${vInfo.used ? 'ATTIVO' : 'RISERVA'}
          </span>
        </td>
        <td>
          <b>${collected.toLocaleString()} kg</b> <span style="color: #fbbf24; font-weight: 600;">(${collectedQt} qt)</span>
          <br><small style="color: var(--text-muted); font-size: 10.5px;">su ${capacity.toLocaleString()} kg max</small>
        </td>
        <td style="min-width: 155px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; background: #17243c; height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: ${color}; height: 100%; width: ${Math.min(parseFloat(satPct), 100)}%;"></div>
            </div>
            <b style="font-size: 12px; min-width: 42px; text-align: right;">${satPct}%</b>
          </div>
        </td>
        <td>
          <span style="color: #34d399; font-weight: 700;">✅ ${serviceMoves.length} vie</span>
        </td>
        <td>
          <span style="color: #fbbf24; font-weight: 600;">🔄 ${transitCount} transiti</span>
        </td>
        <td style="font-size: 11.5px; color: var(--text-secondary);">
          ${vInfo.used ? `${fixedCost.toFixed(0)} € + ${opCost.toFixed(1)} €` : `<span style="color:#34d399;">Risparmiato (-${fixedCost.toFixed(0)} €)</span>`}
        </td>
        <td>
          <b style="color: #38bdf8; font-size: 13px;">${totalCost.toFixed(2)} €</b>
        </td>
        <td style="text-align: center;">
          ${vInfo.used ? `
            <button type="button" class="btn btn-secondary btn-sm" data-count="${serviceMoves.length}" style="font-size: 11px; padding: 4px 9px;" onclick="toggleCarpVehicleMovesRow('${detailRowId}', this)">
              🔍 Vedi ${serviceMoves.length} Vie
            </button>
          ` : '<span style="color: var(--text-muted);">—</span>'}
        </td>
      </tr>
      ${vInfo.used ? `
      <tr id="${detailRowId}" style="display: none; background: rgba(2, 6, 23, 0.75);">
        <td colspan="9" style="padding: 10px 14px;">
          <div style="font-size: 12px; font-weight: 700; color: ${color}; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>🗺️ Foglio di Marcia Sequenziale — ${vName} (${serviceMoves.length} tratte servite, ${transitCount} transiti a vuoto)</span>
            <span style="color: var(--text-muted); font-weight: 400;">Totale raccolto: ${collected.toLocaleString()} kg (${collectedQt} qt)</span>
          </div>
          <div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; background: rgba(9, 15, 29, 0.9); padding: 4px;">
            ${movesHtml}
          </div>
        </td>
      </tr>
      ` : ''}
    `;
  });

  tableWrap.innerHTML = `
    <table class="opt-table" style="font-size: 12px;">
      <thead>
        <tr style="background: rgba(56, 189, 248, 0.12);">
          <th>Compattatore</th>
          <th>Stato</th>
          <th>Rifiuti Caricati</th>
          <th>Saturazione Portata</th>
          <th>Tratte Servite</th>
          <th>Transiti a Vuoto</th>
          <th>Costo Fisso + Op.</th>
          <th>Totale Mezzo</th>
          <th style="text-align: center;">Foglio di Marcia</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  container.appendChild(tableWrap);
}

// ==========================================
// 6. MODELLO EV-VRP & WCVRPTW-IF (SCARICHI INTERMEDI & FLOTTE ELETTRICHE)
// ==========================================
async function loadEvConfig() {
  if (!State.evConfig) {
    try {
      const res = await fetch('/api/ev_vrp/config');
      if (res.ok) {
        State.evConfig = await res.json();
        if (State.evConfig && State.evConfig.vehicles) {
          State.evConfig.vehicles.forEach(v => {
            if (v.kwh_cost === undefined || v.kwh_cost === null) v.kwh_cost = State.evConfig.kwh_cost || 0.38;
            if (v.kwh_per_km === undefined || v.kwh_per_km === null) v.kwh_per_km = State.evConfig.kwh_per_km || 0.45;
          });
        }
      }
    } catch (e) {
      console.error('Errore caricamento EV-VRP:', e);
    }
  }
  if (!State.evConfig) {
    State.evConfig = {
      name: 'EV-VRP Flotta',
      depot: { name: 'Hub Flotta EV', lat: 45.4642, lon: 9.1900 },
      kwh_cost: 0.28,
      kwh_per_km: 0.35,
      customers: [],
      intermediate_facilities: [],
      vehicles: []
    };
  }
  if (!State.hasImportedConfigFile && typeof syncWizardFleetToModels === 'function') {
    syncWizardFleetToModels();
  }
  renderEvTables();
  renderLeafletRouteMap('evMap', 'ev', State.evConfig, State.evResult || null);
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
}

function renderEvTables() {
  if (!State.evConfig) return;

  // 0. Deposito EV
  const dep = State.evConfig.depot;
  const nameInp = document.getElementById('evDepotName');
  const latInp = document.getElementById('evDepotLat');
  const lonInp = document.getElementById('evDepotLon');
  if (nameInp) nameInp.value = (dep && dep.name) ? dep.name : '';
  if (latInp) latInp.value = (dep && dep.lat !== null && dep.lat !== undefined && !isNaN(dep.lat) && dep.lat !== '') ? dep.lat : '';
  if (lonInp) lonInp.value = (dep && dep.lon !== null && dep.lon !== undefined && !isNaN(dep.lon) && dep.lon !== '') ? dep.lon : '';

  // Conteggio Clienti
  const countEl = document.getElementById('evCustomerCount');
  const custs = State.evConfig.customers || [];
  if (countEl) {
    countEl.innerText = `${custs.length} clienti / punti`;
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
  if (cBody) {
    cBody.innerHTML = '';
    if (custs.length === 0) {
      cBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px;">Nessun cliente presente. Clicca su <b>+ Nuovo Cliente</b> per inserire destinazioni.</td></tr>';
    } else {
      custs.forEach((c, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${c.name || ''}"
              onchange="updateEvCustomerField(${idx}, 'name', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${c.lat != null ? c.lat : ''}"
              onchange="updateEvCustomerCoord(${idx}, 'lat', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${c.lon != null ? c.lon : ''}"
              onchange="updateEvCustomerCoord(${idx}, 'lon', this.value)">
          </td>
          <td>
            <input type="number" class="cell-inp" style="width: 80px;" min="10" step="50" value="${c.demand || ''}"
              onchange="updateEvCustomerDemand(${idx}, this.value)">
          </td>
          <td style="text-align: center;">
            <button class="btn-danger-outline" title="Rimuovi cliente" onclick="removeEvCustomer(${idx})">&times;</button>
          </td>
        `;
        cBody.appendChild(tr);
      });
    }
  }

  // 2. Tabella Impianti Intermedi con Coordinate Modificabili
  const fBody = document.getElementById('evFacilitiesBody');
  if (fBody) {
    fBody.innerHTML = '';
    const facs = State.evConfig.intermediate_facilities || [];
    if (facs.length === 0) {
      fBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 14px;">Nessun impianto intermedio configurato. Clicca su <b>+ Impianto</b> per aggiungerne uno.</td></tr>';
    } else {
      facs.forEach((f, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${f.name || ''}"
              onchange="updateEvFacilityField(${idx}, 'name', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${f.lat != null ? f.lat : ''}"
              onchange="updateEvFacilityCoord(${idx}, 'lat', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${f.lon != null ? f.lon : ''}"
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
  }

  // 3. Tabella Flotta Veicoli EV
  const vBody = document.getElementById('evVehiclesBody');
  if (vBody && State.evConfig.vehicles) {
    vBody.innerHTML = '';
    State.evConfig.vehicles.forEach((v, idx) => {
      const vKwhCost = (v.kwh_cost !== undefined && v.kwh_cost !== null) ? v.kwh_cost : (State.evConfig.kwh_cost || 0.38);
      const vKwhPerKm = (v.kwh_per_km !== undefined && v.kwh_per_km !== null) ? v.kwh_per_km : (State.evConfig.kwh_per_km || 0.45);
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
          <input type="number" class="cell-inp" min="0.05" step="0.02" value="${vKwhCost}"
            onchange="updateEvVehicleKwhCost(${idx}, this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" min="0.05" step="0.05" value="${vKwhPerKm}"
            onchange="updateEvVehicleKwhPerKm(${idx}, this.value)">
        </td>
        <td style="text-align: center;">
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
  if (!State.evConfig) return;
  if (!State.evConfig.depot) State.evConfig.depot = {};
  if (field === 'lat' || field === 'lon') {
    const num = parseFloat(val);
    State.evConfig.depot[field] = isNaN(num) ? null : num;
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
  const num = parseFloat(val);
  State.evConfig.customers[idx][coord] = isNaN(num) ? null : num;
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
}

function updateEvFacilityField(idx, field, val) {
  if (!State.evConfig || !State.evConfig.intermediate_facilities || !State.evConfig.intermediate_facilities[idx]) return;
  State.evConfig.intermediate_facilities[idx][field] = val;
  drawEvCanvas('evCanvas', State.evConfig, State.evResult || null);
}

function updateEvFacilityCoord(idx, coord, val) {
  if (!State.evConfig || !State.evConfig.intermediate_facilities || !State.evConfig.intermediate_facilities[idx]) return;
  const num = parseFloat(val);
  State.evConfig.intermediate_facilities[idx][coord] = isNaN(num) ? null : num;
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

function updateEvVehicleKwhCost(idx, val) {
  if (State.evConfig && State.evConfig.vehicles && State.evConfig.vehicles[idx]) {
    State.evConfig.vehicles[idx].kwh_cost = parseFloat(val) || 0.38;
  }
}

function updateEvVehicleKwhPerKm(idx, val) {
  if (State.evConfig && State.evConfig.vehicles && State.evConfig.vehicles[idx]) {
    State.evConfig.vehicles[idx].kwh_per_km = parseFloat(val) || 0.45;
  }
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
  const baseLat = (dep && typeof dep.lat === 'number' && !isNaN(dep.lat) && dep.lat !== null) ? dep.lat : 45.4642;
  const baseLon = (dep && typeof dep.lon === 'number' && !isNaN(dep.lon) && dep.lon !== null) ? dep.lon : 9.1900;
  const offsetLat = (Math.random() - 0.5) * 0.14;
  const offsetLon = (Math.random() - 0.5) * 0.20;

  if (!State.evConfig.customers) State.evConfig.customers = [];
  const newId = State.evConfig.customers.length + 10;
  State.evConfig.customers.push({
    id: newId,
    name: name,
    lat: Number((baseLat + offsetLat).toFixed(4)),
    lon: Number((baseLon + offsetLon).toFixed(4)),
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
  const baseLat = (dep && typeof dep.lat === 'number' && !isNaN(dep.lat) && dep.lat !== null) ? dep.lat : 45.4642;
  const baseLon = (dep && typeof dep.lon === 'number' && !isNaN(dep.lon) && dep.lon !== null) ? dep.lon : 9.1900;
  const offsetLat = (Math.random() - 0.5) * 0.10;
  const offsetLon = (Math.random() - 0.5) * 0.12;

  if (!State.evConfig.intermediate_facilities) State.evConfig.intermediate_facilities = [];
  const newId = (State.evConfig.intermediate_facilities || []).length + 100;
  State.evConfig.intermediate_facilities.push({
    id: newId,
    name: name,
    type: 'recharge',
    lat: Number((baseLat + offsetLat).toFixed(4)),
    lon: Number((baseLon + offsetLon).toFixed(4))
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
    kwh_cost: State.evConfig.kwh_cost || 0.38,
    kwh_per_km: State.evConfig.kwh_per_km || 0.45,
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
      kwh_cost: State.evConfig.kwh_cost || 0.38,
      kwh_per_km: State.evConfig.kwh_per_km || 0.45,
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
  if (!State.evConfig || !State.evConfig.customers || State.evConfig.customers.length === 0) {
    showToast('⚠️ Inserisci almeno un cliente per ottimizzare il modello EV-VRP!', 4000);
    return;
  }
  const depotLat = parseFloat(State.evConfig.depot?.lat);
  const depotLon = parseFloat(State.evConfig.depot?.lon);
  if (isNaN(depotLat) || isNaN(depotLon)) {
    showToast('⚠️ Inserisci le coordinate del deposito principale (Latitudine e Longitudine)!', 4000);
    return;
  }
  if (!State.evConfig.vehicles || State.evConfig.vehicles.length === 0) {
    showToast('⚠️ Aggiungi almeno un veicolo elettrico alla flotta!', 4000);
    return;
  }

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
        Energia: <b>${vInfo.kwh_used} kWh</b> (${vInfo.total_km} km percorsi) | 
        Parametri Mezzo: <b>${(vInfo.kwh_per_km !== undefined ? vInfo.kwh_per_km : 0.45)} kWh/km</b> (${(vInfo.kwh_cost !== undefined ? vInfo.kwh_cost : 0.38)} €/kWh)
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
  if (!State.vrppdConfig) {
    try {
      const res = await fetch('/api/vrppd/config');
      if (res.ok) State.vrppdConfig = await res.json();
    } catch (e) {
      console.error('Errore caricamento VRPPD:', e);
      showToast('Errore nel caricamento della configurazione VRPPD');
    }
  }
  if (!State.vrppdConfig) {
    State.vrppdConfig = {
      depot: { id: 'DEPOT', name: 'Hub Smistamento (Treviso Nord)', lat: 45.68, lon: 12.24 },
      cost_per_km: 1.25,
      requests: [],
      vehicles: []
    };
  }
  if (!State.hasImportedConfigFile && typeof syncWizardFleetToModels === 'function') {
    syncWizardFleetToModels();
  }
  renderVrppdTables();
  renderLeafletRouteMap('vrppdMap', 'vrppd', State.vrppdConfig, State.vrppdResult || null);
  drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, State.vrppdResult || null);
}

function renderVrppdTables() {
  if (!State.vrppdConfig) return;

  // 0. Deposito VRPPD
  const dep = State.vrppdConfig.depot;
  if (dep) {
    const nameInp = document.getElementById('vrppdDepotName');
    const latInp = document.getElementById('vrppdDepotLat');
    const lonInp = document.getElementById('vrppdDepotLon');
    if (nameInp) nameInp.value = dep.name || '';
    if (latInp) latInp.value = (dep.lat !== undefined && dep.lat !== null) ? dep.lat : '';
    if (lonInp) lonInp.value = (dep.lon !== undefined && dep.lon !== null) ? dep.lon : '';
  }

  // 1. Tabella Richieste Accoppiate (P & D) con Coordinate Modificabili
  const reqBody = document.getElementById('vrppdRequestsBody');
  if (reqBody) {
    reqBody.innerHTML = '';
    const reqs = State.vrppdConfig.requests || [];
    const countEl = document.getElementById('vrppdReqCount');
    if (countEl) countEl.innerText = `${reqs.length} richieste`;

    if (reqs.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="5" style="text-align: center; padding: 22px 10px; color: var(--text-muted); font-style: italic;">
          Nessuna spedizione registrata. Clicca su "+ Aggiungi Richiesta (P&D)" per inserire mittente e destinatario o importa un file.
        </td>
      `;
      reqBody.appendChild(tr);
    } else {
      reqs.forEach((r, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${r.name || ''}" placeholder="Spedizione" onchange="updateVrppdRequest(${idx}, 'name', this.value)">
            <small style="color: var(--text-muted); font-size: 11px;">ID: ${r.id}</small>
          </td>
          <td>
            <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="1" max="10000" step="10" value="${r.demand_kg || 10}" onchange="updateVrppdRequest(${idx}, 'demand_kg', parseFloat(this.value)||10)">
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <input type="text" class="cell-inp" style="width: 100%; font-size: 11.5px; font-weight:600; color:#34d399;" value="${r.pickup.name || ''}" placeholder="Nome Ritiro" onchange="updateVrppdPoint(${idx}, 'pickup', 'name', this.value)">
              <div style="display: flex; gap: 4px; font-size: 11px;">
                <span>Lat: <input type="number" step="0.0001" class="cell-inp" style="width: 72px;" value="${(r.pickup.lat !== undefined && r.pickup.lat !== null) ? r.pickup.lat : ''}" placeholder="Lat" onchange="updateVrppdPoint(${idx}, 'pickup', 'lat', this.value)"></span>
                <span>Lon: <input type="number" step="0.0001" class="cell-inp" style="width: 72px;" value="${(r.pickup.lon !== undefined && r.pickup.lon !== null) ? r.pickup.lon : ''}" placeholder="Lon" onchange="updateVrppdPoint(${idx}, 'pickup', 'lon', this.value)"></span>
              </div>
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <input type="text" class="cell-inp" style="width: 100%; font-size: 11.5px; font-weight:600; color:#fb923c;" value="${r.delivery.name || ''}" placeholder="Nome Consegna" onchange="updateVrppdPoint(${idx}, 'delivery', 'name', this.value)">
              <div style="display: flex; gap: 4px; font-size: 11px;">
                <span>Lat: <input type="number" step="0.0001" class="cell-inp" style="width: 72px;" value="${(r.delivery.lat !== undefined && r.delivery.lat !== null) ? r.delivery.lat : ''}" placeholder="Lat" onchange="updateVrppdPoint(${idx}, 'delivery', 'lat', this.value)"></span>
                <span>Lon: <input type="number" step="0.0001" class="cell-inp" style="width: 72px;" value="${(r.delivery.lon !== undefined && r.delivery.lon !== null) ? r.delivery.lon : ''}" placeholder="Lon" onchange="updateVrppdPoint(${idx}, 'delivery', 'lon', this.value)"></span>
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
  }

  // 2. Tabella Veicoli VRPPD
  const vehBody = document.getElementById('vrppdVehiclesBody');
  if (vehBody) {
    vehBody.innerHTML = '';
    const vehs = State.vrppdConfig.vehicles || [];

    vehs.forEach((v, idx) => {
      const kmCost = (v.cost_per_km !== undefined && v.cost_per_km !== null) ? v.cost_per_km : (State.vrppdConfig.cost_per_km || 1.25);
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
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0.1" max="10" step="0.05" value="${kmCost}" onchange="updateVrppdVehicle(${idx}, 'cost_per_km', parseFloat(this.value)||1.25)">
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
      cost_per_km: State.vrppdConfig.cost_per_km || 1.25,
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
  if (!State.vrppdConfig) return;
  if (!State.vrppdConfig.depot) State.vrppdConfig.depot = { id: 'DEPOT', name: '', lat: null, lon: null };
  if (field === 'lat' || field === 'lon') {
    const num = parseFloat(val);
    State.vrppdConfig.depot[field] = isNaN(num) ? null : num;
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
    const num = parseFloat(val);
    pt[field] = isNaN(num) ? null : num;
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
  State.vrppdConfig.requests.splice(idx, 1);
  renderVrppdTables();
  drawVrppdCanvas('vrppdCanvas', State.vrppdConfig, State.vrppdResult || null);
  showToast('Richiesta VRPPD rimossa');
}

function addVrppdRequestRow() {
  if (!State.vrppdConfig) return;
  if (!State.vrppdConfig.requests) State.vrppdConfig.requests = [];
  const dep = State.vrppdConfig.depot || {};
  const baseLat = (typeof dep.lat === 'number' && !isNaN(dep.lat) && dep.lat !== null) ? dep.lat : 45.4642;
  const baseLon = (typeof dep.lon === 'number' && !isNaN(dep.lon) && dep.lon !== null) ? dep.lon : 9.1900;
  const num = State.vrppdConfig.requests.length + 1;

  const pLat = Number((baseLat + (Math.random() - 0.5) * 0.08).toFixed(4));
  const pLon = Number((baseLon + (Math.random() - 0.5) * 0.10).toFixed(4));
  const dLat = Number((baseLat + (Math.random() - 0.5) * 0.08).toFixed(4));
  const dLon = Number((baseLon + (Math.random() - 0.5) * 0.10).toFixed(4));

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
    cost_per_km: State.vrppdConfig.cost_per_km || 1.25,
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
  if (!State.vrppdConfig || !State.vrppdConfig.requests || State.vrppdConfig.requests.length === 0) {
    showToast('⚠️ Inserisci almeno una richiesta di trasporto (Ritiro e Consegna)!', 4000);
    return;
  }
  const depotLat = parseFloat(State.vrppdConfig.depot?.lat);
  const depotLon = parseFloat(State.vrppdConfig.depot?.lon);
  if (isNaN(depotLat) || isNaN(depotLon)) {
    showToast('⚠️ Inserisci le coordinate del deposito VRPPD (Latitudine e Longitudine)!', 4000);
    return;
  }
  if (!State.vrppdConfig.vehicles || State.vrppdConfig.vehicles.length === 0) {
    showToast('⚠️ Aggiungi almeno un veicolo alla flotta VRPPD!', 4000);
    return;
  }

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
  const pts = [];
  if (config.depot && typeof config.depot.lat === 'number' && !isNaN(config.depot.lat) && config.depot.lat !== null) pts.push(config.depot);
  (config.requests || []).forEach(r => {
    if (r.pickup && typeof r.pickup.lat === 'number' && !isNaN(r.pickup.lat) && r.pickup.lat !== null) pts.push(r.pickup);
    if (r.delivery && typeof r.delivery.lat === 'number' && !isNaN(r.delivery.lat) && r.delivery.lat !== null) pts.push(r.delivery);
  });

  if (pts.length === 0) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillRect(20, 14, w - 40, 28);
    ctx.strokeRect(20, 14, w - 40, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nessuna coordinata impostata. Inserisci il deposito e le richieste (P&D) per visualizzarle.', w / 2, 32);
    ctx.textAlign = 'left';
    return;
  }

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
  if (!State.mdvrpConfig) {
    try {
      const res = await fetch('/api/mdvrp/config');
      if (res.ok) State.mdvrpConfig = await res.json();
    } catch (e) {
      console.error('Errore caricamento MDVRP:', e);
      showToast('Errore nel caricamento della configurazione MDVRP');
    }
  }
  if (!State.mdvrpConfig) {
    State.mdvrpConfig = {
      name: 'MDVRP Flotta Personalizzata',
      cost_per_km: 1.20,
      depots: [],
      customers: [],
      vehicles: []
    };
  }
  if (!State.hasImportedConfigFile && typeof syncWizardFleetToModels === 'function') {
    syncWizardFleetToModels();
  }
  renderMdvrpTables();
  renderLeafletRouteMap('mdvrpMap', 'mdvrp', State.mdvrpConfig, State.mdvrpResult || null);
  drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
}

function renderMdvrpTables() {
  if (!State.mdvrpConfig) return;

  // 1. Tabella Depositi
  const depBody = document.getElementById('mdvrpDepotsBody');
  if (depBody) {
    depBody.innerHTML = '';
    const deps = State.mdvrpConfig.depots || [];

    if (deps.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="5" style="text-align: center; padding: 20px 10px; color: var(--text-muted); font-style: italic;">
          Nessun deposito impostato. Clicca su "+ Aggiungi Deposito" o importa un file per iniziare.
        </td>
      `;
      depBody.appendChild(tr);
    } else {
      deps.forEach((d, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${d.name || ''}" placeholder="Nome Deposito" onchange="updateMdvrpDepot(${idx}, 'name', this.value)">
            <small style="color: var(--text-muted); font-size: 11px;">ID: ${d.id}</small>
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${(d.lat !== undefined && d.lat !== null) ? d.lat : ''}" placeholder="Lat" onchange="updateMdvrpDepotCoord(${idx}, 'lat', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${(d.lon !== undefined && d.lon !== null) ? d.lon : ''}" placeholder="Lon" onchange="updateMdvrpDepotCoord(${idx}, 'lon', this.value)">
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
  }

  // 2. Tabella Clienti
  const custBody = document.getElementById('mdvrpCustomersBody');
  if (custBody) {
    custBody.innerHTML = '';
    const custs = State.mdvrpConfig.customers || [];

    if (custs.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="5" style="text-align: center; padding: 20px 10px; color: var(--text-muted); font-style: italic;">
          Nessun cliente inserito. Clicca su "+ Aggiungi Cliente" o importa un file per iniziare.
        </td>
      `;
      custBody.appendChild(tr);
    } else {
      custs.forEach((c, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${c.name || ''}" placeholder="Nome Cliente" onchange="updateMdvrpCustomer(${idx}, 'name', this.value)">
            <small style="color: var(--text-muted); font-size: 11px;">ID: ${c.id}</small>
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${(c.lat !== undefined && c.lat !== null) ? c.lat : ''}" placeholder="Lat" onchange="updateMdvrpCustomerCoord(${idx}, 'lat', this.value)">
          </td>
          <td>
            <input type="number" step="0.0001" class="cell-inp" style="width: 78px;" value="${(c.lon !== undefined && c.lon !== null) ? c.lon : ''}" placeholder="Lon" onchange="updateMdvrpCustomerCoord(${idx}, 'lon', this.value)">
          </td>
          <td>
            <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="10" max="20000" step="50" value="${c.demand || 0}" onchange="updateMdvrpCustomer(${idx}, 'demand', parseFloat(this.value)||100)">
          </td>
          <td style="text-align: center;">
            <button class="btn-del" onclick="removeMdvrpCustomer(${idx})" title="Rimuovi cliente">✕</button>
          </td>
        `;
        custBody.appendChild(tr);
      });
    }
  }

  // 3. Tabella Veicoli con selettore Home Depot
  const vehBody = document.getElementById('mdvrpVehiclesBody');
  if (vehBody) {
    vehBody.innerHTML = '';
    const vehs = State.mdvrpConfig.vehicles || [];
    const deps = State.mdvrpConfig.depots || [];

    vehs.forEach((v, idx) => {
      let depotOptions = '<option value="">-- Seleziona Deposito --</option>';
      deps.forEach(d => {
        depotOptions += `<option value="${d.id}" ${v.home_depot === d.id ? 'selected' : ''}>${d.name || d.id}</option>`;
      });

      const kmCost = (v.cost_per_km !== undefined && v.cost_per_km !== null) ? v.cost_per_km : (State.mdvrpConfig.cost_per_km || 1.20);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${v.name || ''}" onchange="updateMdvrpVehicle(${idx}, 'name', this.value)">
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
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0.1" max="10" step="0.05" value="${kmCost}" onchange="updateMdvrpVehicle(${idx}, 'cost_per_km', parseFloat(this.value)||1.20)">
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
      fixed_cost: 80.0,
      cost_per_km: State.mdvrpConfig.cost_per_km || 1.20
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
    State.mdvrpConfig.depots[idx][coord] = isNaN(num) ? null : num;
    drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  }
}

function removeMdvrpDepot(idx) {
  if (!State.mdvrpConfig || !State.mdvrpConfig.depots) return;
  const removedId = State.mdvrpConfig.depots[idx].id;
  State.mdvrpConfig.depots.splice(idx, 1);

  // Se qualche veicolo aveva questo home_depot, riassegnalo al primo disponibile o vuoto
  const fallback = State.mdvrpConfig.depots.length > 0 ? State.mdvrpConfig.depots[0].id : '';
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
  const firstDep = State.mdvrpConfig.depots.find(d => typeof d.lat === 'number' && !isNaN(d.lat) && d.lat !== null);
  const baseLat = firstDep ? firstDep.lat : 45.4642;
  const baseLon = firstDep ? firstDep.lon : 9.1900;

  const newDepId = `DEP_${num}`;
  State.mdvrpConfig.depots.push({
    id: newDepId,
    name: `Magazzino Hub ${num}`,
    lat: Number((baseLat + (Math.random() - 0.5) * 0.15).toFixed(4)),
    lon: Number((baseLon + (Math.random() - 0.5) * 0.18).toFixed(4)),
    color: colors[(num - 1) % colors.length]
  });

  // Se ci sono veicoli senza deposito, assegna questo nuovo deposito
  (State.mdvrpConfig.vehicles || []).forEach(v => {
    if (!v.home_depot) v.home_depot = newDepId;
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
    State.mdvrpConfig.customers[idx][coord] = isNaN(num) ? null : num;
    drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  }
}

function removeMdvrpCustomer(idx) {
  if (!State.mdvrpConfig || !State.mdvrpConfig.customers) return;
  State.mdvrpConfig.customers.splice(idx, 1);
  renderMdvrpTables();
  drawMdvrpCanvas('mdvrpCanvas', State.mdvrpConfig, State.mdvrpResult || null);
  showToast('Cliente MDVRP rimosso');
}

function addMdvrpCustomerRow() {
  if (!State.mdvrpConfig) return;
  if (!State.mdvrpConfig.customers) State.mdvrpConfig.customers = [];
  const num = State.mdvrpConfig.customers.length + 1;
  const firstDep = (State.mdvrpConfig.depots || []).find(d => typeof d.lat === 'number' && !isNaN(d.lat) && d.lat !== null);
  const baseLat = firstDep ? firstDep.lat : 45.4642;
  const baseLon = firstDep ? firstDep.lon : 9.1900;

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
  State.mdvrpConfig.vehicles.splice(idx, 1);
  renderMdvrpTables();
  showToast('Veicolo MDVRP rimosso');
}

function addMdvrpVehicleRow() {
  if (!State.mdvrpConfig) return;
  if (!State.mdvrpConfig.vehicles) State.mdvrpConfig.vehicles = [];
  const nextNum = State.mdvrpConfig.vehicles.length + 1;
  const defaultDep = (State.mdvrpConfig.depots && State.mdvrpConfig.depots[0]) ? State.mdvrpConfig.depots[0].id : '';

  State.mdvrpConfig.vehicles.push({
    name: `Camion_MD_${nextNum}`,
    home_depot: defaultDep,
    capacity: 2500.0,
    fixed_cost: 80.0,
    cost_per_km: State.mdvrpConfig.cost_per_km || 1.20
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
  if (!State.mdvrpConfig || !State.mdvrpConfig.depots || State.mdvrpConfig.depots.length === 0) {
    showToast('⚠️ Inserisci almeno un deposito base per il modello MDVRP!', 4000);
    return;
  }
  const hasValidDepot = State.mdvrpConfig.depots.some(d => typeof d.lat === 'number' && !isNaN(d.lat) && d.lat !== null && typeof d.lon === 'number' && !isNaN(d.lon) && d.lon !== null);
  if (!hasValidDepot) {
    showToast('⚠️ Inserisci le coordinate valide (Lat/Lon) per almeno un deposito!', 4000);
    return;
  }
  if (!State.mdvrpConfig.customers || State.mdvrpConfig.customers.length === 0) {
    showToast('⚠️ Inserisci almeno un cliente per ottimizzare il modello MDVRP!', 4000);
    return;
  }
  if (!State.mdvrpConfig.vehicles || State.mdvrpConfig.vehicles.length === 0) {
    showToast('⚠️ Aggiungi almeno un veicolo alla flotta MDVRP!', 4000);
    return;
  }

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

  const pts = [];
  (config.depots || []).forEach(d => {
    if (typeof d.lat === 'number' && !isNaN(d.lat) && d.lat !== null) pts.push(d);
  });
  (config.customers || []).forEach(c => {
    if (typeof c.lat === 'number' && !isNaN(c.lat) && c.lat !== null) pts.push(c);
  });

  if (pts.length === 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(w / 2 - 230, 16, 460, 32);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.strokeRect(w / 2 - 230, 16, 460, 32);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nessuna coordinata impostata. Inserisci i depositi e i clienti per visualizzarli.', w / 2, 36);
    ctx.restore();
    return;
  }

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
// 8. MODELLO PCARP: RACCOLTA SETTIMANALE DIFFERENZIATA
// ==========================================
async function loadPcarpConfig() {
  try {
    const res = await fetch('/api/pcarp/config');
    if (!res.ok) throw new Error('Errore caricamento config PCARP: ' + res.statusText);
    const data = await res.json();
    State.pcarpConfig = data;

    // Sincronizza flotta dal wizard se configurata
    if (!State.hasImportedConfigFile && typeof syncWizardFleetToModels === 'function') {
      syncWizardFleetToModels();
    }

    renderPcarpTables();
    drawPcarpCanvas('pcarpCanvas', State.pcarpConfig, State.pcarpResult || null);
  } catch (err) {
    console.error('Errore loadPcarpConfig:', err);
  }
}

function renderPcarpTables() {
  if (!State.pcarpConfig) return;

  // 1. Tabella Veicoli PCARP
  const vehTbody = document.getElementById('pcarpVehiclesBody');
  if (vehTbody) {
    vehTbody.innerHTML = '';
    (State.pcarpConfig.vehicles || []).forEach((v, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${v.name || 'Compattatore ' + (idx+1)}" onchange="updatePcarpVehicle(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="100" max="50000" step="100" value="${v.capacity_kg || v.capacity || 4000}" onchange="updatePcarpVehicle(${idx}, 'capacity_kg', parseFloat(this.value)||4000)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0" max="1000" step="5" value="${v.fixed_cost || 180}" onchange="updatePcarpVehicle(${idx}, 'fixed_cost', parseFloat(this.value)||0)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0.1" max="10" step="0.05" value="${v.cost_per_km || 1.25}" onchange="updatePcarpVehicle(${idx}, 'cost_per_km', parseFloat(this.value)||1.25)">
        </td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" style="padding: 2px 7px; color: #ef4444;" onclick="removePcarpVehicle(${idx})">✕</button>
        </td>
      `;
      vehTbody.appendChild(tr);
    });
  }

  // 2. Tabella Stradario Settimanale PCARP
  const strTbody = document.getElementById('pcarpStreetsBody');
  if (strTbody) {
    strTbody.innerHTML = '';
    const daysList = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const dayShort = { 'Lunedì': 'Lun', 'Martedì': 'Mar', 'Mercoledì': 'Mer', 'Giovedì': 'Gio', 'Venerdì': 'Ven', 'Sabato': 'Sab' };
    
    (State.pcarpConfig.streets || []).forEach((s, idx) => {
      const tr = document.createElement('tr');
      const curDays = s.days || [];

      let pillsHtml = `<div style="display: flex; gap: 4px; flex-wrap: wrap;">`;
      daysList.forEach(d => {
        const isSelected = curDays.includes(d);
        pillsHtml += `
          <button type="button" class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}" 
            style="padding: 2px 6px; font-size: 11px; border-radius: 4px;"
            onclick="togglePcarpStreetDay(${idx}, '${d}')">${dayShort[d]}</button>
        `;
      });
      pillsHtml += `</div>`;

      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 500;" value="${s.name || 'Via ' + s.id}" onchange="updatePcarpStreet(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0.1" max="50" step="0.1" value="${s.length_km || 1.0}" onchange="updatePcarpStreet(${idx}, 'length_km', parseFloat(this.value)||1.0)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="10" max="20000" step="50" value="${s.demand_kg || 500}" onchange="updatePcarpStreet(${idx}, 'demand_kg', parseFloat(this.value)||500)">
        </td>
        <td>
          ${pillsHtml}
        </td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" style="padding: 2px 7px; color: #ef4444;" onclick="removePcarpStreet(${idx})">✕</button>
        </td>
      `;
      strTbody.appendChild(tr);
    });
  }
}

function updatePcarpVehicle(idx, field, val) {
  if (!State.pcarpConfig || !State.pcarpConfig.vehicles[idx]) return;
  State.pcarpConfig.vehicles[idx][field] = val;
  savePcarpConfigToServer();
}

function addPcarpVehicleRow() {
  if (!State.pcarpConfig) return;
  const count = (State.pcarpConfig.vehicles || []).length + 1;
  State.pcarpConfig.vehicles.push({
    name: `Compattatore_${count}`,
    capacity_kg: 4500,
    fixed_cost: 189.0,
    cost_per_km: 1.25,
    description: 'Compattatore 2 Assi'
  });
  renderPcarpTables();
  savePcarpConfigToServer();
}

function removePcarpVehicle(idx) {
  if (!State.pcarpConfig || !State.pcarpConfig.vehicles) return;
  if (State.pcarpConfig.vehicles.length <= 1) {
    alert('Devi mantenere almeno un compattatore nella flotta!');
    return;
  }
  State.pcarpConfig.vehicles.splice(idx, 1);
  renderPcarpTables();
  savePcarpConfigToServer();
}

function updatePcarpStreet(idx, field, val) {
  if (!State.pcarpConfig || !State.pcarpConfig.streets[idx]) return;
  State.pcarpConfig.streets[idx][field] = val;
  savePcarpConfigToServer();
  drawPcarpCanvas('pcarpCanvas', State.pcarpConfig, State.pcarpResult || null);
}

function togglePcarpStreetDay(idx, dayName) {
  if (!State.pcarpConfig || !State.pcarpConfig.streets[idx]) return;
  const s = State.pcarpConfig.streets[idx];
  if (!s.days) s.days = [];
  const pos = s.days.indexOf(dayName);
  if (pos >= 0) {
    s.days.splice(pos, 1);
  } else {
    s.days.push(dayName);
  }
  renderPcarpTables();
  savePcarpConfigToServer();
}

function addPcarpStreetRow() {
  if (!State.pcarpConfig) return;
  const count = (State.pcarpConfig.streets || []).length + 1;
  const depLat = (State.pcarpConfig.depot && State.pcarpConfig.depot.lat) || 45.667;
  const depLon = (State.pcarpConfig.depot && State.pcarpConfig.depot.lon) || 12.245;
  const offset = 0.005 * count;

  State.pcarpConfig.streets.push({
    id: count,
    name: `Nuova Via Settimanale ${count}`,
    lat1: depLat + offset,
    lon1: depLon + offset,
    lat2: depLat + offset + 0.003,
    lon2: depLon + offset + 0.003,
    length_km: 2.0,
    demand_kg: 1500,
    days: ['Lunedì', 'Giovedì']
  });
  renderPcarpTables();
  savePcarpConfigToServer();
  drawPcarpCanvas('pcarpCanvas', State.pcarpConfig, State.pcarpResult || null);
}

function removePcarpStreet(idx) {
  if (!State.pcarpConfig || !State.pcarpConfig.streets) return;
  State.pcarpConfig.streets.splice(idx, 1);
  renderPcarpTables();
  savePcarpConfigToServer();
  drawPcarpCanvas('pcarpCanvas', State.pcarpConfig, State.pcarpResult || null);
}

async function savePcarpConfigToServer() {
  if (!State.pcarpConfig) return;
  try {
    await fetch('/api/pcarp/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.pcarpConfig)
    });
  } catch (e) {
    console.warn('Errore salvataggio PCARP config:', e);
  }
}

function filterPcarpDay(day) {
  State.pcarpSelectedDay = day;

  // Aggiorna classi bottoni giorno
  document.querySelectorAll('.pcarp-day-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btnDayPcarp_${day}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Aggiorna badge mappa
  const badge = document.getElementById('pcarpMapBadge');
  if (badge) {
    badge.innerText = (day === 'ALL') ? 'Visualizzazione: Settimana Completa' : `Visualizzazione: ${day}`;
  }

  // Ridisegna mappa e report
  if (State.pcarpResult) {
    renderPcarpReport(State.pcarpResult);
  }
  drawPcarpCanvas('pcarpCanvas', State.pcarpConfig, State.pcarpResult || null);
}

async function solvePcarp() {
  const btn = document.getElementById('btnSolvePcarp');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ Calcolo Calendario Ottimo...';
  }

  try {
    const payload = {
      selected_day: State.pcarpSelectedDay || 'ALL'
    };
    const res = await fetch('/api/pcarp/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Errore durante il calcolo PCARP: ' + res.statusText);
    const data = await res.json();
    State.pcarpResult = data;

    // Aggiornamento KPI Card
    const kmEl = document.getElementById('pcarpKpiKm');
    const costEl = document.getElementById('pcarpKpiCost');
    const loadEl = document.getElementById('pcarpKpiLoad');
    const avgEl = document.getElementById('pcarpKpiDailyAvg');

    if (kmEl) kmEl.innerText = `${(data.weekly_total_km || 0).toFixed(1)} km`;
    if (costEl) costEl.innerText = `${(data.weekly_total_cost || 0).toFixed(2)} €`;
    if (loadEl) loadEl.innerText = `${((data.weekly_total_demand || 0)).toLocaleString('it-IT')} kg`;
    if (avgEl) avgEl.innerText = `${((data.weekly_total_cost || 0) / 6).toFixed(2)} €/giorno`;

    renderPcarpReport(data);
    drawPcarpCanvas('pcarpCanvas', State.pcarpConfig, data);
    showToast(`✅ Calendario PCARP calcolato con successo! Costo settimanale: ${(data.weekly_total_cost || 0).toFixed(2)} €`);
  } catch (err) {
    alert('Errore risoluzione PCARP: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '⚡ Risolvi Calendario Settimanale PCARP';
    }
  }
}

async function resetPcarp() {
  if (!confirm('Ripristinare lo scenario predefinito per la raccolta settimanale PCARP?')) return;
  try {
    const res = await fetch('/api/pcarp/reset', { method: 'POST' });
    const data = await res.json();
    State.pcarpConfig = data;
    State.pcarpResult = null;
    State.pcarpSelectedDay = 'ALL';
    filterPcarpDay('ALL');
    renderPcarpTables();
    drawPcarpCanvas('pcarpCanvas', State.pcarpConfig, null);
    showToast('Scenario PCARP ripristinato ai valori di fabbrica!');
  } catch (e) {
    alert('Errore reset PCARP: ' + e.message);
  }
}

function renderPcarpReport(data) {
  const container = document.getElementById('pcarpReportList');
  if (!container) return;
  container.innerHTML = '';

  const dailySolutions = data.daily_solutions || {};
  const daysToShow = (State.pcarpSelectedDay && State.pcarpSelectedDay !== 'ALL')
    ? [State.pcarpSelectedDay]
    : Object.keys(dailySolutions);

  if (daysToShow.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); font-size:12.5px;">Nessuna soluzione disponibile. Premi "⚡ Risolvi".</div>';
    return;
  }

  daysToShow.forEach(dayName => {
    const daySol = dailySolutions[dayName];
    if (!daySol) return;

    const dayCard = document.createElement('div');
    dayCard.style.cssText = 'background: #090f1d; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px;';

    let dayVehiclesHtml = '';
    const vehiclesObj = daySol.vehicles || {};
    const vehEntries = Object.entries(vehiclesObj);

    if (vehEntries.length === 0) {
      dayVehiclesHtml = '<div style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">Nessun servizio programmato per questo giorno (riposo).</div>';
    } else {
      vehEntries.forEach(([vName, vInfo]) => {
        if (!vInfo.used || !vInfo.streets_served || vInfo.streets_served.length === 0) return;

        let streetsHtml = '';
        vInfo.streets_served.forEach((st, sIdx) => {
          streetsHtml += `
            <div style="font-size: 11.5px; padding: 3px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
              <span><b style="color: #38bdf8;">${sIdx + 1}.</b> ${st.name}</span>
              <span style="color: var(--text-secondary);">${st.demand_kg} kg | ${st.length_km} km</span>
            </div>
          `;
        });

        dayVehiclesHtml += `
          <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 10px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #34d399; font-size: 13px;">🚛 ${vName}</span>
              <span style="font-size: 12px; color: #f59e0b; font-weight: 600;">Carico: ${vInfo.total_load} / ${vInfo.capacity} kg (${vInfo.saturation_pct}%)</span>
            </div>
            <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
              <span>Tratte servite: <b>${vInfo.streets_served.length}</b></span>
              <span>Km percorsi: <b>${vInfo.total_km} km</b></span>
              <span>Costo turno: <b style="color: #34d399;">${vInfo.cost} €</b></span>
            </div>
            <div style="background: rgba(0,0,0,0.25); border-radius: 4px; padding: 4px 6px;">
              ${streetsHtml}
            </div>
          </div>
        `;
      });
    }

    dayCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
        <span style="font-weight: 800; font-size: 14px; color: #38bdf8;">📅 ${dayName}</span>
        <span style="font-size: 12px; color: var(--text-secondary);">
          ${daySol.streets_count} vie | <b>${daySol.total_demand_kg} kg</b> | <b>${daySol.total_km} km</b> | <b style="color: #34d399;">${daySol.cost} €</b>
        </span>
      </div>
      ${dayVehiclesHtml}
    `;

    container.appendChild(dayCard);
  });
}

function drawPcarpCanvas(canvasId, config, solution) {
  if (window.L && document.getElementById('pcarpMap')) {
    renderLeafletRouteMap('pcarpMap', 'pcarp', config, solution);
    return;
  }
}

// ==========================================
// 9. MODELLO CARPTW: ARC ROUTING CON FINESTRE ORARIE E ZTL
// ==========================================
async function loadCarptwConfig() {
  try {
    const res = await fetch('/api/carptw/config');
    if (!res.ok) throw new Error('Errore caricamento config CARPTW: ' + res.statusText);
    const data = await res.json();
    State.carptwConfig = data;

    // Sincronizza flotta dal wizard se configurata
    if (!State.hasImportedConfigFile && typeof syncWizardFleetToModels === 'function') {
      syncWizardFleetToModels();
    }

    if (data.depot) {
      const startEl = document.getElementById('carptwShiftStart');
      const endEl = document.getElementById('carptwShiftEnd');
      if (startEl && data.depot.open_time) startEl.value = data.depot.open_time;
      if (endEl && data.depot.close_time) endEl.value = data.depot.close_time;
    }
    const speedEl = document.getElementById('carptwSpeed');
    if (speedEl && data.urban_speed_kmh) speedEl.value = data.urban_speed_kmh;

    renderCarptwTables();
    drawCarptwCanvas('carptwCanvas', State.carptwConfig, State.carptwResult || null);
  } catch (err) {
    console.error('Errore loadCarptwConfig:', err);
  }
}

function renderCarptwTables() {
  if (!State.carptwConfig) return;

  // 1. Tabella Veicoli CARPTW
  const vehTbody = document.getElementById('carptwVehiclesBody');
  if (vehTbody) {
    vehTbody.innerHTML = '';
    (State.carptwConfig.vehicles || []).forEach((v, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 600;" value="${v.name || 'Spazzatrice ' + (idx+1)}" onchange="updateCarptwVehicle(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="100" max="50000" step="100" value="${v.capacity_kg || v.capacity || 2500}" onchange="updateCarptwVehicle(${idx}, 'capacity_kg', parseFloat(this.value)||2500)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0" max="1000" step="5" value="${v.fixed_cost || 160}" onchange="updateCarptwVehicle(${idx}, 'fixed_cost', parseFloat(this.value)||0)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0.1" max="10" step="0.05" value="${v.cost_per_km || 1.15}" onchange="updateCarptwVehicle(${idx}, 'cost_per_km', parseFloat(this.value)||1.15)">
        </td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" style="padding: 2px 7px; color: #ef4444;" onclick="removeCarptwVehicle(${idx})">✕</button>
        </td>
      `;
      vehTbody.appendChild(tr);
    });
  }

  // 2. Tabella Strade con Finestre Orarie
  const strTbody = document.getElementById('carptwStreetsBody');
  if (strTbody) {
    strTbody.innerHTML = '';
    (State.carptwConfig.streets || []).forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-weight: 500;" value="${s.name || 'Via ' + s.id}" onchange="updateCarptwStreet(${idx}, 'name', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="0.1" max="50" step="0.1" value="${s.length_km || 1.0}" onchange="updateCarptwStreet(${idx}, 'length_km', parseFloat(this.value)||1.0)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: right;" min="10" max="20000" step="50" value="${s.demand_kg || 400}" onchange="updateCarptwStreet(${idx}, 'demand_kg', parseFloat(this.value)||400)">
        </td>
        <td>
          <input type="text" class="cell-inp" style="width: 100%; text-align: center; color: #34d399;" value="${s.ready_time || '06:00'}" onchange="updateCarptwStreet(${idx}, 'ready_time', this.value)">
        </td>
        <td>
          <input type="text" class="cell-inp" style="width: 100%; text-align: center; color: #f59e0b;" value="${s.due_time || '12:00'}" onchange="updateCarptwStreet(${idx}, 'due_time', this.value)">
        </td>
        <td>
          <input type="number" class="cell-inp" style="width: 100%; text-align: center;" min="1" max="180" step="1" value="${s.serv_min || 15}" onchange="updateCarptwStreet(${idx}, 'serv_min', parseFloat(this.value)||15)">
        </td>
        <td>
          <input type="text" class="cell-inp" style="width: 100%; font-size: 11px; color: var(--text-muted);" value="${s.reason || ''}" placeholder="es. ZTL / Mercato" onchange="updateCarptwStreet(${idx}, 'reason', this.value)">
        </td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" style="padding: 2px 7px; color: #ef4444;" onclick="removeCarptwStreet(${idx})">✕</button>
        </td>
      `;
      strTbody.appendChild(tr);
    });
  }
}

function updateCarptwDepotTimes() {
  if (!State.carptwConfig || !State.carptwConfig.depot) return;
  const startEl = document.getElementById('carptwShiftStart');
  const endEl = document.getElementById('carptwShiftEnd');
  if (startEl) State.carptwConfig.depot.open_time = startEl.value;
  if (endEl) State.carptwConfig.depot.close_time = endEl.value;
  saveCarptwConfigToServer();
}

function updateCarptwSpeed(val) {
  if (!State.carptwConfig) return;
  State.carptwConfig.urban_speed_kmh = parseFloat(val) || 25;
  saveCarptwConfigToServer();
}

function updateCarptwVehicle(idx, field, val) {
  if (!State.carptwConfig || !State.carptwConfig.vehicles[idx]) return;
  State.carptwConfig.vehicles[idx][field] = val;
  saveCarptwConfigToServer();
}

function addCarptwVehicleRow() {
  if (!State.carptwConfig) return;
  const count = (State.carptwConfig.vehicles || []).length + 1;
  State.carptwConfig.vehicles.push({
    name: `Mezzo_Compatibile_${count}`,
    capacity_kg: 3000,
    fixed_cost: 175.0,
    cost_per_km: 1.15,
    description: 'Veicolo compatibile ZTL'
  });
  renderCarptwTables();
  saveCarptwConfigToServer();
}

function removeCarptwVehicle(idx) {
  if (!State.carptwConfig || !State.carptwConfig.vehicles) return;
  if (State.carptwConfig.vehicles.length <= 1) {
    alert('Devi mantenere almeno un veicolo nella flotta!');
    return;
  }
  State.carptwConfig.vehicles.splice(idx, 1);
  renderCarptwTables();
  saveCarptwConfigToServer();
}

function updateCarptwStreet(idx, field, val) {
  if (!State.carptwConfig || !State.carptwConfig.streets[idx]) return;
  State.carptwConfig.streets[idx][field] = val;
  saveCarptwConfigToServer();
  drawCarptwCanvas('carptwCanvas', State.carptwConfig, State.carptwResult || null);
}

function addCarptwStreetRow() {
  if (!State.carptwConfig) return;
  const count = (State.carptwConfig.streets || []).length + 1;
  const depLat = (State.carptwConfig.depot && State.carptwConfig.depot.lat) || 45.464;
  const depLon = (State.carptwConfig.depot && State.carptwConfig.depot.lon) || 9.190;
  const offset = 0.005 * count;

  State.carptwConfig.streets.push({
    id: count,
    name: `Nuova Via Vincolo Orario ${count}`,
    lat1: depLat + offset,
    lon1: depLon + offset,
    lat2: depLat + offset + 0.003,
    lon2: depLon + offset + 0.003,
    length_km: 1.8,
    demand_kg: 700,
    ready_time: "07:30",
    due_time: "09:30",
    serv_min: 15,
    reason: "Fascia oraria ZTL / Consegne"
  });
  renderCarptwTables();
  saveCarptwConfigToServer();
  drawCarptwCanvas('carptwCanvas', State.carptwConfig, State.carptwResult || null);
}

function removeCarptwStreet(idx) {
  if (!State.carptwConfig || !State.carptwConfig.streets) return;
  State.carptwConfig.streets.splice(idx, 1);
  renderCarptwTables();
  saveCarptwConfigToServer();
  drawCarptwCanvas('carptwCanvas', State.carptwConfig, State.carptwResult || null);
}

async function saveCarptwConfigToServer() {
  if (!State.carptwConfig) return;
  try {
    await fetch('/api/carptw/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(State.carptwConfig)
    });
  } catch (e) {
    console.warn('Errore salvataggio CARPTW config:', e);
  }
}

async function solveCarptw() {
  const btn = document.getElementById('btnSolveCarptw');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '⏳ Calcolo Itinerari con Finestre Orarie...';
  }

  try {
    const res = await fetch('/api/carptw/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) throw new Error('Errore durante il calcolo CARPTW: ' + res.statusText);
    const data = await res.json();
    State.carptwResult = data;

    // Aggiornamento KPI Card
    const kmEl = document.getElementById('carptwKpiKm');
    const costEl = document.getElementById('carptwKpiCost');
    const waitEl = document.getElementById('carptwKpiWait');
    const compEl = document.getElementById('carptwKpiCompliance');

    if (kmEl) kmEl.innerText = `${(data.total_km || 0).toFixed(1)} km`;
    if (costEl) costEl.innerText = `${(data.total_cost || 0).toFixed(2)} €`;
    if (waitEl) waitEl.innerText = `${(data.total_wait_min || 0).toFixed(0)} min`;
    if (compEl) {
      const rate = data.compliance_rate !== undefined ? data.compliance_rate : 100;
      compEl.innerText = `${rate}%`;
      compEl.className = rate === 100 ? 'kpi-val green' : (rate >= 80 ? 'kpi-val amber' : 'kpi-val red');
    }

    renderCarptwReport(data);
    drawCarptwCanvas('carptwCanvas', State.carptwConfig, data);
    showToast(`✅ CARPTW ottimizzato! Rispetto finestre: ${data.compliance_rate || 100}%, Costo: ${(data.total_cost || 0).toFixed(2)} €`);
  } catch (err) {
    alert('Errore risoluzione CARPTW: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '⚡ Risolvi CARPTW con Finestre Orarie';
    }
  }
}

async function resetCarptw() {
  if (!confirm('Ripristinare lo scenario predefinito CARPTW con vincoli ZTL?')) return;
  try {
    const res = await fetch('/api/carptw/reset', { method: 'POST' });
    const data = await res.json();
    State.carptwConfig = data;
    State.carptwResult = null;
    renderCarptwTables();
    drawCarptwCanvas('carptwCanvas', State.carptwConfig, null);
    showToast('Scenario CARPTW ripristinato ai valori di fabbrica!');
  } catch (e) {
    alert('Errore reset CARPTW: ' + e.message);
  }
}

function renderCarptwReport(data) {
  const container = document.getElementById('carptwReportList');
  if (!container) return;
  container.innerHTML = '';

  const vehiclesObj = data.vehicles || {};
  const entries = Object.entries(vehiclesObj);

  if (entries.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); font-size:12.5px;">Nessuna pianificazione disponibile. Premi "⚡ Risolvi".</div>';
    return;
  }

  entries.forEach(([vName, vInfo]) => {
    if (!vInfo.used || !vInfo.stops || vInfo.stops.length < 2) return;

    const card = document.createElement('div');
    card.style.cssText = 'background: #090f1d; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px;';

    let timelineHtml = '';
    vInfo.stops.forEach(st => {
      if (st.type === 'depot') {
        timelineHtml += `
          <div style="font-size: 11.5px; padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; background: rgba(59,130,246,0.1); border-radius: 4px; margin-bottom: 2px;">
            <span>🏢 <b>${st.name}</b></span>
            <span style="color: #60a5fa; font-weight: 700;">Ore ${st.time}</span>
          </div>
        `;
      } else if (st.type === 'street') {
        const violBadge = st.violation
          ? `<span style="background: #ef4444; color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 700; margin-left: 6px;">RITARDO</span>`
          : `<span style="background: #10b981; color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 700; margin-left: 6px;">PUNTUALE</span>`;
        
        timelineHtml += `
          <div style="font-size: 11.5px; padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <b style="color: #fbbf24;">🛣️ ${st.name}</b> ${violBadge}
              <div style="color: var(--text-muted); font-size: 11px;">
                Finestra richiesta: ${st.window} | Durata servizio: ${st.service_min} min
                ${st.wait_min > 0 ? ` | <span style="color: #38bdf8;">Attesa: ${st.wait_min.toFixed(0)} min</span>` : ''}
              </div>
            </div>
            <div style="text-align: right; color: var(--text-secondary);">
              <div>Arr: <b>${st.arrival_time}</b> &rarr; Inizio: <b>${st.start_service}</b></div>
              <div style="font-size: 10.5px; color: #34d399;">Fine: <b>${st.end_service}</b></div>
            </div>
          </div>
        `;
      }
    });

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 13.5px; color: #34d399;">🚛 ${vName}</span>
        <span style="font-size: 12px; color: #f59e0b; font-weight: 600;">
          Carico: ${vInfo.total_load} / ${vInfo.capacity} kg (${vInfo.saturation_pct}%)
        </span>
      </div>
      <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); margin-bottom: 8px; flex-wrap: wrap;">
        <span>Km percorsi: <b>${vInfo.total_km} km</b></span>
        <span>Attese al cancello: <b>${vInfo.total_wait_min} min</b></span>
        <span>Violazioni orarie: <b style="color: ${(vInfo.violations_count ?? vInfo.violations ?? 0) > 0 ? '#ef4444' : '#34d399'};">${vInfo.violations_count ?? vInfo.violations ?? 0}</b></span>
        <span>Costo totale: <b style="color: #34d399;">${vInfo.cost} €</b></span>
      </div>
      <div style="background: rgba(0,0,0,0.25); border-radius: 4px; padding: 4px 6px;">
        ${timelineHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

function drawCarptwCanvas(canvasId, config, solution) {
  if (window.L && document.getElementById('carptwMap')) {
    renderLeafletRouteMap('carptwMap', 'carptw', config, solution);
    return;
  }
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
    switchMainTab('tab-selector');
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

