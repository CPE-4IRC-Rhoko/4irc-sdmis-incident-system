package org.example;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import org.example.OSRMService;
import java.util.Locale;

import java.util.List;

public class MapApp extends Application {

    private WebEngine webEngine;

    @Override
    public void start(Stage stage) {
        WebView webView = new WebView();
        webEngine = webView.getEngine();

        webEngine.load(getClass().getResource("/map.html").toExternalForm());

        stage.setTitle("Trajet OSRM");
        stage.setScene(new Scene(webView, 1000, 700));
        stage.show();

        webEngine.documentProperty().addListener((obs, oldDoc, newDoc) -> {
            if (newDoc != null) {
                loadRoute();
            }
        });
    }

    private void loadRoute() {
        List<double[]> points = OSRMService.getRoutePoints();

        StringBuilder jsArray = new StringBuilder("[");
        for (double[] p : points) {
            jsArray.append("[").append(p[0]).append(",").append(p[1]).append("],");
        }
        jsArray.append("]");

        webEngine.executeScript("drawRoute(" + jsArray + ");");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
