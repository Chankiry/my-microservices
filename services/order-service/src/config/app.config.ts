import * as dotenv from 'dotenv';
dotenv.config();

export const appConfig = {
  // ==========================================
  // Application Configuration
  // ==========================================
  NODE_ENV: process.env.NODE_ENV || 'development',
  HTTP_PORT: parseInt(process.env.HTTP_PORT, 10) || 3001,
  GRPC_PORT: parseInt(process.env.GRPC_PORT, 10) || 50051,
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  SYSTEM: 'my-microservice',
  API_PREFIX: 'api',
  
  // ==========================================
  // Session & Security Settings
  // ==========================================
  SESSION_LENGTH: 4,
  CODE_LENGTH: 6,
  OTP_EXPIRE_IN: '3m',
  QR_LOGIN_EXPIRE_IN: '3m',
  
  // ==========================================
  // Database Configuration (PostgreSQL)
  // ==========================================
  DB_CONNECTION: process.env.DB_CONNECTION || 'postgres',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5455,
  DB_USERNAME: process.env.DB_USERNAME || 'admin',
  DB_PASSWORD: process.env.DB_PASSWORD || 'admin123',
  DB_DATABASE: process.env.DB_DATABASE || 'auth_db',
  DB_TIMEZONE: process.env.DB_TIMEZONE || 'Asia/Phnom_Penh',
  
  // ==========================================
  // Redis Configuration
  // ==========================================
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  
  // ==========================================
  // Kafka Configuration
  // ==========================================
  KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'localhost:9092',
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'auth-service',
  KAFKAJS_NO_PARTITIONER_WARNING: process.env.KAFKAJS_NO_PARTITIONER_WARNING || '1',
  
  // ==========================================
  // JWT Configuration
  // ==========================================
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRATION: parseInt(process.env.JWT_EXPIRATION, 10) || 3600,
  
  // ==========================================
  // Keycloak Configuration
  // ==========================================
  KEYCLOAK_URL: process.env.KEYCLOAK_URL || 'http://localhost:8080',
  KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || 'master',
  KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || 'auth-service-client',
  KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET || '',
  
  // ==========================================
  // Prometheus Metrics
  // ==========================================
  METRICS_PORT: parseInt(process.env.METRICS_PORT, 10) || 9091,
};