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


def fetch_road_corridor_osrm(lat1: float, lon1: float, lat2: float, lon2: float) -> tuple[float, list[list[float]]]:
    """
    Interroga il servizio OSRM per calcolare il vero tratto stradale carrabile
    tra due coordinate GPS (es. dal Cantiere Deposito alla prima via del comune),
    restituendo la distanza stradale effettiva in metri e le coordinate [lat, lon]
    di tutte le curve e gli svincoli stradali reali.
    In caso di indisponibilità di rete, esegue un fallback con interpolazione geodetica.
    """
    import urllib.request
    import json

    d_euc = haversine_distance_m(lat1, lon1, lat2, lon2)
    if d_euc < 15.0:
        return d_euc, [[lat1, lon1], [lat2, lon2]]

    url = f"https://router.project-osrm.org/route/v1/driving/{lon1:.6f},{lat1:.6f};{lon2:.6f},{lat2:.6f}?overview=full&geometries=geojson"
    headers = {
        "User-Agent": "ORRouteOptimization/2.5 (contact@or-route.org)",
        "Accept": "application/json"
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=7) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                routes = data.get("routes", [])
                if routes and len(routes) > 0:
                    route = routes[0]
                    dist_m = float(route.get("distance", d_euc))
                    geom = route.get("geometry", {})
                    raw_coords = geom.get("coordinates", [])
                    if raw_coords and len(raw_coords) >= 2:
                        # GeoJSON coordinates are [lon, lat], convert to [lat, lon]
                        lat_lon_list = [[round(float(pt[1]), 6), round(float(pt[0]), 6)] for pt in raw_coords]
                        print(f"[OSM CORRIDOIO] Tratto stradale cantiere trovato con successo: {dist_m/1000.0:.2f} km ({len(lat_lon_list)} punti viari)", flush=True)
                        return dist_m, lat_lon_list
    except Exception as err:
        print(f"[OSM CORRIDOIO] Avviso OSRM ({err}). Attivazione interpolazione geodetica...", flush=True)

    # Fallback con segmenti intermedi
    steps = max(2, min(25, int(d_euc / 200.0)))
    lat_lon_list = [
        [round(lat1 + (lat2 - lat1) * (i / steps), 6), round(lon1 + (lon2 - lon1) * (i / steps), 6)]
        for i in range(steps + 1)
    ]
    return d_euc, lat_lon_list


def parse_places_input(place_input: str) -> list[str]:
    """
    Estrae una lista di comuni/zone dall'input utente.
    Supporta:
    - Più toponimi separati da ';' o nuove linee (es. 'Conegliano, Italy; Susegana, Italy')
    - Più toponimi separati da virgola o '+'
    - Normalizza automaticamente aggiungendo ', Italy' per i toponimi senza nazione specificata.
    """
    import re
    if not place_input:
        return ["Conegliano, Italy"]

    raw = str(place_input).strip()

    if ";" in raw or "\n" in raw:
        tokens = [p.strip() for p in re.split(r"[;\n]+", raw) if p.strip()]
    elif "+" in raw:
        tokens = [p.strip() for p in raw.split("+") if p.strip()]
    elif re.search(r"\b(e|and|und)\b", raw, re.IGNORECASE) and not re.search(r",\s*Italy", raw, re.IGNORECASE):
        tokens = [p.strip() for p in re.split(r"\b(?:e|and|und)\b", raw, flags=re.IGNORECASE) if p.strip()]
    elif "," in raw:
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        has_country = any(p.lower() in ("italy", "italia", "france", "germany", "spain", "switzerland", "austria") for p in parts)
        if has_country:
            reconstructed = []
            cur = ""
            for p in parts:
                if p.lower() in ("italy", "italia", "france", "germany", "spain", "switzerland", "austria"):
                    if cur:
                        reconstructed.append(f"{cur}, {p}")
                        cur = ""
                    else:
                        reconstructed.append(p)
                else:
                    if cur:
                        reconstructed.append(cur)
                    cur = p
            if cur:
                reconstructed.append(cur)
            tokens = reconstructed if len(reconstructed) > 1 else [raw]
        else:
            tokens = parts
    else:
        tokens = [raw]

    clean_places = []
    for t in tokens:
        t_clean = t.strip()
        if not t_clean:
            continue
        if "," not in t_clean and not any(k in t_clean.lower() for k in ("italy", "italia")):
            t_clean = f"{t_clean}, Italy"
        clean_places.append(t_clean)

    return clean_places if clean_places else [raw]


