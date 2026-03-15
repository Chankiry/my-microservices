package com.microservices.keycloak;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.models.*;
import java.util.HashMap;
import java.util.Map;

public class KafkaEventListenerProvider implements EventListenerProvider {
    
    private final KafkaProducerService kafkaProducer;
    private final KeycloakSession session;

    public KafkaEventListenerProvider(KafkaProducerService kafkaProducer, 
                                       KeycloakSession session) {
        this.kafkaProducer = kafkaProducer;
        this.session = session;
    }

    @Override
    public void onEvent(Event event) {
        // Handle user events
        switch (event.getType()) {
            case REGISTER:
                publishUserEvent("USER_REGISTERED", event);
                break;
            case UPDATE_PROFILE:
                publishUserEvent("USER_UPDATED", event);
                break;
            case UPDATE_EMAIL:
                publishUserEvent("EMAIL_UPDATED", event);
                break;
            case DELETE_ACCOUNT:
                publishUserEvent("USER_DELETED", event);
                break;
            default:
                // Log other events but don't sync
                break;
        }
    }

    @Override
    public void onEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        // Handle admin events for user management
        if (adminEvent.getResourceType() == org.keycloak.events.admin.ResourceType.USER) {
            switch (adminEvent.getOperationType()) {
                case CREATE:
                    publishAdminEvent("ADMIN_USER_CREATED", adminEvent);
                    break;
                case UPDATE:
                    publishAdminEvent("ADMIN_USER_UPDATED", adminEvent);
                    break;
                case DELETE:
                    publishAdminEvent("ADMIN_USER_DELETED", adminEvent);
                    break;
                default:
                    break;
            }
        }
    }

    private void publishUserEvent(String eventType, Event event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventType", eventType);
        payload.put("userId", event.getUserId());
        payload.put("realmId", event.getRealmId());
        payload.put("clientId", event.getClientId());
        payload.put("timestamp", event.getTime());
        payload.put("details", event.getDetails());
        
        // Fetch user details from Keycloak
        RealmModel realm = session.realms().getRealm(event.getRealmId());
        UserModel user = session.users().getUserById(realm, event.getUserId());
        
        if (user != null) {
            payload.put("email", user.getEmail());
            payload.put("username", user.getUsername());
            payload.put("firstName", user.getFirstName());
            payload.put("lastName", user.getLastName());
            payload.put("enabled", user.isEnabled());
        }
        
        kafkaProducer.sendEvent(event.getUserId(), payload);
    }

    private void publishAdminEvent(String eventType, AdminEvent adminEvent) {
        try {
            String resourcePath = adminEvent.getResourcePath();

            // Guard: must start with "users/"
            if (resourcePath == null || !resourcePath.startsWith("users/")) {
                logger.debug("Skipping non-user admin event: {}", resourcePath);
                return;
            }

            // Extract userId — take only the part between "users/" and the next "/"
            // Handles: "users/{uuid}", "users/{uuid}/role-mappings", etc.
            String afterUsers = resourcePath.substring(6); // remove "users/"
            String userId = afterUsers.contains("/")
                ? afterUsers.substring(0, afterUsers.indexOf("/"))
                : afterUsers;

            // Guard: must be a valid non-empty UUID
            if (userId == null || userId.isEmpty() || userId.equals("undefined")) {
                logger.warn("Could not extract valid userId from path: {}", resourcePath);
                return;
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", eventType);
            payload.put("userId", userId);
            payload.put("keycloakId", userId);
            payload.put("realmId", adminEvent.getRealmId());
            payload.put("timestamp", adminEvent.getTime());
            payload.put("resourcePath", resourcePath);

            // Fetch user data for CREATE and UPDATE (not DELETE)
            if (!eventType.equals("ADMIN_USER_DELETED")) {
                RealmModel realm = session.realms().getRealm(adminEvent.getRealmId());
                if (realm != null) {
                    UserModel user = session.users().getUserById(realm, userId);
                    if (user != null) {
                        payload.put("email", user.getEmail());
                        payload.put("username", user.getUsername());
                        payload.put("firstName", user.getFirstName());
                        payload.put("lastName", user.getLastName());
                        payload.put("enabled", user.isEnabled());
                        payload.put("emailVerified", user.isEmailVerified());
                    }
                }
            }

            logger.info("Publishing admin event {} for user {}", eventType, userId);
            kafkaProducer.sendEvent(userId, payload);

        } catch (Exception e) {
            logger.error("Failed to publish admin event {}: {}", eventType, e.getMessage());
        }
    }

    @Override
    public void close() {
        // Cleanup resources
    }
}