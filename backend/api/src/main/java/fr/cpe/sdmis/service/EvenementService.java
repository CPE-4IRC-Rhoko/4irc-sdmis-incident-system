package fr.cpe.sdmis.service;

import fr.cpe.sdmis.domain.model.Evenement;
import fr.cpe.sdmis.dto.EvenementCreateRequest;
import fr.cpe.sdmis.dto.EvenementResponse;
import fr.cpe.sdmis.mapper.EvenementMapper;
import fr.cpe.sdmis.repository.EvenementRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EvenementService {
    private final EvenementRepository evenementRepository;
    private final EvenementMapper mapper;

    public EvenementService(EvenementRepository evenementRepository, EvenementMapper mapper) {
        this.evenementRepository = evenementRepository;
        this.mapper = mapper;
    }

    public EvenementResponse createEvenement(EvenementCreateRequest request) {
        Evenement evenement = mapper.toDomain(request);
        return mapper.toResponse(evenementRepository.save(evenement));
    }

    public List<EvenementResponse> listEvenements() {
        return evenementRepository.findAll()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }
}
