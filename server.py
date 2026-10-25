"""
Server Web per la Piattaforma OR-Route:
Modelli di Ricerca Operativa per l'Ottimizzazione delle Flotte Aziendali.
Fornisce API REST per:
- CARP (Capacitated Arc Routing Problem - raccolta rifiuti e servizi a rete)
- CVRP (Capacitated Vehicle Routing Problem - consegne e logistica merci)
- VRPTW (Vehicle Routing Problem with Time Windows - consegne con fasce orarie)
- Calcolatori ROI e selettore guidato per esigenze aziendali
"""

import os
import json
import http.server
import socketserver
import urllib.parse
import urllib.request
import urllib.error
import time
from typing import Dict, Any

from carp_model import solve_carp_from_config
from gis_pipeline import build_graph_from_config, genera_mappa_percorso
import cvrp_model
import vrptw_model
import ev_vrp_model
import vrppd_model
import mdvrp_model
import pcarp_model
import carptw_model

PORT = int(os.environ.get("PORT", 8085))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Configurazione Architettura Ibrida: Render (Frontend) + Oracle Cloud (Backend Computazionale)
IS_RENDER = os.environ.get("RENDER") is not None
ORACLE_BACKEND_URL = os.environ.get("ORACLE_BACKEND_URL")
if not ORACLE_BACKEND_URL and IS_RENDER:
    # URL di default del backend computazionale Oracle VPS (attivo 24/7)
    ORACLE_BACKEND_URL = "https://beautifully-priority-alloy-core.trycloudflare.com"
CONFIG_PATH = os.path.join(BASE_DIR, "data", "config_aree_raccolta.json")
CVRP_CONFIG_PATH = os.path.join(BASE_DIR, "data", "config_cvrp.json")
VRPTW_CONFIG_PATH = os.path.join(BASE_DIR, "data", "config_vrptw.json")
EV_VRP_CONFIG_PATH = os.path.join(BASE_DIR, "data", "config_ev_vrp.json")
VRPPD_CONFIG_PATH = os.path.join(BASE_DIR, "data", "config_vrppd.json")
MDVRP_CONFIG_PATH = os.path.join(BASE_DIR, "data", "config_mdvrp.json")
PCARP_CONFIG_PATH = os.path.join(BASE_DIR, "data", "config_pcarp.json")
CARPTW_CONFIG_PATH = os.path.join(BASE_DIR, "data", "config_carptw.json")
OUTPUT_MAP_PATH = os.path.join(BASE_DIR, "output", "percorso_raccolta.html")
WEB_DIR = os.path.join(BASE_DIR, "web")

