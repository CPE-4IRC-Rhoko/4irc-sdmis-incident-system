package fr.cpe.sdmis.controller;

import fr.cpe.sdmis.dto.ValidationInterventionRequest;
import fr.cpe.sdmis.service.InterventionService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interventions")
public class InterventionValidationController {

    private final InterventionService interventionService;

    public InterventionValidationController(InterventionService interventionService) {
        this.interventionService = interventionService;
    }

    @PostMapping("/validation")
    @PreAuthorize("hasAnyRole('API_Admin','FRONT_Opérateur','FRONT_Terrain')")
    public void valider(@Valid @RequestBody ValidationInterventionRequest request) {
        interventionService.validerInterventions(request);
    }
}
