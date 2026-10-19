"""
Punto di ingresso principale per la simulazione e ottimizzazione
della raccolta rifiuti urbani (CARP) e generazione output GIS.
"""

import sys
import os
import argparse
from typing import Dict, Any

from carp_model import solve_carp, solve_carp_waste_collection
from gis_pipeline import (
    build_synthetic_benchmark_graph,
    genera_mappa_percorso,
    extract_osm_graph,
    extract_carp_inputs_from_graph
)


def run_benchmark_simulation(save_map: bool = True) -> Dict[str, Any]:
    """
    Esegue la simulazione standard del CARP basata sui dati descritti nel Dossier Tecnico.
    """
    print("\n" + "=" * 75)
    print(" [1/3] CARICAMENTO TOPOLOGIA E PARAMETRI DI BENCHMARK")
    print("=" * 75)
    nodes = [0, 1, 2, 3, 4]
    depot = 0

    # Spigoli non orientati: (u, v, c_transit, c_service, demand_kg)
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

    tot_demand = sum(q for _, _, _, _, q in edges_data)
    print(f" Numero nodi viari: {len(nodes)} (Deposito = Nodo {depot})")
    print(f" Numero strade: {len(edges_data)} (Totale rifiuti da raccogliere: {tot_demand:.0f} kg)")
    print(f" Flotta disponibile: {len(vehicles)} compattatori (Capacità un.: 4500 kg)")

    print("\n" + "=" * 75)
    print(" [2/3] RISOLUZIONE MODELLO MILP (PuLP / CBC Solver)")
    print("=" * 75)
    result = solve_carp(
        nodes=nodes,
        edges_data=edges_data,
        vehicles=vehicles,
        vehicle_capacity=vehicle_capacity,
        fixed_vehicle_cost=fixed_vehicle_cost,
        depot=depot,
        solver_msg=False
    )

    print(f"Stato Risoluzione Solutore: {result['status']}")

    if not result["is_optimal"]:
        print("ATTENZIONE: Risoluzione fallita o soluzione sub-ottima/infeasible!")
        return result

    obj_val = result["objective_value"]
    print(f"Costo Totale Obiettivo: {obj_val:.2f} EUR\n")

    # Dettaglio percorsi
    for k, v_info in result["vehicles"].items():
        if v_info["used"]:
            collected = v_info["total_collected"]
            cap = v_info["capacity"]
            pct = (collected / cap) * 100
            print(f">>> MEZZO: {k} [STATO: ATTIVO]")
            print(f"    Carico raccolto: {collected:.0f} kg / {cap:.0f} kg ({pct:.1f}% di saturazione)")
            print(f"    Costo fisso mezzo: {v_info['fixed_cost']:.2f} EUR")
            print("    Dettaglio Sequenza Movimenti:")
            for m in v_info["movements"]:
                if m["type"] == "SERVIZIO":
                    print(f"      [RACCOLTA ATTIVA] Via {m['u']} -> {m['v']} | Rifiuti: {m['demand_kg']:.0f} kg | Costo: {m['cost']:.1f} EUR")
                else:
                    print(f"      [TRANSITO A VUOTO] Via {m['u']} -> {m['v']} ({m['times']}x passaggi) | Costo: {m['cost']:.1f} EUR")
            print("-" * 75)
        else:
            print(f">>> MEZZO: {k} [STATO: NON UTILIZZATO]")
            print("-" * 75)

    # Esportazione GIS Folium
    if save_map:
        print("\n" + "=" * 75)
        print(" [3/3] GENERAZIONE MAPPA GIS INTERATTIVA (FOLIUM)")
        print("=" * 75)
        G_bench = build_synthetic_benchmark_graph()
        output_map = os.path.join("output", "percorso_raccolta.html")
        genera_mappa_percorso(G_bench, result, output_file=output_map, depot_node=depot)

    print("\n" + "=" * 75)
    print(" SIMULAZIONE COMPLETATA CON SUCCESSO [STATUS: OPTIMAL]")
    print("=" * 75)
    return result