OVERPASS_MIRRORS = [
    "https://overpass.kumi.systems/api",
    "https://overpass.private.coffee/api",
    "https://overpass-api.de/api",
    "https://lz4.overpass-api.de/api"
]

DRIVABLE_HIGHWAYS = {
    "residential", "tertiary", "secondary", "primary", "unclassified",
    "living_street", "trunk", "primary_link", "secondary_link",
    "tertiary_link", "trunk_link", "road"
}


def _clean_osm_str(val: Any, default: str = "") -> str:
    """Normalizza attributi OSMnx che possono essere liste, None o 'nan'."""
    if val is None:
        return default
    if isinstance(val, (list, tuple, set)):
        items = [str(x).strip() for x in val if x is not None and str(x).strip() not in ("", "nan", "None")]
        return " / ".join(dict.fromkeys(items)) if items else default
    s = str(val).strip()
    if s in ("", "nan", "None"):
        return default
    return s


def configure_osmnx_settings():
    """Configura OSMnx per evitare pause forzate di rate limiting e imposta timeout affidabile e rapido."""
    import osmnx as ox
    if hasattr(ox, "settings"):
        ox.settings.overpass_rate_limit = False
        ox.settings.requests_timeout = 6
        ox.settings.http_user_agent = "ORRoute_Research/2.5 (RSU Optimization; mail@or-route.org)"


def geocode_urban_center(place_name: str) -> tuple[float, float]:
    """
    Geocodifica il centro urbano effettivo di un comune o località tramite Nominatim,
    preferendo il nodo cittadino (class='place', type='town'/'city'/'village'/'municipality')
    rispetto al centroide geometrico del confine amministrativo rurale.
    """
    import requests
    import osmnx as ox

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": place_name, "format": "json", "limit": 6},
            headers={"User-Agent": "ORRoute_Research/2.5 (RSU Optimization)"},
            timeout=10
        )
        if resp.status_code == 200:
            results = resp.json()
            if isinstance(results, list) and results:
                for r in results:
                    r_class = str(r.get("class", "")).lower()
                    r_type = str(r.get("type", "")).lower()
                    if r_class == "place" or r_type in ("town", "city", "village", "municipality", "suburb", "quarter", "hamlet"):
                        return float(r["lat"]), float(r["lon"])
                return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass

    lat, lon = ox.geocode(place_name)
    return float(lat), float(lon)


