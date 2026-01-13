package fr.cpe.sdmis.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AgentVehiculeResponse(
        UUID idVehicule,
        String plaqueImmat,
        Double latitude,
        Double longitude,
        OffsetDateTime dernierePositionConnue,
        UUID idCaserne,
        UUID idStatut
) { }
