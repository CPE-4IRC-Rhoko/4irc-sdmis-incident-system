package fr.cpe.sdmis.service;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import fr.cpe.sdmis.dto.VehiculeSnapshotResponse;
import fr.cpe.sdmis.dto.VehiculeUpdateRequest;
import fr.cpe.sdmis.dto.VehiculeIdentResponse;
import fr.cpe.sdmis.dto.VehiculeEnRouteResponse;
import fr.cpe.sdmis.dto.VehiculeStatusUpdateRequest;
import fr.cpe.sdmis.dto.EquipementVehiculeResponse;
import fr.cpe.sdmis.dto.VehiculeCreateRequest;
import fr.cpe.sdmis.repository.CaserneRepository;
import fr.cpe.sdmis.repository.VehiculeRepository;
import org.springframework.stereotype.Service;
import fr.cpe.sdmis.service.SdmisSseService;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class VehiculeService {

    private final VehiculeRepository vehiculeRepository;
    private final CaserneRepository caserneRepository;
    private final SdmisSseService sseService;

    public VehiculeService(VehiculeRepository vehiculeRepository, CaserneRepository caserneRepository, SdmisSseService sseService) {
        this.vehiculeRepository = vehiculeRepository;
        this.caserneRepository = caserneRepository;
        this.sseService = sseService;
    }

    public List<VehiculeOperationnelResponse> findOperationnels() {
        return vehiculeRepository.findOperationnels();
    }

    public void updateVehicule(VehiculeUpdateRequest request) {
        vehiculeRepository.updateVehicule(request);
        vehiculeRepository.findSnapshotByPlaque(request.plaqueImmat())
                .ifPresent(snapshot -> sseService.broadcast("vehicules", List.of(snapshot)));
    }

    public List<VehiculeSnapshotResponse> snapshots() {
        return vehiculeRepository.findSnapshots();
    }

    public void broadcastAll() {
        sseService.broadcast("vehicules", snapshots());
    }

    public SseEmitter subscribeSnapshots() {
        return sseService.subscribe();
    }

    public List<VehiculeIdentResponse> getIdentifiants() {
        return vehiculeRepository.findCleIdent();
    }

    public List<VehiculeEnRouteResponse> getVehiculesEnRoute() {
        return vehiculeRepository.findVehiculesEnRoute();
    }

    public void setVehiculeEnIntervention(VehiculeStatusUpdateRequest request) {
        vehiculeRepository.updateVehiculeStatutEnIntervention(request.idVehicule());
        vehiculeRepository.findSnapshotById(request.idVehicule())
                .ifPresent(snapshot -> sseService.broadcast("vehicules", List.of(snapshot)));
    }

    public List<EquipementVehiculeResponse> getEquipements(UUID idVehicule) {
        return vehiculeRepository.findEquipementsByVehiculeId(idVehicule);
    }

    public Map<String, Object> getCaserne(UUID idVehicule) {
        return caserneRepository.findByVehiculeId(idVehicule)
                .orElseThrow(() -> new IllegalArgumentException("Caserne introuvable pour le véhicule " + idVehicule));
    }

    public UUID creerVehicule(VehiculeCreateRequest request) {
        UUID idVehicule = vehiculeRepository.createVehicule(request);
        vehiculeRepository.findSnapshotById(idVehicule)
                .ifPresent(snapshot -> sseService.broadcast("vehicules", List.of(snapshot)));
        return idVehicule;
    }
}
