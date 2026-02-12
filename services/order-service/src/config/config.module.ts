// ================================================================>> Core Library
import { Global, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SequelizeModule } from '@nestjs/sequelize';
// ================================================================>> Third Party Library
import * as multer from 'multer';
// ================================================================>> Costom Library
import sequelizeConfig from './sequelize.config';
import { HttpModule } from '@nestjs/axios';

/** @noded We use Global that allow all module can access and use all models */
@Global()
@Module({
    imports: [
        MulterModule.register({
            storage: multer.memoryStorage(),
        }),
        SequelizeModule.forRoot({
            ...sequelizeConfig,
        }),
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
    ],
    providers: [
    ],
    exports: [
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
    ]
})
export class ConfigModule { }
