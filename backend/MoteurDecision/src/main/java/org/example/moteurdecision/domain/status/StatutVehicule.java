package org.example.moteurdecision.domain.status;

import java.util.UUID;

public class StatutVehicule extends AbstractIStatus {
    private final boolean estOperationnel;
    public StatutVehicule(UUID idStatut, String nomStatut, boolean estOperationnel) {
        super(idStatut, nomStatut);
        this.estOperationnel = estOperationnel;
    }

    public boolean isEstOperationnel() {
        return estOperationnel;
    }
}
