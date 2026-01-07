package fr.cpe.sdmis.dto;

import java.util.UUID;

public record VehiculeIdentResponse(
        UUID idVehicule,
        String plaqueImmat,
        String cleIdent
) { }
