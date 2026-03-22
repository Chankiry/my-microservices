package com.microservices.keycloak;

import java.util.logging.Logger;
import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.models.*;
import java.util.HashMap;
import java.util.Map;

public class KafkaEventListenerProvider implements EventListenerProvider {

    private static final Logger logger = Logger.getLogger(KafkaEventListenerProvider.class.getName());

    private final KafkaProducerService kafkaProducer;
    private final KeycloakSession session;

    public KafkaEventListenerProvider(KafkaProducerService kafkaProducer,
                                       KeycloakSession session) {
        this.kafkaProducer = kafkaProducer;
        this.session = session;
    }

    @Override
    public void onEvent(Event event) {
        try {
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
                case LOGIN:
                    publishUserEvent("USER_LOGIN", event);
                    break;
                case DELETE_ACCOUNT:
                    publishUserEvent("USER_DELETED", event);
                    break;
                default:
                    break;
            }
        } catch (Exception e) {
            logger.severe("Failed to publish event, continuing: " + e.getMessage());
        }
    }

    @Override
    public void onEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        try {
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
        } catch (Exception e) {
            logger.severe("Failed to publish admin event, continuing: " + e.getMessage());
        }
    }

    private void publishUserEvent(String eventType, Event event) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", eventType);
            payload.put("userId",    event.getUserId());
            payload.put("realmId",   event.getRealmId());
            payload.put("clientId",  event.getClientId());
            payload.put("timestamp", event.getTime());

            if (event.getDetails() != null) {
                payload.put("details", event.getDetails());
            }

            RealmModel realm = session.realms().getRealm(event.getRealmId());
            if (realm != null) {
                UserModel user = session.users().getUserById(realm, event.getUserId());
                if (user != null) {
                    payload.put("email",         user.getEmail());
                    payload.put("username",      user.getUsername());
                    payload.put("firstName",     user.getFirstName());
                    payload.put("lastName",      user.getLastName());
                    payload.put("enabled",       user.isEnabled());
                    payload.put("emailVerified", user.isEmailVerified());
                }
            }

            kafkaProducer.sendEvent(event.getUserId(), payload);

        } catch (Exception e) {
            logger.severe("Failed to publish user event " + eventType + ": " + e.getMessage());
        }
    }

    private void publishAdminEvent(String eventType, AdminEvent adminEvent) {
        try {
            String resourcePath = adminEvent.getResourcePath();

            if (resourcePath == null || !resourcePath.startsWith("users/")) {
                return;
            }

            String afterUsers = resourcePath.substring(6);
            String userId = afterUsers.contains("/")
                ? afterUsers.substring(0, afterUsers.indexOf("/"))
                : afterUsers;

            if (userId == null || userId.isEmpty() || userId.equals("undefined")) {
                logger.warning("Could not extract valid userId from path: " + resourcePath);
                return;
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType",    eventType);
            payload.put("userId",       userId);
            payload.put("keycloakId",   userId);
            payload.put("realmId",      adminEvent.getRealmId());
            payload.put("timestamp",    adminEvent.getTime());
            payload.put("resourcePath", resourcePath);

            if (!eventType.equals("ADMIN_USER_DELETED")) {
                RealmModel realm = session.realms().getRealm(adminEvent.getRealmId());
                if (realm != null) {
                    UserModel user = session.users().getUserById(realm, userId);
                    if (user != null) {
                        payload.put("email",         user.getEmail());
                        payload.put("username",      user.getUsername());
                        payload.put("firstName",     user.getFirstName());
                        payload.put("lastName",      user.getLastName());
                        payload.put("enabled",       user.isEnabled());
                        payload.put("emailVerified", user.isEmailVerified());
                    }
                }
            }

            logger.info("Publishing admin event " + eventType + " for user " + userId);
            kafkaProducer.sendEvent(userId, payload);

        } catch (Exception e) {
            logger.severe("Failed to publish admin event " + eventType + ": " + e.getMessage());
        }
    }

    @Override
    public void close() {}
}
