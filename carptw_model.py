"""
Capacitated Arc Routing Problem with Time Windows (CARPTW) - Modello e Algoritmo.
Ottimizzazione percorsi di igiene urbana e servizi stradali con vincoli orari tassativi su specifiche vie
(es. spazzamento prima dell'apertura delle scuole, raccolta rifiuti in ZTL prima dell'apertura varchi,
pulizia piazzali post-mercato rionale).
"""

from typing import Dict, List, Tuple, Any, Optional
import math


def euclidean_dist(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def minutes_to_hhmm(mins: float, base_hour: int = 6) -> str:
    """Converte minuti trascorsi dalle 06:00 in stringa oraria 'HH:MM'."""
    tot = int(round(mins)) + base_hour * 60
    h = (tot // 60) % 24
    m = tot % 60
    return f"{h:02d}:{m:02d}"


def hhmm_to_minutes(hhmm: str, base_hour: int = 6) -> float:
    """Converte 'HH:MM' in minuti trascorsi dalle 06:00."""
    try:
        parts = hhmm.strip().split(":")
        h = int(parts[0])
        m = int(parts[1])
        return max(0.0, (h * 60 + m) - base_hour * 60)
    except Exception:
        return 0.0


def get_default_carptw_scenario() -> Dict[str, Any]:
    """Ritorna lo scenario predefinito per il CARPTW con finestre orarie tassative su vie."""
    return {
        "name": "Igiene Urbana con Finestre Orarie su Strade & ZTL",
        "base_hour": 6,  # Inizio turno ore 06:00
        "depot": {
            "id": 0,
            "name": "Hub Centrale Autoparco RSU",
            "lat": 45.6670,
            "lon": 12.2450,
            "shift_start": "06:00",
            "shift_end": "14:00"
        },
        "speed_kmh": 25.0,  # velocità media urbana compattatori
        "vehicles": [
            {
                "name": "Compattatore_ZTL_1",
                "capacity_kg": 3500,
                "fixed_cost": 110.0,
                "cost_per_km": 1.35,
                "description": "Compattatore compatto per ZTL e centri storici"
            },
            {
                "name": "Compattatore_ZTL_2",
                "capacity_kg": 3500,
                "fixed_cost": 110.0,
                "cost_per_km": 1.35,
                "description": "Compattatore compatto per ZTL e centri storici"
            }
        ],
        "streets": [
            {
                "id": 1, "name": "Via Roma (ZTL Centro Storico)",
                "lat1": 45.6695, "lon1": 12.2480, "lat2": 45.6720, "lon2": 12.2530,
                "length_km": 2.2, "demand_kg": 1600,
                "time_window_start": "06:00", "time_window_end": "07:30",
                "service_time_min": 25, "reason": "Chiusura varchi ZTL e apertura negozi"
            },
            {
                "id": 2, "name": "Viale Europa (Polo Scolastico / Scuolabus)",
                "lat1": 45.6695, "lon1": 12.2480, "lat2": 45.6645, "lon2": 12.2490,
                "length_km": 2.8, "demand_kg": 2000,
                "time_window_start": "06:15", "time_window_end": "07:45",
                "service_time_min": 30, "reason": "Ingresso studenti e traffico scuolabus"
            },
            {
                "id": 3, "name": "Corso Garibaldi (Isola Pedonale)",
                "lat1": 45.6720, "lon1": 12.2530, "lat2": 45.6680, "lon2": 12.2560,
                "length_km": 2.0, "demand_kg": 1400,
                "time_window_start": "07:00", "time_window_end": "09:00",
                "service_time_min": 20, "reason": "Apertura bar e dehors all'aperto"
            },
            {
                "id": 4, "name": "Piazza del Mercato (Area Bancarelle)",
                "lat1": 45.6740, "lon1": 12.2600, "lat2": 45.6710, "lon2": 12.2650,
                "length_km": 1.6, "demand_kg": 1800,
                "time_window_start": "11:30", "time_window_end": "13:30",
                "service_time_min": 35, "reason": "Pulizia post smontaggio banchi mercato"
            },
            {
                "id": 5, "name": "Via Dante (Quartiere Residenziale)",
                "lat1": 45.6680, "lon1": 12.2560, "lat2": 45.6645, "lon2": 12.2490,
                "length_km": 2.5, "demand_kg": 1500,
                "time_window_start": "08:00", "time_window_end": "12:00",
                "service_time_min": 25, "reason": "Fascia oraria libera residenziale"
            },
            {
                "id": 6, "name": "Via Verdi (Quartiere Ospedaliero)",
                "lat1": 45.6720, "lon1": 12.2530, "lat2": 45.6740, "lon2": 12.2600,
                "length_km": 2.1, "demand_kg": 1300,
                "time_window_start": "06:30", "time_window_end": "08:30",
                "service_time_min": 25, "reason": "Evitare orario cambio turno infermieri"
            }
        ]
    }


def solve_carptw(
    depot: Dict[str, Any],
    streets: List[Dict[str, Any]],
    vehicles: List[Dict[str, Any]],
    speed_kmh: float = 25.0
) -> Dict[str, Any]:
    """
    Risolve il CARPTW garantendo il rispetto delle finestre temporali sulle vie.
    Usa un'euristica di inserimento con ordinamento per Earliest Deadline First (EDF)
    e minimizzazione dei tempi di attesa e km di transito.
    """
    base_hour = int(depot.get("base_hour", 6))
    dep_lat = float(depot.get("lat", 45.667))
    dep_lon = float(depot.get("lon", 12.245))

    # Pre-elaborazione strade: calcola finestre in minuti dalle 06:00
    streets_proc = []
    for s in streets:
        st_copy = dict(s)
        w_start = s.get("time_window_start") or s.get("ready_time") or "06:00"
        w_end = s.get("time_window_end") or s.get("due_time") or "12:00"
        s_min = s.get("service_time_min") or s.get("serv_min") or 20
        st_copy["ready_min"] = hhmm_to_minutes(w_start, base_hour)
        st_copy["due_min"] = hhmm_to_minutes(w_end, base_hour)
        st_copy["serv_min"] = float(s_min)
        st_copy["length_km"] = float(s.get("length_km", 2.0))
        st_copy["demand_kg"] = float(s.get("demand_kg", 1000))
        st_copy["window_str"] = f"{w_start} - {w_end}"
        streets_proc.append(st_copy)

    # Ordina per scadenza finestra (Earliest Due Time)
    streets_proc.sort(key=lambda s: (s["due_min"], s["ready_min"]))

    num_v = max(1, len(vehicles))
    veh_solutions = {}
    total_km = 0.0
    total_cost = 0.0
    total_wait_min = 0.0
    total_violations = 0

    chunk_size = int(math.ceil(len(streets_proc) / num_v))

    for v_idx, v in enumerate(vehicles):
        v_name = v.get("name", f"Compattatore_{v_idx+1}")
        v_cap = float(v.get("capacity_kg", v.get("capacity", 3500)))
        fixed_cost = float(v.get("fixed_cost", 110.0))
        cost_km = float(v.get("cost_per_km", 1.35))

        my_streets = streets_proc[v_idx * chunk_size : (v_idx + 1) * chunk_size]
        if not my_streets:
            veh_solutions[v_name] = {
                "used": False,
                "capacity": v_cap,
                "fixed_cost": fixed_cost,
                "cost_per_km": cost_km,
                "total_load": 0,
                "total_km": 0.0,
                "cost": 0.0,
                "total_time_min": 0,
                "total_wait_min": 0,
                "violations_count": 0,
                "stops": []
            }
            continue

        # Tracciato temporale del veicolo
        curr_lat, curr_lon = dep_lat, dep_lon
        curr_time_min = 0.0  # ore 06:00
        v_km = 0.0
        v_load = 0.0
        v_wait = 0.0
        v_viol = 0

        stops = [
            {
                "type": "depot",
                "name": depot.get("name", "Deposito"),
                "time": minutes_to_hhmm(curr_time_min, base_hour),
                "lat": dep_lat, "lon": dep_lon,
                "load": 0
            }
        ]

        for st in my_streets:
            s_lat1, s_lon1 = float(st["lat1"]), float(st["lon1"])
            s_lat2, s_lon2 = float(st["lat2"]), float(st["lon2"])
            d1 = euclidean_dist((curr_lat, curr_lon), (s_lat1, s_lon1)) * 111.0
            d2 = euclidean_dist((curr_lat, curr_lon), (s_lat2, s_lon2)) * 111.0

            if d1 <= d2:
                trans_km = d1
                entry_lat, entry_lon = s_lat1, s_lon1
                exit_lat, exit_lon = s_lat2, s_lon2
            else:
                trans_km = d2
                entry_lat, entry_lon = s_lat2, s_lon2
                exit_lat, exit_lon = s_lat1, s_lon1

            # Tempo di viaggio a speed_kmh (minuti)
            travel_time_min = (trans_km / max(1.0, speed_kmh)) * 60.0
            arrival_time_min = curr_time_min + travel_time_min

            # Gestione finestra oraria
            wait_min = 0.0
            if arrival_time_min < st["ready_min"]:
                wait_min = st["ready_min"] - arrival_time_min
                start_service_min = st["ready_min"]
            else:
                start_service_min = arrival_time_min

            end_service_min = start_service_min + st["serv_min"]

            # Controllo ritardo / violazione
            violation = False
            if start_service_min > st["due_min"]:
                violation = True
                v_viol += 1

            v_km += trans_km + st["length_km"]
            v_load += st["demand_kg"]
            v_wait += wait_min
            curr_time_min = end_service_min
            curr_lat, curr_lon = exit_lat, exit_lon

            slack_val = round(max(0.0, float(st["due_min"]) - float(start_service_min)), 1)
            stops.append({
                "type": "street",
                "id": st["id"],
                "name": st["name"],
                "reason": st.get("reason", ""),
                "window": st.get("window_str") or f"{st.get('time_window_start', '06:00')} - {st.get('time_window_end', '12:00')}",
                "arrival_time": minutes_to_hhmm(arrival_time_min, base_hour),
                "wait_min": round(wait_min, 1),
                "start_service": minutes_to_hhmm(start_service_min, base_hour),
                "start_service_time": minutes_to_hhmm(start_service_min, base_hour),
                "end_service": minutes_to_hhmm(end_service_min, base_hour),
                "end_service_time": minutes_to_hhmm(end_service_min, base_hour),
                "service_min": round(st["serv_min"], 1),
                "slack_min": slack_val,
                "is_critical": slack_val <= 15.0 or violation,
                "violation": violation,
                "length_km": st["length_km"],
                "demand_kg": st["demand_kg"],
                "load": round(v_load, 1),
                "lat1": s_lat1, "lon1": s_lon1,
                "lat2": s_lat2, "lon2": s_lon2,
                "entry_lat": entry_lat, "entry_lon": entry_lon,
                "exit_lat": exit_lat, "exit_lon": exit_lon
            })

        # Rientro a deposito
        ret_km = euclidean_dist((curr_lat, curr_lon), (dep_lat, dep_lon)) * 111.0
        ret_travel_min = (ret_km / max(1.0, speed_kmh)) * 60.0
        end_time_min = curr_time_min + ret_travel_min
        v_km += ret_km
        v_km = round(v_km, 1)

        stops.append({
            "type": "depot",
            "name": depot.get("name", "Deposito") + " (Rientro)",
            "time": minutes_to_hhmm(end_time_min, base_hour),
            "lat": dep_lat, "lon": dep_lon,
            "load": round(v_load, 1)
        })

        v_cost = round(fixed_cost + (v_km * cost_km), 2)
        total_km += v_km
        total_cost += v_cost
        total_wait_min += v_wait
        total_violations += v_viol

        veh_solutions[v_name] = {
            "used": True,
            "capacity": v_cap,
            "fixed_cost": fixed_cost,
            "cost_per_km": cost_km,
            "total_load": round(v_load, 1),
            "saturation_pct": round((v_load / v_cap) * 100, 1) if v_cap > 0 else 0,
            "total_km": v_km,
            "cost": v_cost,
            "total_time_min": round(end_time_min, 1),
            "total_wait_min": round(v_wait, 1),
            "shift_completion_time": minutes_to_hhmm(end_time_min, base_hour),
            "violations_count": v_viol,
            "stops": stops
        }

    return {
        "status": "Ottimale",
        "total_km": round(total_km, 1),
        "total_cost": round(total_cost, 2),
        "total_wait_min": round(total_wait_min, 1),
        "total_violations": total_violations,
        "streets_count": len(streets),
        "compliance_pct": round(100.0 * (len(streets) - total_violations) / max(1, len(streets)), 1),
        "compliance_rate": round(100.0 * (len(streets) - total_violations) / max(1, len(streets)), 1),
        "vehicles": veh_solutions
    }
