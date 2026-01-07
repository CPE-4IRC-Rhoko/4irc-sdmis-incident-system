package org.example.moteurdecision.domain.status;

import org.example.moteurdecision.domain.interfaces.IStatus;

import java.util.Objects;
import java.util.UUID;

/**
 * Base class that centralises shared behaviour between the different status entities.
 */
public abstract class AbstractIStatus implements IStatus {

    private final UUID idStatut;
    private String nomStatut;

    protected AbstractIStatus(UUID idStatut, String nomStatut) {
        this.idStatut = idStatut;
        this.nomStatut = Objects.requireNonNull(nomStatut, "nomStatut");
    }

    public UUID getIdStatut() {
        return  idStatut;
    }

    public String getNomStatut() {
        return  nomStatut;
    }

    public void setNomStatut(String nomStatut) {
        this.nomStatut = Objects.requireNonNull(nomStatut, "nomStatut");
    }
}
