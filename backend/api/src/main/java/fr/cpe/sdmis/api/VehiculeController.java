package fr.cpe.sdmis.api;

import fr.cpe.sdmis.dto.VehiculeOperationnelResponse;
import fr.cpe.sdmis.repository.VehiculeRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/vehicules")
public class VehiculeController {

    private final VehiculeRepository vehiculeRepository;

    public VehiculeController(VehiculeRepository vehiculeRepository) {
        this.vehiculeRepository = vehiculeRepository;
    }

    @GetMapping("/operationnels")
    public List<VehiculeOperationnelResponse> operationnels() {
        return vehiculeRepository.findOperationnels();
    }
}
