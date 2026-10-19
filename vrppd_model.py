"""
Vehicle Routing Problem with Pickup and Delivery (VRPPD / PDP)
Modello MILP in Python con PuLP.

Ogni richiesta r = (pickup, delivery, demand_kg) prevede un punto di ritiro
e un punto di consegna che devono essere serviti dallo STESSO veicolo nello STESSO giro,
rispettando il vincolo di precedenza (il ritiro precede la consegna) e la capacità massima di carico.
"""

from typing import Dict, List, Tuple, Any, Optional
import math
import pulp


def euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calcola la distanza euclidea tra due punti coordinate (km o unità arbitrarie)."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def get_default_vrppd_scenario() -> Dict[str, Any]:
    """
    Restituisce uno scenario benchmark realistico per VRPPD (Corriere Espresso / Logistica Ritiri e Consegne).
    """
    depot = {
        "id": "D0",
        "name": "Hub Centrale Smistamento (Treviso Nord)",
        "lat": 45.6800,
        "lon": 12.2400
    }

    # Richieste accoppiate di Ritiro (P) e Consegna (D)
    requests = [
        {
            "id": "REQ_1",
            "name": "Pacco Ricambi Meccanici",
            "demand_kg": 250.0,
            "pickup": {
                "id": "P1",
                "name": "Officina Meccanica Rossi (P1)",
                "lat": 45.6950,
                "lon": 12.2150
            },
            "delivery": {
                "id": "D1",
                "name": "Concessionaria Auto Nord (D1)",
                "lat": 45.7100,
                "lon": 12.2600
            }
        },
        {
            "id": "REQ_2",
            "name": "Scatole Materiale Elettrico",
            "demand_kg": 400.0,
            "pickup": {
                "id": "P2",
                "name": "Magazzino ElettroForniture (P2)",
                "lat": 45.6600,
                "lon": 12.2700
            },
            "delivery": {
                "id": "D2",
                "name": "Cantiere Impianti Sud (D2)",
                "lat": 45.6450,
                "lon": 12.2350
            }
        },
        {
            "id": "REQ_3",
            "name": "Fornitura Tessile / Abbigliamento",
            "demand_kg": 350.0,
            "pickup": {
                "id": "P3",
                "name": "Laboratorio Sartoriale (P3)",
                "lat": 45.6720,
                "lon": 12.1900
            },
            "delivery": {
                "id": "D3",
                "name": "Boutique Centro Storico (D3)",
                "lat": 45.6660,
                "lon": 12.2450
            }
        },
        {
            "id": "REQ_4",
            "name": "Campioni Laboratorio Analisi",
            "demand_kg": 150.0,
            "pickup": {
                "id": "P4",
                "name": "Clinica Diagnostica Est (P4)",
                "lat": 45.6850,
                "lon": 12.2850
            },
            "delivery": {
                "id": "D4",
                "name": "Laboratorio Ospedaliero Centrale (D4)",
                "lat": 45.6750,
                "lon": 12.2500
            }
        },
        {
            "id": "REQ_5",
            "name": "Componenti Elettronici",
            "demand_kg": 300.0,
            "pickup": {
                "id": "P5",
                "name": "Produttore Schede PCB (P5)",
                "lat": 45.6550,
                "lon": 12.2050
            },
            "delivery": {
                "id": "D5",
                "name": "Assemblatore High-Tech (D5)",
                "lat": 45.7000,
                "lon": 12.2300
            }
        }
    ]

    vehicles = [
        {
            "name": "Furgone_Express_1",
            "capacity": 800.0,
            "fixed_cost": 75.0,
            "cost_per_km": 1.25,
            "description": "Furgone compatto per ritiri/consegne rapide"
        },
        {
            "name": "Furgone_Express_2",
            "capacity": 900.0,
            "fixed_cost": 85.0,
            "cost_per_km": 1.25,
            "description": "Furgone medio per ritiri e consegne voluminose"
        }
    ]

    return {
        "depot": depot,
        "requests": requests,
        "vehicles": vehicles,
        "cost_per_km": 1.25
    }


