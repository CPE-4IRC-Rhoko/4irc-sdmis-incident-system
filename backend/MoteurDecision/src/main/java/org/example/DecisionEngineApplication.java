package org.example;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.CancelCallback;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.DeliverCallback;
import org.example.moteurdecision.messaging.EventMessage;
import org.example.moteurdecision.messaging.InterventionMessage;
import org.example.moteurdecision.service.DecisionService;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CountDownLatch;

/**
 * Implémentation minimale : consomme une file RabbitMQ et renvoie une intervention.
 */
public final class DecisionEngineApplication {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().findAndRegisterModules();

    private DecisionEngineApplication() {
    }

    public static void main(String[] args) throws Exception {
        Map<String, String> env = System.getenv();
        String host = requireEnv(env, "RABBITMQ_HOST");
        int port = Integer.parseInt(requireEnv(env, "RABBITMQ_PORT"));
        String username = requireEnv(env, "RABBITMQ_USERNAME");
        String password = requireEnv(env, "RABBITMQ_PASSWORD");
        String eventQueue = requireEnv(env, "DECISION_EVENT_QUEUE");
        String interventionQueue = requireEnv(env, "DECISION_INTERVENTION_QUEUE");
        String apiBaseUrl = requireEnv(env, "SDMIS_API_URL");

        DecisionService decisionService = new DecisionService(apiBaseUrl, OBJECT_MAPPER);

        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        factory.setUsername(username);
        factory.setPassword(password);

        Connection connection = createConnectionWithRetry(factory);
        Channel consumerChannel = connection.createChannel();
        Channel producerChannel = connection.createChannel();

        consumerChannel.queueDeclare(eventQueue, true, false, false, null);
        producerChannel.queueDeclare(interventionQueue, true, false, false, null);

        DeliverCallback deliverCallback = (consumerTag, delivery) -> {
            try {
                EventMessage eventMessage = OBJECT_MAPPER.readValue(delivery.getBody(), EventMessage.class);

                System.out.printf("Evenement reçu (id=%s)%n", eventMessage.getIdEvenement());
                InterventionMessage intervention = decisionService.creerIntervention(eventMessage);
                byte[] payload = OBJECT_MAPPER.writeValueAsBytes(intervention);
                producerChannel.basicPublish("", interventionQueue, null, payload);
                consumerChannel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
                System.out.printf("Intervention envoyée pour l'évènement %s vers %s%n",
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

    private static String requireEnv(Map<String, String> env, String key) {
        String value = env.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Variable d'environnement manquante : " + key);
        }
        return value;
    }

    private static Connection createConnectionWithRetry(ConnectionFactory factory) throws Exception {
        int attempt = 0;
        while (true) {
            attempt++;
            try {
                return factory.newConnection("decision-engine");
            } catch (IOException e) {
                System.err.printf("Connexion RabbitMQ impossible (tentative %d) : %s%n", attempt, e.getMessage());
                Thread.sleep(2000L);
            }
        }
    }
}
