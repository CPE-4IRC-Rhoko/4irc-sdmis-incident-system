package fr.cpe.sdmis.dto;

import java.time.Instant;
import java.util.UUID;

public record InterventionSnapshotResponse(
        UUID idEvenement,
        Instant dateDebutIntervention,
        Instant dateFinIntervention,
        String statusIntervention,
        UUID idVehicule,
        String plaqueImmat
) { }
