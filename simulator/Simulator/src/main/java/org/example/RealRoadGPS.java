package org.example;

import org.json.JSONArray;
import org.json.JSONObject;
import org.jxmapviewer.JXMapViewer;
import org.jxmapviewer.OSMTileFactoryInfo;
import org.jxmapviewer.input.PanMouseInputListener;
import org.jxmapviewer.input.ZoomMouseWheelListenerCenter;
import org.jxmapviewer.painter.CompoundPainter;
import org.jxmapviewer.painter.Painter;
import org.jxmapviewer.viewer.DefaultTileFactory;
import org.jxmapviewer.viewer.GeoPosition;

import javax.swing.*;
import javax.swing.event.MouseInputListener;
import java.awt.*;
import java.awt.geom.Point2D;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class RealRoadGPS {
    private JFrame frame;
    private JXMapViewer mapViewer;
    private List<GeoPosition> fullRoute = new ArrayList<>();
    private int currentIndex = 0;

    public RealRoadGPS() {
        // 1. CRITIQUE : S'identifier auprès du serveur de cartes
        System.setProperty("http.agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

        frame = new JFrame("GPS Réel Java");
        mapViewer = new JXMapViewer();

        // Ajouter les contrôles à la souris
        MouseInputListener mia = new PanMouseInputListener(mapViewer);
        mapViewer.addMouseListener(mia);
        mapViewer.addMouseMotionListener(mia);
        mapViewer.addMouseWheelListener(new ZoomMouseWheelListenerCenter(mapViewer));

        // 2. CRITIQUE : Utiliser HTTPS pour les tuiles
        OSMTileFactoryInfo info = new OSMTileFactoryInfo("OpenStreetMap", "https://tile.openstreetmap.org");
        mapViewer.setTileFactory(new DefaultTileFactory(info));

        frame.add(mapViewer);
        frame.setSize(1000, 700);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);

        // Récupérer la route (Paris -> Lyon)
        fetchRoute(2.3522, 48.8566, 4.8357, 45.7640);

        lancerAnimation();
    }

    private void fetchRoute(double startLog, double startLat, double endLog, double endLat) {
        try {
            // Utilisation de Locale.US pour éviter les virgules dans l'URL
            String urlStr = String.format(Locale.US, "http://router.project-osrm.org/route/v1/driving/%f,%f;%f,%f?overview=full&geometries=geojson",
                    startLog, startLat, endLog, endLat);

            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestProperty("User-Agent", "Mozilla/5.0"); // Identification pour OSRM

            BufferedReader rd = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder result = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) result.append(line);
            rd.close();

            JSONObject json = new JSONObject(result.toString());
            JSONArray coords = json.getJSONArray("routes").getJSONObject(0)
                    .getJSONObject("geometry").getJSONArray("coordinates");

            for (int i = 0; i < coords.length(); i++) {
                JSONArray coord = coords.getJSONArray(i);
                fullRoute.add(new GeoPosition(coord.getDouble(1), coord.getDouble(0)));
            }

            mapViewer.setAddressLocation(fullRoute.get(0));
            mapViewer.setZoom(10);

        } catch (Exception e) {
            e.printStackTrace();
            JOptionPane.showMessageDialog(frame, "Erreur réseau ou format de données");
        }
    }

    private void lancerAnimation() {
        Timer timer = new Timer(50, e -> {
            if (currentIndex < fullRoute.size() - 1) {
                currentIndex++;
                updatePainters();
            } else {
                ((Timer) e.getSource()).stop();
            }
        });
        timer.start();
    }

    private void updatePainters() {
        // Peintre pour la route (Ligne rouge)
        Painter<JXMapViewer> linePainter = (g, map, w, h) -> {
            g = (Graphics2D) g.create();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setColor(Color.RED);
            g.setStroke(new BasicStroke(3));

            Point2D lastP = null;
            for (int i = 0; i < fullRoute.size(); i++) {
                Point2D p = map.getTileFactory().geoToPixel(fullRoute.get(i), map.getZoom());
                if (lastP != null) g.drawLine((int) lastP.getX(), (int) lastP.getY(), (int) p.getX(), (int) p.getY());
                lastP = p;
            }
            g.dispose();
        };

        // Peintre pour la "Voiture" (Cercle bleu)
        Painter<JXMapViewer> carPainter = (g, map, w, h) -> {
            g = (Graphics2D) g.create();
            g.setColor(Color.BLUE);
            Point2D p = map.getTileFactory().geoToPixel(fullRoute.get(currentIndex), map.getZoom());
            g.fillOval((int) p.getX() - 6, (int) p.getY() - 6, 12, 12);
            g.dispose();
        };

        List<Painter<JXMapViewer>> painters = new ArrayList<>();
        painters.add(linePainter);
        painters.add(carPainter);
        mapViewer.setOverlayPainter(new CompoundPainter<>(painters));
        mapViewer.repaint();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(RealRoadGPS::new);
    }
}