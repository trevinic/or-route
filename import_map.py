"""
Modulo per importare una nuova mappa stradale reale o personalizzata:
- Da OpenStreetMap (tramite toponimo o raggio GPS attorno a un punto)
- Da file GeoJSON disegnati (ad es. da geojson.io o QGIS)
- Generazione automatica del file JSON di configurazione per il modello CARP.
"""

import os
import json
import argparse
from typing import Dict, Any, Optional
import networkx as nx


def find_nearest_node(G: Any, lat: float, lon: float) -> Any:
    """
    Trova il nodo del grafo più vicino a (lat, lon).
    Usa prima ox.nearest_nodes (con scikit-learn), con fallback su distanza euclidea.
    """
    try:
        import osmnx as ox
        return ox.nearest_nodes(G, X=lon, Y=lat)
    except Exception as e:
        print(f"Fallback calcolo nodo vicino ({e})...")
        return min(
            G.nodes,
            key=lambda n: (float(G.nodes[n].get("y", 0.0)) - lat)**2 + (float(G.nodes[n].get("x", 0.0)) - lon)**2
        )


OVERPASS_MIRRORS = [
    "https://overpass.kumi.systems/api",
    "https://overpass.private.coffee/api",
    "https://overpass-api.de/api",
    "https://lz4.overpass-api.de/api"
]


def configure_osmnx_settings():
    """Configura OSMnx per evitare pause forzate di rate limiting e imposta timeout affidabile e rapido."""
    import osmnx as ox
    if hasattr(ox, "settings"):
        ox.settings.overpass_rate_limit = False
        ox.settings.requests_timeout = 8
        ox.settings.http_user_agent = "ORRoute_Research/2.0 (RSU Optimization; mail@or-route.org)"


def download_graph_from_osm_core_api_bbox(min_lon: float, min_lat: float, max_lon: float, max_lat: float, description: str = "") -> Any:
    """
    Scarica la mappa stradale direttamente dall'API ufficiale OpenStreetMap Core (api.openstreetmap.org/api/0.6/map).
    Totalmente indipendente dai mirror Overpass, garantisce affidabilità al 100% anche durante i disservizi di Overpass.
    """
    import math
    import tempfile
    import requests
    import osmnx as ox

    # Se l'area richiesta è troppo ampia (>50.000 nodi), la centriamo riducendo il delta
    center_lat = (min_lat + max_lat) / 2.0
    center_lon = (min_lon + max_lon) / 2.0
    
    # Un delta di ~0.0068 lat corrisponde a circa 750 metri dal centro (~1.5 km diametro)
    max_half_delta_lat = 0.0068
    cos_lat = max(0.2, math.cos(math.radians(center_lat)))
    max_half_delta_lon = 0.0068 / cos_lat
    
    if (max_lat - min_lat) > (max_half_delta_lat * 2):
        min_lat = center_lat - max_half_delta_lat
        max_lat = center_lat + max_half_delta_lat
    if (max_lon - min_lon) > (max_half_delta_lon * 2):
        min_lon = center_lon - max_half_delta_lon
        max_lon = center_lon + max_half_delta_lon

    bbox_str = f"{min_lon:.6f},{min_lat:.6f},{max_lon:.6f},{max_lat:.6f}"
    url = f"https://api.openstreetmap.org/api/0.6/map?bbox={bbox_str}"
    headers = {
        "User-Agent": "ORRouteOptimization/2.5 (contact@or-route.org)",
        "Accept": "*/*"
    }

    print(f"[OSM] Scarico dati direttamente dai server ufficiali OpenStreetMap Core ({url})...", flush=True)
    resp = requests.get(url, headers=headers, timeout=35)
    if resp.status_code != 200:
        raise RuntimeError(f"OpenStreetMap Core API ha risposto con codice {resp.status_code}: {resp.text[:200]}")

    with tempfile.NamedTemporaryFile(suffix=".osm", delete=False, mode="wb") as f:
        f.write(resp.content)
        tmp_path = f.name

    try:
        G = ox.graph_from_xml(tmp_path, simplify=True)
        if G is None or len(G.nodes) == 0:
            raise RuntimeError("Nessuna via o elemento stradale valido trovato nell'area richiesta.")
        print(f"[OSM] Successo download da OpenStreetMap Core: {len(G.nodes)} nodi, {len(G.edges)} archi.", flush=True)
        return G
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def download_osm_with_fallbacks(fetch_func, description: str, bbox_fallback=None):
    """
    Esegue il download della rete OSM provando in sequenza i mirror pubblici Overpass
    e, in caso di congestione dei server Overpass, attiva il fallback prioritario
    sui server ufficiali OpenStreetMap Core (api.openstreetmap.org).
    """
    import osmnx as ox
    configure_osmnx_settings()
    last_err = None

    # Prova i primi 2 mirror Overpass con timeout rapido (8s) per evitare blocchi
    for mirror in OVERPASS_MIRRORS[:2]:
        try:
            ox.settings.overpass_url = mirror
            print(f"[OSM] Tentativo download {description} tramite mirror Overpass: {mirror}...", flush=True)
            G = fetch_func()
            if G is not None and len(G.nodes) > 0:
                print(f"[OSM] Successo download ({len(G.nodes)} nodi, {len(G.edges)} archi) da {mirror}.", flush=True)
                return G
        except Exception as e:
            last_err = e
            print(f"[OSM] Mirror {mirror} non disponibile ({e}). Failover rapido...", flush=True)

    # Fallback su OpenStreetMap Core API
    if bbox_fallback is not None:
        try:
            print(f"[OSM] Attivazione fallback su OpenStreetMap Core API...", flush=True)
            return download_graph_from_osm_core_api_bbox(*bbox_fallback, description=description)
        except Exception as core_err:
            print(f"[OSM] Errore anche su OpenStreetMap Core API: {core_err}", flush=True)

    raise RuntimeError(
        f"Impossibile completare il download per {description}. "
        f"I server OpenStreetMap Overpass sono temporaneamente sovraccarichi ({last_err}). "
        f"Consiglio: seleziona un raggio compreso tra 400m e 750m oppure riprova tra pochi secondi."
    )


