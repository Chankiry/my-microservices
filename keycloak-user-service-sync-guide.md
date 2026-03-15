# Keycloak ↔ User-Service Bidirectional Sync
### Technical Implementation Guide

> **Stack:** NestJS + Sequelize-TypeScript | **Messaging:** Apache Kafka 4.0 | **IAM:** Keycloak 26.5
> **Version:** 1.0.0 | **Date:** March 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites & Environment](#2-prerequisites--environment)
3. [Keycloak Event Listener SPI (Java)](#3-keycloak-event-listener-spi-java)
4. [NestJS Kafka Consumer (User-Service)](#4-nestjs-kafka-consumer-user-service)
5. [Reverse Sync — User-Service → Keycloak](#5-reverse-sync--user-service--keycloak)
6. [Environment Configuration](#6-environment-configuration)
7. [Testing the Sync](#7-testing-the-sync)
8. [Troubleshooting](#8-troubleshooting)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Overview

This document describes the complete **bidirectional synchronization** between Keycloak (IAM) and User-Service (NestJS + Sequelize). The sync ensures user data stays consistent across both systems without manual intervention.

### 1.1 Synchronization Directions

| Direction | Mechanism |
|---|---|
| **Keycloak → User-Service** | Kafka events via custom Java SPI (`EventListenerProvider`) |
| **User-Service → Keycloak** | Keycloak Admin REST API (direct HTTP calls) |

### 1.2 Data Ownership Model

| System | Owns | Syncs To Other |
|---|---|---|
| **Keycloak** | Credentials, roles, sessions, SSO | User-Service via Kafka |
| **User-Service** | Extended profile, preferences, business data | Keycloak via Admin API |
| **Shared** | Email, firstName, lastName, isActive | Both directions |

### 1.3 High-Level Flow

```
USER REGISTERS IN KEYCLOAK
        │
        ▼
Keycloak SPI fires REGISTER event
        │
        ▼
KafkaProducerService → publishes to "user.events" topic
        │
        ▼
UserSyncConsumer (NestJS) receives message
        │
        ├── Idempotency check (skip if already processed)
        ├── Creates user in PostgreSQL
        └── Marks event as processed

USER UPDATES PROFILE IN USER-SERVICE
        │
        ▼
UsersService.update() called
        │
        ├── Updates PostgreSQL
        └── KeycloakAdminService → Admin REST API → Keycloak
```

---

## 2. Prerequisites & Environment

### 2.1 Technology Versions

| Technology | Version | Role |
|---|---|---|
| Keycloak | 26.5 | IAM — Authentication & Authorization |
| Apache Kafka | 4.0.x (Confluent 8.0.3) | Event streaming between services |
| NestJS | 11.x | User-Service framework |
| Sequelize-TypeScript | Latest | ORM for PostgreSQL |
| PostgreSQL | 18.x | Primary database |
| Java | 21 (OpenJDK) | Required to build the Keycloak SPI |
| Maven | 3.9.x | Build tool for the Java SPI project |
| KafkaJS | 2.x | Kafka client for NestJS |

### 2.2 Docker Compose Services

The following services from `docker-compose.yml` are involved in the sync:

```yaml
# Kafka internal broker address (used by Keycloak SPI + User-Service in Docker)
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092

# Keycloak database
KC_DB_URL: jdbc:postgresql://postgres:5432/auth_db

# User-Service database
DB_NAME: user_db
```

> ⚠️ **Important: Kafka Ports**
> - Use `kafka:29092` for container-to-container communication
> - Use `localhost:9092` for local development (NestJS running outside Docker)

---

## 3. Keycloak Event Listener SPI (Java)

This is the **Keycloak → Kafka** direction. A custom Java extension listens to Keycloak user events and publishes them to Kafka.

### 3.1 Project Location

```
microservices-platform/
├── apps/
│   └── user-service/              ← NestJS
├── libs/
├── keycloak-extensions/           ← Java SPI lives here
│   └── kafka-event-listener/
│       ├── pom.xml
│       └── src/
│           └── main/
│               ├── java/com/microservices/keycloak/
│               │   ├── KafkaProducerService.java
│               │   ├── KafkaEventListenerProvider.java
│               │   └── KafkaEventListenerProviderFactory.java
│               └── resources/META-INF/services/
│                   └── org.keycloak.events.EventListenerProviderFactory
└── docker-compose.yml
```

### 3.2 Maven Setup (pom.xml)

Key configuration decisions:
- `keycloak.version` must match your `docker-compose.yml` (`26.5.0`)
- Keycloak SPI dependencies use `scope=provided` (already inside Keycloak)
- Kafka + Jackson must be **bundled** into the JAR (no `scope=provided`)
- `maven-assembly-plugin` creates a fat JAR with all dependencies

```xml
<properties>
    <keycloak.version>26.5.0</keycloak.version>
    <kafka.version>4.0.0</kafka.version>
    <maven.compiler.source>21</maven.compiler.source>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>

<dependencies>
    <!-- PROVIDED — Keycloak already has these -->
    <dependency>
        <groupId>org.keycloak</groupId>
        <artifactId>keycloak-core</artifactId>
        <version>${keycloak.version}</version>
        <scope>provided</scope>
    </dependency>
    <dependency>
        <groupId>org.keycloak</groupId>
        <artifactId>keycloak-server-spi</artifactId>
        <version>${keycloak.version}</version>
        <scope>provided</scope>
    </dependency>
    <dependency>
        <groupId>org.keycloak</groupId>
        <artifactId>keycloak-server-spi-private</artifactId>
        <version>${keycloak.version}</version>
        <scope>provided</scope>
    </dependency>

    <!-- BUNDLED — must be in the fat JAR -->
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-clients</artifactId>
        <version>${kafka.version}</version>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.18.0</version>
    </dependency>

    <!-- PROVIDED — Keycloak already has SLF4J -->
    <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-api</artifactId>
        <version>2.0.9</version>
        <scope>provided</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.13.0</version>
            <configuration>
                <source>21</source>
                <target>21</target>
                <encoding>UTF-8</encoding>
            </configuration>
        </plugin>

        <!-- Creates a fat JAR with all dependencies bundled inside -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-assembly-plugin</artifactId>
            <version>3.7.1</version>
            <configuration>
                <descriptorRefs>
                    <descriptorRef>jar-with-dependencies</descriptorRef>
                </descriptorRefs>
                <finalName>keycloak-kafka-event-listener-1.0.0</finalName>
                <appendAssemblyId>false</appendAssemblyId>
            </configuration>
            <executions>
                <execution>
                    <id>make-assembly</id>
                    <phase>package</phase>
                    <goals><goal>single</goal></goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### 3.3 KafkaProducerService.java

Handles Kafka producer lifecycle — initialization, sending events, and shutdown.

```java
// src/main/java/com/microservices/keycloak/KafkaProducerService.java
package com.microservices.keycloak;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Properties;

public class KafkaProducerService {

    private static final Logger logger = LoggerFactory.getLogger(KafkaProducerService.class);

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
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 5000);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 10000);

        this.producer = new KafkaProducer<>(props);
        logger.info("KafkaProducerService initialized with brokers: {}", bootstrapServers);
    }

    public void sendEvent(String key, Object event) {
        try {
            String value = objectMapper.writeValueAsString(event);
            ProducerRecord<String, String> record =
                new ProducerRecord<>(topicName, key, value);

            producer.send(record, (metadata, exception) -> {
                if (exception != null) {
                    logger.error("Failed to send event to Kafka topic {}: {}",
                        topicName, exception.getMessage());
                } else {
                    logger.debug("Event sent to topic {} partition {} offset {}",
                        metadata.topic(), metadata.partition(), metadata.offset());
                }
            });
        } catch (Exception e) {
            logger.error("Error serializing event: {}", e.getMessage());
        }
    }

    public void close() {
        if (producer != null) {
            producer.flush();
            producer.close();
            logger.info("KafkaProducerService closed");
        }
    }
}
```

### 3.4 KafkaEventListenerProvider.java

Intercepts Keycloak events and publishes enriched payloads to Kafka. Handles both user-facing events (login, register) and admin events (create, update, delete via admin console).

```java
// src/main/java/com/microservices/keycloak/KafkaEventListenerProvider.java
package com.microservices.keycloak;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.events.admin.ResourceType;
import org.keycloak.models.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.HashMap;
import java.util.Map;

public class KafkaEventListenerProvider implements EventListenerProvider {

    private static final Logger logger =
        LoggerFactory.getLogger(KafkaEventListenerProvider.class);

    private final KafkaProducerService kafkaProducer;
    private final KeycloakSession session;

    public KafkaEventListenerProvider(
        KafkaProducerService kafkaProducer, KeycloakSession session) {
        this.kafkaProducer = kafkaProducer;
        this.session = session;
    }

    @Override
    public void onEvent(Event event) {
        if (event.getType() == EventType.REGISTER) {
            publishUserEvent("USER_REGISTERED", event);
        } else if (event.getType() == EventType.UPDATE_PROFILE) {
            publishUserEvent("USER_UPDATED", event);
        } else if (event.getType() == EventType.UPDATE_EMAIL) {
            publishUserEvent("EMAIL_UPDATED", event);
        } else if (event.getType() == EventType.DELETE_ACCOUNT) {
            publishUserEvent("USER_DELETED", event);
        } else if (event.getType() == EventType.LOGIN) {
            publishUserEvent("USER_LOGIN", event);
        }
    }

    @Override
    public void onEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        if (adminEvent.getResourceType() == ResourceType.USER) {
            switch (adminEvent.getOperationType()) {
                case CREATE:
                    publishAdminEvent("ADMIN_USER_CREATED", adminEvent); break;
                case UPDATE:
                    publishAdminEvent("ADMIN_USER_UPDATED", adminEvent); break;
                case DELETE:
                    publishAdminEvent("ADMIN_USER_DELETED", adminEvent); break;
                default: break;
            }
        }
    }

    private void publishUserEvent(String eventType, Event event) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", eventType);
            payload.put("userId", event.getUserId());
            payload.put("realmId", event.getRealmId());
            payload.put("clientId", event.getClientId());
            payload.put("timestamp", event.getTime());

            // Fetch live user data from Keycloak session
            RealmModel realm = session.realms().getRealm(event.getRealmId());
            if (realm != null && event.getUserId() != null) {
                UserModel user = session.users().getUserById(realm, event.getUserId());
                if (user != null) {
                    payload.put("email", user.getEmail());
                    payload.put("username", user.getUsername());
                    payload.put("firstName", user.getFirstName());
                    payload.put("lastName", user.getLastName());
                    payload.put("enabled", user.isEnabled());
                    payload.put("keycloakId", user.getId());
                    payload.put("emailVerified", user.isEmailVerified());
                }
            }

            logger.info("Publishing event {} for user {}", eventType, event.getUserId());
            kafkaProducer.sendEvent(event.getUserId(), payload);

        } catch (Exception e) {
            logger.error("Failed to publish user event {}: {}", eventType, e.getMessage());
        }
    }

    private void publishAdminEvent(String eventType, AdminEvent adminEvent) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", eventType);
            payload.put("realmId", adminEvent.getRealmId());
            payload.put("timestamp", adminEvent.getTime());
            payload.put("resourcePath", adminEvent.getResourcePath());

            // Extract userId from resource path: "users/{userId}"
            String resourcePath = adminEvent.getResourcePath();
            if (resourcePath != null && resourcePath.startsWith("users/")) {
                String userId = resourcePath.substring(6);
                payload.put("userId", userId);
                payload.put("keycloakId", userId);

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
            }
        } catch (Exception e) {
            logger.error("Failed to publish admin event {}: {}", eventType, e.getMessage());
        }
    }

    @Override
    public void close() {}
}
```

**Kafka Message Payload:**

```json
{
  "eventType": "USER_REGISTERED",
  "userId": "keycloak-uuid",
  "keycloakId": "keycloak-uuid",
  "email": "user@example.com",
  "username": "john.doe",
  "firstName": "John",
  "lastName": "Doe",
  "enabled": true,
  "emailVerified": false,
  "timestamp": 1773476090282
}
```

### 3.5 KafkaEventListenerProviderFactory.java

Keycloak uses this factory to instantiate the provider. Reads config from environment variables.

```java
// src/main/java/com/microservices/keycloak/KafkaEventListenerProviderFactory.java
package com.microservices.keycloak;

