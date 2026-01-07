package fr.cpe.sdmis.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    @Value("${RABBITMQ_HOST}")
    private String host;

    @Value("${RABBITMQ_PORT}")
    private int port;

    @Value("${RABBITMQ_USERNAME}")
    private String username;

    @Value("${RABBITMQ_PASSWORD}")
    private String password;

    @Value("${DECISION_EVENT_QUEUE}")
    private String eventQueue;

    @Value("${DECISION_INTERVENTION_QUEUE}")
    private String interventionQueue;

    @Bean
    public ConnectionFactory connectionFactory() {
        CachingConnectionFactory factory = new CachingConnectionFactory(host, port);
        factory.setUsername(username);
        factory.setPassword(password);
        return factory;
    }

    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter converter) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(converter);
        return rabbitTemplate;
    }

    @Bean
    public Queue eventQueue() {
        return new Queue(eventQueue, true);
    }

    @Bean
    public Queue interventionQueue() {
        return new Queue(interventionQueue, true);
    }

    @Bean
    public RabbitQueues rabbitQueues() {
        return new RabbitQueues(eventQueue, interventionQueue);
    }

    public record RabbitQueues(String eventQueue, String interventionQueue) { }
}
