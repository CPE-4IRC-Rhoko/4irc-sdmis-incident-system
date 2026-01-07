import serial
import requests
import json
import time
import sys
from datetime import datetime, timezone

# --- CONFIGURATION ---
# Ton port Mac (vérifie avec 'ls /dev/tty.usbmodem*')
PORT_USB = "/dev/tty.usbmodem11202"
BAUDRATE = 115200

# 1. URL pour RECUPERER les clés (GET)
# Doit renvoyer : [{"plaqueImmat": "AA...", "cleIdent": "Key..."}, ...]
URL_API_KEYS = "https://api.4irc.hugorodrigues.fr/api/vehicules/cle-ident"

# 2. URL pour ENVOYER les données reçues (POST)
URL_API_DATA = "https://api.4irc.hugorodrigues.fr/api/vehicules/mise-a-jour"

# FREQUENCE DE MISE A JOUR DES CLES (en secondes)
KEY_UPDATE_INTERVAL = 120  # 2 minutes

def fetch_and_sync_keys(ser):
    print(f"--- Synchronisation des clés depuis l'API ---")
    print(f"GET {URL_API_KEYS}...")

    vehicules_list = []

    # 1. Récupération Web
    try:
        resp = requests.get(URL_API_KEYS)
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
        # Mapping selon ta structure JSON exacte
        plaque = vehicule.get("plaqueImmat")  # Devient l'ID
        cle = vehicule.get("cleIdent")  # Devient la KEY

        if plaque and cle:
            # Format protocole : CFG:AA100AA:KeySecret!!!!
            command = f"CFG:{plaque}:{cle}\n"

            ser.write(command.encode('utf-8'))
            ser.flush()

            print(f"Injection : {plaque} -> Clé configurée")
            count += 1

            # Pause nécessaire pour ne pas saturer le buffer série de la Micro:bit
            time.sleep(0.15)
        else:
            print(f"Ignoré (Données incomplètes) : {vehicule}")

    print(f"--- Synchro terminée ({count} clés actives) ---")


def demarrer_passerelle():
    print(f"--- Démarrage Passerelle QG sur {PORT_USB} ---")

    try:
        # Ouverture Port Série
        ser = serial.Serial(PORT_USB, BAUDRATE, timeout=1)
        # Attente stabilisation (reboot auto possible à l'ouverture)
        time.sleep(2)

        # Initialisation du timer
        last_key_update = time.time()

        # ETAPE 1 : CONFIGURATION AU DEMARRAGE
        fetch_and_sync_keys(ser)

        # ETAPE 2 : ECOUTE ET TRANSFERT
        print("\nPasserelle prête. En attente de radio...")

        while True:
            # --- AJOUT : GESTION DU TEMPS (AUTO-UPDATE) ---
            current_time = time.time()
            if current_time - last_key_update > KEY_UPDATE_INTERVAL:
                print("\n[Timer] Mise à jour automatique des clés...")
                fetch_and_sync_keys(ser)
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
                            data = json.loads(json_text)

                            # Conversion Timestamp Unix -> ISO String
                            if "timestamp" in data and isinstance(data["timestamp"], (int, float)):
                                dt = datetime.fromtimestamp(data["timestamp"], timezone.utc)
                                data["timestamp"] = dt.strftime('%Y-%m-%dT%H:%M:%SZ')

                            # Envoi réel vers ton API de données
                            try:
                                # On envoie vraiment la requête POST
                                r = requests.post(URL_API_DATA, json=data)

                                if r.status_code in [200, 201]:
                                    print("Donnée sauvegardée en BDD (200 OK)")
                                else:
                                    print(f"Erreur BDD : {r.status_code}")

                            except Exception as e:
                                print(f"Erreur envoi POST : {e}")

                        except json.JSONDecodeError:
                            print("JSON malformé reçu du port série")

                except UnicodeDecodeError:
                    pass

    except serial.SerialException:
        print(f"\nERREUR CRITIQUE : Impossible d'ouvrir {PORT_USB}")
        print("   -> Vérifie que le câble est branché.")
        print("   -> Vérifie qu'un autre logiciel d'écoute ne bloque pas le port.")

    except KeyboardInterrupt:
        if 'ser' in locals() and ser.is_open: ser.close()
        print("\nArrêt de la passerelle.")


if __name__ == "__main__":
    demarrer_passerelle()