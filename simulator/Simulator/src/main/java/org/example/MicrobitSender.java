package org.example;

import com.fazecast.jSerialComm.SerialPort;
import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.time.Instant;

public class MicrobitSender {

    private SerialPort comPort;
    private OutputStream out;

    // Constructeur : Ouvre le port série
    public MicrobitSender(String portDescriptor) {
        // portDescriptor = "COM3" (Windows) ou "/dev/ttyACM0" (Linux/Mac)
        comPort = SerialPort.getCommPort(portDescriptor);

        // CONFIGURATION CRITIQUE : DOIT ETRE 115200 POUR PARLER A LA MICROBIT
        comPort.setBaudRate(115200);
        comPort.setComPortTimeouts(SerialPort.TIMEOUT_WRITE_BLOCKING, 0, 0);

        if (comPort.openPort()) {
            System.out.println("Port " + portDescriptor + " ouvert. Prêt à émettre.");
            out = comPort.getOutputStream();
        } else {
            System.err.println("ERREUR : Impossible d'ouvrir le port " + portDescriptor);
        }
    }

    /**
     * Envoie une mise à jour d'état pour un camion spécifique.
     * Le format généré est : "ID:10;Geo:45.1234,4.5678;Eau:80;\n"
     */
    public void envoyerDonnees(String id, double latitude, double longitude, int niveauEau) {
        if (out == null) return;

        try {

            // On récupère le Timestamp actuel (en secondes)
            long timestamp = System.currentTimeMillis() / 1000;

            System.err.println("Heure : " + timestamp );

            // 1. Formatage de la trame
            // Locale.US force l'utilisation du POINT (.) pour les décimales et non la virgule
            // Le '\n' à la fin est OBLIGATOIRE pour que la Micro:bit détecte la fin du message
            // Trame
            String trame = String.format(Locale.US, "ID:%s;Geo:%.5f,%.5f;Eau:%d;Time:%s;\n", id, latitude, longitude, niveauEau, timestamp);

            // 2. Envoi sur le port série
            out.write(trame.getBytes());
            out.flush(); // Force l'envoi immédiat

            // Debug (optionnel)
            // System.out.print("Envoyé -> " + trame);

        } catch (IOException e) {
            System.err.println("Erreur lors de l'envoi : " + e.getMessage());
        }
    }

    // Fermer proprement à la fin du programme
    public void close() {
        if (comPort.isOpen()) {
            comPort.closePort();
            System.out.println("Port série fermé.");
        }
    }
}
