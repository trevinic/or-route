"""
Modulo di Autenticazione e Gestione Scenari Multi-Utente (SQLite)
Per la Piattaforma OR-Route.
Consente a ciascun utente di registrarsi, accedere, salvare e gestire
le proprie configurazioni personalizzate (modelli, mappe, vie, mezzi, costi).
"""

import os
import sqlite3
import hashlib
import secrets
import json
import time
from typing import Optional, Dict, Any, List, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "or_route_data.db")


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Crea le tabelle utenti, sessioni e scenari se non esistono."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                email TEXT UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at REAL NOT NULL
            );
            """)

            conn.execute("""
            CREATE TABLE IF NOT EXISTS scenarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                model_type TEXT NOT NULL, -- carp, cvrp, vrptw, pcarp, ecc.
                description TEXT,
                place_name TEXT,
                config_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_scenarios_user ON scenarios(user_id);")
    finally:
        conn.close()


def _hash_password(password: str, salt: str) -> str:
    """Esegue hashing robusto PBKDF2-HMAC-SHA256 con 100.000 iterazioni."""
    pwd_bytes = password.encode("utf-8")
    salt_bytes = bytes.fromhex(salt)
    h = hashlib.pbkdf2_hmac("sha256", pwd_bytes, salt_bytes, 100000)
    return h.hex()


def register_user(username: str, password: str, email: Optional[str] = None) -> Tuple[Optional[str], Optional[Dict[str, Any]], Optional[str]]:
    """
    Registra un nuovo utente.
    Ritorna (token, user_dict, error_message).
    """
    username = str(username or "").strip()
    password = str(password or "").strip()
    email = str(email or "").strip() if email else None

    if len(username) < 3:
        return None, None, "Il nome utente deve contenere almeno 3 caratteri."
    if len(password) < 5:
        return None, None, "La password deve contenere almeno 5 caratteri."

    salt = secrets.token_hex(16)
    pwd_hash = _hash_password(password, salt)

    conn = get_db_connection()
    try:
        with conn:
            cursor = conn.execute(
                "INSERT INTO users (username, email, password_hash, salt) VALUES (?, ?, ?, ?)",
                (username, email, pwd_hash, salt)
            )
            user_id = cursor.lastrowid

            token = secrets.token_hex(32)
            expires_at = time.time() + (30 * 24 * 3600)  # 30 giorni
            conn.execute(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
                (token, user_id, expires_at)
            )

            user_data = {
                "id": user_id,
                "username": username,
                "email": email
            }
            return token, user_data, None
    except sqlite3.IntegrityError as e:
        err_msg = str(e).lower()
        if "username" in err_msg:
            return None, None, "Nome utente già registrato. Scegline un altro o effettua il login."
        if "email" in err_msg:
            return None, None, "Email già registrata."
        return None, None, "Utente o email già esistente."
    finally:
        conn.close()


def login_user(username: str, password: str) -> Tuple[Optional[str], Optional[Dict[str, Any]], Optional[str]]:
    """
    Verifica le credenziali dell'utente e genera un token di sessione.
    Ritorna (token, user_dict, error_message).
    """
    username = str(username or "").strip()
    password = str(password or "").strip()

    if not username or not password:
        return None, None, "Inserisci nome utente e password."

    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, username, email, password_hash, salt FROM users WHERE username = ? OR email = ?",
            (username, username)
        ).fetchone()

        if not row:
            return None, None, "Credenziali non valide: utente non trovato."

        expected_hash = _hash_password(password, row["salt"])
        if not secrets.compare_digest(expected_hash, row["password_hash"]):
            return None, None, "Password errata."

        token = secrets.token_hex(32)
        expires_at = time.time() + (30 * 24 * 3600)  # 30 giorni

        with conn:
            conn.execute(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
                (token, row["id"], expires_at)
            )

        user_data = {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"]
        }
        return token, user_data, None
    finally:
        conn.close()


def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    """Recupera l'utente associato a un token di sessione valido."""
    if not token:
        return None

    conn = get_db_connection()
    try:
        row = conn.execute("""
            SELECT u.id, u.username, u.email, s.expires_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
        """, (token,)).fetchone()

        if not row:
            return None

        if row["expires_at"] < time.time():
            # Sessione scaduta
            with conn:
                conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            return None

        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"]
        }
    finally:
        conn.close()


def logout_token(token: str) -> bool:
    """Invalida un token di sessione."""
    if not token:
        return False
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        return True
    finally:
        conn.close()


