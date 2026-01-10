import serial
import serial.tools.list_ports
import requests
import json
import time
import sys
import os
from datetime import datetime, timezone

# Nom du fichier de configuration
CONFIG_FILE = "config.json"

# Variable globale pour stocker le token ---
current_token = None


def charger_config():
    # Charge la configuration depuis le fichier JSON.
    if not os.path.exists(CONFIG_FILE):
        print(f"Erreur : Le fichier {CONFIG_FILE} est introuvable.")
        print("   -> Veuillez créer ce fichier à côté du script.")
        sys.exit(1)

    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)


def trouver_port_microbit(config_port):
    # Trouve le port USB. Si 'AUTO', cherche une Micro:bit.
    if config_port != "AUTO":
        return config_port

    print("Recherche automatique de la Micro:bit...")
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        if "0D28" in p.hwid or "Micro:bit" in p.description or "BBC" in p.description:
            print(f"Micro:bit détectée sur : {p.device}")
            return p.device

    print("Aucune Micro:bit détectée automatiquement.")
    print("   -> Modifiez config.json avec le port exact.")
    sys.exit(1)


def obtenir_token_keycloak(config):
    # Récupère un token d'accès via Keycloak (Client Credentials).
    print("Authentification Keycloak en cours...")
    kc_conf = config["keycloak"]

    # Construction de l'URL du token (Standard OpenID Connect)
    # Assure-toi que l'URL ne finit pas par '/' dans le config
    base_url = kc_conf["url"].rstrip('/')
    token_url = f"{base_url}/realms/{kc_conf['realm']}/protocol/openid-connect/token"

    payload = {
        "grant_type": "client_credentials",
        "client_id": kc_conf["client_id"],
        "client_secret": kc_conf["client_secret"]
    }

    try:
        r = requests.post(token_url, data=payload)
        if r.status_code == 200:
            token = r.json().get("access_token")
            print("Token Keycloak récupéré avec succès.")
            return token
        else:
            print(f"Erreur Auth Keycloak ({r.status_code}): {r.text}")
            return None
    except Exception as e:
        print(f"Erreur connexion Keycloak : {e}")
        return None


def fetch_and_sync_keys(ser, config):
    global current_token  # On utilise le token global
    url = config["api_url_keys"]
    print(f"--- Synchronisation des clés depuis l'API ---")

    # 1. Récupération Web (AVEC AUTHENTIFICATION)
    try:
        # On prépare les headers
        headers = {}
        if current_token:
            headers["Authorization"] = f"Bearer {current_token}"

        resp = requests.get(url, headers=headers)

        # GESTION TOKEN EXPIRÉ (401)
        if resp.status_code == 401:
            print("Token expiré ou invalide (401). Tentative de renouvellement...")
            current_token = obtenir_token_keycloak(config)
            if current_token:
                # On réessaie une fois avec le nouveau token
                headers["Authorization"] = f"Bearer {current_token}"
                resp = requests.get(url, headers=headers)
            else:
                print("Impossible de renouveler le token.")
                return

        if resp.status_code == 200:
            vehicules_list = resp.json()
            print(f"API a répondu : {len(vehicules_list)} véhicules trouvés.")
        else:
            print(f"Erreur API : Code {resp.status_code}")
            return

    except Exception as e:
        print(f"Erreur Connexion API : {e}")
        return

    # 2. Injection dans la Micro:bit
    count = 0
    for vehicule in vehicules_list:
        plaque = vehicule.get("plaqueImmat")
        cle = vehicule.get("cleIdent")

        if plaque and cle:
            command = f"CFG:{plaque}:{cle}\n"
            ser.write(command.encode('utf-8'))
            ser.flush()
            print(f"Injection : {plaque} -> Clé configurée")
            count += 1
            time.sleep(0.15)
        else:
            print(f"Ignoré : {vehicule}")

    print(f"--- Synchro terminée ({count} clés actives) ---")