def download_graph_from_osm_core_api_bbox(min_lon: float, min_lat: float, max_lon: float, max_lat: float, description: str = "") -> Any:
    """
    Scarica la mappa stradale direttamente dall'API ufficiale OpenStreetMap Core (api.openstreetmap.org/api/0.6/map).
    Filtra l'XML nativo per estrarre esclusivamente la viabilità urbana carrabile (escludendo edifici, marciapiedi,
    sentieri e accessi privati) prima della semplificazione topologica OSMnx.
    """
    import math
    import tempfile
    import xml.etree.ElementTree as ET
    import requests
    import osmnx as ox

    # Se l'area richiesta è troppo ampia (>50.000 nodi), la centriamo riducendo il delta
    center_lat = (min_lat + max_lat) / 2.0
    center_lon = (min_lon + max_lon) / 2.0

    # Un delta di ~0.0072 lat corrisponde a circa 800 metri dal centro (~1.6 km diametro)
    max_half_delta_lat = 0.0072
    cos_lat = max(0.2, math.cos(math.radians(center_lat)))
    max_half_delta_lon = 0.0072 / cos_lat

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

    # Pre-filtraggio XML: manteniamo solo le way stradali carrabili pubbliche e i relativi nodi
    try:
        root = ET.fromstring(resp.content)
        valid_node_refs = set()
        for elem in list(root):
            if elem.tag == "way":
                tags = {t.attrib.get("k"): t.attrib.get("v") for t in elem.findall("tag")}
                hw = tags.get("highway", "")
                area = tags.get("area", "no")
                access = tags.get("access", "yes")
                if hw not in DRIVABLE_HIGHWAYS or area == "yes" or access in ("private", "no"):
                    root.remove(elem)
                else:
                    for nd in elem.findall("nd"):
                        valid_node_refs.add(nd.attrib.get("ref"))
            elif elem.tag == "relation":
                root.remove(elem)

        for elem in list(root):
            if elem.tag == "node" and elem.attrib.get("id") not in valid_node_refs:
                root.remove(elem)

        xml_bytes = ET.tostring(root, encoding="utf-8")
    except Exception as xml_err:
        print(f"[OSM] Avviso pre-filtraggio XML ({xml_err}), uso contenuto originale...", flush=True)
        xml_bytes = resp.content

    with tempfile.NamedTemporaryFile(suffix=".osm", delete=False, mode="wb") as f:
        f.write(xml_bytes)
        tmp_path = f.name

    try:
        G = ox.graph_from_xml(tmp_path, simplify=True)
        if G is None or len(G.nodes) == 0:
            raise RuntimeError("Nessuna via o elemento stradale valido trovato nell'area richiesta.")

        # Seleziona la componente connessa principale per evitare frammenti isolati ai bordi del bbox
        undir_G = G.to_undirected()
        if len(undir_G.nodes) > 0:
            largest_cc = max(nx.connected_components(undir_G), key=len)
            G = nx.MultiDiGraph(G.subgraph(largest_cc))

        print(f"[OSM] Successo download da OpenStreetMap Core: {len(G.nodes)} incroci carrabili, {len(G.edges)} archi stradali.", flush=True)
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

    # Prova i primi 2 mirror Overpass con timeout rapido per evitare blocchi
    for mirror in OVERPASS_MIRRORS[:2]:
        try:
            ox.settings.overpass_url = mirror
            print(f"[OSM] Tentativo download {description} tramite mirror Overpass: {mirror}...", flush=True)
            G = fetch_func()
            if G is not None and len(G.nodes) > 0:
                # Filtra eventuali highway=service residue per uniformità con lo stradario urbano di raccolta
                edges_to_drop = [
                    (u, v, k) for u, v, k, d in G.edges(keys=True, data=True)
                    if _clean_osm_str(d.get("highway", "")).lower() in ("service", "footway", "cycleway", "steps", "path", "track", "pedestrian")
                ]
                if edges_to_drop and len(edges_to_drop) < len(G.edges):
                    G = G.copy()
                    G.remove_edges_from(edges_to_drop)
                    undir_G = G.to_undirected()
                    if len(undir_G.nodes) > 0:
                        largest_cc = max(nx.connected_components(undir_G), key=len)
                        G = nx.MultiDiGraph(G.subgraph(largest_cc))
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


