package fr.cpe.sdmis.repository;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.dto.EvenementSnapshotResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
@Profile("inmemory")
public class InMemoryEvenementRepository implements IEvenementRepository {
    private final Map<UUID, Evenement> store = new ConcurrentHashMap<>();

    @Override
    public Evenement save(Evenement evenement) {
        UUID key = evenement.id() != null ? evenement.id() : UUID.randomUUID();
        Evenement persisted = new Evenement(
                key,
                evenement.description(),
                evenement.latitude(),
                evenement.longitude(),
                evenement.idTypeEvenement(),
                evenement.idStatut(),
                evenement.idSeverite(),
                evenement.nomTypeEvenement(),
                evenement.nomStatut(),
                evenement.nomSeverite(),
                evenement.valeurEchelle(),
                evenement.nbVehiculesNecessaire()
        );
        store.put(key, persisted);
        return persisted;
    }

    @Override
    public Optional<Evenement> findById(UUID id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<Evenement> findAll() {
        return new ArrayList<>(store.values());
    }

    @Override
    public List<EvenementSnapshotResponse> findSnapshots() {
        return store.values().stream()
                .map(this::toSnapshot)
                .toList();
    }

    @Override
    public Optional<EvenementSnapshotResponse> findSnapshotById(UUID idEvenement) {
        return Optional.ofNullable(store.get(idEvenement)).map(this::toSnapshot);
    }

    private EvenementSnapshotResponse toSnapshot(Evenement evenement) {
        return new EvenementSnapshotResponse(
                evenement.id(),
                evenement.description(),
                evenement.latitude(),
                evenement.longitude(),
                evenement.nomStatut(),
                evenement.nomTypeEvenement(),
                evenement.nomSeverite(),
                evenement.valeurEchelle(),
                evenement.nbVehiculesNecessaire()
        );
    }
}
