package fr.cpe.sdmis.controller;

import fr.cpe.sdmis.dto.CreationUtilisateurRequest;
import fr.cpe.sdmis.dto.CreationUtilisateurResponse;
import fr.cpe.sdmis.service.UtilisateurAdminService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/utilisateurs")
public class UtilisateurAdminController {

    private final UtilisateurAdminService utilisateurAdminService;

    public UtilisateurAdminController(UtilisateurAdminService utilisateurAdminService) {
        this.utilisateurAdminService = utilisateurAdminService;
    }

    @PostMapping
    @PreAuthorize("hasRole('API_Admin')")
    public CreationUtilisateurResponse creer(@Valid @RequestBody CreationUtilisateurRequest request) {
        return utilisateurAdminService.creerUtilisateur(request);
    }
}
