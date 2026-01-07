import serial
import requests
import json
import time
import sys
from datetime import datetime, timezone

# --- CONFIGURATION ---
PORT_USB = "/dev/tty.usbmodem11202"
BAUDRATE = 115200

# URL de ton API
#URL_API = "https://webhook.site/30abc7a4-5b4e-46b6-a3b0-f3818a5b698c"
URL_API = "https://api.4irc.hugorodrigues.fr/api/vehicules/mise-a-jour"


def demarrer_passerelle():
    print(f"--- Démarrage Passerelle QG (Mac) sur {PORT_USB} ---")

    try:
        # Ouverture du port série
        ser = serial.Serial(PORT_USB, BAUDRATE, timeout=1)
        print("Port série ouvert. En attente de données radio...")

        while True:
            # Lecture d'une ligne
            if ser.in_waiting > 0:
                try:
                    # decode('utf-8') est important sur Mac pour éviter les erreurs d'octets bizarres
                    ligne = ser.readline().decode('utf-8', errors='ignore').strip()

                    if ligne.startswith("EXP:"):
                        print(f"Reçu : {ligne}")

                        # Extraction du JSON
                        json_text = ligne[4:]

                        # Envoi vers l'API
                        try:
                            donnees = json.loads(json_text)

                            if "timestamp" in donnees:
                                ts = donnees["timestamp"]
                                # On vérifie que c'est bien un nombre et pas 0 (bug du ;)
                                if isinstance(ts, (int, float)) and ts > 0:
                                    # Conversion Unix (int) -> ISO 8601 (String)
                                    dt_object = datetime.fromtimestamp(ts, timezone.utc)
                                    donnees["timestamp"] = dt_object.strftime('%Y-%m-%dT%H:%M:%SZ')
                                    print(f"Date convertie : {donnees['timestamp']}")

                            reponse = requests.post(URL_API, json=donnees)

                            if reponse.status_code == 200:
                                print("API : OK (Envoyé)")
                            else:
                                print(f"API Erreur : {reponse.status_code}")

                        except json.JSONDecodeError:
                            print("Erreur : JSON invalide")
                        except Exception as e:
                            print(f"Erreur Réseau : {e}")

                except UnicodeDecodeError:
                    pass  # On ignore les glitchs série

    except serial.SerialException:
        print(f"\nERREUR CRITIQUE : Impossible d'ouvrir {PORT_USB}")
        print("1. Vérifie que la Micro:bit est bien branchée.")
        print("2. Vérifie le nom du port avec 'ls /dev/tty.usbmodem*'")
        print("3. Vérifie que Cura ou un autre logiciel n'utilise pas déjà la carte.")

    except KeyboardInterrupt:
        print("\nArrêt de la passerelle.")
        if 'ser' in locals() and ser.is_open:
            ser.close()


if __name__ == "__main__":
    demarrer_passerelle()