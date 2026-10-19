"""
Multi-Depot Vehicle Routing Problem (MDVRP)
Modello MILP in Python con PuLP.

Gestisce flotte aziendali distribuite su PIÙ depositi / magazzini / cantieri logistici.
Il solutore determina congiuntamente:
1. Quale deposito deve servire ciascun cliente / punto di consegna.
2. La rotta ottima per ciascun veicolo che parte e rientra al proprio deposito di appartenenza.
3. Il rispetto della capacità massima di carico di ciascun mezzo e la minimizzazione dei km totali e costi fissi.
"""

from typing import Dict, List, Tuple, Any, Optional
import math
import pulp


def euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calcola la distanza euclidea tra due punti coordinate."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def get_default_mdvrp_scenario() -> Dict[str, Any]:
    """
    Scenario benchmark per Multi-Depot VRP con 2 depositi territoriali (Nord e Sud) e 8 clienti.
    """
    depots = [
        {
            "id": "DEP_NORD",
            "name": "Cantiere Hub Nord (Conegliano)",
            "lat": 45.8900,
            "lon": 12.3000,
            "color": "#3b82f6"
        },
        {
            "id": "DEP_SUD",
            "name": "Cantiere Hub Sud (Treviso)",
            "lat": 45.6700,
            "lon": 12.2400,
            "color": "#10b981"
        }
    ]

    customers = [
        {"id": "CLI_1", "name": "Supermercato Nord-Est (Vittorio V.)", "lat": 45.9200, "lon": 12.3100, "demand": 450.0},
        {"id": "CLI_2", "name": "Centro Commerciale Colli (Susegana)", "lat": 45.8500, "lon": 12.2500, "demand": 600.0},
        {"id": "CLI_3", "name": "Distributore Alimentare (Pieve di Soligo)", "lat": 45.8950, "lon": 12.1800, "demand": 500.0},
        {"id": "CLI_4", "name": "Negozio Retail Nord (San Vendemiano)", "lat": 45.8850, "lon": 12.3350, "demand": 350.0},
        {"id": "CLI_5", "name": "Ipermercato Centro (Mogliano Veneto)", "lat": 45.6000, "lon": 12.2400, "demand": 700.0},
        {"id": "CLI_6", "name": "Farmacia Centrale (Treviso Centro)", "lat": 45.6660, "lon": 12.2450, "demand": 250.0},
        {"id": "CLI_7", "name": "Magazzino Ricambi (Silea)", "lat": 45.6550, "lon": 12.2850, "demand": 400.0},
        {"id": "CLI_8", "name": "Polo Produttivo Ovest (Paese)", "lat": 45.6750, "lon": 12.1600, "demand": 550.0}
    ]

    vehicles = [
        {
            "name": "Camion_Nord_1",
            "home_depot": "DEP_NORD",
            "capacity": 1500.0,
            "fixed_cost": 80.0,
            "cost_per_km": 1.20,
            "description": "Motrice assegnata a Cantiere Nord"
        },
        {
            "name": "Camion_Nord_2",
            "home_depot": "DEP_NORD",
            "capacity": 1500.0,
            "fixed_cost": 80.0,
            "cost_per_km": 1.20,
            "description": "Motrice assegnata a Cantiere Nord"
        },
        {
            "name": "Camion_Sud_1",
            "home_depot": "DEP_SUD",
            "capacity": 1600.0,
            "fixed_cost": 85.0,
            "cost_per_km": 1.20,
            "description": "Motrice assegnata a Cantiere Sud"
        },
        {
            "name": "Camion_Sud_2",
            "home_depot": "DEP_SUD",
            "capacity": 1600.0,
            "fixed_cost": 85.0,
            "cost_per_km": 1.20,
            "description": "Motrice assegnata a Cantiere Sud"
        }
    ]

    return {
        "depots": depots,
        "customers": customers,
        "vehicles": vehicles,
        "cost_per_km": 1.20
    }


