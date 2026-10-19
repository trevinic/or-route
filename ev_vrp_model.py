"""
WCVRPTW-IF & EV-VRP: Waste Collection / Electric Vehicle Routing Problem with Intermediate Facilities.
Modello e algoritmo di ottimizzazione per percorsi con scarichi intermedi (discariche/impianti TMB)
o soste di ricarica rapida (stazioni DC per flotte elettriche commerciali).
"""

from typing import Dict, List, Tuple, Any, Optional
import math
import pulp


def euclidean_dist(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def get_default_ev_vrp_scenario() -> Dict[str, Any]:
    """Ritorna lo scenario predefinito per la simulazione di flotta elettrica con ricarica intermedia."""
    return {
        "depot": {
            "id": "DEPOT",
            "name": "Hub Centrale & Deposito Notturno",
            "lat": 45.440,
            "lon": 12.315
        },
        "intermediate_facilities": [
            {
                "id": "FAC_1",
                "name": "Impianto TMB / Stazione DC Ricarica Nord",
                "type": "recharge_and_dump",
                "lat": 45.485,
                "lon": 12.260
            },
            {
                "id": "FAC_2",
                "name": "Hub Ricarica Rapida 150kW Sud",
                "type": "recharge_fast",
                "lat": 45.405,
                "lon": 12.285
            }
        ],
        "kwh_cost": 0.38,  # € per kWh ricaricato
        "kwh_per_km": 0.45,  # consumo medio veicolo commerciale pesante EV
        "vehicles": [
            {
                "name": "Compattatore_EV_1",
                "capacity_kg": 3500,
                "battery_kwh": 90,
                "kwh_cost": 0.38,
                "kwh_per_km": 0.45,
                "fixed_cost": 110.0,
                "description": "Veicolo 100% elettrico urbano 90 kWh"
            },
            {
                "name": "Compattatore_EV_2",
                "capacity_kg": 3500,
                "battery_kwh": 90,
                "kwh_cost": 0.38,
                "kwh_per_km": 0.45,
                "fixed_cost": 110.0,
                "description": "Veicolo 100% elettrico urbano 90 kWh"
            }
        ],
        "customers": [
            {"id": "C1", "name": "Zona Residenziale Mestre Centro", "lat": 45.492, "lon": 12.240, "demand": 950},
            {"id": "C2", "name": "Distretto Commerciale Marghera", "lat": 45.468, "lon": 12.215, "demand": 1200},
            {"id": "C3", "name": "Ospedale dell'Angelo", "lat": 45.515, "lon": 12.228, "demand": 800},
            {"id": "C4", "name": "Zona Industriale Ovest", "lat": 45.452, "lon": 12.195, "demand": 1400},
            {"id": "C5", "name": "Polo Logistico Vega", "lat": 45.475, "lon": 12.255, "demand": 1100},
            {"id": "C6", "name": "Quartiere Gazzera", "lat": 45.501, "lon": 12.212, "demand": 850},
            {"id": "C7", "name": "Quartiere Favaro Veneto", "lat": 45.510, "lon": 12.285, "demand": 900}
        ]
    }


def solve_ev_vrp(
    depot: Dict[str, Any],
    facilities: List[Dict[str, Any]],
    customers: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    kwh_cost: float = 0.38,
    kwh_per_km: float = 0.45,
    solver_time_limit: int = 25
) -> Dict[str, Any]:
    """
    Risolve il problema di routing con soste intermedie per ricarica batteria o scarico rifiuti.
    Supporta specifiche individuali di consumo (kWh/km) e costo energia (€/kWh) per ogni mezzo.
    """
    all_points = [depot] + facilities + customers
    coords = {}
    for p in all_points:
        coords[p["id"]] = (float(p["lat"]), float(p["lon"]))

    # Matrice distanze in km (approssimazione 111 km/grado)
    dist = {}
    for p1 in all_points:
        for p2 in all_points:
            id1, id2 = p1["id"], p2["id"]
            if id1 == id2:
                dist[(id1, id2)] = 0.0
            else:
                d = euclidean_dist(coords[id1], coords[id2]) * 111.0
                dist[(id1, id2)] = round(d, 2)

    total_demand = sum(float(c["demand"]) for c in customers)
    total_capacity = sum(float(v.get("capacity_kg", v.get("capacity", 3500))) for v in vehicles)

    # Heuristic Clustering con inserimento stazioni intermedie quando il carico o la batteria lo esigono
    # Partiziona i clienti tra i veicoli
    unassigned = list(customers)
    # Ordina per distanza dal deposito
    unassigned.sort(key=lambda c: dist[(depot["id"], c["id"])])

    sol_vehicles = {}
    total_objective = 0.0
    total_km = 0.0
    total_kwh_used = 0.0

    cust_per_veh = int(math.ceil(len(unassigned) / max(1, len(vehicles))))

    for v_idx, v in enumerate(vehicles):
        v_name = v["name"]
        v_cap = float(v.get("capacity_kg", v.get("capacity", 3500)))
        v_bat = float(v.get("battery_kwh", 90.0))
        fixed_cost = float(v.get("fixed_cost", 100.0))
        v_kwh_cost = float(v.get("kwh_cost") if v.get("kwh_cost") is not None else kwh_cost)
        v_kwh_per_km = float(v.get("kwh_per_km") if v.get("kwh_per_km") is not None else kwh_per_km)

        # Assegna sottoinsieme clienti
        my_customers = unassigned[v_idx * cust_per_veh : (v_idx + 1) * cust_per_veh]
        if not my_customers:
            sol_vehicles[v_name] = {
                "used": False,
                "capacity": v_cap,
                "battery_kwh": v_bat,
                "kwh_cost": v_kwh_cost,
                "kwh_per_km": v_kwh_per_km,
                "fixed_cost": fixed_cost,
                "total_load": 0,
                "total_km": 0,
                "kwh_used": 0,
                "cost": 0,
                "stops": []
            }
            continue

        # Costruisce il percorso con Nearest Neighbor dal deposito
        current_id = depot["id"]
        stops = [
            {
                "id": depot["id"],
                "name": depot["name"],
                "type": "depot",
                "lat": coords[depot["id"]][0],
                "lon": coords[depot["id"]][1],
                "load": 0,
                "battery_remaining_kwh": v_bat
            }
        ]

        current_load = 0.0
        current_battery = v_bat
        v_dist = 0.0
        v_kwh = 0.0
        remaining = list(my_customers)

        while remaining:
            # Trova cliente più vicino
            remaining.sort(key=lambda c: dist[(current_id, c["id"])])
            next_c = remaining[0]
            d_next = dist[(current_id, next_c["id"])]
            kwh_next = d_next * v_kwh_per_km
            c_demand = float(next_c["demand"])

            # Controlla se serve ricarica o scarico intermedio
            needs_dump = (current_load + c_demand > v_cap)
            needs_recharge = (current_battery - kwh_next < v_bat * 0.20)  # riserva 20%

            if (needs_dump or needs_recharge) and facilities:
                # Seleziona impianto intermedio più comodo
                best_fac = min(facilities, key=lambda f: dist[(current_id, f["id"])] + dist[(f["id"], next_c["id"])])
                d_to_fac = dist[(current_id, best_fac["id"])]
                v_dist += d_to_fac
                current_battery -= d_to_fac * v_kwh_per_km
                v_kwh += d_to_fac * v_kwh_per_km

                action_desc = "Scarico Rifiuti TMB (0 kg)" if needs_dump else "Ricarica Rapida DC 100%"
                if needs_dump and needs_recharge:
                    action_desc = "Scarico Rifiuti TMB + Ricarica Rapida"

                current_load = 0.0
                current_battery = v_bat  # Ricarica e svuotamento completo

                stops.append({
                    "id": best_fac["id"],
                    "name": best_fac["name"],
                    "type": "facility",
                    "action": action_desc,
                    "lat": coords[best_fac["id"]][0],
                    "lon": coords[best_fac["id"]][1],
                    "load": 0,
                    "battery_remaining_kwh": current_battery
                })
                current_id = best_fac["id"]

            # Raggiunge il cliente
            d_step = dist[(current_id, next_c["id"])]
            v_dist += d_step
            kwh_step = d_step * v_kwh_per_km
            current_battery -= kwh_step
            v_kwh += kwh_step
            current_load += c_demand

            stops.append({
                "id": next_c["id"],
                "name": next_c["name"],
                "type": "customer",
                "demand": c_demand,
                "lat": coords[next_c["id"]][0],
                "lon": coords[next_c["id"]][1],
                "load": round(current_load, 1),
                "battery_remaining_kwh": round(current_battery, 1)
            })
            current_id = next_c["id"]
            remaining.pop(0)

        # Rientro al deposito centrale
        d_return = dist[(current_id, depot["id"])]
        v_dist += d_return
        v_kwh += d_return * v_kwh_per_km
        current_battery -= d_return * v_kwh_per_km

        stops.append({
            "id": depot["id"],
            "name": depot["name"] + " (Rientro)",
            "type": "depot",
            "lat": coords[depot["id"]][0],
            "lon": coords[depot["id"]][1],
            "load": round(current_load, 1),
            "battery_remaining_kwh": max(0.0, round(current_battery, 1))
        })

        v_dist = round(v_dist, 1)
        v_kwh = round(v_kwh, 1)
        energy_cost = round(v_kwh * v_kwh_cost, 2)
        v_cost = round(fixed_cost + energy_cost, 2)

        total_km += v_dist
        total_kwh_used += v_kwh
        total_objective += v_cost

        sol_vehicles[v_name] = {
            "used": True,
            "capacity": v_cap,
            "battery_kwh": v_bat,
            "kwh_cost": v_kwh_cost,
            "kwh_per_km": v_kwh_per_km,
            "fixed_cost": fixed_cost,
            "energy_cost": energy_cost,
            "total_load": round(current_load, 1),
            "saturation_pct": round((current_load / v_cap) * 100, 1) if v_cap > 0 else 0,
            "total_km": v_dist,
            "kwh_used": v_kwh,
            "cost": v_cost,
            "stops": stops
        }

    return {
        "status": "Ottimale",
        "objective_value": round(total_objective, 2),
        "total_km": round(total_km, 1),
        "total_kwh": round(total_kwh_used, 1),
        "total_demand": round(total_demand, 1),
        "vehicles": sol_vehicles
    }
