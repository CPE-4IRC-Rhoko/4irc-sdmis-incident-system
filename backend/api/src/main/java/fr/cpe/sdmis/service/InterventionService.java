package fr.cpe.sdmis.service;

import fr.cpe.sdmis.dto.ValidationInterventionRequest;
import fr.cpe.sdmis.dto.ClotureInterventionRequest;
import fr.cpe.sdmis.dto.InterventionSnapshotResponse;
import fr.cpe.sdmis.repository.EvenementRepository;
import fr.cpe.sdmis.repository.InterventionRepository;
import fr.cpe.sdmis.repository.StatutEvenementRepository;
import fr.cpe.sdmis.repository.StatutInterventionRepository;
import fr.cpe.sdmis.repository.VehiculeRepository;
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
    private final VehiculeRepository vehiculeRepository;
    private final SdmisSseService sseService;

    public InterventionService(InterventionRepository interventionRepository,
                               StatutInterventionRepository statutInterventionRepository,
                               StatutEvenementRepository statutEvenementRepository,
                               EvenementRepository evenementRepository,
                               VehiculeRepository vehiculeRepository,
                               SdmisSseService sseService) {
        this.interventionRepository = interventionRepository;
        this.statutInterventionRepository = statutInterventionRepository;
        this.statutEvenementRepository = statutEvenementRepository;
        this.evenementRepository = evenementRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.sseService = sseService;
    }

    public void validerInterventions(ValidationInterventionRequest request) {
        UUID statutEnCours = statutInterventionRepository.findIdByNomOrThrow("En cours");
        UUID statutAnnule = statutInterventionRepository.findIdByNomOrThrow("Annulée");
        UUID statutEnAttente = statutInterventionRepository.findIdByNomOrThrow("En attente");

        Set<UUID> vehiculesCibles = new HashSet<>(request.vehicules());

        System.out.println("[VALIDATION] Start id_evenement=" + request.id_evenement() + " vehicules=" + vehiculesCibles);

        // Mettre en "En cours" les interventions existantes pour les véhicules fournis
        Instant now = Instant.now();
        vehiculesCibles.forEach(vehiculeId ->
                interventionRepository.updateInterventionStatutEnCours(request.id_evenement(), vehiculeId, statutEnCours, now));
        System.out.println("[VALIDATION] Interventions existantes mises en 'En cours'");

        // Créer des interventions "En cours" manquantes pour les véhicules fournis
        vehiculesCibles.forEach(vehiculeId ->
                interventionRepository.insertInterventionEnCours(request.id_evenement(), vehiculeId, now, statutEnCours));
        System.out.println("[VALIDATION] Interventions manquantes insérées (En cours)");

        // Mettre les véhicules en "En route" uniquement après s'être assuré qu'une intervention existe
        vehiculesCibles.forEach(interventionRepository::updateVehiculeStatutEnRoute);
        broadcastVehicules(vehiculesCibles);
        System.out.println("[VALIDATION] Véhicules passés en 'En route' et broadcastés");

        // Annuler les interventions restées en attente
        List<UUID> vehiculesEnAttente = interventionRepository.findVehiculesByInterventionStatut(request.id_evenement(), "En attente");
        interventionRepository.annulerInterventionsEnAttente(request.id_evenement(), statutEnAttente, statutAnnule);
        System.out.println("[VALIDATION] Interventions en attente annulées. Véhicules concernés=" + vehiculesEnAttente);
        
        // Rendre disponibles ces véhicules si aucune autre intervention ne les laisse en "En proposition"
        for (UUID vehiculeId : vehiculesEnAttente) {
            if (!interventionRepository.vehiculeHasInterventionWithStatut(vehiculeId, "En proposition")) {
                interventionRepository.updateVehiculeStatutDisponible(vehiculeId);
                broadcastVehicules(Set.of(vehiculeId));
                System.out.println("[VALIDATION] Véhicule " + vehiculeId + " repassé 'Disponible' (pas de proposition active)");
            }
        }

        // Mettre l'évènement en "En intervention"
        statutEvenementRepository.findIdByNom("En intervention")
                .ifPresent(id -> {
                    evenementRepository.updateStatut(request.id_evenement(), id);
                    broadcastEvenementSnapshot(request.id_evenement());
                    System.out.println("[VALIDATION] Évènement " + request.id_evenement() + " passé en 'En intervention' et broadcasté");
                });

        broadcastSnapshotsFor(request.id_evenement(), vehiculesCibles);
        System.out.println("[VALIDATION] Broadcast interventions pour vehicules=" + vehiculesCibles);
        System.out.println("[VALIDATION] End id_evenement=" + request.id_evenement());
    }

    public void cloturerIntervention(ClotureInterventionRequest request) {
        // Clôturer l'intervention et rendre le véhicule disponible
        interventionRepository.cloturerIntervention(request.id_evenement(), request.id_vehicule());
        interventionRepository.updateVehiculeStatutDisponible(request.id_vehicule());
        broadcastVehicules(java.util.Set.of(request.id_vehicule()));
        System.out.println("[CLOTURE] Intervention cloturee pour evt=" + request.id_evenement() + " vehicule=" + request.id_vehicule());

        // Si plus aucune intervention en cours pour l'évènement, passer l'évènement en "Résolu"
        if (!interventionRepository.hasInterventionEnCours(request.id_evenement())) {
            statutEvenementRepository.findIdByNom("Résolu")
                    .ifPresent(id -> {
                        evenementRepository.updateStatut(request.id_evenement(), id);
                        broadcastEvenementSnapshot(request.id_evenement());
                        System.out.println("[CLOTURE] Évènement " + request.id_evenement() + " passé en 'Résolu' et broadcasté");
                    });
        }

        broadcastSnapshotsFor(request.id_evenement(), java.util.Set.of(request.id_vehicule()));
        System.out.println("[CLOTURE] Broadcast intervention/vehicule pour evt=" + request.id_evenement() + " vehicule=" + request.id_vehicule());
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

    private void broadcastVehicules(Set<UUID> vehicules) {
        List<fr.cpe.sdmis.dto.VehiculeSnapshotResponse> updated = new ArrayList<>();
        for (UUID vehiculeId : vehicules) {
            vehiculeRepository.findSnapshotById(vehiculeId).ifPresent(updated::add);
        }
        if (!updated.isEmpty()) {
            sseService.broadcast("vehicules", updated);
        }
    }
}
