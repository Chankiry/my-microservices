# 🚀 MICROSERVICES SYSTEM SETUP PROMPT

You are an expert microservices architect. I need you to help me create a complete microservices-based system with the following requirements:

## SYSTEM REQUIREMENTS

### Architecture Type
- Microservices architecture (NOT monolithic)
- Scalable to 20+ services
- Event-driven communication between services
- API Gateway pattern
- Centralized authentication/authorization

### Frontend & UI
- Public website: Next.js (no QR code, standard login form)
- Admin dashboard: Angular
- NO mobile app (remove Flutter completely)
- Both frontends support username/password login

### Authentication & Authorization
- Centralized IAM: Keycloak
- Standard login: username/password (NO QR code)
- OAuth 2.0 / OpenID Connect
- JWT token-based API authentication
- Multi-service authentication (one login for all services)
- Role-based access control (admin, user roles)

### Microservices (5 services)
1. **Auth Service** (Port 3001)
   - User login/registration
   - JWT token generation
   - Password management
   - User validation

2. **User Service** (Port 3002)
   - User profiles
   - User preferences
   - User data management

3. **Order Service** (Port 3004)
   - Create orders
   - Order management
   - Order status tracking

4. **Payment Service** (Port 3005)
   - Process payments
   - Payment history
   - Payment status

5. **Notification Service** (Port 3006)
   - Send emails
   - Send notifications
   - Listen to events

### Technology Stack

#### Frontend
- Next.js 14+ (public website)
- Angular 16+ (admin dashboard)
- TypeScript
- Responsive design

#### Backend/Microservices
- NestJS (all microservices)
- Node.js LTS
- TypeScript
- Dependency Injection
- Custom decorators

#### API Gateway
- Kong (not NestJS API Gateway)
- Request routing
- Rate limiting
- JWT validation

#### Authentication/IAM
- Keycloak 23+
- OAuth 2.0
- OpenID Connect
- JWT tokens
- User management
- Role management

#### Message Queue & Events
- Kafka (KRaft mode - NO Zookeeper)
- Event streaming
- Async communication
- Event replay capability

#### Data Storage
- PostgreSQL 15 (relational database)
- Redis 7 (caching)
- Database per service pattern
- **Sequelize ORM** (with model-based architecture)

#### Service Communication
- REST API (client → Kong → services)
- gRPC (internal service-to-service)
- Protocol Buffers for gRPC
- Kafka events (async)

#### Monitoring & Observability
- Prometheus (metrics)
- Grafana (dashboards)
- Jaeger (distributed tracing)
- Kafka UI (message monitoring)
- pgAdmin (database UI)
- Redis Commander (cache UI)

#### Infrastructure & Deployment
- Docker (containerization)
- Docker Compose (local development)
- No Zookeeper (Kafka KRaft mode)

## PROJECT STRUCTURE

```
my-microservices/
├── docker-compose.yml          (13 services)
├── docker/
│   ├── prometheus.yml
│   ├── init-databases.sh
│   └── grafana/
│       └── provisioning/
├── libs/shared/                (shared code)
│   ├── src/
│   │   ├── config/
│   │   │   └── sequelize.config.ts
│   │   ├── database/
│   │   ├── utils/
│   │   ├── decorators/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── proto/                      (gRPC definitions)
│   ├── common.proto
│   ├── auth.proto
│   ├── user.proto
│   ├── payment.proto
│   ├── order.proto
│   └── notification.proto
├── services/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── models/          (Sequelize models)
│   │   │   │   ├── user.model.ts
│   │   │   │   └── index.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   └── guards/
│   │   │   ├── grpc/
│   │   │   └── kafka/
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   ├── user-service/           (same structure)
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── profile.model.ts
│   │   │   │   ├── preference.model.ts
│   │   │   │   └── index.ts
│   ├── order-service/          (same structure)
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── order.model.ts
│   │   │   │   ├── order-item.model.ts
│   │   │   │   └── index.ts
│   ├── payment-service/        (same structure)
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── payment.model.ts
│   │   │   │   ├── transaction.model.ts
│   │   │   │   └── index.ts
│   └── notification-service/   (same structure)
│       ├── src/
│       │   ├── models/
│       │   │   ├── notification.model.ts
│       │   │   ├── email-log.model.ts
│       │   │   └── index.ts
├── frontend/
│   ├── public-web/             (Next.js)
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── .env.local
│   │   └── package.json
│   └── admin-web/              (Angular)
│       ├── src/
│       ├── environments/
│       ├── angular.json
│       └── package.json
└── README.md
```

