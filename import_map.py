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


_OSRM_CORRIDOR_CACHE: Dict[tuple, tuple[float, list[list[float]]]] = {}
_GEOCODE_FULL_CACHE: Dict[str, Dict[str, Any]] = {}
_OSM_TILE_MEM_CACHE: Dict[tuple, list[bytes]] = {}


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

    cache_key = (round(lat1, 4), round(lon1, 4), round(lat2, 4), round(lon2, 4))
    if cache_key in _OSRM_CORRIDOR_CACHE:
        return _OSRM_CORRIDOR_CACHE[cache_key]

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
                        _OSRM_CORRIDOR_CACHE[cache_key] = (dist_m, lat_lon_list)
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
    - Più toponimi separati da congiunzioni ('e', 'and', '+') come 'Tarzo e Corbanese'
    - Più toponimi separati da virgola
    - Normalizza automaticamente aggiungendo ', Italy' per i toponimi senza nazione specificata.
    """
    import re
    if not place_input:
        return ["Conegliano, Italy"]

    raw = str(place_input).strip()

    # Riconoscimento congiunzioni e separatori multipli (;, \n, +, ' e ', ' and ')
    s = re.sub(r"[\n;+]+", ";", raw)
    s = re.sub(r"\s+\b(?:e|and|und)\b\s+", ";", s, flags=re.IGNORECASE)

    # Se non c'è punto e virgola, verifica se ci sono virgole che separano comuni
    if ";" not in s and "," in s:
        parts = [p.strip() for p in s.split(",") if p.strip()]
        if len(parts) > 1 and not any(p.lower() in ("italy", "italia", "france", "germany", "spain", "switzerland", "austria") for p in parts):
            s = ";".join(parts)

    tokens = [t.strip() for t in s.split(";") if t.strip()]

    clean_places = []
    for t in tokens:
        # Pulisci da virgole finali o doppie indicazioni della nazione
        t_clean = re.sub(r",\s*(?:Italy|Italia)$", "", t, flags=re.IGNORECASE).strip()
        t_clean = re.sub(r"^[,\s]+|[,\s]+$", "", t_clean)
        if not t_clean:
            continue
        clean_places.append(f"{t_clean}, Italy")

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
    info = geocode_place_full(place_name)
    return float(info["lat"]), float(info["lon"])


def geocode_place_full(place_name: str) -> Dict[str, Any]:
    """
    Geocodifica un comune, frazione o località tramite Nominatim restituendo:
    - lat, lon del centro abitato principale (place=town/city/village/hamlet)
    - bbox (min_lon, min_lat, max_lon, max_lat) dell'intero territorio comunale (se comune) o dell'abitato (se frazione)
    - polygon (geometria Shapely del confine amministrativo comunale o area buffer della frazione)
    - has_polygon (True se è stato trovato un confine amministrativo poligonale)
    """
    import math
    import requests
    import osmnx as ox
    from shapely.geometry import shape, Point

    cache_key = place_name.strip().lower()
    if cache_key in _GEOCODE_FULL_CACHE:
        return _GEOCODE_FULL_CACHE[cache_key]

    clean_query_name = place_name.split(",")[0].strip().lower()
    urban_lat, urban_lon = None, None
    poly_geom = None
    poly_bbox = None

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": place_name, "format": "json", "polygon_geojson": 1, "limit": 8},
            headers={"User-Agent": "ORRoute_Research/2.5 (RSU Optimization)"},
            timeout=10
        )
        if resp.status_code == 200:
            results = resp.json()
            if isinstance(results, list) and results:
                # 1. Cerca il punto del centro abitato (place=village/town/city/hamlet)
                for r in results:
                    r_class = str(r.get("class", "")).lower()
                    r_type = str(r.get("type", "")).lower()
                    if r_class == "place" or r_type in ("town", "city", "village", "municipality", "suburb", "quarter", "hamlet"):
                        urban_lat = float(r["lat"])
                        urban_lon = float(r["lon"])
                        break

                if urban_lat is None:
                    urban_lat = float(results[0]["lat"])
                    urban_lon = float(results[0]["lon"])

                # 2. Cerca il poligono del confine amministrativo comunale (boundary=administrative)
                for r in results:
                    gjson = r.get("geojson") or {}
                    gtype = gjson.get("type", "")
                    if gtype in ("Polygon", "MultiPolygon") and "boundingbox" in r:
                        bb = [float(v) for v in r["boundingbox"]]  # [min_lat, max_lat, min_lon, max_lon]
                        d_lat = bb[1] - bb[0]
                        d_lon = bb[3] - bb[2]
                        disp_name = str(r.get("display_name", "")).lower()
                        # Accetta solo poligoni di scala comunale/urbana (<= ~25 km) coerenti col nome cercato
                        if d_lat <= 0.24 and d_lon <= 0.30 and (not clean_query_name or clean_query_name in disp_name):
                            try:
                                poly_geom = shape(gjson)
                                poly_bbox = (bb[2], bb[0], bb[3], bb[1])
                                break
                            except Exception:
                                pass
    except Exception as e:
        print(f"[OSM] Avviso Nominatim per '{place_name}': {e}", flush=True)

    if urban_lat is None or urban_lon is None:
        lat, lon = ox.geocode(place_name)
        urban_lat, urban_lon = float(lat), float(lon)

    if poly_geom is not None and poly_bbox is not None:
        res_info = {
            "name": place_name,
            "lat": urban_lat,
            "lon": urban_lon,
            "bbox": poly_bbox,
            "polygon": poly_geom,
            "has_polygon": True
        }
        _GEOCODE_FULL_CACHE[cache_key] = res_info
        return res_info

    # Se è una frazione/località puntiforme (es. Corbanese), crea un'area di 1150m attorno al centro abitato
    dist_m = 1150.0
    lat_d = dist_m / 111320.0
    lon_d = dist_m / (111320.0 * max(0.2, math.cos(math.radians(urban_lat))))
    fallback_bbox = (urban_lon - lon_d, urban_lat - lat_d, urban_lon + lon_d, urban_lat + lat_d)
    fallback_poly = Point(urban_lon, urban_lat).buffer(max(lat_d, lon_d))
    res_info = {
        "name": place_name,
        "lat": urban_lat,
        "lon": urban_lon,
        "bbox": fallback_bbox,
        "polygon": fallback_poly,
        "has_polygon": False
    }
    _GEOCODE_FULL_CACHE[cache_key] = res_info
    return res_info


def _fetch_osm_core_tile_xml(bbox_tuple: tuple[float, float, float, float], depth: int = 0) -> list[bytes]:
    """
    Scarica un singolo quadrante (tile) XML dall'API ufficiale OpenStreetMap Core (api/0.6/map)
    con caching su memoria/disco, retry automatico e suddivisione ricorsiva 2x2 se il quadrante
    supera il limite di 50.000 nodi (HTTP 400) o impiega troppo tempo.
    """
    import gzip
    import hashlib
    import time
    import requests

    x1, y1, x2, y2 = bbox_tuple
    cache_key = (round(x1, 5), round(y1, 5), round(x2, 5), round(y2, 5))
    if cache_key in _OSM_TILE_MEM_CACHE:
        return _OSM_TILE_MEM_CACHE[cache_key]

    cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache", "osm_tiles")
    os.makedirs(cache_dir, exist_ok=True)
    key_hash = hashlib.md5(f"{cache_key[0]}_{cache_key[1]}_{cache_key[2]}_{cache_key[3]}".encode("utf-8")).hexdigest()
    disk_path = os.path.join(cache_dir, f"tile_{key_hash}.xml.gz")

    if os.path.exists(disk_path):
        try:
            if (time.time() - os.path.getmtime(disk_path)) < 86400 * 7:
                with gzip.open(disk_path, "rb") as gf:
                    raw_bytes = gf.read()
                if raw_bytes:
                    _OSM_TILE_MEM_CACHE[cache_key] = [raw_bytes]
                    return [raw_bytes]
        except Exception:
            pass

    url = f"https://api.openstreetmap.org/api/0.6/map?bbox={x1:.6f},{y1:.6f},{x2:.6f},{y2:.6f}"
    headers = {
        "User-Agent": "ORRouteOptimization/2.5 (contact@or-route.org)",
        "Accept": "*/*"
    }

    last_err = None
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=headers, timeout=25)
            if resp.status_code == 200 and resp.content:
                _OSM_TILE_MEM_CACHE[cache_key] = [resp.content]
                try:
                    with gzip.open(disk_path, "wb") as gf:
                        gf.write(resp.content)
                except Exception:
                    pass
                return [resp.content]

            if resp.status_code == 400 and "too many nodes" in resp.text.lower() and depth < 2:
                break  # Passa alla suddivisione 2x2

            if resp.status_code in (429, 500, 502, 503, 504):
                last_err = f"HTTP {resp.status_code}"
                time.sleep(0.8 * (attempt + 1))
                continue

            raise RuntimeError(f"OpenStreetMap Core API ha risposto con codice {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            last_err = e
            time.sleep(0.6 * (attempt + 1))

    if depth < 2:
        mx = (x1 + x2) / 2.0
        my = (y1 + y2) / 2.0
        sub_tiles = [
            (x1, y1, mx, my),
            (mx, y1, x2, my),
            (x1, my, mx, y2),
            (mx, my, x2, y2)
        ]
        chunks = []
        for st in sub_tiles:
            chunks.extend(_fetch_osm_core_tile_xml(st, depth=depth + 1))
        _OSM_TILE_MEM_CACHE[cache_key] = chunks
        return chunks

    raise RuntimeError(f"Download quadrante OSM fallito dopo 3 tentativi: {last_err}")


def download_graph_from_osm_core_api_bbox(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    description: str = "",
    clip_polygon: Any = None,
    discovered_villages_out: Optional[list] = None
) -> Any:
    """
    Scarica la mappa stradale direttamente dall'API ufficiale OpenStreetMap Core (api.openstreetmap.org/api/0.6/map).
    Supporta interi territori comunali (anche ampi, con tutte le frazioni come Tarzo + Corbanese)
    suddividendo automaticamente il bounding box in quadranti paralleli per non superare mai il limite di 50.000 nodi,
    filtrando solo la viabilità carrabile e ritagliando sul confine amministrativo reale.
    """
    import math
    import tempfile
    import xml.etree.ElementTree as ET
    from concurrent.futures import ThreadPoolExecutor
    import osmnx as ox
    from shapely.geometry import Point

    center_lat = (min_lat + max_lat) / 2.0
    center_lon = (min_lon + max_lon) / 2.0

    max_half_delta_lat = 0.095
    cos_lat = max(0.2, math.cos(math.radians(center_lat)))
    max_half_delta_lon = 0.095 / cos_lat

    if (max_lat - min_lat) > (max_half_delta_lat * 2):
        min_lat = center_lat - max_half_delta_lat
        max_lat = center_lat + max_half_delta_lat
    if (max_lon - min_lon) > (max_half_delta_lon * 2):
        min_lon = center_lon - max_half_delta_lon
        max_lon = center_lon + max_half_delta_lon

    # Suddivisione automatica in griglia di quadranti (ciascuno <= 0.032 lat x 0.045 lon)
    n_lat = max(1, math.ceil((max_lat - min_lat) / 0.032))
    n_lon = max(1, math.ceil((max_lon - min_lon) / 0.045))
    d_lat = (max_lat - min_lat) / n_lat
    d_lon = (max_lon - min_lon) / n_lon
    eps = 0.0005  # Sovrapposizione di ~50m ai bordi per preservare tutte le vie che attraversano i quadranti

    tiles = []
    for i in range(n_lat):
        for j in range(n_lon):
            y1 = min_lat + i * d_lat - (eps if i > 0 else 0.0)
            y2 = min_lat + (i + 1) * d_lat + (eps if i < n_lat - 1 else 0.0)
            x1 = min_lon + j * d_lon - (eps if j > 0 else 0.0)
            x2 = min_lon + (j + 1) * d_lon + (eps if j < n_lon - 1 else 0.0)
            tiles.append((x1, y1, x2, y2))

    print(f"[OSM] Download {description or 'rete viaria'} da OpenStreetMap Core ({len(tiles)} quadranti paralleli)...", flush=True)
    xml_chunks = []
    with ThreadPoolExecutor(max_workers=min(2, len(tiles))) as executor:
        for chunk_list in executor.map(_fetch_osm_core_tile_xml, tiles):
            xml_chunks.extend(chunk_list)

    # Fusione e pre-filtraggio XML: manteniamo solo le way stradali carrabili pubbliche e i relativi nodi
    merged_root = ET.Element("osm", {"version": "0.6", "generator": "OR-Route"})
    nodes_dict = {}
    ways_dict = {}
    seen_village_names = set()

    for content in xml_chunks:
        try:
            root = ET.fromstring(content)
            for nd in root.findall("node"):
                nid = nd.attrib.get("id")
                if nid and nid not in nodes_dict:
                    nodes_dict[nid] = nd
                    if discovered_villages_out is not None:
                        tags = {t.attrib.get("k"): t.attrib.get("v") for t in nd.findall("tag")}
                        p_type = tags.get("place", "")
                        p_name = tags.get("name", "")
                        if p_type in ("city", "town", "village") and p_name and p_name not in seen_village_names:
                            try:
                                v_lat = float(nd.attrib["lat"])
                                v_lon = float(nd.attrib["lon"])
                                if clip_polygon is None or clip_polygon.contains(Point(v_lon, v_lat)):
                                    seen_village_names.add(p_name)
                                    discovered_villages_out.append((v_lat, v_lon, p_name))
                            except Exception:
                                pass

            for way in root.findall("way"):
                wid = way.attrib.get("id")
                if not wid or wid in ways_dict:
                    continue
                tags = {t.attrib.get("k"): t.attrib.get("v") for t in way.findall("tag")}
                hw = tags.get("highway", "")
                area = tags.get("area", "no")
                access = tags.get("access", "yes")
                if hw in DRIVABLE_HIGHWAYS and area != "yes" and access not in ("private", "no"):
                    ways_dict[wid] = way
        except Exception as xml_err:
            print(f"[OSM] Avviso parsing XML quadrante: {xml_err}", flush=True)

    used_node_ids = set()
    valid_ways = []
    for wid, way in ways_dict.items():
        nds = [nd.attrib.get("ref") for nd in way.findall("nd")]
        present_nds = [r for r in nds if r in nodes_dict]
        if len(present_nds) >= 2:
            if len(present_nds) != len(nds):
                for nd_el in list(way.findall("nd")):
                    if nd_el.attrib.get("ref") not in nodes_dict:
                        way.remove(nd_el)
            valid_ways.append(way)
            used_node_ids.update(present_nds)

    for nid in used_node_ids:
        merged_root.append(nodes_dict[nid])
    for way in valid_ways:
        merged_root.append(way)

    xml_bytes = ET.tostring(merged_root, encoding="utf-8")

    with tempfile.NamedTemporaryFile(suffix=".osm", delete=False, mode="wb") as f:
        f.write(xml_bytes)
        tmp_path = f.name

    try:
        G = ox.graph_from_xml(tmp_path, simplify=True)
        if G is None or len(G.nodes) == 0:
            raise RuntimeError("Nessuna via o elemento stradale valido trovato nell'area richiesta.")

        # Se è presente il poligono amministrativo o dell'area richiesta, ritaglia i nodi al suo interno (con margine di 60m)
        if clip_polygon is not None:
            try:
                buffered_poly = clip_polygon.buffer(0.0006)
                inside_nodes = [
                    n for n, d in G.nodes(data=True)
                    if buffered_poly.contains(Point(float(d.get("x", 0.0)), float(d.get("y", 0.0))))
                ]
                if len(inside_nodes) >= 10:
                    G = nx.MultiDiGraph(G.subgraph(inside_nodes))
            except Exception as clip_err:
                print(f"[OSM] Avviso ritaglio poligono ({clip_err}), mantengo intero grafo scaricato.", flush=True)

        # Seleziona la componente connessa principale per garantire raggiungibilità totale
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


def download_osm_with_fallbacks(fetch_func, description: str, bbox_fallback=None, clip_polygon=None, discovered_villages_out=None):
    """
    Scarica la rete OSM utilizzando in via prioritaria e ultrarapida i server ufficiali
    OpenStreetMap Core (con supporto multi-quadrante parallelo e ritaglio sul confine comunale),
    e mantiene i mirror Overpass come secondo livello di fallback.
    """
    import osmnx as ox

    if bbox_fallback is not None:
        try:
            return download_graph_from_osm_core_api_bbox(
                *bbox_fallback,
                description=description,
                clip_polygon=clip_polygon,
                discovered_villages_out=discovered_villages_out
            )
        except Exception as core_err:
            print(f"[OSM] Avviso OpenStreetMap Core API ({core_err}), failover su mirror Overpass...", flush=True)

    configure_osmnx_settings()
    last_err = None
    for mirror in OVERPASS_MIRRORS[:2]:
        try:
            ox.settings.overpass_url = mirror
            print(f"[OSM] Tentativo download {description} tramite mirror Overpass: {mirror}...", flush=True)
            G = fetch_func()
            if G is not None and len(G.nodes) > 0:
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

    raise RuntimeError(
        f"Impossibile completare il download per {description}. "
        f"I server OpenStreetMap sono temporaneamente sovraccarichi ({last_err}). "
        f"Consiglio: riprova tra pochi secondi."
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


def download_multizone_osm(place_infos: list[Dict[str, Any]]) -> Any:
    """
    Scarica la viabilità urbana di più comuni o frazioni contemporaneamente (es. 'Tarzo e Corbanese').
    Se le località sono vicine o appartengono allo stesso comprensorio (<= ~13 km),
    scarica l'intera rete viaria continua in un'unica passata parallela unendo i poligoni comunali
    e i corridoi stradali tra i centri abitati. Se sono distanti, scarica ciascuna zona e le
    connette tramite i reali corridoi stradali OSRM.
    """
    import networkx as nx
    from shapely.ops import unary_union
    from shapely.geometry import LineString

    if not place_infos:
        raise RuntimeError("Nessuna località valida specificata.")

    u_min_lon = min(info["bbox"][0] for info in place_infos)
    u_min_lat = min(info["bbox"][1] for info in place_infos)
    u_max_lon = max(info["bbox"][2] for info in place_infos)
    u_max_lat = max(info["bbox"][3] for info in place_infos)

    # Caso 1: Località contigue o frazione + comune (es. Tarzo e Corbanese) -> download unificato continuo
    if (u_max_lat - u_min_lat) <= 0.12 and (u_max_lon - u_min_lon) <= 0.16:
        shapes = [info["polygon"] for info in place_infos if info.get("polygon") is not None]
        for i in range(len(place_infos)):
            for j in range(i + 1, len(place_infos)):
                p1, p2 = place_infos[i], place_infos[j]
                corridor_line = LineString([(p1["lon"], p1["lat"]), (p2["lon"], p2["lat"])]).buffer(0.005)
                shapes.append(corridor_line)

        union_poly = unary_union(shapes) if shapes else None
        desc = " + ".join(info["name"].split(",")[0].strip() for info in place_infos)
        try:
            G_uni = download_graph_from_osm_core_api_bbox(
                u_min_lon, u_min_lat, u_max_lon, u_max_lat,
                description=f"comprensorio multi-zona '{desc}'",
                clip_polygon=union_poly
            )
            # Verifica che ciascun centro abitato abbia nodi effettivamente presenti nel grafo
            all_covered = True
            for info in place_infos:
                nearest_n = find_nearest_node(G_uni, lat=info["lat"], lon=info["lon"])
                n_lat = float(G_uni.nodes[nearest_n].get("y", 0.0))
                n_lon = float(G_uni.nodes[nearest_n].get("x", 0.0))
                if haversine_distance_m(info["lat"], info["lon"], n_lat, n_lon) > 900.0:
                    all_covered = False
                    break
            if all_covered:
                return G_uni
        except Exception as e_uni:
            print(f"[OSM MULTI-ZONA] Avviso download unificato ({e_uni}), procedo per singole zone...", flush=True)

    # Caso 2: Scarica ciascuna località individualmente e connettile con i corridoi stradali reali OSRM
    graphs = []
    for info in place_infos:
        p_name = info["name"]
        ulat, ulon = info["lat"], info["lon"]
        bbox = info["bbox"]
        G_zone = download_graph_from_osm_core_api_bbox(
            *bbox,
            description=f"zona '{p_name}'",
            clip_polygon=info.get("polygon")
        )
        graphs.append((p_name, (ulat, ulon), G_zone))

    G_combined = nx.MultiDiGraph()
    for _, _, gz in graphs:
        G_combined = nx.compose(G_combined, gz)

    for i in range(len(graphs)):
        for j in range(i + 1, len(graphs)):
            name_a, (lat_a, lon_a), gz_a = graphs[i]
            name_b, (lat_b, lon_b), gz_b = graphs[j]
            na = find_nearest_node(gz_a, lat=lat_a, lon=lon_a)
            nb = find_nearest_node(gz_b, lat=lat_b, lon=lon_b)
            corridor_dist_m, corridor_coords = fetch_road_corridor_osrm(
                float(gz_a.nodes[na].get("y", lat_a)), float(gz_a.nodes[na].get("x", lon_a)),
                float(gz_b.nodes[nb].get("y", lat_b)), float(gz_b.nodes[nb].get("x", lon_b))
            )
            c_name = f"Collegamento {name_a.split(',')[0]} - {name_b.split(',')[0]}"
            t_cost = round(max(corridor_dist_m / 100.0, 0.5), 2)
            G_combined.add_edge(na, nb, key=0, length=corridor_dist_m, transit_cost=t_cost, service_cost=t_cost, demand_kg=0.0, name=c_name, highway="secondary", geometry=corridor_coords)
            G_combined.add_edge(nb, na, key=1, length=corridor_dist_m, transit_cost=t_cost, service_cost=t_cost, demand_kg=0.0, name=c_name, highway="secondary", geometry=corridor_coords[::-1])

    return G_combined


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
    - Se viene inserito un singolo comune (es. 'Tarzo'), scarica l'intero territorio comunale
      includendo automaticamente tutte le sue frazioni (es. Corbanese, Arfanta, Colmaggiore, Nogarolo).
    - Se vengono inserite più località (es. 'Tarzo e Corbanese'), scarica e connette l'intera
      rete stradale di tutte le località indicate garantendo la copertura di ciascuna.
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

    # 2. Supporto Comune Intero (con Frazioni) e Multi-Zona
    places_list = parse_places_input(clean_place)
    print(f"[OSM] Zone/Comuni rilevati ({len(places_list)}): {places_list}", flush=True)

    place_infos = []
    urban_centers = []
    for p in places_list:
        try:
            info = geocode_place_full(p)
            place_infos.append(info)
            urban_centers.append((info["lat"], info["lon"]))
            print(f"[OSM] Località identificata '{p}': centro=({info['lat']:.5f}, {info['lon']:.5f}), poligono_comunale={info['has_polygon']}", flush=True)
        except Exception as geo_err:
            print(f"[OSM] Avviso geocodifica per '{p}': {geo_err}", flush=True)

    urban_lat, urban_lon = None, None
    if urban_centers:
        urban_lat = sum(c[0] for c in urban_centers) / len(urban_centers)
        urban_lon = sum(c[1] for c in urban_centers) / len(urban_centers)

    place_display_name = " + ".join([p.split(",")[0].strip() for p in places_list])

    if len(place_infos) > 1:
        G = download_multizone_osm(place_infos)
    elif len(place_infos) == 1:
        info = place_infos[0]
        discovered_villages = []

        def _fetch():
            return ox.graph_from_place(info["name"], network_type="drive", simplify=True)

        G = download_osm_with_fallbacks(
            _fetch,
            f"comune/area '{place_display_name}'",
            bbox_fallback=info["bbox"],
            clip_polygon=info.get("polygon"),
            discovered_villages_out=discovered_villages
        )

        # Se il comune contiene frazioni principali (es. Corbanese dentro il Comune di Tarzo),
        # aggiungile automaticamente ai centri urbani così che anche i filtri settore le includano!
        for v_lat, v_lon, v_name in discovered_villages:
            if all(haversine_distance_m(v_lat, v_lon, c[0], c[1]) > 600.0 for c in urban_centers):
                urban_centers.append((v_lat, v_lon))
                print(f"[OSM] Frazione/Centro abitato comunale rilevato e incluso: '{v_name}' ({v_lat:.5f}, {v_lon:.5f})", flush=True)
    else:
        raise RuntimeError(f"Impossibile geocodificare la località '{clean_place}'.")

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
        place_name=place_display_name,
        urban_centers=urban_centers
    )


def filter_multizone_sector(G: Any, urban_centers: list, depot_node_id: Any, max_streets: int = 80) -> Any:
    """
    Estrae un sotto-settore operativo multi-zona bilanciato tra tutti i comuni/frazioni richiesti,
    garantendo che ogni zona riceva una quota equa di vie (misurata in archi effettivi attorno a ciascun centro)
    e che la viabilità di raccordo tra i vari centri urbani e il deposito sia interamente preservata.
    """
    unique_total = set((min(u, v), max(u, v)) for u, v in G.edges() if u != v)
    if not urban_centers or max_streets is None or max_streets <= 0 or len(unique_total) <= max_streets:
        return G

    undir_G = G.to_undirected()
    if depot_node_id not in undir_G:
        depot_node_id = list(G.nodes())[0] if G.nodes else 0

    center_nodes = []
    for c in urban_centers:
        if c and len(c) >= 2 and c[0] is not None:
            cn = find_nearest_node(G, lat=float(c[0]), lon=float(c[1]))
            if cn not in center_nodes:
                center_nodes.append(cn)

    if not center_nodes:
        return filter_sector_around_depot(G, depot_node_id, max_streets=max_streets)

    # 1. Connetti il deposito e tutti i centri abitati tramite i cammini minimi stradali
    all_key_nodes = [depot_node_id] + [cn for cn in center_nodes if cn != depot_node_id]
    selected_nodes = set(all_key_nodes)
    for i in range(len(all_key_nodes)):
        for j in range(i + 1, len(all_key_nodes)):
            try:
                p = nx.shortest_path(undir_G, all_key_nodes[i], all_key_nodes[j], weight="length")
                selected_nodes.update(p)
            except Exception:
                pass

    # 2. Garantisci a ciascun centro abitato una quota equa di vie urbane attorno al proprio centro
    quota_edges_per_center = max(12, max_streets // len(center_nodes))
    for c_node in center_nodes:
        try:
            lengths = nx.single_source_dijkstra_path_length(undir_G, c_node, weight="length")
        except Exception:
            lengths = {n: 1 for n in undir_G.nodes()}

        sorted_nodes = sorted(lengths.keys(), key=lambda n: lengths[n])
        local_nodes = {c_node}
        for n in sorted_nodes:
            local_nodes.add(n)
            sub_local = G.subgraph(local_nodes)
            local_edges = set((min(u, v), max(u, v)) for u, v in sub_local.edges() if u != v)
            if len(local_edges) >= quota_edges_per_center:
                break
        selected_nodes.update(local_nodes)

    sub_multi = nx.MultiDiGraph(G.subgraph(selected_nodes))
    if G.graph.get("from_carp_config"):
        sub_multi.graph["from_carp_config"] = True
    return sub_multi


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


def crop_sector_by_capacity(G: Any, depot_node_id: Any, max_capacity_kg: float, demand_per_meter: float = 1.5, urban_centers: Optional[list] = None) -> Any:
    """
    Estrae un sotto-settore operativo connesso la cui domanda di rifiuti corrisponde alla capacità
    totale dei compattatori attualmente a disposizione, bilanciando tra tutti i centri abitati se multi-zona.
    """
    if depot_node_id not in G.nodes():
        depot_node_id = list(G.nodes())[0] if G.nodes() else 0

    undir_G = G.to_undirected()

    center_nodes = []
    if urban_centers:
        for c in urban_centers:
            if c and len(c) >= 2 and c[0] is not None:
                cn = find_nearest_node(G, lat=float(c[0]), lon=float(c[1]))
                if cn not in center_nodes:
                    center_nodes.append(cn)

    if len(center_nodes) > 1:
        all_key_nodes = [depot_node_id] + [cn for cn in center_nodes if cn != depot_node_id]
        selected_nodes = set(all_key_nodes)
        for i in range(len(all_key_nodes)):
            for j in range(i + 1, len(all_key_nodes)):
                try:
                    p = nx.shortest_path(undir_G, all_key_nodes[i], all_key_nodes[j], weight="length")
                    selected_nodes.update(p)
                except Exception:
                    pass

        sorted_lists = []
        for cn in center_nodes:
            try:
                lengths = nx.single_source_dijkstra_path_length(undir_G, cn, weight="length")
                sorted_lists.append(sorted(lengths.keys(), key=lambda n: lengths[n]))
            except Exception:
                sorted_lists.append(list(G.nodes()))

        max_len = max((len(lst) for lst in sorted_lists), default=0)
        done = False
        for step in range(max_len):
            for lst in sorted_lists:
                if step < len(lst):
                    selected_nodes.add(lst[step])
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
                        done = True
                        break
            if done:
                break

        sub_multi = nx.MultiDiGraph(G.subgraph(selected_nodes))
        if G.graph.get("from_carp_config"):
            sub_multi.graph["from_carp_config"] = True
        return sub_multi

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
    place_name: Optional[str] = None,
    urban_centers: Optional[list] = None
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
    elif urban_centers and len(urban_centers) > 1:
        G = filter_multizone_sector(G, urban_centers, depot_node_id, max_streets=max_streets)
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

        zone_type = data.get("zone_type")
        day_val = data.get("day", 1)

        # Se i dati della strada hanno già demand_kg e transit_cost (es. da filtro settore), preservali!
        if "demand_kg" in data and "transit_cost" in data:
            demand = float(data["demand_kg"])
            transit_cost = float(data["transit_cost"])
            service_cost = float(data.get("service_cost", round(transit_cost * 1.8, 2)))
            length_m = float(data.get("length_m", round(transit_cost * 100.0, 1)))
            desc = _clean_osm_str(data.get("description"), f"Tratta con raccolta ({demand:.0f} kg)")
            if not zone_type:
                zone_type = "transit" if demand == 0 else "res_std"
        elif "demand_kg" in data:
            demand = float(data["demand_kg"])
            transit_cost = float(data.get("length", 1.0))
            service_cost = float(data.get("service_cost", round(transit_cost * 1.8, 2)))
            length_m = float(data.get("length_m", round(transit_cost * 100.0, 1)))
            desc = _clean_osm_str(data.get("description"), f"Tratta ({demand:.0f} kg)")
            if not zone_type:
                zone_type = "transit" if demand == 0 else "res_std"
        else:
            length_m = float(data.get("length", 100.0))
            highway_type = _clean_osm_str(data.get("highway", "residential"), "residential")

            # Assegnazione tipologia zona e domanda stimata:
            # Distinzione zone residenziali con maggiore carico rifiuti (Punto 3)
            if any(k in highway_type for k in ("motorway", "trunk", "motorway_link", "trunk_link")):
                demand = 0.0  # Tangenziali e superstrade solo transito veloce
                zone_type = "transit"
                desc = "Transito veloce / superstrada (0 kg)"
            elif highway_type in ("residential", "living_street"):
                # Se è una via residenziale importante o centro abitato denso -> Residenziale con maggiore carico (+40%)
                is_high_density = (
                    length_m >= 150.0 
                    or str(data.get("lanes", "1")) in ("2", "3")
                    or any(w in street_name.lower() for w in ("corso", "viale", "piazza", "roma", "garibaldi", "dante", "matteotti", "veneto", "mille", "marconi", "libertà", "mazzini", "trieste", "cavallotti"))
                )
                if is_high_density:
                    zone_type = "res_high"
                    raw_demand = round(length_m * demand_per_meter * 1.40, -1)
                    demand = max(15.0, raw_demand) if demand_per_meter > 0 else 0.0
                    desc = f"Residenziale Alta Densità / Alto Carico (+40%, {length_m:.0f}m)"
                else:
                    zone_type = "res_std"
                    raw_demand = round(length_m * demand_per_meter * 1.00, -1)
                    demand = max(10.0, raw_demand) if demand_per_meter > 0 else 0.0
                    desc = f"Residenziale Standard ({length_m:.0f}m)"
            elif highway_type in ("commercial", "retail", "pedestrian"):
                zone_type = "commercial"
                raw_demand = round(length_m * demand_per_meter * 1.20, -1)
                demand = max(10.0, raw_demand) if demand_per_meter > 0 else 0.0
                desc = f"Attività Commerciali / Misto (+20%, {length_m:.0f}m)"
            else:
                zone_type = "other"
                raw_demand = round(length_m * demand_per_meter * 0.70, -1)
                demand = max(10.0, raw_demand) if demand_per_meter > 0 else 0.0
                desc = f"Viabilità Secondaria / Altra via ({highway_type}, {length_m:.0f}m)"

            # Costo transito proporzionale a lunghezza (in centinaia di metri)
            transit_cost = round(length_m / 100.0, 2)
            service_cost = round(transit_cost * 1.8, 2)

        if raw_id == "R0" or street_name.startswith("Raccordo Cantiere"):
            st_id = "R0"
            zone_type = "transit"
            day_val = "ALL"
            if not corridor_coords and edge_coords:
                corridor_coords = edge_coords
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
            "zone_type": zone_type,
            "day": day_val,
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
        "urban_centers": urban_centers or [],
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
