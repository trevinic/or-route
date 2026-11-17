/**
 * OR-Route Universal Internationalization (i18n) Engine
 * Full bilingual support: Italian (IT) & English (EN) across 100% of the portal:
 * - Header, Navigation & Models Dropdown
 * - Landing Page (Hero, Area 1 Wizard & Matrix, Area 2 Direct Models, Area 3 Cloud Sessions)
 * - All 10 Operational Models (CVRP, VRPTW, CARP, EV-VRP, VRPPD, MDVRP, PCARP, CARPTW, CARPIF, DCARP)
 * - Calcolatore ROI & ESG
 * - All 23 FAQs (Questions, Category Filters & Full Technical Answers)
 * - All 12 Modal Overlays (OSM import, login, scenarios, driver sheet, etc.)
 * - Contact Page (contatti.html)
 * - Footer, Buy Me a Coffee & Partners Bar
 * - Universal DOM Text Walker with Smart Matcher (Emojis, Punctuation, Placeholders, Options)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. DIZIONARIO FRASI UNIVOCE (ITALIANO -> INGLESE)
  // =========================================================================
  const DICT_IT_TO_EN = {
  "Home": "Home",
  "Torna alla Landing Page Principale (3 Aree Operative)": "Return to Main Landing Page (3 Operations Areas)",
  "Torna alla Landing Page Principale": "Return to Main Landing Page",
  "Modelli:": "Models:",
  "-- Modello --": "-- Model --",
  "Calcola ROI": "Calculate ROI",
  "Calcola il risparmio economico, il ROI e consulta la Matrice Comparativa dei 10 Modelli": "Calculate economic savings, ROI and explore the 10-Model Comparison Matrix",
  "FAQ": "FAQ",
  "Consulta le FAQ e la documentazione tecnica": "Browse technical FAQs and documentation",
  "Contatti": "Contact Us",
  "Invia richieste, segnalazioni o suggerimenti per la piattaforma": "Send inquiries, feature suggestions, or feedback",
  "Accedi": "Sign In",
  "Accedi per salvare e gestire i tuoi scenari personali": "Sign in to save and sync your fleet scenarios",
  "Esci": "Sign Out",
  "Disconnetti account": "Disconnect account",
  "Predefinito": "Default",
  "Salva": "Save",
  "Salva modifiche attuali in questo scenario": "Save current changes to this scenario",
  "Scenari": "Scenarios",
  "Visualizza, carica o elimina le configurazioni salvate": "View, load or delete saved configurations",
  "Guida su Login e Salvataggio Scenari": "Guide on Login and Scenario Saving",
  "Seleziona la lingua / Select language": "Select language / Seleziona lingua",
  "Lingua Italiana": "Italian Language",
  "English Language": "English Language",
  "Ricerca Operativa & Algoritmi Flotte": "Operations Research & Fleet Logistics",
  "1. CVRP (Merci)": "1. CVRP (Freight)",
  "2. VRPTW (Orari)": "2. VRPTW (Time Windows)",
  "3. CARP (RSU/Strade)": "3. CARP (Waste/Streets)",
  "4. EV-VRP (Ricariche)": "4. EV-VRP (Charging)",
  "5. VRPPD (Ritiri)": "5. VRPPD (Pickups)",
  "6. MDVRP (Depositi)": "6. MDVRP (Multi-Depot)",
  "7. PCARP (Settimanale)": "7. PCARP (Periodic)",
  "8. CARPTW (ZTL)": "8. CARPTW (ZTL/Curfew)",
  "9. CARPIF (Impianti)": "9. CARPIF (Facilities)",
  "10. DCARP (Dinamico)": "10. DCARP (Dynamic)",
  "CVRP (Merci)": "CVRP (Freight)",
  "VRPTW (Orari)": "VRPTW (Time Windows)",
  "CARP (RSU/Strade)": "CARP (Waste/Streets)",
  "EV-VRP (Ricariche)": "EV-VRP (Charging)",
  "VRPPD (Ritiri)": "VRPPD (Pickups)",
  "MDVRP (Depositi)": "MDVRP (Multi-Depot)",
  "PCARP (Settimanale)": "PCARP (Periodic)",
  "CARPTW (ZTL)": "CARPTW (ZTL/Curfew)",
  "CARPIF (Impianti)": "CARPIF (Facilities)",
  "DCARP (Dinamico)": "DCARP (Dynamic)",
  "Consegne Merci & Portata Max": "Freight Deliveries & Max Capacity",
  "Finestre Orarie Tassative": "Strict Customer Time Windows",
  "Spazzamento Strade & RSU": "Street Sweeping & Curbside Waste",
  "Flotte Elettriche & Ricarica": "Electric Fleets & Recharging Stops",
  "Ritiri & Consegne Accoppiati": "Paired Pickups & Deliveries",
  "Multi-Deposito Territoriale": "Multi-Depot Territory Partitioning",
  "Raccolta Rifiuti Periodica": "Periodic Multi-Day Waste Schedules",
  "Servizi Stradali con ZTL": "Street Sweeping with Access Curfews",
  "Scarichi Intermedi & Discariche": "Intermediate Landfills & Unloading",
  "Riassegnazione Dinamica & Guasti": "Dynamic Rerouting & Breakdown Response",
  "Suite Cloud di Ricerca Operativa • 100% Accesso Gratuito": "Cloud Operations Research Suite • 100% Free Access",
  "Ottimizzazione Avanzata di Percorsi, Logistica & Flotte": "Advanced Route, Fleet & Logistics Optimization",
  "Ottimizza i Percorsi della Tua Flotta e Riduci i Costi fino al": "Optimize Your Fleet Routes and Reduce Costs up to",
  "35% con Algoritmi Matematici Esatti": "35% with Exact Mathematical Solvers",
  "Algoritmi esatti MILP ed euristiche ad alte prestazioni per la raccolta rifiuti porta a porta (CARP), consegne merci (CVRP), finestre orarie (VRPTW) e veicoli elettrici.": "Exact MILP algorithms and high-performance heuristics for curbside waste collection (CARP), freight delivery (CVRP), strict time windows (VRPTW), and electric vehicles.",
  "Benvenuto in": "Welcome to",
  ": la piattaforma professionale basata su solutori": ": the professional platform powered by",
  "MILP (COIN-OR CBC & PuLP)": "MILP (COIN-OR CBC & PuLP)",
  "e cartografia stradale reale": "and real street cartography",
  "OpenStreetMap GIS": "OpenStreetMap GIS",
  "per aziende di logistica, corrieri espresso e igiene ambientale RSU. Scegli una delle": "for logistics companies, express couriers, and municipal waste services. Choose one of the",
  "3 aree operative": "3 operational areas",
  "qui sotto per iniziare subito:": "below to start immediately:",
  "10 Modelli Matematici": "10 Mathematical Models",
  "(Node & Arc Routing)": "(Node & Arc Routing)",
  "Mappe Reali OpenStreetMap": "Real OpenStreetMap Maps",
  "& Fogli di Viaggio Autista": "& Driver Route Sheets",
  "Salvataggio Sessioni Cloud": "Cloud Session Saving",
  "& Backup Locale (.json)": "& Local Backup (.json)",
  "Calcolo ROI": "ROI Calculator",
  "Calcolo Risparmio ROI": "ROI Savings Calculator",
  "& Riduzione Emissioni $CO_2$": "& CO2 Emissions Reduction",
  "& Riduzione Emissioni CO2": "& CO2 Emissions Reduction",
  "AREA 1 • GUIDA ALLA SCELTA": "AREA 1 • MODEL SELECTION GUIDE",
  "AREA 1 • PERCORSO GUIDATO": "AREA 1 • GUIDED WALKTHROUGH",
  "1. Compila la Guida per la Scelta del Modello": "1. Interactive Model Selector & Wizard",
  "Non sai quale algoritmo matematico si adatta meglio alla tua azienda? Rispondi a": "Not sure which mathematical algorithm best fits your company? Answer",
  "7 domande operative": "7 operational questions",
  "e calibra il tuo parco mezzi per ottenere il modello ideale.": "and calibrate your fleet to get the ideal model recommendation.",
  "Diagnosi Guidata dei Vincoli": "Guided Constraint Assessment",
  "Consegne a clienti singoli o raccolta lungo strade, finestre orarie ZTL, soste intermedie e multi-deposito.": "Deliveries to discrete stops or street collection, ZTL curfews, intermediate stops, and multi-depot logistics.",
  "Configuratore Flotta Eterogenea": "Heterogeneous Fleet Configurator",
  "Calcola in automatico il costo fisso per turno (autisti, operatori, ammortamento) e la tariffa media €/km.": "Automatically calculates fixed shift costs (drivers, crew labor, vehicle lease) and average €/km rates.",
  "Iniezione Diretta su Mappa GIS": "Direct Injection to GIS Map",
  "Trasferisce con 1 click tutti i veicoli configurati direttamente nel modello matematico consigliato.": "Transfers all configured fleet vehicles with 1 click directly into the recommended mathematical model.",
  "Raccomandazione Attuale Guida:": "Current Guided Recommendation:",
  "🧭 Compila la Guida Passo-Passo ↓": "🧭 Complete the Guided Step-by-Step Wizard ↓",
  "🚛 Calibra Costi Flotta": "🚛 Calibrate Fleet Costs",
  "📊 Confronta Modelli": "📊 Compare Models",
  "Avvia Step-by-Step (3 Domande)": "Start Step-by-Step (3 Questions)",
  "Configura la Flotta": "Configure Fleet",
  "Matrice di Confronto dei 10 Modelli": "10-Model Comparison Matrix",
  "Area 1 — Guida Interattiva per la Scelta del Modello & Configuratore Flotta": "Area 1 — Interactive Model Selection Guide & Fleet Configurator",
  "Espandi Guida": "Expand Guide",
  "Comprimi Guida": "Collapse Guide",
  "Consulenza Intelligente & Calibrazione Costi": "Smart Advisory & Cost Calibration",
  "AREA 2 • SCELTA DIRETTA": "AREA 2 • DIRECT MODEL SELECTION",
  "AREA 2 • ACCESSO DIRETTO": "AREA 2 • DIRECT ACCESS",
  "2. Scegli Direttamente tra i 10 Modelli di Ricerca Operativa": "2. Choose Directly from the 10 Operations Research Models",
  "2. Scegli Già il Modello Direttamente": "2. Choose Directly from the 10 Models",
  "Conosci già il modello di Ricerca Operativa che ti occorre? Salta il questionario ed entra subito nella dashboard di calcolo e cartografia GIS:": "Already know the Operations Research model you need? Skip the questionnaire and jump directly into the computing and GIS dashboard:",
  "📦 Logistica & Corrieri (5)": "📦 Logistics & Couriers (5)",
  "🚛 Rifiuti RSU & Strade (5)": "🚛 Municipal Waste & Streets (5)",
  "Tutti (10 Modelli)": "All (10 Models)",
  "Tutti (10)": "All (10)",
  "📦 Problemi sui Nodi (CVRP, VRPTW, EV-VRP, VRPPD, MDVRP)": "📦 Node Routing (CVRP, VRPTW, EV-VRP, VRPPD, MDVRP)",
  "🚛 Problemi sugli Archi / Strade (CARP, PCARP, CARPTW, CARPIF, DCARP)": "🚛 Arc / Street Routing (CARP, PCARP, CARPTW, CARPIF, DCARP)",
  "Oppure seleziona dal menu completo e avvia:": "Or select from full menu and launch:",
  "Oppure seleziona e avvia subito:": "Or select and launch immediately:",
  "🚀 Apri Modello Selezionato": "🚀 Launch Selected Model",
  "🚀 Apri →": "🚀 Launch →",
  "Apri →": "Launch →",
  "AREA 3 • SESSIONI SALVATE": "AREA 3 • SAVED SESSIONS",
  "3. Accedi per Ricominciare dalle Sessioni Salvate": "3. Sign In to Resume from Saved Sessions",
  "Riprendi il tuo lavoro da dove l'avevi lasciato: carica le tue mappe comunali, le flotte e i turni salvati nel tuo profilo personale o da un file locale.": "Pick up right where you left off: load your municipal maps, vehicle fleets, and optimized shifts saved to your personal profile or from a local file.",
  "🔑 Accesso Rapido Account Cloud": "🔑 Quick Cloud Account Sign-in",
  "+ Crea Account": "+ Create Account",
  "Nome utente o email (es. mario.rossi)": "Username or email (e.g. john.doe)",
  "Password ••••••••": "Password ••••••••",
  "🔓 Accedi e Carica le Tue Sessioni": "🔓 Sign In & Load Your Sessions",
  "Nuovo su OR-Route?": "New to OR-Route?",
  "📝 Registrati Gratis": "📝 Register Free",
  "💻 Backup Sessione su File Locale (.json)": "💻 Local Session Backup (.json)",
  "Senza Login": "No Login Required",
  "📤 Carica File .JSON": "📤 Load .JSON File",
  "📥 Esporta .JSON": "📥 Export .JSON",
  "🟢 SESSIONE UTENTE ATTIVA": "🟢 ACTIVE USER SESSION",
  "🕒 Ultime Sessioni Salvate (Clicca per ricominciare):": "🕒 Recent Saved Sessions (Click to resume):",
  "📂 Apri Archivio Sessioni": "📂 Open Scenarios Library",
  "💾 Salva Lavoro Attuale": "💾 Save Active Work",
  "Carica un file .json di sessione salvato sul tuo computer": "Load a session .json file from your computer",
  "Esporta l'intera sessione corrente in un file .json sul tuo PC": "Export the current session to a .json file on your PC",
  "PARTE 1 — STRATEGIA OPERATIVA E TIPO DI SERVIZIO": "PART 1 — OPERATIONAL STRATEGY & SERVICE TYPE",
  "1. Dove deve operare la tua flotta?": "1. Where does your fleet operate?",
  "📍 Presso singoli Clienti / Punti": "📍 At Discrete Customers / Points",
  "Presso singoli Clienti / Punti": "At Discrete Customers / Points",
  "Consegne a negozi, farmacie, e-commerce, supermercati o interventi tecnici a domicilio.": "Deliveries to retail stores, pharmacies, e-commerce customers, supermarkets, or on-site service technicians.",
  "🛣️ Lungo Intere Strade / Reti Viarie": "🛣️ Along Entire Streets / Road Networks",
  "Lungo Intere Strade / Reti Viarie": "Along Entire Streets / Road Networks",
  "Raccolta rifiuti porta a porta, spazzatrici stradali, sgombero neve, ispezione condotte.": "Curbside waste collection, mechanical street sweeping, winter snow removal, sewer/pipe inspection.",
  "2. I viaggi prevedono ritiri e consegne accoppiati (Pickup & Delivery) nello stesso itinerario?": "2. Do routes involve paired pickups and deliveries (Pickup & Delivery) in the same trip?",
  "❌ No, solo consegne o solo ritiri": "❌ No, outbound deliveries only or inbound pickups only",
  "No, solo consegne o solo ritiri": "No, outbound deliveries only or inbound pickups only",
  "I mezzi partono dall'hub con tutto il carico da consegnare, oppure raccolgono e rientrano.": "Vehicles depart from the depot with all payload to deliver, or collect waste and return to base.",
  "📦🔄 Sì, Ritiro presso A e Consegna a B per lo stesso cliente": "📦🔄 Yes, Pickup at A and Delivery to B for the same order",
  "Sì, Ritiro presso A e Consegna a B per lo stesso cliente": "Yes, Pickup at A and Delivery to B for the same order",
  "Corrieri espresso, noleggi con conducente merci, navette merci o ritiri ingombranti e recapito a cantiere.": "Express couriers, freight shuttles, inter-facility transfer, or bulky waste collection and transfer.",
  "3. L'azienda dispone di più magazzini, depositi o cantieri logistici sul territorio?": "3. Does the company operate from multiple depots, warehouses, or logistics facilities?",
  "🏢 Hub Singolo Centralizzato": "🏢 Single Centralized Logistics Hub",
  "Hub Singolo Centralizzato": "Single Centralized Logistics Hub",
  "Tutti i mezzi della flotta partono e tornano al medesimo magazzino centrale.": "All fleet vehicles depart from and return to the same central warehouse/depot.",
  "🏢🏢 Più Hub / Magazzini Periferici (Multi-Deposito)": "🏢🏢 Multiple Hubs / Regional Warehouses (Multi-Depot)",
  "Più Hub / Magazzini Periferici (Multi-Deposito)": "Multiple Hubs / Regional Warehouses (Multi-Depot)",
  "Ogni mezzo parte dal proprio cantiere di appartenenza; ciascun cliente deve essere assegnato al deposito più vicino.": "Each truck departs from its assigned home depot; each customer must be allocated to the most cost-effective facility.",
  "4. Hai orari tassativi o finestre orarie di consegna rigide?": "4. Do customers impose strict time windows or mandatory appointment curfews?",
  "🟢 Orari Flessibili / Entro la Giornata": "🟢 Flexible Hours / Anytime During the Shift",
  "Orari Flessibili / Entro la Giornata": "Flexible Hours / Anytime During the Shift",
  "La consegna o la raccolta può avvenire in qualunque momento del turno operativo.": "Delivery or collection can be carried out at any time during the regular working shift.",
  "⏱️ Finestre Orarie Rigide (es. 09:00 - 10:30)": "⏱️ Strict Time Windows (e.g. 09:00 - 10:30)",
  "Finestre Orarie Rigide (es. 09:00 - 10:30)": "Strict Time Windows (e.g. 09:00 - 10:30)",
  "Baie di scarico prenotate, scadenze farmaci, freschi alimentari o appuntamenti orari con il cliente.": "Reserved loading bays, perishable food deliveries, hospital pharma shipments, or time-slotted appointments.",
  "5. I veicoli devono fermarsi a metà turno per svuotare o ricaricare?": "5. Do vehicles need mid-shift stops to unload waste or recharge batteries?",
  "❌ No, rientro diretto a fine turno": "❌ No, direct return to depot at end of shift",
  "No, rientro diretto a fine turno": "No, direct return to depot at end of shift",
  "I mezzi partono dal deposito carico/vuoto e rientrano una sola volta a fine giornata.": "Vehicles depart loaded/empty and return just once at the end of the working day.",
  "🔄 Sì, Scarico in Discarica / Ricarica Elettrica": "🔄 Yes, Intermediate Disposal at Landfill / Fast Charging",
  "Sì, Scarico in Discarica / Ricarica Elettrica": "Yes, Intermediate Disposal at Landfill / Fast Charging",
  "Svuotamento rifiuti in impianti TMB o ricarica rapida intermedia lungo il turno (flotte EV).": "Emptying waste at MBT treatment plants/landfills or intermediate DC fast charging during the shift (EV fleets).",
  "6. Per i servizi stradali (RSU): la raccolta segue un calendario settimanale multi-giorno (frequenze differenziate per frazione)?": "6. For street services (waste): does collection follow a multi-day weekly schedule with different fraction frequencies?",
  "❌ No, pianificazione a turno singolo": "❌ No, single-shift daily planning",
  "No, pianificazione a turno singolo": "No, single-shift daily planning",
  "Tutte le vie vengono servite nel turno ordinario senza differenziazione di calendario settimanale.": "All streets are serviced within the regular shift without multi-day weekly cycle differences.",
  "📅 Sì, Calendario Settimanale (es. Lun-Sab con frazioni differenziate)": "📅 Yes, Weekly Multi-Day Schedule (e.g. Mon-Sat with sorted fractions)",
  "Sì, Calendario Settimanale (es. Lun-Sab con frazioni differenziate)": "Yes, Weekly Multi-Day Schedule (e.g. Mon-Sat with sorted fractions)",
  "Organico a giorni alterni, carta martedì, plastica mercoledì, secco venerdì: ottimizzazione flotta sui 6 giorni (PCARP).": "Organic every other day, paper on Tuesday, plastic Wednesday, residual on Friday: 6-day fleet optimization (PCARP).",
  "7. Per i servizi stradali: esistono orari di passaggio tassativi su specifiche vie (ZTL, scuole, mercati)?": "7. For street services: are there strict passage time windows on specific streets (ZTL curfews, schools, open-air markets)?",
  "❌ No, viabilità libera durante tutto il turno": "❌ No, unrestricted street access throughout entire shift",
  "No, viabilità libera durante tutto il turno": "No, unrestricted street access throughout entire shift",
  "I mezzi possono percorrere e pulire le vie in qualsiasi momento della giornata lavorativa.": "Vehicles can traverse and clean streets at any time during the operating shift.",
  "⏱️🛣️ Sì, Fasce Orarie Tassative su Strade (ZTL entro 07:30, Scuole, Mercati)": "⏱️🛣️ Yes, Strict Street Time Windows (ZTL before 07:30, Schools, Markets)",
  "Sì, Fasce Orarie Tassative su Strade (ZTL entro 07:30, Scuole, Mercati)": "Yes, Strict Street Time Windows (ZTL before 07:30, Schools, Markets)",
  "Servizio da completare prima dell'apertura negozi o varchi ZTL, oppure post-smontaggio bancarelle (CARPTW).": "Service must be completed before pedestrian zone opening or school arrivals, or after market stall dismantling (CARPTW).",
  "PARTE 2 — COMPOSIZIONE FLOTTA ETEROGENEA & SPECIFICHE DI COSTO PER TIPOLOGIA DI MEZZO": "PART 2 — HETEROGENEOUS FLEET COMPOSITION & COST SPECIFICATIONS BY VEHICLE TYPE",
  "Inserisci le diverse tipologie di mezzi presenti nella tua azienda. Per ciascuna puoi impostare": "Enter the various vehicle categories in your fleet. For each type you can set",
  "quantità, portata massima, equipaggio, costo orario autista, quota mezzo e costo al km": "quantity, maximum payload, crew size, driver hourly wage, vehicle lease rate, and mileage cost",
  ". Il sistema calcola automaticamente il": ". The system automatically computes the",
  "Costo Fisso per Turno": "Fixed Cost per Shift",
  "= (Costo Orario × Operatori × Ore Turno) + Quota Mezzo.": "= (Hourly Rate × Crew Members × Shift Hours) + Daily Vehicle Fee.",
  "Carica Preset Rapido:": "Load Quick Fleet Preset:",
  "🚛 Igiene Urbana RSU (Mix Furgoni + 2 Assi)": "🚛 Municipal Waste RSU (Mix Vans + 2-Axle)",
  "📦 Corrieri Merci (City Van + Furgoni Medi)": "📦 Freight Couriers (City Vans + Mid Trucks)",
  "🏢 Flotta Pesante Regionale (2 Assi + 3 Assi)": "🏢 Regional Heavy Fleet (2-Axle + 3-Axle)",
  "🚐 Monotipo Standard": "🚐 Standard Monotype Fleet",
  "📁 Carica Flotta da File": "📁 Import Fleet from File",
  "📥 Template Flotta (.csv)": "📥 Fleet Template (.csv)",
  "+ Aggiungi Nuova Tipologia di Mezzo": "+ Add New Vehicle Category",
  "💡 Modifica direttamente i valori nelle celle: il costo fisso e i totali si aggiornano in tempo reale.": "💡 Edit cell values directly: fixed costs and fleet totals update in real time.",
  "Veicoli Totali Flotta": "Total Fleet Vehicles",
  "Mezzi pronti all'uscita": "Vehicles ready for departure",
  "Capacità Carico Totale": "Total Payload Capacity",
  "Carico utile cumulato": "Cumulative usable capacity",
  "Costo Fisso Totale Flotta": "Total Fleet Fixed Cost",
  "Manodopera + Ammortamento": "Labor + Vehicle Depreciation",
  "Costo Medio al Km": "Average Cost per Km",
  "Ponderato sul parco mezzi": "Weighted across vehicle fleet",
  "Tempo Medio di Sosta per Consegna / Svuotamento Via:": "Average Stop Time per Delivery / Street Emptying:",
  "Influisce sulla durata del giro operativo e sul rispetto delle finestre orarie": "Impacts total route duration and time window compliance",
  "⚡ Inietta Questa Flotta nel Modello & Avvia Simulazione ➔": "⚡ Inject This Fleet into Recommended Model & Start Simulation ➔",
  "💾 Salva Scenario nel Profilo": "💾 Save Scenario to Profile",
  "📊 Matrice Comparativa Completa dei 10 Modelli di Ricerca Operativa per Fleet Management & Impatto ROI": "📊 Comprehensive 10-Model Comparison Matrix for Fleet Management & ROI Impact",
  "Confronta il risparmio medio chilometrico, l'abbattimento dei transiti a vuoto (deadheading) e i benefici operativi garantiti da ciascuno dei 10 modelli matematici della suite:": "Compare average mileage savings, deadhead transit elimination, and operational benefits delivered by each of the 10 mathematical models:",
  "Modello Matematico": "Mathematical Model",
  "Target Aziendale Tipico": "Typical Business Target",
  "Elemento Servito": "Serviced Element",
  "Vincoli Chiave": "Key Constraints",
  "Risparmio Medio": "Average Savings",
  "Accesso Diretto": "Direct Launch",
  "Corrieri, Food & Beverage, Forniture B2B": "Couriers, Food & Beverage, B2B Deliveries",
  "Nodi discreti (Clienti)": "Discrete Nodes (Customers)",
  "Portata veicoli, sottogiri MTZ": "Vehicle payload, MTZ subtour elimination",
  "18% - 24% km": "18% - 24% km",
  "GDO, Farmaceutico, Tecnici a Domicilio": "Retail GDO, Pharma, Field Technicians",
  "Nodi discreti con orari": "Discrete Nodes with Schedules",
  "Finestre temporali [a_i, b_i], tempi sosta": "Time windows [a_i, b_i], dwell times",
  "22% - 30% tempi": "22% - 30% times",
  "Igiene Urbana RSU, Pulizia Strade, Neve": "Municipal Waste RSU, Street Sweeping, Snow",
  "Archi / Tratte viarie": "Arcs / Road Segments",
  "Eliminazione passaggi a vuoto, Single-Commodity Flow": "Deadhead elimination, Single-Commodity Flow",
  "25% - 35% deadhead": "25% - 35% deadhead",
  "Flotte Elettriche, Smaltimento con Tappe": "Electric Fleets, Waste Disposal with Intermediate Stops",
  "Nodi intermedi multipli": "Multiple intermediate nodes",
  "Ripristino portata/batteria agli impianti intermedi": "Payload/battery replenishment at intermediate facilities",
  "Ottimizzazione cicli": "Cycle optimization",
  "Corrieri Espresso, Ritiri & Consegne Accoppiati": "Express Couriers, Paired Pickups & Deliveries",
  "Coppie Ritiro-Consegna": "Pickup-Delivery Pairs",
  "Precedenza P_i → D_i, accoppiamento veicolo, carico dinamico": "Precedence P_i → D_i, vehicle pairing, dynamic payload",
  "25% - 40% km": "25% - 40% km",
  "Aziende con più Magazzini, Depositi Distribuiti": "Companies with Multiple Warehouses, Distributed Depots",
  "Clienti da più depositi": "Customers served from multiple depots",
  "Partenza e rientro nello stesso Home Depot, clusterizzazione ottimale": "Departure & return to same Home Depot, optimal clustering",
  "20% - 30% km flotta": "20% - 30% fleet km",
  "Raccolta Differenziata Settimanale Lun-Sab": "Weekly Multi-Day Waste Collection Mon-Sat",
  "Archi multi-periodo": "Multi-period arcs",
  "Calendario frazioni (Umido, Carta, Plastica, Vetro, Secco)": "Waste fraction calendar (Organic, Paper, Plastic, Glass, Residual)",
  "Bilanciamento 6gg": "6-Day Workload Balancing",
  "Spazzamento & RSU con Varchi ZTL / Scuole": "Street Sweeping & Waste with ZTL Curfews / Schools",
  "Archi con fasce orarie": "Arcs with time windows",
  "Sincronizzazione cronologica vie e rispetto tassativo ZTL": "Chronological street sequencing and strict ZTL adherence",
  "0% violazioni ZTL": "0% ZTL violations",
  "Grandi Comuni con Scarichi Intermedi TMB": "Large Municipalities with Intermediate MBT Landfills",
  "Archi + Impianti TMB": "Arcs + MBT Facilities",
  "Svuotamenti multipli compattatore durante lo stesso turno": "Multiple compactor dumps within single shift",
  "+40% autonomia turno": "+40% shift capacity",
  "Gestione Emergenze Real-Time & Guasti Mezzi": "Real-Time Emergency Management & Truck Breakdowns",
  "Archi dinamici + GPS": "Dynamic arcs + GPS",
  "Compiti virtuali e ricalcolo istantaneo su imprevisti stradali": "Virtual tasks & instantaneous recalculation on road events",
  "Resilienza Real-Time": "Real-Time Resilience",
  "+ Aggiungi Cliente": "+ Add Customer",
  "+ Aggiungi Compattatore": "+ Add Compactor",
  "+ Aggiungi Deposito": "+ Add Depot",
  "+ Aggiungi Destinazione": "+ Add Destination",
  "+ Aggiungi Impianto IF": "+ Add IF Facility",
  "+ Aggiungi Veicolo": "+ Add Vehicle",
  "+ Aggiungi Veicolo EV": "+ Add EV Vehicle",
  "+ Aggiungi Via": "+ Add Street",
  "+ Aggiungi Via / Frequenza": "+ Add Street / Frequency",
  "+ Aggiungi Via con Orario": "+ Add Street with Time Window",
  "+ Cliente": "+ Customer",
  "+ Impianto/Colonnina": "+ Facility/Charger",
  "+ Nuovo Deposito": "+ New Depot",
  "+ Richiesta Ritiro/Consegna": "+ Pickup/Delivery Request",
  "⚡ Risolvi & Ottimizza Flotta": "⚡ Solve & Optimize Fleet",
  "⚡ Risolvi VRPTW con Finestre Orarie": "⚡ Solve VRPTW with Time Windows",
  "⚡ Risolvi Modello CARP (Algoritmo Esatto / Euristiche)": "⚡ Solve CARP Model (Exact MILP / Heuristics)",
  "⚡ Risolvi & Aggiorna Mappa GIS": "⚡ Solve & Update GIS Map",
  "⚡ Risolvi Flotta Elettrica": "⚡ Solve Electric Fleet",
  "⚡ Risolvi VRPPD Accoppiato": "⚡ Solve Paired VRPPD",
  "⚡ Risolvi MDVRP Multi-Sito": "⚡ Solve Multi-Site MDVRP",
  "⚡ Risolvi Calendario Settimanale PCARP": "⚡ Solve PCARP Weekly Calendar",
  "⚡ Risolvi CARPTW con Finestre Orarie": "⚡ Solve CARPTW with Time Windows",
  "🔄 Ripristina Default": "🔄 Reset to Defaults",
  "🔄 Ripristina Scenario Dinamico": "🔄 Reset Dynamic Scenario",
  "🚨 Simula Evento & Ricalcola (Re-Optimization)": "🚨 Simulate Event & Re-Optimize",
  "📁 Carica da File": "📁 Import from File",
  "📁 Carica da File (Excel / CSV / TXT)": "📁 Import from File (Excel / CSV / TXT)",
  "📁 Carica Flotta da File (Excel / CSV / TXT)": "📁 Import Fleet from File (Excel / CSV / TXT)",
  "📥 Template": "📥 Template",
  "📥 Template Utenze (.csv)": "📥 Demands Template (.csv)",
  "📥 Template Vie & Utenze (.csv)": "📥 Streets & Demands Template (.csv)",
  "🌍 Importa da OpenStreetMap": "🌍 Import from OpenStreetMap",
  "📥 Importa Rete da OpenStreetMap (OSM)": "📥 Import Road Network from OpenStreetMap (OSM)",
  "📥 Importa Rete Stradale da OpenStreetMap (OSM)": "📥 Import Road Network from OpenStreetMap (OSM)",
  "📋 Foglio di Viaggio per l'Autista": "📋 Driver Route Sheet",
  "🖨️ Stampa Foglio": "🖨️ Print Sheet",
  "📋 Copia per Messaggio": "📋 Copy for Messaging",
  "Invia Messaggio": "Send Message",
  "Chiudi": "Close",
  "Annulla": "Cancel",
  "Salva Modifiche": "Save Changes",
  "Scarica Template Flotta (.csv)": "Download Fleet Template (.csv)",
  "Carica Flotta Subito": "Import Fleet Now",
  "Scarica Template Vie & Utenze (.csv)": "Download Demands Template (.csv)",
  "Carica Vie/Utenze Subito": "Import Demands Now",
  "Applica Storico": "Apply Historical Total",
  "🔄 Ricalcola Vie & Adatta Flotta": "🔄 Recalculate Streets & Adapt Fleet",
  "✂️ Split & Ricalcola": "✂️ Split & Recalculate",
  "Nascondi mezzi di riserva non utilizzati": "Hide unused standby vehicles",
  "Azioni": "Actions",
  "Batteria (kWh)": "Battery (kWh)",
  "Capacità Cassone (kg)": "Body Capacity (kg)",
  "Capacità Residua (kg)": "Residual Capacity (kg)",
  "Capacità Totale (kg)": "Total Capacity (kg)",
  "Carico": "Load",
  "Carico (kg)": "Load (kg)",
  "Carico a Bordo (kg)": "Onboard Load (kg)",
  "Cliente / Destinazione": "Customer / Destination",
  "Cliente / Indirizzo": "Customer / Address",
  "Coeff. (kg/m)": "Coeff. (kg/m)",
  "Coeff. Attivo": "Active Coeff.",
  "Colore": "Color",
  "Compattatore": "Compactor",
  "Compattatore / Nome": "Compactor / Name",
  "Consumo (kWh/km)": "Consumption (kWh/km)",
  "Costo (€/km)": "Cost (€/km)",
  "Costo En. (€/kWh)": "Energy Cost (€/kWh)",
  "Costo Fisso (€)": "Fixed Cost (€)",
  "Costo Fisso Turno": "Shift Fixed Cost",
  "Costo Servizio": "Service Cost",
  "Costo Sosta (€)": "Stop Cost (€)",
  "Costo Transito": "Transit Cost",
  "Costo Transito (km / min)": "Deadhead Cost (km / min)",
  "Costo km (€)": "Cost per km (€)",
  "Costo per km (€)": "Cost per km (€)",
  "Costo Chilometrico Carburante/Usura:": "Fuel/Wear Mileage Cost:",
  "Costo Chilometrico:": "Mileage Cost:",
  "Velocità Flotta Urbana:": "Urban Fleet Speed:",
  "Velocità Urbana (km/h):": "Urban Speed (km/h):",
  "Da (u)": "From (u)",
  "A (v)": "To (v)",
  "Densità Lineare Reale (kg/m)": "Linear Density (kg/m)",
  "Descrizione & Formato": "Description & Format",
  "Descrizione & Unità di Misura": "Description & Unit of Measure",
  "Destinazione": "Destination",
  "Domanda (kg)": "Demand (kg)",
  "Domanda (qt)": "Demand (qt)",
  "Domanda RSU (qt)": "Waste Demand (qt)",
  "Domanda Rifiuti (kg)": "Waste Demand (kg)",
  "Durata": "Duration",
  "Esempio Valore": "Example Value",
  "Fine": "End",
  "Finestra [Inizio - Fine]": "Time Window [Start - End]",
  "Fisso (€)": "Fixed (€)",
  "Flotta Stimata": "Estimated Fleet",
  "Frazione Merceologica": "Waste Fraction",
  "Giorni di Raccolta": "Collection Days",
  "Giro": "Tour",
  "Home Depot Base": "Home Base Depot",
  "ID": "ID",
  "ID Nodo": "Node ID",
  "Impianto / Colonnina": "Facility / Charger",
  "Inizio": "Start",
  "Km": "Km",
  "Lat": "Lat",
  "Latitudine": "Latitude",
  "Lon": "Lon",
  "Longitudine": "Longitude",
  "Lunghezza (km)": "Length (km)",
  "Max Ore Turno": "Max Shift Hours",
  "Mezzo (€/g)": "Vehicle (€/day)",
  "Modelli Compatibili": "Compatible Models",
  "Motivo del Vincolo": "Constraint Rationale",
  "Nodi": "Nodes",
  "Nodi (u ➔ v)": "Nodes (u ➔ v)",
  "Nome Colonna (Header)": "Column Name (Header)",
  "Nome Deposito": "Depot Name",
  "Nome Mezzo": "Vehicle Name",
  "Nome Strada & Giorno": "Street Name & Day",
  "Nome Struttura Intermedia": "Intermediate Facility Name",
  "Nome Tratta": "Segment Name",
  "Nome Via / Quartiere": "Street Name / District",
  "Nome Via / Tratta": "Street / Segment Name",
  "Nome Via / Tratta Stradale": "Street / Road Segment Name",
  "Tipologia / Zona": "Street Category / Zone",
  "Obbligatorio": "Required",
  "Op. (€/h)": "Crew (€/h)",
  "Operatori": "Crew Members",
  "Operatori a Bordo": "Crew on Board",
  "Costo Orario Equipaggio (€/h)": "Crew Hourly Rate (€/h)",
  "Costo Giornaliero Mezzo (€/giorno)": "Truck Daily Cost (€/day)",
  "Costo Fisso di Uscita (€/viaggio)": "Fixed Departure Cost (€/trip)",
  "Costo Chilometrico (€/km)": "Mileage Cost (€/km)",
  "Portata (kg)": "Capacity (kg)",
  "Portata (qt)": "Payload (qt)",
  "Portata Utile (qt)": "Payload Capacity (qt)",
  "Portata Max (kg)": "Max Payload (kg)",
  "Posizione Corrente (Nodo)": "Current Position (Node)",
  "Punto Consegna": "Delivery Point",
  "Qtà": "Qty",
  "Richiesta / Merce": "Demand / Freight",
  "Rifiuti (kg)": "Waste (kg)",
  "Simula": "Simulate",
  "Sosta": "Stop",
  "Stato Dinamico": "Dynamic Status",
  "Stato Operativo": "Operational Status",
  "Tempo Scarico (min)": "Unload Time (min)",
  "Tipologia": "Type",
  "Tipologia Veicolo": "Vehicle Type",
  "N° Veicoli": "Vehicles Qty",
  "Capacità (kg)": "Capacity (kg)",
  "Costo Autista (€/h)": "Driver Cost (€/h)",
  "Equipaggio (#)": "Crew (#)",
  "Ore Turno (h)": "Shift Hours (h)",
  "Noleggio/Ammort. (€/g)": "Daily Lease (€/day)",
  "Costo Fisso Uscita (€)": "Fixed Trip Cost (€)",
  "Costo Carburante (€/km)": "Fuel & Maint (€/km)",
  "Tipologia / Modello Mezzo": "Vehicle Type / Model",
  "Turno (h)": "Shift (h)",
  "Uso nei Modelli": "Usage in Models",
  "Valore Default / Esempio": "Default / Example Value",
  "Veicolo": "Vehicle",
  "Veicolo EV": "EV Vehicle",
  "Via / Destinazione": "Street / Destination",
  "🟠 Consegna (Nome, Lat, Lon)": "🟠 Delivery (Name, Lat, Lon)",
  "🟢 Ritiro (Nome, Lat, Lon)": "🟢 Pickup (Name, Lat, Lon)",
  "Modello CVRP — Ottimizzazione Consegne Merci & Corrieri": "CVRP Model — Freight Delivery & Courier Optimization",
  "Modello VRPTW — Consegne con Finestre Orarie Tassative": "VRPTW Model — Deliveries with Strict Time Windows",
  "Modello CARP — Raccolta Rifiuti Porta a Porta & Servizi Stradali": "CARP Model — Curbside Waste Collection & Street Services",
  "Modello EV-VRP & WCVRPTW-IF — Flotte Elettriche & Scarichi Intermedi": "EV-VRP & WCVRPTW-IF Model — Electric Fleets & Intermediate Unloading",
  "Modello VRPPD — Vehicle Routing with Pickup and Delivery (PDP)": "VRPPD Model — Vehicle Routing with Pickup and Delivery (PDP)",
  "Modello MDVRP — Multi-Depot Vehicle Routing Problem": "MDVRP Model — Multi-Depot Vehicle Routing Problem",
  "Modello PCARP — Periodic Capacitated Arc Routing Problem": "PCARP Model — Periodic Capacitated Arc Routing Problem",
  "Modello CARPTW — Capacitated Arc Routing with Time Windows": "CARPTW Model — Capacitated Arc Routing with Time Windows",
  "Modello CARPIF — Arc Routing con Impianti Intermedi TMB/Discariche": "CARPIF Model — Arc Routing with Intermediate MBT Facilities/Landfills",
  "Modello DCARP — Dynamic Arc Routing con Compiti Virtuali in Tempo Reale": "DCARP Model — Dynamic Arc Routing with Real-Time Virtual Tasks",
  "Hub Centrale:": "Central Hub:",
  "Apertura:": "Opening:",
  "Chiusura:": "Closing:",
  "Base Operativa / Deposito:": "Operating Base / Depot:",
  "Hub Flotta EV:": "EV Fleet Hub:",
  "Inizio Turno Deposito:": "Depot Shift Start:",
  "Fine Turno Limite:": "Max Shift End:",
  "Stato Solutore": "Solver Status",
  "Costo Flotta": "Fleet Cost",
  "Percorrenza Totale": "Total Distance",
  "Carico Trasportato": "Carried Load",
  "Chilometri": "Kilometers",
  "Costo Totale Giro": "Total Tour Cost",
  "Rifiuti Raccolti": "Collected Waste",
  "Compattatori Usati": "Used Compactors",
  "Emissioni CO2 Flotta": "Fleet CO2 Emissions",
  "Km Settimanali": "Weekly Km",
  "Costo Settimana": "Weekly Cost",
  "Media Giornaliera": "Daily Average",
  "Km Percorsi": "Driven Km",
  "Costo Turno": "Shift Cost",
  "Attese a Vuoto": "Idle Wait Time",
  "Conformità Finestre": "Time Window Compliance",
  "Compattatori Attivi": "Active Compactors",
  "Saturazione Media": "Average Saturation",
  "Rete & Efficienza": "Network & Efficiency",
  "Carico Lavoro (qt/km)": "Workload (qt/km)",
  "Tempo Totale (Max 5h)": "Total Time (Max 5h)",
  "Tabella Comparativa Flotta & Fogli di Marcia Compattatori": "Fleet Comparative Table & Compactor March Sheets",
  "🏢 Clienti & Richiesta Merci (kg)": "🏢 Customers & Freight Demand (kg)",
  "🚐 Flotta Mezzi: Portata & Costi Fissi": "🚐 Vehicle Fleet: Payload & Fixed Costs",
  "📍 Destinazioni, Finestre Temporali & Tempi Sosta": "📍 Destinations, Time Windows & Stop Times",
  "🚚 Flotta Mezzi Refrigerati: Portata & Costi Fissi": "🚚 Refrigerated Fleet: Payload & Fixed Costs",
  "📋 Elenco Mezzi Refrigerati Utilizzati & Specifiche di Costo": "📋 Used Refrigerated Vehicles & Cost Specs",
  "🕒 Tabella di Marcia Cronologica (Orari di Arrivo)": "🕒 Chronological Schedule (Arrival Times)",
  "🛣️ Rete Stradale & Domanda Rifiuti (kg)": "🛣️ Road Network & Waste Demand (kg)",
  "🚛 Flotta Mezzi: Specifiche Portata & Costo Fisso": "🚛 Vehicle Fleet: Payload Specs & Fixed Cost",
  "⚡Dashboard Risultati Ottimizzazione CARP & Cartografia GIS": "⚡CARP Optimization Results Dashboard & GIS Mapping",
  "📊Prospetto Merceologico & Stime Rifiuti sul Comune": "📊Waste Fractions & Municipal Volume Estimates",
  "🏢 Clienti / Punti Servizio": "🏢 Customers / Service Stops",
  "⚡ Impianti Intermedi & Stazioni Ricarica Rapida": "⚡ Intermediate Facilities & Fast Charging Stations",
  "🔋 Flotta Veicoli Elettrici: Portata & Batteria": "🔋 Electric Fleet: Payload & Battery",
  "📋 Elenco Mezzi Elettrici Utilizzati & Specifiche di Costo": "📋 Electric Fleet Results & Cost Breakdown",
  "📦 Richieste Accoppiate di Ritiro & Consegna": "📦 Paired Pickup & Delivery Requests",
  "🚐 Flotta Mezzi VRPPD": "🚐 VRPPD Vehicle Fleet",
  "📋 Elenco Mezzi Utilizzati & Sequenza Ritiri/Consegne": "📋 Active Fleet & Pickup/Delivery Sequences",
  "🏢 Depositi & Magazzini di Base (Home Depots)": "🏢 Home Depots & Base Warehouses",
  "📍 Clienti & Domanda Merci (kg)": "📍 Customers & Freight Demands (kg)",
  "🚚 Flotta Mezzi per Deposito": "🚚 Fleet Partitioned by Depot",
  "📋 Elenco Mezzi Utilizzati & Report per Deposito di Base": "📋 Deployed Fleet & Base Depot Report",
  "🚛 Flotta Compattatori Settimanali": "🚛 Weekly Compactor Fleet",
  "🛣️ Stradario & Giorni di Raccolta Assegnati": "🛣️ Street Network & Assigned Collection Days",
  "📋 Pianificazione Mezzi per Giorno & Frazione Differenziata": "📋 Fleet Schedule by Day & Waste Fraction",
  "🚛 Flotta Mezzi Compatibili ZTL": "🚛 ZTL-Compatible Vehicle Fleet",
  "⏱️ Vie con Fasce Orarie Tassative & ZTL": "⏱️ Streets with Strict Time Windows & ZTL",
  "📋 Cronoprogramma Soste, Orari di Passaggio & Rientro Deposito": "📋 Stop Schedule, Service Times & Depot Return",
  "1. Strutture Intermedie (Intermediate Facilities - IF: TMB, Discariche, Silos)": "1. Intermediate Facilities (IF: MBT, Landfills, Transfer Silos)",
  "2. Tratte Stradali da Raccogliere (Archi del Grafo)": "2. Road Segments to Collect (Graph Arcs)",
  "3. Flotta Compattatori Abilitata al Multi-Viaggio con Scarichi Intermedi": "3. Compactor Fleet Enabled for Multi-Trip Intermediate Unloading",
  "1. Stato Attuale della Flotta (Compiti Virtuali al Minuto 75)": "1. Current Fleet Status (Virtual Tasks at Minute 75)",
  "2. Tratte Stradali (Completate vs Da Servire vs Nuove Emergenze)": "2. Road Segments (Completed vs Pending vs New Emergencies)",
  "🗺️ Mappa Stradale Interattiva Percorsi (Stradario)": "🗺️ Interactive Route Road Map (Street Network)",
  "🗺️ Mappa Stradale Interattiva con Finestre Orarie (Stradario)": "🗺️ Interactive Road Map with Time Windows (Street Network)",
  "🗺️ Mappa Itinerari Calendario Differenziata (GIS)": "🗺️ Waste Fraction Calendar Itineraries Map (GIS)",
  "🗺️ Tracciati & Sequenza Temporale Servizio Vie": "🗺️ Route Tracks & Street Service Time Sequence",
  "🗺️ Stradario Interattivo CARPIF (OpenStreetMap & Impianti Intermedi)": "🗺️ CARPIF Interactive Street Network (OpenStreetMap & Intermediate Facilities)",
  "🗺️ Mappa Dinamica DCARP (Posizioni Live Mezzi, Tratte Congelate & Ricalcolate)": "🗺️ DCARP Dynamic Map (Live Vehicle Positions, Frozen & Recalculated Segments)",
  "Sincronizzazione Real-Time Centrale Operativa": "Operational Control Center Real-Time Sync",
  "💻 Cronologia Eventi & Log Re-Routing in Tempo Reale": "💻 Real-Time Event History & Re-Routing Log",
  "Timestamp: Minuto 75 di turno operativo": "Timestamp: Minute 75 of operating shift",
  "📐 Visualizza Formulazione Matematica MILP (MTZ Subtour Elimination)": "📐 View MILP Mathematical Formulation (MTZ Subtour Elimination)",
  "📐 Formulazione Matematica con Vincolo Big-M Temporale": "📐 Mathematical Formulation with Temporal Big-M Constraint",
  "📐 Formulazione Matematica WCVRPTW-IF (Dinamica Ricarica/Scarico)": "📐 WCVRPTW-IF Mathematical Formulation (Charging/Discharge Dynamics)",
  "📐 Visualizza Formulazione Matematica MILP (Multi-Depot VRP con Home Depots)": "📐 View MILP Mathematical Formulation (Multi-Depot VRP with Home Depots)",
  "Frazioni del Giro (Stime FAQ & Dati Storici)": "Tour Fractions (FAQ Estimates & Historical Data)",
  "Stima FAQ": "FAQ Estimate",
  "⚖️ Calibrazione da Storico Pesate Aziendali:": "⚖️ Calibration from Historical Weighbridge Data:",
  "Riproporziona tutte le vie sul totale storico pesato a fine giro": "Rescales all streets proportionally based on end-of-tour total weight",
  "🌐 Partiziona Settore / Grandi Aree:": "🌐 Partition Sector / Large Areas:",
  "📅 Suddividi Area in più Giorni:": "📅 Split Area into Multiple Days:",
  "🏘️ Residenziali Alto Carico (+40%)": "🏘️ High Density Residential (+40%)",
  "MILP + Ricerca Locale 2-Opt, k-Clustering, Min-Max & Bipartite Matching": "MILP + 2-Opt Local Search, k-Clustering, Min-Max & Bipartite Matching",
  "Calcolatore di Risparmio ROI & Riduzione Emissioni CO2": "ROI Savings & CO2 Reduction Calculator",
  "Analisi di Convenienza Flotta": "Fleet Cost-Benefit Analysis",
  "Inserisci i parametri operativi della tua flotta aziendale. I modelli di Ricerca Operativa garantiscono in media una": "Enter your fleet operational parameters. Operations Research models deliver an average",
  "riduzione del 18% dei chilometri percorsi": "18% reduction in kilometers driven",
  ", con abbattimento diretto dei costi di carburante, pneumatici e straordinari:": ", directly slashing fuel expenses, tire wear, and driver overtime:",
  "⚙️ Parametri Flotta Aziendale": "⚙️ Fleet Parameters",
  "Numero Veicoli in Flotta:": "Vehicles in Fleet:",
  "Chilometri Medi Giornalieri per Mezzo:": "Average Daily Km per Vehicle:",
  "Consumo Medio Veicolo (litri / 100 km):": "Average Consumption (liters / 100 km):",
  "Costo Carburante (€ / litro):": "Fuel Price (€ / liter):",
  "Costo Straordinari Autista (€ / ora):": "Driver Overtime Cost (€ / hour):",
  "Giorni Operativi Annui:": "Annual Operating Days:",
  "Risparmio Carburante Annuo": "Annual Fuel Savings",
  "CO2 Evitata (Scope 1)": "Avoided CO2 (Scope 1)",
  "Ore Straordinario Risparmiate": "Saved Overtime Hours",
  "Risparmio Totale Stimato Annuo": "Total Estimated Annual Savings",
  "Ritorno sull'Investimento (ROI)": "Return on Investment (ROI)",
  "Risparmio Economico Diretto": "Direct Economic Savings",
  "Carburante + usura componenti": "Fuel + parts wear",
  "Chilometri Evitati": "Avoided Kilometers",
  "Meno traffico e minor usura": "Less traffic & lower vehicle wear",
  "Litri Gasolio Risparmiati": "Saved Diesel Liters",
  "Meno rifornimenti al mese": "Fewer refuelings per month",
  "Riduzione Emissioni CO2": "CO2 Emissions Reduction",
  "Bilancio di sostenibilità ESG": "ESG Sustainability Report",
  "💳 Massimizza il Risparmio con una Carta Carburante Flotta": "💳 Maximize Savings with a Corporate Fuel Card",
  "Abbina l'ottimizzazione dei percorsi con le convenzioni carburante dedicate alle aziende: sconti sul prezzo alla pompa e recupero dell'IVA con fatturazione elettronica automatica.": "Combine route optimization with corporate fuel partnerships: pump price discounts and 100% VAT recovery with automated e-invoicing.",
  "Scopri le Offerte Partner Flotta ➔": "Explore Partner Fleet Offers ➔",
  "FAQ & Dispensa Teorica di Ricerca Operativa": "FAQ & Operations Research Technical Guide",
  "Formulazioni Matematiche & Letteratura Scientifica": "Mathematical Formulations & Scientific Literature",
  "📋 Tutti gli Argomenti": "📋 All Topics",
  "📘 Guida Pratica & Manuale d'Uso": "📘 User Manual & Practical Guide",
  "❓ FAQ Operative & Strategiche": "❓ Operational & Strategic FAQs",
  "📐 Dispensa Matematica (MILP)": "📐 Mathematical Handbook (MILP)",
  "📖 Bibliografia & Tool Open-Source": "📖 Bibliography & Open-Source Tools",
  "📖 Espandi Tutte le FAQ": "📖 Expand All FAQs",
  "📕 Comprimi Tutte": "📕 Collapse All",
  "🖨️ Stampa / Salva Guida in PDF": "🖨️ Print / Save Guide to PDF",
  "❓ Domande Operative e Utilizzo della Piattaforma": "❓ Operational Questions & Platform Usage",
  "📐 Teoria, Modelli Matematici e Algoritmi": "📐 Theory, Mathematical Models & Algorithms",
  "📖 Riferimenti Scientifici e Standard Internazionali": "📖 Scientific References & International Standards",
  "🌍Importa Mappa Stradale Reale (OpenStreetMap)": "🌍Import Real Road Network (OpenStreetMap)",
  "Importa Mappa Stradale Reale (OpenStreetMap)": "Import Real Road Network (OpenStreetMap)",
  "1. Comuni / Zone da Scaricare (anche multipli contemporaneamente):": "1. Municipalities / Districts to Download (multiple supported):",
  "Supporto Multi-Comune": "Multi-Municipality Support",
  "Aggiungi comune limitrofo con 1 click:": "Add neighboring town with 1 click:",
  "Comune o Provincia:": "City or Province:",
  "Raggio di Ricerca (km):": "Search Radius (km):",
  "Frazione RSU:": "Waste Fraction:",
  "2. Punto di Partenza dei Mezzi / Cantiere Deposito (Nodo 0):": "2. Fleet Departure Depot / Operating Base (Node 0):",
  "3. Dimensione Settore Operativo (Numero Vie):": "3. Operating Sector Size (Number of Streets):",
  "Scarica Rete con Deposito & Calcola": "Download Network with Depot & Calculate",
  "👤Profilo Utente & Scenari": "👤User Profile & Scenarios",
  "📁I Miei Scenari & Configurazioni Salvate": "📁My Saved Scenarios & Configurations",
  "💾Salva Configurazione nel Profilo": "💾Save Configuration to Profile",
  "Nome Scenario:": "Scenario Name:",
  "Descrizione Opzionale:": "Optional Description:",
  "✏️Modifica Scenario": "✏️Edit Scenario",
  "✏️Modifica in Blocco Mezzi Selezionati": "✏️Batch Edit Selected Vehicles",
  "⚠️Flotta Insufficiente per Coprire i Percorsi": "⚠️Insufficient Fleet to Complete Routes",
  "⚠️Segnalazione Errore": "⚠️Error Notification",
  "➕ Nuova Via Disegnata su Mappa": "➕ New Street Drawn on Map",
  "Guida Rapida": "Quick Guide",
  "Supporta OR-Route • Buy Me a Coffee": "Support OR-Route • Buy Me a Coffee",
  "Donazione libera tramite PayPal o Portafoglio Digitale": "Free donation via PayPal or Digital Wallet",
  "+ Susegana": "+ Susegana",
  "+ San Vendemiano": "+ San Vendemiano",
  "+ Vittorio Veneto": "+ Vittorio Veneto",
  "Multi-Comune:": "Multi-Municipality:",
  "puoi inserire più comuni o zone separati da punto e virgola": "you can enter multiple municipalities or areas separated by semicolons",
  "o virgola": "or commas",
  ". La piattaforma unirà l'intera viabilità in un'unica mappa continua.": ". The platform will combine the entire road network into a single continuous map.",
  "Posizione Deposito:": "Depot Location:",
  "inserisci le": "enter the",
  "coordinate GPS (lat, lon)": "GPS coordinates (lat, lon)",
  "o un": "or a",
  "indirizzo reale": "real street address",
  "del cantiere aziendale. L'incrocio stradale più vicino diventerà il": "of the company depot. The closest street intersection will become",
  "Nodo 0 (Deposito)": "Node 0 (Depot)",
  "da cui tutti i mezzi partiranno e rientreranno. Se lasciato vuoto, verrà impostato automaticamente il baricentro dell'area.": "from which all vehicles will depart and return. If left blank, the area centroid will be set automatically.",
  "I modelli esatti MILP ottimizzano i settori operativi giornalieri per turno.": "Exact MILP models optimize daily shift operational sectors.",
  "OR-Route ti ha fatto risparmiare tempo e chilometri? Offrici un Caffè!": "Did OR-Route save you time and fuel? Buy us a Coffee!",
  "☕ Offri un Caffè (PayPal / Wallet)": "☕ Buy Me a Coffee (PayPal / Wallet)",
  "☕ Offrimi un Caffè (PayPal / Wallet)": "☕ Buy Me a Coffee (PayPal / Wallet)",
  "Diventa Partner o Sponsor della Ricerca Operativa": "Become an Operations Research Partner or Sponsor",
  "Contatta il team per integrare la tua flotta, presentare soluzioni software o sponsorizzare i server.": "Reach out to integrate proprietary solvers, showcase logistics software, or sponsor computing servers.",
  "🤝 Contatti & Partnership": "🤝 Contacts & Partnership",
  "🤝 Partner & Affiliazioni": "🤝 Partners & Affiliations",
  "Strumenti, Servizi e Convenzioni Selezionate per la Tua Flotta": "Tools, Services and Selected Benefits for Your Fleet",
  "Partner & Convenzioni Flotta Aziendale": "Fleet Corporate Partners & Benefits",
  "Telemetria GPS, Carte Carburante B2B, Ricambi Autocarri e Solutori Cloud dedicati": "GPS Telematics, B2B Fuel Cards, Truck Spare Parts, and Dedicated Cloud Solvers",
  "🤝 Scopri i Partner →": "🤝 Discover Partners →",
  "Buy Me a Coffee • Sostieni il Progetto": "Buy Me a Coffee • Support the Project",
  "Donazione libera tramite": "Free donation via",
  "Offrimi un Caffè": "Buy Me a Coffee",
  "Manteniamo questa piattaforma di": "We keep this platform of",
  "Ricerca Operativa e Cartografia GIS aperta, gratuita e priva di paywall": "Operations Research and GIS Cartography open, free, and paywall-free",
  "per ingegneri, fleet manager, pubbliche amministrazioni e studenti. Se gli algoritmi ti sono stati utili, puoi fare una": "for engineers, fleet managers, public administrations, and students. If these algorithms helped you, you can make a",
  "libera donazione": "free donation",
  "tramite": "via",
  "PayPal (`paypal.me/nicolatrevi`)": "PayPal (`paypal.me/nicolatrevi`)",
  "Wallet Circuito Solana": "Solana Wallet",
  "Bonifico IBAN": "IBAN Wire Transfer",
  "per contribuire ai costi dei server e del dominio:": "to help cover server and domain costs:",
  "Importo Donazione Libera:": "Voluntary Donation Amount:",
  "Dona con PayPal (paypal.me/nicolatrevi) ↗": "Donate with PayPal (paypal.me/nicolatrevi) ↗",
  "Buy Me a Coffee / Carta (buymeacoffee.com/ntrevi) ↗": "Buy Me a Coffee / Card (buymeacoffee.com/ntrevi) ↗",
  "Portafoglio Digitale (BTC / SOL / ETH / Polygon / IBAN)": "Digital Wallet (BTC / SOL / ETH / Polygon / IBAN)",
  "Invia il tuo contributo direttamente verso uno dei seguenti circuiti": "Send your support directly to one of the following networks",
  "Portafoglio Digitale (Bitcoin, Solana, Ethereum, Polygon)": "Digital Wallet (Bitcoin, Solana, Ethereum, Polygon)",
  "o tramite": "or via",
  "Bonifico Bancario IBAN": "IBAN Bank Wire Transfer",
  "🟠 Circuito Bitcoin (BTC • Native SegWit / Taproot):": "🟠 Bitcoin Network (BTC • Native SegWit / Taproot):",
  "📋 Copia Bitcoin": "📋 Copy Bitcoin",
  "🟣 Circuito Solana (SOL / USDC / USDT):": "🟣 Solana Network (SOL / USDC / USDT):",
  "📋 Copia Solana": "📋 Copy Solana",
  "🔷 Circuito Ethereum (ERC-20 / ETH / USDT / USDC):": "🔷 Ethereum Network (ERC-20 / ETH / USDT / USDC):",
  "📋 Copia Ethereum": "📋 Copy Ethereum",
  "🟣 Circuito Polygon (Polygon POS / POL / MATIC / USDC / USDT):": "🟣 Polygon Network (Polygon POS / POL / MATIC / USDC / USDT):",
  "📋 Copia Polygon": "📋 Copy Polygon",
  "🏦 Coordinate IBAN Bonifico Bancario (SEPA / Istantaneo):": "🏦 IBAN Bank Wire Details (SEPA / Instant):",
  "📋 Copia IBAN": "📋 Copy IBAN",
  "Carte Carburante & Telepedaggio": "Fuel Cards & Electronic Toll",
  "DKV Mobility / Edenred / Telepass Flotte": "DKV Mobility / Edenred / Telepass Fleet",
  "Fattura elettronica unica mensile per il recupero IVA al 100%, pagamento pedaggi autostradali europei e ricarica flotta elettrica in oltre 68.000 stazioni.": "Single monthly consolidated e-invoice for 100% VAT recovery, European highway toll payments, and EV charging at over 68,000 stations.",
  "🎁 Link Referenziale: Canone gratuito primi 6 mesi + Sconto alla pompa": "🎁 Referral Link: Free subscription for 6 months + Pump discount",
  "Telematica GPS & Tachigrafo Remoto": "GPS Telematics & Remote Tachograph",
  "Samsara / Verizon Connect / Webfleet": "Samsara / Verizon Connect / Webfleet",
  "Localizzazione satellitare in tempo reale per modelli DCARP, scarico tachigrafo digitale da remoto, monitoraggio consumi e riduzione sinistri fino al 23%.": "Real-time satellite GPS tracking for DCARP models, remote tachograph downloading, fuel monitoring, and up to 23% incident reduction.",
  "🎁 Link Referenziale: 30 Giorni di Demo Gratuita + Tracker in prova": "🎁 Referral Link: 30-Day Free Trial + Hardware tracker included",
  "Pneumatici & Officina Autocarri": "Tires & Truck Maintenance",
  "Euromaster / Norauto Pro / Driver": "Euromaster / Norauto Pro / Driver",
  "Listini bloccati per treni gomme furgoni e compattatori RSU, assistenza stradale H24 e cambio gomme stagionale prioritario per azzerare i fermi macchina.": "Fixed corporate price lists for van and compactor tire sets, 24/7 roadside assistance, and priority seasonal tire changes.",
  "🎁 Link Referenziale: Sconto 15% immediato sul listino pneumatici": "🎁 Referral Link: Immediate 15% discount on commercial tires",
  "Wallbox & Hub Ricarica Flotte EV": "Wallbox & EV Fleet Charging Hubs",
  "Wallbox Business / Enel X Way / Plenitude": "Wallbox Business / Enel X Way / Plenitude",
  "Progettazione e installazione di colonnine fast-charge DC nel deposito aziendale con bilanciamento dinamico dei carichi per furgoni e mezzi elettrici.": "Design and installation of depot DC fast chargers with dynamic load balancing for electric vans and heavy trucks.",
  "🎁 Link Referenziale: Sopralluogo tecnico gratuito + Incentivi PNRR": "🎁 Referral Link: Free site technical survey + Green fleet subsidies",
  "Tablet Rugged & Supporti Cabina": "Rugged Tablets & In-Cab Mounts",
  "Amazon Business / Dispositivi Bordo Mezzo": "Amazon Business / Onboard Telematics Hardware",
  "Tablet corazzati IP68 antiurto, supporti ventosa/plancia per camion e lettori RFID/Barcode ideali per consultare i Fogli di Viaggio OR-Route in cabina.": "Heavy-duty IP68 shockproof tablets, windshield/dashboard mounts, and RFID readers ideal for consulting OR-Route Driver Sheets in-cab.",
  "🎁 Link Affiliato: Selezione Hardware Flotta scontata per P.IVA": "🎁 Affiliate Link: Discounted fleet hardware for corporate tax IDs",
  "Cloud VPS, Domini & Server Dedicati": "Cloud VPS, Domains & Dedicated Servers",
  "Hostinger / DigitalOcean / Aruba Cloud": "Hostinger / DigitalOcean / Aruba Cloud",
  "Vuoi un'istanza privata ad alte prestazioni con dominio aziendale dedicato e solver matematico multi-core? Attiva un server VPS con credito omaggio.": "Looking for a private high-performance instance with custom corporate domain and dedicated multi-core solver? Launch a VPS with free bonus credits.",
  "🎁 Link Referenziale: Dominio gratuito + Bonus fino a 200€ Cloud": "🎁 Referral Link: Free domain + Up to €200 Cloud credits",
  "Foglio di Viaggio per l'Autista — Sequenza di Raccolta": "Driver Route Sheet — Collection Sequence",
  "Base di Partenza:": "Departure Depot:",
  "Carico Totale:": "Total Payload:",
  "Durata Stimata:": "Estimated Duration:",
  "Tappe Totali:": "Total Legs:",
  "🟡 PARTENZA CANTIERE": "🟡 DEPOT DEPARTURE",
  "🏠 RIENTRO DEPOSITO": "🏠 DEPOT RETURN",
  "🟢 RACCOLTA ATTIVA": "🟢 ACTIVE COLLECTION",
  "🟡 TRANSITO DI COLLEGAMENTO": "🟡 DEADHEAD TRANSIT",
  "Immissione su viabilità comunale in direzione prima via di raccolta": "Merging onto municipal roads toward first collection street",
  "Rientro alla sede operativa per pesatura e scarico rifiuti": "Returning to operational depot for weighing and waste discharge",
  "Svuotamento cassonetti / raccolta porta a porta lungo tutta la via": "Bin emptying / curbside collection along entire street",
  "Tratto di transito veloce (nessun cassonetto da svuotare)": "Fast repositioning leg (no collection)",
  "Piattaforma gratuita e aperta dedicata all'applicazione della Ricerca Operativa industriale (Operational Research & MILP Solvers) per la riduzione dei costi e delle emissioni delle flotte aziendali.": "Free, open-access platform dedicated to industrial Operations Research and MILP solvers for reducing corporate fleet costs and CO2 emissions.",
  "Accesso Rapido Piattaforma": "Platform Quick Access",
  "Motori & Risorse": "Solvers & Resources",
  "🧭 1. Compila Guida Scelta Modello": "🧭 1. Complete Model Selection Guide",
  "⚡ 2. Scegli Modello Direttamente (10 Modelli)": "⚡ 2. Direct Model Launch (10 Models)",
  "🔐 3. Accedi alle Sessioni Salvate": "🔐 3. Access Saved Sessions",
  "📊 Calcolatore Risparmio ROI & ESG": "📊 ROI & ESG Savings Calculator",
  "📩 Contatti, Richieste & Suggerimenti": "📩 Contact, Inquiries & Feedback",
  "📩 Contatti & Suggerimenti": "📩 Contact & Feedback",
  "© 2026 OR-Route — Piattaforma Aperta di Ricerca Operativa per Flotte Aziendali e Servizi RSU. Sostenuta da Google AdSense, Link Referenziali Partner e Donazioni Libere degli Utenti.": "© 2026 OR-Route — Open Operations Research Platform for Corporate Fleets and Municipal Waste Services. Supported by Google AdSense, Partner Referral Links and User Donations.",
  "RECAPITI UFFICIALI & SUPPORTO TECNICO": "OFFICIAL CONTACTS & TECHNICAL SUPPORT",
  "Contatta il Team di Ricerca OR-Route": "Contact the OR-Route Team",
  "Invia suggerimenti, richieste di nuove funzionalità, segnalazioni di bug o richieste commerciali per l'ottimizzazione della tua flotta. Recapito crittografato diretto al team di sviluppo.": "Send suggestions, feature requests, bug reports, or commercial fleet inquiries. Direct encrypted delivery to our development team.",
  "Seleziona il Motivo del Contatto": "Select Contact Reason",
  "💡 Suggerimento": "💡 Suggestion",
  "❓ Assistenza Tecnica": "❓ Technical Support",
  "🐛 Segnalazione Bug": "🐛 Bug Report",
  "🏢 Flotta Aziendale": "🏢 Corporate Fleet",
  "🤝 Partnership / Ricerca": "🤝 Partnership / Research",
  "💬 Altro Feedback": "💬 Other Feedback",
  "Il Tuo Nome e Cognome": "Your Full Name",
  "Il Tuo Indirizzo Email": "Your Email Address",
  "Azienda, Ente o Università (Opzionale)": "Company, Entity or University (Optional)",
  "Descrizione della Richiesta o Segnalazione": "Message or Technical Request",
  "🔒 Invio protetto e crittografato tramite server dedicato OR-Route.": "🔒 Protected and encrypted transmission via dedicated OR-Route server.",
  "Torna alla Piattaforma": "Back to Platform",
  "📦 1. CVRP": "📦 1. CVRP",
  "⏱️ 2. VRPTW": "⏱️ 2. VRPTW",
  "🚛 3. CARP": "🚛 3. CARP",
  "Raccolta RSU & Pulizia Vie": "Waste Collection & Street Cleaning",
  "🔋 4. EV-VRP / IF": "🔋 4. EV-VRP / IF",
  "Flotte Elettriche & Ricariche": "Electric Fleets & Charging",
  "📦🔄 5. VRPPD": "📦🔄 5. VRPPD",
  "🏢🏢 6. MDVRP": "🏢🏢 6. MDVRP",
  "Multi-Deposito & Più Sedi": "Multi-Depot & Multiple Sites",
  "📅 7. PCARP": "📅 7. PCARP",
  "Raccolta Settimanale Lun-Sab": "Weekly Mon-Sat Collection",
  "⏱️🛣️ 8. CARPTW": "⏱️🛣️ 8. CARPTW",
  "Orari Tassativi su Strade/ZTL": "Strict Hours on Streets/ZTL",
  "♻️🛣️ 9. CARPIF": "♻️🛣️ 9. CARPIF",
  "Scarichi Intermedi TMB/Discarica": "Intermediate MBT Dumps/Landfills",
  "⚡🛣️ 10. DCARP": "⚡🛣️ 10. DCARP",
  "Real-Time & Emergenze Stradali": "Real-Time & Road Emergencies",
  "Tutti i Modelli": "All Models",
  "CARP (RSU & Spazzamento)": "CARP (Waste & Sweeping)",
  "CVRP (Merci & Corrieri)": "CVRP (Freight & Couriers)",
  "VRPTW (Finestre Orarie)": "VRPTW (Time Windows)",
  "PCARP (Raccolta Settimanale)": "PCARP (Weekly Collection)",
  "CARPTW (Finestre Orarie Strade)": "CARPTW (Street Time Windows)",
  "CARPIF (Scarichi Intermedi)": "CARPIF (Intermediate Unloading)",
  "DCARP (Dinamico Real-Time)": "DCARP (Real-Time Dynamic)",
  "EV-VRP (Elettrico)": "EV-VRP (Electric)",
  "VRPPD (Ritiri/Consegne)": "VRPPD (Pickups/Deliveries)",
  "MDVRP (Multi-Deposito)": "MDVRP (Multi-Depot)",
  "🚛 3. CARP — Raccolta RSU & Servizi Stradali": "🚛 3. CARP — Curbside Waste & Street Services",
  "📦 1. CVRP — Consegne Merci & Corrieri": "📦 1. CVRP — Freight Delivery & Couriers",
  "⏱️ 2. VRPTW — Finestre Orarie Tassative": "⏱️ 2. VRPTW — Strict Time Windows",
  "🔋 4. EV-VRP / IF — Scarichi & Ricariche": "🔋 4. EV-VRP / IF — Intermediate Dumps & Charging",
  "📦🔄 5. VRPPD — Ritiri & Consegne Accoppiati": "📦🔄 5. VRPPD — Paired Pickups & Deliveries",
  "🏢🏢 6. MDVRP — Multi-Deposito": "🏢🏢 6. MDVRP — Multi-Depot",
  "📅 7. PCARP — Raccolta Settimanale": "📅 7. PCARP — Weekly Collection",
  "⏱️🛣️ 8. CARPTW — Orari Strade & ZTL": "⏱️🛣️ 8. CARPTW — Street Schedules & ZTL",
  "♻️🛣️ 9. CARPIF — Scarichi Intermedi TMB": "♻️🛣️ 9. CARPIF — Intermediate MBT Dumps",
  "⚡🛣️ 10. DCARP — Dinamico Real-Time": "⚡🛣️ 10. DCARP — Real-Time Dynamic",
  "🚛 CARP (Raccolta RSU & Servizi Stradali)": "🚛 CARP (Curbside Waste & Street Services)",
  "📦 CVRP (Consegne Merci & Corrieri)": "📦 CVRP (Freight Delivery & Couriers)",
  "⏱️ VRPTW (Finestre Orarie Clienti)": "⏱️ VRPTW (Customer Time Windows)",
  "📅 PCARP (Raccolta Settimanale)": "📅 PCARP (Weekly Collection)",
  "⏱️🛣️ CARPTW (Finestre Orarie Strade & ZTL)": "⏱️🛣️ CARPTW (Street Time Windows & ZTL)",
  "♻️ CARPIF (Scarichi Intermedi TMB/Discarica)": "♻️ CARPIF (Intermediate MBT Dumps/Landfills)",
  "⚡ DCARP (Dinamico Real-Time: Compiti Virtuali)": "⚡ DCARP (Real-Time Dynamic: Virtual Tasks)",
  "🔋 EV-VRP (Flotte Elettriche & Ricariche)": "🔋 EV-VRP (Electric Fleets & Charging)",
  "📦🔄 VRPPD (Ritiri e Consegne Accoppiati)": "📦🔄 VRPPD (Paired Pickups & Deliveries)",
  "🏢 MDVRP (Multi-Deposito)": "🏢 MDVRP (Multi-Depot)",
  "Piano Ricalcolato & Metriche di Disruption DCARP": "Recalculated Plan & DCARP Disruption Metrics",
  "Re-Optimization in < 1 sec": "Re-Optimization in < 1 sec",
  "Stato Disruption": "Disruption Status",
  "Gravità dell'imprevisto": "Event Severity",
  "Flotta Operativa": "Operational Fleet",
  "Mezzi attivi residui": "Residual active vehicles",
  "Tratte Riassegnate": "Reassigned Segments",
  "Ricalcolo carichi orfani": "Orphan load recalculation",
  "Tratte Completate Pre-Evento": "Pre-Event Completed Segments",
  "Stato congelato sicuro": "Safe frozen state",
  "🗺️ Mappa Stradale Interattiva (CARP)": "🗺️ Interactive Road Map (CARP)",
  "⚡ Risolvi Flotta": "⚡ Solve Fleet",
  "Report HTML ↗": "HTML Report ↗",
  "Legenda Zone:": "Zone Legend:",
  "Resid. Alto (+40%)": "High Density Resid. (+40%)",
  "Resid. Standard": "Standard Resid.",
  "Commerciale (+20%)": "Commercial (+20%)",
  "Periferica (-30%)": "Suburban (-30%)",
  "Transito (0 kg)": "Transit (0 kg)",
  "Compattatori CARPIF": "CARPIF Compactors",
  "Con scarichi intermedi": "With intermediate unloading",
  "Compattatori Senza IF": "Compactors Without IF",
  "CARP classico singolo viaggio": "Classic single-trip CARP",
  "Mezzi Risparmiati": "Saved Vehicles",
  "Costi Fissi Risparmiati": "Saved Fixed Costs",
  "Capitale & ammortamento": "Capital & depreciation",
  "Scarichi Intermedi Totali": "Total Intermediate Dumps",
  "Soste agli impianti IF": "Stops at IF facilities",
  "CARP (Servizi Stradali & RSU)": "CARP (Street Services & Waste)",
  "Ripristino agli Impianti Intermedi:": "Replenishment at Intermediate Facilities:",
  "Consumo batteria lungo la tratta": "Battery consumption along segment",
  "Ricarica al 100% della batteria all'impianto": "100% battery recharge at facility",
  "Vincoli di Accoppiamento, Precedenza e Conservazione Carico:": "Coupling, Precedence & Load Conservation Constraints:",
  "Precedenza temporale: il ritiro precede la consegna": "Temporal precedence: pickup precedes delivery",
  "Tracciamento continuo del carico a bordo": "Continuous onboard load tracking",
  "Rispetto costante della capacità massima del veicolo": "Constant compliance with vehicle max capacity",
  "Vincoli Chiave MDVRP:": "MDVRP Key Constraints:",
  "Il veicolo k parte dal rispettivo Home Depot h(k)": "Vehicle k departs from its assigned Home Depot h(k)",
  "Il veicolo k rientra nel proprio Home Depot h(k)": "Vehicle k returns to its assigned Home Depot h(k)",
  "Ogni cliente servito da 1 solo mezzo": "Every customer served by exactly 1 vehicle",
  "Conservazione del flusso": "Flow conservation",
  "Eliminazione sottogiri MTZ": "MTZ subtour elimination",
  "Stato MDVRP": "MDVRP Status",
  "Stato VRPPD": "VRPPD Status",
  "Costo Flotta EV": "EV Fleet Cost",
  "Energia Flotta": "Fleet Energy",
  "Richieste Soddisfatte": "Fulfilled Requests",
  "Depositi Attivi": "Active Depots",
  "Hub Centrale → Impianti ⚡ → Clienti": "Central Hub → Facilities ⚡ → Customers",
  "🟢 Ritiro → 🟠 Consegna": "🟢 Pickup → 🟠 Delivery",
  "Depositi 🏢 → Clienti 📍": "Depots 🏢 → Customers 📍",
  "Hub Centrale → Clienti": "Central Hub → Customers",
  "Sequenza Oraria Fermate": "Hourly Stop Sequence",
  "Quadrante Conegliano-Vittorio & Impianti TMB": "Conegliano-Vittorio Sector & MBT Facilities",
  "⚠️ Seleziona l'Evento Operativo Improvviso da Simulare in Tempo Reale:": "⚠️ Select Unforeseen Operational Event to Simulate in Real Time:",
  "Assegnazione Mezzo": "Vehicle Assignment",
  "Costo Energia Ricarica:": "Charging Energy Cost:",
  "Consumo Specifico Veicolo:": "Vehicle Specific Consumption:",
  "Tipologia Servizio": "Service Type",
  "Ogni azienda di trasporti, logistica o igiene ambientale ha vincoli operativi e un parco mezzi eterogeneo. Rispondi alle domande per individuare il": "Every transportation, logistics, or waste company has unique operational constraints and vehicle fleets. Answer the questions to identify the",
  "modello matematico ottimale": "optimal mathematical model",
  "e configura in": "and configure under",
  "Parte 2": "Part 2",
  "le": "the",
  "diverse tipologie di veicoli": "different vehicle categories",
  "(furgoni, medi 2 assi, bilici pesanti) con le rispettive": "(vans, medium 2-axle, heavy 3-axle) with their respective",
  "specifiche di costo fisso, personale e consumo chilometrico": "fixed cost, crew labor, and mileage consumption specifications",
  "Profilo Utente & Scenari": "User Profile & Scenarios",
  "Nome Utente o Email": "Username or Email",
  "Password": "Password",
  "Accedi al Portale": "Sign In to Portal",
  "Non hai ancora un account?": "Don't have an account yet?",
  "Registrati ora": "Register now",
  "Nome Utente *": "Username *",
  "Email (opzionale)": "Email (optional)",
  "Password * (min. 5 caratteri)": "Password * (min. 5 characters)",
  "Conferma Password *": "Confirm Password *",
  "Crea Account & Salva Scenari": "Create Account & Save Scenarios",
  "Hai già un account?": "Already have an account?",
  "📝 Crea Account": "📝 Create Account",
  "⛶ Schermo Intero": "⛶ Full Screen",
  "Medio FAQ": "FAQ Medium",
  "Max FAQ": "FAQ Max",
  "Min FAQ": "FAQ Min",
  "💾 Salva nel Profilo": "💾 Save to Profile",
  "📋 Copia Errore negli Appunti": "📋 Copy Error to Clipboard",
  "Leggi Approfondimento Completo nelle FAQ →": "Read Full Technical Documentation in FAQs →",
  "➕ Aggiungi Via": "➕ Add Street",
  "🗑️ Togli Vie": "🗑️ Remove Streets",
  "⚡ Adatta Flotta e Ricalcola": "⚡ Adapt Fleet & Recalculate",
  "✂️ Riduci Punti e Ricalcola": "✂️ Crop Stops & Recalculate",
  "⚡ Risolvi CARPIF (Scarichi Intermedi)": "⚡ Solve CARPIF (Intermediate Dumps)",
  "🔓 Sblocca Vie Manuali": "🔓 Unlock Manual Streets",
  "Coeff. Giro:": "Tour Coeff:",
  "| Carico:": "| Load:",
  "Capacità Flotta Totale:": "Total Fleet Capacity:",
  "| Domanda Rete:": "| Network Demand:",
  "| Richieste Totali:": "| Total Requests:",
  "| Richiesta Merci:": "| Freight Demand:",
  "📍 Clicca sulla mappa per impostare il punto di inizio della via...": "📍 Click on map to set street starting point...",
  "Clicca una via per modificarla": "Click a street to edit it",
  "Ripartizione stimata del fabbisogno di raccolta sull'estensione viaria reale del territorio caricato, calcolata in base alle stime teoriche FAQ e ai coefficienti aziendali configurati:": "Estimated waste collection distribution across the actual loaded road network, based on FAQ theoretical estimates and configured corporate coefficients:",
  "Frazione Merceologica (FAQ 14)": "Waste Fraction (FAQ 14)",
  "Range FAQ": "FAQ Range",
  "Carico Stimato Comune": "Estimated Municipal Waste",
  "Dimensione Attuale Rete": "Current Network Size",
  "🌐 Tutto il comune (copertura 100%)": "🌐 Entire Municipality (100% Coverage)",
  "120 vie (~6-8 compattatori)": "120 streets (~6-8 compactors)",
  "80 vie (~4-5 compattatori)": "80 streets (~4-5 compactors)",
  "60 vie (~3-4 compattatori)": "60 streets (~3-4 compactors)",
  "45 vie (~2-3 compattatori)": "45 streets (~2-3 compactors)",
  "30 vie (~1-2 compattatori)": "30 streets (~1-2 compactors)",
  "1 Giorno (Area Intera)": "1 Day (Full Area)",
  "2 Giorni (Zona 1 & Zona 2)": "2 Days (Zone 1 & Zone 2)",
  "3 Giorni (3 Settori Giornalieri)": "3 Days (3 Daily Sectors)",
  "4 Giorni (4 Settori Giornalieri)": "4 Days (4 Daily Sectors)",
  "5 Giorni (Lun-Ven Feriale)": "5 Days (Mon-Fri Weekdays)",
  "6 Giorni (Lun-Sab Completo)": "6 Days (Mon-Sat Complete)",
  "Pronto": "Ready",
  "Ottimale": "Optimal",
  "Tipologia Zona & Carico": "Zone Category & Load",
  "Prospetto Merceologico & Stime Rifiuti sul Comune": "Waste Fractions & Municipal Estimates",
  "✏️ Modifica Selezionati": "✏️ Edit Selected",
  "🗑️ Elimina Selezionati": "🗑️ Delete Selected",
  "📍 Opzione 1: Città / Quartiere + Deposito": "📍 Option 1: City / District + Depot",
  "🎯 Opzione 2: Raggio GPS attorno al Deposito": "🎯 Option 2: GPS Radius around Depot",
  "Messaggio di stato": "Status message",
  "30 secondi (Micro-raccolta continua a passo d'uomo)": "30 seconds (Continuous curb-level walking-pace collection)",
  "5 - 8 minuti (Consegna colli / bolla / carico medio)": "5 - 8 minutes (Parcel delivery / invoice / medium load)",
  "15 - 20 minuti (Scarico pallet pesanti / compattamento intensivo)": "15 - 20 minutes (Heavy pallet unloading / intensive compaction)",
  "Autista (€/h)": "Driver (€/h)",
  "Composizione Flotta Calibrata": "Calibrated Fleet Mix",
  "Portata Flotta Cumulata": "Cumulative Fleet Payload",
  "Costo Fisso Flotta Turno": "Total Shift Fixed Cost",
  "Tariffa Chilometrica Media": "Average Mileage Rate",
  "Utente": "User",
  "Visualizza Giorno:": "View Day:",
  "🌐 Tutti i Giorni (Sintesi Settimanale)": "🌐 All Days (Weekly Summary)",
  "🟢 Lunedì (Umido)": "🟢 Monday (Organic)",
  "🔵 Martedì (Carta)": "🔵 Tuesday (Paper)",
  "🟡 Mercoledì (Plastica)": "🟡 Wednesday (Plastic)",
  "🟢 Giovedì (Umido)": "🟢 Thursday (Organic)",
  "🟣 Venerdì (Secco)": "🟣 Friday (Residual)",
  "🔷 Sabato (Vetro)": "🔷 Saturday (Glass)",
  "📐 Visualizza Formulazione Matematica MILP (Pickup & Delivery con Precedenza)": "📐 View MILP Mathematical Formulation (Pickup & Delivery with Precedence)",
  "Vincoli Chiave PDP:": "PDP Key Constraints:",
  "1. ∑_k y_ik = 1  ∀r ∈ Richieste (Ogni ritiro e consegna assegnati a 1 solo mezzo)": "1. ∑_k y_ik = 1  ∀r ∈ Requests (Every pickup and delivery assigned to exactly 1 vehicle)",
  "2. y_P(r),k = y_D(r),k  ∀r, ∀k (Stesso veicolo per ritiro e consegna)": "2. y_P(r),k = y_D(r),k  ∀r, ∀k (Same vehicle for pickup and delivery)",
  "3. u_D(r) ≥ u_P(r) + 1  (Precedenza temporale: il ritiro precede la consegna)": "3. u_D(r) ≥ u_P(r) + 1  (Temporal precedence: pickup precedes delivery)",
  "4. L_j ≥ L_i + q_j - M · (1 - x_ijk)  (Tracciamento continuo del carico a bordo)": "4. L_j ≥ L_i + q_j - M · (1 - x_ijk)  (Continuous onboard load tracking)",
  "5. 0 ≤ L_i ≤ Q_k  (Rispetto costante della capacità massima del veicolo)": "5. 0 ≤ L_i ≤ Q_k  (Constant compliance with maximum vehicle capacity)",
  "1. ∑_k ∑_j x_ijk = 1  ∀i ∈ Clienti (Ogni cliente servito 1 volta)": "1. ∑_k ∑_j x_ijk = 1  ∀i ∈ Customers (Every customer served exactly once)",
  "2. ∑_i x_ipk - ∑_j x_pjk = 0  ∀p, ∀k (Conservazione del flusso)": "2. ∑_i x_ipk - ∑_j x_pjk = 0  ∀p, ∀k (Flow conservation)",
  "3. u_jk ≥ u_ik + q_j - Q_k · (1 - x_ijk)  (Eliminazione sottogiri MTZ)": "3. u_jk ≥ u_ik + q_j - Q_k · (1 - x_ijk)  (MTZ subtour elimination)",
  "4. q_i ≤ u_ik ≤ Q_k (Rispetto portata massima veicolo)": "4. q_i ≤ u_ik ≤ Q_k (Payload capacity compliance)",
  "Propagazione Orari & Rispetto Fasce:": "Time Propagation & Window Compliance:",
  "1. w_jk ≥ w_ik + s_i + t_ij - M · (1 - x_ijk)  (Arrivo compatibile con viaggio)": "1. w_jk ≥ w_ik + s_i + t_ij - M · (1 - x_ijk)  (Arrival compatible with travel time)",
  "2. a_i ≤ w_ik ≤ b_i  (Servizio tassativamente dentro la finestra)": "2. a_i ≤ w_ik ≤ b_i  (Service strictly within time window)",
  "3. w_0k ≥ Orario_Apertura_Deposito": "3. w_0k ≥ Depot_Opening_Time",
  "Benvenuto nella sezione scientifica e divulgativa di": "Welcome to the scientific and educational documentation of",
  ". Qui trovi le risposte alle domande più critiche sulla pianificazione delle flotte aziendali, la": ". Here you will find answers to critical fleet planning questions, the",
  "dispensa teorica": "theoretical handbook",
  "con le": "with the",
  "formulazioni matematiche MILP (Mixed-Integer Linear Programming)": "exact MILP (Mixed-Integer Linear Programming) formulations",
  "dei modelli implementati nel software, e la": "of all models implemented in the software, and the",
  "bibliografia accademica ufficiale": "official academic bibliography",
  "con i paper scientifici e gli strumenti open-source che rendono possibile l'ottimizzazione combinatoria avanzata.": "with foundational scientific papers and open-source tools powering our combinatorial optimization platform.",
  "Contatti, Assistenza & Suggerimenti — OR-Route": "Contact, Support & Feedback — OR-Route",
  "⚡ I 10 Modelli": "⚡ The 10 Models",
  "I 10 Modelli": "The 10 Models",
  "Contatti, Richieste & Suggerimenti": "Contact, Inquiries & Feedback",
  "Canale Diretto & Supporto Tecnico": "Direct Channel & Technical Support",
  "Hai una": "Have an",
  "Richiesta": "Inquiry",
  "Suggerimento": "Suggestion",
  "Il team di": "The team at",
  "è a tua disposizione per supporto sui modelli matematici di Ricerca Operativa, nuove funzionalità desiderate, personalizzazioni industriali per la tua flotta o collaborazioni scientifiche.": "is at your disposal for support on Operations Research mathematical models, requested features, industrial fleet customizations, or academic research collaborations.",
  "Modulo di Invio Richiesta": "Inquiry Submission Form",
  "Campi obbligatori": "Required fields",
  "Seleziona il Motivo del Contatto *": "Select Contact Reason *",
  "Indica la tipologia per instradare la richiesta allo specialista più adatto.": "Indicate the type to route your inquiry to the most suitable specialist.",
  "Il Tuo Nome e Cognome *": "Your Full Name *",
  "Il Tuo Indirizzo Email *": "Your Email Address *",
  "Riceverai qui la nostra risposta.": "You will receive our reply here.",
  "Azienda, Ente o Università": "Company, Entity or University",
  "Modello Matematico di Interesse (Opzionale)": "Mathematical Model of Interest (Optional)",
  "Modello Matematico di Interesse": "Mathematical Model of Interest",
  "(Opzionale)": "(Optional)",
  "Oggetto del Messaggio *": "Message Subject *",
  "Oggetto del Messaggio": "Message Subject",
  "Descrizione Dettagliata della Richiesta o Suggerimento *": "Detailed Request Description or Suggestion *",
  "Descrizione Dettagliata della Richiesta o Suggerimento": "Detailed Request Description or Suggestion",
  "Più dettagli fornisci, più precisa sarà la risposta del nostro team.": "The more details you provide, the more precise our team's response will be.",
  "0 caratteri": "0 characters",
  "-- Tutti i Modelli / Piattaforma Generale --": "-- All Models / General Platform --",
  "📦 1. CVRP (Merci e Logistica B2B)": "📦 1. CVRP (Freight & B2B Logistics)",
  "⏱️ 2. VRPTW (Fasce Orarie Tassative)": "⏱️ 2. VRPTW (Strict Time Windows)",
  "🚛 3. CARP (Servizi Stradali e RSU)": "🚛 3. CARP (Curbside Waste & Streets)",
  "🔋 4. EV-VRP (Flotte Elettriche & Tappe)": "🔋 4. EV-VRP (Electric Fleets & Stops)",
  "📦🔄 5. VRPPD (Pickup & Delivery)": "📦🔄 5. VRPPD (Pickup & Delivery)",
  "🏬 6. MDVRP (Multi-Deposito e Rimesse)": "🏬 6. MDVRP (Multi-Depot & Hubs)",
  "📅 7. PCARP (Periodico RSU)": "📅 7. PCARP (Periodic Waste)",
  "⏱️🛣️ 8. CARPTW (Finestre Orarie ZTL)": "⏱️🛣️ 8. CARPTW (ZTL Time Windows)",
  "♻️ 9. CARPIF (Impianti e Discariche)": "♻️ 9. CARPIF (Facilities & Dumps)",
  "⚡ 10. DCARP (Guasti & Riassegnazione)": "⚡ 10. DCARP (Breakdowns & Dynamic Rerouting)",
  "🗺️ Motore Cartografico GIS / OSM": "🗺️ GIS / OSM Map Engine",
  "📊 Calcolatore ROI & Emissioni ESG": "📊 ROI & ESG Emissions Calculator",
  "Dichiaro di aver preso visione dell'informativa e acconsento al trattamento dei dati personali forniti (nome ed email) esclusivamente per la ricezione e la gestione della risposta alla presente comunicazione, in conformità al GDPR.": "I declare that I have read the privacy policy and consent to the processing of personal data provided (name and email) exclusively for receiving and managing the response to this communication, in accordance with GDPR.",
  "Messaggio inviato con successo!": "Message sent successfully!",
  "La tua richiesta è stata trasmessa al team di supporto OR-Route. Ti risponderemo all'indirizzo email specificato nel più breve tempo possibile (entro 24-48h lavorative).": "Your request has been forwarded to the OR-Route support team. We will reply to the specified email address as soon as possible (within 24-48 business hours).",
  "Impossibile inviare il messaggio.": "Unable to send message.",
  "Si è verificato un problema di rete o blocco temporaneo. Per favore verifica la connessione e riprova tra qualche istante.": "A network issue or temporary lock occurred. Please verify your connection and try again in a moment.",
  "Invio del messaggio in corso...": "Sending message...",
  "Attendi un istante, stiamo trasmettendo la tua richiesta.": "Please wait a moment, we are transmitting your request.",
  "Canale Protetto & Supporto": "Protected Channel & Support",
  "Tutte le richieste e i suggerimenti inviati tramite questo modulo vengono inoltrati direttamente al team di Ricerca Operativa e sviluppo algoritmi.": "All inquiries and feedback submitted via this form are forwarded directly to the Operations Research and algorithm development team.",
  "Tempo medio di risposta:": "Average response time:",
  "Entro 24 – 48 ore lavorative all'indirizzo email specificato nel modulo.": "Within 24 – 48 business hours to the email address specified in the form.",
  "Riservatezza & Protezione Spam:": "Confidentiality & Anti-Spam Protection:",
  "Nessun dato viene ceduto a terzi o usato per scopi pubblicitari. Comunicazioni 100% confidenziali con protezione anti-bot integrata.": "No data is shared with third parties or used for advertising. 100% confidential communications with integrated anti-bot protection.",
  "Sviluppo & Contributi Open Source:": "Open Source Development & Contributions:",
  "Puoi aprire issue tecniche o consultare il codice sorgente anche su": "You can also open technical issues or explore source code on our",
  "GitHub Repository": "GitHub Repository",
  "Suggerimenti per la Community": "Community Suggestions",
  "OR-Route cresce grazie alle esigenze concrete di fleet manager, ricercatori e autisti. Se proponi una nuova funzionalità, considera di includere:": "OR-Route grows through the practical needs of fleet managers, researchers, and drivers. When proposing a new feature, consider including:",
  "Il contesto reale:": "The real-world context:",
  "Tipo di merce trasportata, tipologia di veicoli o vincolo normativo.": "Type of cargo transported, vehicle categories, or regulatory constraints.",
  "La formulazione desiderata:": "The desired objective:",
  "Minimizzare chilometri, ore straordinario o veicoli impiegati.": "Minimizing kilometers, overtime hours, or number of active vehicles.",
  "Esempi o dataset:": "Sample instances or datasets:",
  "Pochi punti fittizi o città per validare il solutore MILP.": "A few coordinates or street segments to validate the MILP solver.",
  "Domande Frequenti sui Contatti": "Frequently Asked Questions",
  "Il servizio di supporto o suggerimento è gratuito?": "Is the support or feedback service free?",
  "Sì! OR-Route è una piattaforma aperta e gratuita creata per democratizzare l'accesso agli algoritmi di Ricerca Operativa industriale. Tutti i suggerimenti e le richieste di chiarimento sui modelli sono benvenuti e gestiti liberamente.": "Yes! OR-Route is an open and free platform created to democratize access to industrial Operations Research solvers. All suggestions and model clarification requests are welcomed and handled free of charge.",
  "Posso richiedere un algoritmo personalizzato per la mia flotta?": "Can I request a custom algorithm tailored to my fleet?",
  "Certamente. Se la tua azienda ha vincoli specifici (es. ZTL orarie dinamiche, temperature controllate per surgelati, o trasbordi rimorchio-motrice), inviaci una descrizione dettagliata tramite questo form per valutare la fattibilità e la modellazione.": "Certainly. If your company has specific operational constraints (e.g. dynamic hourly curfews, multi-compartment temperature controls, or trailer swaps), send us a detailed description via this form to evaluate feasibility and mathematical modeling.",
  "Cosa succede dopo aver inviato il modulo?": "What happens after submitting the form?",
  "Il modulo inoltra la tua notifica in tempo reale al nostro team tecnico. Riceverai un riscontro dettagliato direttamente all'indirizzo email che hai indicato entro 24-48 ore lavorative.": "The form transmits your notification in real time to our technical team. You will receive a detailed response directly at your specified email address within 24-48 business hours.",
  "OR-Route — Supporto & Contatti": "OR-Route — Support & Contact",
  "📝 Scrivi dal Modulo Web": "📝 Write via Web Form",
  "🏠 Torna ai Solutori": "🏠 Return to Solvers",
  "⚡ Tutti i 10 Modelli di Ricerca Operativa": "⚡ All 10 Operations Research Models",
  "Canale Ufficiale di Supporto & Suggerimenti Piattaforma • Riscontro garantito entro 24-48h.": "Official Support & Platform Feedback Channel • Guaranteed reply within 24-48h.",
  "es. Ing. Marco Rossi": "e.g. John Doe",
  "es. marco.rossi@azienda.it": "e.g. john.doe@company.com",
  "es. Logistica Nord Srl, Università...": "e.g. Acme Logistics Ltd, University...",
  "es. Suggerimento per l'introduzione di vincoli sul peso massimo per asse": "e.g. Suggestion to introduce axle load weight constraints",
  "Motori & Solutori": "Engines & Solvers",
  "© 2026 OR-Route — Piattaforma Aperta di Ricerca Operativa per Flotte Aziendali e Servizi RSU.": "© 2026 OR-Route — Open Operations Research Platform for Corporate Fleets and Municipal Waste Services."
};

  // =========================================================================
  // 2. FAQ TITOLI EN (1..23)
  // =========================================================================
  const FAQ_TITLES_EN = {
  "1": "1. What is Combinatorial Optimization in transportation and why is route planning NP-hard?",
  "2": "2. What is the fundamental difference between 'Node Routing' (CVRP/VRPTW) and 'Arc Routing' (CARP)?",
  "3": "3. How do you balance Fixed Vehicle Engagement Costs and Mileage Costs (€/km)?",
  "4": "4. What are Time Windows and how do they impact routing feasibility?",
  "5": "5. How does VRP with Pickups and Deliveries (VRPPD) differ from standard VRP?",
  "6": "6. When is Multi-Depot VRP (MDVRP) essential?",
  "7": "7. What is 'Deadheading' (empty transit) and how does Eulerian graph optimization minimize it?",
  "8": "8. How do Intermediate Facilities (Landfills / Fast Chargers) work in EV-VRP?",
  "9": "9. Exact Algorithms (Branch-and-Cut / CBC) vs Heuristics (Clarke-Wright, ALNS, Tabu Search)?",
  "10": "10. What is the real Return on Investment (ROI) and ESG impact?",
  "11": "11. Do OpenStreetMap maps and road downloads work worldwide?",
  "12": "12. 📅 When and why should the PCARP model be adopted for weekly waste collection?",
  "13": "13. ⏱️🛣️ How does CARPTW handle ZTL access windows, schools, and street markets?",
  "14": "14. ⚖️ How is Linear Density (kg/m) calculated in CARP models and how does it vary by waste fraction?",
  "15": "15. 🔐 How does User Authentication, Multi-User Management, and Scenario Saving work?",
  "16": "16. 📍 What are 'Nodes' in road networks and Operations Research (CARP vs VRP)?",
  "17": "17. 🌍 How does OpenStreetMap Import, Multi-Zone search, and Depot Link (R0) work?",
  "18": "18. 🗺️ How to use the Interactive Road Map, add/remove streets, and expand to Full Screen?",
  "19": "19. ⚡ How does Optimal Route Calculation work with the MILP Mathematical Solver?",
  "20": "20. 📋 How to interpret and print the Driver Route Sheet?",
  "21": "21. 🔄 What is meant by 'Deadheading' (empty transit) and how is it reduced?",
  "22": "22. 📁🚛 How to import the Vehicle Fleet from external files (Excel, CSV, TSV) and what fields are required?",
  "23": "23. 📁🛣️ How to import the Road Network, Customers, and Demands from external files and adapt them across models?"
};

  // =========================================================================
  // 3. FAQ RISPOSTE TECNICHE COMPLETE EN (1..23)
  // =========================================================================
  const FAQ_ANSWERS_EN = {
  "1": "Route planning belongs to the class of NP-hard <b>combinatorial optimization</b> problems (including TSP, CVRP, CARP). This means the number of possible routing permutations grows factorially with the number of stops or streets to be served ($O(n!)$). With just 20 stops, the number of theoretical route combinations exceeds $2.4 \\times 10^{18}$ (more than two billion billion alternative sequences).<br><br><b>Why aren't human intuition or standard GPS navigators enough?</b> Traditional navigators (such as Google Maps or Waze) are designed to find the shortest point-to-point path between two known locations. They cannot decide <i>which vehicle to assign</i> to each customer, nor determine the optimal <i>logical sequence</i> to visit dozens of stops while simultaneously respecting payload capacities, driver working hour regulations, and strict time windows.",
  "2": "The fundamental distinction lies in <b>where the service demand is located</b> on the network:<br><br>• <b>Node Routing (VRP / CVRP / VRPTW):</b> Demand is concentrated at <i>discrete points</i> (graph vertices). It is the ideal formulation for parcel couriers (Amazon, DHL, FedEx), food/pharma distributors, home deliveries, and field service technicians. Vehicles traverse roads solely to travel between one stop and the next.<br><br>• <b>Arc Routing (CARP / PCARP / CARPTW):</b> Demand is distributed <i>along the streets</i> (graph edges). It is the mandatory mathematical formulation for <b>curbside municipal waste collection (RSU)</b>, street sweeping, winter road salting, snow plowing, and pipeline inspection. Here, the vehicle does not merely reach a coordinate: it must traverse the entire road segment performing continuous service.",
  "3": "Every mobilized vehicle incurs two mathematically opposing cost categories in the objective function:<br><br>$$\\min Z = \\sum_{k} \\text{FixedCost}_k \\cdot z_k + \\sum_{k} \\sum_{(i,j)} \\text{MileageCost}_k \\cdot d_{ij} \\cdot x_{ijk}$$<br>• <b>Fixed Turnout Costs ($F_k$):</b> Include daily vehicle depreciation or lease, insurance, road tax, and most importantly <b>crew labor costs</b> (driver + operators for the entire shift). Deploying a van or compactor typically costs between €120 and €280 per shift before turning the ignition key.<br><br>• <b>Variable Mileage Costs ($c_k$):</b> Include fuel consumption, tire wear, and wear-and-tear per km (typically €0.35 - €0.85/km).<br><br><b>The Optimal Trade-off:</b> Without an Operations Research solver, fleet managers often dispatch too many vehicles 'just in case', duplicating fixed labor costs. The algorithm computes the exact break-even point: if deploying an extra vehicle saves fewer mileage costs than its fixed daily engagement fee, the solver consolidates shipments onto active vehicles, maximizing payload utilization.",
  "4": "A <b>Time Window</b> $[a_i, b_i]$ defines the strict allowable time span within which service at customer or street $i$ must commence:<br><br>• If a vehicle arrives earlier than $a_i$, it must <b>wait idle</b> (unproductive waiting time).<br>• If it arrives later than $b_i$, the constraint is <b>violated</b> (risking rejected delivery, SLA contract penalties, or municipal traffic fines).<br><br>In mathematical formulations (VRPTW and CARPTW), schedule timing is propagated linearly using a continuous arrival time variable $w_{ik}$ and the <i>Big-M</i> formulation:<br>$$w_{jk} \\ge w_{ik} + s_i + t_{ij} - M \\cdot (1 - x_{ijk})$$<br>where $s_i$ is the service/dwell time and $t_{ij}$ is travel time between $i$ and $j$. The solver sequences visits to eliminate idle waiting and ensure 100% on-time delivery compliance.",
  "5": "In standard CVRP, all goods start from the central warehouse and are delivered to customers (outbound only), or all waste is collected and brought to base (inbound only).<br><br>In <b>VRP with Pickups and Deliveries (VRPPD)</b>, demands consist of coupled pairs $(P_i, D_i)$:<br>1. <b>Precedence Constraint:</b> The pickup stop $P_i$ must be visited <i>strictly before</i> the delivery stop $D_i$ ($w_{P_i} < w_{D_i}$).<br>2. <b>Vehicle Coupling Constraint:</b> Both pickup and dropoff of a given order must be performed by the <i>very same vehicle</i>.<br>3. <b>Dynamic Capacity Tracking:</b> Onboard payload fluctuates throughout the trip. At each pickup stop $P_i$, payload increases by $q_i$, while at delivery stop $D_i$, it decreases by $q_i$, and the instantaneous load can never exceed the vehicle's maximum payload limit.",
  "6": "The <b>MDVRP</b> formulation is essential whenever an enterprise operates from <b>two or more distribution centers, regional warehouses, or operational depots</b>.<br><br><b>The Algorithmic Challenge:</b> Optimizing each depot in isolation results in costly cross-territorial overlap (e.g. a truck from Depot A serving a customer adjacent to Depot B). MDVRP solves two integrated optimization problems simultaneously:<br>1. <b>Optimal Clustering &amp; Assignment:</b> Partitions customers to their geographically and economically most cost-effective home depot.<br>2. <b>Circular Routing:</b> Plans vehicle tours ensuring each truck departs from and returns to its assigned <i>Home Depot base</i>, eliminating cross-territorial duplication.",
  "7": "In street-network services (curbside municipal waste collection, mechanical street sweeping, winter salting), <b>Deadheading</b> refers to any kilometer traveled without performing productive service (e.g. a sweeping truck with brushes lifted traveling over an already cleaned street just to reach the next district).<br><br><b>The Mathematical Solution:</b> This problem roots in the celebrated <i>Chinese Postman Problem (CPP)</i> and Eulerian graph theory: a graph can be traversed without re-tracing only if all vertices have even degree. When real street networks contain odd-degree intersections, the CARP solver executes a <b>Min-Weight Perfect Matching</b> to duplicate the minimum length of deadhead arcs, slashing empty transit by up to 35% compared to manual routing.",
  "8": "In heavy waste collection or fleet electrification, the physical range of the vehicle (either in body payload capacity or battery kWh) is often insufficient to sustain an entire 7-8 hour work shift without replenishment.<br><br>• <b>In Waste Management (CARPIF):</b> When a compactor reaches capacity (e.g., 10,000 kg), returning to the primary depot terminates productivity prematurely. Instead, the solver routes the vehicle to an <i>Intermediate Facility (IF)</i>, such as an MBT plant, transfer station, or landfill. Discharging payload instantly resets onboard load, allowing the vehicle to begin a second collection tour within the same shift.<br><br>• <b>In Electric Fleets (EV-VRP):</b> The algorithm schedules stops at <i>DC fast-charging stations</i> whenever the battery State of Charge (SoC) falls below a safe threshold (e.g., 20%), optimizing charging duration to guarantee zero roadside breakdowns.",
  "9": "In Operations Research, no single algorithmic approach fits all problem sizes:<br><br>• <b>Exact Solvers (MILP - Branch-and-Cut, COIN-OR CBC, Gurobi, CPLEX):</b> Explore the mathematical solution space and guarantee finding the <b>proven global optimum</b> or a certified optimality gap. They are unmatched for instances up to 30-50 stops or municipal road clusters (25-50 streets), providing absolute maximum savings.<br><br>• <b>Metaheuristics (Clarke-Wright Savings, ALNS, Tabu Search, Genetic Algorithms):</b> When stop counts reach hundreds or thousands, exact computation becomes intractable ($NP$-hard). Metaheuristics deliver <i>near-optimal solutions of exceptional quality</i> within seconds (typically within 1-3% of theoretical optimum).<br><br><b>OR-Route's Hybrid Strategy:</b> Our engine combines the best of both worlds: executing fast spatial clustering heuristics and solving each operational cluster with exact MILP algorithms.",
  "10": "Empirical data verified across corporate logistics fleets and municipal waste collection providers demonstrate substantial savings:<br><br>• <b>Mileage Reduction:</b> Between <b>18% and 35%</b> fewer kilometers driven compared to manual scheduling or driver intuition.<br>• <b>Direct Fuel Savings:</b> For a fleet of 10 commercial vehicles averaging 120 km/day at €1.85/liter, net savings exceed <b>€15,000 – €28,000 annually</b> in fuel expenses alone.<br>• <b>Overtime Labor Reduction:</b> By eliminating routing dead ends and uncoordinated turns, shifts conclude on schedule, reducing driver overtime pay by 40-60%.<br>• <b>ESG Sustainability (Scope 1):</b> Every unburned liter of diesel prevents approximately 2.65 kg of $CO_2$ emissions. An average fleet saves over 25 tons of $CO_2$ per year, strengthening ESG compliance.",
  "11": "Geographic road maps and network extraction operate <b>seamlessly for any municipality and country worldwide</b>.<br><br>Powered by native integration with the official <b>OpenStreetMap (OSM) Overpass API</b>, OR-Route extracts and constructs mathematical graph topologies for any municipality, metropolitan area, or industrial park across Europe, the Americas, Asia, and Africa. Simply enter the city name or GPS coordinates to retrieve actual drivable streets, one-way restrictions, and exact metric road lengths.",
  "12": "The <b>PCARP (Periodic Capacitated Arc Routing Problem)</b> is indispensable when curbside waste collection or street sweeping follows a <b>multi-day weekly schedule (e.g. Monday — Saturday)</b> with varying waste fraction collection frequencies (e.g., Organic 3 times/week, Paper on Tuesday, Plastic on Wednesday, Residual Waste on Friday).<br><br><b>Why optimize across the entire week rather than day by day?</b> Isolated daily planning causes erratic fleet utilization — compactors maxed out on Monday while running half-empty on Tuesday. PCARP synchronizes routing across the multi-day planning horizon:<br>1. <b>Combinatorial Frequency Day-Combination Assignment:</b> Chooses optimal service day schedules for recurring visits.<br>2. <b>Fleet Workload Balancing:</b> Evenly distributes daily mileage and tons collected across all 6 working days, reducing overall peak fleet size requirements.",
  "13": "In real municipal environments, streets cannot be serviced at arbitrary hours of the day:<br><br>• <b>Pedestrian &amp; Low Emission Zones (ZTL):</b> Access gates allow heavy trucks only during restricted morning windows (e.g., 05:30 — 08:30) before retail commerce opens.<br>• <b>School Zones:</b> Streets surrounding school campuses must be completely cleared before school bus arrivals (07:30 — 08:30) for traffic safety.<br>• <b>Street Markets:</b> Market squares can only be swept and washed <i>after</i> vendors dismantle stalls (e.g., post-14:00).<br><br>The <b>CARPTW</b> model assigns each road arc a strict operational time window $[e_a, l_a]$. The MILP solver sequences vehicle passes so that time-restricted streets are reached precisely during their open windows, preventing city fines and operational disruptions.",
  "14": "In <b>CARP (Capacitated Arc Routing Problem)</b> models, service is continuous along the road network. Since <b>OpenStreetMap</b> provides geometry and street length in meters ($m$), but does not contain municipal tax records, <b>OR-Route</b> estimates waste volume per street via linear density:<br><br>\n<div style=\"background: rgba(15, 23, 42, 0.6); padding: 12px; border-left: 3px solid #38bdf8; border-radius: 4px; font-family: monospace; font-size: 13px; margin-bottom: 12px;\">\n  Street Demand (kg) = Round [ Length (m) &times; Linear_Density (kg/m), 10 ]\n</div>\nThe software default is set to <b>1.5 kg/m</b> (e.g., a 200m street has a demand of 300 kg). In real collection operations, linear density varies by waste fraction and urban density.<br><br>\n\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">🇮🇹 1. National Overview (Official ISPRA Waste Data)</h4>\nAccording to ISPRA national statistics, average municipal solid waste generation in Italy is <b>500–510 kg per capita/year</b>, with national separate collection exceeding <b>67.7%</b>:<br>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Organic Waste (Food &amp; Green):</b> ~34.8% (approx. 125–135 kg/capita/year). High density, collected 2–3 times/week.</li>\n  <li><b>Paper &amp; Cardboard:</b> ~19.5% (approx. 50–55 kg/capita/year). Medium-high density, collected biweekly or weekly.</li>\n  <li><b>Light Multi-material (Plastic &amp; Metals):</b> ~14.2% (approx. 35–40 kg/capita/year). Low weight, high volume.</li>\n  <li><b>Glass:</b> ~9.1% (approx. 40–45 kg/capita/year). High density and weight.</li>\n  <li><b>Residual / Unsorted Waste:</b> ~22.4% (approx. 80–110 kg/capita/year). Collected weekly or fortnightly.</li>\n</ul>\n\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">🍇 2. Real Case Study: Municipality of Conegliano (Veneto, Italy)</h4>\nUnder <b>Pay-As-You-Throw (PAYT)</b> billing with RFID microchipped bins, Conegliano achieves <b>87%–89% separate collection</b>, with residual waste cut to <b>50–55 kg/capita/year</b>.<br><br>\n<div class=\"table-responsive\" style=\"margin-bottom: 14px;\">\n  <table class=\"opt-table\" style=\"font-size: 12.5px;\">\n    <thead>\n      <tr>\n        <th>Waste Fraction</th>\n        <th>Shift Frequency (Conegliano)</th>\n        <th>Real Linear Density (kg/m)</th>\n        <th>Linear Density (kg/km)</th>\n        <th>Container Type &amp; Recommended Vehicle</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td><b>🍏 Organic / Food Waste</b></td>\n        <td>2 times / week (Mon, Fri)</td>\n        <td><span class=\"code-tag\" style=\"color: #34d399;\">0.80 – 1.40 kg/m</span></td>\n        <td>800 – 1,400 kg/km</td>\n        <td>25L vented bin / 120L wheeled bins &bull; Satellite tipper van (5-7 m&sup3;)</td>\n      </tr>\n      <tr>\n        <td><b>📦 Paper &amp; Cardboard</b></td>\n        <td>Fortnightly (Alternating Wed)</td>\n        <td><span class=\"code-tag\" style=\"color: #38bdf8;\">0.60 – 1.10 kg/m</span></td>\n        <td>600 – 1,100 kg/km</td>\n        <td>40L box / 240L bins &bull; Rear compactor (10-16 m&sup3;)</td>\n      </tr>\n      <tr>\n        <td><b>🧴 Plastic &amp; Cans</b></td>\n        <td>Fortnightly (Alternating Thu)</td>\n        <td><span class=\"code-tag\" style=\"color: #fbbf24;\">0.25 – 0.40 kg/m*</span></td>\n        <td>250 – 400 kg/km</td>\n        <td>110L semi-transparent yellow bags &bull; High-volume compactor (20-24 m&sup3;)</td>\n      </tr>\n      <tr>\n        <td><b>🍾 Glass (Single-fraction)</b></td>\n        <td>Every 3 weeks (Saturday)</td>\n        <td><span class=\"code-tag\" style=\"color: #38bdf8;\">0.45 – 0.85 kg/m</span></td>\n        <td>450 – 850 kg/km</td>\n        <td>35L green bin &bull; Crane truck / tipping body with soundproof floor</td>\n      </tr>\n      <tr>\n        <td><b>🗑️ Residual / Unsorted</b></td>\n        <td>Fortnightly (Alternating Tue)</td>\n        <td><span class=\"code-tag\" style=\"color: #f87171;\">0.35 – 0.70 kg/m</span></td>\n        <td>350 – 700 kg/km</td>\n        <td>120L RFID transponder bin &bull; Rear compactor (10-16 m&sup3;)</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n<small style=\"color: var(--text-muted); display: block; margin-top: -6px; margin-bottom: 12px;\">*Operational note on Plastic: lightweight packaging saturates body volume (m&sup3;) before reaching maximum weight capacity.</small>\n\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">🏘️ 3. Differentiation by Urban District in Conegliano</h4>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Historic Center &amp; Apartments (Corso Mazzini, Via Cavour, Viale Carducci):</b> Multi-family buildings and shops create higher linear densities (<b>1.50 – 2.40 kg/m</b>). Narrow streets require agile compactors (2-axle / 6.5t).</li>\n  <li><b>Residential &amp; Hilly Neighborhoods (Monticella, Colnù, Campolongo):</b> Detached houses with front gardens produce lower linear densities (<b>0.40 – 0.90 kg/m</b>). Longer routes favor medium compactors (10–14 m&sup3;).</li>\n  <li><b>Commercial &amp; Industrial Zones (Campidui, S. Vendemiano border):</b> High cardboard and plastic volumes require larger vehicles (18–26t, 3-axle).</li>\n</ul>\n\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">🛠️ 4. How to Customize Payload in OR-Route</h4>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Direct Table Editing:</b> In the \"Road Network &amp; Waste Demand\" table, edit the \"Waste Demand (kg)\" column directly for any street.</li>\n  <li><b>External File Import:</b> Upload custom spreadsheets (.xlsx / .csv) with specific per-street kilograms.</li>\n  <li><b>Calibration from Weighing Tickets:</b> In the CARP model, enter actual weighbridge receipts (e.g. 8,450 kg) to proportionally rescale all streets with one click.</li>\n</ul>",
  "15": "The <b>OR-Route</b> platform includes complete <b>secure authentication and multi-user scenario management</b> built on an integrated SQLite relational database (<code>or_route_data.db</code>) with unique session tokens:<br><br>\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">👤 1. User Registration and Login</h4>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Account Creation:</b> Click \"👤 Sign In / Register\" in the top header. Enter a username and password (hashed with SHA-256 and salted).</li>\n  <li><b>Local &amp; Cloud Profile:</b> Session tokens are preserved in local storage. Once authenticated, your username appears in the header with access to your private scenario library.</li>\n</ul>\n\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">💾 2. What is Saved in a Scenario?</h4>\nWhen you click <b>\"💾 Save Scenario\"</b>, the system serializes:\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Road Network &amp; GIS Topology:</b> The complete street network downloaded from OpenStreetMap, including node IDs, coordinates, street names, lengths, and waste demands.</li>\n  <li><b>Vehicle Fleet &amp; Cost Structures:</b> All trucks, payload capacities, hourly wages, and fuel rates.</li>\n  <li><b>Depot Location &amp; Facilities:</b> Base depot coordinates and intermediate transfer stations.</li>\n  <li><b>Mathematical Model Settings:</b> Exact solver configuration and parameters.</li>\n</ul>\n\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">📂 3. Loading, Editing, and Deleting Scenarios</h4>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>My Scenarios:</b> The management drawer displays a chronological list of saved configurations with vehicle counts, street segments, and creation timestamps.</li>\n  <li><b>1-Click Recall:</b> Click \"Load\" to instantly restore the entire workspace.</li>\n  <li><b>Offline Backup:</b> You can also export your session as a standalone <code>.json</code> file to work entirely offline without an account.</li>\n</ul>",
  "16": "In graph theory and Operations Research, any road map or geographic territory is represented as a mathematical graph $G = (V, E)$, where $V$ represents the set of <b>Nodes (Vertices)</b> and $E$ represents the set of <b>Arcs (Road Segments)</b>.<br><br>\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">🚦 1. In CARP Models (Curbside Collection &amp; Street Sweeping)</h4>\nWaste collection occurs <b>along the streets</b>, not at intersections:\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Nodes are Road Intersections:</b> Junctions, roundabouts, or turning points. They have no waste demand ($q_i = 0$).</li>\n  <li><b>Arcs are Streets with Demand:</b> Each street $(u, v)$ connects intersection $u$ with intersection $v$ and carries a waste load in kg.</li>\n  <li><b>Depot (Node 0):</b> The home yard where vehicles depart and return.</li>\n</ul>\n\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">📦 2. In CVRP and VRPTW Models (Discrete Customer Deliveries)</h4>\nUnder Node Routing:\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Nodes ARE the Customers:</b> Each node represents a specific delivery address, hospital, supermarket, or smart bin.</li>\n  <li><b>Arcs are Transit Paths:</b> The shortest driving paths between customer stops.</li>\n</ul>\n\n<h4 style=\"color: #38bdf8; font-size: 14px; margin-bottom: 8px;\">📋 3. Communicating Routes to Drivers (Driver Route Sheet)</h4>\n<b>Drivers do not need to memorize mathematical node numbers!</b><br>\nThe <b>Driver Route Sheet</b> automatically translates graph topology into plain turn-by-turn road instructions:\n<div style=\"background: rgba(15, 23, 42, 0.6); padding: 10px; border-left: 3px solid #34d399; border-radius: 4px; font-family: monospace; font-size: 12.5px; margin: 10px 0;\">\n  \"Depart from Base Depot &rarr; Transit R0 via Highway &rarr; 1. Via Roma (collect 850 kg) &rarr; 2. Turn right on Via Cavour (collect 420 kg) &rarr; Return to Depot.\"\n</div>",
  "17": "The <b>OR-Route</b> platform integrates a direct cartographic connector with official worldwide <b>OpenStreetMap (OSM)</b> servers and the <b>OSRM</b> routing engine:<br><br>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Multi-Municipality Support:</b> You can enter one or more municipalities or districts separated by semicolons (e.g. <code>Conegliano; Susegana; San Vendemiano</code>). The platform merges adjacent road networks into a unified continuous graph.</li>\n  <li><b>Depot Positioning (Node 0):</b> Enter precise GPS coordinates (lat, lon) or let the system automatically assign the geometric centroid of the operational sector.</li>\n  <li><b>Operational Sector Radius:</b> Select a search radius (e.g. 500m to 1,500m) tailored to a realistic daily driver shift (~25–50 streets).</li>\n  <li><b>Depot Link (R0):</b> If the operational depot lies outside the collection area, the system automatically builds a fast transit arc (R0) connecting the base to the first collection street.</li>\n</ul>",
  "18": "The integrated Leaflet GIS map provides full visual and interactive control of the road network:<br><br>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>➕ Add Street:</b> Activates interactive drawing mode; click a start point on the map and a destination point to draw a new road segment.</li>\n  <li><b>🗑️ Delete Street:</b> Click on any street polyline on the map to inspect its details or remove it.</li>\n  <li><b>✏️ Edit Geometry:</b> Drag route handles to match actual vehicle travel directions.</li>\n  <li><b>🖥️ Full Screen:</b> Toggle full-screen mode for dispatchers and control rooms to visualize entire municipal fleets simultaneously.</li>\n</ul>",
  "19": "Clicking <b>\"⚡ Solve Fleet\"</b> or <b>\"⚡ Calculate Optimal Routes\"</b> triggers mathematical optimization powered by <b>COIN-OR CBC and PuLP</b>:<br><br>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Single-Commodity Flow Formulation:</b> Eliminates disconnected subtours and ensures continuous flow conservation from departure to return.</li>\n  <li><b>Min-Weight Bipartite Matching:</b> Identifies odd-degree intersections and pairs them to minimize deadhead empty travel.</li>\n  <li><b>Capacity &amp; Time Window Constraints:</b> Formulates linear Big-M equations ensuring no vehicle exceeds its maximum payload or breaches customer appointment windows.</li>\n  <li><b>Solver Certification:</b> Outputs exact computation runtime, total fleet cost, and proven mathematical optimality gap.</li>\n</ul>",
  "20": "The <b>Driver Route Sheet</b> translates complex mathematical solutions directly into intuitive, practical guidance for crews in the field:<br><br>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Chronological Turn-by-Turn Sequence:</b> Lists every street in exact traversal order, distinguishing active collection from deadhead transit.</li>\n  <li><b>Payload Milestones:</b> Displays progressive onboard weight at each segment, preventing overload surprises.</li>\n  <li><b>Time Windows &amp; Schedules:</b> Indicates scheduled arrival times, helping drivers pace shifts accurately.</li>\n  <li><b>Print &amp; Digital Copy:</b> Formatted for standard A4 printing or 1-click clipboard copy for messaging apps (WhatsApp, Telegram, SMS).</li>\n</ul>",
  "21": "<b>Deadheading</b> (empty transit) refers to every kilometer traveled by a vehicle without performing productive service:<br><br>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>Typical Causes:</b> One-way street restrictions, dead-end streets (cul-de-sacs), or repositioning between non-adjacent neighborhoods.</li>\n  <li><b>OR-Route Optimization:</b> The algorithm converts the network into an Eulerian graph by adding minimal-cost matching paths, ensuring vehicles traverse deadhead connections only when strictly required.</li>\n  <li><b>Empirical Savings:</b> Field deployments demonstrate deadhead reductions between 25% and 35%, slashing unnecessary city traffic and emissions.</li>\n</ul>",
  "22": "OR-Route allows instant upload of your entire vehicle fleet from any ERP or spreadsheet (Excel <code>.xlsx</code> / <code>.xls</code>, CSV <code>.csv</code>, or TSV <code>.tsv</code> / <code>.txt</code>).<br><br>\n<h4 style=\"color: #34d399; font-size: 13.5px; margin-bottom: 6px;\">📋 Fleet File Specifications &amp; Headers:</h4>\n<p style=\"font-size: 12.5px; color: var(--text-secondary); margin-bottom: 10px;\">\n  Header names are flexible and case-insensitive. Column order does not matter:\n</p>\n<div class=\"table-responsive\" style=\"margin-bottom: 14px;\">\n  <table class=\"opt-table\" style=\"font-size: 12px;\">\n    <thead>\n      <tr>\n        <th>Column Name (Header)</th>\n        <th>Required</th>\n        <th>Description &amp; Unit of Measure</th>\n        <th>Default / Example Value</th>\n        <th>Usage in Models</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td><code>nome</code> / <code>veicolo</code> / <code>id</code></td>\n        <td><b>Yes</b></td>\n        <td>Unique name or plate of the vehicle</td>\n        <td><i>Compattatore 2 Assi A</i></td>\n        <td>All 10 Models</td>\n      </tr>\n      <tr>\n        <td><code>portata</code> / <code>capacita</code> / <code>kg</code></td>\n        <td><b>Yes</b></td>\n        <td>Maximum payload capacity (kg or quintals)</td>\n        <td><i>8000</i> (or 80 qt)</td>\n        <td>All 10 Models</td>\n      </tr>\n      <tr>\n        <td><code>costo_fisso</code> / <code>fisso</code></td>\n        <td>No</td>\n        <td>Fixed shift turnout cost (€/shift)</td>\n        <td><i>120.00</i></td>\n        <td>All 10 Models</td>\n      </tr>\n      <tr>\n        <td><code>costo_km</code> / <code>costo_carburante</code></td>\n        <td>No</td>\n        <td>Variable mileage cost (€/km)</td>\n        <td><i>0.65</i></td>\n        <td>All 10 Models</td>\n      </tr>\n      <tr>\n        <td><code>batteria_kwh</code> / <code>autonomia</code></td>\n        <td>No</td>\n        <td>Battery capacity in kWh</td>\n        <td><i>120.0</i></td>\n        <td>EV-VRP</td>\n      </tr>\n      <tr>\n        <td><code>deposito</code> / <code>home_depot</code></td>\n        <td>No</td>\n        <td>Depot ID or name where vehicle is based</td>\n        <td><i>Deposito Centrale</i></td>\n        <td>MDVRP</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n<div style=\"display: flex; gap: 10px; margin-top: 8px;\">\n  <a href=\"/template_flotta.csv\" download=\"template_flotta.csv\" class=\"btn btn-secondary btn-sm\">📥 Download Fleet Template (.csv)</a>\n  <button class=\"btn btn-primary btn-sm\" onclick=\"document.getElementById('fileInputFleet')?.click()\">📁 Import Fleet Now</button>\n</div>",
  "23": "OR-Route allows importing territorial demand databases (municipal street lists, street numbers, waste demands, or customer delivery points) directly from Excel or text files, natively integrating with municipal GIS databases and ERP systems.<br><br>\n<h4 style=\"color: #38bdf8; font-size: 13.5px; margin-bottom: 6px;\">📋 Demand &amp; Street File Specifications:</h4>\n<p style=\"font-size: 12.5px; color: var(--text-secondary); margin-bottom: 10px;\">\n  The parser automatically detects header rows regardless of column order:\n</p>\n<div class=\"table-responsive\" style=\"margin-bottom: 14px;\">\n  <table class=\"opt-table\" style=\"font-size: 12px;\">\n    <thead>\n      <tr>\n        <th>Field (Header)</th>\n        <th>Required</th>\n        <th>Description &amp; Format</th>\n        <th>Example Value</th>\n        <th>Usage in Models</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td><code>indirizzo</code> / <code>via</code> / <code>nome</code></td>\n        <td><b>Yes</b></td>\n        <td>Street name, district, or customer stop</td>\n        <td><i>Via Cavour</i></td>\n        <td>All 10 Models</td>\n      </tr>\n      <tr>\n        <td><code>carico</code> / <code>domanda</code> / <code>kg</code></td>\n        <td><b>Yes</b></td>\n        <td>Demand to collect or deliver (kg)</td>\n        <td><i>450</i></td>\n        <td>All 10 Models</td>\n      </tr>\n      <tr>\n        <td><code>lat</code> / <code>latitudine</code></td>\n        <td>No*</td>\n        <td>GPS Latitude (decimal WGS84)</td>\n        <td><i>45.885412</i></td>\n        <td>CVRP, VRPTW, EV-VRP, VRPPD, MDVRP</td>\n      </tr>\n      <tr>\n        <td><code>lon</code> / <code>longitudine</code></td>\n        <td>No*</td>\n        <td>GPS Longitude (decimal WGS84)</td>\n        <td><i>12.298741</i></td>\n        <td>CVRP, VRPTW, EV-VRP, VRPPD, MDVRP</td>\n      </tr>\n      <tr>\n        <td><code>finestra_inizio</code> / <code>ora_inizio</code></td>\n        <td>No</td>\n        <td>Start of time window (HH:MM or minutes)</td>\n        <td><i>08:30</i></td>\n        <td>VRPTW, CARPTW</td>\n      </tr>\n      <tr>\n        <td><code>finestra_fine</code> / <code>ora_fine</code></td>\n        <td>No</td>\n        <td>End of time window (HH:MM or minutes)</td>\n        <td><i>10:30</i></td>\n        <td>VRPTW, CARPTW</td>\n      </tr>\n      <tr>\n        <td><code>giorni</code> / <code>frequenza</code></td>\n        <td>No</td>\n        <td>Collection days (e.g. Lun-Mer-Ven)</td>\n        <td><i>Lun, Gio</i></td>\n        <td>PCARP</td>\n      </tr>\n    </tbody>\n  </table>\n</div>\n<h4 style=\"color: #38bdf8; font-size: 13.5px; margin-bottom: 6px;\">🔄 Automatic Multi-Model Adaptation:</h4>\n<ul style=\"margin: 6px 0 12px 20px; line-height: 1.6;\">\n  <li><b>In Arc Models (CARP, PCARP, CARPTW):</b> Rows are interpreted as streets to collect. If coordinates are omitted, the system matches street names against the loaded OpenStreetMap road network.</li>\n  <li><b>In Node Models (CVRP, VRPTW, EV-VRP, VRPPD, MDVRP):</b> Rows represent discrete customer stops. Coordinates place exact delivery points on the GIS map.</li>\n</ul>\n<div style=\"display: flex; gap: 10px; margin-top: 8px;\">\n  <a href=\"/template_utenze.csv\" download=\"template_utenze.csv\" class=\"btn btn-secondary btn-sm\">📥 Download Demands Template (.csv)</a>\n  <button class=\"btn btn-primary btn-sm\" onclick=\"document.getElementById('fileInputStreets')?.click()\">📁 Import Demands Now</button>\n</div>"
};

  // =========================================================================
  // 4. 10 INFO BANNERS EN
  // =========================================================================
  const FAQ_GROUPS_EN = [
  "<div class=\"faq-group\">\n  <div style=\"background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 18px; margin-bottom: 24px;\">\n    <h3 style=\"color: #38bdf8; font-size: 16.5px; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;\">\n      <span>📘</span> User Operational Manual: Step-by-Step Guide to OR-Route\n    </h3>\n    <p style=\"font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5;\">\n      This practical guide walks you through daily platform usage: entering fleet specifications, choosing the right mathematical formulation, importing real geographic maps, running optimization solvers, and reading optimal route schedules.\n    </p>\n  </div>\n\n  <div style=\"display: flex; flex-direction: column; gap: 20px;\">\n    <!-- FASE 1 -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; border-left: 4px solid #38bdf8;\">\n      <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;\">\n        <h4 style=\"margin: 0; font-size: 15px; color: var(--text-main); display: flex; align-items: center; gap: 8px;\">\n          <span>🧭</span> 1. How to Find the Optimal Model for Your Business\n        </h4>\n        <span class=\"code-tag\" style=\"color: #38bdf8; font-size: 11px;\">STAGE 1 &bull; Model Selection</span>\n      </div>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;\">\n        From the main landing page, answer the guided questionnaire to identify the exact Operations Research problem matching your operations:\n      </p>\n      <ul style=\"margin: 0 0 0 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.6;\">\n        <li><b>1. Service Topology:</b> Select <i>\"Discrete Customer Points\"</i> for courier freight delivery, wholesale distribution, or technician visits (Node Routing &rarr; CVRP, VRPTW). Select <i>\"Along Entire Streets\"</i> for municipal waste collection, street sweeping, winter road salting, or pipeline inspection (Arc Routing &rarr; CARP).</li>\n        <li><b>2. Paired Pickups &amp; Deliveries:</b> If cargo is collected at stop A and delivered to stop B within the same shift, the system selects <b>VRPPD</b>.</li>\n        <li><b>3. Multi-Depot Operations:</b> If your fleet operates from multiple regional warehouses or operational yards, the system selects <b>MDVRP</b>.</li>\n        <li><b>4. Strict Time Windows &amp; ZTL Curfews:</b> If deliveries require fixed arrival times (hospitals, schools, supermarkets) or historic centers impose pedestrian curfews, the system selects <b>VRPTW</b> or <b>CARPTW</b>.</li>\n        <li><b>5. Intermediate Stops:</b> If vehicles empty waste at landfills/transfer stations or recharge batteries at DC fast chargers mid-shift, the system selects <b>CARPIF</b> or <b>EV-VRP</b>.</li>\n      </ul>\n    </div>\n\n    <!-- FASE 2 -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; border-left: 4px solid #34d399;\">\n      <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;\">\n        <h4 style=\"margin: 0; font-size: 15px; color: var(--text-main); display: flex; align-items: center; gap: 8px;\">\n          <span>🚛</span> 2. Fleet Configuration &amp; Cost Calibration\n        </h4>\n        <span class=\"code-tag\" style=\"color: #34d399; font-size: 11px;\">STAGE 2 &bull; Fleet Setup</span>\n      </div>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;\">\n        Under Part 2 of the Wizard or directly inside the active model's fleet table:\n      </p>\n      <ul style=\"margin: 0 0 0 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.6;\">\n        <li><b>Add Fleet Categories:</b> Configure vehicle types (vans, 2-axle trucks, 3-axle compactors) with count, payload capacity (kg), driver wages, and daily lease rates.</li>\n        <li><b>Fixed Shift Turnout Cost (€/shift):</b> Automatically computed as <code>(Driver Wage &times; Crew &times; Shift Hours) + Daily Lease</code>.</li>\n        <li><b>Variable Mileage Cost (€/km):</b> Fuel consumption and maintenance per kilometer.</li>\n        <li><b>File Import:</b> Upload spreadsheets (.xlsx / .csv / .tsv) directly into the fleet table with 1 click.</li>\n      </ul>\n    </div>\n\n    <!-- FASE 3 -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; border-left: 4px solid #fbbf24;\">\n      <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;\">\n        <h4 style=\"margin: 0; font-size: 15px; color: var(--text-main); display: flex; align-items: center; gap: 8px;\">\n          <span>🌍</span> 3. Real Geographic Map Import from OpenStreetMap (OSM)\n        </h4>\n        <span class=\"code-tag\" style=\"color: #fbbf24; font-size: 11px;\">STAGE 3 &bull; Cartography</span>\n      </div>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;\">\n        Click <b>\"🌍 Import from OpenStreetMap\"</b> in the CARP model or header:\n      </p>\n      <ul style=\"margin: 0 0 0 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.6;\">\n        <li><b>Worldwide Municipality Coverage:</b> Enter city names anywhere in the world (e.g. <i>Conegliano; Susegana</i>). The platform queries Overpass API and builds a continuous mathematical graph.</li>\n        <li><b>Depot Base Location:</b> Enter GPS coordinates or address. The closest intersection becomes Node 0.</li>\n        <li><b>Daily Sector Sizing:</b> Set radius (500m to 1,500m) to match a realistic driver shift (~25–50 streets).</li>\n      </ul>\n    </div>\n\n    <!-- FASE 4 -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; border-left: 4px solid #a855f7;\">\n      <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;\">\n        <h4 style=\"margin: 0; font-size: 15px; color: var(--text-main); display: flex; align-items: center; gap: 8px;\">\n          <span>⚡</span> 4. Running the Optimization Solvers &amp; Reading Results\n        </h4>\n        <span class=\"code-tag\" style=\"color: #a855f7; font-size: 11px;\">STAGE 4 &bull; Execution</span>\n      </div>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;\">\n        Click <b>\"⚡ Solve Fleet\"</b> or <b>\"⚡ Solve &amp; Update GIS Map\"</b>:\n      </p>\n      <ul style=\"margin: 0 0 0 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.6;\">\n        <li><b>Mathematical Solution Status:</b> Displays runtime, total cost, kilometers, and proven optimality.</li>\n        <li><b>Interactive Color-Coded Map:</b> Each vehicle tour is highlighted with distinct colored polylines and directional arrows.</li>\n        <li><b>Vehicle KPI Summary:</b> Payload saturation, operating time, and deadhead transit percentage.</li>\n      </ul>\n    </div>\n\n    <!-- FASE 5 -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; border-left: 4px solid #f43f5e;\">\n      <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;\">\n        <h4 style=\"margin: 0; font-size: 15px; color: var(--text-main); display: flex; align-items: center; gap: 8px;\">\n          <span>📋</span> 5. Printing Driver Route Sheets &amp; Cloud Profile Saving\n        </h4>\n        <span class=\"code-tag\" style=\"color: #f43f5e; font-size: 11px;\">STAGE 5 &bull; Operational Delivery</span>\n      </div>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;\">\n        Deploying results to drivers in the field:\n      </p>\n      <ul style=\"margin: 0 0 0 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.6;\">\n        <li><b>Driver Route Sheet:</b> Formatted for A4 printing or mobile messaging (WhatsApp, Telegram) with chronological street-by-street instructions.</li>\n        <li><b>Cloud Scenario Synchronization:</b> Save your scenario to your encrypted profile or export as standalone JSON.</li>\n        <li><b>ROI &amp; ESG Calculator:</b> Assess yearly economic savings and CO2 emission cuts for sustainability reporting.</li>\n      </ul>\n    </div>\n  </div>\n</div>",
  "<div class=\"faq-group\">\n  <div style=\"background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 18px; margin-bottom: 24px;\">\n    <h3 style=\"color: #c084fc; font-size: 16.5px; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;\">\n      <span>📐</span> Theoretical Handbook: Mixed-Integer Linear Programming (MILP) Formulations\n    </h3>\n    <p style=\"font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5;\">\n      Exact mathematical formulations implemented in the OR-Route backend solver engine (PuLP &amp; COIN-OR CBC). Objective functions, decision variables, flow conservation equations, and subtour elimination constraints.\n    </p>\n  </div>\n\n  <div style=\"display: flex; flex-direction: column; gap: 20px;\">\n    <!-- CVRP Formulation -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px;\">\n      <h4 style=\"margin: 0 0 10px 0; font-size: 14.5px; color: #38bdf8;\">1. Capacitated Vehicle Routing Problem (CVRP)</h4>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5;\">\n        <b>Decision Variables:</b> $x_{ijk} \\in \\{0, 1\\}$ (1 if vehicle $k$ travels directly from customer $i$ to $j$), $z_k \\in \\{0, 1\\}$ (1 if vehicle $k$ is mobilized), $u_{ik} \\ge 0$ (MTZ load/subtour elimination variable).<br><br>\n        <b>Objective Function:</b>\n        $$\\min Z = \\sum_{k} F_k \\cdot z_k + \\sum_{k} \\sum_{i \\ne j} c_{ij} \\cdot x_{ijk}$$\n        <b>Key Constraints:</b>\n        $$\\sum_{k} \\sum_{j \\ne i} x_{ijk} = 1 \\quad \\forall i \\in \\text{Customers} \\quad \\text{(Single visit)}$$\n        $$\\sum_{i} x_{ipk} - \\sum_{j} x_{pjk} = 0 \\quad \\forall p \\in \\text{Customers}, \\forall k \\quad \\text{(Flow conservation)}$$\n        $$u_{jk} \\ge u_{ik} + q_j - Q_k \\cdot (1 - x_{ijk}) \\quad \\forall i, j \\in \\text{Customers}, \\forall k \\quad \\text{(MTZ subtour elimination)}$$\n        $$q_i \\le u_{ik} \\le Q_k \\quad \\forall i \\in \\text{Customers}, \\forall k \\quad \\text{(Payload capacity)}$$\n      </p>\n    </div>\n\n    <!-- VRPTW Formulation -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px;\">\n      <h4 style=\"margin: 0 0 10px 0; font-size: 14.5px; color: #34d399;\">2. Vehicle Routing Problem with Time Windows (VRPTW)</h4>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5;\">\n        <b>Temporal Propagation (Big-M formulation):</b> Let $w_{ik}$ be arrival time at customer $i$, $s_i$ be service dwell time, and $t_{ij}$ be travel time between $i$ and $j$:\n        $$w_{jk} \\ge w_{ik} + s_i + t_{ij} - M \\cdot (1 - x_{ijk}) \\quad \\forall i, j, \\forall k$$\n        $$a_i \\le w_{ik} \\le b_i \\quad \\forall i \\in \\text{Customers}, \\forall k \\quad \\text{(Time window compliance)}$$\n      </p>\n    </div>\n\n    <!-- CARP Formulation -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px;\">\n      <h4 style=\"margin: 0 0 10px 0; font-size: 14.5px; color: #fbbf24;\">3. Capacitated Arc Routing Problem (CARP)</h4>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5;\">\n        <b>Single-Commodity Flow Formulation on Graph $G=(V, E_R \\cup E_{NR})$:</b><br>\n        Let $x_{e, k} \\in \\{0, 1\\}$ denote service of required street $e$ by truck $k$, $y_{ij, k} \\ge 0$ denote deadhead traversals from node $i$ to $j$, and $f_{ij, k} \\ge 0$ represent the continuous fictitious load commodity flow tracking payload capacity and eliminating disconnected Eulerian subtours:\n        $$\\min Z = \\sum_{k} \\left( \\sum_{e \\in E_R} c_e \\cdot x_{e, k} + \\sum_{(i,j)} c_{ij} \\cdot y_{ij, k} \\right)$$\n        $$\\sum_{k} x_{e, k} = 1 \\quad \\forall e \\in E_R \\quad \\text{(All required streets serviced exactly once)}$$\n        $$\\sum_{j} (x_{ji, k} + y_{ji, k}) - \\sum_{j} (x_{ij, k} + y_{ij, k}) = 0 \\quad \\forall i \\in V, \\forall k \\quad \\text{(Eulerian degree parity)}$$\n      </p>\n    </div>\n\n    <!-- VRPPD Formulation -->\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px;\">\n      <h4 style=\"margin: 0 0 10px 0; font-size: 14.5px; color: #c084fc;\">4. Vehicle Routing with Pickup and Delivery (VRPPD)</h4>\n      <p style=\"font-size: 13px; color: var(--text-secondary); line-height: 1.5;\">\n        Coupling and precedence constraints for request pair $(P_r, D_r)$:\n        $$\\sum_{j} x_{P_r, j, k} - \\sum_{j} x_{D_r, j, k} = 0 \\quad \\forall r, \\forall k \\quad \\text{(Same vehicle)}$$\n        $$w_{D_r, k} \\ge w_{P_r, k} + s_{P_r} + t_{P_r, D_r} \\quad \\forall r, \\forall k \\quad \\text{(Precedence: pickup precedes delivery)}$$\n        $$L_{jk} \\ge L_{ik} + q_j - M \\cdot (1 - x_{ijk}) \\quad \\text{with} \\quad 0 \\le L_{ik} \\le Q_k \\quad \\text{(Onboard load tracking)}$$\n      </p>\n    </div>\n  </div>\n</div>",
  "<div class=\"faq-group\">\n  <div style=\"background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 18px; margin-bottom: 24px;\">\n    <h3 style=\"color: #fbbf24; font-size: 16.5px; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;\">\n      <span>📖</span> Academic Bibliography &amp; Open-Source Software Stack\n    </h3>\n    <p style=\"font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5;\">\n      Foundational scientific research literature on combinatorial optimization, transportation logistics, and open-source software libraries powering OR-Route.\n    </p>\n  </div>\n\n  <div style=\"display: flex; flex-direction: column; gap: 16px;\">\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;\">\n      <h4 style=\"margin: 0 0 8px 0; font-size: 14px; color: #38bdf8;\">Classic Literature &amp; Fundamental Papers</h4>\n      <ul style=\"margin: 0 0 0 20px; font-size: 12.5px; color: var(--text-secondary); line-height: 1.6;\">\n        <li><b>Dantzig, G. B., &amp; Ramser, J. H. (1959):</b> <i>\"The Truck Dispatching Problem\"</i>, Management Science, 6(1), 80-91. (The foundational paper introducing the Vehicle Routing Problem).</li>\n        <li><b>Clarke, G., &amp; Wright, J. W. (1964):</b> <i>\"Scheduling of Vehicles from a Central Depot to a Number of Delivery Points\"</i>, Operations Research, 12(4), 568-581. (Savings Algorithm).</li>\n        <li><b>Miller, C. E., Tucker, A. W., &amp; Zemlin, R. A. (1960):</b> <i>\"Integer Programming Formulation of Traveling Salesman Problems\"</i>, Journal of the ACM (JACM), 7(4), 326-329. (MTZ subtour elimination).</li>\n        <li><b>Golden, B. L., &amp; Wong, R. T. (1981):</b> <i>\"Capacitated Arc Routing Problems\"</i>, Networks, 11(3), 305-315. (Formal introduction of CARP and NP-hardness proof).</li>\n        <li><b>Solomon, M. M. (1987):</b> <i>\"Algorithms for the Vehicle Routing and Scheduling Problems with Time Window Constraints\"</i>, Operations Research, 35(2), 254-265. (Standard benchmark instances for VRPTW).</li>\n        <li><b>Savelsbergh, M. W. P., &amp; Sol, M. (1995):</b> <i>\"The General Pickup and Delivery Problem\"</i>, Transportation Science, 29(1), 17-29. (VRPPD theoretical framework).</li>\n        <li><b>Cordeau, J. F., Gendreau, M., &amp; Laporte, G. (1997):</b> <i>\"A Tabu Search Heuristic for the Multi-Depot Vehicle Routing Problem\"</i>, Computers &amp; Operations Research, 24(11), 1053-1066. (MDVRP).</li>\n        <li><b>Schneider, M., Stenger, A., &amp; Goeke, D. (2014):</b> <i>\"The Electric Vehicle-Routing Problem with Time Windows and Recharging Stations\"</i>, Transportation Science, 48(4), 500-520. (EV-VRP).</li>\n      </ul>\n    </div>\n\n    <div style=\"background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;\">\n      <h4 style=\"margin: 0 0 8px 0; font-size: 14px; color: #34d399;\">⚙️ Mathematical Engines &amp; Software Frameworks in OR-Route</h4>\n      <ul style=\"margin: 0 0 0 20px; font-size: 12.5px; color: var(--text-secondary); line-height: 1.6;\">\n        <li><b>COIN-OR CBC (Coin-or branch and cut):</b> Open-source mixed-integer linear programming solver developed by the Computational Infrastructure for Operations Research.</li>\n        <li><b>PuLP (Python Linear Programming API):</b> Symbolic algebraic modeling framework in Python for MILP formulations.</li>\n        <li><b>OpenStreetMap &amp; Overpass API:</b> Open community geospatial database providing global street geometry and drivable road topologies.</li>\n        <li><b>Leaflet GIS:</b> Lightweight interactive JavaScript web cartography library.</li>\n        <li><b>SQLite:</b> Robust ACID embedded relational database for secure user profiles and fleet scenario persistence.</li>\n      </ul>\n    </div>\n  </div>\n</div>"
];

  const INFO_BANNERS_EN = {
  "tab-cvrp": "<div><b>Who it is for:</b> Freight distributors, express courier services, food &amp; beverage suppliers, and wholesale merchants.<br><b>Objective:</b> Minimize total vehicle kilometers traveled starting and returning to the central logistics hub, guaranteeing that no vehicle exceeds its maximum payload capacity in kg or packages.</div>",
  "tab-vrptw": "<div><b>Who it is for:</b> Pharmaceutical distribution to hospitals and pharmacies, fresh food deliveries to supermarkets with pre-booked unloading slots, and scheduled field service technicians.<br><b>Objective:</b> Calculate exact minute-by-minute arrival and service start times for every customer stop, eliminating idle waiting and contractual delay penalties.</div>",
  "tab-carp": "<div><b>Who it is for:</b> Municipal environmental sanitation agencies, waste consortia, street sweeping companies, and pipeline/gas network maintenance crews.<br><b>Objective:</b> Traverse all required collection streets minimizing deadheading empty transit kilometers through the exact <b>Single-Commodity Flow</b> mathematical formulation.</div>",
  "tab-intermediate": "<div><b>Who it is for:</b> Fleets operating <b>commercial electric vehicles (EV)</b> or heavy collection trucks requiring intermediate disposal stops at MBT plants/landfills or DC fast-charging sessions mid-shift to eliminate range anxiety.<br><b>Objective:</b> Optimize routes and schedule stops at intermediate facilities without returning to the home depot.</div>",
  "tab-vrppd": "<div><b>Who it is for:</b> Express couriers for joint pickups and deliveries, on-demand freight shuttles, and inter-warehouse logistics transfers.<br><b>How it works:</b> Each request defines a sender (Pickup $P_i$) and recipient (Delivery $D_i$) with a load in kg. The MILP model guarantees that the <b>same vehicle</b> executes pickup before delivery ($P_i \\prec D_i$) while dynamically monitoring onboard payload at every stop.</div>",
  "tab-mdvrp": "<div><b>Who it is for:</b> Structured enterprises operating multiple regional warehouses, waste companies with distributed operating yards, or inter-municipal consortia.<br><b>How it works:</b> Each vehicle is assigned to its departure and return <b>Home Depot</b>. The optimizer jointly solves customer depot allocation and tour routing to eliminate cross-territorial overlap.</div>",
  "tab-pcarp": "<div><b>Who it is for:</b> Municipal sanitation providers and environmental contractors managing <b>curbside waste collection on a multi-day weekly schedule (Monday — Saturday)</b>.<br><b>How it works:</b> Optimizes routes for each day of the week according to waste fractions (Organic every other day, Paper, Plastic, Residual, Glass). Balances daily compactor workloads across the 6 operating days.</div>",
  "tab-carptw": "<div><b>Who it is for:</b> Mechanical street sweeping, road pressure washing, and waste collection in <b>historic city centers with pedestrian ZTL curfews, school zones, or open-air markets</b>.<br><b>How it works:</b> Synchronizes passages chronologically ensuring each street is serviced strictly before ZTL gate openings or school bus traffic, eliminating city violations and idle waiting.</div>",
  "tab-carpif": "<div><b>Who it is for:</b> Municipal waste collection and street maintenance across <b>large urban or regional territories</b> featuring <b>intermediate MBT transfer stations, landfills, or disposal silos</b>.<br><b>Core Principle &amp; Constraints:</b> In classic CARP, a full vehicle must terminate at the base depot. Under <b>CARPIF</b>, reaching an <i>Intermediate Facility (IF)</i> instantly resets onboard payload (unloading performed), enabling <b>multiple trips within a single shift</b> and cutting required fleet size by up to 50%.</div>",
  "tab-dcarp": "<div><b>Who it is for:</b> <b>Fleet command centers and dispatch rooms</b> managing real-time unforeseen events while trucks are already active in the field.<br><b>Virtual Tasks Paradigm:</b> When an event occurs (new urgent pickup, blocked street, or truck breakdown), the algorithm <b>freezes current fleet state</b>, converts instant vehicle GPS positions into <b>virtual departure nodes with residual capacity</b>, and recalculates optimal routes in real time.</div>"
};

  let currentLang = 'it';
  let isTranslating = false;

  function getLanguage() {
    return currentLang;
  }

  // Smart matcher con pulizia prefissi, suffissi e normalizzazione spazi
  function getMatch(text) {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    // 1. Match Esatto
    if (DICT_IT_TO_EN[trimmed]) return DICT_IT_TO_EN[trimmed];

    // 2. Match con normalizzazione spazi interni (\n, tab, doppi spazi)
    const normalized = trimmed.replace(/\s+/g, ' ');
    if (DICT_IT_TO_EN[normalized]) return DICT_IT_TO_EN[normalized];

    // 3. Match con rimozione punteggiatura / frecce finali
    const stripped = normalized.replace(/[:\s?…!\-➔→]+$/, '');
    if (DICT_IT_TO_EN[stripped]) {
      const punct = normalized.slice(stripped.length);
      return DICT_IT_TO_EN[stripped] + punct;
    }

    // 4. Estrazione Emojis, icone, numeri puntati iniziali
    const prefixMatch = normalized.match(/^([\p{Extended_Pictographic}\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u200d\ufe0f\d+\.\s•\-➔→]+)(.*)$/u);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const core = prefixMatch[2].trim();
      if (core) {
        if (DICT_IT_TO_EN[core]) {
          return prefix + DICT_IT_TO_EN[core];
        }
        const coreStripped = core.replace(/[:\s?…!\-➔→]+$/, '');
        if (DICT_IT_TO_EN[coreStripped]) {
          const punct = core.slice(coreStripped.length);
          return prefix + DICT_IT_TO_EN[coreStripped] + punct;
        }
      }
    }

    return null;
  }

  // =========================================================================
  // 5. UNIVERSAL DOM TEXT WALKER (LOSSLESS)
  // =========================================================================
  function walkAndTranslate(node, lang) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.nodeValue;
      const trimmed = raw.trim();
      if (!trimmed || trimmed.length <= 1) return;

      // Ignora numeri puri o formule matematiche brevi
      if (/^(min\s*Z|∑|\d+[\.,]?\d*|€|\$|%|km|kg|qt|h|min|m|s|\d+:\d+|x\d+|\d+\/\d+)$/.test(trimmed)) {
        return;
      }

      if (lang === 'en') {
        if (node._origIt === undefined) {
          node._origIt = raw;
        }
        const match = getMatch(trimmed);
        if (match) {
          node.nodeValue = match;
        }
      } else if (lang === 'it') {
        if (node._origIt !== undefined) {
          node.nodeValue = node._origIt;
        }
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'code' || tag === 'pre') {
        return;
      }

      // Se questo elemento ha una traduzione HTML speciale gestita a parte, non fare walk sui figli
      if (node.classList && (node.classList.contains('faq-answer') || node.classList.contains('info-banner'))) {
        return;
      }

      // Attributi placeholder, title, value
      if (lang === 'en') {
        if (node.placeholder && typeof node.placeholder === 'string') {
          if (node._origPlaceholder === undefined) node._origPlaceholder = node.placeholder;
          const match = getMatch(node._origPlaceholder);
          if (match) node.placeholder = match;
        }
        if (node.title && typeof node.title === 'string' && !node.classList.contains('btn-lang')) {
          if (node._origTitle === undefined) node._origTitle = node.title;
          const match = getMatch(node._origTitle);
          if (match) node.title = match;
        }
        if (tag === 'option') {
          const optText = node.innerText.trim();
          if (node._origOptText === undefined) node._origOptText = optText;
          const match = getMatch(node._origOptText);
          if (match) node.innerText = match;
        }
      } else if (lang === 'it') {
        if (node._origPlaceholder !== undefined) node.placeholder = node._origPlaceholder;
        if (node._origTitle !== undefined) node.title = node._origTitle;
        if (node._origOptText !== undefined) node.innerText = node._origOptText;
      }

      for (let child = node.firstChild; child; child = child.nextSibling) {
        walkAndTranslate(child, lang);
      }
    }
  }

  // =========================================================================
  // 6. TRADUZIONI MIRATE STRUTTURALI (HERO, HEADER, FAQ, INFO BANNERS)
  // =========================================================================
  function applySpecificTranslations() {
    // 1. Logo Subtitle
    document.querySelectorAll('.logo-sub').forEach(el => {
      el.innerHTML = (currentLang === 'en')
        ? 'Operations Research &amp; Fleet Logistics'
        : 'Ricerca Operativa &amp; Algoritmi Flotte';
    });

    // 2. Selettore Modelli Header
    const selectModel = document.getElementById('headerModelSelect');
    if (selectModel && selectModel.options.length > 10) {
      if (currentLang === 'en') {
        selectModel.options[0].text = '-- Model --';
        selectModel.options[1].text = '📦 1. CVRP (Freight)';
        selectModel.options[2].text = '⏱️ 2. VRPTW (Time Windows)';
        selectModel.options[3].text = '🚛 3. CARP (Waste/Streets)';
        selectModel.options[4].text = '🔋 4. EV-VRP (Charging)';
        selectModel.options[5].text = '📦🔄 5. VRPPD (Pickups)';
        selectModel.options[6].text = '🏢 6. MDVRP (Multi-Depot)';
        selectModel.options[7].text = '📅 7. PCARP (Periodic)';
        selectModel.options[8].text = '⏱️🛣️ 8. CARPTW (ZTL/Curfew)';
        selectModel.options[9].text = '♻️ 9. CARPIF (Facilities)';
        selectModel.options[10].text = '⚡ 10. DCARP (Dynamic)';
      } else {
        selectModel.options[0].text = '-- Modello --';
        selectModel.options[1].text = '📦 1. CVRP (Merci)';
        selectModel.options[2].text = '⏱️ 2. VRPTW (Orari)';
        selectModel.options[3].text = '🚛 3. CARP (RSU/Strade)';
        selectModel.options[4].text = '🔋 4. EV-VRP (Ricariche)';
        selectModel.options[5].text = '📦🔄 5. VRPPD (Ritiri)';
        selectModel.options[6].text = '🏢 6. MDVRP (Depositi)';
        selectModel.options[7].text = '📅 7. PCARP (Settimanale)';
        selectModel.options[8].text = '⏱️🛣️ 8. CARPTW (ZTL)';
        selectModel.options[9].text = '♻️ 9. CARPIF (Impianti)';
        selectModel.options[10].text = '⚡ 10. DCARP (Dinamico)';
      }
    }

    // 3. Header Global Links
    const btnContact = document.querySelector('header a[href="contatti.html"]');
    if (btnContact) {
      btnContact.innerHTML = (currentLang === 'en') ? '📩 Contact Us' : '📩 Contatti';
    }

    // 4. Area 1 Toggle Button
    const btnToggleWiz = document.getElementById('btnToggleWizardBody');
    const wizContent = document.getElementById('wizardCollapsibleContent');
    if (btnToggleWiz && wizContent) {
      const isClosed = (wizContent.style.display === 'none');
      if (currentLang === 'en') {
        btnToggleWiz.innerText = isClosed ? '🔽 Expand Guide' : '🔼 Collapse Guide';
      } else {
        btnToggleWiz.innerText = isClosed ? '🔽 Espandi Guida' : '🔼 Comprimi Guida';
      }
    }

    // 5. 10 Info Banners
    for (const [tabId, enHtml] of Object.entries(INFO_BANNERS_EN)) {
      const tabEl = document.getElementById(tabId);
      if (tabEl) {
        const bannerDiv = tabEl.querySelector('.info-banner > div');
        if (bannerDiv) {
          if (currentLang === 'en') {
            if (bannerDiv._origHtml === undefined) bannerDiv._origHtml = bannerDiv.innerHTML;
            bannerDiv.innerHTML = enHtml;
          } else if (bannerDiv._origHtml !== undefined) {
            bannerDiv.innerHTML = bannerDiv._origHtml;
          }
        }
      }
    }

    // 6. FAQ Question Titles (1 to 23)
    const faqSummaries = document.querySelectorAll('.faq-item .faq-question > span:first-child');
    faqSummaries.forEach((span, idx) => {
      const qNum = idx + 1;
      if (currentLang === 'en' && FAQ_TITLES_EN[qNum]) {
        if (span._origIt === undefined) span._origIt = span.innerText;
        span.innerText = FAQ_TITLES_EN[qNum];
      } else if (currentLang === 'it' && span._origIt !== undefined) {
        span.innerText = span._origIt;
      }
    });

    // 7. FAQ Technical Answers (1 to 23)
    const faqAnswers = document.querySelectorAll('.faq-item .faq-answer');
    faqAnswers.forEach((ansDiv, idx) => {
      const qNum = idx + 1;
      if (FAQ_ANSWERS_EN[qNum]) {
        if (currentLang === 'en') {
          if (ansDiv._origHtml === undefined) ansDiv._origHtml = ansDiv.innerHTML;
          ansDiv.innerHTML = FAQ_ANSWERS_EN[qNum];
        } else if (currentLang === 'it' && ansDiv._origHtml !== undefined) {
          ansDiv.innerHTML = ansDiv._origHtml;
        }
      }
    });

    // 7b. FAQ Groups 1 (Manual), 3 (Handbook), 4 (Bibliography)
    const faqGroups = document.querySelectorAll('#tab-faq .faq-group');
    if (faqGroups.length >= 4 && typeof FAQ_GROUPS_EN !== 'undefined') {
      if (currentLang === 'en') {
        if (faqGroups[0]._origHtml === undefined) faqGroups[0]._origHtml = faqGroups[0].innerHTML;
        if (faqGroups[2]._origHtml === undefined) faqGroups[2]._origHtml = faqGroups[2].innerHTML;
        if (faqGroups[3]._origHtml === undefined) faqGroups[3]._origHtml = faqGroups[3].innerHTML;
        faqGroups[0].innerHTML = FAQ_GROUPS_EN[0];
        faqGroups[2].innerHTML = FAQ_GROUPS_EN[1];
        faqGroups[3].innerHTML = FAQ_GROUPS_EN[2];
      } else {
        if (faqGroups[0]._origHtml !== undefined) faqGroups[0].innerHTML = faqGroups[0]._origHtml;
        if (faqGroups[2]._origHtml !== undefined) faqGroups[2].innerHTML = faqGroups[2]._origHtml;
        if (faqGroups[3]._origHtml !== undefined) faqGroups[3].innerHTML = faqGroups[3]._origHtml;
      }
    }

    // 8. Contatti page (100% translation of title, hero, submit button, and textarea placeholder)
    if (window.location.pathname.includes('contatti')) {
      if (currentLang === 'en') {
        document.title = 'Contact, Support & Feedback — OR-Route';
      } else {
        document.title = 'Contatti, Assistenza & Suggerimenti — OR-Route';
      }

      // Hero Title H1
      const contactH1 = document.querySelector('.contact-hero h1');
      if (contactH1) {
        if (contactH1._origHtml === undefined) contactH1._origHtml = contactH1.innerHTML;
        contactH1.innerHTML = (currentLang === 'en')
          ? 'Have an <span class="gradient-text">Inquiry</span> or a <span class="gradient-text">Suggestion</span>?'
          : contactH1._origHtml;
      }

      // Hero Subtitle
      const contactSub = document.querySelector('.contact-hero p.subtitle');
      if (contactSub) {
        if (contactSub._origHtml === undefined) contactSub._origHtml = contactSub.innerHTML;
        contactSub.innerHTML = (currentLang === 'en')
          ? 'The <strong>OR-Route</strong> team is at your disposal for support on Operations Research mathematical models, requested features, industrial fleet customizations, or academic collaborations.'
          : contactSub._origHtml;
      }

      // Submit Button
      const btnSub = document.getElementById('btnSubmitContact') || document.getElementById('btnSubmit');
      if (btnSub) {
        btnSub.innerHTML = (currentLang === 'en')
          ? '<span style="font-size: 18px;">✉️</span> Send Message'
          : '<span style="font-size: 18px;">✉️</span> Invia Messaggio';
      }

      // Textarea placeholder
      const formMsg = document.getElementById('formMessage');
      if (formMsg) {
        if (formMsg._origPh === undefined) formMsg._origPh = formMsg.placeholder;
        formMsg.placeholder = (currentLang === 'en')
          ? "Clearly describe your request, reported issue, or feature suggestion for the platform:\n\n• What is your operational use case or logistics need?\n• Which constraints or algorithms would you like to see implemented?\n• Any relevant parameters (number of vehicles, stops, city)..."
          : formMsg._origPh;
      }

      // Character counter
      const charCounter = document.getElementById('charCounter');
      if (charCounter && formMsg) {
        const count = formMsg.value.length;
        charCounter.textContent = (currentLang === 'en') ? `${count} characters` : `${count} caratteri`;
      }
    }
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
        btnEN.style.opacity = '0.55';
      } else {
        btnEN.classList.add('active');
        btnEN.style.background = 'rgba(56, 189, 248, 0.25)';
        btnEN.style.borderColor = 'rgba(56, 189, 248, 0.55)';
        btnEN.style.opacity = '1';

        btnIT.classList.remove('active');
        btnIT.style.background = 'transparent';
        btnIT.style.borderColor = 'transparent';
        btnIT.style.opacity = '0.55';
      }
    }
  }

  function applyTranslationsToDOM() {
    if (isTranslating) return;
    isTranslating = true;

    try {
      updateSwitcherUI();
      applySpecificTranslations();
      walkAndTranslate(document.body, currentLang);
    } catch (err) {
      console.warn('[i18n] Translation error:', err);
    } finally {
      isTranslating = false;
    }
  }

  function setLanguage(lang) {
    if (lang !== 'it' && lang !== 'en') lang = 'it';
    currentLang = lang;
    try {
      localStorage.setItem('or_route_lang', lang);
    } catch (_) {}

    document.documentElement.lang = lang;
    applyTranslationsToDOM();

    window.dispatchEvent(new CustomEvent('or_route_lang_changed', { detail: { lang } }));
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

    currentLang = initialLang;
    updateSwitcherUI();
    applyTranslationsToDOM();

    // Hook dinamico su window.switchMainTab
    let _switch = window.switchMainTab;
    try {
      Object.defineProperty(window, 'switchMainTab', {
        configurable: true,
        enumerable: true,
        get() { return _switch; },
        set(fn) {
          _switch = function (...args) {
            const res = fn.apply(this, args);
            if (currentLang === 'en') setTimeout(applyTranslationsToDOM, 35);
            return res;
          };
        }
      });
      if (_switch) window.switchMainTab = _switch;
    } catch (_) {
      if (typeof window.switchMainTab === 'function') {
        const orig = window.switchMainTab;
        window.switchMainTab = function (...args) {
          orig.apply(this, args);
          if (currentLang === 'en') setTimeout(applyTranslationsToDOM, 35);
        };
      }
    }

    // Observer per elementi generati dinamicamente
    const observer = new MutationObserver((mutations) => {
      if (currentLang !== 'en' || isTranslating) return;
      let shouldTranslate = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          shouldTranslate = true;
          break;
        }
      }
      if (shouldTranslate) {
        clearTimeout(window._i18nDebounce);
        window._i18nDebounce = setTimeout(applyTranslationsToDOM, 80);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.getLanguage = getLanguage;
  window.setLanguage = setLanguage;
  window.applyTranslationsToDOM = applyTranslationsToDOM;
})();
