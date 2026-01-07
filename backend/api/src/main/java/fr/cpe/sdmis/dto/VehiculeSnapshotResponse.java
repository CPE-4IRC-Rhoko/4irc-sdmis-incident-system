package fr.cpe.sdmis.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record VehiculeSnapshotResponse(
        UUID id,
        double latitude,
        double longitude,
        OffsetDateTime dernierePositionConnue,
        String statut,
        String caserne,
        List<EquipementContenanceResponse> equipements
) { }
