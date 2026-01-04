package fr.cpe.sdmis.api;

import fr.cpe.sdmis.dto.InterventionResponse;
import fr.cpe.sdmis.repository.InterventionRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/interventions")
public class InterventionController {

    private final InterventionRepository interventionRepository;

    public InterventionController(InterventionRepository interventionRepository) {
        this.interventionRepository = interventionRepository;
    }

    @GetMapping
    public List<InterventionResponse> list() {
        return interventionRepository.findAll();
    }
}
