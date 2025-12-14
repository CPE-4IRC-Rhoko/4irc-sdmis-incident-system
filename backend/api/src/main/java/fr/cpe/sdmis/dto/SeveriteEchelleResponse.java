package fr.cpe.sdmis.dto;

import java.util.UUID;

public record SeveriteEchelleResponse(
        UUID id,
        String valeurEchelle
) { }