import org.keycloak.Config.Scope;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class KafkaEventListenerProviderFactory implements EventListenerProviderFactory {

    private static final Logger logger =
        LoggerFactory.getLogger(KafkaEventListenerProviderFactory.class);
    private static final String PROVIDER_ID = "kafka-event-listener";

    private KafkaProducerService kafkaProducer;

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new KafkaEventListenerProvider(kafkaProducer, session);
    }

    @Override
    public void init(Scope config) {
        // Reads KAFKA_BOOTSTRAP_SERVERS env var
        // Falls back to kafka:29092 (internal Docker network port)
        String bootstrapServers = System.getenv("KAFKA_BOOTSTRAP_SERVERS") != null
            ? System.getenv("KAFKA_BOOTSTRAP_SERVERS")
            : config.get("bootstrapServers", "kafka:29092");

        String topicName = System.getenv("KAFKA_TOPIC") != null
            ? System.getenv("KAFKA_TOPIC")
            : config.get("topicName", "user.events");

        logger.info("Initializing Kafka event listener — brokers: {}, topic: {}",
            bootstrapServers, topicName);

        this.kafkaProducer = new KafkaProducerService(bootstrapServers, topicName);
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        logger.info("KafkaEventListenerProviderFactory post-initialized");
    }

    @Override
    public void close() {
        if (kafkaProducer != null) kafkaProducer.close();
    }

    @Override
    public String getId() { return PROVIDER_ID; }
}
```

### 3.6 SPI Registration File

This file tells Keycloak which factory class to load. **Without it, Keycloak will not discover your SPI.**

```
# File path:
# src/main/resources/META-INF/services/org.keycloak.events.EventListenerProviderFactory

