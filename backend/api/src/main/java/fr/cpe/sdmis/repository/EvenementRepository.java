package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.domain.model.Evenement;

import java.util.List;
import java.util.Optional;

public interface EvenementRepository {
    Evenement save(Evenement evenement);

    Optional<Evenement> findById(Integer id);

    List<Evenement> findAll();
}
