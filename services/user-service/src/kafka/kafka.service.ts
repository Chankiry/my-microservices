import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';
import { UserService } from '../user/user.service';

@Injectable()
export class KafkaService implements OnModuleInit {
    private readonly logger = new Logger(KafkaService.name);
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;

    constructor(
        @Inject(forwardRef(() => UserService))  // ✅ Use forwardRef
        private userService: UserService,
    ) {
        const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
        
        this.kafka = new Kafka({
            clientId: 'user-service',
            brokers,
        });

        this.producer = this.kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner,  // ✅ Fix warning
        });
        this.consumer = this.kafka.consumer({ groupId: 'user-service-group' });
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

    private async subscribeToEvents() {
        // Subscribe to auth events
        await this.subscribe('auth.user.registered', async (message) => {
            this.logger.log('Received auth.user.registered event', message);
            await this.userService.handleUserRegistered(message);
        });
    }

    private async createTopics() {
        const admin = this.kafka.admin();
        await admin.connect();

        const topics = [
            'user.profile.created',
            'user.profile.updated',
            'user.profile.deleted',
            'user.preferences.updated',
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