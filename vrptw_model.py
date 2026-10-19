"""
Vehicle Routing Problem with Time Windows (VRPTW) - Modello MILP in Python con PuLP.
Ottimizzazione percorsi per consegne con vincoli di capacità e finestre temporali tassative
(es. supermercati con slot di scarico, distribuzione farmaci, tecnici a domicilio su appuntamento).
"""

from typing import Dict, List, Tuple, Any, Optional
import math
import pulp


def euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def minutes_to_time_str(mins: float, base_hour: int = 8) -> str:
    """Converte minuti trascorsi dalle 08:00 in stringa oraria 'HH:MM'."""
    total_m = int(round(mins)) + base_hour * 60
    h = (total_m // 60) % 24
    m = total_m % 60
    return f"{h:02d}:{m:02d}"


def solve_vrptw(
    depot: Dict[str, Any],
    customers: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    speed_kmh: float = 35.0,
    cost_per_km: float = 1.20,
    solver_time_limit: int = 25,
    solver_msg: bool = False
) -> Dict[str, Any]:
    """
    Risolve il problema VRPTW con finestre temporali [ready_time, due_time] e tempi di servizio.
    
    Args:
        depot: Dict con id (0), name, lat, lon, ready_time (min), due_time (min)
        customers: Lista di Dict con id, name, lat, lon, demand (kg/colli), ready_time, due_time, service_time
        vehicles: Lista di Dict con name, capacity, fixed_cost
        speed_kmh: Velocità media flotta per conversione distanze in tempi di percorrenza
        cost_per_km: Costo chilometrico variabile
        solver_time_limit: Limite tempo solutore
        solver_msg: Verbose PuLP
    """
    all_nodes = [depot] + customers
    node_ids = [n["id"] for n in all_nodes]
    customer_ids = [c["id"] for c in customers]
    depot_id = depot["id"]

    coords = {}
    demands = {depot_id: 0.0}
    ready_times = {depot_id: float(depot.get("ready_time", 0.0))}
    due_times = {depot_id: float(depot.get("due_time", 600.0))}  # default 10h di turno
    service_times = {depot_id: 0.0}

    for c in customers:
        c_id = c["id"]
        coords[c_id] = (float(c.get("lat", c.get("y", 0.0))), float(c.get("lon", c.get("x", 0.0))))
        demands[c_id] = float(c.get("demand", 100.0))
        ready_times[c_id] = float(c.get("ready_time", 0.0))
        due_times[c_id] = float(c.get("due_time", 480.0))
        service_times[c_id] = float(c.get("service_time", 15.0))  # 15 minuti standard scarico

    coords[depot_id] = (float(depot.get("lat", depot.get("y", 0.0))), float(depot.get("lon", depot.get("x", 0.0))))

    # Matrice distanze (km) e tempi di viaggio (minuti)
    dist = {}
    travel_time = {}
    for i in node_ids:
        for j in node_ids:
            if i == j:
                dist[(i, j)] = 0.0
                travel_time[(i, j)] = 0.0
            else:
                d_eucl = euclidean_distance(coords[i], coords[j])
                d_km = d_eucl * 111.0 if d_eucl < 10.0 else d_eucl
                d_km = round(d_km, 2)
                t_min = round((d_km / speed_kmh) * 60.0, 1)
                dist[(i, j)] = d_km
                travel_time[(i, j)] = t_min

    veh_names = [v["name"] for v in vehicles]
    veh_caps = {v["name"]: float(v["capacity"]) for v in vehicles}
    veh_fixed = {v["name"]: float(v.get("fixed_cost", 60.0)) for v in vehicles}

    # Big M per linearizzazione finestre temporali
    max_horizon = max(due_times.values()) + 120.0
    M = max_horizon

    # Modello PuLP
    prob = pulp.LpProblem("OptiFleet_VRPTW_Optimization", pulp.LpMinimize)

    # Variabili decisionali
    x = {
        (i, j, k): pulp.LpVariable(f"x_{i}_{j}_{k}", cat=pulp.LpBinary)
        for i in node_ids
        for j in node_ids
        for k in veh_names
        if i != j
    }

    z = {
        k: pulp.LpVariable(f"z_{k}", cat=pulp.LpBinary)
        for k in veh_names
    }

    # w[i, k]: orario (minuti) di inizio servizio del veicolo k al nodo i
    w = {
        (i, k): pulp.LpVariable(f"w_{i}_{k}", lowBound=0, upBound=max_horizon, cat=pulp.LpContinuous)
        for i in node_ids
        for k in veh_names
    }

    # u[i, k]: carico cumulato (MTZ subtour)
    u = {
        (i, k): pulp.LpVariable(f"u_{i}_{k}", lowBound=0, cat=pulp.LpContinuous)
        for i in customer_ids
        for k in veh_names
    }

    # Funzione Obiettivo: Minimizzare km percorsi + costi fissi veicoli + (peso minore su tempo totale)
    total_dist_cost = pulp.lpSum(
        dist[(i, j)] * cost_per_km * x[i, j, k]
        for i in node_ids
        for j in node_ids
        for k in veh_names
        if i != j
    )
    total_fixed_cost = pulp.lpSum(veh_fixed[k] * z[k] for k in veh_names)
    prob += total_dist_cost + total_fixed_cost, "Costo_Totale_VRPTW"

    # Vincoli

    # (1) Ciascun cliente visitato esattamente una volta
    for i in customer_ids:
        prob += (
            pulp.lpSum(x[i, j, k] for j in node_ids if j != i for k in veh_names) == 1,
            f"Visita_Univoca_{i}"
        )

    # (2) Conservazione del flusso al nodo cliente
    for k in veh_names:
        for p in customer_ids:
            inflow = pulp.lpSum(x[i, p, k] for i in node_ids if i != p)
            outflow = pulp.lpSum(x[p, j, k] for j in node_ids if j != p)
            prob += (inflow - outflow == 0, f"Bilancio_Flusso_{p}_{k}")

    # (3) Partenza e rientro al deposito
    for k in veh_names:
        prob += (pulp.lpSum(x[depot_id, j, k] for j in customer_ids) == z[k], f"Partenza_{k}")
        prob += (pulp.lpSum(x[i, depot_id, k] for i in customer_ids) == z[k], f"Rientro_{k}")

    # (4) Portata e carico cumulato
    for k in veh_names:
        Q = veh_caps[k]
        for i in customer_ids:
            for j in customer_ids:
                if i != j:
                    prob += (
                        u[j, k] >= u[i, k] + demands[j] - Q * (1 - x[i, j, k]),
                        f"Cap_Flow_{i}_{j}_{k}"
                    )
        for i in customer_ids:
            prob += (u[i, k] >= demands[i], f"Min_Cap_{i}_{k}")
            prob += (u[i, k] <= Q, f"Max_Cap_{i}_{k}")

    # (5) Propagazione temporale: w_j >= w_i + service_time_i + travel_time_ij - M*(1 - x_ijk)
    for k in veh_names:
        for i in node_ids:
            for j in customer_ids:
                if i != j:
                    prob += (
                        w[j, k] >= w[i, k] + service_times[i] + travel_time[(i, j)] - M * (1 - x[i, j, k]),
                        f"Time_Window_Prop_{i}_{j}_{k}"
                    )

    # (6) Rispetto delle finestre temporali [a_i, b_i]
    for k in veh_names:
        # Partenza da deposito dopo ready_time del deposito
        prob += (w[depot_id, k] >= ready_times[depot_id], f"Depot_Ready_{k}")
        for i in customer_ids:
            # Se il veicolo visita i, l'inizio servizio deve essere entro [ready, due]
            prob += (w[i, k] >= ready_times[i], f"Ready_Time_{i}_{k}")
            prob += (w[i, k] <= due_times[i], f"Due_Time_{i}_{k}")

    # (7) Symmetry breaking per veicoli gemelli
    for k_idx in range(len(veh_names) - 1):
        k1 = veh_names[k_idx]
        k2 = veh_names[k_idx + 1]
        if veh_caps[k1] == veh_caps[k2] and veh_fixed[k1] == veh_fixed[k2]:
            prob += (z[k1] >= z[k2], f"Symmetry_{k1}_{k2}")

    # Risoluzione
    solver = pulp.PULP_CBC_CMD(msg=solver_msg, timeLimit=solver_time_limit, gapRel=0.03)
    prob.solve(solver)

    status_str = pulp.LpStatus[prob.status]
    is_optimal = (prob.status == pulp.LpStatusOptimal)

    result = {
        "model_type": "VRPTW",
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

        route_nodes = []
        veh_dist = 0.0
        veh_load = 0.0

        if is_used:
            successors = {}
            for i in node_ids:
                for j in node_ids:
                    if i != j:
                        val = pulp.value(x[i, j, k])
                        if val and val > 0.5:
                            successors[i] = j
                            veh_dist += dist[(i, j)]

            curr = depot_id
            visited_seq = [curr]
            while curr in successors and successors[curr] != depot_id:
                next_node = successors[curr]
                visited_seq.append(next_node)
                veh_load += demands[next_node]
                curr = next_node
                if len(visited_seq) > len(node_ids) + 2:
                    break
            visited_seq.append(depot_id)
            route_nodes = visited_seq

        total_dist_all += veh_dist

        # Costruzione timeline cronologica con orari esatti di arrivo e servizio
        stops_detail = []
        for n_id in route_nodes:
            w_val = pulp.value(w[n_id, k]) or 0.0
            time_formatted = minutes_to_time_str(w_val)
            if n_id == depot_id:
                stops_detail.append({
                    "id": depot_id,
                    "name": depot.get("name", "Deposito"),
                    "lat": coords[depot_id][0],
                    "lon": coords[depot_id][1],
                    "demand": 0,
                    "is_depot": True,
                    "service_start_min": round(w_val, 1),
                    "service_start_time": time_formatted,
                    "window": f"{minutes_to_time_str(ready_times[depot_id])} - {minutes_to_time_str(due_times[depot_id])}"
                })
            else:
                cust_match = next((c for c in customers if c["id"] == n_id), None)
                stops_detail.append({
                    "id": n_id,
                    "name": cust_match.get("name", f"Cliente {n_id}") if cust_match else f"Cliente {n_id}",
                    "lat": coords[n_id][0],
                    "lon": coords[n_id][1],
                    "demand": demands[n_id],
                    "is_depot": False,
                    "service_start_min": round(w_val, 1),
                    "service_start_time": time_formatted,
                    "service_duration_min": service_times[n_id],
                    "window": f"{minutes_to_time_str(ready_times[n_id])} - {minutes_to_time_str(due_times[n_id])}"
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


def get_default_vrptw_scenario() -> Dict[str, Any]:
    """Scenario tipico per consegne con finestre orarie (distribuzione farmaci/alimentari freschi)."""
    return {
        "depot": {
            "id": 0,
            "name": "Piattaforma Distribuzione Freschi (Bologna CAAB)",
            "lat": 44.5120,
            "lon": 11.3980,
            "ready_time": 0.0,   # 08:00
            "due_time": 480.0    # 16:00
        },
        "speed_kmh": 38.0,
        "cost_per_km": 1.25,
        "vehicles": [
            {"name": "Furgone_Frigo_1", "capacity": 1000, "fixed_cost": 75.0},
            {"name": "Furgone_Frigo_2", "capacity": 1000, "fixed_cost": 75.0},
            {"name": "Furgone_Frigo_3", "capacity": 1500, "fixed_cost": 90.0}
        ],
        "customers": [
            {"id": 1, "name": "Supermercato Pam (Centro)", "lat": 44.4940, "lon": 11.3430, "demand": 320, "ready_time": 30.0, "due_time": 120.0, "service_time": 20.0},     # 08:30 - 10:00
            {"id": 2, "name": "Ospedale S. Orsola (Farmacia)", "lat": 44.4910, "lon": 11.3650, "demand": 180, "ready_time": 45.0, "due_time": 150.0, "service_time": 25.0},  # 08:45 - 10:30
            {"id": 3, "name": "Ristorante Gourmet (San Lazzaro)", "lat": 44.4710, "lon": 11.4100, "demand": 210, "ready_time": 120.0, "due_time": 240.0, "service_time": 15.0},# 10:00 - 12:00
            {"id": 4, "name": "Mensa Aziendale (Casalecchio)", "lat": 44.4780, "lon": 11.2750, "demand": 350, "ready_time": 60.0, "due_time": 180.0, "service_time": 25.0},   # 09:00 - 11:00
            {"id": 5, "name": "Hotel Bologna Congressi", "lat": 44.5150, "lon": 11.3550, "demand": 240, "ready_time": 180.0, "due_time": 300.0, "service_time": 15.0},      # 11:00 - 13:00
            {"id": 6, "name": "Ipercoop Lame (Nord)", "lat": 44.5220, "lon": 11.3250, "demand": 410, "ready_time": 90.0, "due_time": 210.0, "service_time": 30.0},          # 09:30 - 11:30
            {"id": 7, "name": "Bistrot Stazione Centrale", "lat": 44.5050, "lon": 11.3420, "demand": 150, "ready_time": 240.0, "due_time": 360.0, "service_time": 15.0}       # 12:00 - 14:00
        ]
    }