## SEQUELIZE CONFIGURATION REQUIREMENTS

### Shared Library Configuration (libs/shared/src/config/sequelize.config.ts)

```typescript
// ================================================================>> Core Library
import { SequelizeModuleOptions } from '@nestjs/sequelize';

// ================================================================>> Third Party Library
import * as dotenv from 'dotenv';
import { Dialect } from 'sequelize';

dotenv.config();

/** @PostgreSQL and @MySQL */
const sequelizeConfig: SequelizeModuleOptions = {
    dialect: (process.env.DB_CONNECTION as Dialect) || 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: process.env.DB_TIMEZONE || 'Asia/Phnom_Penh',
    models: [__dirname + '/../models/**/*.model.{ts,js}'],
    logging: false,
    autoLoadModels: true,
    synchronize: process.env.NODE_ENV === 'development',
};

export default sequelizeConfig;
```

### Model Definition Example (User.model.ts)

```typescript
import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({
    tableName: 'users',
    timestamps: true,
})
export class User extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    password: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    name: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    keycloakId: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isActive: boolean;
}
```

### Model Usage in Services

```typescript
// In auth.service.ts
import User from '../models/user.model';

export class AuthService {
    async findUserByEmail(email: string) {
        const user = await User.findOne({
            where: { email }
        });
        return user;
    }

    async createUser(data: any) {
        const user = await User.create({
            email: data.email,
            password: data.password,
            name: data.name,
        });
        return user;
    }
}
```

### App Module Configuration (Each Service)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import sequelizeConfig from '@microservices/shared';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        SequelizeModule.forRoot({
            ...sequelizeConfig,
            models: [__dirname + '/models/**/*.model.{ts,js}'],
        }),
    ],
})
export class AppModule {}
```

## ENVIRONMENT VARIABLES

### Auth Service (.env)
```
NODE_ENV=development
HTTP_PORT=3001
GRPC_PORT=50051

# Database Configuration
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5455
DB_USERNAME=admin
DB_PASSWORD=admin123
DB_DATABASE=auth_db
DB_TIMEZONE=Asia/Phnom_Penh

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=auth-service

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=3600

# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=auth-service-client
KEYCLOAK_CLIENT_SECRET=<from-keycloak>
```

### User Service (.env)
```
NODE_ENV=development
HTTP_PORT=3002
GRPC_PORT=50052

# Database Configuration
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5455
DB_USERNAME=admin
DB_PASSWORD=admin123
DB_DATABASE=user_db
DB_TIMEZONE=Asia/Phnom_Penh

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=user-service

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
```

### Order Service (.env)
```
NODE_ENV=development
HTTP_PORT=3004
GRPC_PORT=50054

# Database Configuration
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5455
DB_USERNAME=admin
DB_PASSWORD=admin123
DB_DATABASE=order_db
DB_TIMEZONE=Asia/Phnom_Penh

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=order-service

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
```

### Payment Service (.env)
```
NODE_ENV=development
HTTP_PORT=3005
GRPC_PORT=50055

# Database Configuration
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5455
DB_USERNAME=admin
DB_PASSWORD=admin123
DB_DATABASE=payment_db
DB_TIMEZONE=Asia/Phnom_Penh

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=payment-service

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Payment Gateway Configuration
PAYMENT_GATEWAY_URL=https://api.stripe.com 
PAYMENT_GATEWAY_SECRET_KEY=sk_test_xxx
```

### Notification Service (.env)
```
NODE_ENV=development
HTTP_PORT=3006
GRPC_PORT=50056

# Database Configuration
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5455
DB_USERNAME=admin
DB_PASSWORD=admin123
DB_DATABASE=notification_db
DB_TIMEZONE=Asia/Phnom_Penh

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=notification-service

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@microservices.com
```

### Next.js (.env.local)
```
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8000
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=master
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=next-web-client
```

### Angular (environment.ts)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  keycloakUrl: 'http://localhost:8080',
  realm: 'master',
  clientId: 'angular-admin-client',
};
```

