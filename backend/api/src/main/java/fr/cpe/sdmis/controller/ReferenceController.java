package fr.cpe.sdmis.controller;

import fr.cpe.sdmis.dto.SeveriteResponse;
import fr.cpe.sdmis.dto.SeveriteEchelleResponse;
import fr.cpe.sdmis.dto.TypeEvenementResponse;
import fr.cpe.sdmis.repository.CaserneRepository;
import fr.cpe.sdmis.repository.EquipementRepository;
import fr.cpe.sdmis.repository.SeveriteRepository;
import fr.cpe.sdmis.repository.TypeEvenementRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/references")
public class ReferenceController {
    private final SeveriteRepository severiteRepository;
    private final TypeEvenementRepository typeEvenementRepository;
    private final CaserneRepository caserneRepository;
    private final EquipementRepository equipementRepository;

    public ReferenceController(SeveriteRepository severiteRepository,
                               TypeEvenementRepository typeEvenementRepository,
                               CaserneRepository caserneRepository,
                               EquipementRepository equipementRepository) {
        this.severiteRepository = severiteRepository;
        this.typeEvenementRepository = typeEvenementRepository;
        this.caserneRepository = caserneRepository;
        this.equipementRepository = equipementRepository;
    }

    @GetMapping("/severites")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<SeveriteResponse> severites() {
        return severiteRepository.findAll();
    }

    @GetMapping("/severites/echelles")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<SeveriteEchelleResponse> severiteEchelles() {
        return severiteRepository.findEchelles();
    }

    @GetMapping("/types-evenement")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<TypeEvenementResponse> typesEvenement() {
        return typeEvenementRepository.findAll();
    }

    @GetMapping("/casernes")
    @PreAuthorize("hasAnyRole('API_Admin','API_Simulation','API_Operateur')")
    public List<Map<String, Object>> casernes() {
        return caserneRepository.findAll();
    }

    @GetMapping("/equipements")
    @PreAuthorize("hasAnyRole('API_Admin','API_Operateur','API_Simulation')")
    public List<Map<String, Object>> equipements() {
        return equipementRepository.findAll();
    }
}
