package fr.cpe.sdmis.mapper;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import org.springframework.stereotype.Component;

@Component
public class EvenementMapper {
    public EvenementResponse toResponse(Evenement evenement) {
        return new EvenementResponse(
            evenement.id(),
            evenement.description(),
            evenement.latitude(),
            evenement.longitude(),
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
