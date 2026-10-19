# 📐 OptiFleet RO &mdash; Documentazione Integrale & Progressi del Progetto
**Piattaforma di Ricerca Operativa & Ottimizzazione Flotte Aziendali**  
*Autore: Team di Ricerca Operativa & Sviluppo Software*  
*Data Ultimo Aggiornamento: 19 Ottobre 2026*  
*Versione: 2.5 (Ready for Production & Docker Deployment)*  

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
   - 5.3 Nuovo Modal di Errore con Pulsante Rapido `📋 Copia Errore negli Appunti`
   - 5.4 Ridondanza Mirror OpenStreetMap Overpass API
6. [Istruzioni per l'Avvio in Locale](#6-istruzioni-per-lavvio-in-locale)
7. [Guida alla Pubblicazione Web & Dockerizzazione](#7-guida-alla-pubblicazione-web--dockerizzazione)

---

## 1. SINTESI DEL PROGETTO & OBIETTIVI

**OptiFleet RO** è una piattaforma professionale e aperta concepita per colmare il divario tra la letteratura scientifica di **Ricerca Operativa (Operations Research)** e le esigenze pratiche dei fleet manager, aziende di logistica, corrieri espresso e municipalizzate di igiene urbana.

### Obiettivi Chiave:
* **Abbattimento dei costi operativi**: riduzione tra il 14% e il 25% dei chilometri percorsi complessivi grazie all'azzeramento della pianificazione manuale intuitiva.
* **Taglio dei costi di carburante e manutenzione**: ottimizzazione della saturazione volumetrica e di peso dei veicoli con eliminazione dei transiti a vuoto (*deadheading*).
* **Decarbonizzazione e rendicontazione ESG**: calcolo certificabile delle tonnellate di $CO_2$ evitate secondo gli standard internazionali GHG Protocol / DEFRA (Scope 1).
* **Accessibilità e Sovranità dei Dati**: interfaccia web fruibile via browser, zero lock-in, salvataggio locale dei dati in JSON, compatibilità con mappe GIS libere mondiali.

---

## 2. ARCHITETTURA TECNICA DEL SISTEMA

L'applicazione segue un'architettura **client-server modulare disaccoppiata**:

```
├── [FRONTEND WEB] (Directory: web/)
│   ├── index.html            <- SPA responsive con 9 schede operative
│   ├── style.css             <- Design System dark-mode, layout flex-wrap, typography Outfit & JetBrains Mono
│   └── app.js                <- Controller applicativo, Canvas renderer, logica wizard, gestione API REST
│
├── [BACKEND SERVER] (server.py)
│   ├── HTTP REST Server      <- Server Python con binding porta dinamico (os.environ PORT / 8085)
│   ├── Endpoints Gestione    <- /api/config, /api/import_osm, /api/filter_sector, /api/crop_sector_by_capacity
│   └── Endpoints Risoluzione <- /api/solve, /api/cvrp/solve, /api/vrptw/solve, /api/ev_vrp/solve, /api/vrppd/solve, /api/mdvrp/solve
│
├── [MOTORI DI OTTIMIZZAZIONE]
│   ├── carp_model.py         <- Dual Engine: MILP Single-Commodity Flow + Euristica Augmented Path Scanning
│   ├── cvrp_model.py         <- MILP con vincoli MTZ (Miller-Tucker-Zemlin)
│   ├── vrptw_model.py        <- MILP con orizzonti temporali (Solomon 1987) e timeline
│   ├── ev_vrp_model.py       <- Programmazione soste intermedie (IF) e ricariche kW/SoC
│   ├── vrppd_model.py        <- Accoppiamento origine/destinazione e carico dinamico
│   └── mdvrp_model.py        <- Assegnazione simultanea multi-deposito e cluster territoriali
│
├── [PIPELINE CARTOGRAFICA & GIS]
│   ├── gis_pipeline.py       <- Costruzione grafi NetworkX, calcolo distanze e rendering Folium Leaflet
│   └── import_map.py         <- Geocodifica Nominatim, download OSMnx con mirror Overpass a rotazione
│
└── [DATI & AMBIENTE]
    ├── data/                 <- File di configurazione JSON per ciascun modello
    ├── output/               <- Mappe interattive generate (percorso_raccolta.html)
    └── avvia_optifleet.bat   <- Script automatico di avvio su ambiente Windows
```

---

## 3. I 6 MODELLI MATEMATICI DI RICERCA OPERATIVA IMPLEMENTATI

### 3.1 CARP &mdash; Capacitated Arc Routing Problem
* **Ambito applicativo**: Raccolta rifiuti solidi urbani (RSU) porta-a-porta, spazzamento meccanico strade, spargimento sale/sgombero neve, manutenzione acquedotti.
* **Natura del problema**: La domanda di servizio risiede **sugli archi (strade)** e non sui nodi. I mezzi percorrono l'intera via a velocità di servizio per raccogliere mastelli o spazzare.
* **Architettura Dual-Engine**:
  1. *Piccole istanze (<= 45 vie e <= 4 veicoli)*: Modello esatto MILP **Single-Commodity Flow** risolto con solutore COIN-OR CBC via PuLP.
  2. *Istanze reali e comunali grandi (> 45 vie)*: Euristica ad altissima efficienza **Augmented Path-Scanning** con All-Pairs Shortest Path (Dijkstra) per garantire fattibilità al 100% e tempi di calcolo istantanei.

### 3.2 CVRP &mdash; Capacitated Vehicle Routing Problem
* **Ambito applicativo**: Consegna merci da magazzino centrale a negozi/clienti discreti (GDO, corrieri, distribuzione bevande, farmaci).
* **Formulazione**: Minimizzazione della somma tra costi fissi dei mezzi ingaggiati e costi di percorrenza chilometrica, soggetti a vincoli di visita univoca dei clienti, conservazione del flusso al deposito ed eliminazione dei sottogiri tramite formulazione **Miller-Tucker-Zemlin (MTZ)** con bound di carico $q_i \le u_{ik} \le Q$.

### 3.3 VRPTW &mdash; Vehicle Routing with Time Windows
* **Ambito applicativo**: Trasporti e consegne con finestre temporali rigide (fasce orarie ZTL, orari di apertura banchina supermercati, slot e-commerce).
* **Formulazione**: Oltre ai vincoli di capienza, gestisce le variabili temporali di inizio servizio $t_{ik}$. Supporta **Hard Time Windows**: l'arrivo anticipato genera tempo di attesa (*waiting time*), mentre il ritardo rispetto a $b_i$ rende il piano inammissibile, forzando la riorganizzazione delle tappe o l'ingaggio di un mezzo supplementare.

### 3.4 WCVRPTW-IF / EV-VRP &mdash; Flotte Elettriche & Scarichi Intermedi
* **Ambito applicativo**: Raccolta pesante con compattatori che riempiono il cassone a metà turno, oppure flotte commerciali a trazione 100% elettrica (e-Van, e-Truck) con autonomia chilometrica limitata.
* **Formulazione**: Introduce nodi intermedi (*Intermediate Facilities - IF*):
  - *Impianti TMB / Discariche*: consentono lo scarico intermedio azzerando il carico a bordo senza rientrare alla rimessa centrale.
  - *Colonnine DC Fast Charger*: consentono il recupero dello State of Charge (SoC) all'80-100% conteggiando tempi di sosta e consumo specifico in kWh/km.

### 3.5 VRPPD &mdash; Vehicle Routing with Pickup and Delivery
* **Ambito applicativo**: Trasporto a carico parziale (LTL), corrieri espressi che ritirano da fornitori per consegnare a clienti finali nello stesso viaggio, trasporto disabili o dializzati.
* **Formulazione**: Gestisce la triplice relazione:
  1. *Accoppiamento (Coupling)*: lo stesso veicolo che preleva a $P_r$ deve eseguire la consegna a $D_r$.
  2. *Precedenza Temporale*: $t(P_r) + s(P_r) + \tau(P_r, D_r) \le t(D_r)$.
  3. *Capacità Dinamica Istantanea*: il carico a bordo fluttua continuamente e non deve mai eccedere la portata massima $Q$ in alcun istante del percorso.

### 3.6 MDVRP &mdash; Multi-Depot Vehicle Routing
* **Ambito applicativo**: Aziende multi-sito con 2 o più poli logistici o rimesse territoriali (es. Deposito Nord, Deposito Sud, Hub Interportuale).
* **Formulazione**: Risolve contemporaneamente l'assegnazione ottima cliente-deposito e la schedulazione dei percorsi, garantendo che ogni veicolo parta e rientri rigorosamente alla propria rimessa di appartenenza ed eliminando la sub-ottimalità delle partizioni geografiche manuali a priori.

---

## 4. FUNZIONALITÀ OPERATIVE & STRUMENTI SVILUPPATI

### 4.1 Selettore Guidato Aziendale a 5 Domande
Permette a qualsiasi utente o responsabile logistico non esperto di individuare il modello matematico corretto rispondendo a 5 domande a risposta multipla su tipologia di servizio, depositi, ritiri/consegne, fasce orarie e tappe intermedie.

### 4.2 Configuratore Flotta Eterogenea & Calcolo Costo Reale
Consente di definire un parco mezzi misto (es. furgoni patente B da 1.500 kg, motrici 2 assi da 4.500 kg, compattatori pesanti a 3 assi da 9.000 kg).  
Include il **Calcolatore Costo Fisso Giornaliero (€/giorno)**:
$$\text{Costo Fisso} = (\text{Costo Orario Autista} \times \text{Ore Turno}) + \text{Equipaggio Ausiliario} + \text{Quota Giornaliera Noleggio/Ammortamento/Assicurazione}$$

### 4.3 Partizionamento Grandi Aree & Auto-Scaling dei Mezzi
Per gestire interi comuni con centinaia di strade:
* **Auto-Scaling Flotta**: rileva automaticamente se la domanda totale della rete supera la portata complessiva dei mezzi e propone l'incremento guidato della flotta con saturazione al 100%.
* **Partizionamento Settori Viari**: menu rapido per estrarre sotto-settori operativi da 30, 45, 60, 80 o 120 vie, gestibili con un numero calibrato di squadre.
* **Ritaglio Automatico su Misura**: pulsante *"✂️ Riduci Area per Flotta Attuale"* che ritaglia geometricamente la rete attorno al deposito in proporzione esatta alla portata utile dei mezzi a disposizione.

### 4.4 Motore Cartografico OpenStreetMap Globale
* **Validità Internazionale**: Funziona per l'Italia, l'intera Unione Europea e qualsiasi territorio del mondo.
* **Geocodifica Internazionale**: Accetta toponimi con nazione (es. `Nice, France`, `München, Germany`, `Valencia, Spain`, `Lugano, Switzerland`, `Innsbruck, Austria`) oppure coordinate GPS decimali (lat, lon).
* **Regole di Circolazione Locali**: Riconosce sensi unici (*oneway*), rotatorie, svolte obbligate e caratteristiche geometriche viarie native di OSM.
* **Quadrupla Ridondanza Overpass**: Configurato con rotazione automatica su 4 server mirror mondiali (`kumi.systems`, `private.coffee`, `overpass-api.de`, `lz4.overpass-api.de`) con timeout a 25 secondi e disabilitazione del rate-limit bloccante.

### 4.5 Mappe Interattive Folium (GIS) e Canvas Multistrato
* Visualizzatore GIS basato su Folium/Leaflet con tratteggio a colori univoci per ciascun compattatore e frecce direzionali di transito.
* Selettore strati integrato con visualizzazione OpenStreetMap, CartoDB Voyager, Esri WorldStreetMap e immagini satellitari ortofoto.
* **Banner di Navigazione Fluttuante**: presente direttamente sulla mappa generata per tornare in qualsiasi momento alla piattaforma gestionale (`http://localhost:8085`) o alla Guida/FAQ con un clic.
* Canvas HTML5 dedicati per il rendering immediato dei modelli CVRP, VRPTW, EV-VRP, VRPPD e MDVRP.

### 4.6 Calcolatore Risparmio ROI & Emissioni CO2 (ESG Scope 1)
Consente di calcolare l'impatto economico e ambientale dell'adozione della Ricerca Operativa:
* Stima litri di carburante risparmiati all'anno.
* Risparmio economico complessivo in Euro (€/anno) e Payback Period dell'investimento.
* Calcolo tonnellate di $CO_2$ evitate secondo lo standard GHG Protocol (fattore di emissione 2,65 kg $CO_2$/litro gasolio) per l'inclusione immediata nel Bilancio di Sostenibilità (CSRD / ESG).

### 4.7 Sistema di Backup Locale (.json) Esportazione & Importazione
Garantisce la persistenza e la portabilità totale dei dati aziendali:
* **`📥 Esporta Backup (.json)`**: esporta istantaneamente in un singolo file JSON tutte le impostazioni, le risposte del questionario, la configurazione dei veicoli, i clienti e le reti stradali.
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

---

## 6. ISTRUZIONI PER L'AVVIO IN LOCALE

Per avviare la piattaforma su ambiente Windows:

1. **Doppio clic sul file batch**:  
   Eseguire il file [`avvia_optifleet.bat`](file:///c:/Users/User/Downloads/Ricerca%20Operativa/avvia_optifleet.bat) posizionato nella cartella principale del progetto.  
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

L'intero progetto è stato predisposto per il deploy immediato tramite **Docker**:

* **File `Dockerfile`**: basato sull'immagine ufficiale `python:3.11-slim-bookworm`, include l'installazione nativa del solver binario `coinor-cbc`, delle librerie `libgeos-dev`, `libspatialindex-dev`, `gdal-bin`, `gcc` e `curl`, esponendo la porta assegnata dall'host.
* **File `requirements.txt`**: include tutte le dipendenze Python con versioni stabili (`pulp`, `osmnx`, `networkx`, `folium`, `scikit-learn`, `geopandas`, `shapely`, `requests`, `gunicorn`).
* **File `docker-compose.yml`**: per l'avvio con un singolo comando su qualsiasi server VPS o macchina Linux/macOS:
  ```bash
  docker compose up -d --build
  ```
* **Compatibilità Cloud Diretta**:
  - **Render.com / Fly.io / Railway**: basta collegare il repository GitHub contenente il `Dockerfile`. Il cloud rileverà la configurazione e pubblicherà il sito con HTTPS gratuito.
  - **Hetzner Cloud / VPS Ubuntu**: installare Docker e Nginx, lanciare il container e puntare il dominio tramite certificato Let's Encrypt.
  - **Google Cloud Run**: compilazione ed esecuzione serverless con scalabilità a costo zero per bassi volumi di traffico.
