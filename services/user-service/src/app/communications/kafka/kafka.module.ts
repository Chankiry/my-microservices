import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './kafka-producer.service';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name   : 'KAFKA_CLIENT',
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.KAFKA,
                    options: {
                        client: {
                            brokers : configService.get<string>('KAFKA_BROKERS', 'localhost:9092')
                                        .split(',').map((b: string) => b.trim()),
                            clientId: configService.get<string>('KAFKA_CLIENT_ID', 'user-service'),
                        },
                        producer: {
                            allowAutoTopicCreation: true,
                            idempotent            : true,
                        },
                        consumer: {
                            groupId: configService.get<string>('KAFKA_GROUP_ID', 'user-service-group'),
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    providers: [KafkaProducerService],
    exports  : [KafkaProducerService],
})
export class KafkaModule {}