def demarrer_passerelle():
    global current_token
    config = charger_config()

    # --- Récupération initiale du token ---
    current_token = obtenir_token_keycloak(config)
    if not current_token:
        print("Attention : Démarrage sans token valide.")

    port = trouver_port_microbit(config["port_usb"])
    baud = config["baudrate"]
    print(f"--- Démarrage Passerelle QG sur {port} ---")

    try:
        ser = serial.Serial(port, baud, timeout=1)
        time.sleep(2)

        last_key_update = time.time()

        # ETAPE 1 : CONFIGURATION AU DEMARRAGE
        fetch_and_sync_keys(ser, config)

        # ETAPE 2 : ECOUTE ET TRANSFERT
        print("\nPasserelle prête. En attente de radio...")

        while True:
            current_time = time.time()
            if current_time - last_key_update > config["update_interval_sec"]:
                print("\n[Timer] Mise à jour automatique des clés...")
                fetch_and_sync_keys(ser, config)
                last_key_update = current_time
                print("[Timer] Retour à l'écoute radio...\n")

            if ser.in_waiting > 0:
                try:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()

                    if line.startswith("LOG:"):
                        print(f"Microbit : {line}")

                    elif line.startswith("EXP:"):
                        print(f"Reçu : {line}")
                        json_text = line[4:]

                        try:
                            raw_data = json.loads(json_text)

                            ts_iso = None
                            if "timestamp" in raw_data and isinstance(raw_data["timestamp"], (int, float)):
                                dt = datetime.fromtimestamp(raw_data["timestamp"], timezone.utc)
                                ts_iso = dt.strftime('%Y-%m-%dT%H:%M:%SZ')

                            res_dict = {}
                            if "raw_res" in raw_data:
                                res_string = raw_data.get("raw_res", "")
                                if res_string and res_string != "0":
                                    try:
                                        items = res_string.split(',')
                                        for item in items:
                                            if '=' in item:
                                                key, val = item.split('=')
                                                key = key.strip().lower()  # Modif minuscule
                                                val = val.strip()
                                                try:
                                                    res_dict[key] = int(val)
                                                except ValueError:
                                                    res_dict[key] = val
                                    except Exception:
                                        pass
                            elif "ressources" in raw_data:
                                res_dict = raw_data["ressources"]

                            payload_api = {
                                "plaqueImmat": raw_data.get("plaqueImmat") or raw_data.get("id"),
                                "lat": raw_data.get("lat"),
                                "lon": raw_data.get("lon"),
                                "timestamp": ts_iso,
                                "ressources": res_dict,
                                "btn": raw_data.get("btn")
                            }

                            # 5. ENVOI (AVEC AUTHENTIFICATION)
                            try:
                                print(f"Payload envoyé : {json.dumps(payload_api)}")

                                # --- Ajout headers Auth ---
                                headers = {}
                                if current_token:
                                    headers["Authorization"] = f"Bearer {current_token}"

                                r = requests.post(config["api_url_data"], json=payload_api, headers=headers)

                                # GESTION TOKEN EXPIRÉ (401)
                                if r.status_code == 401:
                                    print("Token 401. Renouvellement et nouvel essai...")
                                    current_token = obtenir_token_keycloak(config)
                                    if current_token:
                                        headers["Authorization"] = f"Bearer {current_token}"
                                        r = requests.post(config["api_url_data"], json=payload_api, headers=headers)

                                if r.status_code in [200, 201]:
                                    print(f"Donnée sauvegardée : {res_dict} (200 OK)")
                                else:
                                    print(f"Erreur BDD : {r.status_code} - {r.text}")

                            except Exception as e:
                                print(f"Erreur envoi POST : {e}")

                        except json.JSONDecodeError:
                            print("JSON malformé")

                except UnicodeDecodeError:
                    pass

    except serial.SerialException:
        print(f"\nERREUR CRITIQUE : Impossible d'ouvrir {port}")
    except KeyboardInterrupt:
        if 'ser' in locals() and ser.is_open: ser.close()
        print("\nArrêt.")


if __name__ == "__main__":
    demarrer_passerelle()