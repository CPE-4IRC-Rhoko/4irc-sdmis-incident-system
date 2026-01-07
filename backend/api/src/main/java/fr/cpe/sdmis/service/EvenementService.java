package fr.cpe.sdmis.service;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import fr.cpe.sdmis.mapper.EvenementMapper;
import fr.cpe.sdmis.messaging.EventMessage;
import fr.cpe.sdmis.repository.EvenementRepository;
import fr.cpe.sdmis.repository.SeveriteRepository;
import fr.cpe.sdmis.repository.StatutEvenementRepository;
import fr.cpe.sdmis.repository.TypeEvenementRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class EvenementService {
    private final EvenementRepository evenementRepository;
    private final EvenementMapper mapper;
    private final DecisionMessagingService messagingService;
    private final TypeEvenementRepository typeEvenementRepository;
    private final StatutEvenementRepository statutEvenementRepository;
    private final SeveriteRepository severiteRepository;

    public EvenementService(EvenementRepository evenementRepository,
                            EvenementMapper mapper,
                            DecisionMessagingService messagingService,
                            TypeEvenementRepository typeEvenementRepository,
                            StatutEvenementRepository statutEvenementRepository,
                            SeveriteRepository severiteRepository) {
        this.evenementRepository = evenementRepository;
        this.mapper = mapper;
        this.messagingService = messagingService;
        this.typeEvenementRepository = typeEvenementRepository;
        this.statutEvenementRepository = statutEvenementRepository;
        this.severiteRepository = severiteRepository;
    }

    public EvenementResponse createEvenement(EvenementCreateRequest request) {
        UUID idType = typeEvenementRepository.findIdByNom(request.nomTypeEvenement())
                .orElseThrow(() -> new IllegalArgumentException("Type d'événement introuvable: " + request.nomTypeEvenement()));
        String statutNom = request.nomStatut() != null && !request.nomStatut().isBlank()
                ? request.nomStatut()
                : "Déclaré";
        UUID idStatut = statutEvenementRepository.findIdByNom(statutNom)
                .orElseThrow(() -> new IllegalArgumentException("Statut d'événement introuvable: " + statutNom));
        UUID idSeverite = severiteRepository.findIdByNom(request.nomSeverite())
                .orElseThrow(() -> new IllegalArgumentException("Sévérité introuvable: " + request.nomSeverite()));

        Evenement evenement = new Evenement(
                null,
                request.description(),
                request.latitude(),
                request.longitude(),
                idType,
                idStatut,
                idSeverite,
                null, null, null, null, null
        );
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
