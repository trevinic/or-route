/**
 * OR-Route Internationalization (i18n) Engine
 * Full bilingual support: Italian (IT) & English (EN) across the entire platform.
 * Persists user preference in localStorage ('or_route_lang') and supports URL param '?lang=en'.
 * Seamlessly updates UI in-place without page reload.
 */

(function () {
  'use strict';

  const I18N = {
    it: {
      lang_name: 'Italiano',
      nav: {
        home: '🏠 Home',
        home_title: 'Torna alla Landing Page Principale (3 Aree Operative)',
        models_label: 'Modelli:',
        models_placeholder: '-- Modello --',
        roi: '📊 Calcola ROI',
        roi_title: 'Calcola il risparmio economico, il ROI e consulta la Matrice Comparativa dei 10 Modelli',
        faq: '📚 FAQ',
        faq_title: 'Consulta le FAQ e la documentazione tecnica',
        contacts: '📩 Contatti',
        contacts_title: 'Invia richieste, segnalazioni o suggerimenti per la piattaforma',
        login: '👤 Accedi',
        login_title: 'Accedi per salvare e gestire i tuoi scenari personali',
        logout: '🚪 Esci',
        scenario_default: 'Predefinito'
      },
      models_menu: {
        cvrp: '📦 1. CVRP (Merci)',
        vrptw: '⏱️ 2. VRPTW (Orari)',
        carp: '🚛 3. CARP (RSU/Strade)',
        intermediate: '🔋 4. EV-VRP (Ricariche)',
        vrppd: '📦🔄 5. VRPPD (Ritiri)',
        mdvrp: '🏢 6. MDVRP (Depositi)',
        pcarp: '📅 7. PCARP (Settimanale)',
        carptw: '⏱️🛣️ 8. CARPTW (ZTL)',
        carpif: '♻️ 9. CARPIF (Impianti)',
        dcarp: '⚡ 10. DCARP (Dinamico)'
      },
      landing: {
        hero_badge: '⚡ PIATTAFORMA DI RICERCA OPERATIVA & CARTOGRAFIA GIS',
        hero_title: 'Ottimizzazione Avanzata di Percorsi, Logistica & Flotte',
        hero_sub: 'Algoritmi esatti MILP ed euristiche ad alte prestazioni per la raccolta rifiuti porta a porta (CARP), consegne merci (CVRP), finestre orarie (VRPTW) e veicoli elettrici.',
        area1_badge: 'AREA 1 • GUIDA ALLA SCELTA',
        area1_title: '1. Compila la Guida per la Scelta del Modello',
        area1_desc: 'Non sai quale formulazione matematica si adatta meglio alla tua azienda? Rispondi a 3 semplici domande sui tuoi vincoli operativi e calibra i costi orari e chilometrici della tua flotta eterogenea.',
        area1_btn_wizard: '<span>🧭</span> Avvia Step-by-Step (3 Domande)',
        area1_btn_fleet: '🚛 Configura la Flotta',
        area1_btn_matrix: '📐 Matrice di Confronto dei 10 Modelli',
        area1_guide_title: 'Area 1 — Guida Interattiva per la Scelta del Modello & Configuratore Flotta',
        area1_guide_expand: '🔽 Espandi Guida',
        area1_guide_collapse: '🔼 Comprimi Guida',
        area1_smart_badge: 'Consulenza Intelligente & Calibrazione Costi',
        area2_badge: 'AREA 2 • SCELTA DIRETTA',
        area2_title: '2. Scegli Direttamente tra i 10 Modelli di Ricerca Operativa',
        area2_desc: 'Se conosci già il problema matematico target (Nodale per punti consegna singoli o su Archi per spazzamento/raccolta porta a porta), accedi subito alla dashboard operativa dedicata.',
        filter_all: 'Tutti (10 Modelli)',
        filter_node: '📦 Problemi sui Nodi (CVRP, VRPTW, EV-VRP, VRPPD, MDVRP)',
        filter_arc: '🚛 Problemi sugli Archi / Strade (CARP, PCARP, CARPTW, CARPIF, DCARP)',
        area2_select_lbl: 'Oppure seleziona e avvia subito:',
        area2_btn_launch: '🚀 Apri Modello Selezionato',
        area3_badge: 'AREA 3 • SESSIONI SALVATE',
        area3_title: '3. Accedi per Ricominciare dalle Sessioni Salvate',
        area3_desc: 'Riprendi il tuo lavoro da dove l\'avevi lasciato: carica le tue mappe comunali, le flotte e i turni salvati nel tuo profilo personale o da un file locale.',
        area3_quick_login_title: '🔑 Accesso Rapido Account Cloud',
        area3_create_account: '+ Crea Account',
        area3_user_placeholder: 'Nome utente o email (es. mario.rossi)',
        area3_pass_placeholder: 'Password ••••••••',
        area3_btn_login: '🔓 Accedi e Carica le Tue Sessioni',
        area3_new_user: 'Nuovo su OR-Route?',
        area3_btn_register: '📝 Registrati Gratis',
        area3_backup_title: '💻 Backup Sessione su File Locale (.json)',
        area3_backup_nologin: 'Senza Login',
        area3_btn_load_json: '📤 Carica File .JSON',
        area3_btn_export_json: '📥 Esporta .JSON',
        coffee_title: 'OR-Route ti ha fatto risparmiare tempo e chilometri? Offrici un Caffè!',
        coffee_btn: '☕ Offri un Caffè (PayPal / Wallet)',
        partner_title: 'Diventa Partner o Sponsor della Ricerca Operativa',
        partner_desc: 'Contatta il team per integrare la tua flotta, presentare soluzioni software o sponsorizzare i server.',
        partner_btn: '🤝 Contatti & Partnership'
      },
      models_grid: {
        cvrp_sub: 'Consegne Merci & Portata Max',
        vrptw_sub: 'Finestre Orarie Tassative',
        carp_sub: 'Spazzamento Strade & RSU',
        ev_sub: 'Flotte Elettriche & Ricarica',
        vrppd_sub: 'Ritiri & Consegne Accoppiati',
        mdvrp_sub: 'Multi-Deposito Territoriale',
        pcarp_sub: 'Raccolta Rifiuti Periodica',
        carptw_sub: 'Servizi Stradali con ZTL',
        carpif_sub: 'Scarichi Intermedi & Discariche',
        dcarp_sub: 'Riassegnazione Dinamica & Guasti'
      },
      wizard: {
        th_type: 'Tipologia Veicolo',
        th_qty: 'N° Veicoli',
        th_cap_kg: 'Capacità (kg)',
        th_driver_h: 'Costo Autista (€/h)',
        th_crew: 'Equipaggio (#)',
        th_shift_h: 'Ore Turno (h)',
        th_truck_d: 'Noleggio/Ammort. (€/g)',
        th_fixed_cost: 'Costo Fisso Uscita (€)',
        th_cost_km: 'Costo Carburante (€/km)'
      },
      carp: {
        search_placeholder: 'Cerca via, nodo o cantiere...',
        btn_import_osm: '📥 Importa Rete da OpenStreetMap (OSM)',
        btn_solve: '⚡ Risolvi Modello CARP (Algoritmo Esatto / Euristiche)',
        btn_driver_sheet: '📋 Foglio di Viaggio per l\'Autista',
        th_street_name: 'Nome Via / Tratta Stradale',
        th_zone_type: 'Tipologia / Zona',
        th_nodes: 'Nodi (u ➔ v)',
        th_demand_qt: 'Domanda RSU (qt)',
        th_transit_cost: 'Costo Transito (km / min)',
        th_compactor_name: 'Mezzo / Modello',
        th_payload_qt: 'Portata Utile (qt)',
        th_crew_size: 'Operatori a Bordo',
        th_crew_rate: 'Costo Orario Equipaggio (€/h)',
        th_truck_daily: 'Costo Giornaliero Mezzo (€/giorno)',
        th_fixed_cost: 'Costo Fisso di Uscita (€/viaggio)',
        th_km_cost: 'Costo Chilometrico (€/km)',
        btn_fleet_import: '📁 Carica Flotta da File (Excel / CSV / TXT)',
        btn_fleet_template: '📥 Template Flotta (.csv)',
        btn_add_vehicle: '+ Aggiungi Compattatore',
        btn_streets_import: '📁 Carica da File (Excel / CSV / TXT)',
        btn_streets_template: '📥 Template Utenze (.csv)',
        streets_title: 'Rete Stradale & Domanda Rifiuti (kg)',
        fleet_title: 'Flotta Mezzi: Specifiche Portata & Costo Fisso'
      },
      cvrp: {
        btn_fleet_import: '📁 Carica da File',
        btn_fleet_template: '📥 Template',
        btn_add_vehicle: '+ Aggiungi Veicolo',
        fleet_title: 'Flotta Mezzi: Portata & Costi Fissi'
      },
      driver_sheet: {
        title: 'Foglio di Viaggio per l\'Autista — Sequenza di Raccolta',
        btn_print: '🖨️ Stampa Foglio',
        btn_copy: '📋 Copia per Messaggio',
        th_step: 'Tappa',
        th_street: 'Via / Tratta Stradale',
        th_dir: 'Direzione di Marcia',
        th_op: 'Tipo Operazione',
        th_waste: 'Rifiuti Previsti',
        depot_start: 'Base di Partenza:',
        total_load: 'Carico Totale:',
        capacity_str: 'capienza',
        est_duration: 'Durata Stimata:',
        total_legs: 'Tappe Totali:',
        driver_instruction: 'ℹ️ <b>Istruzioni per l\'Autista:</b> Segui rigorosamente la sequenza numerata delle vie e la direzione indicata. La sequenza è ottimizzata matematicamente per minimizzare il tempo a vuoto e le manovre.',
        badge_start: '🟡 PARTENZA CANTIERE',
        badge_return: '🏠 RIENTRO DEPOSITO',
        badge_service: '🟢 RACCOLTA ATTIVA',
        badge_transit: '🟡 TRANSITO DI COLLEGAMENTO',
        desc_start: 'Immissione su viabilità comunale in direzione prima via di raccolta',
        desc_return: 'Rientro alla sede operativa per pesatura e scarico rifiuti',
        desc_service: 'Svuotamento cassonetti / raccolta porta a porta lungo tutta la via',
        desc_transit: 'Tratto di transito veloce (nessun cassonetto da svuotare)'
      },
      roi: {
        title: 'Calcolatore di Risparmio ROI & Riduzione Emissioni CO2',
        badge: 'Analisi di Convenienza Flotta',
        fleet_params: '⚙️ Parametri Flotta Aziendale'
      },
      faq_group: {
        title_operational: '❓ Domande Operative e Utilizzo della Piattaforma',
        title_theory: '📐 Teoria, Modelli Matematici e Algoritmi',
        title_biblio: '📖 Riferimenti Scientifici e Standard Internazionali',
        filter_all: '📋 Tutti gli Argomenti',
        filter_guide: '📘 Guida Pratica & Manuale d\'Uso',
        filter_faq: '❓ FAQ Operative & Strategiche',
        filter_milp: '📐 Dispensa Matematica (MILP)',
        filter_biblio: '📖 Bibliografia & Tool Open-Source',
        btn_expand_all: '📖 Espandi Tutte le FAQ',
        btn_collapse_all: '📕 Comprimi Tutte',
        btn_print_pdf: '🖨️ Stampa / Salva Guida in PDF',
        card_title: 'FAQ & Dispensa Teorica di Ricerca Operativa',
        card_badge: 'Formulazioni Matematiche & Letteratura Scientifica'
      },
      contacts_page: {
        hero_badge: 'RECAPITI UFFICIALI & SUPPORTO TECNICO',
        hero_title: 'Contatta il Team di Ricerca OR-Route',
        hero_desc: 'Invia suggerimenti, richieste di nuove funzionalità, segnalazioni di bug o richieste commerciali per l\'ottimizzazione della tua flotta. Recapito crittografato diretto al team di sviluppo.',
        category_title: 'Seleziona il Motivo del Contatto',
        pill_suggestion: '💡 Suggerimento',
        pill_support: '❓ Assistenza Tecnica',
        pill_bug: '🐛 Segnalazione Bug',
        pill_fleet: '🏢 Flotta Aziendale',
        pill_partnership: '🤝 Partnership / Ricerca',
        pill_other: '💬 Altro Feedback',
        name_label: 'Il Tuo Nome e Cognome',
        name_placeholder: 'es. Ing. Marco Rossi',
        email_label: 'Il Tuo Indirizzo Email',
        email_placeholder: 'es. marco.rossi@azienda.it',
        company_label: 'Azienda, Ente o Università (Opzionale)',
        company_placeholder: 'es. Logistica Nord Srl, Università...',
        message_label: 'Descrizione della Richiesta o Segnalazione',
        message_placeholder: 'Descrivi chiaramente la tua richiesta, problema riscontrato o proposta...',
        btn_submit: 'Invia Messaggio',
        security_note: '🔒 Invio protetto e crittografato tramite server dedicato OR-Route.',
        back_home: 'Torna alla Piattaforma',
        models_link: 'I 10 Modelli'
      },
      footer: {
        desc: 'Piattaforma gratuita e aperta dedicata all\'applicazione della Ricerca Operativa industriale (Operational Research & MILP Solvers) per la riduzione dei costi e delle emissioni delle flotte aziendali.',
        btn_coffee: '☕ Offrimi un Caffè (PayPal / Wallet)',
        btn_partner: '🤝 Partner & Affiliazioni',
        btn_contacts: '📩 Contatti & Suggerimenti',
        col_quick: 'Accesso Rapido Piattaforma',
        col_solvers: 'Motori & Risorse',
        link_wizard: '🧭 1. Compila Guida Scelta Modello',
        link_models: '⚡ 2. Scegli Modello Direttamente (10 Modelli)',
        link_sessions: '🔐 3. Accedi alle Sessioni Salvate',
        link_roi: '📊 Calcolatore Risparmio ROI & ESG',
        link_contacts: '📩 Contatti, Richieste & Suggerimenti',
        copy: '&copy; 2026 OR-Route &mdash; Piattaforma Aperta di Ricerca Operativa per Flotte Aziendali e Servizi RSU. Sostenuta da Google AdSense, Link Referenziali Partner e Donazioni Libere degli Utenti.'
      }
    },

    en: {
      lang_name: 'English',
      nav: {
        home: '🏠 Home',
        home_title: 'Return to Main Landing Page (3 Operations Areas)',
        models_label: 'Models:',
        models_placeholder: '-- Model --',
        roi: '📊 Calculate ROI',
        roi_title: 'Calculate economic savings, ROI and explore the 10-Model Comparison Matrix',
        faq: '📚 FAQ',
        faq_title: 'Browse technical FAQs and academic documentation',
        contacts: '📩 Contact Us',
        contacts_title: 'Send inquiries, feature suggestions, or feedback to the research team',
        login: '👤 Sign In',
        login_title: 'Sign in to save and sync your fleet scenarios',
        logout: '🚪 Sign Out',
        scenario_default: 'Default'
      },
      models_menu: {
        cvrp: '📦 1. CVRP (Freight)',
        vrptw: '⏱️ 2. VRPTW (Time Windows)',
        carp: '🚛 3. CARP (Waste/Streets)',
        intermediate: '🔋 4. EV-VRP (Charging)',
        vrppd: '📦🔄 5. VRPPD (Pickups)',
        mdvrp: '🏢 6. MDVRP (Multi-Depot)',
        pcarp: '📅 7. PCARP (Periodic)',
        carptw: '⏱️🛣️ 8. CARPTW (ZTL/Curfew)',
        carpif: '♻️ 9. CARPIF (Facilities)',
        dcarp: '⚡ 10. DCARP (Dynamic)'
      },
      landing: {
        hero_badge: '⚡ OPERATIONS RESEARCH & GIS ROUTING PLATFORM',
        hero_title: 'Advanced Route, Fleet & Logistics Optimization',
        hero_sub: 'Exact MILP algorithms and high-performance heuristics for door-to-door waste collection (CARP), freight delivery (CVRP), strict time windows (VRPTW), and electric vehicles.',
        area1_badge: 'AREA 1 • MODEL SELECTION GUIDE',
        area1_title: '1. Interactive Model Selector & Wizard',
        area1_desc: 'Not sure which mathematical formulation best fits your logistics? Answer 3 quick questions about your constraints and calibrate hourly and mileage costs for your fleet.',
        area1_btn_wizard: '<span>🧭</span> Start Step-by-Step (3 Questions)',
        area1_btn_fleet: '🚛 Configure Fleet',
        area1_btn_matrix: '📐 10-Model Comparison Matrix',
        area1_guide_title: 'Area 1 — Interactive Model Selection Guide & Fleet Configurator',
        area1_guide_expand: '🔽 Expand Guide',
        area1_guide_collapse: '🔼 Collapse Guide',
        area1_smart_badge: 'Smart Advisory & Cost Calibration',
        area2_badge: 'AREA 2 • DIRECT SELECTION',
        area2_title: '2. Choose Directly from the 10 Operations Research Models',
        area2_desc: 'If you already know your target mathematical model (Node routing for discrete customer stops or Arc routing for street sweeping and curbside collection), launch its dedicated workspace.',
        filter_all: 'All (10 Models)',
        filter_node: '📦 Node Routing (CVRP, VRPTW, EV-VRP, VRPPD, MDVRP)',
        filter_arc: '🚛 Arc / Street Routing (CARP, PCARP, CARPTW, CARPIF, DCARP)',
        area2_select_lbl: 'Or select and launch immediately:',
        area2_btn_launch: '🚀 Launch Selected Model',
        area3_badge: 'AREA 3 • SAVED SESSIONS',
        area3_title: '3. Sign In to Resume from Saved Sessions',
        area3_desc: 'Pick up right where you left off: load your municipal maps, vehicle fleets, and optimized shifts saved to your profile or from a local file.',
        area3_quick_login_title: '🔑 Quick Cloud Account Sign-in',
        area3_create_account: '+ Create Account',
        area3_user_placeholder: 'Username or email (e.g. john.doe)',
        area3_pass_placeholder: 'Password ••••••••',
        area3_btn_login: '🔓 Sign In & Load Your Sessions',
        area3_new_user: 'New to OR-Route?',
        area3_btn_register: '📝 Register Free',
        area3_backup_title: '💻 Local Session Backup (.json)',
        area3_backup_nologin: 'No Login Required',
        area3_btn_load_json: '📤 Load .JSON File',
        area3_btn_export_json: '📥 Export .JSON',
        coffee_title: 'Did OR-Route save you time and fuel? Buy us a Coffee!',
        coffee_btn: '☕ Buy Me a Coffee (PayPal / Wallet)',
        partner_title: 'Become an Operations Research Partner or Sponsor',
        partner_desc: 'Reach out to integrate proprietary solvers, showcase logistics software, or sponsor computing servers.',
        partner_btn: '🤝 Contacts & Partnership'
      },
      models_grid: {
        cvrp_sub: 'Freight Deliveries & Max Capacity',
        vrptw_sub: 'Strict Customer Time Windows',
        carp_sub: 'Street Sweeping & Curbside Waste',
        ev_sub: 'Electric Fleets & Recharging Stops',
        vrppd_sub: 'Paired Pickups & Deliveries',
        mdvrp_sub: 'Multi-Depot Territory Partitioning',
        pcarp_sub: 'Periodic Multi-Day Waste Schedules',
        carptw_sub: 'Street Sweeping with Access Curfews',
        carpif_sub: 'Intermediate Landfills & Unloading',
        dcarp_sub: 'Dynamic Rerouting & Breakdown Response'
      },
      wizard: {
        th_type: 'Vehicle Type',
        th_qty: 'Vehicles Qty',
        th_cap_kg: 'Capacity (kg)',
        th_driver_h: 'Driver Cost (€/h)',
        th_crew: 'Crew (#)',
        th_shift_h: 'Shift Hours (h)',
        th_truck_d: 'Daily Lease (€/day)',
        th_fixed_cost: 'Fixed Trip Cost (€)',
        th_cost_km: 'Fuel & Maint (€/km)'
      },
      carp: {
        search_placeholder: 'Search street, node or depot...',
        btn_import_osm: '📥 Import Network from OpenStreetMap (OSM)',
        btn_solve: '⚡ Solve CARP Model (Exact MILP / Heuristics)',
        btn_driver_sheet: '📋 Driver Route Sheet',
        th_street_name: 'Street / Road Segment Name',
        th_zone_type: 'Street Category / Zone',
        th_nodes: 'Nodes (u ➔ v)',
        th_demand_qt: 'Waste Demand (qt)',
        th_transit_cost: 'Deadhead Cost (km / min)',
        th_compactor_name: 'Vehicle / Truck Model',
        th_payload_qt: 'Payload Capacity (qt)',
        th_crew_size: 'Crew on Board',
        th_crew_rate: 'Crew Hourly Rate (€/h)',
        th_truck_daily: 'Truck Daily Cost (€/day)',
        th_fixed_cost: 'Fixed Departure Cost (€/trip)',
        th_km_cost: 'Mileage Cost (€/km)',
        btn_fleet_import: '📁 Import Fleet from File (Excel / CSV / TXT)',
        btn_fleet_template: '📥 Fleet Template (.csv)',
        btn_add_vehicle: '+ Add Compactor',
        btn_streets_import: '📁 Import from File (Excel / CSV / TXT)',
        btn_streets_template: '📥 Demands Template (.csv)',
        streets_title: 'Road Network & Waste Demand (kg)',
        fleet_title: 'Vehicle Fleet: Payload Specs & Fixed Cost'
      },
      cvrp: {
        btn_fleet_import: '📁 Import from File',
        btn_fleet_template: '📥 Template',
        btn_add_vehicle: '+ Add Vehicle',
        fleet_title: 'Vehicle Fleet: Payload & Fixed Costs'
      },
      driver_sheet: {
        title: 'Driver Route Sheet — Collection Sequence',
        btn_print: '🖨️ Print Sheet',
        btn_copy: '📋 Copy for Messaging',
        th_step: 'Step',
        th_street: 'Street / Road Segment',
        th_dir: 'Heading / Direction',
        th_op: 'Operation Type',
        th_waste: 'Expected Waste',
        depot_start: 'Departure Depot:',
        total_load: 'Total Load:',
        capacity_str: 'capacity',
        est_duration: 'Estimated Duration:',
        total_legs: 'Total Legs:',
        driver_instruction: 'ℹ️ <b>Driver Instructions:</b> Rigorously follow the numbered sequence and indicated headings. The route is mathematically optimized to minimize deadheading and turnaround maneuvers.',
        badge_start: '🟡 DEPOT DEPARTURE',
        badge_return: '🏠 DEPOT RETURN',
        badge_service: '🟢 ACTIVE COLLECTION',
        badge_transit: '🟡 DEADHEAD TRANSIT',
        desc_start: 'Entering municipal roads toward first collection street',
        desc_return: 'Returning to operational depot for weighing and waste discharge',
        desc_service: 'Bin emptying / curbside collection along entire street',
        desc_transit: 'Fast repositioning leg (no collection)'
      },
      roi: {
        title: 'ROI Savings & CO2 Reduction Calculator',
        badge: 'Fleet Cost-Benefit Analysis',
        fleet_params: '⚙️ Fleet Parameters'
      },
      faq_group: {
        title_operational: '❓ Operational Questions & Platform Usage',
        title_theory: '📐 Theory, Mathematical Models & Algorithms',
        title_biblio: '📖 Scientific References & International Standards',
        filter_all: '📋 All Topics',
        filter_guide: '📘 User Manual & Practical Guide',
        filter_faq: '❓ Operational & Strategic FAQs',
        filter_milp: '📐 Mathematical Handbook (MILP)',
        filter_biblio: '📖 Bibliography & Open-Source Tools',
        btn_expand_all: '📖 Expand All FAQs',
        btn_collapse_all: '📕 Collapse All',
        btn_print_pdf: '🖨️ Print / Save Guide to PDF',
        card_title: 'FAQ & Operations Research Technical Guide',
        card_badge: 'Mathematical Formulations & Scientific Literature'
      },
      contacts_page: {
        hero_badge: 'OFFICIAL CONTACTS & TECHNICAL SUPPORT',
        hero_title: 'Contact the OR-Route Team',
        hero_desc: 'Send suggestions, feature requests, bug reports, or commercial fleet inquiries. Direct encrypted delivery to our development team.',
        category_title: 'Select Contact Reason',
        pill_suggestion: '💡 Suggestion',
        pill_support: '❓ Technical Support',
        pill_bug: '🐛 Bug Report',
        pill_fleet: '🏢 Corporate Fleet',
        pill_partnership: '🤝 Partnership / Research',
        pill_other: '💬 Other Feedback',
        name_label: 'Your Full Name',
        name_placeholder: 'e.g. John Doe, Fleet Manager',
        email_label: 'Your Email Address',
        email_placeholder: 'e.g. john.doe@company.com',
        company_label: 'Company, Entity or University (Optional)',
        company_placeholder: 'e.g. Global Logistics Ltd, University...',
        message_label: 'Message or Technical Request',
        message_placeholder: 'Clearly describe your request, issue, or proposal...',
        btn_submit: 'Send Message',
        security_note: '🔒 Protected and encrypted transmission via dedicated OR-Route server.',
        back_home: 'Back to Platform',
        models_link: 'The 10 Models'
      },
      footer: {
        desc: 'Free, open-access platform dedicated to industrial Operations Research and MILP solvers for reducing corporate fleet costs and CO₂ emissions.',
        btn_coffee: '☕ Buy Me a Coffee (PayPal / Wallet)',
        btn_partner: '🤝 Partners & Affiliations',
        btn_contacts: '📩 Contacts & Suggestions',
        col_quick: 'Platform Quick Access',
        col_solvers: 'Solvers & Resources',
        link_wizard: '🧭 1. Complete Model Guide',
        link_models: '⚡ 2. Direct Model Launch (10 Models)',
        link_sessions: '🔐 3. Access Saved Sessions',
        link_roi: '📊 ROI & ESG Savings Calculator',
        link_contacts: '📩 Contact, Requests & Suggestions',
        copy: '&copy; 2026 OR-Route &mdash; Open Operations Research Platform for Corporate Fleets and Municipal Waste Services. Supported by Google AdSense, Partner Referral Links and User Donations.'
      }
    }
  };

  const FAQ_TRANSLATIONS = {
    en: {
      1: "1. What is Combinatorial Optimization in transportation and why is it NP-hard?",
      2: "2. What is the fundamental difference between 'Node Routing' (VRP) and 'Arc Routing' (CARP)?",
      3: "3. How do you balance Fixed Vehicle Engagement Costs and Mileage Costs (€/km)?",
      4: "4. What are Time Windows and how do they impact routing feasibility?",
      5: "5. How does VRP with Pickups and Deliveries (VRPPD) differ from standard VRP?",
      6: "6. When is Multi-Depot VRP (MDVRP) essential?",
      7: "7. What is 'Deadheading' (empty transit) and how does Eulerian graph optimization minimize it?",
      8: "8. How do Intermediate Facilities (Landfills / Fast Chargers) work in EV-VRP?",
      9: "9. Exact Algorithms (Branch-and-Cut / CBC) vs Heuristics (Clarke-Wright, ALNS, Tabu Search)?",
      10: "10. What is the real Return on Investment (ROI) and ESG impact?",
      11: "11. Do OpenStreetMap maps and road downloads work worldwide?",
      12: "12. 📅 When and why should the PCARP model be adopted for weekly waste collection?",
      13: "13. ⏱️🛣️ How does CARPTW handle ZTL access windows, schools, and street markets?",
      14: "14. ⚖️ How is Linear Density (kg/m) calculated in CARP models and how does it vary by waste fraction?",
      15: "15. 🔐 How does User Authentication, Multi-User Management, and Scenario Saving work?",
      16: "16. 📍 What are 'Nodes' in road networks and Operations Research (CARP vs VRP)?",
      17: "17. 🌍 How does OpenStreetMap Import, Multi-Zone search, and Depot Link (R0) work?",
      18: "18. 🗺️ How to use the Interactive Road Map, add/remove streets, and expand to Full Screen?",
      19: "19. ⚡ How does Optimal Route Calculation work with the MILP Mathematical Solver?",
      20: "20. 📋 How to interpret and print the Driver Route Sheet?",
      21: "21. 🔄 What is meant by 'Deadheading' (empty transit) and how is it reduced?",
      22: "22. 📁🚛 How to import the Vehicle Fleet from external files (Excel, CSV, TSV) and what fields are required?",
      23: "23. 📁🛣️ How to import the Road Network, Customers, and Demands from external files and adapt them across models?"
    },
    it: {
      1: "1. Cos'è l'Ottimizzazione Combinatoria nei trasporti e perché è un problema matematico NP-hard?",
      2: "2. Qual è la differenza fondamentale tra problemi \"Node Routing\" (VRP) e \"Arc Routing\" (CARP)?",
      3: "3. Come si bilanciano il \"Costo Fisso di Ingaggio Mezzo\" e il \"Costo Chilometrico (€/km)\"?",
      4: "4. Cosa sono le Finestre Temporali (Time Windows) e come influenzano la fattibilità del percorso?",
      5: "5. In cosa differisce il VRP con Ritiri e Consegne Accoppiati (VRPPD) dal VRP standard?",
      6: "6. Quando è indispensabile utilizzare il modello Multi-Deposito (MDVRP)?",
      7: "7. Cos'è il \"Deadheading\" (percorrenza a vuoto) e in che modo l'ottimizzazione su grafi euleriani lo abbatte?",
      8: "8. Come funzionano le Strutture Intermedie (Landfill / Ricariche Elettriche) nel modello EV-VRP?",
      9: "9. Algoritmi Esatti (Branch-and-Cut / CBC) vs Euristiche (Clarke-Wright, ALNS, Tabu Search): quando usare l'uno o l'altro?",
      10: "10. Qual è il ritorno economico (ROI) reale e l'impatto sul bilancio ESG (Scope 1)?",
      11: "11. Le mappe geografiche e il download delle reti stradali valgono solo per l'Italia o in tutto il mondo?",
      12: "12. 📅 Quando e perché conviene adottare il modello PCARP per la raccolta rifiuti?",
      13: "13. ⏱️🛣️ Come gestisce il CARPTW i vincoli di ZTL, scuole e mercati rionali?",
      14: "14. ⚖️ Come viene calcolata la \"Densità Lineare (kg/m)\" nei modelli CARP e come varia in Italia e nel Comune di Conegliano per tipologia di rifiuto e zona?",
      15: "15. 🔐 Come funziona l'Autenticazione Utente, la Gestione Multi-Utente e il Salvataggio dei Propri Scenari & Flotte?",
      16: "16. 📍 Cosa sono i \"Nodi\" nella rete stradale e nei modelli di Ricerca Operativa (CARP vs VRP)?",
      17: "17. 🌍 Come funziona l'Importazione da OpenStreetMap, la ricerca Multi-Zona e il Raccordo Cantiere (R0)?",
      18: "18. 🗺️ Come utilizzare la Mappa Stradale Interattiva, aggiungere/togliere vie ed espandere a Schermo Intero?",
      19: "19. ⚡ Come funziona il Calcolo degli Itinerari Ottimi con Solutore Matematico MILP?",
      20: "20. 📋 Come interpretare e stampare il Foglio di Viaggio per l'Autista (Driver Sheet)?",
      21: "21. 🔄 Cosa si intende per \"Deadheading\" (Transito a Vuoto) e come viene abbattuto?",
      22: "22. 📁🚛 Come importare la Flotta Mezzi da file esterno (Excel .xlsx/.xls, CSV o file di testo tabulato) e quali sono i campi richiesti?",
      23: "23. 📁🛣️ Come importare la Rete Stradale, Utenze e Clienti da file esterno (Excel .xlsx/.xls, CSV, TXT tabulato) e come adattare i campi per CARP e gli altri modelli?"
    }
  };

  let currentLang = 'it';

  function getLanguage() {
    return currentLang;
  }

  function t(path, fallback = '') {
    const parts = path.split('.');
    let cur = I18N[currentLang];
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return fallback || path;
      }
    }
    return typeof cur === 'string' ? cur : (fallback || path);
  }

  function setLanguage(lang) {
    if (lang !== 'it' && lang !== 'en') lang = 'it';
    currentLang = lang;
    try {
      localStorage.setItem('or_route_lang', lang);
    } catch (_) {}

    document.documentElement.lang = lang;

    updateSwitcherUI();
    applyTranslationsToDOM();

    window.dispatchEvent(new CustomEvent('or_route_lang_changed', { detail: { lang } }));
  }

  function updateSwitcherUI() {
    const btnIT = document.getElementById('btnLangIT');
    const btnEN = document.getElementById('btnLangEN');
    if (btnIT && btnEN) {
      if (currentLang === 'it') {
        btnIT.classList.add('active');
        btnIT.style.background = 'rgba(56, 189, 248, 0.25)';
        btnIT.style.borderColor = 'rgba(56, 189, 248, 0.55)';
        btnIT.style.opacity = '1';

        btnEN.classList.remove('active');
        btnEN.style.background = 'transparent';
        btnEN.style.borderColor = 'transparent';
        btnEN.style.opacity = '0.6';
      } else {
        btnEN.classList.add('active');
        btnEN.style.background = 'rgba(56, 189, 248, 0.25)';
        btnEN.style.borderColor = 'rgba(56, 189, 248, 0.55)';
        btnEN.style.opacity = '1';

        btnIT.classList.remove('active');
        btnIT.style.background = 'transparent';
        btnIT.style.borderColor = 'transparent';
        btnIT.style.opacity = '0.6';
      }
    }
  }

  function applyTranslationsToDOM() {
    const dict = I18N[currentLang];
    if (!dict) return;

    // 1. Logo Subtitle
    const logoSubs = document.querySelectorAll('.logo-sub');
    logoSubs.forEach(el => {
      el.innerHTML = (currentLang === 'en')
        ? 'Operations Research &amp; Fleet Logistics'
        : 'Ricerca Operativa &amp; Algoritmi Flotte';
    });

    // 2. Header Home & Model selector
    const btnHome = document.getElementById('btnHeaderHome');
    if (btnHome) {
      btnHome.innerHTML = `<span>🏠</span> ${dict.nav.home.replace('🏠 ', '')}`;
      btnHome.title = dict.nav.home_title;
    }
    const lblModel = document.querySelector('label[for="headerModelSelect"]');
    if (lblModel) lblModel.innerText = dict.nav.models_label;

    const selectModel = document.getElementById('headerModelSelect');
    if (selectModel && selectModel.options.length > 10) {
      selectModel.options[0].text = dict.nav.models_placeholder;
      selectModel.options[1].text = dict.models_menu.cvrp;
      selectModel.options[2].text = dict.models_menu.vrptw;
      selectModel.options[3].text = dict.models_menu.carp;
      selectModel.options[4].text = dict.models_menu.intermediate;
      selectModel.options[5].text = dict.models_menu.vrppd;
      selectModel.options[6].text = dict.models_menu.mdvrp;
      selectModel.options[7].text = dict.models_menu.pcarp;
      selectModel.options[8].text = dict.models_menu.carptw;
      selectModel.options[9].text = dict.models_menu.carpif;
      selectModel.options[10].text = dict.models_menu.dcarp;
    }

    // 3. Header Global Buttons
    const btnRoi = document.querySelector('header button[onclick*="tab-roi"]');
    if (btnRoi) {
      btnRoi.innerText = dict.nav.roi;
      btnRoi.title = dict.nav.roi_title;
    }
    const btnFaq = document.querySelector('header button[onclick*="tab-faq"]');
    if (btnFaq) {
      btnFaq.innerText = dict.nav.faq;
      btnFaq.title = dict.nav.faq_title;
    }
    const btnContact = document.querySelector('header a[href="contatti.html"]');
    if (btnContact) {
      btnContact.innerHTML = (currentLang === 'en') ? '📩 Contact Us' : '📩 Contatti';
      btnContact.title = dict.nav.contacts_title;
    }

    // 4. Landing Hero
    const heroBadge = document.querySelector('.landing-hero-badge');
    if (heroBadge) heroBadge.innerText = dict.landing.hero_badge;
    const heroTitle = document.querySelector('.landing-hero-title');
    if (heroTitle) heroTitle.innerText = dict.landing.hero_title;
    const heroSub = document.querySelector('.landing-hero-subtitle');
    if (heroSub) heroSub.innerText = dict.landing.hero_sub;

    // 5. Landing Area 1, 2, 3 Badges & Titles
    const b1 = document.querySelector('.badge-1');
    if (b1) b1.innerText = dict.landing.area1_badge;
    const b2 = document.querySelector('.badge-2');
    if (b2) b2.innerText = dict.landing.area2_badge;
    const b3 = document.querySelector('.badge-3');
    if (b3) b3.innerText = dict.landing.area3_badge;

    const titles = document.querySelectorAll('.area-card-title');
    if (titles.length >= 3) {
      titles[0].innerText = dict.landing.area1_title;
      titles[1].innerText = dict.landing.area2_title;
      titles[2].innerText = dict.landing.area3_title;
    }

    const descs = document.querySelectorAll('.area-card-desc');
    if (descs.length >= 3) {
      descs[0].innerText = dict.landing.area1_desc;
      descs[1].innerText = dict.landing.area2_desc;
      descs[2].innerText = dict.landing.area3_desc;
    }

    // Filter tabs in Area 2
    const filterBtns = document.querySelectorAll('.area-model-filter-tabs .area-model-filter-btn');
    if (filterBtns.length >= 3) {
      filterBtns[0].innerText = dict.landing.filter_all;
      filterBtns[1].innerText = dict.landing.filter_node;
      filterBtns[2].innerText = dict.landing.filter_arc;
    }

    // Model Cards in Area 2
    const dmSubs = document.querySelectorAll('.direct-model-btn .dm-sub');
    if (dmSubs.length >= 10) {
      dmSubs[0].innerText = dict.models_grid.cvrp_sub;
      dmSubs[1].innerText = dict.models_grid.vrptw_sub;
      dmSubs[2].innerText = dict.models_grid.carp_sub;
      dmSubs[3].innerText = dict.models_grid.ev_sub;
      dmSubs[4].innerText = dict.models_grid.vrppd_sub;
      dmSubs[5].innerText = dict.models_grid.mdvrp_sub;
      dmSubs[6].innerText = dict.models_grid.pcarp_sub;
      dmSubs[7].innerText = dict.models_grid.carptw_sub;
      dmSubs[8].innerText = dict.models_grid.carpif_sub;
      dmSubs[9].innerText = dict.models_grid.dcarp_sub;
    }

    const selectLblArea2 = document.querySelector('label[for="landingDirectModelSelect"]');
    if (selectLblArea2) selectLblArea2.innerText = dict.landing.area2_select_lbl;
    const btnLaunchArea2 = document.querySelector('button[onclick*="launchSelectedModelFromLanding"]');
    if (btnLaunchArea2) btnLaunchArea2.innerText = dict.landing.area2_btn_launch;

    // Area 1 buttons
    const btnWiz = document.querySelector('button[onclick*="openAndScrollToWizard(\'step1\')"]');
    if (btnWiz) btnWiz.innerHTML = dict.landing.area1_btn_wizard;
    const btnFleet = document.querySelector('button[onclick*="openAndScrollToWizard(\'fleet\')"]');
    if (btnFleet) btnFleet.innerText = dict.landing.area1_btn_fleet;
    const btnMatrix = document.querySelector('button[onclick*="openAndScrollToWizard(\'matrix\')"]');
    if (btnMatrix) btnMatrix.innerText = dict.landing.area1_btn_matrix;

    // Area 1 Collapsible Guide Header & Button
    const area1CardTitleSpan = document.querySelector('#wizardGuideContainer .card-title > span:nth-of-type(2)');
    if (area1CardTitleSpan) area1CardTitleSpan.innerHTML = dict.landing.area1_guide_title;
    const btnToggleWiz = document.getElementById('btnToggleWizardBody');
    const wizContent = document.getElementById('wizardCollapsibleContent');
    if (btnToggleWiz && wizContent) {
      const isClosed = (wizContent.style.display === 'none');
      btnToggleWiz.innerText = isClosed ? dict.landing.area1_guide_expand : dict.landing.area1_guide_collapse;
    }
    const badgeSmart = document.querySelector('#wizardGuideContainer .badge-free');
    if (badgeSmart) badgeSmart.innerText = dict.landing.area1_smart_badge;

    // Area 3 buttons & elements
    const area3QuickTitle = document.querySelector('#landingArea3GuestBox > div:first-child span');
    if (area3QuickTitle) area3QuickTitle.innerText = dict.landing.area3_quick_login_title;
    const area3CreateAcc = document.querySelector('#landingArea3GuestBox > div:first-child a');
    if (area3CreateAcc) area3CreateAcc.innerText = dict.landing.area3_create_account;
    const area3InpUser = document.getElementById('landingQuickUser');
    if (area3InpUser) area3InpUser.placeholder = dict.landing.area3_user_placeholder;
    const area3InpPass = document.getElementById('landingQuickPass');
    if (area3InpPass) area3InpPass.placeholder = dict.landing.area3_pass_placeholder;
    const area3BtnLogin = document.querySelector('#landingArea3GuestBox button.btn-wallet-donate');
    if (area3BtnLogin) area3BtnLogin.innerText = dict.landing.area3_btn_login;
    const area3NewUserSpan = document.querySelector('#landingArea3GuestBox > div:last-child > span');
    if (area3NewUserSpan) area3NewUserSpan.innerText = dict.landing.area3_new_user;
    const area3BtnReg = document.querySelector('#landingArea3GuestBox > div:last-child > button');
    if (area3BtnReg) area3BtnReg.innerText = dict.landing.area3_btn_register;

    // Area 3 Backup Box
    const area3BackupTitle = document.querySelector('.area-3-sessions div[style*="border: 1px dashed"] > div:first-child span:first-child');
    if (area3BackupTitle) area3BackupTitle.innerText = dict.landing.area3_backup_title;
    const area3NoLogin = document.querySelector('.area-3-sessions div[style*="border: 1px dashed"] > div:first-child span:last-child');
    if (area3NoLogin) area3NoLogin.innerText = dict.landing.area3_backup_nologin;
    const area3BtnLoadJson = document.querySelector('button[onclick*="triggerSessionFileImport"]');
    if (area3BtnLoadJson) area3BtnLoadJson.innerText = dict.landing.area3_btn_load_json;
    const area3BtnExpJson = document.querySelector('button[onclick*="exportCurrentSessionToJson"]');
    if (area3BtnExpJson) area3BtnExpJson.innerText = dict.landing.area3_btn_export_json;

    // Coffee & Partners Bar
    document.querySelectorAll('.partner-coffee-item').forEach(item => {
      const titleDiv = item.querySelector('div > div:first-child');
      const descDiv = item.querySelector('div > div:nth-child(2)');
      const btn = item.querySelector('button');
      if (item.classList.contains('coffee-accent')) {
        if (titleDiv) titleDiv.innerText = dict.landing.coffee_title;
        if (descDiv) descDiv.innerHTML = (currentLang === 'en')
          ? 'Free donation via <b>PayPal</b>, <b>Solana Wallet (SOL)</b> or <b>Bank Wire</b>'
          : 'Donazione libera tramite <b>PayPal</b>, <b>Wallet Solana (SOL)</b> o <b>Bonifico IBAN</b>';
        if (btn) btn.innerHTML = `<span>☕</span> ${dict.landing.coffee_btn.replace('☕ ', '')}`;
      } else {
        if (titleDiv) titleDiv.innerText = dict.landing.partner_title;
        if (descDiv) descDiv.innerText = dict.landing.partner_desc;
        if (btn) btn.innerText = dict.landing.partner_btn;
      }
    });

    // 6. CARP Table Headers & Buttons
    const btnOsm = document.querySelector('button[onclick*="openImportModal"]');
    if (btnOsm) btnOsm.innerText = dict.carp.btn_import_osm;
    const btnSolve = document.getElementById('btnSolveCarp');
    if (btnSolve) btnSolve.innerText = dict.carp.btn_solve;
    const btnDriver = document.getElementById('btnOpenCarpDriverSheet');
    if (btnDriver) btnDriver.innerText = dict.carp.btn_driver_sheet;

    const streetsThs = document.querySelectorAll('#carpStreetsTable thead th');
    if (streetsThs.length >= 5) {
      streetsThs[0].innerHTML = dict.carp.th_street_name;
      streetsThs[1].innerHTML = dict.carp.th_zone_type;
      streetsThs[2].innerHTML = `${dict.carp.th_nodes} <button type="button" class="help-faq-btn" onclick="openFaqHelpModal('nodes-explained')">?</button>`;
      streetsThs[3].innerHTML = `${dict.carp.th_demand_qt} <button type="button" class="help-faq-btn" onclick="openFaqHelpModal('linear-density')">?</button>`;
      streetsThs[4].innerHTML = `${dict.carp.th_transit_cost} <button type="button" class="help-faq-btn" onclick="openFaqHelpModal('deadhead')">?</button>`;
    }

    const vehThs = document.querySelectorAll('#carpVehiclesTable thead th');
    if (vehThs.length >= 8) {
      vehThs[1].innerText = dict.carp.th_compactor_name;
      vehThs[2].innerHTML = `${dict.carp.th_payload_qt} <button type="button" class="help-faq-btn" onclick="openFaqHelpModal('fleet-file-import')">?</button>`;
      vehThs[3].innerHTML = `${dict.carp.th_crew_size} <button type="button" class="help-faq-btn" onclick="openFaqHelpModal('fleet-file-import')">?</button>`;
      vehThs[4].innerText = dict.carp.th_crew_rate;
      vehThs[5].innerText = dict.carp.th_truck_daily;
      vehThs[6].innerText = dict.carp.th_fixed_cost;
      vehThs[7].innerText = dict.carp.th_km_cost;
    }

    // CARP & CVRP File Import / Template Buttons
    const btnCarpFleetImport = document.querySelector('button[onclick*="triggerFleetFileImport()"]');
    if (btnCarpFleetImport) btnCarpFleetImport.innerText = dict.carp.btn_fleet_import;
    const btnCarpFleetTpl = document.querySelector('button[onclick*="downloadFleetTemplate(\'csv\')"]');
    if (btnCarpFleetTpl) btnCarpFleetTpl.innerText = dict.carp.btn_fleet_template;
    const btnCarpAddVeh = document.querySelector('button[onclick*="addCarpVehicleRow()"]');
    if (btnCarpAddVeh) btnCarpAddVeh.innerText = dict.carp.btn_add_vehicle;

    const btnCarpStreetsImport = document.querySelector('button[onclick*="triggerStreetsFileImport()"]');
    if (btnCarpStreetsImport) btnCarpStreetsImport.innerText = dict.carp.btn_streets_import;
    const btnCarpStreetsTpl = document.querySelector('button[onclick*="downloadStreetsTemplate(\'csv\')"]');
    if (btnCarpStreetsTpl) btnCarpStreetsTpl.innerText = dict.carp.btn_streets_template;

    const searchInp = document.getElementById('carpStreetSearch');
    if (searchInp) searchInp.placeholder = dict.carp.search_placeholder;

    // Wizard Fleet Table Headers
    const wizThs = document.querySelectorAll('#wizardFleetTable thead th');
    if (wizThs.length >= 9) {
      wizThs[0].innerText = dict.wizard.th_type;
      wizThs[1].innerText = dict.wizard.th_qty;
      wizThs[2].innerText = dict.wizard.th_cap_kg;
      wizThs[3].innerText = dict.wizard.th_driver_h;
      wizThs[4].innerText = dict.wizard.th_crew;
      wizThs[5].innerText = dict.wizard.th_shift_h;
      wizThs[6].innerText = dict.wizard.th_truck_d;
      wizThs[7].innerText = dict.wizard.th_fixed_cost;
      wizThs[8].innerText = dict.wizard.th_cost_km;
    }

    // Driver Sheet Modal
    const driverModalTitle = document.getElementById('driverSheetTitle');
    if (driverModalTitle && !driverModalTitle.querySelector('b')) {
      driverModalTitle.innerHTML = `<span>📋</span> ${dict.driver_sheet.title}`;
    }
    const btnPrintDriver = document.querySelector('button[onclick*="printDriverSheet"]');
    if (btnPrintDriver) btnPrintDriver.innerText = dict.driver_sheet.btn_print;
    const btnCopyDriver = document.querySelector('button[onclick*="copyDriverSheetText"]');
    if (btnCopyDriver) btnCopyDriver.innerText = dict.driver_sheet.btn_copy;

    // ROI Tab
    const roiCardTitle = document.querySelector('#tab-roi .card-title > span:last-child');
    if (roiCardTitle) roiCardTitle.innerText = dict.roi.title;
    const roiBadge = document.querySelector('#tab-roi .badge-free');
    if (roiBadge) roiBadge.innerText = dict.roi.badge;
    const roiFleetH4 = document.querySelector('#tab-roi h4');
    if (roiFleetH4) roiFleetH4.innerText = dict.roi.fleet_params;

    // 7. FAQ Tab & 23 Questions
    const faqCardTitle = document.querySelector('#tab-faq .card-title > span:last-child');
    if (faqCardTitle) faqCardTitle.innerText = dict.faq_group.card_title;
    const faqCardBadge = document.querySelector('#tab-faq .badge-free');
    if (faqCardBadge) faqCardBadge.innerText = dict.faq_group.card_badge;

    const faqFilters = document.querySelectorAll('.faq-filter-bar .faq-filter-btn');
    if (faqFilters.length >= 5) {
      faqFilters[0].innerText = dict.faq_group.filter_all;
      faqFilters[1].innerText = dict.faq_group.filter_guide;
      faqFilters[2].innerText = dict.faq_group.filter_faq;
      faqFilters[3].innerText = dict.faq_group.filter_milp;
      faqFilters[4].innerText = dict.faq_group.filter_biblio;
    }

    const btnExpFaq = document.querySelector('#tab-faq button[onclick*="toggleAllFaq(true)"]');
    if (btnExpFaq) btnExpFaq.innerText = dict.faq_group.btn_expand_all;
    const btnColFaq = document.querySelector('#tab-faq button[onclick*="toggleAllFaq(false)"]');
    if (btnColFaq) btnColFaq.innerText = dict.faq_group.btn_collapse_all;
    const btnPrintFaq = document.querySelector('#tab-faq button[onclick*="window.print()"]');
    if (btnPrintFaq) btnPrintFaq.innerText = dict.faq_group.btn_print_pdf;

    const faqSummaries = document.querySelectorAll('.faq-item .faq-question > span:first-child');
    faqSummaries.forEach((span, idx) => {
      const qNum = idx + 1;
      if (FAQ_TRANSLATIONS[currentLang] && FAQ_TRANSLATIONS[currentLang][qNum]) {
        span.innerText = FAQ_TRANSLATIONS[currentLang][qNum];
      }
    });

    const faqGroupTitles = document.querySelectorAll('.faq-group .faq-group-title');
    if (faqGroupTitles.length >= 3) {
      faqGroupTitles[0].innerHTML = `<span>❓</span> ${dict.faq_group.title_operational.replace('❓ ', '')}`;
      faqGroupTitles[1].innerHTML = `<span>📐</span> ${dict.faq_group.title_theory.replace('📐 ', '')}`;
      faqGroupTitles[2].innerHTML = `<span>📖</span> ${dict.faq_group.title_biblio.replace('📖 ', '')}`;
    }

    // 8. Footer translations
    const footerP = document.querySelector('footer.app-footer p');
    if (footerP) footerP.innerHTML = dict.footer.desc;
    const footerH4s = document.querySelectorAll('footer.app-footer h4');
    if (footerH4s.length >= 2) {
      footerH4s[0].innerText = dict.footer.col_quick;
      footerH4s[1].innerText = dict.footer.col_solvers;
    }
    const footerLinks = document.querySelectorAll('footer.app-footer ul li a');
    if (footerLinks.length >= 5) {
      footerLinks[0].innerHTML = dict.footer.link_wizard;
      footerLinks[1].innerHTML = dict.footer.link_models;
      footerLinks[2].innerHTML = dict.footer.link_sessions;
      footerLinks[3].innerHTML = dict.footer.link_roi;
      footerLinks[4].innerHTML = dict.footer.link_contacts;
    }
    const footerBottom = document.querySelector('.footer-bottom > div:first-child');
    if (footerBottom) footerBottom.innerHTML = dict.footer.copy;

    // 9. Contatti page (se siamo su contatti.html)
    if (window.location.pathname.includes('contatti')) {
      const cHeroBadge = document.querySelector('.contact-badge');
      if (cHeroBadge) cHeroBadge.innerText = dict.contacts_page.hero_badge;
      const cHeroTitle = document.querySelector('.contact-hero h1');
      if (cHeroTitle) cHeroTitle.innerHTML = dict.contacts_page.hero_title;
      const cHeroDesc = document.querySelector('.contact-hero p');
      if (cHeroDesc) cHeroDesc.innerText = dict.contacts_page.hero_desc;

      const catTitle = document.querySelector('.form-group-custom > label');
      if (catTitle && catTitle.innerText.includes('Motivo')) {
        catTitle.innerHTML = `${dict.contacts_page.category_title} <span class="req">*</span>`;
      }

      const pills = document.querySelectorAll('.category-pills .category-pill span');
      if (pills.length >= 6) {
        pills[0].innerText = dict.contacts_page.pill_suggestion;
        pills[1].innerText = dict.contacts_page.pill_support;
        pills[2].innerText = dict.contacts_page.pill_bug;
        pills[3].innerText = dict.contacts_page.pill_fleet;
        pills[4].innerText = dict.contacts_page.pill_partnership;
        pills[5].innerText = dict.contacts_page.pill_other;
      }

      const nameLabel = document.querySelector('label[for="userName"]');
      if (nameLabel) nameLabel.innerHTML = `${dict.contacts_page.name_label} <span class="req">*</span>`;
      const nameInp = document.getElementById('userName');
      if (nameInp) nameInp.placeholder = dict.contacts_page.name_placeholder;

      const emailLabel = document.querySelector('label[for="userEmail"]');
      if (emailLabel) emailLabel.innerHTML = `${dict.contacts_page.email_label} <span class="req">*</span>`;
      const emailInp = document.getElementById('userEmail');
      if (emailInp) emailInp.placeholder = dict.contacts_page.email_placeholder;

      const compLabel = document.querySelector('label[for="userCompany"]');
      if (compLabel) compLabel.innerHTML = `${dict.contacts_page.company_label} <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(${currentLang === 'en' ? 'Optional' : 'Opzionale'})</span>`;
      const compInp = document.getElementById('userCompany');
      if (compInp) compInp.placeholder = dict.contacts_page.company_placeholder;

      const msgLabel = document.querySelector('label[for="formMessage"]');
      if (msgLabel) msgLabel.innerHTML = `${dict.contacts_page.message_label} <span class="req">*</span>`;
      const msgInp = document.getElementById('formMessage');
      if (msgInp) msgInp.placeholder = dict.contacts_page.message_placeholder;

      const btnSubmit = document.getElementById('btnSubmit') || document.getElementById('btnSubmitContact');
      if (btnSubmit) {
        btnSubmit.innerHTML = `<span style="font-size: 18px;">✉️</span> ${dict.contacts_page.btn_submit}`;
      }
      const secNote = document.querySelector('.contact-form-card small');
      if (secNote) secNote.innerText = dict.contacts_page.security_note;

      const backHomeBtn = document.querySelector('header a.btn-home');
      if (backHomeBtn) backHomeBtn.innerHTML = `<span>🏠</span> ${dict.contacts_page.back_home}`;
    }

    // 10. Elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val && val !== key) el.innerText = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = t(key);
      if (val && val !== key) el.innerHTML = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val && val !== key) el.placeholder = val;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (val && val !== key) el.title = val;
    });
  }

  function init() {
    let initialLang = 'it';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      if (urlLang === 'en' || urlLang === 'it') {
        initialLang = urlLang;
      } else {
        const stored = localStorage.getItem('or_route_lang');
        if (stored === 'en' || stored === 'it') initialLang = stored;
      }
    } catch (_) {}

    setLanguage(initialLang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.I18N = I18N;
  window.t = t;
  window.getLanguage = getLanguage;
  window.setLanguage = setLanguage;
})();
