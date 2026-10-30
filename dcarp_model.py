"""
DCARP: Dynamic Capacitated Arc Routing Problem.
Modello e Algoritmo di Ottimizzazione Dinamica in Tempo Reale basato sul
paradigma dei 'Compiti Virtuali' (Virtual Tasks) e gestione degli eventi di trigger.

Gestisce tre categorie primarie di imprevisti operativi reali:
1. EVENT_URGENT_DEMAND: Nuova richiesta stradale urgente estemporanea.
2. EVENT_ROAD_BLOCK: Blocco improvviso o congestione severa di un'arteria viaria.
3. EVENT_VEHICLE_BREAKDOWN: Guasto meccanico di un compattatore e riassegnazione rapida del carico residuo.
"""

from typing import Dict, List, Tuple, Any, Optional
import math
import heapq
import copy


def euclidean_dist(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def get_default_dcarp_scenario() -> Dict[str, Any]:
    """
    Ritorna lo scenario base per la simulazione dinamica del DCARP.
    Include la rete stradale cittadina, una flotta iniziale di compattatori con piano di marcia,
    e un set di eventi di trigger selezionabili dall'utente.
    """
    return {
        "name": "Igiene Urbana Dinamica & Re-Routing in Tempo Reale (DCARP)",
        "simulation_time_min": 75.0,  # Minuto 75 di turno operativo
        "depot": {
            "id": 0,
            "name": "Deposito Autoparco Centrale",
            "lat": 45.8850,
            "lon": 12.3010,
            "address": "Via dell'Industria 12, Treviso/Conegliano"
        },
        "vehicles": [
            {
                "id": "TRUCK_1",
                "name": "Compattatore_1 (Zona Nord)",
                "capacity_kg": 4500,
                "cost_per_km": 1.30,
                "current_node": 2,  # Al minuto 75 si trova all'Incrocio 2
                "current_load_kg": 2600,
                "status": "OPERATIVO"
            },
            {
                "id": "TRUCK_2",
                "name": "Compattatore_2 (Zona Sud)",
                "capacity_kg": 4500,
                "cost_per_km": 1.30,
                "current_node": 5,  # Al minuto 75 si trova all'Incrocio 5
                "current_load_kg": 2100,
                "status": "OPERATIVO"
            }
        ],
        "streets": [
            {
                "id": 1, "name": "Via Roma", "u": 1, "v": 2,
                "lat1": 45.8890, "lon1": 12.2980, "lat2": 45.8940, "lon2": 12.3050,
                "length_km": 1.8, "demand_kg": 1400, "status": "SERVED",
                "serviced_by": "TRUCK_1", "description": "Completata prima dell'evento"
            },
            {
                "id": 2, "name": "Corso Mazzini", "u": 2, "v": 3,
                "lat1": 45.8940, "lon1": 12.3050, "lat2": 45.8990, "lon2": 12.3120,
                "length_km": 2.0, "demand_kg": 1200, "status": "SERVED",
                "serviced_by": "TRUCK_1", "description": "Completata prima dell'evento"
            },
            {
                "id": 3, "name": "Via Garibaldi (Borgo Storico)", "u": 3, "v": 4,
                "lat1": 45.8990, "lon1": 12.3120, "lat2": 45.9050, "lon2": 12.3080,
                "length_km": 1.9, "demand_kg": 1100, "status": "PENDING",
                "original_vehicle": "TRUCK_1", "description": "In programma per TRUCK_1"
            },
            {
                "id": 4, "name": "Viale Carducci (Polo Ospedaliero)", "u": 4, "v": 1,
                "lat1": 45.9050, "lon1": 12.3080, "lat2": 45.8890, "lon2": 12.2980,
                "length_km": 2.2, "demand_kg": 1300, "status": "PENDING",
                "original_vehicle": "TRUCK_1", "description": "In programma per TRUCK_1"
            },
            {
                "id": 5, "name": "Via Cavour (Circonvallazione Sud)", "u": 5, "v": 6,
                "lat1": 45.8880, "lon1": 12.3200, "lat2": 45.8750, "lon2": 12.3100,
                "length_km": 2.4, "demand_kg": 2100, "status": "SERVED",
                "serviced_by": "TRUCK_2", "description": "Completata da TRUCK_2"
            },
            {
                "id": 6, "name": "Viale Europa (Distretto Commerciale Sud)", "u": 6, "v": 7,
                "lat1": 45.8750, "lon1": 12.3100, "lat2": 45.8670, "lon2": 12.2920,
                "length_km": 2.6, "demand_kg": 1500, "status": "PENDING",
                "original_vehicle": "TRUCK_2", "description": "In programma per TRUCK_2"
            },
            {
                "id": 7, "name": "Via Dante (Quartiere Residenziale)", "u": 7, "v": 2,
                "lat1": 45.8670, "lon1": 12.2920, "lat2": 45.8940, "lon2": 12.3050,
                "length_km": 2.5, "demand_kg": 1400, "status": "PENDING",
                "original_vehicle": "TRUCK_2", "description": "In programma per TRUCK_2"
            }
        ],
        "available_events": [
            {
                "type": "URGENT_DEMAND",
                "title": "Nuova Tratta Urgente (Segnalazione Improvvisa)",
                "description": "Segnalazione di emergenza per rifiuti ingombranti abbandonati o sgombero lastra di ghiaccio su Via dell'Ospedale.",
                "data": {
                    "street_id": 99,
                    "name": "Via dell'Ospedale (EMERGENZA)",
                    "u": 3, "v": 1,
                    "lat1": 45.8990, "lon1": 12.3120, "lat2": 45.8890, "lon2": 12.2980,
                    "length_km": 1.7,
                    "demand_kg": 1200,
                    "priority": "HIGH"
                }
            },
            {
                "type": "ROAD_BLOCK",
                "title": "Blocco Stradale / Congestione Improvvisa",
                "description": "Fuga di gas e cantiere urgente su Via Garibaldi (tratta 3-4): via completamente inagibile.",
                "data": {
                    "blocked_street_id": 3,
                    "blocked_u": 3,
                    "blocked_v": 4,
                    "reason": "Cantiere urgente e chiusura traffico Polizia Locale"
                }
            },
            {
                "type": "VEHICLE_BREAKDOWN",
                "title": "Guasto Meccanico Improvviso Veicolo (Avaria)",
                "description": "Compattatore_1 subisce un guasto al sistema idraulico all'Incrocio 2 e si arresta. Riassegnazione immediata del carico residuo.",
                "data": {
                    "broken_vehicle_id": "TRUCK_1",
                    "breakdown_node": 2,
                    "reason": "Guasto idraulico pressa compattatrice"
                }
            }
        ]
    }


def compute_dcarp_shortest_paths(
    all_nodes: List[int],
    streets: List[Dict[str, Any]],
    blocked_edge: Optional[Tuple[int, int]] = None
) -> Dict[int, Dict[int, float]]:
    """
    Calcola la matrice dei cammini minimi tenendo conto di eventuali archi bloccati.
    """
    adj: Dict[int, List[Tuple[int, float]]] = {n: [] for n in all_nodes}
    
    # Archi stradali
    for s in streets:
        u, v = int(s["u"]), int(s["v"])
        c = float(s.get("length_km", 2.0))
        # Se l'arco è bloccato, viene omesso dal grafo o assegnato costo enorme
        if blocked_edge and ((u == blocked_edge[0] and v == blocked_edge[1]) or (v == blocked_edge[0] and u == blocked_edge[1])):
            continue
        if u in adj and v in adj:
            adj[u].append((v, c))
            adj[v].append((u, c))

    # Connessione di transito generale tra nodi (se non direttamente adiacenti)
    for n1 in all_nodes:
        for n2 in all_nodes:
            if n1 >= n2:
                continue
            if n1 == 0 or n2 == 0:  # Deposito
                c = 2.5
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


def solve_dcarp(
    scenario: Dict[str, Any],
    trigger_event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Risolve il Dynamic Capacitated Arc Routing Problem applicando il paradigma dei 'Compiti Virtuali'.
    
    Fasi:
    1. Congelamento dello stato al minuto t_event (strade SERVED fissate).
    2. Proiezione delle posizioni correnti dei veicoli attivi come 'Virtual Tasks' (origini virtuali).
    3. Incorporamento della mutazione dinamica (richiesta urgente, strada chiusa o veicolo guasto).
    4. Re-ottimizzazione e riassegnazione rapida delle tratte residue con minimizzazione del disturbo.
    """
    depot = scenario["depot"]
    depot_id = int(depot.get("id", 0))
    event_type = trigger_event.get("type", "URGENT_DEMAND")
    event_data = trigger_event.get("data", {})

    streets_pool = copy.deepcopy(scenario["streets"])
    vehicles_pool = copy.deepcopy(scenario["vehicles"])

    event_logs: List[str] = []
    event_logs.append(f"⏱️ [t = {scenario.get('simulation_time_min', 75)} min] TRIGGER EVENTO RICEVUTO: {trigger_event.get('title', event_type)}")

    # 1. CONGELAMENTO STATO (FREEZE)
    already_served = [s for s in streets_pool if s.get("status") == "SERVED"]
    pending_streets = [s for s in streets_pool if s.get("status") == "PENDING"]

    event_logs.append(f"🔒 Stato congelato: {len(already_served)} tratte già completate e storicizzate; {len(pending_streets)} tratte pianificate residue.")

    # 2. GESTIONE SPECIFICA DELL'EVENTO DINAMICO
    blocked_edge: Optional[Tuple[int, int]] = None
    broken_vehicle_id: Optional[str] = None

    if event_type == "URGENT_DEMAND":
        new_street = {
            "id": event_data.get("street_id", 99),
            "name": event_data.get("name", "Nuova Via Urgente"),
            "u": int(event_data.get("u", 3)),
            "v": int(event_data.get("v", 1)),
            "lat1": float(event_data.get("lat1", 45.899)),
            "lon1": float(event_data.get("lon1", 12.312)),
            "lat2": float(event_data.get("lat2", 45.889)),
            "lon2": float(event_data.get("lon2", 12.298)),
            "length_km": float(event_data.get("length_km", 1.8)),
            "demand_kg": float(event_data.get("demand_kg", 1200)),
            "status": "PENDING",
            "is_urgent": True,
            "description": "Richiesta urgente estemporanea inserita in tempo reale"
        }
        pending_streets.append(new_street)
        event_logs.append(f"🚨 INSERIMENTO TRATTA URGENTE: '{new_street['name']}' ({new_street['demand_kg']} kg, {new_street['length_km']} km) aggiunta al pool delle vie da raccogliere con massima priorità.")

    elif event_type == "ROAD_BLOCK":
        blocked_u = int(event_data.get("blocked_u", 3))
        blocked_v = int(event_data.get("blocked_v", 4))
        blocked_edge = (blocked_u, blocked_v)
        event_logs.append(f"⛔ BLOCCO VIARIO: Arco tra incrocio {blocked_u} e {blocked_v} interrotto ({event_data.get('reason', 'Cantiere/Incidente')}). Ricalcolo percorsi con bypass obbligatorio.")

    elif event_type == "VEHICLE_BREAKDOWN":
        broken_vehicle_id = event_data.get("broken_vehicle_id", "TRUCK_1")
        for v in vehicles_pool:
            if v["id"] == broken_vehicle_id:
                v["status"] = "IN_AVARIA"
                event_logs.append(f"💥 AVARIA MECCANICA: {v['name']} fermo all'incrocio {v['current_node']}. Il mezzo viene rimosso dal servizio.")
        # Riassegna tutte le tratte pending del veicolo guasto al pool comune
        event_logs.append("🔄 Riassegnazione orfani: le tratte non ancora servite dal veicolo guasto vengono ridistribuite ai mezzi attivi.")

    # 3. GENERAZIONE DEI VIRTUAL TASKS (Origini virtuali con capacità residua)
    all_nodes = set([depot_id])
    for s in pending_streets + already_served:
        all_nodes.add(int(s["u"]))
        all_nodes.add(int(s["v"]))
    for v in vehicles_pool:
        all_nodes.add(int(v["current_node"]))

    all_nodes_list = sorted(list(all_nodes))
    dist_matrix = compute_dcarp_shortest_paths(all_nodes_list, pending_streets + already_served, blocked_edge)

    # Identifica i veicoli ancora operativi
    operational_vehicles = [v for v in vehicles_pool if v.get("status") != "IN_AVARIA"]
    if not operational_vehicles:
        return {
            "status": "INFEASIBLE_ALL_VEHICLES_BROKEN",
            "event_logs": event_logs,
            "message": "Nessun veicolo operativo residuo."
        }

    # Assegnazione euristica re-routing (Disruption Management)
    reoptimized_routes: Dict[str, Any] = {}
    unserved_residual = list(pending_streets)

    for v in operational_vehicles:
        vid = v["id"]
        vname = v["name"]
        cap_kg = float(v["capacity_kg"])
        cur_load = float(v.get("current_load_kg", 0.0))
        rem_cap = max(0.0, cap_kg - cur_load)
        cur_node = int(v["current_node"])

        event_logs.append(f"📌 Compito Virtuale attivato per {vname}: posizione attuale nodo {cur_node}, carico a bordo {cur_load} kg, capacità residua {rem_cap} kg.")

        v_assigned_streets = []
        v_movements = []
        tot_dh_km = 0.0
        tot_collected_post = 0.0

        # Euristica: seleziona le vie residue più vicine che rientrano nella capacità residua
        while unserved_residual:
            best_idx = -1
            best_dir = None
            best_score = float("inf")

            for idx, candidate in enumerate(unserved_residual):
                q = candidate["demand_kg"]
                if cur_load + q <= cap_kg * 1.05:  # Tolleranza 5% su compattazione massima in emergenza
                    d_u = dist_matrix[cur_node].get(candidate["u"], float("inf"))
                    d_v = dist_matrix[cur_node].get(candidate["v"], float("inf"))
                    # Priorità assoluta alle richieste urgenti
                    priority_factor = 0.2 if candidate.get("is_urgent") else 1.0

                    if d_u * priority_factor < best_score:
                        best_score = d_u * priority_factor
                        best_idx = idx
                        best_dir = (candidate["u"], candidate["v"])
                    if d_v * priority_factor < best_score:
                        best_score = d_v * priority_factor
                        best_idx = idx
                        best_dir = (candidate["v"], candidate["u"])

            if best_idx != -1:
                cand = unserved_residual.pop(best_idx)
                u_in, v_out = best_dir
                dh = dist_matrix[cur_node].get(u_in, 0.0)
                tot_dh_km += dh

                if dh > 0.05:
                    v_movements.append({
                        "type": "TRANSITO_BYPASS" if blocked_edge else "TRANSITO_DINAMICO",
                        "from_node": cur_node,
                        "to_node": u_in,
                        "cost_km": round(dh, 2),
                        "load_kg": round(cur_load, 1),
                        "description": f"Transito di riposizionamento verso inizio {cand['name']}"
                    })

                cur_load += cand["demand_kg"]
                tot_collected_post += cand["demand_kg"]
                v_movements.append({
                    "type": "SERVIZIO_URGENTE" if cand.get("is_urgent") else "SERVIZIO",
                    "street_id": cand["id"],
                    "street_name": cand["name"],
                    "from_node": u_in,
                    "to_node": v_out,
                    "length_km": cand.get("length_km", 2.0),
                    "demand_kg": cand["demand_kg"],
                    "load_kg": round(cur_load, 1),
                    "description": f"{'🚨 INTERVENTO URGENTE: ' if cand.get('is_urgent') else 'Raccolta riprogrammata: '}{cand['name']}"
                })
                v_assigned_streets.append(cand)
                cur_node = v_out
            else:
                break

        # Rientro al Deposito Centrale
        ret_dh = dist_matrix[cur_node].get(depot_id, 2.5)
        tot_dh_km += ret_dh
        v_movements.append({
            "type": "RIENTRO_DEPOSITO",
            "from_node": cur_node,
            "to_node": depot_id,
            "cost_km": round(ret_dh, 2),
            "load_kg": round(cur_load, 1),
            "description": f"Rientro al Deposito Centrale a fine turno per {vname}"
        })

        reoptimized_routes[vid] = {
            "vehicle_name": vname,
            "status": "OPERATIVO_RICALCOLATO",
            "virtual_start_node": v["current_node"],
            "initial_load_at_event_kg": v.get("current_load_kg", 0.0),
            "final_load_kg": round(cur_load, 1),
            "capacity_kg": cap_kg,
            "reassigned_streets": [s["name"] for s in v_assigned_streets],
            "streets_serviced_post_event": len(v_assigned_streets),
            "movements": v_movements,
            "deadhead_km": round(tot_dh_km, 2)
        }

    # Gestione mezzo guasto nel report
    for v in vehicles_pool:
        vid = v["id"]
        if vid not in reoptimized_routes:
            reoptimized_routes[vid] = {
                "vehicle_name": v["name"],
                "status": "IN_AVARIA_FERMO",
                "virtual_start_node": v["current_node"],
                "initial_load_at_event_kg": v.get("current_load_kg", 0.0),
                "final_load_kg": v.get("current_load_kg", 0.0),
                "capacity_kg": float(v["capacity_kg"]),
                "reassigned_streets": [],
                "streets_serviced_post_event": 0,
                "movements": [
                    {
                        "type": "AVARIA_STOP",
                        "from_node": v["current_node"],
                        "to_node": v["current_node"],
                        "description": f"💥 Mezzo fermo per guasto all'incrocio {v['current_node']}. Carico residuo riassegnato."
                    }
                ],
                "deadhead_km": 0.0
            }

    event_logs.append("✅ RE-OTTIMIZZAZIONE COMPLETATA: Tutti i compiti virtuali sono stati sincronizzati e il piano di marcia aggiornato con successo!")

    return {
        "status": "OPTIMAL_DYNAMIC",
        "simulation_time_min": scenario.get("simulation_time_min", 75.0),
        "trigger_event": trigger_event,
        "event_logs": event_logs,
        "vehicles": reoptimized_routes,
        "already_served_count": len(already_served),
        "already_served": already_served,
        "pending_serviced_count": len(pending_streets) - len(unserved_residual),
        "unserved_residual_count": len(unserved_residual),
        "unserved_residual": unserved_residual,
        "depot": depot,
        "disruption_kpi": {
            "disruption_severity": "ALTA" if broken_vehicle_id else ("MEDIA" if blocked_edge else "BASSA"),
            "operational_fleet_pct": round((len(operational_vehicles) / len(vehicles_pool)) * 100.0, 1),
            "unserved_loss_kg": sum(s["demand_kg"] for s in unserved_residual),
            "reassigned_streets_total": sum(len(r["reassigned_streets"]) for r in reoptimized_routes.values() if r["status"] != "IN_AVARIA_FERMO")
        }
    }
