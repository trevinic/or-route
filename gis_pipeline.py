"""
Pipeline GIS per la Raccolta Rifiuti Urbani (RSU)
Integrazione tra OpenStreetMap (OSMnx), NetworkX e Mappe Interattive (Folium).
"""

import os
from typing import Dict, List, Tuple, Any, Optional
import networkx as nx
import folium
from folium import plugins


def build_synthetic_benchmark_graph() -> nx.DiGraph:
    """
    Crea un grafo NetworkX rappresentativo della topologia di benchmark (5 nodi)
    del Dossier Tecnico, corredato di coordinate GPS realistiche (Treviso, Italia).
    Utile per simulazioni, test offline e rendering immediato.
    """
    # Coordinate GPS centrate su un'area urbana
    coords = {
        0: (45.6670, 12.2450),  # Deposito aziendale
        1: (45.6695, 12.2480),  # Incrocio 1 (Nord-Est)
        2: (45.6720, 12.2530),  # Incrocio 2 (Via Roma / Garibaldi)
        3: (45.6680, 12.2560),  # Incrocio 3 (Via Dante)
        4: (45.6645, 12.2490),  # Incrocio 4 (Viale Europa)
    }

    G = nx.DiGraph()
    for n, (lat, lon) in coords.items():
        G.add_node(n, y=lat, x=lon, name=f"Incrocio_{n}" if n != 0 else "Deposito_Centrale")

    # Spigoli bidirezionali del benchmark: (u, v, c_trans, c_serv, demand_kg)
    edges_spec = [
        (0, 1, 3.0, 3.0, 0, "Raccordo Deposito 1"),
        (0, 4, 4.0, 4.0, 0, "Raccordo Deposito 4"),
        (1, 2, 2.5, 4.5, 1800, "Via Roma"),
        (2, 3, 3.0, 5.0, 2200, "Corso Garibaldi"),
        (3, 4, 2.0, 4.0, 1500, "Via Dante"),
        (1, 4, 3.5, 6.0, 2000, "Viale Europa"),
        (2, 4, 3.0, 3.0, 0, "Bretella Transito"),
    ]

    for u, v, c_trans, c_serv, q, street_name in edges_spec:
        G.add_edge(u, v, length=c_trans, service_cost=c_serv, demand_kg=q, name=street_name)
        G.add_edge(v, u, length=c_trans, service_cost=c_serv, demand_kg=q, name=street_name)

    return G


def build_graph_from_config(config: Dict[str, Any]) -> nx.DiGraph:
    """
    Costruisce un grafo NetworkX a partire dalla configurazione JSON esterna.
    """
    G = nx.DiGraph()
    for node in config.get("nodes", []):
        n_id = int(node["id"])
        G.add_node(
            n_id,
            y=float(node.get("lat", 45.667)),
            x=float(node.get("lon", 12.245)),
            name=node.get("name", f"Incrocio_{n_id}")
        )

    for street in config.get("streets", []):
        u = int(street["u"])
        v = int(street["v"])
        c_trans = float(street.get("transit_cost", 1.0))
        c_serv = float(street.get("service_cost", c_trans * 1.8))
        q = float(street.get("demand_kg", 0.0))
        name = street.get("name", f"Via {u}-{v}")
        G.add_edge(u, v, length=c_trans, service_cost=c_serv, demand_kg=q, name=name)
        G.add_edge(v, u, length=c_trans, service_cost=c_serv, demand_kg=q, name=name)

    return G


def extract_osm_graph(
    place_name: str = "Treviso, Italy",
    network_type: str = "drive",
    simplify: bool = True
) -> nx.MultiDiGraph:
    """
    Scarica la rete stradale reale tramite OSMnx.
    Compatibile con le versioni OSMnx 1.x e 2.x.
    """
    import osmnx as ox

    print(f"Scaricamento della rete viaria per '{place_name}'...")
    G = ox.graph_from_place(place_name, network_type=network_type)

    if simplify:
        try:
            # Compatibilità per consolidamento incroci
            if hasattr(ox, "consolidate_intersections"):
                G = ox.consolidate_intersections(G, rebuild_graph=True, tolerance=15, dead_ends=False)
            elif hasattr(ox, "simplification") and hasattr(ox.simplification, "consolidate_intersections"):
                G = ox.simplification.consolidate_intersections(G, rebuild_graph=True, tolerance=15, dead_ends=False)
        except Exception as e:
            print(f"Avviso consolidamento incroci: {e}. Si procede con grafo standard.")

    return G


