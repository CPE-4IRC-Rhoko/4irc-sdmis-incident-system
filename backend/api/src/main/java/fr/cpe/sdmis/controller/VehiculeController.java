package fr.cpe.sdmis.controller;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import fr.cpe.sdmis.dto.VehiculeUpdateRequest;
import fr.cpe.sdmis.dto.VehiculeIdentResponse;
import fr.cpe.sdmis.dto.VehiculeEnRouteResponse;
import fr.cpe.sdmis.dto.VehiculeStatusUpdateRequest;
import fr.cpe.sdmis.dto.VehiculeSnapshotResponse;
import fr.cpe.sdmis.dto.EquipementVehiculeResponse;
import fr.cpe.sdmis.dto.VehiculeCreateRequest;
import fr.cpe.sdmis.service.VehiculeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/vehicules")
public class VehiculeController {

    private final VehiculeService vehiculeService;

    public VehiculeController(VehiculeService vehiculeService) {
        this.vehiculeService = vehiculeService;
    }

    @GetMapping("/operationnels")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation','FRONT_Opérateur')")
    public List<VehiculeOperationnelResponse> operationnels() {
        return vehiculeService.findOperationnels();
    }

    @PostMapping("/mise-a-jour")
    @PreAuthorize("hasAnyRole('API_Admin','API_Passerelle')")
    public void miseAJour(@Valid @RequestBody VehiculeUpdateRequest request) {
        vehiculeService.updateVehicule(request);
    }

    @PostMapping("/register")
    @PreAuthorize("hasRole('API_Admin')")
    public UUID creerVehicule(@Valid @RequestBody VehiculeCreateRequest request) {
        return vehiculeService.creerVehicule(request);
    }

    @GetMapping("/snapshots")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<VehiculeSnapshotResponse> snapshots() {
        return vehiculeService.snapshots();
    }

    @GetMapping("/cle-ident")
    @PreAuthorize("hasAnyRole('API_Admin','API_Passerelle')")
    public List<VehiculeIdentResponse> identifiants() {
        return vehiculeService.getIdentifiants();
    }

    @GetMapping("/{id}/equipements")
    @PreAuthorize("hasAnyRole('API_Admin','API_Simulation','API_Passerelle','API_Operateur','API_Terrain')")
    public List<EquipementVehiculeResponse> equipements(@PathVariable("id") UUID idVehicule) {
        return vehiculeService.getEquipements(idVehicule);
    }

    @GetMapping("/{id}/caserne")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public Map<String, Object> caserne(@PathVariable("id") UUID idVehicule) {
        return vehiculeService.getCaserne(idVehicule);
    }

    @GetMapping("/en-route")
    @PreAuthorize("hasAnyRole('API_Simulation','API_Admin')")
    public List<VehiculeEnRouteResponse> vehiculesEnRoute() {
        return vehiculeService.getVehiculesEnRoute();
    }

    @PostMapping("/statut/en-intervention")
    @PreAuthorize("hasAnyRole('API_Simulation','API_Admin')")
    public void setEnIntervention(@Valid @RequestBody VehiculeStatusUpdateRequest request) {
        vehiculeService.setVehiculeEnIntervention(request);
    }
}
