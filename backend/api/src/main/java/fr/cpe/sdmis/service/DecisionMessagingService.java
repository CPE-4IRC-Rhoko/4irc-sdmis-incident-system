package fr.cpe.sdmis.service;

import fr.cpe.sdmis.config.RabbitConfig.RabbitQueues;
import fr.cpe.sdmis.messaging.EventMessage;
import fr.cpe.sdmis.messaging.InterventionMessage;
import fr.cpe.sdmis.repository.InterventionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class DecisionMessagingService {
    private static final Logger LOGGER = LoggerFactory.getLogger(DecisionMessagingService.class);

    private final RabbitTemplate rabbitTemplate;
    private final RabbitQueues queues;
    private final InterventionRepository interventionRepository;

    public DecisionMessagingService(RabbitTemplate rabbitTemplate,
                                    RabbitQueues queues,
                                    InterventionRepository interventionRepository) {
        this.rabbitTemplate = rabbitTemplate;
        this.queues = queues;
        this.interventionRepository = interventionRepository;
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
        interventionRepository.saveFromMessage(interventionMessage);
    }
}