DEFAULT_CONFIG = {
    "depot_node": 0,
    "depot_info": {
        "exact_lat": 45.6670,
        "exact_lon": 12.2450,
        "address": "Cantiere Deposito Centrale RSU Treviso"
    },
    "nodes": [
        {"id": 0, "name": "Deposito Centrale RSU", "lat": 45.6670, "lon": 12.2450},
        {"id": 1, "name": "Incrocio 1 (Nord-Est)", "lat": 45.6695, "lon": 12.2480},
        {"id": 2, "name": "Incrocio 2 (Via Roma / Garibaldi)", "lat": 45.6720, "lon": 12.2530},
        {"id": 3, "name": "Incrocio 3 (Via Dante)", "lat": 45.6680, "lon": 12.2560},
        {"id": 4, "name": "Incrocio 4 (Viale Europa)", "lat": 45.6645, "lon": 12.2490}
    ],
    "streets": [
        {"id": "R1", "name": "Raccordo Deposito 1", "u": 0, "v": 1, "transit_cost": 3.0, "service_cost": 3.0, "demand_kg": 0, "description": "Raccordo cantiere nord (transito)"},
        {"id": "R4", "name": "Raccordo Deposito 4", "u": 0, "v": 4, "transit_cost": 4.0, "service_cost": 4.0, "demand_kg": 0, "description": "Raccordo cantiere sud (transito)"},
        {"id": "VR", "name": "Via Roma", "u": 1, "v": 2, "transit_cost": 2.5, "service_cost": 4.5, "demand_kg": 1800, "description": "Centro storico: raccolta porta a porta"},
        {"id": "CG", "name": "Corso Garibaldi", "u": 2, "v": 3, "transit_cost": 3.0, "service_cost": 5.0, "demand_kg": 2200, "description": "Arteria commerciale ad alta densità"},
        {"id": "VD", "name": "Via Dante", "u": 3, "v": 4, "transit_cost": 2.0, "service_cost": 4.0, "demand_kg": 1500, "description": "Zona residenziale est"},
        {"id": "VE", "name": "Viale Europa", "u": 1, "v": 4, "transit_cost": 3.5, "service_cost": 6.0, "demand_kg": 2000, "description": "Quartiere residenziale ovest"},
        {"id": "BT", "name": "Bretella di Transito", "u": 2, "v": 4, "transit_cost": 3.0, "service_cost": 3.0, "demand_kg": 0, "description": "Bretella di transito veloce"}
    ],
    "vehicles": [
        {"name": "Compattatore_1", "capacity_kg": 4500, "fixed_cost": 100.0, "description": "Mezzo pesante 2 assi per centro e assi primari"},
        {"name": "Compattatore_2", "capacity_kg": 4500, "fixed_cost": 100.0, "description": "Mezzo satellite per completamento aree residenziali"}
    ],
    "settings": {
        "deadhead_upper_bound": 5,
        "service_speed_factor": 1.8
    }
}


def load_config() -> Dict[str, Any]:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and data.get("streets") and len(data["streets"]) > 0:
                    return data
                print("[CONFIG] config_aree_raccolta.json non valida o vuota. Ripristino configurazione predefinita.")
        except Exception as e:
            print(f"Errore lettura config: {e}. Uso predefinito.")
    return DEFAULT_CONFIG.copy()


def save_config(cfg: Dict[str, Any]):
    if not isinstance(cfg, dict) or not cfg.get("streets") or len(cfg["streets"]) == 0:
        print("[CONFIG] save_config rifiutato: configurazione priva di tratte stradali ('streets').")
        return
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)