def run_simulation_from_config(config_path: str, save_map: bool = True) -> Dict[str, Any]:
    """
    Esegue la simulazione leggendo direttamente dal file di configurazione JSON esterno.
    """
    import json
    from carp_model import solve_carp_from_config
    from gis_pipeline import build_graph_from_config

    print("\n" + "=" * 75)
    print(f" [1/3] CARICAMENTO CONFIGURAZIONE ESTERNA: {config_path}")
    print("=" * 75)

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    tot_demand = sum(float(s["demand_kg"]) for s in config.get("streets", []))
    print(f" Numero nodi viari: {len(config.get('nodes', []))} (Deposito = Nodo {config.get('depot_node', 0)})")
    print(f" Numero strade: {len(config.get('streets', []))} (Totale rifiuti da raccogliere: {tot_demand:.0f} kg)")
    print(f" Flotta disponibile: {len(config.get('vehicles', []))} compattatori")

    print("\n" + "=" * 75)
    print(" [2/3] RISOLUZIONE MODELLO MILP (PuLP / CBC Solver)")
    print("=" * 75)
    result = solve_carp_from_config(config, solver_msg=False)
    print(f"Stato Risoluzione Solutore: {result['status']}")

    if not result["is_optimal"]:
        print("ATTENZIONE: Risoluzione fallita!")
        return result

    print(f"Costo Totale Obiettivo: {result['objective_value']:.2f} EUR\n")

    for k, v_info in result["vehicles"].items():
        if v_info["used"]:
            collected = v_info["total_collected"]
            cap = v_info["capacity"]
            pct = (collected / cap) * 100
            print(f">>> MEZZO: {k} [STATO: ATTIVO]")
            print(f"    Carico raccolto: {collected:.0f} kg / {cap:.0f} kg ({pct:.1f}% di saturazione)")
            print(f"    Costo fisso mezzo: {v_info['fixed_cost']:.2f} EUR")
            print("    Dettaglio Sequenza Movimenti:")
            for m in v_info["movements"]:
                if m["type"] == "SERVIZIO":
                    print(f"      [RACCOLTA ATTIVA] Via {m['u']} -> {m['v']} | Rifiuti: {m['demand_kg']:.0f} kg | Costo: {m['cost']:.1f} EUR")
                else:
                    print(f"      [TRANSITO A VUOTO] Via {m['u']} -> {m['v']} ({m['times']}x passaggi) | Costo: {m['cost']:.1f} EUR")
            print("-" * 75)
        else:
            print(f">>> MEZZO: {k} [STATO: NON UTILIZZATO]")
            print("-" * 75)

    if save_map:
        print("\n" + "=" * 75)
        print(" [3/3] GENERAZIONE MAPPA GIS INTERATTIVA (FOLIUM)")
        print("=" * 75)
        G = build_graph_from_config(config)
        output_map = os.path.join("output", "percorso_raccolta.html")
        genera_mappa_percorso(G, result, output_file=output_map, depot_node=config.get("depot_node", 0))

    print("\n" + "=" * 75)
    print(" SIMULAZIONE COMPLETATA CON SUCCESSO [STATUS: OPTIMAL]")
    print("=" * 75)
    return result


def main():
    parser = argparse.ArgumentParser(description="Ottimizzazione CARP per Raccolta RSU")
    parser.add_argument("--config", type=str, default="data/config_aree_raccolta.json", help="Percorso del file JSON di configurazione")
    parser.add_argument("--ui", action="store_true", help="Avvia il server web con la dashboard interattiva")
    parser.add_argument("--gis-online", action="store_true", help="Esegue estrazione online da OpenStreetMap via OSMnx")
    parser.add_argument("--place", type=str, default="Treviso, Italy", help="Luogo per estrazione OSMnx")
    parser.add_argument("--no-map", action="store_true", help="Disabilita generazione mappa HTML Folium")
    args = parser.parse_args()

    if args.ui:
        import server
        server.run_server()
        return

    if args.gis_online:
        print(f"Avvio modalità GIS Online con luogo: {args.place}")
        try:
            G_osm = extract_osm_graph(place_name=args.place)
            edges_osm = extract_carp_inputs_from_graph(G_osm)
            print(f"Estratti {len(edges_osm)} rami stradali da OSM. Esecuzione simulazione...")
        except Exception as e:
            print(f"Errore durante l'estrazione OSMnx: {e}. Ripiego su simulazione benchmark locale.")
            run_benchmark_simulation(save_map=not args.no_map)
            return
    elif os.path.exists(args.config):
        result = run_simulation_from_config(args.config, save_map=not args.no_map)
        if not result.get("is_optimal", False):
            sys.exit(1)
    else:
        result = run_benchmark_simulation(save_map=not args.no_map)
        if not result.get("is_optimal", False):
            sys.exit(1)


if __name__ == "__main__":
    main()
