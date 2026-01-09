package fr.cpe.sdmis.service;

import fr.cpe.sdmis.config.RabbitConfig.RabbitQueues;
import fr.cpe.sdmis.messaging.EventMessage;
import fr.cpe.sdmis.messaging.InterventionMessage;
import fr.cpe.sdmis.service.SdmisSseService;
import fr.cpe.sdmis.repository.InterventionRepository;
import fr.cpe.sdmis.repository.VehiculeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class DecisionMessagingService {
    private static final Logger LOGGER = LoggerFactory.getLogger(DecisionMessagingService.class);

    private final RabbitTemplate rabbitTemplate;
    private final RabbitQueues queues;
    private final InterventionRepository interventionRepository;
    private final VehiculeRepository vehiculeRepository;
    private final SdmisSseService sseService;

    public DecisionMessagingService(RabbitTemplate rabbitTemplate,
                                    RabbitQueues queues,
                                    InterventionRepository interventionRepository,
                                    VehiculeRepository vehiculeRepository,
                                    SdmisSseService sseService) {
        this.rabbitTemplate = rabbitTemplate;
        this.queues = queues;
        this.interventionRepository = interventionRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.sseService = sseService;
    }

    public void publierEvenement(EventMessage eventMessage) {
        rabbitTemplate.convertAndSend("", queues.eventQueue(), eventMessage);
        LOGGER.info("Evènement {} publié vers la file {}", eventMessage.getIdEvenement(), queues.eventQueue());
    }

    @RabbitListener(queues = "#{rabbitQueues.interventionQueue}")
    public void onIntervention(InterventionMessage interventionMessage) {
        LOGGER.info("Intervention reçue pour l'évènement {} (succès={}, véhicule={})",
                interventionMessage.getIdEvenement(),
                interventionMessage.isSucces(),
                interventionMessage.getVehiculeId());
        if (!interventionMessage.isSucces() || interventionMessage.getVehiculeId() == null) {
            LOGGER.warn("Intervention ignorée (succès={}, vehiculeId={}) pour évènement {}. Cause : {}",
                    interventionMessage.isSucces(),
                    interventionMessage.getVehiculeId(),
                    interventionMessage.getIdEvenement(),
                    interventionMessage.getCauseEchec());
            return;
        }
        interventionRepository.saveFromMessage(interventionMessage);
        interventionRepository.findSnapshotByIds(interventionMessage.getIdEvenement(), interventionMessage.getVehiculeId())
                .ifPresent(snapshot -> sseService.broadcast("interventions", List.of(snapshot)));
        vehiculeRepository.findSnapshotById(interventionMessage.getVehiculeId())
                .ifPresent(snapshot -> sseService.broadcast("vehicules", List.of(snapshot)));
    }
}