## DOCKER COMPOSE SERVICES (13 required)

1. PostgreSQL (port 5455)
2. Redis (port 6379)
3. Kafka (port 9092) - KRaft mode, no Zookeeper
4. Kafka UI (port 8089)
5. Kong Database (port 5433)
6. Kong Migration
7. Kong API Gateway (port 8000, 8001)
8. Keycloak (port 8080)
9. Prometheus (port 9090)
10. Grafana (port 3001)
11. Jaeger (port 16686)
12. pgAdmin (port 5050)
13. Redis Commander (port 8081)

## KEYCLOAK CONFIGURATION REQUIREMENTS

### OAuth 2.0 Clients (3 required)
1. **next-web-client** (for Next.js frontend)
   - Standard flow enabled
   - Direct access grants
   - Redirect URI: http://localhost:3000/*
   - Web Origins: http://localhost:3000

2. **angular-admin-client** (for Angular admin)
   - Standard flow enabled
   - Direct access grants
   - Redirect URI: http://localhost:4200/*
   - Web Origins: http://localhost:4200

3. **auth-service-client** (for microservices)
   - Service account enabled
   - Direct access grants
   - Client authentication enabled

### Users (2 test users)
1. testuser@example.com / password123 (role: user)
2. admin@example.com / admin123 (roles: user, admin)

### Roles
- user (standard user role)
- admin (administrator role)

### Realm
- Use "master" realm
- Create users and roles in master realm

## KONG CONFIGURATION REQUIREMENTS

### Services & Routes (5 required)
1. auth-service → http://host.docker.internal:3001  → /api/auth
2. user-service → http://host.docker.internal:3002  → /api/users
3. order-service → http://host.docker.internal:3004  → /api/orders
4. payment-service → http://host.docker.internal:3005  → /api/payments
5. notification-service → http://host.docker.internal:3006  → /api/notifications

### Plugins
- JWT validation on protected routes
- Rate limiting (100 requests per minute)
- CORS enabled

## KAFKA TOPICS TO CREATE (7 required)

1. auth.user.registered
2. auth.user.logged_in
3. order.created
4. order.updated
5. payment.processed
6. payment.failed
7. notification.email_sent

## LOGIN FLOW SPECIFICATION

### User Registration Flow
1. User visits Next.js website
2. Clicks "Register"
3. Fills form (email, password, name)
4. Auth Service validates and creates user in Keycloak
5. Auth Service creates user record in database using Sequelize
6. Kafka event emitted: auth.user.registered
7. Notification service receives event and sends welcome email
8. User confirms email
9. User can now login

### User Login Flow
1. User visits Next.js or Angular
2. Clicks "Login"
3. Redirects to Keycloak login page
4. User enters username/password
5. Keycloak authenticates user
6. Keycloak returns JWT token and refresh token
7. Frontend stores JWT in localStorage
8. Frontend redirects to dashboard
9. All API calls include JWT token in Authorization header
10. Kong validates JWT token
11. Auth Service verifies token with Keycloak
12. Services query database using Sequelize models
13. User can access all microservices

### Multi-Service Authentication
- Same JWT token works across all 5 microservices
- Each service validates token independently
- No re-authentication needed when switching services
- All services use Sequelize for database operations

## SEQUELIZE MODEL STRUCTURE

### Auth Service Models
1. **User Model** (users table)
   - id (UUID, primary key)
   - email (string, unique)
   - password (string, hashed)
   - name (string)
   - keycloakId (string, nullable)
   - isActive (boolean)
   - createdAt, updatedAt (timestamps)

### User Service Models
1. **Profile Model** (profiles table)
   - id (UUID, primary key)
   - userId (UUID, foreign key)
   - avatar (string, nullable)
   - bio (text, nullable)
   - phone (string, nullable)
   - address (string, nullable)
   - createdAt, updatedAt

2. **Preference Model** (preferences table)
   - id (UUID, primary key)
   - userId (UUID, foreign key)
   - language (string)
   - theme (string)
   - notifications (boolean)
   - createdAt, updatedAt