def solve_vrppd(
    depot: Dict[str, Any],
    requests: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    cost_per_km: float = 1.25,
    solver_time_limit: int = 25,
    solver_msg: bool = False
) -> Dict[str, Any]:
    """
    Risolve il problema VRPPD (Pickup and Delivery Problem) con formulazione MILP in PuLP.
    Garantisce:
    1. Ogni richiesta è assegnata a un unico mezzo.
    2. Il ritiro P_i avviene PRIMA della consegna D_i sullo stesso veicolo.
    3. Il carico a bordo lungo la rotta rispetta sempre la portata massima.
    """
    depot_id = str(depot["id"])
    
    # Costruzione nodi
    nodes_dict = {depot_id: depot}
    pickups = []
    deliveries = []
    demand = {depot_id: 0.0}
    pair_map = {}  # P_id -> D_id

    for r in requests:
        p = r["pickup"]
        d = r["delivery"]
        p_id = str(p["id"])
        d_id = str(d["id"])
        q = float(r["demand_kg"])

        nodes_dict[p_id] = p
        nodes_dict[d_id] = d
        pickups.append(p_id)
        deliveries.append(d_id)
        demand[p_id] = q      # carico positivo
        demand[d_id] = -q     # scarico negativo
        pair_map[p_id] = d_id

    all_node_ids = [depot_id] + pickups + deliveries
    customer_node_ids = pickups + deliveries

    # Coordinate e Matrice Distanze
    coords = {}
    for nid, ndata in nodes_dict.items():
        coords[nid] = (float(ndata.get("lat", 0.0)), float(ndata.get("lon", 0.0)))

    dist = {}
    for i in all_node_ids:
        for j in all_node_ids:
            if i == j:
                dist[(i, j)] = 0.0
            else:
                d_eucl = euclidean_distance(coords[i], coords[j])
                dist_km = d_eucl * 111.0 if d_eucl < 10.0 else d_eucl
                dist[(i, j)] = round(dist_km, 2)

    veh_names = [str(v["name"]) for v in vehicles]
    veh_caps = {str(v["name"]): float(v["capacity"]) for v in vehicles}
    veh_fixed = {str(v["name"]): float(v.get("fixed_cost", 60.0)) for v in vehicles}
    veh_km_costs = {str(v["name"]): float(v.get("cost_per_km") if v.get("cost_per_km") is not None else cost_per_km) for v in vehicles}

    # Modello PuLP
    prob = pulp.LpProblem("OR_Route_VRPPD_Optimization", pulp.LpMinimize)

    # Variabili decisionali
    # x[i, j, k] = 1 se il veicolo k viaggia da i a j
    x = {
        (i, j, k): pulp.LpVariable(f"x_{i}_{j}_{k}", cat=pulp.LpBinary)
        for i in all_node_ids
        for j in all_node_ids
        for k in veh_names
        if i != j
    }

    # z[k] = 1 se il veicolo k è utilizzato
    z = {k: pulp.LpVariable(f"z_{k}", cat=pulp.LpBinary) for k in veh_names}

    # l[i, k]: carico a bordo del veicolo k subito dopo aver visitato il nodo i
    l = {
        (i, k): pulp.LpVariable(f"l_{i}_{k}", lowBound=0, upBound=veh_caps[k], cat=pulp.LpContinuous)
        for i in all_node_ids
        for k in veh_names
    }

    # t[i, k]: ordine temporale di visita (timestamp/step logico) del nodo i per il mezzo k
    t = {
        (i, k): pulp.LpVariable(f"t_{i}_{k}", lowBound=0, cat=pulp.LpContinuous)
        for i in all_node_ids
        for k in veh_names
    }

    # Funzione Obiettivo
    km_cost_term = pulp.lpSum(dist[(i, j)] * veh_km_costs[k] * x[i, j, k] for i in all_node_ids for j in all_node_ids for k in veh_names if i != j)
    fixed_cost_term = pulp.lpSum(veh_fixed[k] * z[k] for k in veh_names)
    prob += km_cost_term + fixed_cost_term, "Costo_Totale_Operativo"

    # VINCOLI:
    # 1. Ogni nodo cliente (ritiro o consegna) deve essere visitato esattamente una volta
    for i in customer_node_ids:
        prob += pulp.lpSum(x[i, j, k] for j in all_node_ids if j != i for k in veh_names) == 1, f"Visita_Univoca_{i}"

    # 2. Conservazione del flusso per ciascun veicolo su ciascun nodo
    for k in veh_names:
        for i in customer_node_ids:
            prob += (
                pulp.lpSum(x[j, i, k] for j in all_node_ids if j != i) ==
                pulp.lpSum(x[i, j, k] for j in all_node_ids if j != i),
                f"Flusso_{i}_{k}"
            )

    # 3. Partenza e rientro al deposito
    for k in veh_names:
        prob += pulp.lpSum(x[depot_id, j, k] for j in customer_node_ids) == z[k], f"Partenza_Deposito_{k}"
        prob += pulp.lpSum(x[i, depot_id, k] for i in customer_node_ids) == z[k], f"Rientro_Deposito_{k}"

    # 4. Accoppiamento veicolo: il ritiro P_i e la consegna D_i devono essere sullo STESSO mezzo k
    for p_id, d_id in pair_map.items():
        for k in veh_names:
            prob += (
                pulp.lpSum(x[p_id, j, k] for j in all_node_ids if j != p_id) ==
                pulp.lpSum(x[d_id, j, k] for j in all_node_ids if j != d_id),
                f"Stesso_Mezzo_{p_id}_{d_id}_{k}"
            )

    # 5. Precedenza temporale: il ritiro deve precedere la consegna (t[P_i] < t[D_i])
    for p_id, d_id in pair_map.items():
        for k in veh_names:
            prob += t[p_id, k] + 1 <= t[d_id, k] + 1000 * (1 - pulp.lpSum(x[p_id, j, k] for j in all_node_ids if j != p_id)), f"Precedenza_{p_id}_{d_id}_{k}"

    # 6. Aggiornamento orario di visita t tra nodi successivi
    big_M = 100.0
    for k in veh_names:
        prob += t[depot_id, k] == 0, f"Tempo_Deposito_{k}"
        for i in all_node_ids:
            for j in customer_node_ids:
                if i != j:
                    prob += t[j, k] >= t[i, k] + 1 - big_M * (1 - x[i, j, k]), f"Subtour_T_{i}_{j}_{k}"

    # 7. Aggiornamento dinamico del carico a bordo lungo la rotta
    for k in veh_names:
        prob += l[depot_id, k] == 0, f"Carico_Partenza_{k}"
        cap_k = veh_caps[k]
        for i in all_node_ids:
            for j in customer_node_ids:
                if i != j:
                    q_j = demand[j]
                    prob += l[j, k] >= l[i, k] + q_j - cap_k * (1 - x[i, j, k]), f"Carico_Min_{i}_{j}_{k}"
                    prob += l[j, k] <= l[i, k] + q_j + cap_k * (1 - x[i, j, k]), f"Carico_Max_{i}_{j}_{k}"

    # Risoluzione
    solver = pulp.PULP_CBC_CMD(msg=solver_msg, timeLimit=solver_time_limit, gapRel=0.03)
    prob.solve(solver)

    status_str = pulp.LpStatus[prob.status]
    is_optimal = (prob.status == pulp.LpStatusOptimal) or (prob.objective is not None and pulp.value(prob.objective) is not None)

    # Estrazione Risultati
    vehicles_res: Dict[str, Any] = {}
    total_km_overall = 0.0

    if is_optimal:
        for k in veh_names:
            z_val = pulp.value(z[k])
            is_used = bool(z_val is not None and z_val > 0.5)

            v_info: Dict[str, Any] = {
                "used": is_used,
                "capacity": veh_caps[k],
                "fixed_cost": veh_fixed[k],
                "total_km": 0.0,
                "travel_cost": 0.0,
                "total_cost": 0.0,
                "max_load_kg": 0.0,
                "route": [],
                "legs": [],
                "pickups_served": [],
                "deliveries_served": []
            }

            if is_used:
                # Ricostruzione giro
                curr = depot_id
                route_nodes = [curr]
                visited = set()

                while True:
                    next_node = None
                    for j in all_node_ids:
                        if j != curr and j not in visited:
                            val = pulp.value(x[curr, j, k])
                            if val and val > 0.5:
                                next_node = j
                                break
                    if next_node is None or next_node == depot_id:
                        route_nodes.append(depot_id)
                        break
                    route_nodes.append(next_node)
                    visited.add(next_node)
                    curr = next_node

                v_info["route"] = route_nodes

                # Calcolo tratte e carico
                running_km = 0.0
                running_load = 0.0
                legs = []
                for idx in range(len(route_nodes) - 1):
                    u = route_nodes[idx]
                    v = route_nodes[idx + 1]
                    d_km = dist[(u, v)]
                    running_km += d_km
                    running_load += demand[v]

                    leg_type = "PARTENZA" if u == depot_id else ("RIENTRO" if v == depot_id else ("PRELIEVO" if v in pickups else "CONSEGNA"))
                    if v in pickups:
                        v_info["pickups_served"].append(v)
                    elif v in deliveries:
                        v_info["deliveries_served"].append(v)

                    legs.append({
                        "from_id": u,
                        "to_id": v,
                        "from_name": nodes_dict[u]["name"],
                        "to_name": nodes_dict[v]["name"],
                        "km": d_km,
                        "cost": round(d_km * veh_km_costs[k], 2),
                        "load_after_kg": round(running_load, 1),
                        "type": leg_type
                    })

                v_info["legs"] = legs
                v_info["total_km"] = round(running_km, 2)
                v_info["cost_per_km"] = veh_km_costs[k]
                v_info["travel_cost"] = round(running_km * veh_km_costs[k], 2)
                v_info["total_cost"] = round(veh_fixed[k] + v_info["travel_cost"], 2)
                total_km_overall += running_km

            vehicles_res[k] = v_info

    # Formattazione arricchita per visualizzazione e report frontend
    clean_vehs_list = []
    total_served_reqs = set()
    for k, v in vehicles_res.items():
        v_copy = dict(v)
        v_copy["name"] = k
        v_copy["km"] = v["total_km"]
        v_copy["cost_per_km"] = v.get("cost_per_km", veh_km_costs.get(k, cost_per_km))
        v_copy["km_cost"] = v["travel_cost"]
        v_copy["max_load_carried"] = max([leg["load_after_kg"] for leg in v.get("legs", [])], default=0.0)
        detailed_stops = []
        if v["used"] and v.get("route"):
            cur_load = 0.0
            for nid in v["route"]:
                nd = nodes_dict.get(nid, {})
                ntype = "depot" if nid == depot_id else ("pickup" if nid in pickups else "delivery")
                cur_load += demand.get(nid, 0.0)
                detailed_stops.append({
                    "id": nid,
                    "name": nd.get("name", nid),
                    "type": ntype,
                    "load_onboard_after": round(cur_load, 1)
                })
                if ntype == "pickup":
                    total_served_reqs.add(nid)
        v_copy["detailed_stops"] = detailed_stops
        v_copy["route_nodes"] = v.get("route", [])
        clean_vehs_list.append(v_copy)

    obj_val = pulp.value(prob.objective) if is_optimal else 0.0

    return {
        "status": "Optimal" if is_optimal else status_str,
        "is_optimal": is_optimal,
        "objective_value": round(obj_val, 2) if obj_val else 0.0,
        "total_cost": round(obj_val, 2) if obj_val else 0.0,
        "total_km": round(total_km_overall, 2),
        "total_requests": len(requests),
        "requests_served": len(total_served_reqs),
        "cost_per_km": cost_per_km,
        "vehicles": clean_vehs_list,
        "vehicles_dict": vehicles_res,
        "nodes": nodes_dict,
        "depot": depot
    }


if __name__ == "__main__":
    scenario = get_default_vrppd_scenario()
    res = solve_vrppd(
        depot=scenario["depot"],
        requests=scenario["requests"],
        vehicles=scenario["vehicles"],
        cost_per_km=scenario["cost_per_km"]
    )
    print("VRPPD Soluzione:", res["status"], "Costo:", res["objective_value"], "Km:", res["total_km"])
