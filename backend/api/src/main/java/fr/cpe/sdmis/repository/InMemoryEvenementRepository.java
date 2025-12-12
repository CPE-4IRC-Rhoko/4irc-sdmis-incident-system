package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.domain.model.Evenement;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryEvenementRepository implements EvenementRepository {
    private final Map<UUID, Evenement> store = new ConcurrentHashMap<>();

    @Override
    public Evenement save(Evenement evenement) {
        store.put(evenement.id(), evenement);
        return evenement;
    }

    @Override
    public Optional<Evenement> findById(UUID id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<Evenement> findAll() {
        return new ArrayList<>(store.values());
    }
}