def solve_mdvrp(
    depots: List[Dict[str, Any]],
    customers: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    cost_per_km: float = 1.20,
    solver_time_limit: int = 20,
    solver_msg: bool = False
) -> Dict[str, Any]:
    """
    Risolve il Multi-Depot VRP mediante formulazione MILP in PuLP.
    Ogni veicolo k ha un deposito di appartenenza home_depot_k e deve partire e rientrare in esso.
    """
    depot_ids = [str(d["id"]) for d in depots]
    customer_ids = [str(c["id"]) for c in customers]
    all_node_ids = depot_ids + customer_ids

    nodes_dict = {}
    for d in depots:
        nodes_dict[str(d["id"])] = d
    for c in customers:
        nodes_dict[str(c["id"])] = c

    coords = {}
    demands = {}
    for nid, ndata in nodes_dict.items():
        coords[nid] = (float(ndata.get("lat", 0.0)), float(ndata.get("lon", 0.0)))
        demands[nid] = float(ndata.get("demand", 0.0))

    # Matrice distanze in km
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
    veh_fixed = {str(v["name"]): float(v.get("fixed_cost", 70.0)) for v in vehicles}
    veh_km_costs = {str(v["name"]): float(v.get("cost_per_km") if v.get("cost_per_km") is not None else cost_per_km) for v in vehicles}
    veh_depot = {str(v["name"]): str(v.get("home_depot", depot_ids[0])) for v in vehicles}

    # Modello PuLP
    prob = pulp.LpProblem("OR_Route_MDVRP_Optimization", pulp.LpMinimize)

    # Variabili
    # x[i, j, k] = 1 se il mezzo k viaggia da i a j
    x = {
        (i, j, k): pulp.LpVariable(f"x_{i}_{j}_{k}", cat=pulp.LpBinary)
        for i in all_node_ids
        for j in all_node_ids
        for k in veh_names
        if i != j
    }

    # z[k] = 1 se il veicolo k è attivo
    z = {k: pulp.LpVariable(f"z_{k}", cat=pulp.LpBinary) for k in veh_names}

    # u[i, k]: carico cumulato per MTZ subtour elimination
    u = {
        (i, k): pulp.LpVariable(f"u_{i}_{k}", lowBound=0, upBound=veh_caps[k], cat=pulp.LpContinuous)
        for i in customer_ids
        for k in veh_names
    }

    # Funzione Obiettivo: Minimizzare km percorsi + costi fissi flotta
    km_term = pulp.lpSum(dist[(i, j)] * veh_km_costs[k] * x[i, j, k] for i in all_node_ids for j in all_node_ids for k in veh_names if i != j)
    fixed_term = pulp.lpSum(veh_fixed[k] * z[k] for k in veh_names)
    prob += km_term + fixed_term, "Costo_Totale_Operativo"

    # VINCOLI:
    # 1. Visita univoca di ogni cliente
    for i in customer_ids:
        prob += pulp.lpSum(x[i, j, k] for j in all_node_ids if j != i for k in veh_names) == 1, f"Visita_Cliente_{i}"

    # 2. Bilancio di flusso per ogni veicolo su ogni cliente
    for k in veh_names:
        for i in customer_ids:
            prob += (
                pulp.lpSum(x[j, i, k] for j in all_node_ids if j != i) ==
                pulp.lpSum(x[i, j, k] for j in all_node_ids if j != i),
                f"Flusso_{i}_{k}"
            )

    # 3. Partenza e Rientro obbligati nel proprio HOME DEPOT
    for k in veh_names:
        home = veh_depot[k]
        # Partenza da home_depot
        prob += pulp.lpSum(x[home, j, k] for j in customer_ids) == z[k], f"Partenza_Home_{k}"
        # Rientro a home_depot
        prob += pulp.lpSum(x[i, home, k] for i in customer_ids) == z[k], f"Rientro_Home_{k}"

        # Il veicolo non può partire o arrivare ad altri depositi
        for other_d in depot_ids:
            if other_d != home:
                prob += pulp.lpSum(x[other_d, j, k] for j in all_node_ids if j != other_d) == 0, f"No_Other_Depot_Out_{other_d}_{k}"
                prob += pulp.lpSum(x[i, other_d, k] for i in all_node_ids if i != other_d) == 0, f"No_Other_Depot_In_{other_d}_{k}"

    # 4. Eliminazione sottogiri e vincoli di capacità (MTZ)
    for k in veh_names:
        cap_k = veh_caps[k]
        for i in customer_ids:
            for j in customer_ids:
                if i != j:
                    prob += u[j, k] >= u[i, k] + demands[j] - cap_k * (1 - x[i, j, k]), f"MTZ_{i}_{j}_{k}"
            # Limite inferiore sul carico
            prob += u[i, k] >= demands[i], f"Carico_Min_{i}_{k}"
            prob += u[i, k] <= cap_k, f"Carico_Max_{i}_{k}"

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
            home = veh_depot[k]

            v_info: Dict[str, Any] = {
                "used": is_used,
                "home_depot": home,
                "home_depot_name": nodes_dict[home]["name"],
                "capacity": veh_caps[k],
                "fixed_cost": veh_fixed[k],
                "total_km": 0.0,
                "travel_cost": 0.0,
                "total_cost": 0.0,
                "total_load_kg": 0.0,
                "route": [],
                "legs": []
            }

            if is_used:
                curr = home
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
                    if next_node is None or next_node in depot_ids:
                        route_nodes.append(home)
                        break
                    route_nodes.append(next_node)
                    visited.add(next_node)
                    curr = next_node

                v_info["route"] = route_nodes

                running_km = 0.0
                running_load = 0.0
                legs = []
                for idx in range(len(route_nodes) - 1):
                    u_n = route_nodes[idx]
                    v_n = route_nodes[idx + 1]
                    d_km = dist[(u_n, v_n)]
                    running_km += d_km
                    running_load += demands.get(v_n, 0.0)

                    legs.append({
                        "from_id": u_n,
                        "to_id": v_n,
                        "from_name": nodes_dict[u_n]["name"],
                        "to_name": nodes_dict[v_n]["name"],
                        "km": d_km,
                        "cost": round(d_km * veh_km_costs[k], 2),
                        "load_after_kg": round(running_load, 1)
                    })

                v_info["legs"] = legs
                v_info["total_km"] = round(running_km, 2)
                v_info["total_load_kg"] = round(running_load, 1)
                v_info["cost_per_km"] = veh_km_costs[k]
                v_info["travel_cost"] = round(running_km * veh_km_costs[k], 2)
                v_info["total_cost"] = round(veh_fixed[k] + v_info["travel_cost"], 2)
                total_km_overall += running_km

            vehicles_res[k] = v_info

    # Formattazione arricchita per visualizzazione e report frontend
    clean_vehs_list = []
    depots_used = set()
    for k, v in vehicles_res.items():
        v_copy = dict(v)
        v_copy["name"] = k
        v_copy["km"] = v["total_km"]
        v_copy["cost_per_km"] = v.get("cost_per_km", veh_km_costs.get(k, cost_per_km))
        v_copy["km_cost"] = v["travel_cost"]
        v_copy["total_load"] = v["total_load_kg"]
        stops = []
        if v["used"] and v.get("route"):
            depots_used.add(v["home_depot"])
            for nid in v["route"]:
                nd = nodes_dict.get(nid, {})
                stops.append({
                    "id": nid,
                    "name": nd.get("name", nid),
                    "is_depot": nid in depot_ids,
                    "demand": demands.get(nid, 0.0)
                })
        v_copy["stops"] = stops
        v_copy["route_nodes"] = v.get("route", [])
        clean_vehs_list.append(v_copy)

    obj_val = pulp.value(prob.objective) if is_optimal else 0.0

    return {
        "status": "Optimal" if is_optimal else status_str,
        "is_optimal": is_optimal,
        "objective_value": round(obj_val, 2) if obj_val else 0.0,
        "total_cost": round(obj_val, 2) if obj_val else 0.0,
        "total_km": round(total_km_overall, 2),
        "total_customers": len(customers),
        "cost_per_km": cost_per_km,
        "depots": depots,
        "depots_used": list(depots_used),
        "vehicles": clean_vehs_list,
        "vehicles_dict": vehicles_res,
        "nodes": nodes_dict
    }


if __name__ == "__main__":
    scenario = get_default_mdvrp_scenario()
    res = solve_mdvrp(
        depots=scenario["depots"],
        customers=scenario["customers"],
        vehicles=scenario["vehicles"],
        cost_per_km=scenario["cost_per_km"]
    )
    print("MDVRP Soluzione:", res["status"], "Costo:", res["objective_value"], "Km:", res["total_km"])
