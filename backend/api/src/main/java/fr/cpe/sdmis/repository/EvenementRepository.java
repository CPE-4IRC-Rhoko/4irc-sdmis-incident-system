package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.domain.model.Evenement;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EvenementRepository {
    Evenement save(Evenement evenement);

    Optional<Evenement> findById(UUID id);

    List<Evenement> findAll();
}