def import_osm_by_point(
    lat: float,
    lon: float,
    dist_meters: int = 600,
    demand_per_meter: float = 1.5,
    max_streets: int = 35,
    depot_address: Optional[str] = None
) -> Dict[str, Any]:
    """
    Scarica la rete stradale reale in un raggio attorno a coordinate GPS.
    Ideale per un quartiere o settore di raccolta.
    """
    import math
    import osmnx as ox

    raw_dist = dist_meters
    dist_meters = min(max(int(dist_meters or 600), 200), 800)
    if raw_dist and raw_dist > 800:
        print(f"[OSM] Raggio richiesto ({raw_dist}m) ottimizzato a {dist_meters}m per garantire massima stabilità e rispetto dei limiti di rete.", flush=True)

    lat_delta = (dist_meters / 111320.0)
    lon_delta = (dist_meters / (111320.0 * max(0.2, math.cos(math.radians(lat)))))
    bbox = (lon - lon_delta, lat - lat_delta, lon + lon_delta, lat + lat_delta)

    def _fetch():
        return ox.graph_from_point(
            (lat, lon),
            dist=dist_meters,
            network_type="drive",
            simplify=True
        )

    G = download_osm_with_fallbacks(_fetch, f"raggio {dist_meters}m attorno a GPS ({lat:.4f}, {lon:.4f})", bbox_fallback=bbox)

    # Identifica il nodo più vicino al punto GPS come Deposito
    depot_osm_id = find_nearest_node(G, lat=lat, lon=lon)
    return convert_networkx_to_carp_config(
        G,
        depot_node_id=depot_osm_id,
        exact_depot_lat=lat,
        exact_depot_lon=lon,
        depot_address=depot_address or f"GPS: {lat:.5f}, {lon:.5f}",
        max_streets=max_streets,
        demand_per_meter=demand_per_meter
    )


