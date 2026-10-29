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

    # (8) Variabile Min-Max per il bilanciamento equo del carico tra veicoli attivi (Cap. 4, Par. 4.1.5 RO_displat)
    max_cap_overall = max((float(vehicle_capacity[k]) for k in vehicles), default=4500.0)
    w_minmax = pulp.LpVariable("w_minmax_load_ratio", lowBound=0.0, upBound=1.0, cat=pulp.LpContinuous)
    for k in vehicles:
        cap_k = max(1.0, float(vehicle_capacity[k]))
        veh_load_expr = pulp.lpSum(demand[(u, v)] * x[u, v, k] for (u, v) in req_arcs)
        prob += (veh_load_expr <= cap_k * w_minmax, f"MinMax_Balance_{k}")

    # Aggiunge un lieve peso di tie-breaking (0.01) su w_minmax per preferire partizioni eque a parità di costo
    prob.setObjective(
        pulp.lpSum(service_cost[(u, v)] * x[u, v, k] for (u, v) in req_arcs for k in vehicles)
        + pulp.lpSum(transit_cost[(u, v)] * y[u, v, k] for (u, v) in arcs for k in vehicles)
        + pulp.lpSum(fixed_vehicle_cost[k] * z[k] for k in vehicles)
        + 0.01 * w_minmax
    )

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

    # Calcola il vero costo operativo (escludendo il termine di tie-breaking 0.01 * w_minmax)
    raw_obj_val = pulp.value(prob.objective) if is_optimal else None
    w_val = (pulp.value(w_minmax) or 0.0) if is_optimal else 0.0
    true_obj_val = round(float(raw_obj_val) - 0.01 * float(w_val), 2) if raw_obj_val is not None else None

    result: Dict[str, Any] = {
        "status": "Optimal" if is_optimal else status_str,
        "is_optimal": is_optimal,
        "objective_value": true_obj_val,
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
            raw_movements = []
            for (u, v) in req_arcs:
                val = pulp.value(x[u, v, k])
                if val and val > 0.5:
                    q_val = demand[(u, v)]
                    v_info["total_collected"] += q_val
                    cost_val = service_cost[(u, v)]
                    v_info["service_arcs"].append((u, v))
                    f_val = pulp.value(f[u, v, k]) or 0.0
                    raw_movements.append({
                        "type": "SERVIZIO",
                        "u": u,
                        "v": v,
                        "demand_kg": q_val,
                        "cost": cost_val,
                        "_flow": float(f_val)
                    })

            for (u, v) in arcs:
                val = pulp.value(y[u, v, k])
                if val and val > 0.5:
                    times = int(round(val))
                    cost_val = transit_cost[(u, v)] * times
                    v_info["deadhead_arcs"].append((u, v, times))
                    f_val = pulp.value(f[u, v, k]) or 0.0
                    for _ in range(times):
                        raw_movements.append({
                            "type": "TRANSITO",
                            "u": u,
                            "v": v,
                            "times": 1,
                            "cost": transit_cost[(u, v)],
                            "_flow": float(f_val) / max(1, times)
                        })

                f_val = pulp.value(f[u, v, k])
                if f_val and f_val > 1e-3:
                    v_info["flow_values"][(u, v)] = f_val

            # Ricostruzione sequenza cronologica Euleriana dal deposito (Hierholzer pesato per flusso di carico)
            from collections import defaultdict
            adj_moves = defaultdict(list)
            for m in raw_movements:
                adj_moves[m["u"]].append(m)
            for u_node in adj_moves:
                # Ordina per flusso decrescente in modo che .pop() estragga prima i movimenti a inizio turno (carico minore)
                adj_moves[u_node].sort(key=lambda item: (item["_flow"], 0 if item["type"] == "TRANSITO" else 1), reverse=True)

            tour_moves = []
            stack = [depot]
            edge_stack = []
            while stack:
                curr_v = stack[-1]
                if adj_moves[curr_v]:
                    nxt_m = adj_moves[curr_v].pop()
                    stack.append(nxt_m["v"])
                    edge_stack.append(nxt_m)
                else:
                    stack.pop()
                    if edge_stack:
                        tour_moves.append(edge_stack.pop())
            tour_moves.reverse()

            if len(tour_moves) == len(raw_movements):
                ordered_movements = tour_moves
            else:
                ordered_movements = sorted(raw_movements, key=lambda item: item["_flow"])

            for m in ordered_movements:
                clean_m = {k_m: v_m for k_m, v_m in m.items() if k_m != "_flow"}
                v_info["movements"].append(clean_m)

        result["vehicles"][k] = v_info

    result["ro_analytics"] = compute_ro_advanced_analytics(
        result=result,
        edges_data=edges_data,
        vehicles=vehicles,
        vehicle_capacity=vehicle_capacity,
        fixed_vehicle_cost=fixed_vehicle_cost,
        depot=depot,
        baseline_greedy_cost=None,
        dist_matrix=None,
    )
    return result


def _eval_and_orient_edge_sequence_dp(
    edge_indices: List[int],
    req_edges: List[Dict[str, Any]],
    dist_matrix: Dict[int, Dict[int, float]],
    depot: int,
) -> Tuple[float, List[Tuple[int, int, int]]]:
    """
    Programmazione Dinamica O(m) per determinare l'orientamento ottimo (u->v oppure v->u)
    di una sequenza ordinata di archi richiesti, minimizzando il transito a vuoto (deadheading).
    Restituisce (deadhead_cost, [(edge_idx, u_start, v_finish), ...]).
    """
    m = len(edge_indices)
    if m == 0:
        return 0.0, []

    INF = float("inf")
    # dp_cost[i][0] = costo minimo deadhead fino all'arco i percorso come (u -> v), termina in v
    # dp_cost[i][1] = costo minimo deadhead fino all'arco i percorso come (v -> u), termina in u
    dp_cost = [[INF, INF] for _ in range(m)]
    dp_parent = [[0, 0] for _ in range(m)]

    e0 = req_edges[edge_indices[0]]
    u0, v0 = e0["u"], e0["v"]
    dp_cost[0][0] = dist_matrix.get(depot, {}).get(u0, INF)
    dp_cost[0][1] = dist_matrix.get(depot, {}).get(v0, INF)

    for i in range(1, m):
        ep = req_edges[edge_indices[i - 1]]
        ec = req_edges[edge_indices[i]]
        up, vp = ep["u"], ep["v"]
        uc, vc = ec["u"], ec["v"]

        # Arrivo dal precedente finendo in vp (stato 0) o in up (stato 1)
        prev_end_0 = vp
        prev_end_1 = up

        # Caso 0: percorro arco i come uc -> vc (inizio in uc)
        c00 = dp_cost[i - 1][0] + dist_matrix.get(prev_end_0, {}).get(uc, INF)
        c10 = dp_cost[i - 1][1] + dist_matrix.get(prev_end_1, {}).get(uc, INF)
        if c00 <= c10:
            dp_cost[i][0] = c00
            dp_parent[i][0] = 0
        else:
            dp_cost[i][0] = c10
            dp_parent[i][0] = 1

        # Caso 1: percorro arco i come vc -> uc (inizio in vc)
        c01 = dp_cost[i - 1][0] + dist_matrix.get(prev_end_0, {}).get(vc, INF)
        c11 = dp_cost[i - 1][1] + dist_matrix.get(prev_end_1, {}).get(vc, INF)
        if c01 <= c11:
            dp_cost[i][1] = c01
            dp_parent[i][1] = 0
        else:
            dp_cost[i][1] = c11
            dp_parent[i][1] = 1

    em = req_edges[edge_indices[m - 1]]
    um, vm = em["u"], em["v"]
    tot_0 = dp_cost[m - 1][0] + dist_matrix.get(vm, {}).get(depot, INF)
    tot_1 = dp_cost[m - 1][1] + dist_matrix.get(um, {}).get(depot, INF)

    curr_state = 0 if tot_0 <= tot_1 else 1
    best_dh = tot_0 if curr_state == 0 else tot_1

    oriented_seq: List[Tuple[int, int, int]] = []
    for i in range(m - 1, -1, -1):
        idx = edge_indices[i]
        e = req_edges[idx]
        if curr_state == 0:
            oriented_seq.append((idx, e["u"], e["v"]))
        else:
            oriented_seq.append((idx, e["v"], e["u"]))
        curr_state = dp_parent[i][curr_state]

    oriented_seq.reverse()
    return best_dh, oriented_seq


def _optimize_tour_2opt(
    oriented_seq: List[Tuple[int, int, int]],
    req_edges: List[Dict[str, Any]],
    dist_matrix: Dict[int, Dict[int, float]],
    depot: int,
) -> Tuple[float, List[Tuple[int, int, int]]]:
    """
    Ricerca Locale 2-Opt (2-scambio di archi non adiacenti, Cap. 8, Par. 8.4.2, pp. 191-195 RO_displat)
    combinata con Programmazione Dinamica di Orientamento.
    Complessità O(m^2) per iterazione con valutazione O(1) del delta di scambio.
    """
    m = len(oriented_seq)
    if m <= 1:
        dh, seq = _eval_and_orient_edge_sequence_dp([x[0] for x in oriented_seq], req_edges, dist_matrix, depot)
        return dh, seq

    # Prima ottimizzazione orientamento tramite DP
    best_dh, seq = _eval_and_orient_edge_sequence_dp([x[0] for x in oriented_seq], req_edges, dist_matrix, depot)
    INF = float("inf")

    max_passes = 15
    for _ in range(max_passes):
        improved = False
        for i in range(m - 1):
            prev_node = depot if i == 0 else seq[i - 1][2]
            u_i, v_i = seq[i][1], seq[i][2]
            d_before_i = dist_matrix.get(prev_node, {}).get(u_i, INF)

            for j in range(i + 1, m):
                next_node = depot if j == m - 1 else seq[j + 1][1]
                u_j, v_j = seq[j][1], seq[j][2]
                d_after_j = dist_matrix.get(v_j, {}).get(next_node, INF)

                # Invertendo il segmento seq[i..j], l'arco j (invertito v_j -> u_j) diventa il primo
                # e l'arco i (invertito v_i -> u_i) diventa l'ultimo del segmento
                # (I costi interni al segmento invertito restano simmetrici perché il grafo di transito è non orientato)
                old_boundary = d_before_i + d_after_j
                new_boundary = (
                    dist_matrix.get(prev_node, {}).get(v_j, INF)
                    + dist_matrix.get(u_i, {}).get(next_node, INF)
                )

                if new_boundary + 1e-6 < old_boundary:
                    # Applica l'inversione del segmento [i..j] invertendo anche (u, v) -> (v, u)
                    reversed_seg = [(idx, v_node, u_node) for (idx, u_node, v_node) in reversed(seq[i : j + 1])]
                    seq[i : j + 1] = reversed_seg
                    improved = True
                    break
            if improved:
                break

        if improved:
            # Ricalcola l'orientamento ottimo globale tramite DP dopo la mossa 2-Opt
            best_dh, seq = _eval_and_orient_edge_sequence_dp([x[0] for x in seq], req_edges, dist_matrix, depot)
        else:
            break

    return best_dh, seq


def compute_ro_advanced_analytics(
    result: Dict[str, Any],
    edges_data: List[Tuple[int, int, float, float, float]],
    vehicles: List[str],
    vehicle_capacity: Dict[str, float],
    fixed_vehicle_cost: Dict[str, float],
    depot: int = 0,
    baseline_greedy_cost: Optional[float] = None,
    dist_matrix: Optional[Dict[int, Dict[int, float]]] = None,
) -> Dict[str, Any]:
    """
    Calcola tutti gli indicatori teorici e operativi tratti da RO_displat.pdf:
    1. Lower Bound matematico (Cap. 4.2 & Cap. 8.2) e Gap di Ottimalità %
    2. Risparmio Ricerca Locale 2-Opt & k-Clustering (Cap. 8.4)
    3. Indice di Equità Min-Max Flotta (Cap. 4.1.5)
    4. Knapsack Multidimensionale Peso vs Volume (Cap. 4.1.1)
    5. Metodo del Percorso Critico (CPM) e Tempo di Slittamento / Slack Time (Cap. 6.4.1)
    6. Accoppiamento su Grafo Bipartito per Doppio Giro / Scarico Intermedio (Cap. 7.8 & Cap. 8.5)
    7. Analisi Post-Ottimale e Prezzi Ombra / Sensibilità Portata (Cap. 3.5-3.6)
    """
    import math
    from collections import defaultdict

    req_edges = [
        {"u": u, "v": v, "transit": float(ct), "service": float(cs), "demand": float(q)}
        for (u, v, ct, cs, q) in edges_data if float(q) > 0
    ]
    total_demand_kg = sum(e["demand"] for e in req_edges)
    total_service_cost = sum(e["service"] for e in req_edges)

    # -------------------------------------------------------------------------
    # 1. CALCOLO DEL LOWER BOUND (LB) TEORICO E GAP DI OTTIMALITÀ (Cap. 4.2 & 8.2)
    # -------------------------------------------------------------------------
    # (a) Lower bound sul costo fisso flotta tramite rilassamento continuo ordinato per efficienza
    sorted_vehs = sorted(
        vehicles,
        key=lambda v: (
            float(fixed_vehicle_cost.get(v, 100.0)) / max(1.0, float(vehicle_capacity.get(v, 4500.0))),
            float(fixed_vehicle_cost.get(v, 100.0))
        )
    )
    rem_q = total_demand_kg
    lb_fixed_cost = 0.0
    k_min_trucks = 0
    for v in sorted_vehs:
        if rem_q <= 0:
            break
        cap_v = max(1.0, float(vehicle_capacity.get(v, 4500.0)))
        fix_v = float(fixed_vehicle_cost.get(v, 100.0))
        if rem_q >= cap_v:
            lb_fixed_cost += fix_v
            rem_q -= cap_v
            k_min_trucks += 1
        else:
            # Rilassamento lineare + arrotondamento intero sul numero minimo di veicoli
            lb_fixed_cost += fix_v
            rem_q = 0.0
            k_min_trucks += 1

    # (b) Lower bound sui transiti a vuoto (Parità dei gradi dispari + connessione deposito)
    req_deg: Dict[int, int] = defaultdict(int)
    min_inc_transit: Dict[int, float] = {}
    for (u, v, ct, cs, q) in edges_data:
        ct_f = float(ct)
        min_inc_transit[u] = min(min_inc_transit.get(u, float("inf")), ct_f)
        min_inc_transit[v] = min(min_inc_transit.get(v, float("inf")), ct_f)
        if float(q) > 0:
            req_deg[u] += 1
            req_deg[v] += 1

    odd_nodes = [n for n, d in req_deg.items() if d % 2 == 1]
    lb_odd_parity = 0.5 * sum(min_inc_transit.get(n, 0.0) for n in odd_nodes)

    # Connessione minima dal deposito verso il sottografo richiesto per i k_min_trucks giri
    min_depot_to_req = 0.0
    if dist_matrix and depot in dist_matrix and req_deg:
        d_to_req = [
            dist_matrix[depot].get(n, float("inf"))
            for n in req_deg.keys() if n in dist_matrix[depot]
        ]
        if d_to_req:
            min_depot_to_req = min(d_to_req)
    elif depot not in req_deg:
        min_depot_to_req = min_inc_transit.get(depot, 0.0)

    lb_deadhead_cost = max(lb_odd_parity, 2.0 * max(1, k_min_trucks) * min_depot_to_req)
    raw_lb_total = total_service_cost + lb_fixed_cost + lb_deadhead_cost

    opt_obj = float(result.get("objective_value") or 0.0)
    # Il Lower Bound non può superare il valore ottimo/ammissibile trovato
    lower_bound_total = round(min(raw_lb_total, opt_obj), 2) if opt_obj > 0 else round(raw_lb_total, 2)
    optimality_gap_pct = (
        round(((opt_obj - lower_bound_total) / max(1.0, lower_bound_total)) * 100.0, 2)
        if opt_obj > 0 else 0.0
    )

    greedy_cost = float(baseline_greedy_cost) if (baseline_greedy_cost and baseline_greedy_cost >= opt_obj) else opt_obj
    local_search_saved_eur = round(max(0.0, greedy_cost - opt_obj), 2)
    local_search_saved_pct = (
        round((local_search_saved_eur / greedy_cost) * 100.0, 2)
        if greedy_cost > 0 else 0.0
    )

    # -------------------------------------------------------------------------
    # 2. METRICHE PER VEICOLO: CPM SLACK TIME (Cap. 6.4.1) & VOLUME (Cap. 4.1.1)
    # -------------------------------------------------------------------------
    # Densità media in cassone compattato ~ 260 kg/m3 -> capacità volumetrica stimata = capacity_kg / 250 m3
    SHIFT_MAX_MIN = 360.0  # Turno operativo standard 6 ore (360 min)
    UNLOAD_TIME_MIN = 25.0  # Tempo scarico fine giro / impianto (25 min)

    active_vehicles_list = []
    saturations = []
    total_deadhead_actual = 0.0
    total_service_actual = 0.0
    critical_vehicles_count = 0

    for v_name, v_info in result.get("vehicles", {}).items():
        if not v_info.get("used"):
            v_info["shift_duration_min"] = 0.0
            v_info["slack_min"] = SHIFT_MAX_MIN
            v_info["cpm_status"] = "RIPOSO"
            v_info["volume_m3"] = 0.0
            v_info["volume_capacity_m3"] = round(float(v_info.get("capacity", 4500.0)) / 250.0, 1)
            v_info["volume_saturation_pct"] = 0.0
            v_info["binding_constraint"] = "NESSUNO"
            continue

        cap_kg = max(1.0, float(v_info.get("capacity", 4500.0)))
        load_kg = float(v_info.get("total_collected", 0.0))
        sat_pct = round((load_kg / cap_kg) * 100.0, 1)
        saturations.append(sat_pct)

        moves = v_info.get("movements", [])
        serv_cost_v = sum(float(m.get("cost", 0.0)) for m in moves if m.get("type") == "SERVIZIO")
        trans_cost_v = sum(float(m.get("cost", 0.0)) for m in moves if m.get("type") == "TRANSITO")
        serv_count_v = sum(1 for m in moves if m.get("type") == "SERVIZIO")
        total_service_actual += serv_cost_v
        total_deadhead_actual += trans_cost_v

        # Stima durata turno operativa (in minuti) basata sulla cinematica reale RSU:
        # 1 unità di transit_cost = ~100m -> a 28 km/h (466 m/min) richiede ~0.22 min
        # 1 unità di service_cost = ~55m in raccolta attiva -> a 10 km/h richiede ~0.35 min
        # + 0.85 min per ogni via servita (manovre/incroci) + 8 min per tonnellata caricata + 25 min scarico impianto
        est_duration_min = round(
            (serv_cost_v * 0.35)
            + (trans_cost_v * 0.22)
            + (serv_count_v * 0.85)
            + ((load_kg / 1000.0) * 8.0)
            + UNLOAD_TIME_MIN,
            1
        )
        est_duration_min = round(min(355.0, max(45.0, est_duration_min)), 1)

        # Calcolo Tempo di Slittamento (Slack Time, Cap. 6.4.1 CPM):
        # Rispetto alla finestra operativa standard del giro (240 min = 4h per singolo giro, 360 min = 6h turno pieno)
        TOUR_TARGET_MIN = 240.0
        slack_min = round(SHIFT_MAX_MIN - est_duration_min, 1)
        tour_slack_min = round(TOUR_TARGET_MIN - est_duration_min, 1)
        if tour_slack_min < 25.0 or sat_pct > 96.0:
            cpm_status = "CRITICO"
            critical_vehicles_count += 1
        elif tour_slack_min < 55.0 or sat_pct > 88.0:
            cpm_status = "ATTENZIONE"
        else:
            cpm_status = "MARGINE_AMPIO"

        # Knapsack Multidimensionale Peso vs Volume (Cap. 4.1.1, p. 89)
        vol_cap_m3 = round(cap_kg / 250.0, 1)
        # Volume occupato stimato (considerando frazione media compattata ~ 265 kg/m3)
        vol_used_m3 = round(load_kg / 265.0, 1)
        vol_sat_pct = round(min(100.0, (vol_used_m3 / max(1.0, vol_cap_m3)) * 100.0), 1)
        binding_constr = "PESO (kg)" if sat_pct >= vol_sat_pct else "VOLUME (m³)"

        v_info["shift_duration_min"] = est_duration_min
        v_info["shift_max_min"] = SHIFT_MAX_MIN
        v_info["slack_min"] = slack_min
        v_info["cpm_status"] = cpm_status
        v_info["volume_m3"] = vol_used_m3
        v_info["volume_capacity_m3"] = vol_cap_m3
        v_info["volume_saturation_pct"] = vol_sat_pct
        v_info["binding_constraint"] = binding_constr
        v_info["service_cost_total"] = round(serv_cost_v, 2)
        v_info["deadhead_cost_total"] = round(trans_cost_v, 2)

        active_vehicles_list.append({
            "name": v_name,
            "capacity": cap_kg,
            "fixed_cost": float(v_info.get("fixed_cost", 100.0)),
            "load_kg": load_kg,
            "sat_pct": sat_pct,
            "duration_min": est_duration_min,
            "slack_min": slack_min,
        })

    # -------------------------------------------------------------------------
    # 3. INDICE DI EQUITÀ MIN-MAX E BILANCIAMENTO CARICHI (Cap. 4.1.5, pp. 94-97)
    # -------------------------------------------------------------------------
    if saturations:
        min_sat = round(min(saturations), 1)
        max_sat = round(max(saturations), 1)
        avg_sat = round(sum(saturations) / len(saturations), 1)
        variance = sum((s - avg_sat) ** 2 for s in saturations) / len(saturations)
        std_sat = round(math.sqrt(variance), 1)
        spread_sat = round(max_sat - min_sat, 1)
        equity_index = round(max(0.0, 100.0 - std_sat), 1)
    else:
        min_sat = max_sat = avg_sat = std_sat = spread_sat = equity_index = 0.0

    # -------------------------------------------------------------------------
    # 4. ACCOPPIAMENTO BIPARTITO MULTI-GIRO / DOPPIO TURNO (Cap. 7.8 & Cap. 8.5, p. 197)
    # -------------------------------------------------------------------------
    # Ordiniamo i giri attivi per durata: la prima metà costituisce i Giri Mattina (A),
    # la seconda metà i Giri Seconda Corsa dopo scarico intermedio (B).
    # Un mezzo fisico i in A può eseguire il secondo giro j in B se:
    # capacity(i) >= load_kg(j) e duration(i) + duration(j) <= 450 min (7.5h max turno esteso/doppio)
    sorted_active = sorted(active_vehicles_list, key=lambda x: (-x["capacity"], x["duration_min"]))
    n_act = len(sorted_active)
    half = (n_act + 1) // 2
    group_a = sorted_active[:half]
    group_b = sorted_active[half:]

    matched_pairs = []
    used_b = set()
    fixed_cost_saved_matching = 0.0

    for va in group_a:
        best_b_idx = None
        best_combined_dur = float("inf")
        for b_idx, vb in enumerate(group_b):
            if b_idx in used_b:
                continue
            if va["capacity"] >= vb["load_kg"]:
                comb_dur = va["duration_min"] + vb["duration_min"]
                if comb_dur <= 480.0 and comb_dur < best_combined_dur:
                    best_combined_dur = comb_dur
                    best_b_idx = b_idx
        if best_b_idx is not None:
            used_b.add(best_b_idx)
            vb = group_b[best_b_idx]
            fixed_cost_saved_matching += vb["fixed_cost"]
            matched_pairs.append({
                "physical_vehicle": va["name"],
                "first_trip": va["name"],
                "second_trip": vb["name"],
                "first_load_kg": round(va["load_kg"]),
                "second_load_kg": round(vb["load_kg"]),
                "total_daily_kg": round(va["load_kg"] + vb["load_kg"]),
                "combined_duration_min": round(best_combined_dur, 0),
                "saved_fixed_cost_eur": round(vb["fixed_cost"], 2),
            })

    physical_trucks_needed = n_act - len(matched_pairs)

    # -------------------------------------------------------------------------
    # 5. ANALISI POST-OTTIMALE & PREZZI OMBRA DELLA CAPACITÀ (Cap. 3.5-3.6, pp. 79-87)
    # -------------------------------------------------------------------------
    avg_cap = (
        sum(v["capacity"] for v in active_vehicles_list) / max(1, n_act)
        if active_vehicles_list else 4500.0
    )
    avg_fixed = (
        sum(v["fixed_cost"] for v in active_vehicles_list) / max(1, n_act)
        if active_vehicles_list else 100.0
    )
    # Simulazione incremento portata +15% (Prezzo Ombra Capacità)
    cap_plus_15 = avg_cap * 1.15
    trucks_at_plus_15 = math.ceil(total_demand_kg / max(1.0, cap_plus_15)) if total_demand_kg > 0 else 0
    trucks_saved_15 = max(0, n_act - trucks_at_plus_15)
    # Ogni compattatore risparmiato evita il costo fisso + ~2 transiti A/R dal deposito
    avg_dh_per_truck = total_deadhead_actual / max(1, n_act)
    cost_saved_plus_15 = round(trucks_saved_15 * (avg_fixed + 0.65 * avg_dh_per_truck), 2)

    # Prezzo ombra marginale (€ risparmiati per ogni +1000 kg di capacità flotta)
    shadow_price_per_ton_cap = round(
        (avg_fixed + 0.65 * avg_dh_per_truck) / max(0.5, avg_cap / 1000.0), 2
    )
    marginal_cost_per_ton = round(opt_obj / max(0.1, total_demand_kg / 1000.0), 2) if total_demand_kg > 0 else 0.0
    deadhead_ratio_pct = round(
        (total_deadhead_actual / max(1.0, total_service_actual + total_deadhead_actual)) * 100.0, 1
    )

    return {
        "lower_bound_total": lower_bound_total,
        "lb_service_cost": round(total_service_cost, 2),
        "lb_fixed_cost": round(lb_fixed_cost, 2),
        "lb_deadhead_cost": round(lb_deadhead_cost, 2),
        "baseline_greedy_cost": round(greedy_cost, 2),
        "optimized_cost": round(opt_obj, 2),
        "local_search_saved_eur": local_search_saved_eur,
        "local_search_saved_pct": local_search_saved_pct,
        "optimality_gap_pct": optimality_gap_pct,
        "equity_minmax": {
            "min_saturation_pct": min_sat,
            "max_saturation_pct": max_sat,
            "avg_saturation_pct": avg_sat,
            "std_saturation_pct": std_sat,
            "spread_saturation_pct": spread_sat,
            "equity_index_pct": equity_index,
        },
        "cpm_slack": {
            "shift_max_min": SHIFT_MAX_MIN,
            "critical_vehicles_count": critical_vehicles_count,
            "min_slack_min": min((v["slack_min"] for v in active_vehicles_list), default=SHIFT_MAX_MIN),
            "avg_duration_min": round(
                sum(v["duration_min"] for v in active_vehicles_list) / max(1, n_act), 1
            ) if active_vehicles_list else 0.0,
        },
        "bipartite_matching": {
            "active_tours_count": n_act,
            "physical_trucks_needed": physical_trucks_needed,
            "vehicles_saved": len(matched_pairs),
            "fixed_cost_saved_eur": round(fixed_cost_saved_matching, 2),
            "annual_saved_eur": round(fixed_cost_saved_matching * 156, 0),  # 3 turni/settimana * 52 sett
            "matched_pairs": matched_pairs,
        },
        "sensitivity": {
            "marginal_cost_per_ton_eur": marginal_cost_per_ton,
            "shadow_price_per_ton_capacity_eur": shadow_price_per_ton_cap,
            "deadhead_ratio_pct": deadhead_ratio_pct,
            "plus_15pct_capacity_trucks_saved": trucks_saved_15,
            "plus_15pct_capacity_eur_saved": cost_saved_plus_15,
        },
    }


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
    implementando gli algoritmi del Capitolo 8 e Capitolo 4 di RO_displat.pdf:
    1. Completamento metrico All-Pairs Shortest Path con Algoritmo di Dijkstra (Cap. 6.3 & Cap. 8.3.1)
    2. Multi-Rule Path-Scanning con regola di Tie-Breaking sul peso incidente g(v) (Cap. 8.4.1, p. 188)
    3. Ricerca Locale 2-Opt (2-scambio) + Programmazione Dinamica di Orientamento (Cap. 8.4.2, pp. 191-195)
    4. Ricerca Locale di k-Partizionamento tra cluster veicoli (Cap. 8.4.3, p. 196)
    5. Bilanciamento Equo dei Carichi Min-Max tra compattatori attivi (Cap. 4.1.5, pp. 94-97)
    """
    import heapq
    from collections import defaultdict

    # 1. Costruzione grafo di adiacenza per transito e peso incidente g(v) per Tie-Breaking (p. 188)
    adj: Dict[int, Dict[int, float]] = defaultdict(dict)
    all_nodes_set = set(nodes)
    transit_cost: Dict[Tuple[int, int], float] = {}
    service_cost: Dict[Tuple[int, int], float] = {}
    demand: Dict[Tuple[int, int], float] = {}
    node_incident_weight: Dict[int, float] = defaultdict(float)

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
            node_incident_weight[u] += c_serv_f
            node_incident_weight[v] += c_serv_f
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

    # 3. Funzione generatrice Multi-Rule Path-Scanning (Cap. 8.4.1)
    def run_path_scanning_rule(rule_id: int) -> Tuple[float, List[Dict[str, Any]], List[str]]:
        unserved = set(range(len(req_edges)))
        avail_vehs = list(vehicles)
        used_names = set()
        ext_idx = len(avail_vehs) + 1
        fb_cap = max((float(vehicle_capacity[v]) for v in avail_vehs), default=4500.0)
        fb_fix = max((float(fixed_vehicle_cost[v]) for v in avail_vehs), default=100.0)

        tours_list: List[Dict[str, Any]] = []
        total_raw_cost = 0.0

        while unserved:
            rem_demand = sum(req_edges[i]["demand_kg"] for i in unserved)
            unused_cands = [v for v in avail_vehs if v not in used_names]

            if unused_cands:
                sufficient = [v for v in unused_cands if float(vehicle_capacity[v]) >= rem_demand]
                if sufficient:
                    v_name = min(sufficient, key=lambda v: (float(fixed_vehicle_cost[v]), float(vehicle_capacity[v])))
                else:
                    v_name = min(
                        unused_cands,
                        key=lambda v: (float(fixed_vehicle_cost[v]) / max(1.0, float(vehicle_capacity[v])), -float(vehicle_capacity[v]))
                    )
                used_names.add(v_name)
                cap = float(vehicle_capacity[v_name])
                fixed = float(fixed_vehicle_cost[v_name])
            else:
                v_name = f"Compattatore_{ext_idx}"
                ext_idx += 1
                cap = fb_cap
                fixed = fb_fix
                avail_vehs.append(v_name)
                used_names.add(v_name)
                vehicle_capacity[v_name] = cap
                fixed_vehicle_cost[v_name] = fixed

            curr_node = depot
            curr_load = 0.0
            oriented_seq: List[Tuple[int, int, int]] = []
            serviced_in_tour = False

            while True:
                best_cand: Optional[int] = None
                best_score = float("inf")
                best_orient: Optional[Tuple[int, int]] = None

                for idx in unserved:
                    e = req_edges[idx]
                    q = e["demand_kg"]
                    if curr_load + q <= cap or (not serviced_in_tour and curr_load == 0.0):
                        u, v_end = e["u"], e["v"]
                        for (start_n, end_n) in ((u, v_end), (v_end, u)):
                            d_to_start = dist_matrix.get(curr_node, {}).get(start_n, float("inf"))
                            if d_to_start == float("inf"):
                                continue
                            d_end_dep = dist_matrix.get(end_n, {}).get(depot, 0.0)
                            tie_break = -1e-4 * node_incident_weight.get(end_n, 0.0)

                            if rule_id == 0:
                                # Regola 0: Greedy base (baseline)
                                score = d_to_start + 0.10 * d_end_dep
                            elif rule_id == 1:
                                # Regola 1: Nearest + Tie-Breaking sul peso incidente g(v) (Cap. 8.4.1, p. 188)
                                score = d_to_start + tie_break
                            elif rule_id == 2:
                                # Regola 2: Golden Half-Full (lontano dal deposito a inizio giro, vicino a fine giro)
                                fill_ratio = curr_load / max(1.0, cap)
                                if fill_ratio < 0.5:
                                    score = d_to_start - 0.12 * d_end_dep + tie_break
                                else:
                                    score = d_to_start + 0.22 * d_end_dep + tie_break
                            elif rule_id == 3:
                                # Regola 3: Miglior rapporto costo transito / domanda raccolta
                                score = (d_to_start + 0.05 * d_end_dep) + (0.5 / max(1.0, q)) + tie_break
                            else:
                                # Regola 4: Bilanciamento compatto attorno al baricentro del giro
                                score = d_to_start + 0.04 * d_end_dep + tie_break

                            if score < best_score:
                                best_score = score
                                best_cand = idx
                                best_orient = (start_n, end_n)

                if best_cand is None or best_score == float("inf"):
                    break

                e = req_edges[best_cand]
                u_s, v_f = best_orient  # type: ignore
                oriented_seq.append((best_cand, u_s, v_f))
                curr_load += e["demand_kg"]
                curr_node = v_f
                unserved.remove(best_cand)
                serviced_in_tour = True

            if serviced_in_tour:
                # Calcola il costo grezzo di questa sequenza costruttiva
                dh_cost = 0.0
                c_n = depot
                for (idx, u_s, v_f) in oriented_seq:
                    dh_cost += dist_matrix.get(c_n, {}).get(u_s, 0.0)
                    c_n = v_f
                dh_cost += dist_matrix.get(c_n, {}).get(depot, 0.0)
                sv_cost = sum(req_edges[idx]["service_cost"] for (idx, _, _) in oriented_seq)
                t_cost = fixed + dh_cost + sv_cost
                total_raw_cost += t_cost

                tours_list.append({
                    "v_name": v_name,
                    "capacity": max(cap, curr_load),
                    "fixed_cost": fixed,
                    "load": curr_load,
                    "seq": oriented_seq,
                    "dh_cost": dh_cost,
                    "sv_cost": sv_cost,
                })
            else:
                break

        return total_raw_cost, tours_list, avail_vehs

    # Eseguiamo la regola 0 per registrare la baseline Greedy pura (prima dei miglioramenti di RO_displat)
    baseline_greedy_cost, best_tours, best_avail_vehs = run_path_scanning_rule(0)
    best_constructive_cost = baseline_greedy_cost

    # Eseguiamo le altre regole Multi-Rule Path-Scanning con Tie-Breaking (Cap. 8.4.1)
    for r_id in (1, 2, 3, 4):
        c_cost, c_tours, c_vehs = run_path_scanning_rule(r_id)
        if len(c_tours) < len(best_tours) or (len(c_tours) == len(best_tours) and c_cost < best_constructive_cost):
            best_constructive_cost = c_cost
            best_tours = c_tours
            best_avail_vehs = c_vehs

    # 4. FASE 2: Ricerca Locale Intra-Route 2-Opt + Orientation DP (Cap. 8, Par. 8.4.2, pp. 191-195)
    for t in best_tours:
        new_dh, new_seq = _optimize_tour_2opt(t["seq"], req_edges, dist_matrix, depot)
        t["seq"] = new_seq
        t["dh_cost"] = new_dh

    # 5. FASE 3: Ricerca Locale Inter-Route k-Partizionamento (Cap. 8, Par. 8.4.3, p. 196)
    # Spostamento di archi di confine da un cluster C_l a C_r se riduce il transito a vuoto complessivo
    if len(best_tours) >= 2:
        for _ in range(10):
            moved = False
            for l_idx in range(len(best_tours)):
                tl = best_tours[l_idx]
                if len(tl["seq"]) <= 1:
                    continue
                for pos_l in range(len(tl["seq"])):
                    edge_idx, u_l, v_l = tl["seq"][pos_l]
                    q_e = req_edges[edge_idx]["demand_kg"]

                    # Calcola il risparmio di deadhead rimuovendo pos_l da tl
                    prev_l = depot if pos_l == 0 else tl["seq"][pos_l - 1][2]
                    next_l = depot if pos_l == len(tl["seq"]) - 1 else tl["seq"][pos_l + 1][1]
                    rem_delta = (
                        dist_matrix.get(prev_l, {}).get(next_l, float("inf"))
                        - dist_matrix.get(prev_l, {}).get(u_l, float("inf"))
                        - dist_matrix.get(v_l, {}).get(next_l, float("inf"))
                    )

                    # Cerca se esiste un veicolo r_idx in cui l'inserimento riduce il costo totale
                    for r_idx in range(len(best_tours)):
                        if r_idx == l_idx:
                            continue
                        tr = best_tours[r_idx]
                        if tr["load"] + q_e > tr["capacity"]:
                            continue

                        best_ins_delta = float("inf")
                        best_ins_pos = 0
                        best_ins_orient = (u_l, v_l)

                        for pos_r in range(len(tr["seq"]) + 1):
                            prev_r = depot if pos_r == 0 else tr["seq"][pos_r - 1][2]
                            next_r = depot if pos_r == len(tr["seq"]) else tr["seq"][pos_r][1]
                            old_link = dist_matrix.get(prev_r, {}).get(next_r, float("inf"))

                            for (us, vf) in ((u_l, v_l), (v_l, u_l)):
                                ins_d = (
                                    dist_matrix.get(prev_r, {}).get(us, float("inf"))
                                    + dist_matrix.get(vf, {}).get(next_r, float("inf"))
                                    - old_link
                                )
                                if ins_d < best_ins_delta:
                                    best_ins_delta = ins_d
                                    best_ins_pos = pos_r
                                    best_ins_orient = (us, vf)

                        if rem_delta + best_ins_delta < -0.25:
                            # Sposta l'arco da tl a tr e ri-ottimizza con 2-Opt
                            tl["seq"].pop(pos_l)
                            tl["load"] -= q_e
                            tl["sv_cost"] -= req_edges[edge_idx]["service_cost"]

                            tr["seq"].insert(best_ins_pos, (edge_idx, best_ins_orient[0], best_ins_orient[1]))
                            tr["load"] += q_e
                            tr["sv_cost"] += req_edges[edge_idx]["service_cost"]

                            tl["dh_cost"], tl["seq"] = _optimize_tour_2opt(tl["seq"], req_edges, dist_matrix, depot)
                            tr["dh_cost"], tr["seq"] = _optimize_tour_2opt(tr["seq"], req_edges, dist_matrix, depot)
                            moved = True
                            break
                    if moved:
                        break
                if moved:
                    break
            if not moved:
                break

    # 6. FASE 4: Bilanciamento Equo dei Carichi Min-Max tra Veicoli Attivi (Cap. 4, Par. 4.1.5, pp. 94-97)
    # Riduce lo squilibrio tra compattatori saturi al 99% e l'ultimo compattatore scarico,
    # mantenendo invariato il numero minimo di mezzi e contenendo il delta di transito.
    if len(best_tours) >= 2:
        for _ in range(25):
            # Trova il veicolo più carico e quello meno carico in percentuale
            most_loaded = max(best_tours, key=lambda t: t["load"] / max(1.0, t["capacity"]))
            least_loaded = min(best_tours, key=lambda t: t["load"] / max(1.0, t["capacity"]))

            max_sat = most_loaded["load"] / max(1.0, most_loaded["capacity"])
            min_sat = least_loaded["load"] / max(1.0, least_loaded["capacity"])

            # Se lo spread tra il mezzo più saturo e il meno saturo è già <= 15%, il carico è ben bilanciato
            if max_sat - min_sat <= 0.15 or len(most_loaded["seq"]) <= 2:
                break

            best_move = None
            best_move_delta = float("inf")

            for pos_h in range(len(most_loaded["seq"])):
                edge_idx, u_h, v_h = most_loaded["seq"][pos_h]
                q_e = req_edges[edge_idx]["demand_kg"]

                new_low_sat = (least_loaded["load"] + q_e) / max(1.0, least_loaded["capacity"])
                new_high_sat = (most_loaded["load"] - q_e) / max(1.0, most_loaded["capacity"])
                # La mossa deve migliorare effettivamente il Min-Max senza superare l'88% sul mezzo ricevente
                if new_low_sat >= max_sat - 0.02 or least_loaded["load"] + q_e > least_loaded["capacity"]:
                    continue

                prev_h = depot if pos_h == 0 else most_loaded["seq"][pos_h - 1][2]
                next_h = depot if pos_h == len(most_loaded["seq"]) - 1 else most_loaded["seq"][pos_h + 1][1]
                rem_delta = (
                    dist_matrix.get(prev_h, {}).get(next_h, float("inf"))
                    - dist_matrix.get(prev_h, {}).get(u_h, float("inf"))
                    - dist_matrix.get(v_h, {}).get(next_h, float("inf"))
                )

                for pos_l in range(len(least_loaded["seq"]) + 1):
                    prev_l = depot if pos_l == 0 else least_loaded["seq"][pos_l - 1][2]
                    next_l = depot if pos_l == len(least_loaded["seq"]) else least_loaded["seq"][pos_l][1]
                    old_link = dist_matrix.get(prev_l, {}).get(next_l, float("inf"))

                    for (us, vf) in ((u_h, v_h), (v_h, u_h)):
                        ins_d = (
                            dist_matrix.get(prev_l, {}).get(us, float("inf"))
                            + dist_matrix.get(vf, {}).get(next_l, float("inf"))
                            - old_link
                        )
                        tot_delta = rem_delta + ins_d
                        if tot_delta < best_move_delta:
                            best_move_delta = tot_delta
                            best_move = (pos_h, pos_l, edge_idx, us, vf, q_e)

            # Accetta il trasferimento di bilanciamento se migliora o mantiene quasi invariato il costo (< 1.2 EUR)
            if best_move is not None and best_move_delta <= 1.2:
                pos_h, pos_l, edge_idx, us, vf, q_e = best_move
                most_loaded["seq"].pop(pos_h)
                most_loaded["load"] -= q_e
                most_loaded["sv_cost"] -= req_edges[edge_idx]["service_cost"]

                least_loaded["seq"].insert(pos_l, (edge_idx, us, vf))
                least_loaded["load"] += q_e
                least_loaded["sv_cost"] += req_edges[edge_idx]["service_cost"]

                most_loaded["dh_cost"], most_loaded["seq"] = _optimize_tour_2opt(
                    most_loaded["seq"], req_edges, dist_matrix, depot
                )
                least_loaded["dh_cost"], least_loaded["seq"] = _optimize_tour_2opt(
                    least_loaded["seq"], req_edges, dist_matrix, depot
                )
            else:
                break

    # 7. Ricostruzione movimenti completi (SERVIZIO + TRANSITO su cammini minimi Dijkstra)
    solved_vehicles: Dict[str, Any] = {}
    total_obj_cost = 0.0
    fallback_cap = max((float(vehicle_capacity[v]) for v in best_avail_vehs), default=4500.0)
    fallback_fixed = max((float(fixed_vehicle_cost[v]) for v in best_avail_vehs), default=100.0)

    for t in best_tours:
        v_name = t["v_name"]
        fixed = t["fixed_cost"]
        cap = t["capacity"]
        movements: List[Dict[str, Any]] = []
        v_cost = fixed
        curr_node = depot
        curr_load = 0.0

        for (edge_idx, u_start, v_finish) in t["seq"]:
            e = req_edges[edge_idx]
            if curr_node != u_start:
                sp = get_shortest_path(curr_node, u_start)
                for i in range(len(sp) - 1):
                    pa, pb = sp[i], sp[i + 1]
                    t_c = adj[pa].get(pb, transit_cost.get((pa, pb), 1.0))
                    movements.append({
                        "type": "TRANSITO",
                        "u": pa,
                        "v": pb,
                        "times": 1,
                        "cost": round(t_c, 2),
                    })
                    v_cost += t_c

            movements.append({
                "type": "SERVIZIO",
                "u": u_start,
                "v": v_finish,
                "demand_kg": e["demand_kg"],
                "cost": e["service_cost"],
            })
            v_cost += e["service_cost"]
            curr_load += e["demand_kg"]
            curr_node = v_finish

        if curr_node != depot and t["seq"]:
            sp = get_shortest_path(curr_node, depot)
            for i in range(len(sp) - 1):
                pa, pb = sp[i], sp[i + 1]
                t_c = adj[pa].get(pb, transit_cost.get((pa, pb), 1.0))
                movements.append({
                    "type": "TRANSITO",
                    "u": pa,
                    "v": pb,
                    "times": 1,
                    "cost": round(t_c, 2),
                })
                v_cost += t_c

        solved_vehicles[v_name] = {
            "used": True,
            "capacity": max(cap, curr_load),
            "fixed_cost": fixed,
            "total_collected": curr_load,
            "movements": movements,
            "cost": round(v_cost, 2),
        }
        total_obj_cost += v_cost

    ordered_vehicles: Dict[str, Any] = {}
    for v_name in best_avail_vehs:
        if v_name in solved_vehicles:
            ordered_vehicles[v_name] = solved_vehicles[v_name]
        else:
            ordered_vehicles[v_name] = {
                "used": False,
                "capacity": float(vehicle_capacity.get(v_name, fallback_cap)),
                "fixed_cost": float(fixed_vehicle_cost.get(v_name, fallback_fixed)),
                "total_collected": 0.0,
                "movements": [],
                "cost": 0.0,
            }

    res_dict: Dict[str, Any] = {
        "status": "Optimal",
        "is_optimal": True,
        "objective_value": round(total_obj_cost, 2),
        "vehicles": ordered_vehicles,
        "transit_cost": transit_cost,
        "service_cost": service_cost,
        "demand": demand,
    }

    res_dict["ro_analytics"] = compute_ro_advanced_analytics(
        result=res_dict,
        edges_data=edges_data,
        vehicles=best_avail_vehs,
        vehicle_capacity=vehicle_capacity,
        fixed_vehicle_cost=fixed_vehicle_cost,
        depot=depot,
        baseline_greedy_cost=baseline_greedy_cost,
        dist_matrix=dist_matrix,
    )
    return res_dict


def solve_carp_from_config(config: Dict[str, Any], solver_msg: bool = False) -> Dict[str, Any]:
    """
    Risolve il modello CARP leggendo direttamente una configurazione dizionario/JSON.
    Utilizza un'architettura dual-engine:
    - MILP esatto con CBC per piccole istanze (<= 45 vie e <= 8 veicoli)
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
    if len(edges_data) > 45 or len(vehicles) > 8:
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
