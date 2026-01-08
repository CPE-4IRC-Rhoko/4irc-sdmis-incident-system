package fr.cpe.sdmis.dto;

import java.util.UUID;

public record VehiculeEnRouteResponse(
        UUID idVehicule,
        String plaqueImmat,
        double vehiculeLat,
        double vehiculeLon,
        UUID idEvenement,
        double evenementLat,
        double evenementLon
) { }