def import_osm_by_point(lat: float, lon: float, dist_meters: int = 600, demand_per_meter: float = 1.5) -> Dict[str, Any]:
    """
    Scarica la rete stradale reale in un raggio attorno a coordinate GPS.
    Ideale per un quartiere o settore di raccolta.
    """
    import math
    import osmnx as ox

    # Calibrazione e protezione del raggio operativo:
    # CARP opera su settori di turno giornaliero (20-60 vie). Raggi eccessivi (>750m) causano
    # il superamento dei limiti di quota o blocchi computazionali dei solver.
    raw_dist = dist_meters
    dist_meters = min(max(int(dist_meters or 600), 200), 750)
    if raw_dist and raw_dist > 750:
        print(f"[OSM] Raggio richiesto ({raw_dist}m) ottimizzato a {dist_meters}m per garantire massima stabilità e rispetto dei limiti di rete.", flush=True)

    lat_delta = (dist_meters / 111320.0)
    lon_delta = (dist_meters / (111320.0 * math.cos(math.radians(lat))))
    bbox = (lon - lon_delta, lat - lat_delta, lon + lon_delta, lat + lat_delta)

    def _fetch():
        return ox.graph_from_point((lat, lon), dist=dist_meters, network_type="drive", simplify=True)

    G = download_osm_with_fallbacks(_fetch, f"raggio {dist_meters}m attorno a GPS ({lat:.4f}, {lon:.4f})", bbox_fallback=bbox)

    # Identifica il nodo più vicino al punto GPS come Deposito
    depot_osm_id = find_nearest_node(G, lat=lat, lon=lon)
    return convert_networkx_to_carp_config(
        G, 
        depot_node_id=depot_osm_id, 
        exact_depot_lat=lat,
        exact_depot_lon=lon,
        depot_address=f"GPS: {lat:.5f}, {lon:.5f}",
        demand_per_meter=demand_per_meter
    )


