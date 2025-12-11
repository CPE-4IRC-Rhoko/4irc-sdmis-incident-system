package org.example.moteurdecision.domain.status;

public class StatutVehicule extends AbstractIStatus {
    private final boolean estOperationnel;
    public StatutVehicule(int idStatut, String nomStatut, boolean estOperationnel) {
        super(idStatut, nomStatut);
        this.estOperationnel = estOperationnel;
    }

    public boolean isEstOperationnel() {
        return estOperationnel;
    }
}
