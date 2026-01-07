package fr.cpe.sdmis.domain.model;

import java.util.UUID;

public record Evenement(
        UUID id,
        String description,
        double latitude,
        double longitude,
        UUID idTypeEvenement,
        UUID idStatut,
        UUID idSeverite,
        String nomTypeEvenement,
        String nomStatut,
        String nomSeverite,
        String valeurEchelle,
        Integer nbVehiculesNecessaire
) { }
