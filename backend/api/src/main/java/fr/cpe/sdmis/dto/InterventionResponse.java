package fr.cpe.sdmis.dto;

import java.time.Instant;
import java.util.UUID;

public record InterventionResponse(
        UUID idEvenement,
        UUID idVehicule,
        UUID idStatutIntervention,
        String nomStatutIntervention,
        Instant dateDebut,
        Instant dateFin
) { }
