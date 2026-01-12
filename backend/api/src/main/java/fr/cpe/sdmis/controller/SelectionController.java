package fr.cpe.sdmis.controller;

import fr.cpe.sdmis.dto.VehiculeSelectionResponse;
import fr.cpe.sdmis.repository.VehiculeSelectionRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/evenements")
public class SelectionController {

    private final VehiculeSelectionRepository selectionRepository;

    public SelectionController(VehiculeSelectionRepository selectionRepository) {
        this.selectionRepository = selectionRepository;
    }

    @GetMapping("/{eventId}/vehicules-selectionnes")
    @PreAuthorize("hasAnyRole('API_Admin','API_Moteur_Decision')")
    public List<VehiculeSelectionResponse> vehiculesSelectionnes(@PathVariable UUID eventId) {
        return selectionRepository.findSelectedForEvent(eventId);
    }
}