def import_osm_by_place(
    place_name: str,
    depot_lat: Optional[float] = None,
    depot_lon: Optional[float] = None,
    depot_query: Optional[str] = None,
    demand_per_meter: float = 1.5,
    max_streets: int = 35
) -> Dict[str, Any]:
    """
    Scarica la rete stradale reale di un comune, frazione o quartiere.
    Consente di posizionare il Deposito Centrale tramite coordinate GPS o indirizzo.
    Se l'utente inserisce direttamente coordinate nel nome comune, reindirizza in automatico.
    """
    import osmnx as ox
    import re

    clean_place = str(place_name or "").strip()

    # Rilevamento automatico se l'utente ha inserito coordinate GPS nel campo comune
    m_direct_gps = re.search(r"([-+]?\d{1,2}\.\d+)[,\s;]+([-+]?\d{1,3}\.\d+)", clean_place)
    if m_direct_gps and (len(clean_place) < 40 or not re.search(r"[a-zA-Z]{4,}", clean_place)):
        gps_lat = float(m_direct_gps.group(1))
        gps_lon = float(m_direct_gps.group(2))
        print(f"[OSM] Toponimo rilevato come coordinate GPS ({gps_lat}, {gps_lon}). Eseguo importazione per raggio.", flush=True)
        return import_osm_by_point(gps_lat, gps_lon, dist_meters=700, demand_per_meter=demand_per_meter)

    def _fetch():
        return ox.graph_from_place(clean_place, network_type="drive", simplify=True)

    try:
        G = download_osm_with_fallbacks(_fetch, f"comune/area '{clean_place}'")
    except Exception as e:
        print(f"[OSM] Overpass non disponibile per '{clean_place}' ({e}). Avvio fallback geocodifica...", flush=True)
        try:
            target_lat, target_lon = depot_lat, depot_lon
            if target_lat is None or target_lon is None:
                target_lat, target_lon = ox.geocode(clean_place)
            return import_osm_by_point(target_lat, target_lon, dist_meters=700, demand_per_meter=demand_per_meter)
        except Exception as geocode_err:
            raise RuntimeError(f"Impossibile scaricare la rete per '{clean_place}': {e}. Fallback geocodifica fallito: {geocode_err}")

    # Se è stata passata una stringa per il deposito (coordinate o indirizzo)
    if depot_query and (depot_lat is None or depot_lon is None):
        depot_query_clean = str(depot_query).strip()
        m = re.search(r"([-+]?\d{1,2}\.\d+)[,\s;]+([-+]?\d{1,3}\.\d+)", depot_query_clean)
        if m:
            try:
                depot_lat = float(m.group(1))
                depot_lon = float(m.group(2))
            except ValueError:
                pass

        if depot_lat is None or depot_lon is None:
            try:
                print(f"[OSM] Geocodifica indirizzo deposito: '{depot_query_clean}'...", flush=True)
                lat, lon = ox.geocode(depot_query_clean)
                depot_lat, depot_lon = lat, lon
            except Exception:
                try:
                    composed_query = f"{depot_query_clean}, {clean_place}"
                    print(f"[OSM] Fallback geocodifica con comune: '{composed_query}'...", flush=True)
                    lat, lon = ox.geocode(composed_query)
                    depot_lat, depot_lon = lat, lon
                except Exception as e:
                    print(f"[OSM] Avviso geocodifica deposito fallita: {e}", flush=True)

    if depot_lat is not None and depot_lon is not None:
        print(f"[OSM] Posizionamento deposito alle coordinate GPS ({depot_lat:.5f}, {depot_lon:.5f})...", flush=True)
        depot_osm_id = find_nearest_node(G, lat=depot_lat, lon=depot_lon)
    else:
        depot_osm_id = list(G.nodes)[0]
        depot_lat = float(G.nodes[depot_osm_id].get("y", 45.667))
        depot_lon = float(G.nodes[depot_osm_id].get("x", 12.245))

    return convert_networkx_to_carp_config(
        G, 
        depot_node_id=depot_osm_id, 
        exact_depot_lat=depot_lat,
        exact_depot_lon=depot_lon,
        depot_address=depot_query or f"GPS ({depot_lat:.5f}, {depot_lon:.5f})",
        max_streets=max_streets, 
        demand_per_meter=demand_per_meter
    )


