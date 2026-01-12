package fr.cpe.sdmis.controller;

import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import fr.cpe.sdmis.dto.EvenementSnapshotResponse;
import fr.cpe.sdmis.dto.EvenementUpdateRequest;
import fr.cpe.sdmis.service.EvenementService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/evenements")
public class EvenementController {
    private final EvenementService evenementService;

    public EvenementController(EvenementService evenementService) {
        this.evenementService = evenementService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public EvenementResponse create(@Valid @RequestBody EvenementCreateRequest request) {
        return evenementService.createEvenement(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('API_Admin')")
    public EvenementResponse update(@PathVariable("id") UUID id, @Valid @RequestBody EvenementUpdateRequest request) {
        return evenementService.updateEvenement(id, request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<EvenementResponse> list() {
        return evenementService.listEvenements();
    }

    @GetMapping("/snapshots")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<EvenementSnapshotResponse> listSnapshots() {
        return evenementService.listSnapshots();
    }
}
