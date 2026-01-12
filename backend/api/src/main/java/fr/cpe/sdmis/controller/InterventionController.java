package fr.cpe.sdmis.controller;

import fr.cpe.sdmis.dto.InterventionResponse;
import fr.cpe.sdmis.dto.InterventionSnapshotResponse;
import fr.cpe.sdmis.repository.InterventionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<InterventionResponse> list() {
        return interventionRepository.findAll();
    }

    @GetMapping("/terminees")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<InterventionResponse> terminees() {
        return interventionRepository.findTerminees();
    }

    @GetMapping("/snapshots")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<InterventionSnapshotResponse> snapshots() {
        return interventionRepository.findSnapshots();
    }
}
