package fr.cpe.sdmis.mapper;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class EvenementMapper {
    public Evenement toDomain(EvenementCreateRequest req) {
        return new Evenement(
            null,
            req.description(),
            req.latitude(),
            req.longitude(),
            Instant.now(),
            req.idTypeEvenement(),
            req.idStatut(),
            req.idSeverite(),
            null,
            null,
            null,
            null,
            null
        );
    }

    public EvenementResponse toResponse(Evenement evenement) {
        return new EvenementResponse(
            evenement.id(),
            evenement.description(),
            evenement.latitude(),
            evenement.longitude(),
            evenement.dateEvenement(),
            evenement.idTypeEvenement(),
            evenement.idStatut(),
            evenement.idSeverite(),
            evenement.nomTypeEvenement(),
            evenement.nomStatut(),
            evenement.nomSeverite(),
            evenement.valeurEchelle(),
            evenement.nbVehiculesNecessaire()
        );
    }
}
