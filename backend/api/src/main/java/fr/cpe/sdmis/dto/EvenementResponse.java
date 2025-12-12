package fr.cpe.sdmis.dto;

import java.time.Instant;
import java.util.UUID;

public record EvenementResponse(
        Integer id,
        String description,
        double latitude,
        double longitude,
        Instant dateEvenement,
        Integer idTypeEvenement,
        Integer idStatut,
        Integer idSeverite,
        String nomTypeEvenement,
        String nomStatut,
        String nomSeverite,
        Integer valeurEchelle,
        Integer nbVehiculesNecessaire
) { }
