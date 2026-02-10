# Microservices Architecture Platform

A complete microservices-based system with 5 NestJS services, 2 frontends (Next.js & Angular), centralized authentication via Keycloak, API Gateway via Kong, event-driven communication via Kafka, and full observability stack.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌──────────────┐    ┌──────────────┐                                       │
│  │  Next.js     │    │   Angular    │                                       │
│  │  (Public)    │    │   (Admin)    │                                       │
│  │  Port: 3000  │    │  Port: 4200  │                                       │
│  └──────┬───────┘    └──────┬───────┘                                       │
└─────────┼───────────────────┼───────────────────────────────────────────────┘
          │                   │
          └─────────┬─────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────────────────┐
│                           API GATEWAY (Kong)                                │
│                         Port: 8000 (Proxy)                                  │
│                         Port: 8001 (Admin)                                  │
└───────────────────┬─────────────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
┌───────▼───┐ ┌────▼────┐ ┌────▼────┐
│  Auth     │ │  User   │ │  Order  │
│ Service   │ │ Service │ │ Service │
│ Port:3001 │ │Port:3002│ │Port:3004│
└─────┬─────┘ └────┬────┘ └────┬────┘
      │            │           │
      │    ┌───────┴───────────┴───────┐
      │    │                           │
┌─────▼────▼─────┐              ┌──────▼──────┐
│   PostgreSQL   │              │    Kafka    │
│   Port: 5455   │              │  Port:9092  │
│  (5 databases) │              │ (KRaft mode)│
└────────────────┘              └─────────────┘
                                         │
                              ┌──────────┼──────────┐
                              │          │          │
                        ┌─────▼───┐ ┌────▼────┐ ┌───▼─────┐
                        │ Payment │ │Notify   │ │  Other  │
                        │ Service │ │Service  │ │Services │
                        │Port:3005│ │Port:3006│ │  ...    │
                        └────┬────┘ └────┬────┘ └─────────┘
                             │           │
                             └─────┬─────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼─────┐  ┌─────▼────┐  ┌─────▼────┐
              │ Prometheus│  │ Grafana  │  │  Jaeger  │
              │ Port:9090 │  │Port:3001 │  │Port:16686│
              └───────────┘  └──────────┘  └──────────┘
```

## Services Overview

| Service | Port | Database | gRPC Port | Description |
|---------|------|----------|-----------|-------------|
| Auth Service | 3001 | auth_db | 50051 | User authentication & JWT |
| User Service | 3002 | user_db | 50052 | User profiles & preferences |
| Order Service | 3004 | order_db | 50054 | Order management |
| Payment Service | 3005 | payment_db | 50055 | Payment processing |
| Notification Service | 3006 | notification_db | 50056 | Email & notifications |

## Infrastructure Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5455 | Main database |
| Redis | 6379 | Caching |
| Kafka | 9092 | Message broker (KRaft mode) |
| Kafka UI | 8089 | Kafka management UI |
| Kong | 8000/8001 | API Gateway |
| Keycloak | 8080 | Identity & Access Management |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Metrics visualization |
| Jaeger | 16686 | Distributed tracing |
| pgAdmin | 5050 | Database management UI |
| Redis Commander | 8081 | Redis management UI |

## Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- Node.js 20+ (for local development)
- npm 10+ or yarn 1.22+

## Quick Start

### 1. Clone and Navigate

```bash
cd my-microservices
```

### 2. Start Infrastructure Services

```bash
docker-compose up -d postgres redis kafka kong-database keycloak

# Wait for services to be healthy (about 30-60 seconds)
docker-compose ps
```

### 3. Configure Keycloak

1. Open http://localhost:8080
2. Login with admin/admin123
3. Create OAuth clients:

#### Client: next-web-client (for Next.js)
- Client ID: `next-web-client`
- Client Protocol: `openid-connect`
- Access Type: `public`
- Standard Flow Enabled: `ON`
- Direct Access Grants Enabled: `ON`
- Valid Redirect URIs: `http://localhost:3000/*`
- Web Origins: `http://localhost:3000`