def import_osm_by_place(
    place_name: str = "Conegliano, Italy",
    depot_lat: Optional[float] = None,
    depot_lon: Optional[float] = None,
    depot_query: Optional[str] = "45.951391386254286, 12.312502178579223",
    demand_per_meter: float = 0.95,
    max_streets: int = 0
) -> Dict[str, Any]:
    """
    Scarica la rete stradale reale di uno o più comuni, frazioni o quartieri contemporaneamente.
    Supporta toponimi multipli separati da ';' o ',' (es. 'Conegliano, Italy; Susegana, Italy').
    Consente di posizionare il Deposito Centrale tramite coordinate GPS o indirizzo reale.
    Se l'utente inserisce direttamente coordinate nel nome comune, reindirizza in automatico.
    """
    import math
    import osmnx as ox
    import re

    clean_place = str(place_name or "").strip()

    # Rilevamento automatico se l'utente ha inserito coordinate GPS nel campo comune
    m_direct_gps = re.search(r"([-+]?\d{1,2}\.\d+)[,\s;]+([-+]?\d{1,3}\.\d+)", clean_place)
    if m_direct_gps and (len(clean_place) < 40 or not re.search(r"[a-zA-Z]{4,}", clean_place)):
        gps_lat = float(m_direct_gps.group(1))
        gps_lon = float(m_direct_gps.group(2))
        print(f"[OSM] Toponimo rilevato come coordinate GPS ({gps_lat}, {gps_lon}). Eseguo importazione per raggio.", flush=True)
        return import_osm_by_point(gps_lat, gps_lon, dist_meters=750, demand_per_meter=demand_per_meter, max_streets=max_streets)

    # 1. Geocodifica eventuale indirizzo o coordinate del deposito
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
                depot_lat, depot_lon = float(lat), float(lon)
            except Exception:
                try:
                    composed_query = f"{depot_query_clean}, {clean_place.split(';')[0].split(',')[0]}"
                    print(f"[OSM] Fallback geocodifica con comune: '{composed_query}'...", flush=True)
                    lat, lon = ox.geocode(composed_query)
                    depot_lat, depot_lon = float(lat), float(lon)
                except Exception as e:
                    print(f"[OSM] Avviso geocodifica deposito fallita: {e}", flush=True)

    # 2. Supporto Multi-Comune / Multi-Zona
    places_list = parse_places_input(clean_place)
    print(f"[OSM] Zone/Comuni rilevati ({len(places_list)}): {places_list}", flush=True)

    urban_lat, urban_lon = None, None
    urban_centers = []
    for p in places_list:
        try:
            ulat, ulon = geocode_urban_center(p)
            urban_centers.append((ulat, ulon))
            print(f"[OSM] Centro urbano identificato per '{p}': ({ulat:.5f}, {ulon:.5f})", flush=True)
        except Exception as geo_err:
            print(f"[OSM] Avviso geocodifica per '{p}': {geo_err}", flush=True)

    if urban_centers:
        urban_lat = sum(c[0] for c in urban_centers) / len(urban_centers)
        urban_lon = sum(c[1] for c in urban_centers) / len(urban_centers)

    ref_lat = urban_lat if urban_lat is not None else depot_lat
    ref_lon = urban_lon if urban_lon is not None else depot_lon
    bbox_fallback = None
    if urban_centers:
        min_u_lat = min(c[0] for c in urban_centers)
        max_u_lat = max(c[0] for c in urban_centers)
        min_u_lon = min(c[1] for c in urban_centers)
        max_u_lon = max(c[1] for c in urban_centers)
        dist_m = 1200
        lat_d = dist_m / 111320.0
        lon_d = dist_m / (111320.0 * max(0.2, math.cos(math.radians(ref_lat or 45.8))))
        bbox_fallback = (min_u_lon - lon_d, min_u_lat - lat_d, max_u_lon + lon_d, max_u_lat + lat_d)
    elif ref_lat is not None and ref_lon is not None:
        dist_m = 800
        lat_d = dist_m / 111320.0
        lon_d = dist_m / (111320.0 * max(0.2, math.cos(math.radians(ref_lat))))
        bbox_fallback = (ref_lon - lon_d, ref_lat - lat_d, ref_lon + lon_d, ref_lat + lat_d)

    place_query = places_list if len(places_list) > 1 else places_list[0]
    place_display_name = " + ".join([p.split(",")[0].strip() for p in places_list])

    def _fetch():
        if isinstance(place_query, list):
            return ox.graph_from_place(place_query, network_type="drive", simplify=True)
        return ox.graph_from_place(place_query, network_type="drive", simplify=True)

    G = download_osm_with_fallbacks(_fetch, f"comuni/aree '{place_display_name}'", bbox_fallback=bbox_fallback)

    # 3. Posizionamento deposito: usa coordinate utente, oppure centro urbano / baricentro della rete
    if depot_lat is not None and depot_lon is not None:
        print(f"[OSM] Posizionamento deposito alle coordinate GPS ({depot_lat:.5f}, {depot_lon:.5f})...", flush=True)
        depot_osm_id = find_nearest_node(G, lat=depot_lat, lon=depot_lon)
    elif urban_lat is not None and urban_lon is not None:
        depot_osm_id = find_nearest_node(G, lat=urban_lat, lon=urban_lon)
        depot_lat = float(G.nodes[depot_osm_id].get("y", urban_lat))
        depot_lon = float(G.nodes[depot_osm_id].get("x", urban_lon))
        print(f"[OSM] Deposito posizionato nel centro urbano di '{place_display_name}' ({depot_lat:.5f}, {depot_lon:.5f})...", flush=True)
    else:
        lats = [float(G.nodes[n].get("y", 45.886)) for n in G.nodes]
        lons = [float(G.nodes[n].get("x", 12.297)) for n in G.nodes]
        c_lat = sum(lats) / max(1, len(lats))
        c_lon = sum(lons) / max(1, len(lons))
        depot_osm_id = find_nearest_node(G, lat=c_lat, lon=c_lon)
        depot_lat = float(G.nodes[depot_osm_id].get("y", c_lat))
        depot_lon = float(G.nodes[depot_osm_id].get("x", c_lon))

    return convert_networkx_to_carp_config(
        G,
        depot_node_id=depot_osm_id,
        exact_depot_lat=depot_lat,
        exact_depot_lon=depot_lon,
        depot_address=depot_query or f"Centro Operativo {place_display_name} ({depot_lat:.5f}, {depot_lon:.5f})",
        max_streets=max_streets,
        demand_per_meter=demand_per_meter,
        place_name=place_display_name
    )


