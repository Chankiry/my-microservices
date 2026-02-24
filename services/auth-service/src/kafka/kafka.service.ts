import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { Partitioners } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
    private readonly logger = new Logger(KafkaService.name);
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;

    constructor() {
        const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
        
        this.kafka = new Kafka({
            clientId: 'auth-service',
            brokers,
        });

        this.producer = this.kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner,
        });
        this.consumer = this.kafka.consumer({ groupId: 'auth-service-group' });
    }

    async onModuleInit() {
        await this.connect();
        await this.createTopics();
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
                        timestamp: Date.now().toString(),
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

    private async createTopics() {
        const admin = this.kafka.admin();
        await admin.connect();

        const topics = [
            'auth.user.registered',
            'auth.user.logged_in',
            'auth.user.updated',
            'auth.user.deleted',
        ];

        try {
            const existingTopics = await admin.listTopics();
            const topicsToCreate = topics.filter(topic => !existingTopics.includes(topic));

            if (topicsToCreate.length > 0) {
                await admin.createTopics({
                    topics: topicsToCreate.map(topic => ({
                        topic,
                        numPartitions: 1,
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
