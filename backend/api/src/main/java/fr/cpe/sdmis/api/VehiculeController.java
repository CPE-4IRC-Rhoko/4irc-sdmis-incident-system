package fr.cpe.sdmis.api;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import fr.cpe.sdmis.dto.VehiculeUpdateRequest;
import fr.cpe.sdmis.dto.VehiculeIdentResponse;
import fr.cpe.sdmis.dto.VehiculeEnRouteResponse;
import fr.cpe.sdmis.dto.VehiculeStatusUpdateRequest;
import fr.cpe.sdmis.dto.VehiculeSnapshotResponse;
import fr.cpe.sdmis.service.VehiculeService;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/vehicules")
public class VehiculeController {

    private final VehiculeService vehiculeService;

    public VehiculeController(VehiculeService vehiculeService) {
        this.vehiculeService = vehiculeService;
    }

    @GetMapping("/operationnels")
    public List<VehiculeOperationnelResponse> operationnels() {
        return vehiculeService.findOperationnels();
    }

    @PostMapping("/mise-a-jour")
    public void miseAJour(@Valid @RequestBody VehiculeUpdateRequest request) {
        vehiculeService.updateVehicule(request);
    }

    @GetMapping("/snapshots")
    public List<VehiculeSnapshotResponse> snapshots() {
        return vehiculeService.snapshots();
    }

    @GetMapping("/cle-ident")
    public List<VehiculeIdentResponse> identifiants() {
        return vehiculeService.getIdentifiants();
    }

    @GetMapping("/en-route")
    public List<VehiculeEnRouteResponse> vehiculesEnRoute() {
        return vehiculeService.getVehiculesEnRoute();
    }

    @PostMapping("/statut/en-intervention")
    public void setEnIntervention(@Valid @RequestBody VehiculeStatusUpdateRequest request) {
        vehiculeService.setVehiculeEnIntervention(request);
    }
}
