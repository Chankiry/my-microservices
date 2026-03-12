// ===========================================================================>> Core Library
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';

// ===========================================================================>> Third Party Library

const kafkaConfig: ClientsProviderAsyncOptions  = {
    name: 'KAFKA_SERVICE',
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
        transport: Transport.KAFKA,
        options: {
            client: {
            brokers: configService.get('KAFKA_BROKERS', 'kafka:9092').split(','),
            clientId: 'user-service',
            },
            consumer: {
            groupId: 'user-service-consumer-group',
            },
        },
    }),
}

export default kafkaConfig;
