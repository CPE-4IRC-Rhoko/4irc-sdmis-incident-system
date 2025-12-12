package fr.cpe.sdmis.mapper;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.domain.model.EvenementStatus;
import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
public class EvenementMapper {
    public Evenement toDomain(EvenementCreateRequest req) {
        return new Evenement(
            UUID.randomUUID(),
            req.type(),
            req.severite(),
            req.lat(),
            req.lon(),
            EvenementStatus.N,
            Instant.now()
        );
    }

    public EvenementResponse toResponse(Evenement evenement) {
        return new EvenementResponse(
            evenement.id(),
            evenement.type(),
            evenement.severite(),
            evenement.lat(),
            evenement.lon(),
            evenement.status(),
            evenement.createdAt()
        );
    }
}
