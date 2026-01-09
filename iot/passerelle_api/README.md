# Passerelle IoT Micro:bit - Documentation d'Installation

Ce logiciel permet de faire le pont entre la **Micro:bit QG (Micro:bit de réception)** et l'**API Web**. Il récupère les clés de chiffrement dynamiquement et remonte les informations des camions.

## Architecture du Système

Le système repose sur une chaîne de transmission en 4 étapes :

1.  **Simulation & Émission (Java) :** Les véhicules génèrent des données télémétriques (GPS, Ressources).
2.  **Transmission Radio Sécurisée :** Envoi des paquets chiffrés (**AES-128** + Signature **HMAC**) sur fréquence 2.4GHz via protocole Micro:bit Radio.
3.  **Réception QG (Micro:bit V2) :** Une carte maître reçoit les paquets, vérifie l'intégrité, déchiffre le contenu et le transmet via USB.
4.  **Passerelle Intelligente (Python) :** Ce script :
    * Récupère les données brutes du port série.
    * Gère le **provisioning** (récupération dynamique des clés de chiffrement depuis l'API).
    * Formate les données en JSON compatible (Horodatage ISO 8601, Parsing des ressources).
    * Envoie les données finales au Cloud via HTTPS.

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
* Accès Internet (pour communiquer avec l'API).

## Installation

### 1. Préparer le dossier
Téléchargez les fichiers du projet et placez-les dans un dossier (ex: `passerelle_iot`). Vous devez avoir :
* `main.py` (Le script)
* `config.json` (La configuration)
* `requirements.txt` (La liste des librairies)

### 2. Installer les librairies
Ouvrez un terminal (ou Invite de commandes) dans le dossier et lancez :

```bash
pip install -r requirements.txt
```
(Sur certains systèmes, utilisez pip3 au lieu de pip).

## Configuration
Tout se gère dans config.json. Il n'est pas nécessaire de modifier le code Python.

| Paramètre | Description                                                                               | Exemple |
| :--- |:------------------------------------------------------------------------------------------| :--- |
| `port_usb` | Port de la Micro:bit. Mettez "AUTO" pour une détection automatique. Sinon forcez le port. | `"AUTO"` ou `"COM3"` ou `"/dev/tty..."` |
| `baudrate` | Vitesse de communication série (Doit correspondre a la configuration de la Micro:Bit QG). | `115200` |
| `api_url_keys` | Endpoint GET pour récupérer les ID camions et clés correspondantes.                       | `"https://.../cle-ident"` |
| `api_url_data` | Endpoint POST pour envoyer les données des camions.                                       | `"https://.../mise-a-jour"` |
| `update_interval_sec` | Fréquence de mise à jour des clés (en secondes).                                          | `120` |

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
- Reçu : EXP:{...} (Données brutes).
- Envoi API : {...} (Données formatées).
- Sauvegardé (200 OK) (Confirmation serveur).

## Fonctionnalités Techniques
* **Provisioning Dynamique** : Les clés AES ne sont pas stockées "en dur". La passerelle les met à jour toutes les 2 minutes pour garantir que seuls les véhicules autorisés peuvent communiquer.
* **Support Multi-Ressources** : Gestion intelligente des ressources envoyées sous forme textuelle (ex: Eau=80,Gaz=10) et conversion en objet JSON structuré pour l'API.
* **Normalisation des Données** : Conversion Timestamp Unix -> ISO 8601 (standard WEB).

## Dépannage
* Erreur ModuleNotFoundError :
  * Vous avez oublié l'étape pip install -r requirements.txt.
* Erreur Access is denied ou Resource busy :
  * Le port USB est déjà utilisé par un autre logiciel d'écoute. Fermez-le.
* La détection "AUTO" échoue :
  * Ouvrez config.json et remplacez "AUTO" par votre port précis (ex: "COM4").
* Erreur API 400 (Bad Request) :
  * Vérifiez les logs de la passerelle. L'API refuse probablement le format d'une donnée (ex: majuscule dans une clé).

## Auteurs
Projet réalisé dans le cadre du module 4IRC - Projet Transversal.
**Sacha HENRY - Hugo RODRIGUES - Quentin DUBOIS - Maxence LERDA - Vincent GEAY**