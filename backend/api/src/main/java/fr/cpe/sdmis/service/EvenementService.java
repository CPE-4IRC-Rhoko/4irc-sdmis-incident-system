package fr.cpe.sdmis.service;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import fr.cpe.sdmis.dto.EvenementSnapshotResponse;
import fr.cpe.sdmis.mapper.EvenementMapper;
import fr.cpe.sdmis.messaging.EventMessage;
import fr.cpe.sdmis.repository.IEvenementRepository;
import fr.cpe.sdmis.repository.SeveriteRepository;
import fr.cpe.sdmis.repository.StatutEvenementRepository;
import fr.cpe.sdmis.repository.TypeEvenementRepository;
import org.springframework.stereotype.Service;
import fr.cpe.sdmis.service.SdmisSseService;

import java.util.List;
import java.util.UUID;

@Service
public class EvenementService {
    private final IEvenementRepository evenementRepository;
    private final EvenementMapper mapper;
    private final DecisionMessagingService messagingService;
    private final TypeEvenementRepository typeEvenementRepository;
    private final StatutEvenementRepository statutEvenementRepository;
    private final SeveriteRepository severiteRepository;
    private final SdmisSseService sseService;

    public EvenementService(IEvenementRepository evenementRepository,
                            EvenementMapper mapper,
                            DecisionMessagingService messagingService,
                            TypeEvenementRepository typeEvenementRepository,
                            StatutEvenementRepository statutEvenementRepository,
                            SeveriteRepository severiteRepository,
                            SdmisSseService sseService) {
        this.evenementRepository = evenementRepository;
        this.mapper = mapper;
        this.messagingService = messagingService;
        this.typeEvenementRepository = typeEvenementRepository;
        this.statutEvenementRepository = statutEvenementRepository;
        this.severiteRepository = severiteRepository;
        this.sseService = sseService;
    }

    public EvenementResponse createEvenement(EvenementCreateRequest request) {
        UUID idType = typeEvenementRepository.findIdByNom(request.nomTypeEvenement())
                .orElseThrow(() -> new IllegalArgumentException("Type d'événement introuvable: " + request.nomTypeEvenement()));
        UUID idStatut = statutEvenementRepository.findIdByNom("Déclaré")
                .orElseThrow(() -> new IllegalArgumentException("Statut d'événement introuvable: Déclaré"));
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
        broadcastEvenement(saved.id());
        return mapper.toResponse(saved);
    }

    public List<EvenementResponse> listEvenements() {
        return evenementRepository.findAll()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    public List<EvenementSnapshotResponse> listSnapshots() {
        return evenementRepository.findSnapshots();
    }

    public void broadcastEvenement(UUID idEvenement) {
        evenementRepository.findSnapshotById(idEvenement)
                .ifPresent(snapshot -> sseService.broadcast("evenements", List.of(snapshot)));
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
