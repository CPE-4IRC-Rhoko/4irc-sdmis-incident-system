import serial
import serial.tools.list_ports
import requests
import json
import time
import sys
import os
import threading
from datetime import datetime, timezone
from dotenv import load_dotenv

# Nom du fichier de configuration
CONFIG_FILE = "config.json"

# --- VARIABLES PARTAGÉES (Thread Safe) ---
latest_packet = None  
packet_lock = threading.Lock() 
new_data_event = threading.Event() 

# Variable globale pour stocker le token
current_token = None
config_global = None 

def charger_config():
    load_dotenv()
    if not os.path.exists(CONFIG_FILE):
        print(f"Erreur : {CONFIG_FILE} introuvable.")
        sys.exit(1)
    with open(CONFIG_FILE, 'r') as f:
        config = json.load(f)
    secret_env = os.getenv("KEYCLOAK_CLIENT_SECRET")
    if secret_env:
        config["keycloak"]["client_secret"] = secret_env
    return config

def trouver_port_microbit(config_port):
    if config_port != "AUTO": return config_port
    print("Recherche Micro:bit...")
    for p in list(serial.tools.list_ports.comports()):
        if "0D28" in p.hwid or "Micro:bit" in p.description or "BBC" in p.description:
            print(f"Trouvé : {p.device}")
            return p.device
    sys.exit("Aucune Micro:bit trouvée.")

def obtenir_token_keycloak(config):
    try:
        kc = config["keycloak"]
        url = f"{kc['url'].rstrip('/')}/realms/{kc['realm']}/protocol/openid-connect/token"
        payload = {"grant_type": "client_credentials", "client_id": kc["client_id"], "client_secret": kc["client_secret"]}
        r = requests.post(url, data=payload, timeout=5)
        if r.status_code == 200: return r.json().get("access_token")
    except Exception as e:
        print(f"\n[Auth] Erreur Keycloak: {e}")
    return None

# --- FONCTION DE SYNCHRO DES CLES (Restaurée) ---
def fetch_and_sync_keys(ser, config):
    global current_token
    url = config["api_url_keys"]
    print(f"\n--- [Admin] Synchronisation des clés ---")

    try:
        headers = {}
        if current_token: headers["Authorization"] = f"Bearer {current_token}"
        resp = requests.get(url, headers=headers, timeout=5)

        if resp.status_code == 401:
            print("Token expiré (401). Renouvellement...")
            current_token = obtenir_token_keycloak(config)
            if current_token:
                headers["Authorization"] = f"Bearer {current_token}"
                resp = requests.get(url, headers=headers, timeout=5)

        if resp.status_code == 200:
            vehicules_list = resp.json()
            print(f"API : {len(vehicules_list)} véhicules trouvés.")
            
            # Injection dans la Micro:bit via Série
            count = 0
            for vehicule in vehicules_list:
                plaque = vehicule.get("plaqueImmat")
                cle = vehicule.get("cleIdent")
                if plaque and cle:
                    # Format CFG:ID:KEY
                    command = f"CFG:{plaque}:{cle}\n"
                    ser.write(command.encode('utf-8'))
                    ser.flush()
                    count += 1
                    time.sleep(0.05) # Petite pause pour ne pas saturer le buffer d'entrée du QG
            print(f"Injection terminée ({count} clés).")
        else:
            print(f"Erreur API Keys: {resp.status_code}")

    except Exception as e:
        print(f"Erreur Synchro Clés : {e}")
    print("--- Fin Synchro ---\n")

# --- WORKER THREAD : Envoi API (Lent) ---
def api_worker():
    global current_token, latest_packet
    print("--- Thread 'Temps Réel' démarré ---")
    
    while True:
        new_data_event.wait()
        
        payload_to_send = None
        with packet_lock:
            if latest_packet:
                payload_to_send = latest_packet
                latest_packet = None 
            new_data_event.clear() 

        if payload_to_send:
            try:
                headers = {}
                if current_token: headers["Authorization"] = f"Bearer {current_token}"
                
                try:
                    r = requests.post(config_global["api_url_data"], json=payload_to_send, headers=headers, timeout=2)
                    
                    if r.status_code == 401:
                        # print("\n[Thread] Token 401...") 
                        current_token = obtenir_token_keycloak(config_global)
                        if current_token:
                            headers["Authorization"] = f"Bearer {current_token}"
                            r = requests.post(config_global["api_url_data"], json=payload_to_send, headers=headers, timeout=2)

                    if r.status_code in [200, 201]:
                        print(".", end="", flush=True) 
                    else:
                        print(f"x({r.status_code})", end="", flush=True)

                except requests.exceptions.Timeout:
                    print("T", end="", flush=True)
                except Exception as e:
                    print("!", end="", flush=True)

            except Exception as e:
                print(f"\n[Thread] Erreur: {e}")

# --- MAIN THREAD : Lecture Série (Rapide) ---
def demarrer_passerelle():
    global current_token, config_global, latest_packet
    config_global = charger_config()

    current_token = obtenir_token_keycloak(config_global)
    port = trouver_port_microbit(config_global["port_usb"])
    
    threading.Thread(target=api_worker, daemon=True).start()

    try:
        ser = serial.Serial(port, config_global["baudrate"], timeout=1)
        time.sleep(2)
        
        # 1. Injection Initiale des Clés
        fetch_and_sync_keys(ser, config_global)
        last_key_update = time.time()

        print("\nPasserelle 'LAST-VALUE' prête. En attente...")

        while True:
            # 2. Vérification Timer pour mise à jour des clés
            if time.time() - last_key_update > config_global.get("update_interval_sec", 3600):
                fetch_and_sync_keys(ser, config_global)
                last_key_update = time.time()

            # 3. Lecture Radio
            if ser.in_waiting > 0:
                try:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    
                    if line.startswith("EXP:"):
                        json_text = line[4:]
                        try:
                            raw = json.loads(json_text)
                            
                            ts_iso = None
                            if "timestamp" in raw and isinstance(raw["timestamp"], (int, float)):
                                dt = datetime.fromtimestamp(raw["timestamp"], timezone.utc)
                                ts_iso = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                            
                            res_dict = raw.get("ressources", {})
                            if "raw_res" in raw:
                                try:
                                    for item in raw["raw_res"].split(','):
                                        if '=' in item:
                                            k, v = item.split('=')
                                            res_dict[k.strip()] = int(v.strip()) if v.strip().isdigit() else v.strip()
                                except: pass

                            payload = {
                                "plaqueImmat": raw.get("plaqueImmat") or raw.get("id"),
                                "lat": raw.get("lat"),
                                "lon": raw.get("lon"),
                                "timestamp": ts_iso,
                                "ressources": res_dict,
                                "btn": raw.get("btn")
                            }

                            # ÉCRASEMENT DE LA DONNÉE (Last Value Caching)
                            with packet_lock:
                                latest_packet = payload
                                new_data_event.set()

                        except json.JSONDecodeError:
                            pass
                    
                    elif line.startswith("LOG:"):
                        # print(f"Log: {line}") 
                        pass

                except UnicodeDecodeError:
                    pass
            else:
                time.sleep(0.001)

    except KeyboardInterrupt:
        print("\nArrêt.")
    except Exception as e:
        print(f"\nErreur Critique: {e}")

if __name__ == "__main__":
    demarrer_passerelle()