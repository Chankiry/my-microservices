import { KafkaOptions, Transport } from '@nestjs/microservices';

export const kafkaConfig: KafkaOptions = {
    transport: Transport.KAFKA,
    options: {
        client: {
            clientId: process.env.KAFKA_CLIENT_ID || 'microservice-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        },
        consumer: {
            groupId: process.env.KAFKA_GROUP_ID || 'microservice-group',
        },
    },
};

export const kafkaTopics = {
    // Auth events
    AUTH_USER_REGISTERED: 'auth.user.registered',
    AUTH_USER_LOGGED_IN: 'auth.user.logged_in',
    
    // Order events
    ORDER_CREATED: 'order.created',
    ORDER_UPDATED: 'order.updated',
    ORDER_CANCELLED: 'order.cancelled',
    
    // Payment events
    PAYMENT_PROCESSED: 'payment.processed',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_REFUNDED: 'payment.refunded',
    
    // Notification events
    NOTIFICATION_EMAIL_SENT: 'notification.email_sent',
    NOTIFICATION_SMS_SENT: 'notification.sms_sent',
    NOTIFICATION_PUSH_SENT: 'notification.push_sent',
} as const;

export default kafkaConfig;
