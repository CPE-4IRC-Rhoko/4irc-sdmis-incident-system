package fr.cpe.sdmis.service;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import fr.cpe.sdmis.dto.VehiculeSnapshotResponse;
import fr.cpe.sdmis.dto.VehiculeUpdateRequest;
import fr.cpe.sdmis.dto.VehiculeIdentResponse;
import fr.cpe.sdmis.dto.VehiculeEnRouteResponse;
import fr.cpe.sdmis.dto.VehiculeStatusUpdateRequest;
import fr.cpe.sdmis.repository.VehiculeRepository;
import org.springframework.stereotype.Service;
import fr.cpe.sdmis.service.SdmisSseService;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@Service
public class VehiculeService {

    private final VehiculeRepository vehiculeRepository;
    private final SdmisSseService sseService;

    public VehiculeService(VehiculeRepository vehiculeRepository, SdmisSseService sseService) {
        this.vehiculeRepository = vehiculeRepository;
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
}
