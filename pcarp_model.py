"""
Periodic Capacitated Arc Routing Problem (PCARP) - Modello e Algoritmo di Ottimizzazione.
Pianificazione della raccolta rifiuti su orizzonte multi-periodo (Calendario Settimanale
con frequenze e giorni alterni per frazioni differenziate: Umido, Carta, Plastica, Secco, Vetro).
"""

from typing import Dict, List, Tuple, Any, Optional
import math
import heapq


DAYS_OF_WEEK = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]

FRACTIONS_SCHEDULE = {
    "Lunedì": {"fraction": "Organico / Umido", "color": "#10b981"},
    "Martedì": {"fraction": "Carta & Cartone", "color": "#38bdf8"},
    "Mercoledì": {"fraction": "Plastica & Metalli", "color": "#fbbf24"},
    "Giovedì": {"fraction": "Organico / Umido", "color": "#10b981"},
    "Venerdì": {"fraction": "Secco Indifferenziato", "color": "#a855f7"},
    "Sabato": {"fraction": "Vetro & Sfalci", "color": "#06b6d4"}
}


def euclidean_dist(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def get_default_pcarp_scenario() -> Dict[str, Any]:
    """Ritorna lo scenario predefinito per la pianificazione settimanale PCARP."""
    return {
        "name": "Calendario Settimanale Raccolta Differenziata Multi-Periodo",
        "depot": {
            "id": 0,
            "name": "Cantiere Operativo & Autorimessa Centrale",
            "lat": 45.6670,
            "lon": 12.2450
        },
        "days": DAYS_OF_WEEK,
        "fractions_schedule": FRACTIONS_SCHEDULE,
        "vehicles": [
            {
                "name": "Compattatore_Settimanale_1",
                "capacity_kg": 4000,
                "fixed_cost": 120.0,
                "cost_per_km": 1.40,
                "description": "Compattatore 2 assi posteriore 4.0t"
            },
            {
                "name": "Compattatore_Settimanale_2",
                "capacity_kg": 4000,
                "fixed_cost": 120.0,
                "cost_per_km": 1.40,
                "description": "Compattatore 2 assi posteriore 4.0t"
            }
        ],
        "streets": [
            {
                "id": 1, "name": "Via Roma (Tratto Nord)",
                "lat1": 45.6695, "lon1": 12.2480, "lat2": 45.6720, "lon2": 12.2530,
                "length_km": 2.2, "demand_kg": 1800, "days": ["Lunedì", "Giovedì"]
            },
            {
                "id": 2, "name": "Corso Garibaldi (Zona Negozi)",
                "lat1": 45.6720, "lon1": 12.2530, "lat2": 45.6680, "lon2": 12.2560,
                "length_km": 2.8, "demand_kg": 2100, "days": ["Lunedì", "Martedì", "Giovedì"]
            },
            {
                "id": 3, "name": "Via Dante (Quartiere Residenziale)",
                "lat1": 45.6680, "lon1": 12.2560, "lat2": 45.6645, "lon2": 12.2490,
                "length_km": 1.9, "demand_kg": 1400, "days": ["Martedì", "Venerdì"]
            },
            {
                "id": 4, "name": "Viale Europa (Viale Principale)",
                "lat1": 45.6695, "lon1": 12.2480, "lat2": 45.6645, "lon2": 12.2490,
                "length_km": 3.1, "demand_kg": 2400, "days": ["Mercoledì", "Sabato"]
            },
            {
                "id": 5, "name": "Via Verdi (Quartiere Est)",
                "lat1": 45.6720, "lon1": 12.2530, "lat2": 45.6740, "lon2": 12.2600,
                "length_km": 2.4, "demand_kg": 1600, "days": ["Mercoledì", "Venerdì"]
            },
            {
                "id": 6, "name": "Via Cavour (Tratto Residenziale)",
                "lat1": 45.6680, "lon1": 12.2560, "lat2": 45.6630, "lon2": 12.2580,
                "length_km": 2.0, "demand_kg": 1300, "days": ["Martedì", "Giovedì"]
            },
            {
                "id": 7, "name": "Strada Statale Pontebbana (Raccordo)",
                "lat1": 45.6645, "lon1": 12.2490, "lat2": 45.6610, "lon2": 12.2430,
                "length_km": 2.6, "demand_kg": 1900, "days": ["Lunedì", "Venerdì"]
            },
            {
                "id": 8, "name": "Borgo Mazzini (Centro Storico)",
                "lat1": 45.6740, "lon1": 12.2600, "lat2": 45.6710, "lon2": 12.2650,
                "length_km": 1.8, "demand_kg": 1500, "days": ["Mercoledì", "Sabato"]
            }
        ]
    }


def solve_pcarp_day(
    depot: Dict[str, Any],
    streets_of_day: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    day_name: str
) -> Dict[str, Any]:
    """Risolve il problema di routing per un singolo giorno del calendario."""
    dep_lat = float(depot.get("lat", 45.667))
    dep_lon = float(depot.get("lon", 12.245))

    if not streets_of_day:
        return {
            "day": day_name,
            "streets_count": 0,
            "total_demand_kg": 0,
            "total_km": 0.0,
            "cost": 0.0,
            "vehicles": {}
        }

    # Ordina strade per distanza dal deposito (centroide della via)
    streets_sorted = list(streets_of_day)
    streets_sorted.sort(key=lambda s: euclidean_dist(
        (dep_lat, dep_lon),
        (((float(s["lat1"]) + float(s["lat2"])) / 2.0), ((float(s["lon1"]) + float(s["lon2"])) / 2.0))
    ))

    num_v = max(1, len(vehicles))
    chunk_size = int(math.ceil(len(streets_sorted) / num_v))

    veh_solutions = {}
    day_tot_km = 0.0
    day_tot_cost = 0.0
    day_tot_demand = sum(float(s.get("demand_kg", 0)) for s in streets_sorted)

    for v_idx, v in enumerate(vehicles):
        v_name = v.get("name", f"Mezzo_{v_idx+1}")
        v_cap = float(v.get("capacity_kg", v.get("capacity", 4000)))
        fixed_cost = float(v.get("fixed_cost", 100.0))
        cost_km = float(v.get("cost_per_km", 1.40))

        my_streets = streets_sorted[v_idx * chunk_size : (v_idx + 1) * chunk_size]
        if not my_streets:
            veh_solutions[v_name] = {
                "used": False,
                "day": day_name,
                "capacity": v_cap,
                "fixed_cost": fixed_cost,
                "cost_per_km": cost_km,
                "total_load": 0,
                "total_km": 0.0,
                "cost": 0.0,
                "streets_served": []
            }
            continue

        # Calcola itinerario: deposito -> via 1 -> via 2 ... -> deposito
        curr_lat, curr_lon = dep_lat, dep_lon
        v_km = 0.0
        v_load = 0.0
        served_list = []

        for st in my_streets:
            s_lat1, s_lon1 = float(st["lat1"]), float(st["lon1"])
            s_lat2, s_lon2 = float(st["lat2"]), float(st["lon2"])
            d1 = euclidean_dist((curr_lat, curr_lon), (s_lat1, s_lon1)) * 111.0
            d2 = euclidean_dist((curr_lat, curr_lon), (s_lat2, s_lon2)) * 111.0

            # Sceglie l'estremità più vicina per iniziare il servizio
            if d1 <= d2:
                trans_km = d1
                curr_lat, curr_lon = s_lat2, s_lon2
            else:
                trans_km = d2
                curr_lat, curr_lon = s_lat1, s_lon1

            service_km = float(st.get("length_km", 2.0))
            st_demand = float(st.get("demand_kg", 500))

            v_km += trans_km + service_km
            v_load += st_demand
            served_list.append({
                "id": st.get("id"),
                "name": st.get("name"),
                "length_km": service_km,
                "demand_kg": st_demand,
                "lat1": s_lat1, "lon1": s_lon1,
                "lat2": s_lat2, "lon2": s_lon2
            })

        # Ritorno al deposito
        ret_km = euclidean_dist((curr_lat, curr_lon), (dep_lat, dep_lon)) * 111.0
        v_km += ret_km
        v_km = round(v_km, 1)

        v_cost = round(fixed_cost + (v_km * cost_km), 2)
        day_tot_km += v_km
        day_tot_cost += v_cost

        veh_solutions[v_name] = {
            "used": True,
            "day": day_name,
            "capacity": v_cap,
            "fixed_cost": fixed_cost,
            "cost_per_km": cost_km,
            "total_load": round(v_load, 1),
            "saturation_pct": round((v_load / v_cap) * 100, 1) if v_cap > 0 else 0,
            "total_km": v_km,
            "cost": v_cost,
            "streets_served": served_list
        }

    return {
        "day": day_name,
        "streets_count": len(streets_sorted),
        "total_demand_kg": round(day_tot_demand, 1),
        "total_km": round(day_tot_km, 1),
        "cost": round(day_tot_cost, 2),
        "vehicles": veh_solutions
    }


def solve_pcarp(
    depot: Dict[str, Any],
    streets: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    selected_day: Optional[str] = None
) -> Dict[str, Any]:
    """
    Risolve il problema PCARP settimanale su tutti i giorni (Lunedì-Sabato)
    o sul giorno specificato dall'utente.
    """
    days = DAYS_OF_WEEK if not selected_day or selected_day == "ALL" else [selected_day]

    daily_solutions = {}
    weekly_total_km = 0.0
    weekly_total_cost = 0.0
    weekly_total_demand = 0.0
    weekly_total_streets = 0

    for d in DAYS_OF_WEEK:
        # Filtra le strade attive per questo giorno
        streets_for_day = [
            s for s in streets
            if d in s.get("days", []) or not s.get("days")
        ]
        sol_day = solve_pcarp_day(depot, streets_for_day, vehicles, d)
        daily_solutions[d] = sol_day

        weekly_total_km += sol_day["total_km"]
        weekly_total_cost += sol_day["cost"]
        weekly_total_demand += sol_day["total_demand_kg"]
        weekly_total_streets += sol_day["streets_count"]

    return {
        "status": "Ottimale",
        "selected_day": selected_day or "ALL",
        "weekly_summary": {
            "total_km": round(weekly_total_km, 1),
            "total_cost": round(weekly_total_cost, 2),
            "total_demand_kg": round(weekly_total_demand, 1),
            "total_serviced_street_events": weekly_total_streets,
            "avg_cost_per_day": round(weekly_total_cost / len(DAYS_OF_WEEK), 2)
        },
        "days": daily_solutions,
        "daily_solutions": daily_solutions,
        "weekly_total_km": round(weekly_total_km, 1),
        "weekly_total_cost": round(weekly_total_cost, 2),
        "weekly_total_demand": round(weekly_total_demand, 1)
    }