#### Client: angular-admin-client (for Angular)
- Client ID: `angular-admin-client`
- Client Protocol: `openid-connect`
- Access Type: `public`
- Standard Flow Enabled: `ON`
- Direct Access Grants Enabled: `ON`
- Valid Redirect URIs: `http://localhost:4200/*`
- Web Origins: `http://localhost:4200`

#### Client: auth-service-client (for microservices)
- Client ID: `auth-service-client`
- Client Protocol: `openid-connect`
- Access Type: `confidential`
- Service Accounts Enabled: `ON`
- Direct Access Grants Enabled: `ON`
- Valid Redirect URIs: `*`

4. Create test users:

```bash
# User: testuser@example.com / password123
# User: admin@example.com / admin123
```

5. Create roles: `user`, `admin`

### 4. Configure Kong API Gateway

```bash
# Wait for Kong to be ready
curl http://localhost:8001/status

# Add services
# Auth Service
curl -X POST http://localhost:8001/services \
  --data name=auth-service \
  --data url=http://host.docker.internal:3001

# User Service
curl -X POST http://localhost:8001/services \
  --data name=user-service \
  --data url=http://host.docker.internal:3002

# Order Service
curl -X POST http://localhost:8001/services \
  --data name=order-service \
  --data url=http://host.docker.internal:3004

# Payment Service
curl -X POST http://localhost:8001/services \
  --data name=payment-service \
  --data url=http://host.docker.internal:3005

# Notification Service
curl -X POST http://localhost:8001/services \
  --data name=notification-service \
  --data url=http://host.docker.internal:3006
```

### 5. Add Kong Routes

```bash
# Auth routes
curl -X POST http://localhost:8001/services/auth-service/routes \
  --data name=auth-routes \
  --data paths[]=/api/auth

# User routes
curl -X POST http://localhost:8001/services/user-service/routes \
  --data name=user-routes \
  --data paths[]=/api/users

# Order routes
curl -X POST http://localhost:8001/services/order-service/routes \
  --data name=order-routes \
  --data paths[]=/api/orders

# Payment routes
curl -X POST http://localhost:8001/services/payment-service/routes \
  --data name=payment-routes \
  --data paths[]=/api/payments

# Notification routes
curl -X POST http://localhost:8001/services/notification-service/routes \
  --data name=notification-routes \
  --data paths[]=/api/notifications
```

### 6. Start All Services

```bash
docker-compose up -d
```

### 7. Verify Services

```bash
# Check all containers
docker-compose ps

# Test health endpoints
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
```

## Development

### Running Services Locally

#### Auth Service
```bash
cd services/auth-service
npm install
cp .env.example .env
npm run start:dev
```

#### User Service
```bash
cd services/user-service
npm install
cp .env.example .env
npm run start:dev
```

#### Order Service
```bash
cd services/order-service
npm install
cp .env.example .env
npm run start:dev
```

#### Payment Service
```bash
cd services/payment-service
npm install
cp .env.example .env
npm run start:dev
```

#### Notification Service
```bash
cd services/notification-service
npm install
cp .env.example .env
npm run start:dev
```

### Running Frontends

#### Next.js (Public Website)
```bash
cd frontend/public-web
npm install
npm run dev
```
Open http://localhost:3000

#### Angular (Admin Dashboard)
```bash
cd frontend/admin-web
npm install
ng serve
```
Open http://localhost:4200

## API Documentation

Each service exposes Swagger UI at `/api/docs`:

- Auth Service: http://localhost:3001/api/docs
- User Service: http://localhost:3002/api/docs
- Order Service: http://localhost:3004/api/docs
- Payment Service: http://localhost:3005/api/docs
- Notification Service: http://localhost:3006/api/docs

## Kafka Topics

