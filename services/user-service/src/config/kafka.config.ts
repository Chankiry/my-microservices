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
                brokers : configService.get<string>('KAFKA_BROKERS', 'localhost:9092').split(',').map(b => b.trim()),
                clientId: configService.get<string>('KAFKA_CLIENT_ID', 'user-service'),
            },
            consumer: {
                groupId: configService.get<string>('KAFKA_GROUP_ID', 'user-service-group'),
            },
        },
    }),
}

export default kafkaConfig;
