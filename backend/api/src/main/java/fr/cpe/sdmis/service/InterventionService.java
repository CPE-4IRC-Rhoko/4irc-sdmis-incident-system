package fr.cpe.sdmis.service;

import fr.cpe.sdmis.dto.ValidationInterventionRequest;
import fr.cpe.sdmis.dto.ClotureInterventionRequest;
import fr.cpe.sdmis.dto.InterventionSnapshotResponse;
import fr.cpe.sdmis.repository.EvenementRepository;
import fr.cpe.sdmis.repository.InterventionRepository;
import fr.cpe.sdmis.repository.StatutEvenementRepository;
import fr.cpe.sdmis.repository.StatutInterventionRepository;
import org.springframework.stereotype.Service;
import fr.cpe.sdmis.service.SdmisSseService;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

@Service
public class InterventionService {

    private final InterventionRepository interventionRepository;
    private final StatutInterventionRepository statutInterventionRepository;
    private final StatutEvenementRepository statutEvenementRepository;
    private final EvenementRepository evenementRepository;
    private final SdmisSseService sseService;

    public InterventionService(InterventionRepository interventionRepository,
                               StatutInterventionRepository statutInterventionRepository,
                               StatutEvenementRepository statutEvenementRepository,
                               EvenementRepository evenementRepository,
                               SdmisSseService sseService) {
        this.interventionRepository = interventionRepository;
        this.statutInterventionRepository = statutInterventionRepository;
        this.statutEvenementRepository = statutEvenementRepository;
        this.evenementRepository = evenementRepository;
        this.sseService = sseService;
    }

    public void validerInterventions(ValidationInterventionRequest request) {
        UUID statutEnCours = statutInterventionRepository.findIdByNomOrThrow("En cours");
        UUID statutAnnule = statutInterventionRepository.findIdByNomOrThrow("Annulée");
        UUID statutEnAttente = statutInterventionRepository.findIdByNomOrThrow("En attente");

        Set<UUID> vehiculesCibles = new HashSet<>(request.vehicules());

        // Mettre en "En cours" les interventions existantes pour les véhicules fournis
        Instant now = Instant.now();
        vehiculesCibles.forEach(vehiculeId ->
                interventionRepository.updateInterventionStatutEnCours(request.id_evenement(), vehiculeId, statutEnCours, now));

        // Mettre les véhicules en "En route"
        vehiculesCibles.forEach(interventionRepository::updateVehiculeStatutEnRoute);

        // Annuler les interventions restées en attente
        interventionRepository.annulerInterventionsEnAttente(request.id_evenement(), statutEnAttente, statutAnnule);

        // Créer des interventions "En cours" manquantes pour les véhicules fournis
        vehiculesCibles.forEach(vehiculeId ->
                interventionRepository.insertInterventionEnCours(request.id_evenement(), vehiculeId, now, statutEnCours));

        // Mettre l'évènement en "En intervention"
        statutEvenementRepository.findIdByNom("En intervention")
                .ifPresent(id -> {
                    evenementRepository.updateStatut(request.id_evenement(), id);
                    broadcastEvenementSnapshot(request.id_evenement());
                });

        broadcastSnapshotsFor(request.id_evenement(), vehiculesCibles);
    }

    public void cloturerIntervention(ClotureInterventionRequest request) {
        // Clôturer l'intervention et rendre le véhicule disponible
        interventionRepository.cloturerIntervention(request.id_evenement(), request.id_vehicule());
        interventionRepository.updateVehiculeStatutDisponible(request.id_vehicule());

        // Si plus aucune intervention en cours pour l'évènement, passer l'évènement en "Résolu"
        if (!interventionRepository.hasInterventionEnCours(request.id_evenement())) {
            statutEvenementRepository.findIdByNom("Résolu")
                    .ifPresent(id -> {
                        evenementRepository.updateStatut(request.id_evenement(), id);
                        broadcastEvenementSnapshot(request.id_evenement());
                    });
        }

        broadcastSnapshotsFor(request.id_evenement(), java.util.Set.of(request.id_vehicule()));
    }

    private void broadcastSnapshotsFor(UUID idEvenement, Set<UUID> vehicules) {
        List<InterventionSnapshotResponse> updated = new ArrayList<>();
        for (UUID vehiculeId : vehicules) {
            interventionRepository.findSnapshotByIds(idEvenement, vehiculeId).ifPresent(updated::add);
        }
        if (!updated.isEmpty()) {
            sseService.broadcast("interventions", updated);
        }
    }

    private void broadcastEvenementSnapshot(UUID idEvenement) {
        evenementRepository.findSnapshotById(idEvenement)
                .ifPresent(snapshot -> sseService.broadcast("evenements", List.of(snapshot)));
    }
}
