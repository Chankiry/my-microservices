package com.microservices.keycloak;

import org.keycloak.Config.Scope;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.*;
import org.keycloak.provider.ProviderConfigProperty;

import java.util.List;

public class KafkaEventListenerProviderFactory 
    implements EventListenerProviderFactory {

    private static final String PROVIDER_ID = "kafka-event-listener";
    private KafkaProducerService kafkaProducer;

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new KafkaEventListenerProvider(kafkaProducer, session);
    }

    @Override
    public void init(Scope config) {
        String bootstrapServers = config.get("bootstrapServers", 
            System.getenv("KAFKA_BOOTSTRAP_SERVERS") != null 
                ? System.getenv("KAFKA_BOOTSTRAP_SERVERS") 
                : "kafka:9092");
        String topicName = config.get("topicName", "user.events");
        
        this.kafkaProducer = new KafkaProducerService(bootstrapServers, topicName);
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // No post-initialization required
    }

    @Override
    public void close() {
        if (kafkaProducer != null) {
            kafkaProducer.close();
        }
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public List<ProviderConfigProperty> getConfigMetadata() {
        return List.of(
            new ProviderConfigProperty("bootstrapServers", 
                "Kafka Bootstrap Servers", 
                "Comma-separated list of Kafka broker addresses",
                ProviderConfigProperty.STRING_TYPE, 
                "kafka:9092"),
            new ProviderConfigProperty("topicName", 
                "Kafka Topic Name", 
                "Name of the Kafka topic for user events",
                ProviderConfigProperty.STRING_TYPE, 
                "user.events")
        );
    }
}