### Order Service Models
1. **Order Model** (orders table)
   - id (UUID, primary key)
   - userId (UUID)
   - orderNumber (string, unique)
   - totalAmount (decimal)
   - status (enum: pending, processing, completed, cancelled)
   - createdAt, updatedAt

2. **OrderItem Model** (order_items table)
   - id (UUID, primary key)
   - orderId (UUID, foreign key)
   - productName (string)
   - quantity (integer)
   - price (decimal)
   - subtotal (decimal)
   - createdAt, updatedAt

### Payment Service Models
1. **Payment Model** (payments table)
   - id (UUID, primary key)
   - orderId (UUID)
   - userId (UUID)
   - amount (decimal)
   - currency (string)
   - status (enum: pending, processing, completed, failed)
   - paymentMethod (string)
   - createdAt, updatedAt

2. **Transaction Model** (transactions table)
   - id (UUID, primary key)
   - paymentId (UUID, foreign key)
   - transactionId (string, unique)
   - gatewayResponse (jsonb)
   - status (string)
   - createdAt, updatedAt

### Notification Service Models
1. **Notification Model** (notifications table)
   - id (UUID, primary key)
   - userId (UUID)
   - type (enum: email, sms, push)
   - title (string)
   - message (text)
   - isRead (boolean)
   - createdAt, updatedAt

2. **EmailLog Model** (email_logs table)
   - id (UUID, primary key)
   - to (string)
   - from (string)
   - subject (string)
   - body (text)
   - status (enum: sent, failed, pending)
   - sentAt (datetime, nullable)
   - createdAt, updatedAt

## SERVICE COMMUNICATION PATTERNS

### Synchronous (HTTP/gRPC)
- Client → Kong → Service (REST API)
- Service → Service (gRPC, internal only)
- All database queries use Sequelize models

### Asynchronous (Kafka Events)
- Service emits event to Kafka topic
- Other services listen and react
- Database operations use Sequelize
- Examples:
  - User registers → auth.user.registered event → Notification service sends welcome email
  - Order created → order.created event → Payment service creates payment record
  - Payment processed → payment.processed event → Notification service sends receipt email

## TESTING REQUIREMENTS

### Health Check Endpoints
- All services must have GET /health endpoint
- Returns {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}

### Database Connection Test
- Each service validates Sequelize connection on startup
- Returns error if database is unreachable

### Login Test
- User can login with username/password
- Receives JWT token
- Token works for all microservices
- User data retrieved using Sequelize models

### API Test
- Can call each service endpoint with JWT token
- Kong routes requests correctly
- Services respond with appropriate data from database
- All queries use Sequelize models

### Event Test
- Kafka topics receive events
- Services react to events
- Database operations triggered by events use Sequelize
- Notification service sends emails on events

### Monitoring Test
- Prometheus collects metrics
- Grafana displays metrics
- Jaeger shows traces

## SPECIAL REQUIREMENTS

### No QR Code
- Remove all QR code generation from auth-service
- Remove all QR code scanning from Next.js frontend
- Keep standard username/password login only

### No Mobile App
- Delete Flutter app entirely
- No mobile-specific authentication flows
- No mobile OAuth configuration

### Multi-Service Login
- Single login session works across all services
- JWT token authenticates with all microservices
- No re-login needed when switching between services

### Event-Driven Architecture
- Services communicate via Kafka events
- Loose coupling between services
- Supports future scaling to 20+ services

### Database per Service Pattern
- Each service has its own PostgreSQL database
- Each service uses Sequelize ORM
- Models defined per service
- No direct database access between services

### Production-Ready
- Full observability (Prometheus, Grafana, Jaeger)
- Centralized logging capability
- Distributed tracing
- Metrics collection
- Health checks
- Error handling
- Graceful shutdown
- Database migrations with Sequelize

## DELIVERABLES

1. ✅ Complete docker-compose.yml (13 services)
2. ✅ 5 microservices (Auth, User, Order, Payment, Notification) with Sequelize
3. ✅ Sequelize configuration in shared library
4. ✅ All Sequelize models for each service
5. ✅ 2 frontends (Next.js, Angular) with login
6. ✅ Keycloak configuration (users, roles, OAuth clients)
7. ✅ Kong configuration (service routes)
8. ✅ Kafka topics (7 topics)
9. ✅ All .env files with database configuration
10. ✅ Proto files for gRPC
11. ✅ Complete project structure
12. ✅ Working login system (username/password only)
13. ✅ Full observability stack
14. ✅ Event-driven inter-service communication
15. ✅ Database operations using Sequelize models

