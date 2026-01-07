package fr.cpe.sdmis.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record VehiculeSelectionResponse(
        UUID idVehicule,
        double latitude,
        double longitude,
        BigDecimal contenanceTotale,
        double distanceKm,
        int rn,
        BigDecimal sumContenance,
        BigDecimal seuil,
        boolean seuilOk
) { }