def load_cvrp_config() -> Dict[str, Any]:
    if os.path.exists(CVRP_CONFIG_PATH):
        try:
            with open(CVRP_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return cvrp_model.get_default_cvrp_scenario()


def save_cvrp_config(cfg: Dict[str, Any]):
    os.makedirs(os.path.dirname(CVRP_CONFIG_PATH), exist_ok=True)
    with open(CVRP_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def load_vrptw_config() -> Dict[str, Any]:
    if os.path.exists(VRPTW_CONFIG_PATH):
        try:
            with open(VRPTW_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return vrptw_model.get_default_vrptw_scenario()


def save_vrptw_config(cfg: Dict[str, Any]):
    os.makedirs(os.path.dirname(VRPTW_CONFIG_PATH), exist_ok=True)
    with open(VRPTW_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def load_ev_vrp_config() -> Dict[str, Any]:
    if os.path.exists(EV_VRP_CONFIG_PATH):
        try:
            with open(EV_VRP_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return ev_vrp_model.get_default_ev_vrp_scenario()


def save_ev_vrp_config(cfg: Dict[str, Any]):
    os.makedirs(os.path.dirname(EV_VRP_CONFIG_PATH), exist_ok=True)
    with open(EV_VRP_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def load_vrppd_config() -> Dict[str, Any]:
    if os.path.exists(VRPPD_CONFIG_PATH):
        try:
            with open(VRPPD_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return vrppd_model.get_default_vrppd_scenario()


def save_vrppd_config(cfg: Dict[str, Any]):
    os.makedirs(os.path.dirname(VRPPD_CONFIG_PATH), exist_ok=True)
    with open(VRPPD_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def load_mdvrp_config() -> Dict[str, Any]:
    if os.path.exists(MDVRP_CONFIG_PATH):
        try:
            with open(MDVRP_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return mdvrp_model.get_default_mdvrp_scenario()


def save_mdvrp_config(cfg: Dict[str, Any]):
    os.makedirs(os.path.dirname(MDVRP_CONFIG_PATH), exist_ok=True)
    with open(MDVRP_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def load_pcarp_config() -> Dict[str, Any]:
    if os.path.exists(PCARP_CONFIG_PATH):
        try:
            with open(PCARP_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return pcarp_model.get_default_pcarp_scenario()


def save_pcarp_config(cfg: Dict[str, Any]):
    os.makedirs(os.path.dirname(PCARP_CONFIG_PATH), exist_ok=True)
    with open(PCARP_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def load_carptw_config() -> Dict[str, Any]:
    if os.path.exists(CARPTW_CONFIG_PATH):
        try:
            with open(CARPTW_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return carptw_model.get_default_carptw_scenario()


def save_carptw_config(cfg: Dict[str, Any]):
    os.makedirs(os.path.dirname(CARPTW_CONFIG_PATH), exist_ok=True)
    with open(CARPTW_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


class CARPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def check_auth(self) -> bool:
        auth_user = os.environ.get("OR_ROUTE_AUTH_USER")
        auth_pass = os.environ.get("OR_ROUTE_AUTH_PASS")
        if not auth_user or not auth_pass:
            return True

        auth_header = self.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Basic "):
            return False

        import base64
        try:
            encoded_cred = auth_header.split(" ", 1)[1]
            decoded_cred = base64.b64decode(encoded_cred).decode("utf-8")
            username, password = decoded_cred.split(":", 1)
            return (username == auth_user and password == auth_pass)
        except Exception:
            return False

    def require_auth(self):
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="OR-Route Optimization Platform"')
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"<h1>401 Accesso Riservato</h1><p>Inserire credenziali valide per accedere alla piattaforma OR-Route.</p>")

    def proxy_to_oracle(self, target_backend: str, body_bytes: bytes = None) -> bool:
        """Inoltra la richiesta di calcolo alla VPS Oracle Cloud e restituisce il risultato al client."""
        try:
            target_url = f"{target_backend.rstrip('/')}{self.path}"
            headers = {
                "User-Agent": "OR-Route-Hybrid-Gateway/1.0"
            }
            if "Content-Type" in self.headers:
                headers["Content-Type"] = self.headers["Content-Type"]
            if body_bytes is not None:
                headers["Content-Length"] = str(len(body_bytes))

            req = urllib.request.Request(target_url, data=body_bytes, headers=headers, method=self.command)
            with urllib.request.urlopen(req, timeout=120) as resp:
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() not in ("transfer-encoding", "content-encoding", "access-control-allow-origin"):
                        self.send_header(k, v)
                self.send_header("X-Engine", "Oracle-Cloud-Ampere-ARM")
                self.end_headers()
                self.wfile.write(resp.read())
                return True
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() not in ("transfer-encoding", "content-encoding", "access-control-allow-origin"):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(e.read())
            return True
        except Exception as e:
            print(f"[HYBRID GATEWAY] Avviso: VPS Oracle non raggiungibile ({e}), fallback al calcolo locale...", flush=True)
            return False

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if not self.check_auth():
            self.require_auth()
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Inoltro Ibrido: Se su Render, inoltra le richieste API e le mappe alla potente VPS Oracle
        if ORACLE_BACKEND_URL and (path.startswith("/api/") or path.startswith("/output/")):
            if self.proxy_to_oracle(ORACLE_BACKEND_URL):
                return

        if path in ("/", "/index.html"):
            index_path = os.path.join(WEB_DIR, "index.html")
            if os.path.exists(index_path):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                with open(index_path, "rb") as f:
                    self.wfile.write(f.read())
                return

        elif path == "/api/config":
            cfg = load_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
            return

        elif path == "/api/cvrp/config":
            cfg = load_cvrp_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
            return

        elif path == "/api/vrptw/config":
            cfg = load_vrptw_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
            return

        elif path == "/api/ev_vrp/config":
            cfg = load_ev_vrp_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
            return

        elif path == "/api/vrppd/config":
            cfg = load_vrppd_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
            return

        elif path == "/api/mdvrp/config":
            cfg = load_mdvrp_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
            return

        elif path == "/api/pcarp/config":
            cfg = load_pcarp_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
            return

        elif path == "/api/carptw/config":
            cfg = load_carptw_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
            return

        elif path == "/api/models-info":
            info = {
                "models": [
                    {
                        "id": "cvrp",
                        "title": "CVRP - Capacitated Vehicle Routing Problem",
                        "target": "Distribuzione Merci, Logistica & Corrieri Espresso",
                        "description": "Ottimizza le consegne da un magazzino centrale a clienti sparsi rispettando il carico massimo di furgoni e camion.",
                        "typical_savings": "15% - 25% km e carburante",
                        "constraints": ["Portata massima (kg o colli)", "Visita univoca cliente", "Eliminazione sottogiri MTZ"]
                    },
                    {
                        "id": "vrptw",
                        "title": "VRPTW - Vehicle Routing with Time Windows",
                        "target": "Consegne con Finestre Orarie Tassative (GDO, Farmaci, Servizi Tecnici)",
                        "description": "Pianifica i viaggi rispettando gli orari di apertura dei clienti, gli slot di scarico e i tempi di servizio sul posto.",
                        "typical_savings": "20% - 30% tempi di attesa e ritardi",
                        "constraints": ["Finestre orarie [a_i, b_i]", "Tempi di scarico/servizio", "Capacità veicolo"]
                    },
                    {
                        "id": "carp",
                        "title": "CARP - Capacitated Arc Routing Problem",
                        "target": "Servizi a Rete Stradale: Raccolta Rifiuti Porta a Porta, Spazzamento, Sgombero Neve",
                        "description": "Minimizza i transiti a vuoto (deadheading) quando il servizio deve essere svolto lungo gli archi/strade anziché a singoli nodi.",
                        "typical_savings": "18% - 32% percorsi a vuoto eliminati",
                        "constraints": ["Copertura strade richieste", "Bilancio gradi viari", "Single-Commodity Flow per capacità"]
                    },
                    {
                        "id": "wcvrptw-if",
                        "title": "WCVRPTW-IF / EV-VRP - Routing con Scarichi Intermedi o Ricarica Elettrica",
                        "target": "Flotte Pesanti RSU (Scarichi intermedi) o Flotte Elettriche Commerciali (Ricarica)",
                        "description": "Permette ai mezzi di svuotare il carico in discariche/inceneritori o effettuare ricariche rapide prima di rientrare al deposito.",
                        "typical_savings": "Ottimizzazione cicli intermedi e costi energia",
                        "constraints": ["Azzeramento/ripristino capacità a nodi intermedi", "Finestre orarie impianti"]
                    },
                    {
                        "id": "vrppd",
                        "title": "VRPPD - Vehicle Routing with Pickup and Delivery",
                        "target": "Corrieri Espresso, Ritiro e Consegna Nello Stesso Viaggio, Servizi a Chiamata",
                        "description": "Modella richieste congiunte di ritiro da un mittente e consegna a un destinatario lungo la stessa rotta con vincolo di precedenza.",
                        "typical_savings": "25% - 40% km rispetto a ritiri e consegne separati",
                        "constraints": ["Accoppiamento veicolo", "Precedenza Ritiro -> Consegna", "Capacità dinamica a bordo"]
                    },
                    {
                        "id": "mdvrp",
                        "title": "MDVRP - Multi-Depot Vehicle Routing Problem",
                        "target": "Aziende con Più Magazzini, Depositi o Cantieri Logistici Sul Territorio",
                        "description": "Ottimizza l'assegnazione di ciascun cliente al deposito più conveniente e pianifica i viaggi di ciascuna flotta periferica.",
                        "typical_savings": "18% - 28% km complessivi per aziende multi-sito",
                        "constraints": ["Home depot di partenza e rientro", "Assegnazione congiunta deposito-cliente", "Portata per mezzo"]
                    },
                    {
                        "id": "pcarp",
                        "title": "PCARP - Periodic Capacitated Arc Routing Problem",
                        "target": "Raccolta Rifiuti Differenziata su Calendario Settimanale Multi-Giorno",
                        "description": "Pianifica i percorsi settimanali bilanciando la flotta tra giorni alterni e frazioni differenziate (Umido, Carta, Plastica, Secco, Vetro).",
                        "typical_savings": "20% - 35% saturazione uniforme flotta su 6 giorni",
                        "constraints": ["Calendario multi-periodo Lun-Sab", "Frequenze per via e frazione", "Bilanciamento carichi giornalieri"]
                    },
                    {
                        "id": "carptw",
                        "title": "CARPTW - Arc Routing con Finestre Orarie Tassative su Vie",
                        "target": "Servizi Stradali in ZTL, Centri Storici, Aree Mercatali e Zone Scolastiche",
                        "description": "Garantisce il servizio su archi stradali rispettando fasce orarie stringenti (es. prima dell'orario scolastico o varchi ZTL).",
                        "typical_savings": "100% conformità oraria, 0 sanzioni ZTL",
                        "constraints": ["Finestre orarie [ready, due] su archi", "Tempi di attesa", "Sequenziamento cronologico"]
                    }
                ]
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(info).encode("utf-8"))
            return

        elif path in ("/output/percorso_raccolta.html", "/percorso_raccolta.html"):
            if os.path.exists(OUTPUT_MAP_PATH):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                with open(OUTPUT_MAP_PATH, "rb") as f:
                    self.wfile.write(f.read())
                return

        # Fallback file statici da WEB_DIR
        local_file = os.path.join(WEB_DIR, path.lstrip("/"))
        if os.path.exists(local_file) and os.path.isfile(local_file):
            content_type = "application/octet-stream"
            if local_file.endswith(".html"):
                content_type = "text/html; charset=utf-8"
            elif local_file.endswith(".css"):
                content_type = "text/css; charset=utf-8"
            elif local_file.endswith(".js"):
                content_type = "application/javascript; charset=utf-8"
            elif local_file.endswith(".json"):
                content_type = "application/json; charset=utf-8"
            elif local_file.endswith(".png"):
                content_type = "image/png"
            elif local_file.endswith(".svg"):
                content_type = "image/svg+xml"

            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.end_headers()
            with open(local_file, "rb") as f:
                self.wfile.write(f.read())
            return

        return super().do_GET()

    def do_POST(self):
        if not self.check_auth():
            self.require_auth()
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(length) if length > 0 else b""
        body = raw_body.decode("utf-8") if raw_body else "{}"

        # Inoltro Ibrido: Se su Render, inoltra le richieste di calcolo pesante alla VPS Oracle
        if ORACLE_BACKEND_URL and path.startswith("/api/"):
            if self.proxy_to_oracle(ORACLE_BACKEND_URL, raw_body):
                return

        # --------------------- CARP ENDPOINTS ---------------------
        if path == "/api/config":
            try:
                data = json.loads(body)
                if not isinstance(data, dict) or not data.get("streets"):
                    raise ValueError("Configurazione CARP non valida: mancano le tratte stradali ('streets').")
                save_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Configurazione CARP salvata."}).encode("utf-8"))
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"[SERVER] ERRORE /api/config: {e}", flush=True)
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return
        elif path == "/api/cvrp/config":
            try:
                data = json.loads(body)
                save_cvrp_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Configurazione CVRP salvata."}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/vrptw/config":
            try:
                data = json.loads(body)
                save_vrptw_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Configurazione VRPTW salvata."}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/ev_vrp/config":
            try:
                data = json.loads(body)
                save_ev_vrp_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Configurazione EV-VRP salvata."}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/reset":
            save_config(DEFAULT_CONFIG)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": DEFAULT_CONFIG}).encode("utf-8"))
            return

        elif path == "/api/import_osm":
            try:
                from import_map import import_osm_by_place, import_osm_by_point
                req = json.loads(body)
                place = req.get("place")
                lat = req.get("lat")
                lon = req.get("lon")
                dist = int(req.get("dist", 600))
                max_streets = int(req.get("max_streets", 35))

                depot_query = req.get("depot_query") or req.get("depot")
                depot_lat = req.get("depot_lat")
                depot_lon = req.get("depot_lon")

                if place:
                    d_lat = float(depot_lat) if depot_lat is not None and str(depot_lat).strip() != "" else None
                    d_lon = float(depot_lon) if depot_lon is not None and str(depot_lon).strip() != "" else None
                    new_cfg = import_osm_by_place(place, depot_lat=d_lat, depot_lon=d_lon, depot_query=depot_query, max_streets=max_streets)
                elif lat is not None and lon is not None:
                    new_cfg = import_osm_by_point(float(lat), float(lon), dist_meters=dist)
                else:
                    raise ValueError("Specificare un toponimo o coordinate GPS.")

                # Se l'utente aveva già una flotta configurata con adeguata capacità, preservala!
                old_cfg = load_config()
                if old_cfg.get("vehicles"):
                    old_fleet_cap = sum(float(v.get("capacity_kg", 0)) for v in old_cfg["vehicles"])
                    total_req_cap = sum(float(s.get("demand_kg", 0)) for s in new_cfg.get("streets", []))
                    if old_fleet_cap >= total_req_cap * 0.9:
                        new_cfg["vehicles"] = old_cfg["vehicles"]

                save_config(new_cfg)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "config": new_cfg}).encode("utf-8"))
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"[SERVER] ERRORE in /api/import_osm: {e}", flush=True)
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e), "traceback": traceback.format_exc()}).encode("utf-8"))
            return

        elif path == "/api/filter_sector":
            try:
                from import_map import convert_networkx_to_carp_config
                cfg = load_config()
                req_data = json.loads(body) if body else {}
                max_s = int(req_data.get("max_streets", 30))
                G = build_graph_from_config(cfg)
                new_cfg = convert_networkx_to_carp_config(
                    G, 
                    depot_node_id=0, 
                    exact_depot_lat=cfg.get("depot_info", {}).get("exact_lat"),
                    exact_depot_lon=cfg.get("depot_info", {}).get("exact_lon"),
                    depot_address=cfg.get("depot_info", {}).get("address"),
                    max_streets=max_s
                )
                new_cfg["vehicles"] = cfg.get("vehicles", new_cfg.get("vehicles"))
                save_config(new_cfg)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "config": new_cfg}).encode("utf-8"))
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"[SERVER] ERRORE in /api/filter_sector: {e}", flush=True)
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/crop_sector_by_capacity":
            try:
                from import_map import crop_sector_by_capacity, convert_networkx_to_carp_config
                cfg = load_config()
                req_data = json.loads(body) if body else {}
                target_cap = float(req_data.get("target_capacity_kg", 9000.0))
                G = build_graph_from_config(cfg)
                G_cropped = crop_sector_by_capacity(G, depot_node_id=0, max_capacity_kg=target_cap)
                new_cfg = convert_networkx_to_carp_config(
                    G_cropped, 
                    depot_node_id=0, 
                    exact_depot_lat=cfg.get("depot_info", {}).get("exact_lat"),
                    exact_depot_lon=cfg.get("depot_info", {}).get("exact_lon"),
                    depot_address=cfg.get("depot_info", {}).get("address"),
                    max_streets=0
                )
                # Conserva la flotta corrente dell'utente
                new_cfg["vehicles"] = cfg.get("vehicles", new_cfg.get("vehicles"))
                save_config(new_cfg)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "config": new_cfg}).encode("utf-8"))
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"[SERVER] ERRORE in /api/crop_sector_by_capacity: {e}", flush=True)
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/solve":
            try:
                if body.strip() and body != "{}":
                    try:
                        new_cfg = json.loads(body)
                        if isinstance(new_cfg, dict) and new_cfg.get("streets"):
                            save_config(new_cfg)
                    except Exception as parse_err:
                        print(f"[SERVER] Parse json in /api/solve: {parse_err}")

                cfg = load_config()
                if not cfg.get("streets"):
                    cfg = DEFAULT_CONFIG.copy()
                    save_config(cfg)

                result = solve_carp_from_config(cfg, solver_msg=False)

                # Generazione sempre attiva della mappa GIS interattiva aggiornata
                G = build_graph_from_config(cfg)
                genera_mappa_percorso(
                    G,
                    result,
                    output_file=OUTPUT_MAP_PATH,
                    depot_node=cfg.get("depot_node", 0),
                    depot_info=cfg.get("depot_info")
                )

                clean_vehicles = {}
                for k, v in result.get("vehicles", {}).items():
                    clean_vehicles[k] = {
                        "used": v.get("used", False),
                        "capacity": v.get("capacity", 0),
                        "fixed_cost": v.get("fixed_cost", 0.0),
                        "total_collected": v.get("total_collected", 0.0),
                        "movements": v.get("movements", [])
                    }

                streets = cfg.get("streets", [])
                resp_data = {
                    "status": result.get("status", "OPTIMAL"),
                    "is_optimal": result.get("is_optimal", True),
                    "objective_value": result.get("objective_value", 0.0),
                    "vehicles": clean_vehicles,
                    "total_demand_kg": sum(float(s.get("demand_kg", 0.0)) for s in streets),
                    "map_url": f"/output/percorso_raccolta.html?t={int(time.time())}"
                }

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(resp_data).encode("utf-8"))

            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"[SERVER] ERRORE in /api/solve: {e}", flush=True)
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e), "traceback": traceback.format_exc()}).encode("utf-8"))
            return

        # --------------------- CVRP ENDPOINTS ---------------------
        elif path == "/api/cvrp/solve":
            try:
                data = json.loads(body) if body.strip() and body != "{}" else load_cvrp_config()
                save_cvrp_config(data)
                res = cvrp_model.solve_cvrp(
                    depot=data["depot"],
                    customers=data["customers"],
                    vehicles=data["vehicles"],
                    cost_per_km=float(data.get("cost_per_km", 1.20))
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/cvrp/reset":
            def_cfg = cvrp_model.get_default_cvrp_scenario()
            save_cvrp_config(def_cfg)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": def_cfg}).encode("utf-8"))
            return

        # --------------------- VRPTW ENDPOINTS ---------------------
        elif path == "/api/vrptw/solve":
            try:
                data = json.loads(body) if body.strip() and body != "{}" else load_vrptw_config()
                save_vrptw_config(data)
                res = vrptw_model.solve_vrptw(
                    depot=data["depot"],
                    customers=data["customers"],
                    vehicles=data["vehicles"],
                    speed_kmh=float(data.get("speed_kmh", 35.0)),
                    cost_per_km=float(data.get("cost_per_km", 1.20))
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/vrptw/reset":
            def_cfg = vrptw_model.get_default_vrptw_scenario()
            save_vrptw_config(def_cfg)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": def_cfg}).encode("utf-8"))
            return

        # --------------------- EV-VRP / WCVRPTW-IF ENDPOINTS ---------------------
        elif path == "/api/ev_vrp/solve":
            try:
                data = json.loads(body) if body.strip() and body != "{}" else load_ev_vrp_config()
                save_ev_vrp_config(data)
                res = ev_vrp_model.solve_ev_vrp(
                    depot=data["depot"],
                    facilities=data.get("intermediate_facilities", []),
                    customers=data["customers"],
                    vehicles=data["vehicles"],
                    kwh_cost=float(data.get("kwh_cost", 0.38)),
                    kwh_per_km=float(data.get("kwh_per_km", 0.45))
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/cvrp/config":
            try:
                data = json.loads(body)
                save_cvrp_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/vrptw/config":
            try:
                data = json.loads(body)
                save_vrptw_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/ev_vrp/config":
            try:
                data = json.loads(body)
                save_ev_vrp_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        # --------------------- VRPPD ENDPOINTS ---------------------
        elif path == "/api/vrppd/solve":
            try:
                data = json.loads(body) if body.strip() and body != "{}" else load_vrppd_config()
                save_vrppd_config(data)
                res = vrppd_model.solve_vrppd(
                    depot=data["depot"],
                    requests=data["requests"],
                    vehicles=data["vehicles"],
                    cost_per_km=float(data.get("cost_per_km", 1.25))
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/vrppd/config":
            try:
                data = json.loads(body)
                save_vrppd_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/vrppd/reset":
            def_cfg = vrppd_model.get_default_vrppd_scenario()
            save_vrppd_config(def_cfg)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": def_cfg}).encode("utf-8"))
            return

        # --------------------- MDVRP ENDPOINTS ---------------------
        elif path == "/api/mdvrp/solve":
            try:
                data = json.loads(body) if body.strip() and body != "{}" else load_mdvrp_config()
                save_mdvrp_config(data)
                res = mdvrp_model.solve_mdvrp(
                    depots=data["depots"],
                    customers=data["customers"],
                    vehicles=data["vehicles"],
                    cost_per_km=float(data.get("cost_per_km", 1.20))
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/mdvrp/config":
            try:
                data = json.loads(body)
                save_mdvrp_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/mdvrp/reset":
            def_cfg = mdvrp_model.get_default_mdvrp_scenario()
            save_mdvrp_config(def_cfg)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": def_cfg}).encode("utf-8"))
            return

        # --------------------- PCARP ENDPOINTS ---------------------
        elif path == "/api/pcarp/solve":
            try:
                req_data = json.loads(body) if body.strip() and body != "{}" else {}
                data = load_pcarp_config()
                if "streets" in req_data:
                    data = req_data
                    save_pcarp_config(data)
                selected_day = req_data.get("selected_day", "ALL")
                res = pcarp_model.solve_pcarp(
                    depot=data["depot"],
                    streets=data["streets"],
                    vehicles=data["vehicles"],
                    selected_day=selected_day
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/pcarp/config":
            try:
                data = json.loads(body)
                save_pcarp_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/pcarp/reset":
            def_cfg = pcarp_model.get_default_pcarp_scenario()
            save_pcarp_config(def_cfg)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": def_cfg}).encode("utf-8"))
            return

        # --------------------- CARPTW ENDPOINTS ---------------------
        elif path == "/api/carptw/solve":
            try:
                req_data = json.loads(body) if body.strip() and body != "{}" else {}
                data = load_carptw_config()
                if "streets" in req_data:
                    data = req_data
                    save_carptw_config(data)
                speed = float(req_data.get("speed_kmh", data.get("urban_speed_kmh", 25.0)))
                res = carptw_model.solve_carptw(
                    depot=data["depot"],
                    streets=data["streets"],
                    vehicles=data["vehicles"],
                    speed_kmh=speed
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/carptw/config":
            try:
                data = json.loads(body)
                save_carptw_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/carptw/reset":
            def_cfg = carptw_model.get_default_carptw_scenario()
            save_carptw_config(def_cfg)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "config": def_cfg}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()


def find_free_port(start_port=8085, max_attempts=10):
    import socket
    for p in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", p))
                return p
            except OSError:
                continue
    return start_port


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def run_server(port: int = None):
    os.makedirs(WEB_DIR, exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "output"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)

    if port is None:
        port = int(os.environ.get("PORT", find_free_port(8085)))

    with ThreadedTCPServer(("", port), CARPRequestHandler) as httpd:
        print(f"\n==================================================================")
        print(f" PIATTAFORMA OR-ROUTE RICERCA OPERATIVA ATTIVA: http://localhost:{port}")
        print(f"==================================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nChiusura server...")
            httpd.server_close()


if __name__ == "__main__":
    run_server()
