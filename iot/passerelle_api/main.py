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


def charger_config():
    """Charge la configuration depuis le fichier JSON."""
    if not os.path.exists(CONFIG_FILE):
        print(f"Erreur : Le fichier {CONFIG_FILE} est introuvable.")
        print("   -> Veuillez créer ce fichier à côté du script.")
        sys.exit(1)

    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)


def trouver_port_microbit(config_port):
    """Trouve le port USB. Si 'AUTO', cherche une Micro:bit."""
    if config_port != "AUTO":
        return config_port

    print("Recherche automatique de la Micro:bit...")
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        # Identifiants USB classiques des Micro:bit
        if "0D28" in p.hwid or "Micro:bit" in p.description or "BBC" in p.description:
            print(f"Micro:bit détectée sur : {p.device}")
            return p.device

    print("Aucune Micro:bit détectée automatiquement.")
    print("   -> Modifiez config.json avec le port exact (ex: COM3 ou /dev/tty...)")
    sys.exit(1)

def fetch_and_sync_keys(ser, config):
    url = config["api_url_keys"]
    print(f"--- Synchronisation des clés depuis l'API ---")
    print(f"GET {url}...")

    vehicules_list = []

    # 1. Récupération Web
    try:
        resp = requests.get(url)
        if resp.status_code == 200:
            vehicules_list = resp.json()
            print(f"API a répondu : {len(vehicules_list)} véhicules trouvés.")
        else:
            print(f"Erreur API : Code {resp.status_code}")
            return
    except Exception as e:
        print(f"Erreur Connexion API (Le serveur est lancé ?) : {e}")
        return

    # 2. Injection dans la Micro:bit
    count = 0
    for vehicule in vehicules_list:
        # Mapping selon ta structure JSON
        plaque = vehicule.get("plaqueImmat")  # Devient l'ID
        cle = vehicule.get("cleIdent")  # Devient la KEY

        if plaque and cle:
            # Format protocole : CFG:AA100AA:KeySecret!!!!
            command = f"CFG:{plaque}:{cle}\n"

            ser.write(command.encode('utf-8'))
            ser.flush()

            print(f"Injection : {plaque} -> Clé configurée")
            count += 1

            # Pause pour ne pas saturer le buffer série de la Micro:bit
            time.sleep(0.15)
        else:
            print(f"Ignoré (Données incomplètes) : {vehicule}")

    print(f"--- Synchro terminée ({count} clés actives) ---")


def demarrer_passerelle():
    config = charger_config()
    port = trouver_port_microbit(config["port_usb"])
    baud = config["baudrate"]
    print(f"--- Démarrage Passerelle QG sur {port} ---")

    try:
        # Ouverture Port Série
        ser = serial.Serial(port, baud, timeout=1)
        # Attente stabilisation (reboot auto)
        time.sleep(2)

        # Initialisation du timer
        last_key_update = time.time()

        # ETAPE 1 : CONFIGURATION AU DEMARRAGE
        fetch_and_sync_keys(ser, config)

        # ETAPE 2 : ECOUTE ET TRANSFERT
        print("\nPasserelle prête. En attente de radio...")

        while True:
            # --- GESTION DU TEMPS (AUTO-UPDATE) ---
            current_time = time.time()
            if current_time - last_key_update > config["update_interval_sec"]:
                print("\n[Timer] Mise à jour automatique des clés...")
                fetch_and_sync_keys(ser, config)
                last_key_update = current_time
                print("[Timer] Retour à l'écoute radio...\n")
            # ----------------------------------------------

            if ser.in_waiting > 0:
                try:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()

                    # CAS A : Log de confirmation de la Microbit
                    if line.startswith("LOG:"):
                        print(f"Microbit : {line}")

                    # CAS B : Données capteurs à envoyer au Web
                    elif line.startswith("EXP:"):
                        print(f"Reçu : {line}")
                        json_text = line[4:]

                        try:
                            # 1. Parsing des données brutes reçues de la Microbit
                            raw_data = json.loads(json_text)

                            # 2. Conversion Timestamp Unix -> Timestamp WEB ISO String
                            ts_iso = None
                            if "timestamp" in raw_data and isinstance(raw_data["timestamp"], (int, float)):
                                dt = datetime.fromtimestamp(raw_data["timestamp"], timezone.utc)
                                ts_iso = dt.strftime('%Y-%m-%dT%H:%M:%SZ')

                            # 3. Traitement ressources
                            res_dict = {}

                            # Option A: Format TEXTE (Nouveau code QG : raw_res="Eau=80,Gaz=10")
                            if "raw_res" in raw_data:
                                res_string = raw_data.get("raw_res", "")
                                if res_string and res_string != "0":
                                    try:
                                        items = res_string.split(',')
                                        for item in items:
                                            if '=' in item:
                                                key, val = item.split('=')
                                                key = key.strip()
                                                val = val.strip()
                                                try:
                                                    res_dict[key] = int(val)
                                                except ValueError:
                                                    res_dict[key] = val
                                    except Exception:
                                        print("Erreur parsing raw_res")

                            # Option B: Format OBJET (Ancien code: ressources={"eau":85})
                            elif "ressources" in raw_data and isinstance(raw_data["ressources"], dict):
                                res_dict = raw_data["ressources"]

                            # 4. Construction du paylod final pour l'API
                            payload_api = {
                                "plaqueImmat": raw_data.get("plaqueImmat") or raw_data.get("id"),
                                "lat": raw_data.get("lat"),
                                "lon": raw_data.get("lon"),
                                "timestamp": ts_iso,
                                "ressources": res_dict,
                                "btn": raw_data.get("btn")
                            }

                            # 5. ENVOI
                            try:
                                print(f"Payload envoyé à l'API : {json.dumps(payload_api)}")
                                r = requests.post(config["api_url_data"], json=payload_api)

                                if r.status_code in [200, 201]:
                                    print(f"Donnée sauvegardée : {res_dict} (200 OK)")
                                else:
                                    print(f"Erreur BDD : {r.status_code} - {r.text}")

                            except Exception as e:
                                print(f"Erreur envoi POST : {e}")

                        except json.JSONDecodeError:
                            print("JSON malformé reçu du port série")

                except UnicodeDecodeError:
                    pass

    except serial.SerialException:
        print(f"\nERREUR CRITIQUE : Impossible d'ouvrir {port}")
        print("   -> Vérifie que le câble est branché.")
        print("   -> Vérifie qu'un autre logiciel d'écoute ne bloque pas le port.")

    except KeyboardInterrupt:
        if 'ser' in locals() and ser.is_open: ser.close()
        print("\nArrêt de la passerelle.")


if __name__ == "__main__":
    demarrer_passerelle()