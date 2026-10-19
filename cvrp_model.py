"""
Capacitated Vehicle Routing Problem (CVRP) - Modello MILP in Python con PuLP.
Ottimizzazione percorsi di consegna/ritiro a clienti da deposito centrale con vincoli di capacità.
Formulazione con eliminazione sottogiri tipo Miller-Tucker-Zemlin (MTZ).
"""

from typing import Dict, List, Tuple, Any, Optional
import math
import pulp


def euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calcola la distanza euclidea tra due punti coordinate (km o unità arbitrarie)."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def solve_cvrp(
    depot: Dict[str, Any],
    customers: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    cost_per_km: float = 1.20,
    solver_time_limit: int = 25,
    solver_msg: bool = False
) -> Dict[str, Any]:
    """
    Risolve il problema CVRP per una flotta aziendale.
    
    Args:
        depot: Dict con id (es. 0), name, lat, lon (o x, y)
        customers: Lista di Dict con id, name, lat, lon (o x, y), demand (kg o colli)
        vehicles: Lista di Dict con name, capacity, fixed_cost
        cost_per_km: Costo variabile per km
        solver_time_limit: Limite di tempo per il solutore CBC (secondi)
        solver_msg: Flag output solutore
    """
    # 1. Preparazione Nodi e Matrice Distanze
    all_nodes = [depot] + customers
    node_ids = [n["id"] for n in all_nodes]
    customer_ids = [c["id"] for c in customers]
    depot_id = depot["id"]

    coords = {}
    demands = {depot_id: 0.0}
    for n in all_nodes:
        lat = float(n.get("lat", n.get("y", 0.0)))
        lon = float(n.get("lon", n.get("x", 0.0)))
        coords[n["id"]] = (lat, lon)
        if n["id"] != depot_id:
            demands[n["id"]] = float(n.get("demand", 100.0))

    dist = {}
    for i in node_ids:
        for j in node_ids:
            if i == j:
                dist[(i, j)] = 0.0
            else:
                # Se coordinate geografiche reali, approssimiamo distanza in km (~111km per grado)
                d_eucl = euclidean_distance(coords[i], coords[j])
                dist_km = d_eucl * 111.0 if d_eucl < 10.0 else d_eucl
                dist[(i, j)] = round(dist_km, 2)

    veh_names = [v["name"] for v in vehicles]
    veh_caps = {v["name"]: float(v["capacity"]) for v in vehicles}
    veh_fixed = {v["name"]: float(v.get("fixed_cost", 50.0)) for v in vehicles}

    # 2. Modello PuLP
    prob = pulp.LpProblem("OptiFleet_CVRP_Optimization", pulp.LpMinimize)

    # Variabili decisionali
    # x[i, j, k] = 1 se il veicolo k va direttamente da i a j
    x = {
        (i, j, k): pulp.LpVariable(f"x_{i}_{j}_{k}", cat=pulp.LpBinary)
        for i in node_ids
        for j in node_ids
        for k in veh_names
        if i != j
    }

    # z[k] = 1 se il veicolo k viene attivato
    z = {
        k: pulp.LpVariable(f"z_{k}", cat=pulp.LpBinary)
        for k in veh_names
    }

    # u[i, k] = carico cumulato del veicolo k dopo aver servito il nodo i (MTZ subtour elimination)
    u = {
        (i, k): pulp.LpVariable(f"u_{i}_{k}", lowBound=0, cat=pulp.LpContinuous)
        for i in customer_ids
        for k in veh_names
    }

    # 3. Funzione Obiettivo: Minimizzare (km percorsi * costo_km) + costi fissi accensione
    total_km_cost = pulp.lpSum(
        dist[(i, j)] * cost_per_km * x[i, j, k]
        for i in node_ids
        for j in node_ids
        for k in veh_names
        if i != j
    )
    total_fixed_cost = pulp.lpSum(veh_fixed[k] * z[k] for k in veh_names)
    prob += total_km_cost + total_fixed_cost, "Costo_Totale_Flotta"

    # 4. Vincoli

    # (1) Ciascun cliente deve essere visitato esattamente una volta da un veicolo
    for i in customer_ids:
        prob += (
            pulp.lpSum(x[i, j, k] for j in node_ids if j != i for k in veh_names) == 1,
            f"Visita_Univoca_{i}"
        )

    # (2) Conservazione del flusso su ciascun cliente
    for k in veh_names:
        for p in customer_ids:
            inflow = pulp.lpSum(x[i, p, k] for i in node_ids if i != p)
            outflow = pulp.lpSum(x[p, j, k] for j in node_ids if j != p)
            prob += (inflow - outflow == 0, f"Bilancio_Flusso_{p}_{k}")

    # (3) Partenza e rientro al deposito
    for k in veh_names:
        departures = pulp.lpSum(x[depot_id, j, k] for j in customer_ids)
        prob += (departures == z[k], f"Uscita_Deposito_{k}")

        returns = pulp.lpSum(x[i, depot_id, k] for i in customer_ids)
        prob += (returns == z[k], f"Rientro_Deposito_{k}")

    # (4) Vincoli di portata massima e sottogiri (MTZ)
    for k in veh_names:
        Q = veh_caps[k]
        for i in customer_ids:
            for j in customer_ids:
                if i != j:
                    prob += (
                        u[j, k] >= u[i, k] + demands[j] - Q * (1 - x[i, j, k]),
                        f"MTZ_Cap_{i}_{j}_{k}"
                    )
        # Limiti sul carico cumulato
        for i in customer_ids:
            prob += (u[i, k] >= demands[i], f"Min_Load_{i}_{k}")
            prob += (u[i, k] <= Q, f"Max_Load_{i}_{k}")

    # (5) Symmetry breaking tra veicoli identici per accelerare il branch and bound
    for k_idx in range(len(veh_names) - 1):
        k1 = veh_names[k_idx]
        k2 = veh_names[k_idx + 1]
        if veh_caps[k1] == veh_caps[k2] and veh_fixed[k1] == veh_fixed[k2]:
            prob += (z[k1] >= z[k2], f"Symmetry_{k1}_{k2}")

    # 5. Risoluzione
    solver = pulp.PULP_CBC_CMD(msg=solver_msg, timeLimit=solver_time_limit, gapRel=0.03)
    prob.solve(solver)

    status_str = pulp.LpStatus[prob.status]
    is_optimal = (prob.status == pulp.LpStatusOptimal)

    result = {
        "model_type": "CVRP",
        "status": status_str,
        "is_optimal": is_optimal,
        "objective_value": pulp.value(prob.objective) if is_optimal else None,
        "total_demand": sum(demands[c] for c in customer_ids),
        "total_distance_km": 0.0,
        "vehicles": {},
        "customers_data": customers,
        "depot_data": depot
    }

    if not is_optimal:
        return result

    total_dist_all = 0.0

    for k in veh_names:
        z_val = pulp.value(z[k])
        is_used = bool(z_val is not None and z_val > 0.5)

        # Ricostruzione sequenza tappe ordinate
        route_nodes = []
        route_edges = []
        veh_dist = 0.0
        veh_load = 0.0

        if is_used:
            # Trova successori
            successors = {}
            for i in node_ids:
                for j in node_ids:
                    if i != j:
                        val = pulp.value(x[i, j, k])
                        if val and val > 0.5:
                            successors[i] = j
                            route_edges.append((i, j, dist[(i, j)]))
                            veh_dist += dist[(i, j)]

            # Percorri la catena dal deposito
            curr = depot_id
            visited_seq = [curr]
            while curr in successors and successors[curr] != depot_id:
                next_node = successors[curr]
                visited_seq.append(next_node)
                veh_load += demands[next_node]
                curr = next_node
                if len(visited_seq) > len(node_ids) + 2:
                    break  # protezione loop
            visited_seq.append(depot_id)
            route_nodes = visited_seq

        total_dist_all += veh_dist

        # Dettaglio tappe per UI
        stops_detail = []
        for n_id in route_nodes:
            if n_id == depot_id:
                stops_detail.append({
                    "id": depot_id,
                    "name": depot.get("name", "Deposito"),
                    "lat": coords[depot_id][0],
                    "lon": coords[depot_id][1],
                    "demand": 0,
                    "is_depot": True
                })
            else:
                cust_match = next((c for c in customers if c["id"] == n_id), None)
                stops_detail.append({
                    "id": n_id,
                    "name": cust_match.get("name", f"Cliente {n_id}") if cust_match else f"Cliente {n_id}",
                    "lat": coords[n_id][0],
                    "lon": coords[n_id][1],
                    "demand": demands[n_id],
                    "is_depot": False
                })

        result["vehicles"][k] = {
            "used": is_used,
            "capacity": veh_caps[k],
            "fixed_cost": veh_fixed[k],
            "total_load": veh_load,
            "saturation_pct": round((veh_load / veh_caps[k]) * 100, 1) if veh_caps[k] > 0 else 0,
            "distance_km": round(veh_dist, 2),
            "km_cost": round(veh_dist * cost_per_km, 2),
            "route_nodes": route_nodes,
            "stops": stops_detail
        }

    result["total_distance_km"] = round(total_dist_all, 2)
    return result