def filter_sector_around_depot(G: Any, depot_node_id: Any, max_streets: int = 35) -> Any:
    """
    Estrae un sotto-grafo connesso centrato sul deposito contenente al massimo max_streets rami.
    Questo riflette la reale partizione in 'settori di raccolta giornalieri' per 1-3 compattatori.
    Usa il grafo non orientato per il calcolo delle distanze radiali così che i sensi unici non isolino il deposito.
    """
    unique_total = set((min(u, v), max(u, v)) for u, v in G.edges() if u != v)
    if max_streets is None or max_streets <= 0 or len(unique_total) <= max_streets:
        return G

    undir_G = G.to_undirected()
    if depot_node_id not in undir_G:
        depot_node_id = list(G.nodes())[0]

    try:
        lengths = nx.single_source_dijkstra_path_length(undir_G, depot_node_id, weight="length")
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

    sub_multi = nx.MultiDiGraph(G.subgraph(selected_nodes))
    if G.graph.get("from_carp_config"):
        sub_multi.graph["from_carp_config"] = True
    return sub_multi


def crop_sector_by_capacity(G: Any, depot_node_id: Any, max_capacity_kg: float, demand_per_meter: float = 1.5) -> Any:
    """
    Estrae un sotto-settore operativo connesso centrato sul deposito la cui domanda di rifiuti
    corrisponde alla capacità totale dei compattatori attualmente a disposizione.
    Permette di ridurre grandi aree o interi comuni a una dimensione servibile con la flotta attuale.
    """
    if depot_node_id not in G.nodes():
        depot_node_id = list(G.nodes())[0] if G.nodes() else 0

    undir_G = G.to_undirected()
    try:
        lengths = nx.single_source_dijkstra_path_length(undir_G, depot_node_id, weight="length")
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
                    highway_type = _clean_osm_str(data.get("highway", "residential"), "residential")
                    if not ("motorway" in highway_type or "trunk" in highway_type):
                        accumulated_demand += max(10.0, round(length_m * demand_per_meter, -1))

        if accumulated_demand >= max_capacity_kg and len(unique_edges) >= 2:
            break

    sub_multi = nx.MultiDiGraph(G.subgraph(selected_nodes))
    if G.graph.get("from_carp_config"):
        sub_multi.graph["from_carp_config"] = True
    return sub_multi


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
    demand_per_meter: float = 1.5,
    place_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Converte un grafo NetworkX/OSMnx in una configurazione JSON per il modello CARP.
    Estrae il settore operativo attorno al deposito e rinumera i nodi.
    Preserva fedelmente le coordinate reali di tutti gli incroci della viabilità comunale
    e collega l'eventuale cantiere/deposito esterno con un arco di raccordo viario (R0).
    """
    is_already_carp_config = bool(G.graph.get("from_carp_config", False))

    if max_streets is None or max_streets <= 0:
        undir_G = G.to_undirected()
        if depot_node_id in undir_G:
            connected_nodes = nx.node_connected_component(undir_G, depot_node_id)
            sub_g = nx.MultiDiGraph(G.subgraph(connected_nodes))
            if is_already_carp_config:
                sub_g.graph["from_carp_config"] = True
            G = sub_g
    else:
        G = filter_sector_around_depot(G, depot_node_id, max_streets=max_streets)

    has_exact_coords = (exact_depot_lat is not None and exact_depot_lon is not None)

    # Verifica se il deposito coincide già con il nodo 0 di una configurazione CARP pre-esistente
    # oppure se le coordinate del deposito coincidono già (< 15 metri) con il nodo di innesto OSM
    need_separate_r0_node = False
    if has_exact_coords and not is_already_carp_config and depot_node_id in G.nodes:
        entry_lat = float(G.nodes[depot_node_id].get("y", exact_depot_lat))
        entry_lon = float(G.nodes[depot_node_id].get("x", exact_depot_lon))
        dist_m = haversine_distance_m(float(exact_depot_lat), float(exact_depot_lon), entry_lat, entry_lon)
        if dist_m >= 15.0:
            need_separate_r0_node = True

    if need_separate_r0_node:
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
            if new_id == 0:
                name = "Sede / Deposito Aziendale" if has_exact_coords else "Deposito Centrale RSU"
                lat_val = float(exact_depot_lat) if has_exact_coords else float(data.get("y", 0.0))
                lon_val = float(exact_depot_lon) if has_exact_coords else float(data.get("x", 0.0))
            else:
                name = f"Incrocio_{new_id}"
                lat_val = float(data.get("y", 0.0))
                lon_val = float(data.get("x", 0.0))
            nodes_list.append({
                "id": new_id,
                "name": name,
                "lat": lat_val,
                "lon": lon_val
            })

    # Strade
    streets_list = []
    corridor_coords = []

    # Se c'è un cantiere esterno (distanza >= 15m), calcoliamo l'effettivo tratto stradale viario R0
    if need_separate_r0_node and depot_node_id in G.nodes:
        entry_lat = float(G.nodes[depot_node_id].get("y", exact_depot_lat))
        entry_lon = float(G.nodes[depot_node_id].get("x", exact_depot_lon))
        corridor_dist_m, corridor_coords = fetch_road_corridor_osrm(
            float(exact_depot_lat), float(exact_depot_lon),
            entry_lat, entry_lon
        )
        t_cost = round(max(corridor_dist_m / 100.0, 0.5), 2)
        streets_list.append({
            "id": "R0",
            "name": "Raccordo Cantiere Deposito (Tratto Stradale)",
            "u": 0,
            "v": entry_node_new_id,
            "length_m": round(corridor_dist_m, 1),
            "transit_cost": t_cost,
            "service_cost": t_cost,
            "demand_kg": 0.0,
            "description": f"Tratto stradale effettivo tra Cantiere/Deposito e viabilità comunale ({corridor_dist_m / 1000.0:.2f} km)",
            "geometry": corridor_coords
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

        raw_id = _clean_osm_str(data.get("id", ""))
        street_name = _clean_osm_str(data.get("name"), f"Via Comunale ({canonical[0]}-{canonical[1]})")

        # Estrazione geometria curvilinea reale della tratta da OSMnx
        geom = data.get("geometry")
        edge_coords = []
        if geom is not None and hasattr(geom, "coords"):
            edge_coords = [[round(float(lat), 6), round(float(lon), 6)] for lon, lat in geom.coords]
        elif "geometry" in data and isinstance(data["geometry"], list) and len(data["geometry"]) >= 2:
            edge_coords = data["geometry"]
        else:
            u_data = G.nodes[u]
            v_data = G.nodes[v]
            edge_coords = [
                [round(float(u_data.get("y", 0.0)), 6), round(float(u_data.get("x", 0.0)), 6)],
                [round(float(v_data.get("y", 0.0)), 6), round(float(v_data.get("x", 0.0)), 6)]
            ]

        # Se i dati della strada hanno già demand_kg e transit_cost (es. da filtro settore), preservali!
        if "demand_kg" in data and "transit_cost" in data:
            demand = float(data["demand_kg"])
            transit_cost = float(data["transit_cost"])
            service_cost = float(data.get("service_cost", round(transit_cost * 1.8, 2)))
            length_m = float(data.get("length_m", round(transit_cost * 100.0, 1)))
            desc = _clean_osm_str(data.get("description"), f"Tratta con raccolta ({demand:.0f} kg)")
        elif "demand_kg" in data:
            demand = float(data["demand_kg"])
            transit_cost = float(data.get("length", 1.0))
            service_cost = float(data.get("service_cost", round(transit_cost * 1.8, 2)))
            length_m = float(data.get("length_m", round(transit_cost * 100.0, 1)))
            desc = _clean_osm_str(data.get("description"), f"Tratta ({demand:.0f} kg)")
        else:
            length_m = float(data.get("length", 100.0))
            highway_type = _clean_osm_str(data.get("highway", "residential"), "residential")

            # Assegnazione domanda stimata: tutte le strade urbane/residenziali hanno rifiuti
            if any(k in highway_type for k in ("motorway", "trunk", "motorway_link", "trunk_link")):
                demand = 0.0  # Tangenziali e superstrade solo transito veloce
                desc = "Transito veloce / superstrada (0 kg)"
            else:
                # Stima lineare: demand_per_meter kg per metro di strada (es. 1.5 kg/m), minimo 10 kg per tratto attivo
                raw_demand = round(length_m * demand_per_meter, -1)
                demand = max(10.0, raw_demand) if demand_per_meter > 0 else 0.0
                desc = f"Raccolta porta a porta ({highway_type}, {length_m:.0f}m)"

            # Costo transito proporzionale a lunghezza (in centinaia di metri)
            transit_cost = round(length_m / 100.0, 2)
            service_cost = round(transit_cost * 1.8, 2)

        if raw_id == "R0" or street_name.startswith("Raccordo Cantiere"):
            st_id = "R0"
        else:
            st_id = f"S{edge_idx}"
            edge_idx += 1

        streets_list.append({
            "id": st_id,
            "name": street_name,
            "u": canonical[0],
            "v": canonical[1],
            "length_m": round(length_m, 1),
            "transit_cost": max(transit_cost, 0.5),
            "service_cost": max(service_cost, 0.9 if demand > 0 else 0.5),
            "demand_kg": float(demand),
            "description": desc,
            "geometry": edge_coords
        })

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
        "place_name": place_name or "Conegliano, Italy",
        "depot_node": 0,
        "depot_info": {
            "exact_lat": exact_depot_lat,
            "exact_lon": exact_depot_lon,
            "address": depot_address,
            "road_corridor_coords": corridor_coords
        },
        "nodes": nodes_list,
        "streets": streets_list,
        "vehicles": vehicles_list,
        "settings": {
            "deadhead_upper_bound": 5,
            "service_speed_factor": 1.8,
            "demand_per_meter": demand_per_meter
        }
    }
    return config


def main():
    parser = argparse.ArgumentParser(description="Importa una nuova mappa stradale per l'ottimizzazione RSU CARP")
    parser.add_argument("--place", type=str, default="Conegliano, Italy", help="Nome del comune o quartiere (default: 'Conegliano, Italy')")
    parser.add_argument("--depot", type=str, default="45.951391386254286, 12.312502178579223", help="Punto Deposito di Partenza: coordinate GPS 'lat, lon' o indirizzo")
    parser.add_argument("--lat", type=float, help="Latitudine centro / deposito GPS")
    parser.add_argument("--lon", type=float, help="Longitudine centro / deposito GPS")
    parser.add_argument("--dist", type=int, default=600, help="Raggio in metri da scaricare (default: 600m)")
    parser.add_argument("--max-streets", type=int, default=0, help="Numero massimo di vie (0 = tutto il comune)")
    parser.add_argument("--out", type=str, default="data/config_aree_raccolta.json", help="File JSON di destinazione")
    args = parser.parse_args()

    if args.lat is not None and args.lon is not None and not args.place:
        cfg = import_osm_by_point(args.lat, args.lon, dist_meters=args.dist, max_streets=args.max_streets)
    elif args.place:
        cfg = import_osm_by_place(args.place, depot_lat=args.lat, depot_lon=args.lon, depot_query=args.depot, max_streets=args.max_streets)
    else:
        print("Errore: specifica '--place <nome>' oppure '--lat <lat> --lon <lon>'.")
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
