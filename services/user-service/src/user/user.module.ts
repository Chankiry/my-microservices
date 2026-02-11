import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import Profile from 'src/models/profile.model';
import Preference from 'src/models/preference.model';
import { KafkaModule } from 'src/kafka/kafka.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Profile, Preference]),
        forwardRef(() => KafkaModule),
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
