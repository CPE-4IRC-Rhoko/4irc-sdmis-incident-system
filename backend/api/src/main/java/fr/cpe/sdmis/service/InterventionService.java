package fr.cpe.sdmis.service;

import fr.cpe.sdmis.dto.ValidationInterventionRequest;
import fr.cpe.sdmis.repository.EvenementRepository;
import fr.cpe.sdmis.repository.InterventionRepository;
import fr.cpe.sdmis.repository.StatutEvenementRepository;
import fr.cpe.sdmis.repository.StatutInterventionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
public class InterventionService {

    private final InterventionRepository interventionRepository;
    private final StatutInterventionRepository statutInterventionRepository;
    private final StatutEvenementRepository statutEvenementRepository;
    private final EvenementRepository evenementRepository;

    public InterventionService(InterventionRepository interventionRepository,
                               StatutInterventionRepository statutInterventionRepository,
                               StatutEvenementRepository statutEvenementRepository,
                               EvenementRepository evenementRepository) {
        this.interventionRepository = interventionRepository;
        this.statutInterventionRepository = statutInterventionRepository;
        this.statutEvenementRepository = statutEvenementRepository;
        this.evenementRepository = evenementRepository;
    }

    public void validerInterventions(ValidationInterventionRequest request) {
        UUID statutEnCours = statutInterventionRepository.findIdByNomOrThrow("En cours");
        UUID statutAnnule = statutInterventionRepository.findIdByNomOrThrow("Annulée");
        UUID statutEnAttente = statutInterventionRepository.findIdByNomOrThrow("En attente");

        Set<UUID> vehiculesCibles = new HashSet<>(request.vehicules());

        // Mettre en "En cours" les interventions existantes pour les véhicules fournis
        vehiculesCibles.forEach(vehiculeId ->
                interventionRepository.updateInterventionStatut(request.id_evenement(), vehiculeId, statutEnCours));

        // Mettre les véhicules en "En route"
        vehiculesCibles.forEach(interventionRepository::updateVehiculeStatutEnRoute);

        // Annuler les interventions restées en attente
        interventionRepository.annulerInterventionsEnAttente(request.id_evenement(), statutEnAttente, statutAnnule);

        // Créer des interventions "En cours" manquantes pour les véhicules fournis
        Instant now = Instant.now();
        vehiculesCibles.forEach(vehiculeId ->
                interventionRepository.insertInterventionEnCours(request.id_evenement(), vehiculeId, now, statutEnCours));

        // Mettre l'évènement en "En intervention"
        statutEvenementRepository.findIdByNom("En intervention")
                .ifPresent(id -> evenementRepository.updateStatut(request.id_evenement(), id));
    }
}
