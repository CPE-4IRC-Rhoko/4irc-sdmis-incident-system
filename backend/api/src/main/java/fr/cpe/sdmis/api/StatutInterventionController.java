package fr.cpe.sdmis.api;

import fr.cpe.sdmis.dto.StatutInterventionResponse;
import fr.cpe.sdmis.repository.StatutInterventionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/statut-interventions")
public class StatutInterventionController {

    private final StatutInterventionRepository repository;

    public StatutInterventionController(StatutInterventionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<StatutInterventionResponse> list() {
        return repository.findAll();
    }
}
