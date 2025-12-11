📁 Description des dossiers

📌 pom.xml

Fichier Maven principal.
Il contient :
  les dépendances
  les plugins
  les instructions de build
  la version du projet
  la version de Java

▶️ src/main/java/

Contient tout le code Java chargé à l’exécution.

simulator/App.java

Point d’entrée du simulateur.
Contient la méthode main().
simulator/gps/
Contient la logique de génération de coordonnées GPS :

Exemples typiques de classes :
  GpsGenerator.java
  GpsCoordinate.java
  TrajectorySimulator.java

Ce package gère :
  positions géographiques
  trajectoires simulées
  génération pseudo-aléatoire
  simulator/setup/

Contient tout ce qui sert à configurer le simulateur, notamment :
  Exemples de classes :
  IncidentSetup.java
  VehicleSetup.java
  ScenarioLoader.java

Responsabilités :

configuration initiale
liste des véhicules simulés
types d’incidents
paramètres et scénarios d'entrée

📁 src/main/resources/

Contient les fichiers non Java utiles à l’application.
application.properties

Fichier de configuration général du projet.
Permet de définir :
  paramètres du simulateur
  variables globales
  configuration externe

🧪 src/test/

Contient le code de tests unitaires, exécuté via mvn test.

AppTest.java
Test minimal pour vérifier le fonctionnement de l'application.
