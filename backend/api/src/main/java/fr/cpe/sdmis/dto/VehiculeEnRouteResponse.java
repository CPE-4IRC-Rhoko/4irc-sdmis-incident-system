package fr.cpe.sdmis.dto;

import java.util.UUID;
import java.util.List;
import fr.cpe.sdmis.dto.EquipementContenanceResponse;

public record VehiculeEnRouteResponse(
        UUID idVehicule,
        String plaqueImmat,
        double vehiculeLat,
        double vehiculeLon,
        UUID idEvenement,
        double evenementLat,
        double evenementLon,
        List<EquipementContenanceResponse> equipements
) { }
