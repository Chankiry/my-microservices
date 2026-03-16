import * as dotenv from 'dotenv';

dotenv.config();

export const appConfig = {

    // ── Application ───────────────────────────────────────────────────────
    ENV        : process.env.ENV        || 'dev',
    PORT       : process.env.PORT       || '3001',
    GRPC_URL   : process.env.GRPC_URL   || '0.0.0.0:5001',
    API_PREFIX : process.env.API_PREFIX || 'api/v1',
    SYSTEM     : process.env.SYSTEM     || 'USER SERVICE',

    // ── Database ──────────────────────────────────────────────────────────
    DB_CONNECTION : process.env.DB_CONNECTION || 'postgres',
    DB_HOST       : process.env.DB_HOST       || 'localhost',
    DB_PORT       : process.env.DB_PORT       || '5455',
    DB_USERNAME   : process.env.DB_USERNAME   || '',
    DB_PASSWORD   : process.env.DB_PASSWORD   || '',
    DB_TIMEZONE   : process.env.DB_TIMEZONE   || 'UTC',
    DB_DATABASE   : process.env.DB_DATABASE   || '',

    // ── Keycloak ──────────────────────────────────────────────────────────
    KEYCLOAK_URL                : process.env.KEYCLOAK_URL                || 'http://localhost:8080',
    KEYCLOAK_REALM              : process.env.KEYCLOAK_REALM              || 'microservices-platform',
    KEYCLOAK_CLIENT_ID          : process.env.KEYCLOAK_CLIENT_ID          || '',
    KEYCLOAK_ADMIN_CLIENT_ID    : process.env.KEYCLOAK_ADMIN_CLIENT_ID    || '',
    KEYCLOAK_ADMIN_CLIENT_SECRET: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET|| '',

    // ── Kafka ─────────────────────────────────────────────────────────────
    KAFKA_BROKERS   : process.env.KAFKA_BROKERS    || 'localhost:9092',
    KAFKA_CLIENT_ID : process.env.KAFKA_CLIENT_ID  || 'user-service',
    KAFKA_GROUP_ID  : process.env.KAFKA_GROUP_ID   || 'user-service-group',

    // ── Redis ─────────────────────────────────────────────────────────────
    REDIS_HOST   : process.env.REDIS_HOST   || 'localhost',
    REDIS_PORT   : process.env.REDIS_PORT   || '6379',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    REDIS_DB     : process.env.REDIS_DB     || '0',
    REDIS_PREFIX : process.env.REDIS_PREFIX || 'user:ms:',
    CACHE_TTL    : Number(process.env.CACHE_TTL) || 1800,

    // ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS : process.env.CORS_ORIGINS || 'http://localhost:3000',

    // ── Telegram (optional) ───────────────────────────────────────────────
    TELEGRAM_BOT_TOKEN                : process.env.TELEGRAM_BOT_TOKEN                || '',
    TELEGRAM_LOGGER_BOT_TOKEN         : process.env.TELEGRAM_LOGGER_BOT_TOKEN         || '',
    TELEGRAM_CHAT_ID                  : process.env.TELEGRAM_CHAT_ID                  || '',
    TELEGRAM_LOGGER_CHAT_ID           : process.env.TELEGRAM_LOGGER_CHAT_ID           || '',
    TELEGRAM_LOGGER_MESSAGE_THREAD_ID : process.env.TELEGRAM_LOGGER_MESSAGE_THREAD_ID || '',
    TELEGRAM_OTP_MESSAGE_THREAD_ID    : process.env.TELEGRAM_OTP_MESSAGE_THREAD_ID    || '',
};