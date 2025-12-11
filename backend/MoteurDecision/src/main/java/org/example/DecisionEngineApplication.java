package org.example;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.CancelCallback;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.DeliverCallback;
import org.example.moteurdecision.messaging.EventMessage;
import org.example.moteurdecision.messaging.InterventionMessage;
import org.example.moteurdecision.service.SimpleDecisionService;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

/**
 * Implémentation minimale : consomme une file RabbitMQ et renvoie une intervention factice.
 */
public final class DecisionEngineApplication {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().findAndRegisterModules();
    private static final SimpleDecisionService DECISION_SERVICE = new SimpleDecisionService();

    private DecisionEngineApplication() {
    }

    public static void main(String[] args) throws Exception {
        Map<String, String> env = System.getenv();
        String host = env.getOrDefault("RABBITMQ_HOST", "localhost");
        int port = Integer.parseInt(env.getOrDefault("RABBITMQ_PORT", "5672"));
        String username = env.getOrDefault("RABBITMQ_USERNAME", "guest");
        String password = env.getOrDefault("RABBITMQ_PASSWORD", "guest");
        String eventQueue = env.getOrDefault("DECISION_EVENT_QUEUE", "decision.events");
        String interventionQueue = env.getOrDefault("DECISION_INTERVENTION_QUEUE", "decision.interventions");

        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        factory.setUsername(username);
        factory.setPassword(password);

        Connection connection = factory.newConnection("decision-engine");
        Channel consumerChannel = connection.createChannel();
        Channel producerChannel = connection.createChannel();

        consumerChannel.queueDeclare(eventQueue, true, false, false, null);
        producerChannel.queueDeclare(interventionQueue, true, false, false, null);

        DeliverCallback deliverCallback = (consumerTag, delivery) -> {
            try {
                EventMessage eventMessage = OBJECT_MAPPER.readValue(delivery.getBody(), EventMessage.class);

                System.out.printf("Evenement reçu (id=%d)%n", eventMessage.getIdEvenement());
                InterventionMessage intervention = DECISION_SERVICE.creerIntervention(eventMessage);
                byte[] payload = OBJECT_MAPPER.writeValueAsBytes(intervention);
                producerChannel.basicPublish("", interventionQueue, null, payload);
                consumerChannel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
                System.out.printf("Intervention envoyée pour l'évènement %d vers %s%n",
                        intervention.getIdEvenement(), interventionQueue);
            }
            catch (IOException e) {
                consumerChannel.basicNack(delivery.getEnvelope().getDeliveryTag(), false, false);
                System.err.println("Impossible de traiter le message : " + e.getMessage());
            }
        };

        CancelCallback cancelCallback = consumerTag ->
                System.out.println("Consommation RabbitMQ interrompue : " + consumerTag);

        consumerChannel.basicConsume(eventQueue, false, deliverCallback, cancelCallback);
        System.out.printf("Moteur de décision prêt (queue entrée=%s, sortie=%s)%n", eventQueue, interventionQueue);

        CountDownLatch latch = new CountDownLatch(1);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                consumerChannel.close();
                producerChannel.close();
                connection.close();
            } catch (Exception ignored) {
            }
            latch.countDown();
        }));
        latch.await();
    }
}
