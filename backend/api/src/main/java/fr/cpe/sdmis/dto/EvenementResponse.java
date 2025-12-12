package fr.cpe.sdmis.dto;

import fr.cpe.sdmis.domain.model.EvenementStatus;

import java.time.Instant;
import java.util.UUID;

public record EvenementResponse(
        UUID id,
        String type,
        int severite,
        double lat,
        double lon,
        EvenementStatus status,
        Instant createdAt
) { }
