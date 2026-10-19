# 📐 OR-Route &mdash; Piattaforma di Ricerca Operativa per Flotte Aziendali

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![PuLP MILP](https://img.shields.io/badge/PuLP-COIN--OR_CBC-FF6F00?style=flat)](https://github.com/coin-or/pulp)
[![Docker Ready](https://img.shields.io/badge/Docker-Container_Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![OpenStreetMap](https://img.shields.io/badge/Maps-OpenStreetMap_%2F_OSMnx-7EBC6F?style=flat&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![License: Open](https://img.shields.io/badge/License-Open_Tools-10B981?style=flat)](#licenza)

**OR-Route** è una piattaforma applicativa avanzata e aperta per l'ottimizzazione combinatoria e la pianificazione operativa delle flotte aziendali, corrieri espresso, distribuzione merci e servizi municipali di igiene urbana (raccolta rifiuti porta-a-porta e spazzamento stradale).

---

## 🚀 Caratteristiche Principali

* **🧭 Selettore Guidato a 5 Domande**: guida l'utente nella scelta del modello matematico più adatto in base alle specifiche di business.
* **🚛 Gestione Flotta Eterogenea**: configurazione libera di diverse categorie di mezzi (furgoni patente B, motrici 2 assi, compattatori pesanti a 3 assi, veicoli elettrici) con calcolo combinato di costo fisso giornaliero (€/giorno) e costo chilometrico (€/km).
* **🌍 Geocodifica & Mappe OpenStreetMap Internazionali**: download automatico della viabilità reale per qualsiasi comune o territorio in Italia, Europa e nel mondo, con geocodifica Nominatim e coordinate GPS decimali.
* **🗺️ Mappe GIS Interattive & Canvas**: rendering con tratteggio a colori per ciascun veicolo, frecce animate di percorrenza e controllo strati satellitari ortofoto.
* **💰 Calcolatore ROI & Emissioni ESG (Scope 1)**: stima dei risparmi annui di carburante e calcolo delle tonnellate di $CO_2$ evitate secondo lo standard internazionale GHG Protocol (fattore 2,65 kg $CO_2$/l).
* **💾 Sovranità dei Dati**: salvataggio locale, esportazione e importazione in formato JSON senza lock-in di fornitori esterni.
* **📚 Dispensa Teorica & 11 FAQ**: formulazioni matematiche rigorose MILP, bibliografia scientifica ufficiale e manuale d'uso operativo in 5 fasi.

---

## 📐 I 6 Modelli Matematici Implementati

| Modello | Formulazione Matematica | Settore di Applicazione Tipico |
| :--- | :--- | :--- |
| **1. CARP** | Single-Commodity Flow + Euristica Augmented Path-Scanning | Raccolta Rifiuti Porta a Porta (RSU), Spazzamento, Sgombero Neve |
| **2. CVRP** | MILP con eliminazione sottogiri Miller-Tucker-Zemlin (MTZ) | Consegne merci, Logistica B2B, Distribuzione GDO e Farmaci |
| **3. VRPTW** | MILP con Hard Time Windows e orizzonti temporali continui | Consegne con fasce orarie ZTL, orari di apertura banchina scarico |
| **4. EV-VRP / WCVRPTW-IF** | Programmazione soste a impianti intermedi (IF) & Ricariche DC | Compattatori con scarico a discariche TMB, Flotte commerciali elettriche |
| **5. VRPPD** | Accoppiamento origine/destinazione e carico dinamico continuo | Ritiri da fornitori e consegne dirette ai clienti nello stesso turno |
| **6. MDVRP** | Assegnazione congiunta multi-deposito e vincoli di rimessa | Aziende multi-sito con 2 o più poli logistici o rimesse territoriali |

---

## 💻 Avvio Rapido in Locale (Windows)

1. **Clona il repository**:
   ```bash
   git clone https://github.com/trevinic/or-route.git
   cd or-route
   ```

2. **Avvio con 1 clic (Script Batch)**:
   Fai doppio clic sul file `avvia_optifleet.bat` (o `avvia.bat`). Lo script configurerà automaticamente l'ambiente virtuale Python `.venv`, installerà le dipendenze e aprirà il browser su:
   👉 **http://localhost:8085**

3. **Avvio manuale da terminale**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # oppure .venv\Scripts\activate su Windows
   pip install -r requirements.txt
   python server.py
   ```

---

## 🐳 Esecuzione con Docker & Deploy Cloud

Il progetto include un `Dockerfile` di produzione basato su Debian 12 Bookworm con il solver binario compilato `coinor-cbc` e le librerie GIS di sistema (`libgeos-dev`, `gdal-bin`, `libspatialindex-dev`).

### Esecuzione con Docker Compose:
```bash
docker compose up -d --build
```
L'applicazione sarà immediatamente accessibile su `http://localhost:8085`.

### Deploy su Render.com / Fly.io / Railway / Google Cloud Run:
1. Accedi a [Render.com](https://render.com) (o Fly.io).
2. Seleziona **"New Web Service"** e collega questo repository GitHub (`trevinic/or-route`).
3. Render rileverà automaticamente il `Dockerfile` ed eseguirà il build in cloud con certificato HTTPS (SSL) gratuito e supporto per dominio personalizzato.

---

## 📖 Documentazione Completa

Per la documentazione tecnica esaustiva, le formulazioni algebriche complete e la cronologia degli aggiornamenti, consulta il file:  
👉 [`DOCUMENTAZIONE_PROGRESSI_OR_ROUTE.md`](DOCUMENTAZIONE_PROGRESSI_OR_ROUTE.md)

---

## ⚖️ Licenza & Note

Piattaforma gratuita e aperta per la Ricerca Operativa industriale applicata alla logistica sostenibile.
