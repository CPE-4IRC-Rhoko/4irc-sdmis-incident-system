package fr.cpe.sdmis.domain.model;

import java.time.Instant;
import java.util.UUID;

public record Evenement(
        UUID id,
        String type,
        int severite,
        double lat,
        double lon,
        EvenementStatus status,
        Instant createdAt
) { }
