import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './controller';
import { AppService } from './service';
import App from '../../../models/system/system.model';

@Module({
    imports    : [SequelizeModule.forFeature([App])],
    controllers: [AppController],
    providers  : [AppService],
    exports    : [AppService],
})
export class AppsModule {}