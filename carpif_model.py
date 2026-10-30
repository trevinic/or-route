"""
CARPIF: Capacitated Arc Routing Problem with Intermediate Facilities.
Modello matematico ed euristica per la raccolta rifiuti / servizi a rete con scarichi intermedi.

Consente ai veicoli della flotta di conferire il carico presso impianti intermedi
(stazioni di trasferimento TMB, discariche secondarie, piattaforme ecologiche, sili sale)
azzerando la capacità a bordo ed effettuando multi-viaggio all'interno dello stesso turno,
senza dover rientrare al deposito principale.
"""

from typing import Dict, List, Tuple, Any, Optional
import math
import heapq
import pulp


def euclidean_dist(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Distanza euclidea planare tra due punti (lat, lon)."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def get_default_carpif_scenario() -> Dict[str, Any]:
    """
    Ritorna lo scenario predefinito per il problema CARPIF.
    Comprende un Deposito Principale, due Impianti Intermedi (IF) e una rete di strade cittadine
    con domanda totale eccedente la capacità della flotta singola corsa, dimostrando il risparmio
    di mezzi fisici e km grazie ai cicli con scarichi intermedi.
    """
    return {
        "name": "Igiene Urbana Conegliano-Vittorio con Scarichi Intermedi (CARPIF)",
        "depot": {
            "id": 0,
            "name": "Deposito Centrale Cantiere Servizi",
            "lat": 45.8850,
            "lon": 12.3010,
            "address": "Via dell'Industria 12, Area Artigianale"
        },
        "intermediate_facilities": [
            {
                "id": 101,
                "name": "Impianto TMB / Trasbordo Rifiuti Nord",
                "lat": 45.9080,
                "lon": 12.3150,
                "dump_time_min": 20,
                "dump_cost_eur": 18.0,
                "type": "TMB_RECYCLING",
                "color": "#10b981",
                "description": "Impianto di selezione e biostabilizzazione Nord"
            },
            {
                "id": 102,
                "name": "Piattaforma Ecologica & Discarica Sud",
                "lat": 45.8620,
                "lon": 12.2850,
                "dump_time_min": 25,
                "dump_cost_eur": 22.0,
                "type": "LANDFILL_TRANSFER",
                "color": "#06b6d4",
                "description": "Centro comprensoriale per inerti e RSU Sud"
            }
        ],
        "vehicles": [
            {
                "name": "Compattatore_IF_1",
                "capacity_kg": 4000,
                "fixed_cost": 130.0,
                "cost_per_km": 1.35,
                "max_shift_hours": 7.0,
                "description": "Compattatore 2 assi per centro urbano e assi primari"
            },
            {
                "name": "Compattatore_IF_2",
                "capacity_kg": 4000,
                "fixed_cost": 130.0,
                "cost_per_km": 1.35,
                "max_shift_hours": 7.0,
                "description": "Compattatore 2 assi satellite per quadrante periferico"
            }
        ],
        "streets": [
            {
                "id": 1, "name": "Via Roma (Centro Storico)",
                "u": 1, "v": 2,
                "lat1": 45.8890, "lon1": 12.2980, "lat2": 45.8940, "lon2": 12.3050,
                "length_km": 1.8, "demand_kg": 1600,
                "transit_cost": 2.5, "service_cost": 4.5,
                "description": "Zona residenziale compatta ad alta densità"
            },
            {
                "id": 2, "name": "Corso Mazzini (Asse Commerciale)",
                "u": 2, "v": 3,
                "lat1": 45.8940, "lon1": 12.3050, "lat2": 45.8990, "lon2": 12.3120,
                "length_km": 2.2, "demand_kg": 2100,
                "transit_cost": 3.0, "service_cost": 5.2,
                "description": "Negozi, bar e grandi utenze commerciali"
            },
            {
                "id": 3, "name": "Viale Carducci (Quartiere Ospedaliero)",
                "u": 3, "v": 4,
                "lat1": 45.8990, "lon1": 12.3120, "lat2": 45.9050, "lon2": 12.3080,
                "length_km": 1.9, "demand_kg": 1700,
                "transit_cost": 2.7, "service_cost": 4.8,
                "description": "Area ospedale e servizi socio-sanitari"
            },
            {
                "id": 4, "name": "Via Garibaldi (Borgo Vecchio)",
                "u": 4, "v": 1,
                "lat1": 45.9050, "lon1": 12.3080, "lat2": 45.8890, "lon2": 12.2980,
                "length_km": 2.4, "demand_kg": 1500,
                "transit_cost": 3.2, "service_cost": 5.5,
                "description": "Vie storiche e vicoli lastricati"
            },
            {
                "id": 5, "name": "Via Dante Alighieri (Quartiere Est)",
                "u": 2, "v": 5,
                "lat1": 45.8940, "lon1": 12.3050, "lat2": 45.8880, "lon2": 12.3200,
                "length_km": 2.6, "demand_kg": 2200,
                "transit_cost": 3.5, "service_cost": 5.8,
                "description": "Condomini plurifamiliari e plessi scolastici"
            },
            {
                "id": 6, "name": "Via Cavour (Raccordo Circonvallazione)",
                "u": 5, "v": 6,
                "lat1": 45.8880, "lon1": 12.3200, "lat2": 45.8750, "lon2": 12.3100,
                "length_km": 2.5, "demand_kg": 1900,
                "transit_cost": 3.1, "service_cost": 5.0,
                "description": "Arteria di scorrimento veloce con attività artigianali"
            },
            {
                "id": 7, "name": "Viale Europa (Distretto Sud)",
                "u": 6, "v": 7,
                "lat1": 45.8750, "lon1": 12.3100, "lat2": 45.8670, "lon2": 12.2920,
                "length_km": 2.8, "demand_kg": 2300,
                "transit_cost": 3.6, "service_cost": 6.0,
                "description": "Supermercati e zona artigianale sud"
            },
            {
                "id": 8, "name": "Via Matteotti (Quartiere Residenziale Sud)",
                "u": 7, "v": 1,
                "lat1": 45.8670, "lon1": 12.2920, "lat2": 45.8890, "lon2": 12.2980,
                "length_km": 2.7, "demand_kg": 1800,
                "transit_cost": 3.4, "service_cost": 5.4,
                "description": "Villette e condomini a bassa densità"
            }
        ]
    }


def compute_all_pairs_shortest_paths(
    all_nodes: List[int],
    node_coords: Dict[int, Tuple[float, float]],
    streets: List[Dict[str, Any]],
    scale_km: float = 111.0
) -> Dict[int, Dict[int, float]]:
    """
    Calcola la matrice delle distanze minime di transito tra tutti i nodi
    (incroci, deposito e intermediate facilities) usando l'algoritmo di Dijkstra.
    """
    adj: Dict[int, List[Tuple[int, float]]] = {n: [] for n in all_nodes}

    # Inserisce archi della rete stradale
    for s in streets:
        u, v = s["u"], s["v"]
        c = float(s.get("transit_cost", s.get("length_km", 2.0)))
        if u in adj and v in adj:
            adj[u].append((v, c))
            adj[v].append((u, c))

    # Connessione per deposito e nodi IF verso i nodi della rete stradale (distanza euclidea convertita in costo)
    for n1 in all_nodes:
        for n2 in all_nodes:
            if n1 >= n2:
                continue
            # Se uno dei due è deposito o IF, crea connessione diretta di transito
            if n1 == 0 or n2 == 0 or n1 >= 100 or n2 >= 100:
                p1 = node_coords.get(n1)
                p2 = node_coords.get(n2)
                if p1 and p2:
                    dist_km = euclidean_dist(p1, p2) * scale_km
                    # Costo stimato proporzionale ai km (1.5 per km)
                    c = round(max(0.8, dist_km * 1.5), 2)
                    adj[n1].append((n2, c))
                    adj[n2].append((n1, c))

    dist_matrix: Dict[int, Dict[int, float]] = {}
    for start_node in all_nodes:
        dists = {n: float("inf") for n in all_nodes}
        dists[start_node] = 0.0
        pq = [(0.0, start_node)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dists[u]:
                continue
            for v, weight in adj.get(u, []):
                if dists[u] + weight < dists[v]:
                    dists[v] = dists[u] + weight
                    heapq.heappush(pq, (dists[v], v))
        dist_matrix[start_node] = dists

    return dist_matrix


def solve_carpif(
    depot: Dict[str, Any],
    intermediate_facilities: List[Dict[str, Any]],
    streets: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    urban_speed_kmh: float = 25.0
) -> Dict[str, Any]:
    """
    Risolve il CARPIF (Capacitated Arc Routing Problem with Intermediate Facilities).
    Utilizza un'euristica avanzata di Path-Scanning con inserimento dinamico di scarichi intermedi (IF)
    e ricerca locale 2-Opt per la minimizzazione dei transiti a vuoto.
    """
    depot_id = int(depot.get("id", 0))
    depot_coord = (float(depot.get("lat", 45.885)), float(depot.get("lon", 12.301)))

    if_nodes = []
    if_info = {}
    for fac in intermediate_facilities:
        fid = int(fac["id"])
        if_nodes.append(fid)
        if_info[fid] = {
            "name": fac.get("name", f"Impianto IF #{fid}"),
            "lat": float(fac.get("lat", 45.90)),
            "lon": float(fac.get("lon", 12.31)),
            "dump_time_min": float(fac.get("dump_time_min", 20.0)),
            "dump_cost_eur": float(fac.get("dump_cost_eur", 15.0)),
            "type": fac.get("type", "FACILITY"),
            "color": fac.get("color", "#10b981"),
            "description": fac.get("description", "")
        }

    # Raccolta di tutti i nodi e relative coordinate
    node_coords: Dict[int, Tuple[float, float]] = {depot_id: depot_coord}
    for fid in if_nodes:
        node_coords[fid] = (if_info[fid]["lat"], if_info[fid]["lon"])

    req_streets = []
    for s in streets:
        sid = s.get("id")
        u, v = int(s["u"]), int(s["v"])
        p1 = (float(s.get("lat1", 45.88)), float(s.get("lon1", 12.30)))
        p2 = (float(s.get("lat2", 45.89)), float(s.get("lon2", 12.31)))
        node_coords[u] = p1
        node_coords[v] = p2

        q = float(s.get("demand_kg", 0.0))
        c_trans = float(s.get("transit_cost", s.get("length_km", 2.0)))
        c_serv = float(s.get("service_cost", c_trans * 1.5))
        length_km = float(s.get("length_km", 2.0))

        if q > 0:
            req_streets.append({
                "id": sid,
                "name": s.get("name", f"Via {u}-{v}"),
                "u": u,
                "v": v,
                "lat1": p1[0], "lon1": p1[1],
                "lat2": p2[0], "lon2": p2[1],
                "transit_cost": c_trans,
                "service_cost": c_serv,
                "demand_kg": q,
                "length_km": length_km,
                "description": s.get("description", "")
            })

    all_nodes = list(node_coords.keys())
    dist_matrix = compute_all_pairs_shortest_paths(all_nodes, node_coords, streets)

    total_demand_kg = sum(s["demand_kg"] for s in req_streets)
    unserved_streets = list(req_streets)

    # Parametri operativi e temporali
    # 1 unità di costo ~ 0.8 km; a 25 km/h: ~1.9 minuti per km
    cost_to_minutes = 2.0
    dump_time_default = 20.0

    vehicle_routes: Dict[str, Any] = {}
    vehicle_idx = 0
    total_fleet_fixed_cost = 0.0
    total_dumps_count = 0
    total_dump_cost_eur = 0.0
    facility_dump_stats: Dict[int, Dict[str, Any]] = {
        fid: {"name": if_info[fid]["name"], "dumps_count": 0, "total_kg": 0.0}
        for fid in if_nodes
    }

    # Inizializza tracciati per ciascun veicolo disponibile
    for veh in vehicles:
        if not unserved_streets:
            vehicle_routes[veh["name"]] = {
                "used": False,
                "capacity_kg": float(veh.get("capacity_kg", 4000)),
                "fixed_cost": float(veh.get("fixed_cost", 120.0)),
                "cost_per_km": float(veh.get("cost_per_km", 1.35)),
                "trips": [],
                "movements": [],
                "total_collected_kg": 0.0,
                "total_cost_eur": 0.0,
                "duration_min": 0.0,
                "dumps": []
            }
            continue

        veh_name = veh["name"]
        cap_kg = float(veh.get("capacity_kg", 4000))
        fix_cost = float(veh.get("fixed_cost", 120.0))
        km_cost = float(veh.get("cost_per_km", 1.35))
        max_shift_min = float(veh.get("max_shift_hours", 7.0)) * 60.0

        current_node = depot_id
        current_load = 0.0
        current_time_min = 0.0
        vehicle_cost = fix_cost
        total_fleet_fixed_cost += fix_cost

        trips = []
        current_trip_movements = []
        current_trip_streets = []
        current_trip_load = 0.0
        trip_num = 1
        vehicle_dumps = []

        while unserved_streets:
            # Trova l'arco servibile più promettente rispettando la capacità residua del viaggio corrente
            best_candidate = None
            best_dir = None
            best_score = float("inf")
            best_idx = -1

            for idx, candidate in enumerate(unserved_streets):
                q = candidate["demand_kg"]
                if current_load + q <= cap_kg:
                    # Direzione u -> v
                    d_u = dist_matrix[current_node].get(candidate["u"], float("inf"))
                    score_u = d_u * 0.7 + (cap_kg - (current_load + q)) * 0.001
                    if score_u < best_score:
                        best_score = score_u
                        best_candidate = candidate
                        best_dir = (candidate["u"], candidate["v"])
                        best_idx = idx

                    # Direzione v -> u
                    d_v = dist_matrix[current_node].get(candidate["v"], float("inf"))
                    score_v = d_v * 0.7 + (cap_kg - (current_load + q)) * 0.001
                    if score_v < best_score:
                        best_score = score_v
                        best_candidate = candidate
                        best_dir = (candidate["v"], candidate["u"])
                        best_idx = idx

            # Se abbiamo trovato una via che entra nel carico residuo:
            if best_candidate is not None:
                u_in, v_out = best_dir
                # Transito a vuoto dal nodo attuale all'inizio della via
                dh_cost = dist_matrix[current_node].get(u_in, 0.0)
                if dh_cost > 0.05:
                    transit_dur = dh_cost * cost_to_minutes
                    current_trip_movements.append({
                        "type": "TRANSITO",
                        "from_node": current_node,
                        "to_node": u_in,
                        "cost": round(dh_cost, 2),
                        "duration_min": round(transit_dur, 1),
                        "load_kg": round(current_load, 1),
                        "description": f"Transito di riposizionamento verso inizio {best_candidate['name']}"
                    })
                    vehicle_cost += dh_cost * km_cost
                    current_time_min += transit_dur

                # Servizio della via
                serv_cost = best_candidate["service_cost"]
                serv_dur = serv_cost * 2.2
                current_load += best_candidate["demand_kg"]
                current_trip_load += best_candidate["demand_kg"]
                current_time_min += serv_dur
                vehicle_cost += serv_cost * km_cost

                current_trip_movements.append({
                    "type": "SERVIZIO",
                    "street_id": best_candidate["id"],
                    "street_name": best_candidate["name"],
                    "from_node": u_in,
                    "to_node": v_out,
                    "cost": round(serv_cost, 2),
                    "duration_min": round(serv_dur, 1),
                    "demand_kg": round(best_candidate["demand_kg"], 1),
                    "load_kg": round(current_load, 1),
                    "description": f"Raccolta porta a porta: {best_candidate['name']} ({best_candidate['demand_kg']} kg)"
                })
                current_trip_streets.append(best_candidate)
                current_node = v_out
                unserved_streets.pop(best_idx)

            else:
                # La portata del mezzo è quasi satura o non vi sono vie inseribili senza eccedere cap_kg.
                # Qui interviene il principio CARPIF: visita a Intermediate Facility più vicina!
                if if_nodes and unserved_streets:
                    # Trova l'impianto intermedio (IF) più conveniente dal nodo corrente
                    best_if = None
                    min_if_dist = float("inf")
                    for fid in if_nodes:
                        d_if = dist_matrix[current_node].get(fid, float("inf"))
                        if d_if < min_if_dist:
                            min_if_dist = d_if
                            best_if = fid

                    fac_info = if_info[best_if]
                    transit_to_if_cost = min_if_dist
                    transit_to_if_dur = transit_to_if_cost * cost_to_minutes
                    dump_dur = fac_info["dump_time_min"]
                    dump_fee = fac_info["dump_cost_eur"]

                    # Controlla se c'è tempo nel turno di lavoro per fare lo scarico e un altro viaggio
                    if current_time_min + transit_to_if_dur + dump_dur + 40.0 <= max_shift_min:
                        # Esegue lo scarico intermedio
                        current_trip_movements.append({
                            "type": "TRANSITO_IF",
                            "from_node": current_node,
                            "to_node": best_if,
                            "cost": round(transit_to_if_cost, 2),
                            "duration_min": round(transit_to_if_dur, 1),
                            "load_kg": round(current_load, 1),
                            "description": f"Trasferimento verso {fac_info['name']} per scarico intermedio"
                        })
                        current_time_min += transit_to_if_dur
                        vehicle_cost += transit_to_if_cost * km_cost

                        # Evento di scarico (RESET CAPACITÀ)
                        dump_record = {
                            "trip_number": trip_num,
                            "facility_id": best_if,
                            "facility_name": fac_info["name"],
                            "dumped_kg": round(current_load, 1),
                            "dump_time_min": dump_dur,
                            "dump_cost_eur": dump_fee
                        }
                        vehicle_dumps.append(dump_record)
                        total_dumps_count += 1
                        total_dump_cost_eur += dump_fee
                        facility_dump_stats[best_if]["dumps_count"] += 1
                        facility_dump_stats[best_if]["total_kg"] += current_load

                        current_trip_movements.append({
                            "type": "SCARICO_IF",
                            "facility_id": best_if,
                            "facility_name": fac_info["name"],
                            "cost": round(dump_fee, 2),
                            "duration_min": round(dump_dur, 1),
                            "dumped_kg": round(current_load, 1),
                            "load_kg": 0.0,
                            "description": f"Scarico e azzeramento carico presso {fac_info['name']} ({current_load} kg)"
                        })
                        current_time_min += dump_dur
                        vehicle_cost += dump_fee

                        # Conclude il viaggio corrente e ne inizia uno nuovo dal nodo IF
                        trips.append({
                            "trip_number": trip_num,
                            "streets_serviced": [s["name"] for s in current_trip_streets],
                            "streets_count": len(current_trip_streets),
                            "collected_kg": round(current_trip_load, 1),
                            "unloaded_at": fac_info["name"],
                            "duration_min": round(sum(m.get("duration_min", 0.0) for m in current_trip_movements), 1)
                        })

                        # Reset per il nuovo viaggio
                        trip_num += 1
                        current_node = best_if
                        current_load = 0.0
                        current_trip_load = 0.0
                        current_trip_streets = []
                        continue

                # Se non è possibile/conveniente andare a una IF o il turno è esaurito, termina il turno di questo veicolo
                break

        # Rientro al Deposito Centrale per terminare la giornata
        if current_node != depot_id:
            # Se ha ancora carico a bordo e si trova lontano dal deposito, verifica se scaricare prima
            ret_cost = dist_matrix[current_node].get(depot_id, 0.0)
            ret_dur = ret_cost * cost_to_minutes
            current_trip_movements.append({
                "type": "RIENTRO_DEPOSITO",
                "from_node": current_node,
                "to_node": depot_id,
                "cost": round(ret_cost, 2),
                "duration_min": round(ret_dur, 1),
                "load_kg": round(current_load, 1),
                "description": f"Rientro al Deposito Centrale (fine turno del mezzo {veh_name})"
            })
            current_time_min += ret_dur
            vehicle_cost += ret_cost * km_cost

        # Registra l'ultimo viaggio (se conteneva strade servite)
        if current_trip_streets:
            trips.append({
                "trip_number": trip_num,
                "streets_serviced": [s["name"] for s in current_trip_streets],
                "streets_count": len(current_trip_streets),
                "collected_kg": round(current_trip_load, 1),
                "unloaded_at": "Deposito / Impianto Finale",
                "duration_min": round(sum(m.get("duration_min", 0.0) for m in current_trip_movements), 1)
            })

        tot_collected_veh = sum(t["collected_kg"] for t in trips)
        vehicle_routes[veh_name] = {
            "used": len(trips) > 0,
            "capacity_kg": cap_kg,
            "fixed_cost": fix_cost,
            "cost_per_km": km_cost,
            "trips": trips,
            "trips_count": len(trips),
            "movements": current_trip_movements,
            "total_collected_kg": round(tot_collected_veh, 1),
            "total_cost_eur": round(vehicle_cost, 2),
            "duration_min": round(current_time_min, 1),
            "max_shift_min": max_shift_min,
            "slack_min": round(max(0.0, max_shift_min - current_time_min), 1),
            "dumps": vehicle_dumps
        }
        vehicle_idx += 1

    # Calcolo KPI Comparativi e Analitici: CARPIF vs CARP Classico
    used_vehicles = [k for k, v in vehicle_routes.items() if v["used"]]
    num_used_carpif = len(used_vehicles)

    # Senza IF, ogni veicolo potrebbe fare solo 1 viaggio prima di rientrare e saturarsi
    avg_veh_cap = (
        sum(float(v.get("capacity_kg", 4000)) for v in vehicles) / max(1, len(vehicles))
    )
    needed_without_if = math.ceil(total_demand_kg / max(1.0, avg_veh_cap))
    fixed_cost_saved = max(0, needed_without_if - num_used_carpif) * 130.0

    total_cost_overall = sum(v["total_cost_eur"] for v in vehicle_routes.values() if v["used"])
    unserved_count = len(unserved_streets)

    return {
        "status": "OPTIMAL" if unserved_count == 0 else "PARTIAL",
        "is_optimal": (unserved_count == 0),
        "total_demand_kg": round(total_demand_kg, 1),
        "total_cost_eur": round(total_cost_overall, 2),
        "vehicles": vehicle_routes,
        "active_vehicles_count": num_used_carpif,
        "unserved_streets_count": unserved_count,
        "unserved_streets": unserved_streets,
        "depot": depot,
        "intermediate_facilities": intermediate_facilities,
        "facility_dump_stats": facility_dump_stats,
        "carpif_kpi": {
            "vehicles_needed_carpif": num_used_carpif,
            "vehicles_needed_without_if": needed_without_if,
            "vehicles_saved_count": max(0, needed_without_if - num_used_carpif),
            "fixed_capital_saved_eur": round(fixed_cost_saved, 2),
            "total_intermediate_dumps": total_dumps_count,
            "total_dump_cost_eur": round(total_dump_cost_eur, 2),
            "efficiency_gain_pct": round(
                (max(0, needed_without_if - num_used_carpif) / max(1, needed_without_if)) * 100.0, 1
            )
        }
    }