def get_default_cvrp_scenario() -> Dict[str, Any]:
    """Restituisce uno scenario aziendale CVRP standard (distribuzione merci corriere/logistica)."""
    return {
        "depot": {
            "id": 0,
            "name": "Hub Logistico Centrale (Verona Interporto)",
            "lat": 45.3850,
            "lon": 10.9500
        },
        "cost_per_km": 1.15,
        "vehicles": [
            {"name": "Furgone_EcoDaily_1", "capacity": 1200, "fixed_cost": 60.0},
            {"name": "Furgone_EcoDaily_2", "capacity": 1200, "fixed_cost": 60.0}
        ],
        "customers": [
            {"id": 1, "name": "Supermercato Conad (Peschiera)", "lat": 45.4380, "lon": 10.6900, "demand": 380},
            {"id": 2, "name": "Farmacia Centrale (Desenzano)", "lat": 45.4700, "lon": 10.5350, "demand": 160},
            {"id": 3, "name": "Centro Brico (Affi)", "lat": 45.5500, "lon": 10.8400, "demand": 420},
            {"id": 4, "name": "Ristorante Gourmet (Bardolino)", "lat": 45.5450, "lon": 10.7200, "demand": 210},
            {"id": 5, "name": "Hotel Resort (Sirmione)", "lat": 45.4920, "lon": 10.6080, "demand": 340},
            {"id": 6, "name": "Pasticceria Artigiana (Villafranca)", "lat": 45.3500, "lon": 10.8450, "demand": 190}
        ]
    }
