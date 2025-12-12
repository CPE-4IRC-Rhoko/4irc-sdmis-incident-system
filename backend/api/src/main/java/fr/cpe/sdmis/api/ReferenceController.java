package fr.cpe.sdmis.api;

import fr.cpe.sdmis.dto.SeveriteResponse;
import fr.cpe.sdmis.dto.SeveriteEchelleResponse;
import fr.cpe.sdmis.dto.TypeEvenementResponse;
import fr.cpe.sdmis.repository.SeveriteRepository;
import fr.cpe.sdmis.repository.TypeEvenementRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/references")
public class ReferenceController {
    private final SeveriteRepository severiteRepository;
    private final TypeEvenementRepository typeEvenementRepository;

    public ReferenceController(SeveriteRepository severiteRepository, TypeEvenementRepository typeEvenementRepository) {
        this.severiteRepository = severiteRepository;
        this.typeEvenementRepository = typeEvenementRepository;
    }

    @GetMapping("/severites")
    public List<SeveriteResponse> severites() {
        return severiteRepository.findAll();
    }

    @GetMapping("/severites/echelles")
    public List<SeveriteEchelleResponse> severiteEchelles() {
        return severiteRepository.findEchelles();
    }

    @GetMapping("/types-evenement")
    public List<TypeEvenementResponse> typesEvenement() {
        return typeEvenementRepository.findAll();
    }
}
