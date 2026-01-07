package org.example.moteurdecision.domain.status;

import java.util.UUID;

public class StatutEvenement extends AbstractIStatus {
    public StatutEvenement(UUID idStatut, String nomStatut) {
        super(idStatut, nomStatut);
    }
}