def list_registered_users() -> List[Dict[str, Any]]:
    """Restituisce l'elenco di tutti gli utenti registrati con il conteggio dei loro scenari salvati."""
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT u.id, u.username, u.email, u.created_at,
                   COUNT(s.id) AS scenario_count
            FROM users u
            LEFT JOIN scenarios s ON u.id = s.user_id
            GROUP BY u.id
            ORDER BY u.id ASC
        """).fetchall()
        return [
            {
                "id": r["id"],
                "username": r["username"],
                "email": r["email"],
                "created_at": str(r["created_at"]),
                "scenario_count": r["scenario_count"]
            }
            for r in rows
        ]
    finally:
        conn.close()


def reset_user_password(username: str, new_password: str) -> bool:
    """Reimposta la password di un utente esistente."""
    username = str(username or "").strip()
    new_password = str(new_password or "").strip()
    if len(new_password) < 5:
        return False
    salt = secrets.token_hex(16)
    pwd_hash = _hash_password(new_password, salt)
    conn = get_db_connection()
    try:
        with conn:
            cur = conn.execute(
                "UPDATE users SET password_hash = ?, salt = ? WHERE username = ? COLLATE NOCASE",
                (pwd_hash, salt, username)
            )
            return cur.rowcount > 0
    finally:
        conn.close()


# -------------------------------------------------------------
# GESTIONE SCENARI E CONFIGURAZIONI SALVATE
# -------------------------------------------------------------

def create_scenario(user_id: int, name: str, model_type: str, config: Dict[str, Any], description: Optional[str] = None) -> int:
    """Salva una nuova configurazione/scenario per l'utente."""
    name = str(name or "Nuova Configurazione").strip()
    model_type = str(model_type or "carp").strip().lower()
    description = str(description or "").strip()
    place_name = config.get("place_name") or config.get("name") or ""
    config_json = json.dumps(config, ensure_ascii=False)

    conn = get_db_connection()
    try:
        with conn:
            cursor = conn.execute("""
                INSERT INTO scenarios (user_id, name, model_type, description, place_name, config_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (user_id, name, model_type, description, place_name, config_json))
            return cursor.lastrowid
    finally:
        conn.close()


def get_user_scenarios(user_id: int, model_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Restituisce l'elenco degli scenari salvati dall'utente con metadati sintetici."""
    conn = get_db_connection()
    try:
        query = """
            SELECT id, name, model_type, description, place_name, created_at, updated_at, config_json
            FROM scenarios
            WHERE user_id = ?
        """
        params = [user_id]
        if model_type:
            query += " AND model_type = ?"
            params.append(model_type.lower())

        query += " ORDER BY updated_at DESC"
        rows = conn.execute(query, params).fetchall()

        results = []
        for r in rows:
            summary = {
                "id": r["id"],
                "name": r["name"],
                "model_type": r["model_type"],
                "description": r["description"] or "",
                "place_name": r["place_name"] or "",
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            }
            # Estrai conteggi rapidi per la dashboard
            try:
                cfg = json.loads(r["config_json"])
                summary["street_count"] = len(cfg.get("streets", []))
                summary["customer_count"] = len(cfg.get("customers", []))
                summary["vehicle_count"] = len(cfg.get("vehicles", []))
                summary["total_demand"] = sum(float(s.get("demand_kg", 0) or s.get("demand", 0)) for s in (cfg.get("streets") or cfg.get("customers") or []))
            except Exception:
                pass
            results.append(summary)
        return results
    finally:
        conn.close()


def get_scenario(scenario_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """Restituisce lo scenario completo di configurazione per il caricamento in dashboard."""
    conn = get_db_connection()
    try:
        row = conn.execute("""
            SELECT id, user_id, name, model_type, description, place_name, created_at, updated_at, config_json
            FROM scenarios
            WHERE id = ? AND user_id = ?
        """, (scenario_id, user_id)).fetchone()

        if not row:
            return None

        cfg = json.loads(row["config_json"])
        return {
            "id": row["id"],
            "name": row["name"],
            "model_type": row["model_type"],
            "description": row["description"] or "",
            "place_name": row["place_name"] or "",
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "config": cfg
        }
    finally:
        conn.close()


def update_scenario(scenario_id: int, user_id: int, name: Optional[str] = None, description: Optional[str] = None, config: Optional[Dict[str, Any]] = None) -> bool:
    """Aggiorna uno scenario esistente."""
    conn = get_db_connection()
    try:
        fields = []
        params = []
        if name is not None:
            fields.append("name = ?")
            params.append(str(name).strip())
        if description is not None:
            fields.append("description = ?")
            params.append(str(description).strip())
        if config is not None:
            fields.append("config_json = ?")
            params.append(json.dumps(config, ensure_ascii=False))
            place_name = config.get("place_name") or config.get("name") or ""
            fields.append("place_name = ?")
            params.append(place_name)

        if not fields:
            return False

        fields.append("updated_at = CURRENT_TIMESTAMP")
        params.extend([scenario_id, user_id])

        with conn:
            cursor = conn.execute(f"UPDATE scenarios SET {', '.join(fields)} WHERE id = ? AND user_id = ?", params)
            return cursor.rowcount > 0
    finally:
        conn.close()


def delete_scenario(scenario_id: int, user_id: int) -> bool:
    """Elimina uno scenario dell'utente."""
    conn = get_db_connection()
    try:
        with conn:
            cursor = conn.execute("DELETE FROM scenarios WHERE id = ? AND user_id = ?", (scenario_id, user_id))
            return cursor.rowcount > 0
    finally:
        conn.close()


# Inizializza automaticamente il DB al primo caricamento
init_db()
