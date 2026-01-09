package fr.cpe.sdmis.api;

import fr.cpe.sdmis.service.SdmisSseService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/sdmis")
public class SseController {

    private final SdmisSseService sseService;

    public SseController(SdmisSseService sseService) {
        this.sseService = sseService;
    }

    @GetMapping(value = "/sse", produces = "text/event-stream")
    public SseEmitter sse() {
        return sseService.subscribe();
    }
}
