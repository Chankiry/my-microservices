import * as dotenv from 'dotenv';

dotenv.config();

export const appConfig = {
    // STATIC & SETTING
    PORT                : process.env.PORT  || 3000,
    ENV                 : process.env.ENV   || 'PROD',
    API_PREFIX          : process.env.API_PREFIX || 'api/v1',
    SYSTEM              : 'USER SERVICE',
    
    // DATABASE CONNECTION
    DB_CONNECTION   : process.env.DB_CONNECTION || 'postgres',
    DB_HOST         : process.env.DB_HOST || '',
    DB_PORT         : process.env.DB_PORT || '',
    DB_USERNAME     : process.env.DB_USERNAME || '',
    DB_PASSWORD     : process.env.DB_PASSWORD || '',
    DB_TIMEZONE     : process.env.DB_TIMEZONE || 'UTC',
    DB_DATABASE     : process.env.DB_DATABASE || '',
    
    // FILE SERVICE
    // FILE_BASE_URL   : process.env.FILE_BASE_URL || '',
    // FILE_USERNAME   : process.env.FILE_USERNAME || '',
    // FILE_PASSWORD   : process.env.FILE_PASSWORD || '',
    
    // JWT SERVICE
    // JWT_SECRET          : process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    // JWT_EXPIRES         : process.env.JWT_EXPIRES || '3600',
    // JWT_REFRESH_SECRET  : process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production',
    // JWT_REFRESH_EXPIRES : process.env.JWT_REFRESH_EXPIRES || '7d',
  
    // TELEGRAM
    TELEGRAM_BOT_TOKEN                  : process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_LOGGER_BOT_TOKEN           : process.env.TELEGRAM_LOGGER_BOT_TOKEN || '',
    TELEGRAM_CHAT_ID                    : process.env.TELEGRAM_CHAT_ID || '',
    TELEGRAM_LOGGER_CHAT_ID             : process.env.TELEGRAM_LOGGER_CHAT_ID || '',
    TELEGRAM_LOGGER_MESSAGE_THREAD_ID   : process.env.TELEGRAM_LOGGER_MESSAGE_THREAD_ID || '',
    TELEGRAM_OTP_MESSAGE_THREAD_ID      : process.env.TELEGRAM_OTP_MESSAGE_THREAD_ID || '',

};