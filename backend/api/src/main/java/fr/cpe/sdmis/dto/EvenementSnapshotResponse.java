package fr.cpe.sdmis.dto;

import java.util.UUID;

public record EvenementSnapshotResponse(
        UUID idEvenement,
        String description,
        double latitude,
        double longitude,
        String statutEvenement,
        String typeEvenement,
        String severite,
        String echelleSeverite,
        int nbVehiculesNecessaire
) {
}
