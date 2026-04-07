// ===========================================================================>> Core Library
import { Global, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SequelizeModule } from '@nestjs/sequelize';
// ===========================================================================>> Third Party Library
import * as multer from 'multer';
// ===========================================================================>> Costom Library
import sequelizeConfig from './sequelize.config';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import kafkaConfig from './kafka.config';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';

/** @noded We use Global that allow all module can access and use all models */
@Global()
@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
        }),

        MulterModule.register({
            storage: multer.memoryStorage(),
        }),
        SequelizeModule.forRoot({
            ...sequelizeConfig
        }),
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),

        // Kafka Client
        ClientsModule.registerAsync([
            kafkaConfig,
        ]),
    ],
    providers: [],
    exports: [
        HttpModule,
        ClientsModule,
        SequelizeModule,
    ]
})

export class ConfigModule {}
