package fr.cpe.sdmis.service;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import fr.cpe.sdmis.dto.EvenementSnapshotResponse;
import fr.cpe.sdmis.dto.EvenementUpdateRequest;
import fr.cpe.sdmis.mapper.EvenementMapper;
import fr.cpe.sdmis.messaging.EventMessage;
import fr.cpe.sdmis.repository.IEvenementRepository;
import fr.cpe.sdmis.repository.SeveriteRepository;
import fr.cpe.sdmis.repository.StatutEvenementRepository;
import fr.cpe.sdmis.repository.StatutInterventionRepository;
import fr.cpe.sdmis.repository.TypeEvenementRepository;
import fr.cpe.sdmis.repository.InterventionRepository;
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
    private final StatutInterventionRepository statutInterventionRepository;
    private final SeveriteRepository severiteRepository;
    private final InterventionRepository interventionRepository;
    private final SdmisSseService sseService;

    public EvenementService(IEvenementRepository evenementRepository,
                            EvenementMapper mapper,
                            DecisionMessagingService messagingService,
                            TypeEvenementRepository typeEvenementRepository,
                            StatutEvenementRepository statutEvenementRepository,
                            StatutInterventionRepository statutInterventionRepository,
                            SeveriteRepository severiteRepository,
                            InterventionRepository interventionRepository,
                            SdmisSseService sseService) {
        this.evenementRepository = evenementRepository;
        this.mapper = mapper;
        this.messagingService = messagingService;
        this.typeEvenementRepository = typeEvenementRepository;
        this.statutEvenementRepository = statutEvenementRepository;
        this.statutInterventionRepository = statutInterventionRepository;
        this.severiteRepository = severiteRepository;
        this.interventionRepository = interventionRepository;
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

    public EvenementResponse updateEvenement(UUID idEvenement, EvenementUpdateRequest request) {
        Evenement existing = evenementRepository.findById(idEvenement)
                .orElseThrow(() -> new IllegalArgumentException("Evènement introuvable: " + idEvenement));

        String statutCourant = existing.nomStatut();
        if (statutCourant != null
                && !statutCourant.equalsIgnoreCase("Déclaré")
                && !statutCourant.equalsIgnoreCase("En intervention")) {
            throw new IllegalStateException("Modification impossible: le statut de l'évènement doit être 'Déclaré' ou 'En intervention'");
        }

        UUID idType = typeEvenementRepository.findIdByNom(request.nomTypeEvenement())
                .orElseThrow(() -> new IllegalArgumentException("Type d'événement introuvable: " + request.nomTypeEvenement()));
        UUID idSeverite = severiteRepository.findIdByNom(request.nomSeverite())
                .orElseThrow(() -> new IllegalArgumentException("Sévérité introuvable: " + request.nomSeverite()));

        evenementRepository.update(idEvenement, request.description(), request.latitude(), request.longitude(), idType, idSeverite);

        // Annuler les interventions "En attente" associées
        UUID statutEnAttente = statutInterventionRepository.findIdByNomOrThrow("En attente");
        UUID statutInterventionAnnulee = statutInterventionRepository.findIdByNomOrThrow("Annulée");
        interventionRepository.annulerInterventionsEnAttente(idEvenement, statutEnAttente, statutInterventionAnnulee);
        // Diffuser les interventions impactées
        List<fr.cpe.sdmis.dto.InterventionSnapshotResponse> impacted = interventionRepository.findSnapshotsByEvenement(idEvenement);
        if (!impacted.isEmpty()) {
            sseService.broadcast("interventions", impacted);
        }

        Evenement updated = evenementRepository.findById(idEvenement)
                .orElseThrow(() -> new IllegalStateException("Evènement mis à jour introuvable: " + idEvenement));

        publierDansRabbit(updated);
        broadcastEvenement(idEvenement);
        return mapper.toResponse(updated);
    }
}
