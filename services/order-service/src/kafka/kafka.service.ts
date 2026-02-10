import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
    private readonly logger = new Logger(KafkaService.name);
    private kafka: Kafka;
    private producer: Producer;

    constructor() {
        const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
        
        this.kafka = new Kafka({
            clientId: 'order-service',
            brokers,
        });

        this.producer = this.kafka.producer();
    }

    async onModuleInit() {
        await this.connect();
        await this.createTopics();
    }

    async connect() {
        try {
            await this.producer.connect();
            this.logger.log('Connected to Kafka');
        } catch (error) {
            this.logger.error('Failed to connect to Kafka', error);
        }
    }

    async disconnect() {
        await this.producer.disconnect();
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

    private async createTopics() {
        const admin = this.kafka.admin();
        await admin.connect();

        const topics = [
            'order.created',
            'order.updated',
            'order.cancelled',
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
