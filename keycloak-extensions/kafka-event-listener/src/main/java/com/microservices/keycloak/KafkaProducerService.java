package com.microservices.keycloak;

import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Properties;
import java.util.concurrent.ExecutionException;

public class KafkaProducerService {
    private final KafkaProducer<String, String> producer;
    private final ObjectMapper objectMapper;
    private final String topicName;

    public KafkaProducerService(String bootstrapServers, String topicName) {
        this.topicName = topicName;
        this.objectMapper = new ObjectMapper();
        
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        
        this.producer = new KafkaProducer<>(props);
    }

    public void sendEvent(String key, Object event) {
        try {
            String value = objectMapper.writeValueAsString(event);
            ProducerRecord<String, String> record = 
                new ProducerRecord<>(topicName, key, value);
            
            producer.send(record, (metadata, exception) -> {
                if (exception != null) {
                    exception.printStackTrace();
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void close() {
        producer.close();
    }
}