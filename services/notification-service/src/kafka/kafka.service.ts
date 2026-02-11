import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class KafkaService implements OnModuleInit {
    private readonly logger = new Logger(KafkaService.name);
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;

    constructor(
        @Inject(forwardRef(() => NotificationService))  // ✅ Use forwardRef
        private notificationService: NotificationService,
    ) {
        const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
        
        this.kafka = new Kafka({
            clientId: 'notification-service',
            brokers,
        });

        this.producer = this.kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner,  // ✅ Fix warning
        });
        this.consumer = this.kafka.consumer({ groupId: 'notification-service-group' });
    }

    async onModuleInit() {
        await this.connect();
        await this.createTopics();
        await this.subscribeToEvents();
    }

    async connect() {
        try {
            await this.producer.connect();
            await this.consumer.connect();
            this.logger.log('Connected to Kafka');
        } catch (error) {
            this.logger.error('Failed to connect to Kafka', error);
        }
    }

    async disconnect() {
        await this.producer.disconnect();
        await this.consumer.disconnect();
    }

    async emit(topic: string, message: any) {
        try {
            await this.producer.send({
                topic,
                messages: [
                    {
                        value: JSON.stringify(message),
                    },
                ],
            });
            this.logger.log(`Message sent to topic: ${topic}`);
        } catch (error) {
            this.logger.error(`Failed to send message to topic: ${topic}`, error);
            throw error;
        }
    }

    private async subscribeToEvents() {
        // Subscribe to auth events
        await this.subscribe('auth.user.registered', async (message) => {
            this.logger.log('Received auth.user.registered event', message);
            try {
                await this.notificationService.handleUserRegistered(message);
            } catch (error) {
                this.logger.error('Failed to handle auth.user.registered event', error);
            }
        });

        // Subscribe to order events
        await this.subscribe('order.created', async (message) => {
            this.logger.log('Received order.created event', message);
            try {
                await this.notificationService.handleOrderCreated(message);
            } catch (error) {
                this.logger.error('Failed to handle order.created event', error);
            }
        });

        // Subscribe to payment events
        await this.subscribe('payment.processed', async (message) => {
            this.logger.log('Received payment.processed event', message);
            try {
                await this.notificationService.handlePaymentProcessed(message);
            } catch (error) {
                this.logger.error('Failed to handle payment.processed event', error);
            }
        });
    }

    async subscribe(topic: string, callback: (message: any) => Promise<void>) {
        try {
            await this.consumer.subscribe({ topic, fromBeginning: false });
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    const value = message.value?.toString();
                    if (value) {
                        try {
                            const parsedMessage = JSON.parse(value);
                            await callback(parsedMessage);
                        } catch (error) {
                            this.logger.error('Failed to parse message', error);
                        }
                    }
                },
            });
            this.logger.log(`Subscribed to topic: ${topic}`);
        } catch (error) {
            this.logger.error(`Failed to subscribe to topic: ${topic}`, error);
            throw error;
        }
    }

    private async createTopics() {
        const admin = this.kafka.admin();
        await admin.connect();

        const topics = [
            'notification.email_sent',
            'notification.sms_sent',
            'notification.push_sent',
        ];

        try {
            const existingTopics = await admin.listTopics();
            const topicsToCreate = topics.filter(topic => !existingTopics.includes(topic));

            if (topicsToCreate.length > 0) {
                await admin.createTopics({
                    topics: topicsToCreate.map(topic => ({
                        topic,
                        numPartitions: 3,
                        replicationFactor: 1,
                    })),
                });
                this.logger.log(`Created Kafka topics: ${topicsToCreate.join(', ')}`);
            }
        } catch (error) {
            this.logger.error('Failed to create Kafka topics', error);
        } finally {
            await admin.disconnect();
        }
    }
}