# Content (single line — no spaces, no comments):
com.microservices.keycloak.KafkaEventListenerProviderFactory
```

### 3.7 Build & Deploy

| Step | Command |
|---|---|
| Build fat JAR | `mvn clean package -DskipTests` |
| Verify JAR size | `ls -lh target/` — should be ~21 MB |
| Verify SPI file in JAR | `jar tf target/*.jar \| grep EventListenerProviderFactory` |
| Verify classes in JAR | `jar tf target/*.jar \| grep com/microservices` |
| Restart Keycloak | `docker-compose up -d --force-recreate keycloak` |
| Watch logs | `docker logs microservices-keycloak --follow` |

The `docker-compose.yml` mounts the JAR into Keycloak automatically:

```yaml
keycloak:
  image: quay.io/keycloak/keycloak:26.5
  volumes:
    - ./keycloak-extensions/kafka-event-listener/target/keycloak-kafka-event-listener-1.0.0.jar:/opt/keycloak/providers/keycloak-kafka-event-listener-1.0.0.jar
  environment:
    KAFKA_BOOTSTRAP_SERVERS: "kafka:29092"
    KAFKA_TOPIC: "user.events"
  command: start-dev
```

**Successful startup log:**

```
KC-SERVICES0047: kafka-event-listener is implementing the internal SPI eventsListener
[Producer clientId=producer-1] Cluster ID: MkU3OEVBNTcwNTJENDM2Qk
[Producer clientId=producer-1] ProducerId set to 3001 with epoch 0
Keycloak 26.5.4 on JVM started in 5.663s
```

### 3.8 Enable in Keycloak Admin UI

After Keycloak starts with the SPI loaded, enable it for your realm:

1. Log into `http://localhost:8080` — `admin` / `admin123`
2. Select realm: **microservices-platform**
3. Click **Events** in the left sidebar → **Config** tab
4. In the **Event Listeners** field, type `kafka` → select `kafka-event-listener`
5. Click **Save**

---

## 4. NestJS Kafka Consumer (User-Service)

This is the **Kafka → User-Service** direction. NestJS subscribes to the `user.events` Kafka topic and updates PostgreSQL.

### 4.1 ProcessedEvent Model

Tracks which events have been processed to ensure idempotency. Prevents duplicate rows if Kafka delivers the same message twice.

```typescript
// src/models/sync/processed-event.model.ts

import {
    Table, Model, Column, DataType, Index, CreatedAt,
} from 'sequelize-typescript';

@Table({
    tableName: 'processed_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
})
class ProcessedEvent extends Model<ProcessedEvent> {
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @Index({ unique: true })
    @Column({ type: DataType.STRING(255) })
    declare eventId: string;  // Format: userId-eventType-timestamp

    @Column({ type: DataType.STRING(100) })
    declare eventType: string;

    @CreatedAt
    declare createdAt: Date;
}

export default ProcessedEvent;
```

### 4.2 IdempotencyService

```typescript
// src/sync/idempotency.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import ProcessedEvent from '../models/sync/processed-event.model';

@Injectable()
export class IdempotencyService {
    private readonly logger = new Logger(IdempotencyService.name);

    constructor(
        @InjectModel(ProcessedEvent)
        private readonly processedEventModel: typeof ProcessedEvent,
    ) {}

    async isProcessed(eventId: string): Promise<boolean> {
        try {
            const existing = await this.processedEventModel.findOne({
                where: { eventId },
            });
            return !!existing;
        } catch (error) {
            this.logger.error(`Idempotency check failed: ${error.message}`);
            return false;
        }
    }

    async markProcessed(eventId: string, eventType: string): Promise<void> {
        try {
            await this.processedEventModel.create({
                eventId,
                eventType,
            } as any);
        } catch (error) {
            // Ignore duplicate key — race condition, another instance processed it
            if (error instanceof UniqueConstraintError) {
                this.logger.debug(`Event already marked processed: ${eventId}`);
                return;
            }
            this.logger.error(`Failed to mark event processed: ${error.message}`);
        }
    }
}
```

### 4.3 UserSyncConsumer

The main consumer class. Subscribes to `user.events` on startup and handles all event types.

```typescript
// src/sync/user-sync.consumer.ts

import {
    Injectable, Logger, OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { UsersService } from '../users/users.service';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class UserSyncConsumer implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(UserSyncConsumer.name);
    private consumer: Consumer;
    private kafka: Kafka;

    constructor(
        private readonly usersService: UsersService,
        private readonly idempotencyService: IdempotencyService,
        private readonly configService: ConfigService,
    ) {}

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    async onModuleInit() {
        const brokers = this.configService
            .get<string>('KAFKA_BROKERS', 'kafka:29092')
            .split(',');

        this.kafka = new Kafka({
            clientId: 'user-service-sync',
            brokers,
            retry: { initialRetryTime: 300, retries: 10 },
        });

        this.consumer = this.kafka.consumer({
            groupId: 'user-service-sync-group',
        });

        try {
            await this.consumer.connect();
            this.logger.log('Kafka consumer connected');

            await this.consumer.subscribe({
                topic: 'user.events',
                fromBeginning: false,
            });

            await this.consumer.run({
                eachMessage: async (payload: EachMessagePayload) => {
                    await this.handleMessage(payload);
                },
            });

            this.logger.log('Subscribed to topic: user.events');
        } catch (error) {
            this.logger.error(`Failed to start Kafka consumer: ${error.message}`);
            // Don't throw — let the app start even if Kafka is temporarily down
        }
    }

    async onModuleDestroy() {
        try {
            await this.consumer?.disconnect();
            this.logger.log('Kafka consumer disconnected');
        } catch (error) {
            this.logger.error(`Error disconnecting consumer: ${error.message}`);
        }
    }

    // ─── Message Handler ────────────────────────────────────────────────────

    private async handleMessage({ message }: EachMessagePayload) {
        if (!message.value) return;

        let event: any;
        try {
            event = JSON.parse(message.value.toString());
        } catch (error) {
            this.logger.error(`Failed to parse Kafka message: ${error.message}`);
            return;
        }

        // Unique ID for idempotency: userId + eventType + timestamp
        const eventId = `${event.userId}-${event.eventType}-${event.timestamp}`;

        if (await this.idempotencyService.isProcessed(eventId)) {
            this.logger.debug(`Skipping duplicate event: ${eventId}`);
            return;
        }

        this.logger.log(
            `Processing event: ${event.eventType} for user: ${event.userId}`,
        );

        try {
            switch (event.eventType) {
                case 'USER_REGISTERED':
                case 'ADMIN_USER_CREATED':
                    await this.handleUserCreated(event); break;

                case 'USER_UPDATED':
                case 'EMAIL_UPDATED':
                case 'ADMIN_USER_UPDATED':
                    await this.handleUserUpdated(event); break;

                case 'USER_DELETED':
                case 'ADMIN_USER_DELETED':
                    await this.handleUserDeleted(event); break;

                case 'USER_LOGIN':
                    await this.handleUserLogin(event); break;

                default:
                    this.logger.warn(`Unknown event type: ${event.eventType}`);
                    return;
            }

            // Mark AFTER successful handling
            await this.idempotencyService.markProcessed(eventId, event.eventType);
            this.logger.log(`Event processed: ${eventId}`);

        } catch (error) {
            this.logger.error(
                `Failed to process ${event.eventType} for ${event.userId}: ${error.message}`,
            );
            throw error; // Re-throw so Kafka retries
        }
    }

    // ─── Event Handlers ─────────────────────────────────────────────────────

    private async handleUserCreated(event: any): Promise<void> {
        // 1. Check if already exists by keycloakId
        const existing = await this.usersService.findByKeycloakId(event.userId);
        if (existing) {
            this.logger.warn(`User already exists for keycloakId: ${event.userId}`);
            return;
        }

        // 2. Check by email — link if user exists without keycloakId
        if (event.email) {
            const byEmail = await this.usersService.findByEmail(event.email);
            if (byEmail) {
                this.logger.log(
                    `Linking existing user ${byEmail.id} to keycloakId: ${event.userId}`,
                );
                await this.usersService.updateKeycloakId(byEmail.id, event.userId);
                return;
            }
        }

        // 3. Create new user
        await this.usersService.create({
            username: event.username || event.email?.split('@')[0] || event.userId,
            email: event.email,
            firstName: event.firstName || null,
            lastName: event.lastName || null,
            keycloakId: event.keycloakId || event.userId,
            isActive: event.enabled ?? true,
            emailVerified: event.emailVerified ?? false,
            passwordHash: null,  // Keycloak handles auth
            roles: ['user'],
        });

        this.logger.log(`User created from Keycloak: ${event.userId}`);
    }

    private async handleUserUpdated(event: any): Promise<void> {
        const user = await this.usersService.findByKeycloakId(event.userId);

        if (!user) {
            // User doesn't exist yet — create instead
            this.logger.warn(`User not found for update, creating: ${event.userId}`);
            await this.handleUserCreated(event);
            return;
        }

        // Only update fields that actually changed
        const updatePayload: any = {};

        if (event.email && event.email !== user.email)
            updatePayload.email = event.email;
        if (event.firstName !== undefined && event.firstName !== user.firstName)
            updatePayload.firstName = event.firstName;
        if (event.lastName !== undefined && event.lastName !== user.lastName)
            updatePayload.lastName = event.lastName;
        if (event.enabled !== undefined && event.enabled !== user.isActive)
            updatePayload.isActive = event.enabled;
        if (event.emailVerified !== undefined)
            updatePayload.emailVerified = event.emailVerified;

        if (Object.keys(updatePayload).length > 0) {
            await this.usersService.update(user.id, updatePayload);
            this.logger.log(`User updated from Keycloak: ${event.userId}`);
        } else {
            this.logger.debug(`No changes for user: ${event.userId}`);
        }
    }

    private async handleUserDeleted(event: any): Promise<void> {
        const user = await this.usersService.findByKeycloakId(event.userId);

        if (!user) {
            this.logger.warn(`User not found for deletion: ${event.userId}`);
            return; // Already deleted — fine
        }

        await this.usersService.remove(user.id);
        this.logger.log(`User deleted from Keycloak: ${event.userId}`);
    }

    private async handleUserLogin(event: any): Promise<void> {
        try {
            const user = await this.usersService.findByKeycloakId(event.userId);
            if (!user) return;

            await this.usersService.update(user.id, {
                lastLoginAt: new Date(event.timestamp),
            } as any);
        } catch (error) {
            // Non-critical — don't fail the whole message
            this.logger.warn(`Could not update last login for: ${event.userId}`);
        }
    }
}
```

### 4.4 Event Type Reference

| Event Type | Trigger | Handler |
|---|---|---|
| `USER_REGISTERED` | User self-registers in Keycloak | `handleUserCreated` |
| `ADMIN_USER_CREATED` | Admin creates user in Keycloak UI | `handleUserCreated` |
| `USER_UPDATED` | User updates own profile | `handleUserUpdated` |
| `EMAIL_UPDATED` | User changes email address | `handleUserUpdated` |
| `ADMIN_USER_UPDATED` | Admin updates user in Keycloak UI | `handleUserUpdated` |
| `USER_DELETED` | User deletes own account | `handleUserDeleted` |
| `ADMIN_USER_DELETED` | Admin deletes user in Keycloak UI | `handleUserDeleted` |
| `USER_LOGIN` | User logs in — updates `lastLoginAt` | `handleUserLogin` |

### 4.5 Module Setup

```typescript
// src/sync/sync.module.ts
@Module({
    imports: [
        SequelizeModule.forFeature([ProcessedEvent]),
        UsersModule,  // provides UsersService
    ],
    providers: [UserSyncConsumer, IdempotencyService],
    exports: [IdempotencyService],
})
export class SyncModule {}
```

```typescript
// src/app.module.ts — add SyncModule + ProcessedEvent
@Module({
    imports: [
        // ... existing imports
        SyncModule,  // ← add this
    ],
})
export class AppModule {}

// Also register model in SequelizeModule.forRoot()
SequelizeModule.forRoot({
    // ... existing config
    models: [
        User,
        OutboxMessage,
        ProcessedEvent,  // ← add this
    ],
    synchronize: true,  // auto-creates table in development
})
```

```typescript
// src/users/users.module.ts — export UsersService
@Module({
    providers: [UsersService],
    exports: [UsersService],  // ← required for SyncModule injection
})
export class UsersModule {}
```

---

## 5. Reverse Sync — User-Service → Keycloak

When User-Service updates data that Keycloak needs to know about (email, roles, custom attributes), it calls the Keycloak Admin REST API directly.

### 5.1 Keycloak Admin Client Setup

The `user-service-admin` client in Keycloak must have these **Service Account Roles** from `realm-management`:

- `manage-users`
- `view-users`
- `query-users`

```typescript
// src/keycloak/keycloak-admin.service.ts

@Injectable()
export class KeycloakAdminService {
    private readonly logger = new Logger(KeycloakAdminService.name);
    private accessToken: string;
    private tokenExpiry: number;

    constructor(private readonly configService: ConfigService) {}

    // Gets a service-account token using client_credentials grant
    private async ensureAccessToken(): Promise<void> {
        if (this.accessToken && Date.now() < this.tokenExpiry) return;

        const url = `${this.configService.get('KEYCLOAK_URL')}/realms/` +
                    `${this.configService.get('KEYCLOAK_REALM')}/protocol/openid-connect/token`;

        const response = await axios.post(url, new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.configService.get('KEYCLOAK_ADMIN_CLIENT_ID'),
            client_secret: this.configService.get('KEYCLOAK_ADMIN_CLIENT_SECRET'),
        }));

        this.accessToken = response.data.access_token;
        // Subtract 30s buffer before expiry
        this.tokenExpiry = Date.now() + (response.data.expires_in - 30) * 1000;
    }

    async updateUserProfile(userId: string, data: {
        email?: string;
        firstName?: string;
        lastName?: string;
    }): Promise<void> {
        await this.ensureAccessToken();
        const realm = this.configService.get('KEYCLOAK_REALM');

        await axios.put(
            `${this.configService.get('KEYCLOAK_URL')}/admin/realms/${realm}/users/${userId}`,
            data,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        this.logger.log(`Updated Keycloak profile for user ${userId}`);
    }

    async assignRole(userId: string, roleName: string): Promise<void> {
        await this.ensureAccessToken();
        const realm = this.configService.get('KEYCLOAK_REALM');
        const baseUrl = this.configService.get('KEYCLOAK_URL');

        const roleRes = await axios.get(
            `${baseUrl}/admin/realms/${realm}/roles/${roleName}`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        await axios.post(
            `${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
            [roleRes.data],
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        this.logger.log(`Assigned role ${roleName} to user ${userId}`);
    }

    async removeRole(userId: string, roleName: string): Promise<void> {
        await this.ensureAccessToken();
        const realm = this.configService.get('KEYCLOAK_REALM');
        const baseUrl = this.configService.get('KEYCLOAK_URL');

        const roleRes = await axios.get(
            `${baseUrl}/admin/realms/${realm}/roles/${roleName}`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        await axios.delete(
            `${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
            {
                headers: { Authorization: `Bearer ${this.accessToken}` },
                data: [roleRes.data],
            }
        );

        this.logger.log(`Removed role ${roleName} from user ${userId}`);
    }

    async updateUserAttributes(
        userId: string,
        attributes: Record<string, string[]>
    ): Promise<void> {
        await this.ensureAccessToken();
        const realm = this.configService.get('KEYCLOAK_REALM');
        const baseUrl = this.configService.get('KEYCLOAK_URL');

        const existingRes = await axios.get(
            `${baseUrl}/admin/realms/${realm}/users/${userId}`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        await axios.put(
            `${baseUrl}/admin/realms/${realm}/users/${userId}`,
            {
                ...existingRes.data,
                attributes: { ...existingRes.data.attributes, ...attributes }
            },
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        this.logger.log(`Updated attributes for user ${userId}`);
    }
}
```

### 5.2 Integration with UsersService

Call `KeycloakAdminService` from `UsersService.update()` whenever relevant fields change:

```typescript
// In src/users/users.service.ts

async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // 1. Update local PostgreSQL
    const user = await this.findById(id);
    const changes = this.getChanges(user, updateUserDto);
    Object.assign(user, updateUserDto);
    await user.save();

    // 2. Sync to Keycloak if relevant fields changed
    if (updateUserDto.email || updateUserDto.firstName || updateUserDto.lastName) {
        await this.keycloakAdminService.updateUserProfile(user.keycloakId, {
            email: updateUserDto.email,
            firstName: updateUserDto.firstName,
            lastName: updateUserDto.lastName,
        });
    }

    // 3. Invalidate Redis cache
    await this.invalidateUserCache(id, user);

    // 4. Emit Kafka event for other consumers
    await this.kafkaProducer.emitUserUpdated(id, changes);

    return user;
}
```

---

## 6. Environment Configuration

### 6.1 User-Service `.env` (local development)

```bash
NODE_ENV=development
HTTP_PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5455
DB_USERNAME=admin
DB_PASSWORD=admin123
DB_NAME=user_db

# Kafka — use localhost when running NestJS outside Docker
KAFKA_BROKERS=localhost:9092

# Keycloak Admin API
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=microservices-platform
KEYCLOAK_ADMIN_CLIENT_ID=user-service-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=your-client-secret-here
```

### 6.2 docker-compose.yml User-Service

```yaml
user-service:
  environment:
    NODE_ENV: development
    HTTP_PORT: 3001
    DB_HOST: postgres
    DB_PORT: 5432
    DB_USERNAME: admin
    DB_PASSWORD: admin123
    DB_NAME: user_db
    KAFKA_BROKERS: kafka:29092       # internal Docker network
    KEYCLOAK_URL: http://keycloak:8080
    KEYCLOAK_REALM: microservices-platform
    KEYCLOAK_ADMIN_CLIENT_ID: user-service-admin
    KEYCLOAK_ADMIN_CLIENT_SECRET: your-secret
```

---

## 7. Testing the Sync

### 7.1 Test Registration (Keycloak → User-Service)

**Step 1** — Open Keycloak account page:
```
http://localhost:8080/realms/microservices-platform/account
```

**Step 2** — Register a new user: click Sign In → Register → fill in email, name, password → Submit

**Step 3** — Verify message in Kafka UI:
```
http://localhost:8089 → Topics → user.events → Messages
```

**Step 4** — Verify user created in PostgreSQL:
```sql
SELECT id, email, "keycloakId", "isActive", "emailVerified", "createdAt"
FROM users
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Step 5** — Verify idempotency record:
```sql
SELECT "eventId", "eventType", "createdAt"
FROM processed_events
ORDER BY "createdAt" DESC
LIMIT 5;
```

### 7.2 Test Update Sync (Keycloak → User-Service)

```bash
# 1. Update user in Keycloak Admin UI
#    Admin Console → Users → select user → Edit → change firstName → Save

# 2. Verify update in PostgreSQL
SELECT "firstName", "lastName", "updatedAt"
FROM users
WHERE email = 'test@example.com';
```

### 7.3 Test Reverse Sync (User-Service → Keycloak)

```bash
# 1. Update user via User-Service API
curl -X PUT http://localhost:3001/api/users/{userId} \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "UpdatedName" }'

# 2. Verify update in Keycloak Admin UI
#    Admin Console → Users → find user → check firstName changed
```

### 7.4 Expected NestJS Consumer Logs

```
LOG [UserSyncConsumer] Kafka consumer connected
LOG [UserSyncConsumer] Subscribed to topic: user.events
LOG [UserSyncConsumer] Processing event: USER_REGISTERED for user: uuid
LOG [UsersService] User created: uuid
LOG [UserSyncConsumer] Event processed: uuid-USER_REGISTERED-1773476090282

# If duplicate event arrives:
DEBUG [UserSyncConsumer] Skipping duplicate event: uuid-USER_REGISTERED-1773476090282
```

---

## 8. Troubleshooting

| Problem | Solution |
|---|---|
| SPI not loaded — no `kafka-event-listener` in logs | Rebuild JAR after adding SPI registration file. Run: `jar tf *.jar \| grep EventListenerProviderFactory` |
| Kafka connection refused in Keycloak | Ensure `kafka:29092` is used (not `localhost`). Check `KAFKA_BOOTSTRAP_SERVERS` env var. |
| User not created in PostgreSQL after registration | Check NestJS consumer logs. Verify `kafka-event-listener` is enabled in Keycloak Events → Config. |
| `ClassNotFoundException` in Keycloak | Fat JAR not built. Run `mvn clean package -DskipTests`. Check JAR size (~21 MB). |
| Duplicate users being created | Idempotency check failing. Verify `processed_events` table exists and `ProcessedEvent` model is registered in `SequelizeModule.forRoot()`. |
| Consumer not connecting to Kafka | Check `KAFKA_BROKERS` env var. Use `localhost:9092` for local dev, `kafka:29092` inside Docker. |
| Admin API returning 401 | Service account token expired or wrong client secret. Verify `KEYCLOAK_ADMIN_CLIENT_SECRET`. |

### Debug Commands

```bash
# Check Keycloak loaded the SPI
docker logs microservices-keycloak 2>&1 | grep kafka

# List Kafka topics
docker exec microservices-kafka kafka-topics \
  --bootstrap-server localhost:9092 --list

# Watch messages on user.events topic live
docker exec microservices-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user.events --from-beginning

# Check consumer group lag
docker exec microservices-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --group user-service-sync-group

# Verify JAR contents
jar tf keycloak-extensions/kafka-event-listener/target/*.jar \
  | grep -E "EventListenerProviderFactory|com/microservices"
```

---

## 9. Implementation Checklist

### Java SPI (Keycloak → Kafka)

- [x] Maven 3.9.x and Java 21 installed
- [x] `keycloak-extensions/kafka-event-listener/` project created
- [x] `pom.xml` configured with Keycloak 26.5.0, Kafka 4.0.0, assembly plugin
- [x] `KafkaProducerService.java` created
- [x] `KafkaEventListenerProvider.java` created
- [x] `KafkaEventListenerProviderFactory.java` created
- [x] SPI registration file created (`META-INF/services/...`)
- [x] `mvn clean package -DskipTests` succeeded — JAR is ~21 MB
- [x] `docker-compose.yml` mounts JAR + sets `KAFKA_BOOTSTRAP_SERVERS`
- [x] Keycloak started — logs show `kafka-event-listener` loaded
- [x] Kafka producer connected — logs show Cluster ID and ProducerId
- [ ] `kafka-event-listener` enabled in Keycloak Admin UI → Events → Config

### NestJS Consumer (Kafka → User-Service)

- [ ] `ProcessedEvent` Sequelize model created
- [ ] `ProcessedEvent` registered in `SequelizeModule.forRoot()` models array
- [ ] `IdempotencyService` created
- [ ] `UserSyncConsumer` created with all event handlers
- [ ] `SyncModule` created (imports `SequelizeModule` + `UsersModule`)
- [ ] `SyncModule` imported in `AppModule`
- [ ] `UsersService` exported from `UsersModule`
- [ ] `KAFKA_BROKERS` set correctly in `.env`
- [ ] `npm run start:dev` — consumer connects and subscribes to `user.events`
- [ ] Test: register user in Keycloak → verify row appears in `users` table
- [ ] Test: verify `processed_events` row created (idempotency working)

### Reverse Sync (User-Service → Keycloak)

- [ ] `user-service-admin` client created in Keycloak with service account roles
- [ ] `KeycloakAdminService` created with token management
- [ ] `UsersService.update()` calls `KeycloakAdminService` for profile fields
- [ ] `KEYCLOAK_ADMIN_CLIENT_SECRET` set in `.env`
- [ ] Test: update user in User-Service → verify change in Keycloak Admin UI

---

*© 2026 Microservices Platform — Keycloak ↔ User-Service Sync Guide v1.0.0*
