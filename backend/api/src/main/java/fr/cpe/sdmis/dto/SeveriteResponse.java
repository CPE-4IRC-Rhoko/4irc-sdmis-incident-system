package fr.cpe.sdmis.dto;

import java.util.UUID;

public record SeveriteResponse(
        UUID id,
        String nomSeverite,
        String valeurEchelle,
        Integer nbVehiculesNecessaire
) { }
