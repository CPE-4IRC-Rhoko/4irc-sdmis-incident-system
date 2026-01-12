package fr.cpe.sdmis.controller;

import fr.cpe.sdmis.service.SdmisSseService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/sdmis")
public class SseController {

    private final SdmisSseService sseService;

    public SseController(SdmisSseService sseService) {
        this.sseService = sseService;
    }

    @GetMapping(value = "/sse", produces = "text/event-stream")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public SseEmitter sse() {
        return sseService.subscribe();
    }
}