def extract_carp_inputs_from_graph(
    G: Any,
    keyword_demand: str = "Roma",
    default_demand_kg: float = 250.0,
    service_speed_factor: float = 1.8
) -> List[Tuple[int, int, float, float, float]]:
    """
    Estrae le tuple (u, v, c_transit, c_service, demand_kg) da un grafo NetworkX/OSMnx.
    """
    edges_data = []
    seen = set()

    for u, v, data in G.edges(data=True):
        edge_key = (min(u, v), max(u, v))
        if edge_key in seen:
            continue
        seen.add(edge_key)

        length = float(data.get("length", 100.0))
        name = str(data.get("name", ""))
        
        # Assegnazione domanda simulata o da attributo
        if "demand_kg" in data:
            demand = float(data["demand_kg"])
        elif keyword_demand.lower() in name.lower():
            demand = default_demand_kg
        else:
            demand = 0.0

        c_transit = length
        c_service = length * service_speed_factor
        edges_data.append((u, v, c_transit, c_service, demand))

    return edges_data


def genera_mappa_percorso(
    G: Any,
    solution_result: Dict[str, Any],
    output_file: str = "output/percorso_raccolta.html",
    depot_node: int = 0,
    depot_info: Optional[Dict[str, Any]] = None
) -> str:
    """
    Genera una mappa interattiva Folium con la visualizzazione dettagliata
    dell'intera rete viaria comunale, del punto esatto di deposito/partenza,
    del raccordo viario e dei percorsi di raccolta vs transito a vuoto dei mezzi.
    """
    os.makedirs(os.path.dirname(output_file) or ".", exist_ok=True)

    # 1. Recupero coordinate esatte del deposito inserite dall'utente
    exact_lat: Optional[float] = None
    exact_lon: Optional[float] = None
    exact_addr: Optional[str] = None
    if depot_info and isinstance(depot_info, dict):
        if depot_info.get("exact_lat") is not None and depot_info.get("exact_lon") is not None:
            try:
                exact_lat = float(depot_info["exact_lat"])
                exact_lon = float(depot_info["exact_lon"])
                exact_addr = str(depot_info.get("address", ""))
            except (ValueError, TypeError):
                pass

    # 2. Calcolo bounding box su tutti i nodi e sul punto deposito
    lats: List[float] = []
    lons: List[float] = []
    for _, data in G.nodes(data=True):
        if "y" in data and "x" in data:
            lats.append(float(data["y"]))
            lons.append(float(data["x"]))

    if exact_lat is not None and exact_lon is not None:
        lats.append(exact_lat)
        lons.append(exact_lon)

    if not lats:
        lats = [45.667]
        lons = [12.245]

    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    center_lat = (min_lat + max_lat) / 2.0
    center_lon = (min_lon + max_lon) / 2.0

    m = folium.Map(location=[center_lat, center_lon], zoom_start=13, tiles=None)

    # Provider di mappe stabili (Esri & CartoDB) per evitare blocchi o rate-limit OSM
    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        attr="Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS",
        name="Mappa Stradale (Esri)",
        control=True
    ).add_to(m)

    folium.TileLayer(
        tiles="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attr="&copy; OpenStreetMap contributors &copy; CARTO",
        name="CartoDB Voyager (Chiara)",
        control=True
    ).add_to(m)

    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
        name="Satellite (Esri)",
        control=True
    ).add_to(m)

    # 3. Layer Base: Rete Stradale e Viabilità Completa (Tutte le Vie del Comune)
    road_network_fg = folium.FeatureGroup(name="🛣️ Rete Stradale e Viabilità (Tutte le Vie)", show=True)
    seen_network_edges = set()
    for u, v, data in G.edges(data=True):
        canon = (min(u, v), max(u, v))
        if canon in seen_network_edges or u not in G.nodes or v not in G.nodes:
            continue
        seen_network_edges.add(canon)

        p1 = (G.nodes[u]["y"], G.nodes[u]["x"])
        p2 = (G.nodes[v]["y"], G.nodes[v]["x"])
        st_name = data.get("name", f"Tratta {u}-{v}")
        st_demand = float(data.get("demand_kg", 0.0))
        st_len = float(data.get("length", 100.0))

        tooltip_txt = f"{st_name} ({st_len:.0f}m) | Rifiuti: {st_demand:.0f} kg"
        folium.PolyLine(
            locations=[p1, p2],
            color="#64748b",
            weight=2.5,
            opacity=0.55,
            tooltip=tooltip_txt
        ).add_to(road_network_fg)

    road_network_fg.add_to(m)

    # 4. Individuazione punto di innesto e posizionamento marker di partenza
    # Se il nodo 0 è presente nel grafo
    node0_lat = G.nodes[depot_node]["y"] if (depot_node in G.nodes and "y" in G.nodes[depot_node]) else center_lat
    node0_lon = G.nodes[depot_node]["x"] if (depot_node in G.nodes and "x" in G.nodes[depot_node]) else center_lon

    # Verifica se esiste un nodo di innesto comunale collegato al deposito
    entry_node = None
    entry_lat, entry_lon = node0_lat, node0_lon

    if exact_lat is not None and exact_lon is not None:
        # Se il nodo 0 ha coordinate identiche a exact_lat, il punto di innesto è il suo vicino
        dist_to_node0 = (exact_lat - node0_lat)**2 + (exact_lon - node0_lon)**2
        if dist_to_node0 < 1e-7:
            neighbors = list(G.neighbors(depot_node))
            if neighbors:
                entry_node = neighbors[0]
                entry_lat = G.nodes[entry_node]["y"]
                entry_lon = G.nodes[entry_node]["x"]
        else:
            entry_node = depot_node
            entry_lat = node0_lat
            entry_lon = node0_lon

        # Marker Rosso per la Sede / Deposito dell'Impresa
        folium.Marker(
            [exact_lat, exact_lon],
            popup=(
                f"<b>📍 Sede / Deposito Aziendale</b><br>"
                f"<b>Indirizzo:</b> {exact_addr or 'Coordinate GPS'}<br>"
                f"<b>GPS:</b> {exact_lat:.6f}, {exact_lon:.6f}"
            ),
            tooltip="📍 Sede / Cantiere Deposito (Punto di Partenza Flotta)",
            icon=folium.Icon(color="red", icon="industry", prefix="fa")
        ).add_to(m)

        # Se il deposito dista dall'innesto comunale, disegna linea di raccordo e marker di innesto
        dist_entry = (exact_lat - entry_lat)**2 + (exact_lon - entry_lon)**2
        if dist_entry > 1e-7:
            folium.PolyLine(
                locations=[(exact_lat, exact_lon), (entry_lat, entry_lon)],
                color="#dc2626",
                weight=3.5,
                dash_array="6, 6",
                tooltip="Raccordo Cantiere Deposito &rarr; Rete Viaria Comunale"
            ).add_to(m)

            folium.Marker(
                [entry_lat, entry_lon],
                popup=(
                    f"<b>🏁 Innesto Viario Rete Comunale (Nodo {entry_node or 0})</b><br>"
                    f"Punto di accesso e smistamento alla viabilità urbana"
                ),
                tooltip=f"🏁 Innesto Rete Comunale (Nodo {entry_node or 0})",
                icon=folium.Icon(color="black", icon="road", prefix="fa")
            ).add_to(m)
    else:
        # Marker standard Nodo 0
        folium.Marker(
            [node0_lat, node0_lon],
            popup="<b>📍 Deposito Centrale Flotta (Nodo 0)</b><br>Punto di partenza e rientro mezzi",
            tooltip="📍 Deposito Centrale (Nodo 0)",
            icon=folium.Icon(color="red", icon="home", prefix="fa")
        ).add_to(m)

    # 5. Palette colori differenziata per flotta estesa (fino a 24 compattatori)
    vehicle_palette = [
        "#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c",
        "#0891b2", "#d97706", "#4f46e5", "#059669", "#be123c",
        "#7c3aed", "#0284c7", "#65a30d", "#c026d3", "#b45309",
        "#1e40af", "#15803d", "#b91c1c", "#6b21a8", "#c2410c",
        "#0e7490", "#a16207", "#3730a3", "#047857"
    ]

    vehicles_dict = solution_result.get("vehicles", {})
    color_idx = 0

    for vehicle_name, v_info in vehicles_dict.items():
        if not v_info.get("used", False):
            continue

        v_color = vehicle_palette[color_idx % len(vehicle_palette)]
        color_idx += 1

        movements = v_info.get("movements", [])
        tot_coll = v_info.get("total_collected", 0.0)
        cap = v_info.get("capacity", 4500.0)
        pct = (tot_coll / cap * 100.0) if cap > 0 else 0.0

        feature_group = folium.FeatureGroup(
            name=f"🚛 {vehicle_name} ({tot_coll:.0f} kg / {cap:.0f} kg - {pct:.0f}%)",
            show=True
        )

        for move in movements:
            u, v = move["u"], move["v"]
            if u not in G.nodes or v not in G.nodes:
                continue

            p1 = (G.nodes[u]["y"], G.nodes[u]["x"])
            p2 = (G.nodes[v]["y"], G.nodes[v]["x"])

            if move["type"] == "SERVIZIO":
                popup_txt = (
                    f"<b>🚛 {vehicle_name} &mdash; SERVIZIO RACCOLTA</b><br>"
                    f"Tratta: {u} &rarr; {v}<br>"
                    f"Rifiuto raccolto: <b>{move['demand_kg']:.0f} kg</b><br>"
                    f"Costo operativo: {move['cost']:.1f}"
                )
                folium.PolyLine(
                    locations=[p1, p2],
                    color=v_color,
                    weight=6,
                    opacity=0.92,
                    popup=popup_txt,
                    tooltip=f"{vehicle_name}: Raccolta {u}&rarr;{v} ({move['demand_kg']:.0f} kg)"
                ).add_to(feature_group)
            else:
                popup_txt = (
                    f"<b>🚛 {vehicle_name} &mdash; TRANSITO A VUOTO</b><br>"
                    f"Tratta: {u} &rarr; {v}<br>"
                    f"Ripetizioni: {move.get('times', 1)}x<br>"
                    f"Costo transito: {move['cost']:.1f}"
                )
                folium.PolyLine(
                    locations=[p1, p2],
                    color="#f97316",
                    weight=3.5,
                    opacity=0.85,
                    dash_array="8, 6",
                    popup=popup_txt,
                    tooltip=f"{vehicle_name}: Transito {u}&rarr;{v}"
                ).add_to(feature_group)

        feature_group.add_to(m)

    # 6. Marker discreti per incroci viari
    for node, data in G.nodes(data=True):
        if node == depot_node or node == entry_node:
            continue
        lat, lon = data.get("y"), data.get("x")
        if lat and lon:
            folium.CircleMarker(
                location=[lat, lon],
                radius=3,
                color="#475569",
                fill=True,
                fill_color="#ffffff",
                fill_opacity=0.85,
                tooltip=f"Incrocio {node}"
            ).add_to(m)

    # 7. Adattamento automatico della vista su tutta l'estensione geografica
    m.fit_bounds([[min_lat, min_lon], [max_lat, max_lon]], padding=(25, 25))

    floating_nav_html = """
    <div style="position: fixed; top: 12px; left: 60px; z-index: 9999; background: rgba(14, 22, 38, 0.92); border: 1px solid #283959; border-radius: 8px; padding: 8px 14px; font-family: sans-serif; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); backdrop-filter: blur(8px);">
      <span style="font-weight: 700; color: #38bdf8; font-size: 13px;">📐 OR-Route: Mappa GIS</span>
      <a href="http://localhost:8085" target="_blank" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 4px 10px; border-radius: 5px; font-size: 12px; font-weight: 600;">🏠 Apri Portale Completo</a>
      <a href="http://localhost:8085/#tab-faq" target="_blank" style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fbbf24; text-decoration: none; padding: 4px 10px; border-radius: 5px; font-size: 12px; font-weight: 600;">📘 Apri Guida & FAQ</a>
    </div>
    """
    m.get_root().html.add_child(folium.Element(floating_nav_html))

    folium.LayerControl(collapsed=False).add_to(m)
    m.save(output_file)
    print(f"Mappa interattiva generata con successo: {output_file}")
    return output_file


if __name__ == "__main__":
    print("Creazione grafo di benchmark sintetico...")
    G_bench = build_synthetic_benchmark_graph()
    print(f"Grafo creato: {len(G_bench.nodes)} nodi, {len(G_bench.edges)} archi.")
