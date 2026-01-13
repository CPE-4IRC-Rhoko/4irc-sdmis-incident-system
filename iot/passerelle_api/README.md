# Passerelle IoT Micro:bit - Documentation d'Installation

Ce logiciel permet de faire le pont entre la **Micro:bit QG 
(Micro:bit de réception)** et l'**API Web**. Il récupère les 
clés de chiffrement dynamiquement, s'authentifie via Keycloak et remonte les informations des camions.

Cette version utilise désormais une architecture multi-threadée pour gérer une flotte importante (30+ véhicules) sans aucune latence.

## Architecture du Système

Le système repose sur une chaîne de transmission en 4 étapes :

1.  **Simulation & Émission (Java) :** Les véhicules génèrent des données télémétriques (GPS, Ressources).
2.  **Transmission Radio Sécurisée :** Envoi des paquets chiffrés (**AES-128** + Signature **HMAC**) sur fréquence 2.4GHz via protocole Micro:bit Radio.
3.  **Réception QG (Micro:bit V2) :** Une carte maître reçoit les paquets, vérifie l'intégrité, déchiffre le contenu et le transmet via USB.
4.  **Passerelle Intelligente (Python) :** Ce script :
    * Thread Principal (Lecture USB) : Écoute le port série à haute vitesse pour ne jamais perdre un paquet radio. Il utilise une stratégie de "Last Value Caching" (écrase les anciennes données par les nouvelles) pour garantir une latence zéro.
    * Thread Secondaire (Envoi API) : Récupère la donnée la plus fraîche et l'envoie à l'API de manière asynchrone, gère l'authentification Keycloak et le formatage JSON.


---
## Prérequis

### Matériel
* 1x Carte BBC Micro:bit (Flashée avec le firmware "QG").
* 1x Câble Micro-USB (pour la liaison série).
* Un ordinateur (Windows, macOS ou Linux).

