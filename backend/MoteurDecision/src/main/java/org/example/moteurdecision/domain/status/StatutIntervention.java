package org.example.moteurdecision.domain.status;

import java.util.UUID;

public class StatutIntervention extends AbstractIStatus {
    public StatutIntervention(UUID idStatut, String nomStatut) {
        super(idStatut, nomStatut);
    }
}
