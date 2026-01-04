package fr.cpe.sdmis.api;

import fr.cpe.sdmis.dto.StatutInterventionResponse;
import fr.cpe.sdmis.repository.StatutInterventionRepository;
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
    public List<StatutInterventionResponse> list() {
        return repository.findAll();
    }
}
