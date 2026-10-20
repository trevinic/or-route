# 📐 OR-Route &mdash; Documentazione Integrale & Progressi del Progetto
**Piattaforma di Ricerca Operativa & Ottimizzazione Flotte Aziendali**  
*Autore: Team di Ricerca Operativa & Sviluppo Software*  
*Data Ultimo Aggiornamento: 19 Ottobre 2026*  
*Versione: 2.5 (Ready for Production & Docker Deployment)*  
*Repository Ufficiale GitHub:* [`https://github.com/trevinic/or-route`](https://github.com/trevinic/or-route)

---

## 📑 INDICE GENERALE
1. [Sintesi del Progetto & Obiettivi](#1-sintesi-del-progetto--obiettivi)
2. [Architettura Tecnica del Sistema](#2-architettura-tecnica-del-sistema)
3. [I 6 Modelli Matematici di Ricerca Operativa Implementati](#3-i-6-modelli-matematici-di-ricerca-operativa-implementati)
   - 3.1 CARP (Capacitated Arc Routing Problem - Servizi Stradali e RSU)
   - 3.2 CVRP (Capacitated Vehicle Routing Problem - Merci e Logistica B2B)
   - 3.3 VRPTW (Vehicle Routing with Time Windows - Fasce Orarie Tassative)
   - 3.4 WCVRPTW-IF / EV-VRP (Flotte Elettriche & Tappe Intermedie)
   - 3.5 VRPPD (Vehicle Routing with Pickup & Delivery - Ritiri/Consegne Accoppiati)
   - 3.6 MDVRP (Multi-Depot Vehicle Routing - Multi-Magazzino e Multi-Rimessa)
4. [Funzionalità Operative & Strumenti Sviluppati](#4-funzionalità-operative--strumenti-sviluppati)
   - 4.1 Selettore Guidato Aziendale a 5 Domande
   - 4.2 Configuratore Flotta Eterogenea & Calcolo Costo Reale
   - 4.3 Partizionamento Grandi Aree & Auto-Scaling dei Mezzi
   - 4.4 Motore Cartografico OpenStreetMap Globale (Italia, Europa, Mondo)
   - 4.5 Mappe Interattive Folium (GIS) e Canvas Multistrato
   - 4.6 Calcolatore Risparmio ROI & Emissioni CO2 (ESG Scope 1)
   - 4.7 Sistema di Backup Locale (.json) Esportazione & Importazione
   - 4.8 Scheda FAQ, Dispensa Matematica MILP & Manuale Operativo
5. [Cronologia Bug Critici Risolti & Irrobustimento Tecnico](#5-cronologia-bug-critici-risolti--irrobustimento-tecnico)
   - 5.1 Risoluzione dell'Eccezione `KeyError: 'streets'` e Protezione Salvataggi
   - 5.2 Risoluzione del Tag HTML Non Chiuso (`</section>`) per la Visualizzazione delle FAQ
   - 5.3 Responsive Navbar per Schermi Ridotti
   - 5.4 Rebranding a OR-Route & Ridenominazione Repository GitHub
6. [Istruzioni per l'Avvio in Locale](#6-istruzioni-per-lavvio-in-locale)
7. [Guida alla Pubblicazione Web & Dockerizzazione](#7-guida-alla-pubblicazione-web--dockerizzazione)

---

## 1. SINTESI DEL PROGETTO & OBIETTIVI

**OR-Route** è una piattaforma professionale e aperta concepita per colmare il divario tra la letteratura scientifica di **Ricerca Operativa (Operations Research)** e le esigenze pratiche dei fleet manager, aziende di logistica, corrieri espresso e municipalizzate di igiene urbana.

La piattaforma persegue tre obiettivi cardine:
1. **Riduzione dei Costi Operativi (OPEX)**: minimizzazione delle distanze chilometriche e del consumo di carburante combinata con l'ottimizzazione del numero di mezzi necessari (ammortamento e canoni fissi).
2. **Sostenibilità Ambientale & Decarbonizzazione (ESG Scope 1)**: quantificazione e certificazione della riduzione di $CO_2$ immessa in atmosfera (2,65 kg $CO_2$/litro gasolio secondo standard GHG Protocol).
3. **Sovranità Tecnologica & Nessun Lock-in**: impiego di librerie matematiche e cartografiche aperte (COIN-OR CBC, PuLP, OpenStreetMap, Leaflet), eliminando costosi canoni SaaS e API a pagamento (Google Maps / Here / TomTom).

---

## 2. ARCHITETTURA TECNICA DEL SISTEMA

L'architettura software è modulare, disaccoppiata e completamente containerizzata:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND WEB (SPA)                              │
│  HTML5 Semantico + Vanilla CSS Moderno (Design System Dark Mode / Glass)   │
│  App.js: Gestione dello Stato, Multi-Tab, Canvas 2D per grafi, Export JSON │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Chiamate REST asincrone (Fetch API)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BACKEND APPLICATIVO (server.py)                         │
│  Server HTTP multithreaded nativo in Python, porta dinamica ($PORT)         │
│  Routing API REST: /api/solve, /api/cvrp/solve, /api/vrptw/solve,           │
│                    /api/vrppd/solve, /api/mdvrp/solve, /api/import_osm     │
└──────────────────┬───────────────────────────────────────┬──────────────────┘
                   │                                       │
                   ▼                                       ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     MOTORI DI RICERCA OPERATIVA      │  │     MOTORE GEOGRAFICO (GIS)       │
│  - PuLP (Python LP/MILP Modeling)    │  │  - OSMnx (Grafo Viario OSM)       │
│  - COIN-OR CBC Solver (C++ Nativo)   │  │  - NetworkX (Dijkstra Shortest)   │
│  - Euristiche: Clarke-Wright Savings, │  │  - Folium / Leaflet.js            │
│    Augmented Path-Scanning, MTZ, IF  │  │  - Nominatim Geocoder & Overpass  │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 3. GLI 8 MODELLI MATEMATICI DI RICERCA OPERATIVA IMPLEMENTATI

### 3.1 CARP (Capacitated Arc Routing Problem - Servizi Stradali e RSU)
* **File sorgente:** [`carp_waste_collection.py`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/rsu_carp_optimization/carp_waste_collection.py)
* **Problema:** Il servizio (raccolta rifiuti, spazzamento, lavaggio strade) si svolge lungo gli **archi stradali** e non su singoli nodi puntiformi.
* **Algoritmo:** Modello Single-Commodity Flow con bilanciamento ai nodi combinato con euristica costruttiva Augmented Path-Scanning e partizionamento a K-Means per grandi reti (>40 vie).

### 3.2 CVRP (Capacitated Vehicle Routing Problem - Merci e Logistica B2B)
* **File sorgente:** [`cvrp_model.py`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/rsu_carp_optimization/cvrp_model.py)
* **Problema:** Instradamento di una flotta eterogenea da un deposito centrale verso clienti puntiformi con domande volumetriche o di peso.
* **Formulazione:** MILP con eliminazione dei sottogiri tramite variabili di potenziale **MTZ (Miller-Tucker-Zemlin)** e ottimizzazione congiunta di costi fissi e chilometrici.

### 3.3 VRPTW (Vehicle Routing with Time Windows - Fasce Orarie Tassative)
* **File sorgente:** [`vrptw_model.py`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/rsu_carp_optimization/vrptw_model.py)
* **Problema:** Consegne con orari vincolanti (es. finestre ZTL, orari di apertura banchine di scarico supermercati).
* **Formulazione:** Variabili temporali continue $t_{ik}$ con vincoli di Big-M per la propagazione dell'orario di arrivo, penalità di attesa e finestre chiuse $[e_i, l_i]$.

### 3.4 WCVRPTW-IF / EV-VRP (Flotte Elettriche & Tappe Intermedie)
* **File sorgente:** [`server.py`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/rsu_carp_optimization/server.py) (modulo `/api/solve_intermediate`)
* **Problema:** Mezzi compattatori che durante il turno devono scaricare presso impianti intermedi TMB/discariche prima di ripartire, oppure veicoli elettrici che richiedono ricariche veloci DC a colonnine intermedie.
* **Formulazione:** Resettaggio dinamico del carico $q(t) = 0$ / stato di carica batteria $SoC(t) = 100\%$ all'uscita dalla tappa intermedia.

### 3.5 VRPPD (Vehicle Routing with Pickup & Delivery - Ritiri/Consegne Accoppiati)
* **File sorgente:** [`vrppd_model.py`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/rsu_carp_optimization/vrppd_model.py)
* **Problema:** Ciascuna richiesta comprende un punto di ritiro e un punto di consegna che devono essere serviti dallo **stesso identico veicolo** (coupling), con il ritiro che precede temporalmente la consegna (precedence).

### 3.6 MDVRP (Multi-Depot Vehicle Routing - Multi-Magazzino e Multi-Rimessa)
* **File sorgente:** [`mdvrp_model.py`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/rsu_carp_optimization/mdvrp_model.py)
* **Problema:** Aziende con più poli logistici o rimesse territoriali. Il modello assegna in maniera ottima i clienti al deposito più conveniente, garantendo che ogni mezzo parta e rientri alla propria rimessa di appartenenza.

### 3.7 PCARP (Periodic Capacitated Arc Routing Problem - Raccolta Differenziata Settimanale)
* **File sorgente:** [`pcarp_model.py`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/rsu_carp_optimization/pcarp_model.py)
* **Problema:** Raccolta differenziata porta a porta organizzata su orizzonte temporale multi-periodale (Lunedì-Sabato). Ciascuna via richiede una combinazione di frequenze e giorni specifici per le diverse frazioni (es. Umido Lunedì/Giovedì, Carta Martedì, Plastica Mercoledì, Secco Venerdì, Vetro Sabato).
* **Formulazione:** Modello MILP multi-periodo con bilanciamento dei carichi giornalieri e minimizzazione dei costi chilometrici settimanali aggregati (Lacomme, Prins, Ramdane-Chérif, 2005).

### 3.8 CARPTW (Capacitated Arc Routing Problem with Time Windows - Fasce Orarie su Strade & ZTL)
* **File sorgente:** [`carptw_model.py`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/rsu_carp_optimization/carptw_model.py)
* **Problema:** Spazzamento meccanizzato, lavaggio strade e raccolta rifiuti lungo vie soggette a finestre orarie tassative (es. varchi ZTL prima delle 07:30, strade scolastiche prima delle 08:00, pulizia post-mercato rionale).
* **Formulazione:** Sincronizzazione cronologica dei passaggi lungo gli archi con calcolo esatto dei tempi di viaggio a velocità urbana, tempi di servizio, minimizzazione delle attese al cancello ed eliminazione al 100% delle violazioni temporali (Mourão, Tagmouti et al., 2011).

---

## 4. FUNZIONALITÀ OPERATIVE & STRUMENTI SVILUPPATI

### 4.1 Selettore Guidato Aziendale a 7 Domande (Wizard Interattivo)
Un questionario interattivo diagnostico che analizza:
1. *Natura del servizio* (Archi stradali vs Consegne puntiformi a clienti).
2. *Pianificazione differenziata settimanale* (Calendario multi-giorno Lun-Sab con frazioni alternate &rarr; **PCARP**).
3. *Finestre temporali su strade* (Fasce orarie tassative per ZTL, scuole, mercati rionali &rarr; **CARPTW**).
4. *Soste intermedie per svuotamento/ricarica* (Impianti TMB / colonnine DC per flotta elettrica &rarr; **EV-VRP**).
5. *Ritiri e consegne incrociati* (Accoppiamento pick-up & delivery &rarr; **VRPPD**).
6. *Poli logistici multipli* (Più magazzini o rimesse territoriali &rarr; **MDVRP**).
7. *Finestre orarie su clienti puntiformi* (Fasce orarie di consegna banchina &rarr; **VRPTW** vs standard **CVRP**).

Il sistema assegna un punteggio di affinità raccomandando il modello più idoneo e permettendo l'iniezione automatica con un clic della flotta eterogenea configurata dall'utente.

### 4.2 Configuratore Flotta Eterogenea & Calcolo Costo Reale
Consente di definire liberamente il parco mezzi con:
* Costo chilometrico reale (€/km: carburante, pneumatici, usura).
* Costo fisso giornaliero (€/giorno: autista, ammortamento, assicurazione, bollo).
* Capacità nominale (kg, quintali, bancali $m^3$).
Il solutore bilancia matematicamente se convenga far uscire un mezzo in più per accorciare i tragitti o sovraccaricare i mezzi già in strada.

### 4.3 Partizionamento Grandi Aree & Auto-Scaling dei Mezzi
Quando una rete stradale supera i 40-50 archi (es. download di un intero quartiere o comune), l'algoritmo esegue un clustering spaziale k-means per evitare blocchi computazionali NP-hard, allocando automaticamente il numero ottimale di automezzi.

### 4.4 Motore Cartografico OpenStreetMap Globale (Italia, Europa, Mondo)
Download diretto delle reti stradali da OpenStreetMap per qualsiasi toponimo internazionale (`Nice, France`, `München, Germany`, `Valencia, Spain`, `Gent, Belgium`) o per coordinate GPS decimali (`lat, lon` + raggio metrico).

### 4.5 Mappe Interattive Folium (GIS) e Canvas Multistrato
Visualizzazione georeferenziata dei percorsi con tratteggio colorato per automezzo, frecce di scorrimento direzionale, popup informativi e layer satellitari ortofoto.

### 4.6 Calcolatore Risparmio ROI & Emissioni CO2 (ESG Scope 1)
Consente di calcolare l'impatto economico e ambientale dell'adozione della Ricerca Operativa:
* Stima litri di carburante risparmiati all'anno.
* Risparmio economico complessivo in Euro (€/anno) e Payback Period dell'investimento.
* Calcolo tonnellate di $CO_2$ evitate secondo lo standard GHG Protocol (fattore di emissione 2,65 kg $CO_2$/litro gasolio) per l'inclusione immediata nel Bilancio di Sostenibilità (CSRD / ESG).

### 4.7 Sistema di Backup Locale (.json) Esportazione & Importazione
Garantisce la persistenza e la portabilità totale dei dati aziendali:
* **`📥 Esporta Backup (.json)`**: esporta istantaneamente in un singolo file JSON (`or_route_impostazioni_YYYY-MM-DD.json`) tutte le impostazioni, le risposte del questionario, la configurazione dei veicoli, i clienti e le reti stradali.
* **`📤 Importa Backup`**: ripristina la sessione di lavoro su qualsiasi computer o browser senza necessità di database remoti.

### 4.8 Scheda FAQ, Dispensa Matematica MILP & Manuale Operativo
Una ricca sezione divulgativa e operativa integrata nella piattaforma:
* **📘 Guida Pratica & Manuale d'Uso**: procedura dettagliata in 5 fasi operative dalla A alla Z per utilizzare la piattaforma.
* **❓ FAQ Operative & Strategiche**: 11 domande e risposte su complessità NP-hard, differenze Node vs Arc routing, costi fissi vs chilometrici, finestre orarie, bilanciamento carichi e validità geografica europea/mondiale delle mappe.
* **📐 Dispensa Matematica (MILP)**: formulazioni algebriche formali con equazioni, vincoli e variabili decisionali.
* **📖 Bibliografia & Tool Open-Source**: citazioni dei paper scientifici cardine (Dantzig-Ramser 1959, Golden-Wong 1981, Solomon 1987, Dror 2000, Toth-Vigo) e dei motori utilizzati (PuLP, COIN-OR CBC, OSMnx, NetworkX, Folium).
* **Strumenti di Lettura**: pulsanti *"📖 Espandi Tutte le FAQ"*, *"📕 Comprimi Tutte"* e *"🖨️ Stampa / Salva Guida in PDF"*.

---

## 5. CRONOLOGIA BUG CRITICI RISOLTI & IRROBUSTIMENTO TECNICO

| Data | Componente Coinvolto | Problema Riscontrato | Soluzione Tecnica Applicata |
| :--- | :--- | :--- | :--- |
| **18/10/2026** | `server.py` | `KeyError: 'streets'` in `/api/solve` causato da sovrascrittura con JSON vuoto `{}` | Introdotta validazione difensiva in `save_config()` che rifiuta salvataggi vuoti, fallback automatico a `DEFAULT_CONFIG` in `load_config()` e accesso sicuro `cfg.get("streets", [])`. |
| **18/10/2026** | `web/index.html` e `app.js` | Impossibilità di copiare gli errori dalla finestra `alert(...)` del browser | Sostituiti tutti gli alert bloccanti con un modal scuro `#errorModal` con testo selezionabile (`user-select: all`) e pulsante automatico `📋 Copia Errore negli Appunti` (`navigator.clipboard.writeText`). |
| **18/10/2026** | `import_map.py` | Timeout e 502 Bad Gateway sui server Overpass pubblici OpenStreetMap | Configurato array `OVERPASS_MIRRORS` a 4 server alternativi, timeout a 25s e disattivazione del rate-limiting bloccante. |
| **19/10/2026** | `web/index.html` | Mancata chiusura del tag `</section>` alla fine di `tab-intermediate` (riga 1007) | Il mancato tag annidava `#tab-faq` dentro una sezione con `display: none;`, rendendo invisibile la scheda FAQ. Aggiunta la chiusura corretta (verificato con parser DOM: 0 errori). |
| **19/10/2026** | `web/style.css` | Barra di navigazione su schermi piccoli tagliava fuori i tab finali (FAQ e ROI) | Aggiunto `flex-wrap: wrap;` al container della barra dei modelli per rendere visibili tutte le 9 schede su qualsiasi risoluzione. |
| **19/10/2026** | `server.py` | Binding statico della porta 8085 incompatibile con i provider Cloud (Render, Cloud Run, Heroku) | Aggiornato `PORT = int(os.environ.get("PORT", 8085))` per consentire binding dinamico in ambienti containerizzati. |
| **19/10/2026** | GitHub & Branding | Sovrapposizione del marchio commerciale "Optifleet" con Renault Trucks (Volvo Group) | Eseguita ridenominazione completa della piattaforma in **OR-Route**, aggiornato il repository GitHub a [`trevinic/or-route`](https://github.com/trevinic/or-route), aggiornati tutti i log, le intestazioni e la documentazione. |
| **19/10/2026** | `import_map.py` & `web/index.html` | Errore `502 Bad Gateway` / `ConnectTimeout` durante il download OSM per raggio 5000m dovuto a sovraccarico dei mirror Overpass | 1) Implementato motore di failover prioritario su **OpenStreetMap Core API** (`api.openstreetmap.org/api/0.6/map`) con parsing nativo `ox.graph_from_xml` immune dai disservizi di Overpass; 2) Calibrazione e auto-clamping del raggio di raccolta a 750m (~25-50 vie per turno) per rispettare le quote di nodi e garantire soluzioni esatte in pochi secondi. |
| **19/10/2026** | `web/index.html`, `web/app.js`, `gis_pipeline.py` | Apertura predefinita mappe su Stradario (OpenStreetMap) ed eliminazione collegamenti a FAQ e questionario | 1) Integrato Leaflet GIS su tutti i 5 modelli (CVRP, VRPTW, EV-VRP, VRPPD, MDVRP) e aggiornato Folium in CARP impostando l'apertura predefinita su **Stradario (OpenStreetMap)** con switcher base layer; 2) Eliminati tutti i pulsanti e link a FAQ e Questionario dall'intestazione, dal logo e dalle schede dei modelli. |
| **20/10/2026** | `server.py`, `pcarp_model.py`, `carptw_model.py`, `web/` | Estensione della suite con Modello 7 (PCARP) e Modello 8 (CARPTW) | 1) Sviluppati e integrati due nuovi modelli operativi di Arc Routing: PCARP per la raccolta differenziata settimanale (Lun-Sab a frazioni alterne) e CARPTW per servizi con finestre orarie tassative su vie e ZTL; 2) Aggiornato il Wizard interattivo con nuove domande dedicate e raccomandazione automatica; 3) Aggiunte le sezioni UI complete di mappe Leaflet GIS, tabelle veicoli/stradario e reportistica temporale; 4) Aggiornata la Dispensa MILP e le FAQ con le formulazioni matematiche e la bibliografia scientifica. |

---

## 6. ISTRUZIONI PER L'AVVIO IN LOCALE

Per avviare la piattaforma su ambiente Windows:

1. **Doppio clic sul file batch**:  
   Eseguire il file [`avvia_optifleet.bat`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/avvia_optifleet.bat) (o [`avvia.bat`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/avvia.bat)) posizionato nella cartella del progetto.  
   Lo script esegue automaticamente:
   - Controllo dell'interprete Python e dell'ambiente virtuale `.venv`.
   - Installazione/aggiornamento automatico delle dipendenze mancanti.
   - Avvio del server applicativo in background su porta **8085**.
   - Apertura automatica del browser predefinito all'indirizzo **`http://localhost:8085`**.

2. **Verifica Manuale da Terminale**:
   ```powershell
   cd "c:\Users\User\Downloads\Ricerca Operativa\rsu_carp_optimization"
   .venv\Scripts\python.exe server.py
   ```

---

## 7. GUIDA ALLA PUBBLICAZIONE WEB & DOCKERIZZAZIONE

L'intero progetto è predisposto per il deploy immediato tramite **Docker**:

* **File `Dockerfile`**: basato sull'immagine ufficiale `python:3.11-slim-bookworm`, include l'installazione nativa del solver binario `coinor-cbc`, delle librerie `libgeos-dev`, `libspatialindex-dev`, `gdal-bin`, `gcc` e `curl`, esponendo la porta assegnata dall'host.
* **File `requirements.txt`**: include tutte le dipendenze Python con versioni stabili (`pulp`, `osmnx`, `networkx`, `folium`, `scikit-learn`, `geopandas`, `shapely`, `requests`, `gunicorn`).
* **File `docker-compose.yml`**: per l'avvio con un singolo comando su qualsiasi server VPS o macchina Linux/macOS:
  ```bash
  docker compose up -d --build
  ```
* **Deploy su Render.com**:
  1. Connetti il repository [`https://github.com/trevinic/or-route`](https://github.com/trevinic/or-route).
  2. Crea un **New Web Service** (Runtime: Docker).
  3. Render eseguirà la build e fornirà automaticamente un indirizzo HTTPS pubblico (es. `or-route.onrender.com`) e la possibilità di collegare un dominio personalizzato (come `or-route.io` o `or-route.net`).
