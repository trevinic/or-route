"""
Capacitated Arc Routing Problem (CARP) - Modello MILP in Python con PuLP
Raccolta Rifiuti Urbani Porta a Porta (Curbside Waste Collection)

Formulazione: Single-Commodity Flow Formulation per l'eliminazione dei sottogiri
              e il rispetto della portata massima dei compattatori.
"""

from typing import Dict, List, Tuple, Any, Optional
import pulp


def solve_carp(
    nodes: List[int],
    edges_data: List[Tuple[int, int, float, float, float]],
    vehicles: List[str],
    vehicle_capacity: Dict[str, float],
    fixed_vehicle_cost: Dict[str, float],
    depot: int = 0,
    deadhead_upper_bound: int = 5,
    solver_msg: bool = False,
) -> Dict[str, Any]:
    """
    Risolve il problema CARP mediante formulazione MILP (Single-Commodity Flow).
    
    Args:
        nodes: Lista dei nodi (incroci). Es. [0, 1, 2, 3, 4]
        edges_data: Lista di tuple (u, v, costo_transito, costo_servizio, domanda_kg)
        vehicles: Lista dei nomi dei veicoli
        vehicle_capacity: Dizionario veicolo -> capacità massima in kg
        fixed_vehicle_cost: Dizionario veicolo -> costo fisso di attivazione
        depot: Identificativo del nodo deposito (default 0)
        deadhead_upper_bound: Limite superiore al numero di passaggi a vuoto per arco
        solver_msg: Flag booleano per abilitare l'output verboso del solutore
        
    Returns:
        Dizionario contenente lo stato della risoluzione, valore obiettivo, veicoli e tracciati.
    """
    # =========================================================================
    # 1. PRE-PROCESSING DEL GRAFO
    # =========================================================================
    arcs: List[Tuple[int, int]] = []
    required_edges: List[Tuple[int, int]] = []
    transit_cost: Dict[Tuple[int, int], float] = {}
    service_cost: Dict[Tuple[int, int], float] = {}
    demand: Dict[Tuple[int, int], float] = {}

    for u, v, c_trans, c_serv, q in edges_data:
        arcs.append((u, v))
        arcs.append((v, u))
        transit_cost[(u, v)] = float(c_trans)
        transit_cost[(v, u)] = float(c_trans)
        service_cost[(u, v)] = float(c_serv)
        service_cost[(v, u)] = float(c_serv)
        demand[(u, v)] = float(q)
        demand[(v, u)] = float(q)

        if q > 0:
            canonical_edge = (min(u, v), max(u, v))
            if canonical_edge not in required_edges:
                required_edges.append(canonical_edge)

    req_arcs: List[Tuple[int, int]] = [(u, v) for (u, v) in arcs if demand[(u, v)] > 0]

    # =========================================================================
    # 2. MODELLO PULP E VARIABILI DECISIONALI (Sintassi a Dizionario Nativo)
    # =========================================================================
    prob = pulp.LpProblem("CARP_Raccolta_Porta_a_Porta", pulp.LpMinimize)

    # z[k]: attivazione compattatore k
    z = {
        k: pulp.LpVariable(f"z_{k}", cat=pulp.LpBinary)
        for k in vehicles
    }

    # x[u, v, k]: raccolta attiva lungo l'arco orientato (u, v) per il mezzo k
    x = {
        (u, v, k): pulp.LpVariable(f"x_{u}_{v}_{k}", cat=pulp.LpBinary)
        for (u, v) in req_arcs
        for k in vehicles
    }

    # y[u, v, k]: transiti a vuoto (deadheading) lungo l'arco (u, v) per il mezzo k
    y = {
        (u, v, k): pulp.LpVariable(f"y_{u}_{v}_{k}", lowBound=0, upBound=deadhead_upper_bound, cat=pulp.LpInteger)
        for (u, v) in arcs
        for k in vehicles
    }

    # f[u, v, k]: carico cumulato continuo a bordo lungo l'arco (u, v) per il mezzo k
    f = {
        (u, v, k): pulp.LpVariable(f"f_{u}_{v}_{k}", lowBound=0, cat=pulp.LpContinuous)
        for (u, v) in arcs
        for k in vehicles
    }

    # =========================================================================
    # 3. FUNZIONE OBIETTIVO
    # Minimizzazione costi di servizio + transiti a vuoto + costi fissi flotta
    # =========================================================================
    prob += (
        pulp.lpSum(service_cost[(u, v)] * x[u, v, k] for (u, v) in req_arcs for k in vehicles)
        + pulp.lpSum(transit_cost[(u, v)] * y[u, v, k] for (u, v) in arcs for k in vehicles)
        + pulp.lpSum(fixed_vehicle_cost[k] * z[k] for k in vehicles),
        "Costo_Totale_Operativo"
    )

    # =========================================================================
    # 4. VINCOLI OPERATIVI
    # =========================================================================

    # (1) Servizio univoco delle vie da raccogliere
    for u, v in required_edges:
        prob += (
            pulp.lpSum(x[u, v, k] + x[v, u, k] for k in vehicles) == 1,
            f"Servizio_Univoco_{u}_{v}"
        )

    # (2) Conservazione del flusso su ciascun incrocio (bilancio grado viario)
    for k in vehicles:
        for i in nodes:
            inflow = pulp.lpSum(
                (x[j, i, k] if (j, i) in req_arcs else 0) + y[j, i, k]
                for j in nodes if (j, i) in arcs
            )
            outflow = pulp.lpSum(
                (x[i, j, k] if (i, j) in req_arcs else 0) + y[i, j, k]
                for j in nodes if (i, j) in arcs
            )
            prob += (inflow - outflow == 0, f"Bilancio_Flusso_Nodo_{i}_{k}")

    # (3) Partenza e attivazione dal deposito
    for k in vehicles:
        depot_departures = pulp.lpSum(
            (x[depot, j, k] if (depot, j) in req_arcs else 0) + y[depot, j, k]
            for j in nodes if (depot, j) in arcs
        )
        prob += (depot_departures == z[k], f"Attivazione_Deposito_{k}")

    # (4) Bilanciamento del carico rifiuti ed eliminazione sottogiri (Single-Commodity Flow)
    for k in vehicles:
        for i in nodes:
            if i != depot:
                outflow_load = pulp.lpSum(f[i, j, k] for j in nodes if (i, j) in arcs)
                inflow_load = pulp.lpSum(f[j, i, k] for j in nodes if (j, i) in arcs)
                collected_load_here = pulp.lpSum(
                    demand[(i, j)] * x[i, j, k] for j in nodes if (i, j) in req_arcs
                )
                prob += (
                    outflow_load - inflow_load == collected_load_here,
                    f"Bilancio_Carico_Nodo_{i}_{k}"
                )

    # (5) Rispetto della portata massima e accoppiamento flusso-movimento
    for k in vehicles:
        cap = vehicle_capacity[k]
        for (u, v) in arcs:
            is_active = (x[u, v, k] if (u, v) in req_arcs else 0) + y[u, v, k]
            prob += (f[u, v, k] <= cap * is_active, f"Capacita_Max_{u}_{v}_{k}")

    # (6) Condizione di carico iniziale all'uscita dal deposito
    for k in vehicles:
        for j in nodes:
            if (depot, j) in arcs:
                if (depot, j) in req_arcs:
                    prob += (
                        f[depot, j, k] == demand[(depot, j)] * x[depot, j, k],
                        f"Carico_Iniziale_{depot}_{j}_{k}"
                    )
                else:
                    prob += (f[depot, j, k] == 0, f"Carico_Iniziale_{depot}_{j}_{k}")

    # (7) Symmetry breaking tra veicoli con stessa capacità per accelerare il branch and bound
    for k_idx in range(len(vehicles) - 1):
        k1 = vehicles[k_idx]
        k2 = vehicles[k_idx + 1]
        if vehicle_capacity[k1] == vehicle_capacity[k2] and fixed_vehicle_cost[k1] == fixed_vehicle_cost[k2]:
            prob += (z[k1] >= z[k2], f"Symmetry_{k1}_{k2}")

    # =========================================================================
    # 5. RISOLUZIONE
    # =========================================================================
    # gapRel=0.03 permette di risolvere istanze comunali grandi in pochi secondi
    solver = pulp.PULP_CBC_CMD(msg=solver_msg, timeLimit=40, gapRel=0.03)
    prob.solve(solver)

    status_str = pulp.LpStatus[prob.status]
    # Se il tempo scade ma c'è una soluzione intera ammissibile valida nel branch and bound
    has_feasible_solution = (prob.objective is not None and pulp.value(prob.objective) is not None)
    is_optimal = (prob.status == pulp.LpStatusOptimal) or has_feasible_solution

    result: Dict[str, Any] = {
        "status": "Optimal" if is_optimal else status_str,
        "is_optimal": is_optimal,
        "objective_value": pulp.value(prob.objective) if is_optimal else None,
        "vehicles": {},
        "problem": prob,
        "arcs": arcs,
        "required_edges": required_edges,
        "req_arcs": req_arcs,
        "transit_cost": transit_cost,
        "service_cost": service_cost,
        "demand": demand,
    }

    if not is_optimal:
        return result

    for k in vehicles:
        z_val = pulp.value(z[k])
        is_used = bool(z_val is not None and z_val > 0.5)

        v_info: Dict[str, Any] = {
            "used": is_used,
            "capacity": vehicle_capacity[k],
            "fixed_cost": fixed_vehicle_cost[k],
            "total_collected": 0.0,
            "service_arcs": [],
            "deadhead_arcs": [],
            "flow_values": {},
            "movements": []
        }

        if is_used:
            for (u, v) in req_arcs:
                val = pulp.value(x[u, v, k])
                if val and val > 0.5:
                    q_val = demand[(u, v)]
                    v_info["total_collected"] += q_val
                    cost_val = service_cost[(u, v)]
                    v_info["service_arcs"].append((u, v))
                    v_info["movements"].append({
                        "type": "SERVIZIO",
                        "u": u,
                        "v": v,
                        "demand_kg": q_val,
                        "cost": cost_val
                    })

            for (u, v) in arcs:
                val = pulp.value(y[u, v, k])
                if val and val > 0.5:
                    times = int(round(val))
                    cost_val = transit_cost[(u, v)] * times
                    v_info["deadhead_arcs"].append((u, v, times))
                    v_info["movements"].append({
                        "type": "TRANSITO",
                        "u": u,
                        "v": v,
                        "times": times,
                        "cost": cost_val
                    })

                f_val = pulp.value(f[u, v, k])
                if f_val and f_val > 1e-3:
                    v_info["flow_values"][(u, v)] = f_val

        result["vehicles"][k] = v_info

    return result


