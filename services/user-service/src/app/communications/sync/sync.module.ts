import { Module }          from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule }    from '@nestjs/config';
import { UserSyncConsumer }   from './user-sync.consumer';
import { IdempotencyService } from './idempotency.service';
import { UserModule }         from '@app/resources/r2-user/module';
import ProcessedEvent         from '@models/sync/processed-event.model';
import SystemRole             from '@models/system/system-role.model';
import UserSystemRole         from '@models/user/user-system-role.model';
import System                 from '@models/system/system.model';

@Module({
    imports: [
        ConfigModule,
        SequelizeModule.forFeature([
            ProcessedEvent,
            SystemRole,
            UserSystemRole,
            System,
        ]),
        UserModule,
    ],
    providers: [UserSyncConsumer, IdempotencyService],
    exports  : [IdempotencyService],
})
export class SyncModule {}