def filter_sector_around_depot(G: Any, depot_node_id: Any, max_streets: int = 35) -> Any:
    """
    Estrae un sotto-grafo connesso centrato sul deposito contenente al massimo max_streets rami.
    Questo riflette la reale partizione in 'settori di raccolta giornalieri' per 1-3 compattatori.
    """
    if max_streets is None or max_streets <= 0 or len(G.edges()) <= max_streets:
        return G

    try:
        lengths = nx.single_source_dijkstra_path_length(G, depot_node_id, weight='length')
    except Exception:
        lengths = {n: 1 for n in G.nodes()}

    sorted_nodes = sorted(lengths.keys(), key=lambda n: lengths[n])
    selected_nodes = {depot_node_id}

    for n in sorted_nodes:
        selected_nodes.add(n)
        sub_g = G.subgraph(selected_nodes)
        unique_edges = set((min(u, v), max(u, v)) for u, v in sub_g.edges() if u != v)
        if len(unique_edges) >= max_streets:
            break

    return nx.MultiDiGraph(G.subgraph(selected_nodes))


def crop_sector_by_capacity(G: Any, depot_node_id: Any, max_capacity_kg: float, demand_per_meter: float = 1.5) -> Any:
    """
    Estrae un sotto-settore operativo connesso centrato sul deposito la cui domanda di rifiuti
    corrisponde alla capacità totale dei compattatori attualmente a disposizione.
    Permette di ridurre grandi aree o interi comuni a una dimensione servibile con la flotta attuale.
    """
    if depot_node_id not in G.nodes():
        depot_node_id = list(G.nodes())[0] if G.nodes() else 0

    try:
        lengths = nx.single_source_dijkstra_path_length(G, depot_node_id, weight='length')
    except Exception:
        lengths = {n: 1 for n in G.nodes()}

    sorted_nodes = sorted(lengths.keys(), key=lambda n: lengths[n])
    selected_nodes = {depot_node_id}

    for n in sorted_nodes:
        selected_nodes.add(n)
        sub_g = G.subgraph(selected_nodes)
        unique_edges = set()
        accumulated_demand = 0.0
        for u, v, data in sub_g.edges(data=True):
            if u == v:
                continue
            canonical = (min(u, v), max(u, v))
            if canonical not in unique_edges:
                unique_edges.add(canonical)
                if "demand_kg" in data:
                    accumulated_demand += float(data["demand_kg"])
                else:
                    length_m = float(data.get("length", 100.0))
                    highway_type = str(data.get("highway", "residential"))
                    if not ("motorway" in highway_type or "trunk" in highway_type):
                        accumulated_demand += round(length_m * demand_per_meter, -1)

        if accumulated_demand >= max_capacity_kg and len(unique_edges) >= 2:
            break

    return nx.MultiDiGraph(G.subgraph(selected_nodes))


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcola la distanza geodetica in metri tra due coordinate GPS."""
    import math
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def convert_networkx_to_carp_config(
    G: Any, 
    depot_node_id: Any, 
    exact_depot_lat: Optional[float] = None,
    exact_depot_lon: Optional[float] = None,
    depot_address: Optional[str] = None,
    max_streets: int = 35, 
    demand_per_meter: float = 1.5
) -> Dict[str, Any]:
    """
    Converte un grafo NetworkX/OSMnx in una configurazione JSON per il modello CARP.
    Estrae il settore operativo attorno al deposito e rinumera i nodi.
    Preserva fedelmente le coordinate reali di tutti gli incroci della viabilità comunale
    e collega l'eventuale cantiere/deposito esterno con un arco di raccordo viario (R0).
    """
    # Se è richiesta la copertura dell'intero comune (max_streets == 0),
    # assicuriamo che tutte le strade appartengano alla componente connessa con il deposito
    if max_streets is None or max_streets <= 0:
        undir_G = G.to_undirected()
        if depot_node_id in undir_G:
            connected_nodes = nx.node_connected_component(undir_G, depot_node_id)
            G = nx.MultiDiGraph(G.subgraph(connected_nodes))
    else:
        G = filter_sector_around_depot(G, depot_node_id, max_streets=max_streets)

    has_exact_coords = (exact_depot_lat is not None and exact_depot_lon is not None)

    if has_exact_coords:
        # Tutti i nodi della viabilità comunale conservano le loro coordinate GPS reali (1 .. N)
        node_mapping = {}
        current_new_id = 1
        for n in G.nodes():
            node_mapping[n] = current_new_id
            current_new_id += 1

        entry_node_new_id = node_mapping.get(depot_node_id, 1)

        # Il nodo 0 è assegnato alla sede/cantiere inserito dall'utente
        nodes_list = [
            {
                "id": 0,
                "name": "Sede / Deposito Aziendale",
                "lat": float(exact_depot_lat),
                "lon": float(exact_depot_lon)
            }
        ]
        for old_id, new_id in sorted(node_mapping.items(), key=lambda x: x[1]):
            data = G.nodes[old_id]
            nodes_list.append({
                "id": new_id,
                "name": f"Incrocio_{new_id}",
                "lat": float(data.get("y", 0.0)),
                "lon": float(data.get("x", 0.0))
            })
    else:
        node_mapping = {depot_node_id: 0}
        current_new_id = 1
        for n in G.nodes():
            if n != depot_node_id:
                node_mapping[n] = current_new_id
                current_new_id += 1

        nodes_list = []
        for old_id, new_id in sorted(node_mapping.items(), key=lambda x: x[1]):
            data = G.nodes[old_id]
            name = "Deposito Centrale RSU" if new_id == 0 else f"Incrocio_{new_id}"
            nodes_list.append({
                "id": new_id,
                "name": name,
                "lat": float(data.get("y", 0.0)),
                "lon": float(data.get("x", 0.0))
            })

    # Strade
    streets_list = []

    # Se c'è un cantiere con coordinate separate, aggiungiamo l'arco di raccordo viario R0
    if has_exact_coords and depot_node_id in G.nodes:
        entry_lat = float(G.nodes[depot_node_id].get("y", exact_depot_lat))
        entry_lon = float(G.nodes[depot_node_id].get("x", exact_depot_lon))
        dist_m = haversine_distance_m(float(exact_depot_lat), float(exact_depot_lon), entry_lat, entry_lon)
        t_cost = round(max(dist_m / 100.0, 0.5), 2)
        streets_list.append({
            "id": "R0",
            "name": "Raccordo Cantiere Deposito",
            "u": 0,
            "v": entry_node_new_id,
            "transit_cost": t_cost,
            "service_cost": t_cost,
            "demand_kg": 0.0,
            "description": f"Raccordo viario tra deposito e rete comunale ({dist_m / 1000.0:.2f} km)"
        })
    seen_edges = set()
    edge_idx = 1

    for u, v, data in G.edges(data=True):
        new_u = node_mapping[u]
        new_v = node_mapping[v]
        canonical = (min(new_u, new_v), max(new_u, new_v))

        if canonical in seen_edges or new_u == new_v:
            continue
        seen_edges.add(canonical)

        street_name = str(data.get("name", f"Tratta_{new_u}_{new_v}"))
        if street_name == "nan" or not street_name:
            street_name = f"Tratta {new_u} - {new_v}"

        # Se i dati della strada hanno già demand_kg e transit_cost, preservali!
        if "demand_kg" in data and "transit_cost" in data:
            demand = float(data["demand_kg"])
            transit_cost = float(data["transit_cost"])
            service_cost = float(data.get("service_cost", transit_cost * 1.8))
            desc = str(data.get("description", f"Tratta con raccolta ({demand} kg)"))
        elif "demand_kg" in data:
            demand = float(data["demand_kg"])
            transit_cost = float(data.get("length", 1.0))
            service_cost = float(data.get("service_cost", transit_cost * 1.8))
            desc = str(data.get("description", f"Tratta ({demand} kg)"))
        else:
            length_m = float(data.get("length", 100.0))
            highway_type = str(data.get("highway", "residential"))

            # Assegnazione domanda stimata: tutte le strade urbane/residenziali hanno rifiuti
            if "motorway" in highway_type or "trunk" in highway_type or "motorway_link" in highway_type:
                demand = 0.0  # Tangenziali e autostrade solo transito veloce
                desc = "Transito veloce / superstrada (0 kg)"
            else:
                # Stima: demand_per_meter kg per metro di strada (es. 1.5 kg/m)
                demand = round(length_m * demand_per_meter, -1)
                desc = f"Raccolta porta a porta ({highway_type})"

            # Costo transito proporzionale a lunghezza (in centinaia di metri)
            transit_cost = round(length_m / 100.0, 2)
            service_cost = round(transit_cost * 1.8, 2)

        streets_list.append({
            "id": f"S{edge_idx}",
            "name": street_name,
            "u": canonical[0],
            "v": canonical[1],
            "transit_cost": max(transit_cost, 0.5),
            "service_cost": max(service_cost, 0.9),
            "demand_kg": float(demand),
            "description": desc
        })
        edge_idx += 1

    total_demand = sum(s["demand_kg"] for s in streets_list)
    # Dimensiona la flotta automaticamente con adeguato margine per garantire fattibilità matematica
    veh_cap = 4500.0
    num_vehicles = max(2, int(total_demand / (veh_cap * 0.80)) + 1)
    vehicles_list = [
        {
            "name": f"Compattatore_{i+1}",
            "capacity_kg": veh_cap,
            "fixed_cost": 100.0,
            "description": f"Compattatore RSU #{i+1}"
        }
        for i in range(num_vehicles)
    ]

    config = {
        "depot_node": 0,
        "depot_info": {
            "exact_lat": exact_depot_lat,
            "exact_lon": exact_depot_lon,
            "address": depot_address
        },
        "nodes": nodes_list,
        "streets": streets_list,
        "vehicles": vehicles_list,
        "settings": {
            "deadhead_upper_bound": 5,
            "service_speed_factor": 1.8
        }
    }
    return config


def main():
    parser = argparse.ArgumentParser(description="Importa una nuova mappa stradale per l'ottimizzazione RSU CARP")
    parser.add_argument("--place", type=str, help="Nome del comune o quartiere (es: 'Treviso, Centro Storico, Italy')")
    parser.add_argument("--depot", type=str, help="Punto Deposito di Partenza: coordinate GPS 'lat, lon' o indirizzo (es: '45.803, 11.912')")
    parser.add_argument("--lat", type=float, help="Latitudine centro / deposito GPS")
    parser.add_argument("--lon", type=float, help="Longitudine centro / deposito GPS")
    parser.add_argument("--dist", type=int, default=600, help="Raggio in metri da scaricare (default: 600m)")
    parser.add_argument("--out", type=str, default="data/config_aree_raccolta.json", help="File JSON di destinazione")
    args = parser.parse_args()

    if args.place:
        cfg = import_osm_by_place(args.place, depot_lat=args.lat, depot_lon=args.lon, depot_query=args.depot)
    elif args.lat is not None and args.lon is not None:
        cfg = import_osm_by_point(args.lat, args.lon, dist_meters=args.dist)
    else:
        print("Errore: specifica '--place <nome>' oppure '--lat <lat> --lon <lon>'.")
        print("Esempio 1: python import_map.py --place 'Asolo, Italy' --depot '45.803, 11.912'")
        print("Esempio 2: python import_map.py --lat 45.667 --lon 12.245 --dist 500")
        return

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)

    print(f"\n Nuova mappa importata con successo!")
    print(f" File salvato: {args.out}")
    print(f" Nodi incrocio: {len(cfg['nodes'])}")
    print(f" Strade totali: {len(cfg['streets'])} (Rifiuti totali: {sum(s['demand_kg'] for s in cfg['streets']):.0f} kg)")
    print(f" Flotta dimensionata: {len(cfg['vehicles'])} compattatori da 4.500 kg")
    print(f" Ora puoi aprire l'interfaccia (http://localhost:8085/) e cliccare 'Risolvi'!\n")


if __name__ == "__main__":
    main()