## SUCCESS CRITERIA

When setup is complete:
- ✅ All 13 Docker containers running
- ✅ All 5 microservices accessible on their ports
- ✅ All services connected to their respective databases
- ✅ Sequelize models working correctly in all services
- ✅ Kong routes all requests to correct service
- ✅ Keycloak manages all users
- ✅ Users can login with username/password
- ✅ JWT tokens work across all services
- ✅ Database queries work using Sequelize (e.g., User.findOne({ where: { id } }))
- ✅ Kafka events flow between services
- ✅ Prometheus collects metrics
- ✅ Grafana displays metrics
- ✅ Jaeger shows traces
- ✅ All health endpoints return 200 OK
- ✅ No QR code in entire system
- ✅ No mobile app in entire system
- ✅ All database operations use Sequelize ORM

---

## INSTRUCTIONS

Please provide:

1. **Complete docker-compose.yml file** with all 13 services configured correctly (Kafka with KRaft, Kong, Keycloak, Prometheus, Grafana, Jaeger, PostgreSQL, Redis, Kafka UI, pgAdmin, Redis Commander)

2. **Shared Library (libs/shared)** with:
   - sequelize.config.ts with proper model path configuration
   - Export configuration for use in all services
   - TypeScript configuration
   - Package.json with all dependencies

3. **Complete Auth Service** (NestJS) with:
   - Sequelize configuration in app.module.ts
   - User model (models/user.model.ts)
   - Login endpoint (POST /auth/login)
   - Register endpoint (POST /auth/register)
   - Keycloak integration
   - JWT token generation
   - Kafka event emission
   - Health endpoint
   - Database queries using Sequelize models

4. **Complete User Service** (NestJS) with:
   - Sequelize configuration
   - Profile and Preference models
   - User profile endpoints
   - Kafka event listeners
   - Health endpoint
   - All Sequelize model queries

5. **Complete Order Service** (NestJS) with:
   - Sequelize configuration
   - Order and OrderItem models
   - Order creation endpoint
   - Kafka event emission
   - Health endpoint
   - All Sequelize model queries

6. **Complete Payment Service** (NestJS) with:
   - Sequelize configuration
   - Payment and Transaction models
   - Payment processing endpoint
   - Kafka event listener for orders
   - Health endpoint
   - All Sequelize model queries

7. **Complete Notification Service** (NestJS) with:
   - Sequelize configuration
   - Notification and EmailLog models
   - Kafka event listeners (order.created, payment.processed, auth.user.registered)
   - Email sending logic
   - Health endpoint
   - All Sequelize model queries

8. **Next.js Frontend** with:
   - Remove QR code completely
   - Add login form (username/password)
   - Keycloak integration
   - JWT token storage
   - Logout button
   - Authenticated API calls

9. **Angular Admin** with:
   - Remove QR code
   - Add login functionality
   - Keycloak integration
   - Protected routes

10. **All .env.example files** for each service with:
    - Database configuration (DB_CONNECTION, DB_HOST, DB_PORT, etc.)
    - All required environment variables

11. **All package.json files** with:
    - @nestjs/sequelize
    - sequelize
    - sequelize-typescript
    - pg and pg-hstore
    - All other dependencies

12. **Proto files** (payment.proto, order.proto, notification.proto)

13. **Complete project README** with:
    - Setup instructions
    - How to run all services
    - How to configure Sequelize
    - How to create models
    - How to test login
    - Port reference
    - Architecture explanation
    - Keycloak setup guide
    - Kong setup guide
    - Database migration guide

14. **Keycloak Configuration Instructions**
15. **Kong Configuration Instructions**
16. **Kafka Topic Creation Instructions**

---

Build this complete microservices system with:
- Standard username/password login (NO QR code)
- NO mobile app
- 5 microservices with Sequelize ORM
- Centralized Keycloak authentication
- Kong API gateway
- Kafka events
- Full observability
- Database per service pattern using Sequelize