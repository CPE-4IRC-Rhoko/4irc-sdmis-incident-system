package fr.cpe.sdmis.service;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import fr.cpe.sdmis.dto.VehiculeSnapshotResponse;
import fr.cpe.sdmis.dto.VehiculeUpdateRequest;
import fr.cpe.sdmis.dto.VehiculeIdentResponse;
import fr.cpe.sdmis.dto.VehiculeEnRouteResponse;
import fr.cpe.sdmis.repository.VehiculeRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@Service
public class VehiculeService {

    private final VehiculeRepository vehiculeRepository;
    private final VehiculeSseService vehiculeSseService;

    public VehiculeService(VehiculeRepository vehiculeRepository, VehiculeSseService vehiculeSseService) {
        this.vehiculeRepository = vehiculeRepository;
        this.vehiculeSseService = vehiculeSseService;
    }

    public List<VehiculeOperationnelResponse> findOperationnels() {
        return vehiculeRepository.findOperationnels();
    }

    public void updateVehicule(VehiculeUpdateRequest request) {
        vehiculeRepository.updateVehicule(request);
        vehiculeRepository.findSnapshotByPlaque(request.plaqueImmat()).ifPresent(vehiculeSseService::broadcastSnapshot);
    }

    public List<VehiculeSnapshotResponse> snapshots() {
        return vehiculeRepository.findSnapshots();
    }

    public void broadcastAll() {
        vehiculeSseService.broadcastSnapshots(snapshots());
    }

    public SseEmitter subscribeSnapshots(List<VehiculeSnapshotResponse> initialSnapshots) {
        return vehiculeSseService.subscribe(initialSnapshots);
    }

    public List<VehiculeIdentResponse> getIdentifiants() {
        return vehiculeRepository.findCleIdent();
    }

    public List<VehiculeEnRouteResponse> getVehiculesEnRoute() {
        return vehiculeRepository.findVehiculesEnRoute();
    }
}
