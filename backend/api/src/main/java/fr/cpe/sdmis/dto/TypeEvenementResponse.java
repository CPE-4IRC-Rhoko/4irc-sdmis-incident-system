package fr.cpe.sdmis.dto;

import java.util.UUID;

public record TypeEvenementResponse(
        UUID id,
        String nom
) { }
