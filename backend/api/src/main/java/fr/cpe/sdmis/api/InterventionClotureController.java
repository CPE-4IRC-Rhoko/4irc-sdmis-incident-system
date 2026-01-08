package fr.cpe.sdmis.api;

import fr.cpe.sdmis.dto.ClotureInterventionRequest;
import fr.cpe.sdmis.service.InterventionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interventions")
public class InterventionClotureController {

    private final InterventionService interventionService;

    public InterventionClotureController(InterventionService interventionService) {
        this.interventionService = interventionService;
    }

    @PostMapping("/cloture")
    public void cloturer(@Valid @RequestBody ClotureInterventionRequest request) {
        interventionService.cloturerIntervention(request);
    }
}