### Logiciel
* Avoir **Python 3** installé sur la machine.
    * *Windows :* [Télécharger Python](https://www.python.org/downloads/) (Cochez "Add to PATH" à l'installation).
    * *Mac/Linux :* Généralement préinstallé.
* Accès Internet (pour communiquer avec l'API et Keycloak).

## Installation

### 1. Préparer le dossier
Téléchargez les fichiers du projet et placez-les dans un dossier (ex: `passerelle_iot`). Vous devez avoir :
* `main.py` (Le script principal)
* `config.json` (La configuration publique)
* `requirements.txt` (La liste des librairies)

### 2. Installer les librairies
Ouvrez un terminal (ou Invite de commandes) dans le dossier et lancez :

```bash
pip install -r requirements.txt
```
(Sur certains systèmes, utilisez pip3 au lieu de pip).

## Configuration
Tout se gère dans config.json. Il n'est pas nécessaire de modifier le code Python.

| Paramètre | Description                                                                               | Exemple                                 |
| :--- |:------------------------------------------------------------------------------------------|:----------------------------------------|
| `port_usb` | Port de la Micro:bit. Mettez "AUTO" pour une détection automatique. Sinon forcez le port. | `"AUTO"` ou `"COM3"` ou `"/dev/tty..."` |
| `baudrate` | Vitesse de communication série (Doit correspondre a la configuration de la Micro:Bit QG). | `115200`                                |
| `api_url_keys` | Endpoint GET pour récupérer les ID camions et clés correspondantes.                       | `"https://.../cle-ident"`               |
| `api_url_data` | Endpoint POST pour envoyer les données des camions.                                       | `"https://.../mise-a-jour"`             |
| `update_interval_sec` | Fréquence de mise à jour des clés (en secondes).                                          | `120`                                   |
| `keycloak.url` | URL de base de votre serveur Keycloak.                                         | `"https://auth.domaine.fr"`             |
| `keycloak.realm` | Nom du Royaume (Realm).                                         | `"SDMIS"`                                 |
| `keycloak.client_id` | Identifiant du client API.                                        | `"gateway-client"`                                      |

Note : Le champ client_secret dans le JSON doit rester à "ENV_VAR", car il est surchargé par le fichier .env
## Sécurité et variables d'environnement
Pour ne pas stocker le secret Keycloak dans le code, nous utilisons un fichier .env.
1. Créez un fichier nommé .env à la racine du dossier.
2. Ajoutez-y votre secret Keycloak :
```bash
KEYCLOAK_CLIENT_SECRET=votre_secret_recupere_sur_la_console_keycloak
```

## Utilisation

1. Branchez la Micro:bit QG à l'ordinateur via USB.

2. Lancez la passerelle depuis un terminal du dossier de la passerelle :
```bash
python gateway.py
```

### Séquence de démarrage attendue :
1. Détection du port : Micro:bit détectée sur : /dev/tty... (ou COMx).
2. Synchronisation : GET https://... -> Récupération des clés.
3. Injection : Injection : AA100AA -> Clé configurée.
4. Écoute : Passerelle prête. En attente de radio...

#### Lorsque les camions émettent, vous verrez :
- Vous verrez une ligne de points défiler. Chaque point représente un envoi réussi à l'API.
```bash
................................T................x(500)......
```

Légende des symboles :
* . (Point) : Succès. Donnée envoyée et sauvegardée (200 OK).
* T (Timeout) : Lenteur API. Le serveur a mis trop de temps à répondre (>2s). Le paquet a été abandonné pour ne pas bloquer le flux.
* ! (Exclamation) : Erreur Réseau. Impossible de joindre le serveur.
* x(CODE) : Erreur HTTP. Le serveur a répondu une erreur (ex: x(500) pour erreur serveur, x(400) pour mauvaise requête).

## Fonctionnalités Techniques
* **Authentification OAuth** : Intégration complète de Keycloak. Gestion automatique de l'expiration des tokens (renouvellement auto sur erreur 401).
* **Sécurité des Secrets** : Utilisation de python-dotenv pour séparer les secrets du code source.
* **Provisioning Dynamique** : Les clés AES ne sont pas stockées "en dur". La passerelle les met à jour toutes les 2 minutes pour garantir que seuls les véhicules autorisés peuvent communiquer.
* **Support Multi-Ressources** : Gestion intelligente des ressources envoyées sous forme textuelle (ex: Eau=80,Gaz=10) et conversion en objet JSON structuré pour l'API.
* **Normalisation des Données** : Conversion Timestamp Unix -> ISO 8601 (standard WEB).
* **Optimisation API** : Utilisation de timeouts stricts (2s) pour éviter les "embouteillages" réseaux.
* **Architecture Multi-Threading** : Découplage total entre la lecture série (USB) et l'envoi réseau (HTTP). Le port série ne sature jamais, même si l'API est lente.
* **Last Value Caching (Zero Latency)** : Si plusieurs positions pour un même camion arrivent pendant que l'API est occupée, la passerelle écrase les anciennes données pour n'envoyer que la position la plus récente. Cela garantit un affichage temps réel sur la carte ("Drop-on-full strategy").

## Dépannage
* Je ne vois que des . : Tout est parfait !
* Je vois beaucoup de T : Votre API Java est trop lente ou surchargée. La passerelle fonctionne mais certaines positions sont sautées.
* Je vois x(401) en boucle : Problème d'authentification Keycloak. Vérifiez votre secret dans .env.
* Erreur ModuleNotFoundError : Lancez pip install -r requirements.txt.
* Erreur Access is denied : Le port USB est utilisé par un autre logiciel (ex: MakeCode ou un autre terminal). Fermez-le.

## Auteurs
Projet réalisé dans le cadre du module 4IRC - Projet Transversal.
**Sacha HENRY - Hugo RODRIGUES - Quentin DUBOIS - Maxence LERDA - Vincent GEAY**