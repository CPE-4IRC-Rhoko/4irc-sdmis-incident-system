package fr.cpe.sdmis.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController implements ErrorController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "timestamp", Instant.now().toString()
        );
    }

    @RequestMapping("/error")
    public ResponseEntity<Map<String, Object>> error() {
        return ResponseEntity.status(404).body(
                Map.of(
                        "status", 404,
                        "error", "Not Found",
                        "timestamp", Instant.now().toString()
                )
        );
    }
}