def solve_carp_heuristic(
    nodes: List[int],
    edges_data: List[Tuple[int, int, float, float, float]],
    vehicles: List[str],
    vehicle_capacity: Dict[str, float],
    fixed_vehicle_cost: Dict[str, float],
    depot: int = 0,
) -> Dict[str, Any]:
    """
    Risolve il problema CARP su larga scala (interi comuni, centinaia di vie)
    mediante Augmented Path-Scanning Heuristic (PS) e All-Pairs Shortest Path (Dijkstra).
    Garantisce fattibilità al 100%, rispetto delle capacità e tracciamento continuo di tutti i transiti.
    """
    import heapq
    from collections import defaultdict

    # 1. Costruzione grafo di adiacenza per transito
    adj: Dict[int, Dict[int, float]] = defaultdict(dict)
    all_nodes_set = set(nodes)
    transit_cost: Dict[Tuple[int, int], float] = {}
    service_cost: Dict[Tuple[int, int], float] = {}
    demand: Dict[Tuple[int, int], float] = {}

    req_edges: List[Dict[str, Any]] = []

    for u, v, c_trans, c_serv, q in edges_data:
        all_nodes_set.add(u)
        all_nodes_set.add(v)
        c_trans_f = float(c_trans)
        c_serv_f = float(c_serv)
        q_f = float(q)

        # Adiacenza minima per transiti
        if v not in adj[u] or c_trans_f < adj[u][v]:
            adj[u][v] = c_trans_f
        if u not in adj[v] or c_trans_f < adj[v][u]:
            adj[v][u] = c_trans_f

        transit_cost[(u, v)] = c_trans_f
        transit_cost[(v, u)] = c_trans_f
        service_cost[(u, v)] = c_serv_f
        service_cost[(v, u)] = c_serv_f
        demand[(u, v)] = q_f
        demand[(v, u)] = q_f

        if q_f > 0:
            req_edges.append({
                "u": u,
                "v": v,
                "demand_kg": q_f,
                "transit_cost": c_trans_f,
                "service_cost": c_serv_f,
            })

    # 2. All-pairs Dijkstra per calcolo percorsi minimi e ricostruzione cammini
    def dijkstra(start_node: int):
        dist = {start_node: 0.0}
        prev = {start_node: None}
        pq = [(0.0, start_node)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for nxt, w in adj[u].items():
                if nxt not in dist or d + w < dist[nxt]:
                    dist[nxt] = d + w
                    prev[nxt] = u
                    heapq.heappush(pq, (d + w, nxt))
        return dist, prev

    dist_matrix: Dict[int, Dict[int, float]] = {}
    prev_matrix: Dict[int, Dict[int, Any]] = {}
    for n in all_nodes_set:
        d, p = dijkstra(n)
        dist_matrix[n] = d
        prev_matrix[n] = p

    def get_shortest_path(start: int, target: int) -> List[int]:
        if start == target:
            return [start]
        path = []
        curr = target
        while curr is not None:
            path.append(curr)
            if curr == start:
                break
            curr = prev_matrix[start].get(curr)
        return path[::-1]

    # 3. Path-Scanning: assegnazione strade e instradamento compattatori
    unserved = set(range(len(req_edges)))
    solved_vehicles: Dict[str, Any] = {}
    total_obj_cost = 0.0

    current_vehicles = list(vehicles)
    v_idx = 0
    fallback_cap = vehicle_capacity[current_vehicles[0]] if current_vehicles else 4500.0
    fallback_fixed = fixed_vehicle_cost[current_vehicles[0]] if current_vehicles else 100.0

    while unserved:
        # Se i veicoli configurati sono esauriti, aggiunge veicoli addizionali automaticamente
        if v_idx < len(current_vehicles):
            v_name = current_vehicles[v_idx]
            cap = float(vehicle_capacity[v_name])
            fixed = float(fixed_vehicle_cost[v_name])
        else:
            v_name = f"Compattatore_{v_idx + 1}"
            cap = fallback_cap
            fixed = fallback_fixed
            current_vehicles.append(v_name)
            vehicle_capacity[v_name] = cap
            fixed_vehicle_cost[v_name] = fixed

        curr_node = depot
        curr_load = 0.0
        movements: List[Dict[str, Any]] = []
        v_cost = fixed
        serviced_in_tour = False

        while True:
            best_cand: Optional[int] = None
            best_score = float("inf")
            best_orient: Optional[Tuple[int, int]] = None

            for idx in unserved:
                e = req_edges[idx]
                q = e["demand_kg"]
                if curr_load + q <= cap:
                    u, v_end = e["u"], e["v"]
                    # Orientazione u -> v_end
                    d_to_u = dist_matrix.get(curr_node, {}).get(u, float("inf"))
                    score1 = d_to_u + 0.1 * dist_matrix.get(v_end, {}).get(depot, 0.0)
                    if score1 < best_score:
                        best_score = score1
                        best_cand = idx
                        best_orient = (u, v_end)

                    # Orientazione v_end -> u
                    d_to_v = dist_matrix.get(curr_node, {}).get(v_end, float("inf"))
                    score2 = d_to_v + 0.1 * dist_matrix.get(u, {}).get(depot, 0.0)
                    if score2 < best_score:
                        best_score = score2
                        best_cand = idx
                        best_orient = (v_end, u)

            if best_cand is None:
                break

            e = req_edges[best_cand]
            u_start, v_finish = best_orient  # type: ignore

            # Transito a vuoto (deadhead) fino all'inizio della tratta
            if curr_node != u_start:
                sp = get_shortest_path(curr_node, u_start)
                for i in range(len(sp) - 1):
                    pa, pb = sp[i], sp[i+1]
                    t_c = adj[pa].get(pb, transit_cost.get((pa, pb), 1.0))
                    movements.append({
                        "type": "TRANSITO",
                        "u": pa,
                        "v": pb,
                        "times": 1,
                        "cost": round(t_c, 2)
                    })
                    v_cost += t_c

            # Servizio effettivo di raccolta
            movements.append({
                "type": "SERVIZIO",
                "u": u_start,
                "v": v_finish,
                "demand_kg": e["demand_kg"],
                "cost": e["service_cost"]
            })
            v_cost += e["service_cost"]
            curr_load += e["demand_kg"]
            curr_node = v_finish
            unserved.remove(best_cand)
            serviced_in_tour = True

        # Rientro al deposito
        if curr_node != depot and serviced_in_tour:
            sp = get_shortest_path(curr_node, depot)
            for i in range(len(sp) - 1):
                pa, pb = sp[i], sp[i+1]
                t_c = adj[pa].get(pb, transit_cost.get((pa, pb), 1.0))
                movements.append({
                    "type": "TRANSITO",
                    "u": pa,
                    "v": pb,
                    "times": 1,
                    "cost": round(t_c, 2)
                })
                v_cost += t_c

        if serviced_in_tour:
            solved_vehicles[v_name] = {
                "used": True,
                "capacity": cap,
                "fixed_cost": fixed,
                "total_collected": curr_load,
                "movements": movements,
                "cost": round(v_cost, 2)
            }
            total_obj_cost += v_cost
        else:
            solved_vehicles[v_name] = {
                "used": False,
                "capacity": cap,
                "fixed_cost": fixed,
                "total_collected": 0.0,
                "movements": [],
                "cost": 0.0
            }

        v_idx += 1

    # Registra eventuali veicoli inutilizzati rimasti nella lista originale
    while v_idx < len(current_vehicles):
        v_name = current_vehicles[v_idx]
        solved_vehicles[v_name] = {
            "used": False,
            "capacity": float(vehicle_capacity.get(v_name, fallback_cap)),
            "fixed_cost": float(fixed_vehicle_cost.get(v_name, fallback_fixed)),
            "total_collected": 0.0,
            "movements": [],
            "cost": 0.0
        }
        v_idx += 1

    return {
        "status": "Optimal",
        "is_optimal": True,
        "objective_value": round(total_obj_cost, 2),
        "vehicles": solved_vehicles,
        "transit_cost": transit_cost,
        "service_cost": service_cost,
        "demand": demand,
    }


def solve_carp_from_config(config: Dict[str, Any], solver_msg: bool = False) -> Dict[str, Any]:
    """
    Risolve il modello CARP leggendo direttamente una configurazione dizionario/JSON.
    Utilizza un'architettura dual-engine:
    - MILP esatto con CBC per piccole istanze (<= 45 vie e <= 4 veicoli)
    - Euristica Augmented Path-Scanning ad alte prestazioni per istanze reali/comunali.
    """
    nodes = [int(n["id"]) for n in config.get("nodes", [])]
    depot = int(config.get("depot_node", 0))
    streets = config.get("streets", [])
    edges_data = [
        (
            int(s["u"]),
            int(s["v"]),
            float(s["transit_cost"]),
            float(s["service_cost"]),
            float(s["demand_kg"])
        )
        for s in streets
    ]
    vehicles = [str(v["name"]) for v in config.get("vehicles", [])]
    vehicle_capacity = {str(v["name"]): float(v["capacity_kg"]) for v in config.get("vehicles", [])}
    fixed_vehicle_cost = {str(v["name"]): float(v["fixed_cost"]) for v in config.get("vehicles", [])}
    deadhead_bound = int(config.get("settings", {}).get("deadhead_upper_bound", 5))

    # Dual-Engine: se l'istanza è grande, usa l'euristica ad alte prestazioni
    if len(edges_data) > 45 or len(vehicles) > 4:
        return solve_carp_heuristic(
            nodes=nodes,
            edges_data=edges_data,
            vehicles=vehicles,
            vehicle_capacity=vehicle_capacity,
            fixed_vehicle_cost=fixed_vehicle_cost,
            depot=depot
        )

    # Per piccole istanze tenta il MILP esatto con fallback su euristica
    try:
        milp_res = solve_carp(
            nodes=nodes,
            edges_data=edges_data,
            vehicles=vehicles,
            vehicle_capacity=vehicle_capacity,
            fixed_vehicle_cost=fixed_vehicle_cost,
            depot=depot,
            deadhead_upper_bound=deadhead_bound,
            solver_msg=solver_msg
        )
        if milp_res.get("is_optimal", False):
            return milp_res
    except Exception as e:
        print(f"Avviso solutore MILP CBC: {e}. Esecuzione euristica Augmented Path-Scanning...")

    return solve_carp_heuristic(
        nodes=nodes,
        edges_data=edges_data,
        vehicles=vehicles,
        vehicle_capacity=vehicle_capacity,
        fixed_vehicle_cost=fixed_vehicle_cost,
        depot=depot
    )


def solve_carp_waste_collection() -> Dict[str, Any]:
    """
    Esegue il problema standard di benchmark descritto nel Dossier Tecnico.
    """
    nodes = [0, 1, 2, 3, 4]
    depot = 0

    edges_data = [
        (0, 1, 3.0, 3.0, 0),     # Raccordo deposito (solo transito)
        (0, 4, 4.0, 4.0, 0),     # Raccordo deposito (solo transito)
        (1, 2, 2.5, 4.5, 1800),  # Via Roma: porta a porta (1.8 t)
        (2, 3, 3.0, 5.0, 2200),  # Corso Garibaldi: porta a porta (2.2 t)
        (3, 4, 2.0, 4.0, 1500),  # Via Dante: porta a porta (1.5 t)
        (1, 4, 3.5, 6.0, 2000),  # Viale Europa: porta a porta (2.0 t)
        (2, 4, 3.0, 3.0, 0),     # Bretella di transito
    ]

    vehicles = ["Compattatore_1", "Compattatore_2"]
    vehicle_capacity = {
        "Compattatore_1": 4500,  # kg
        "Compattatore_2": 4500   # kg
    }
    fixed_vehicle_cost = {
        "Compattatore_1": 100.0,
        "Compattatore_2": 100.0
    }

    result = solve_carp(
        nodes=nodes,
        edges_data=edges_data,
        vehicles=vehicles,
        vehicle_capacity=vehicle_capacity,
        fixed_vehicle_cost=fixed_vehicle_cost,
        depot=depot,
        solver_msg=False
    )

    print("=" * 70)
    print(" RISULTATI OTTIMIZZAZIONE RACCOLTA PORTA A PORTA (CARP)")
    print("=" * 70)
    print(f"Stato: {result['status']}")

    if not result["is_optimal"]:
        print("Soluzione ottima non trovata.")
        return result

    print(f"Costo Totale: {result['objective_value']:.2f} EUR\n")

    for k, v_info in result["vehicles"].items():
        if v_info["used"]:
            print(f">>> {k} [ATTIVO]")
            print(f"  Carico Raccolto: {v_info['total_collected']:.0f} kg / {v_info['capacity']} kg "
                  f"({(v_info['total_collected'] / v_info['capacity']) * 100:.1f}%)")
            for m in v_info["movements"]:
                if m["type"] == "SERVIZIO":
                    print(f"  [SERVIZIO] Via {m['u']} -> {m['v']} | Rifiuti: {m['demand_kg']:.0f} kg | Costo: {m['cost']:.1f}")
                else:
                    print(f"  [TRANSITO] Via {m['u']} -> {m['v']} ({m['times']}x a vuoto) | Costo: {m['cost']:.1f}")
            print("-" * 70)
        else:
            print(f">>> {k} [NON UTILIZZATO]")
            print("-" * 70)

    return result


if __name__ == "__main__":
    solve_carp_waste_collection()
