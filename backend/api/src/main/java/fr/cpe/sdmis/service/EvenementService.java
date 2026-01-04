package fr.cpe.sdmis.service;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import fr.cpe.sdmis.mapper.EvenementMapper;
import fr.cpe.sdmis.messaging.EventMessage;
import fr.cpe.sdmis.repository.EvenementRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EvenementService {
    private final EvenementRepository evenementRepository;
    private final EvenementMapper mapper;
    private final DecisionMessagingService messagingService;

    public EvenementService(EvenementRepository evenementRepository,
                            EvenementMapper mapper,
                            DecisionMessagingService messagingService) {
        this.evenementRepository = evenementRepository;
        this.mapper = mapper;
        this.messagingService = messagingService;
    }

    public EvenementResponse createEvenement(EvenementCreateRequest request) {
        Evenement evenement = mapper.toDomain(request);
        Evenement saved = evenementRepository.save(evenement);
        publierDansRabbit(saved);
        return mapper.toResponse(saved);
    }

    public List<EvenementResponse> listEvenements() {
        return evenementRepository.findAll()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    private void publierDansRabbit(Evenement evenement) {
        EventMessage message = new EventMessage();
        message.setIdEvenement(evenement.id());
        message.setDescription(evenement.description());
        message.setLatitude(evenement.latitude());
        message.setLongitude(evenement.longitude());
        message.setIdTypeEvenement(evenement.idTypeEvenement());
        message.setIdStatut(evenement.idStatut());
        message.setIdSeverite(evenement.idSeverite());
        messagingService.publierEvenement(message);
    }
}