| Topic | Description | Producer | Consumer |
|-------|-------------|----------|----------|
| auth.user.registered | User registration | Auth Service | Notification Service |
| auth.user.logged_in | User login | Auth Service | - |
| order.created | New order | Order Service | Payment, Notification |
| order.updated | Order status update | Order Service | - |
| order.cancelled | Order cancellation | Order Service | - |
| payment.processed | Payment success | Payment Service | Notification Service |
| payment.failed | Payment failure | Payment Service | Notification Service |
| payment.refunded | Payment refund | Payment Service | Notification Service |
| notification.email_sent | Email sent | Notification Service | - |

## Database Schema

### Auth Service (auth_db)
- `users` - User accounts with Keycloak integration

### User Service (user_db)
- `profiles` - User profile information
- `preferences` - User preferences (language, theme, notifications)

### Order Service (order_db)
- `orders` - Order information
- `order_items` - Order line items

### Payment Service (payment_db)
- `payments` - Payment records
- `transactions` - Payment transactions

### Notification Service (notification_db)
- `notifications` - In-app notifications
- `email_logs` - Email sending logs

## Monitoring & Observability

### Prometheus
- URL: http://localhost:9090
- Scrapes metrics from all services

### Grafana
- URL: http://localhost:3001
- Credentials: admin/admin123
- Pre-configured dashboards for service metrics

### Jaeger
- URL: http://localhost:16686
- Distributed tracing across all services

### Kafka UI
- URL: http://localhost:8089
- Monitor Kafka topics and messages

### pgAdmin
- URL: http://localhost:5050
- Credentials: admin@microservices.com / admin123

### Redis Commander
- URL: http://localhost:8081
- Redis data management

## Testing

### Health Checks
```bash
# All services
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
```

### Authentication Flow
```bash
# 1. Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "Test User"
  }'

# 2. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# 3. Access protected endpoint
curl http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Order Flow
```bash
# Create order
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "USER_UUID",
    "items": [
      {
        "productName": "Product 1",
        "quantity": 2,
        "price": 29.99
      }
    ]
  }'
```

## Troubleshooting

### Services not starting
```bash
# Check logs
docker-compose logs -f SERVICE_NAME

# Restart service
docker-compose restart SERVICE_NAME
```

### Database connection issues
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check databases exist
docker-compose exec postgres psql -U admin -l
```

### Kafka issues
```bash
# Check Kafka status
docker-compose logs kafka

# List topics
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### Keycloak issues
```bash
# Check Keycloak logs
docker-compose logs keycloak

# Verify realm exists
curl http://localhost:8080/realms/master
```

## Project Structure

```
my-microservices/
├── docker-compose.yml          # All 13 services
├── docker/
│   ├── prometheus.yml          # Prometheus config
│   ├── init-databases.sh       # DB initialization
│   └── grafana/
│       └── provisioning/       # Grafana dashboards
├── libs/shared/                # Shared code library
│   └── src/
│       ├── config/
│       │   ├── sequelize.config.ts
│       │   ├── kafka.config.ts
│       │   └── redis.config.ts
│       ├── decorators/
│       └── utils/
├── proto/                      # gRPC definitions
│   ├── common.proto
│   ├── auth.proto
│   ├── user.proto
│   ├── order.proto
│   ├── payment.proto
│   └── notification.proto
├── services/
│   ├── auth-service/           # Port 3001
│   ├── user-service/           # Port 3002
│   ├── order-service/          # Port 3004
│   ├── payment-service/        # Port 3005
│   └── notification-service/   # Port 3006
└── frontend/
    ├── public-web/             # Next.js - Port 3000
    └── admin-web/              # Angular - Port 4200
```

## Technology Stack

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **ORM**: Sequelize with sequelize-typescript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Message Broker**: Kafka (KRaft mode)
- **gRPC**: Protocol Buffers
- **Authentication**: Keycloak 23

### Frontend
- **Public Website**: Next.js 14 + React 18
- **Admin Dashboard**: Angular 17
- **Styling**: Tailwind CSS
- **Keycloak Integration**: keycloak-js, @react-keycloak/web, keycloak-angular

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **API Gateway**: Kong 3.5
- **Monitoring**: Prometheus + Grafana
- **Tracing**: Jaeger

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues and questions, please open a GitHub issue.
