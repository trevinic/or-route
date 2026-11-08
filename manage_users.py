"""
Strumento di Gestione Utenti e Password per OR-Route
Uso:
  python manage_users.py list
  python manage_users.py reset <username> <new_password>
  python manage_users.py create <username> <password> [email]
"""
import sys
import auth_db


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        print(__doc__)
        return

    cmd = sys.argv[1].lower()
    if cmd == "list":
        users = auth_db.list_registered_users()
        print(f"\n{'ID':<4} {'USERNAME':<30} {'EMAIL':<35} {'SCENARI':<8} {'DATA REGISTRAZIONE'}")
        print("-" * 105)
        for u in users:
            print(f"{u['id']:<4} {u['username']:<30} {str(u['email'] or '-'):<35} {u['scenario_count']:<8} {u['created_at']}")
        print()

    elif cmd == "reset":
        if len(sys.argv) < 4:
            print("Uso: python manage_users.py reset <username> <nuova_password>")
            return
        username = sys.argv[2]
        new_pwd = sys.argv[3]
        ok = auth_db.reset_user_password(username, new_pwd)
        if ok:
            print(f"✅ Password per '{username}' reimpostata con successo!")
        else:
            print(f"❌ Utente '{username}' non trovato o password non valida (min. 5 caratteri).")

    elif cmd == "create":
        if len(sys.argv) < 4:
            print("Uso: python manage_users.py create <username> <password> [email]")
            return
        username = sys.argv[2]
        pwd = sys.argv[3]
        email = sys.argv[4] if len(sys.argv) > 4 else None
        token, user, err = auth_db.register_user(username, pwd, email)
        if err:
            print(f"❌ Errore registrazione: {err}")
        else:
            print(f"✅ Utente '{username}' creato con successo! ID: {user['id']}")

    else:
        print(f"Comando sconosciuto: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
