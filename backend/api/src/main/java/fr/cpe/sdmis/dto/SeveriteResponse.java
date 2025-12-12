package fr.cpe.sdmis.dto;

public record SeveriteResponse(
        Integer id,
        String nomSeverite,
        Integer valeurEchelle,
        Integer nbVehiculesNecessaire
) { }
