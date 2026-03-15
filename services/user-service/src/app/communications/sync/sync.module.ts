import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserSyncConsumer } from './user-sync.consumer';
import { IdempotencyService } from './idempotency.service';
import { UserModule } from '@app/resources/r2-user/module';
import ProcessedEvent from '@app/models/sync/processed-event.model';

@Module({
    imports: [
         SequelizeModule.forFeature([ProcessedEvent]),
        UserModule, // import so we can inject UsersService
    ],
    providers: [UserSyncConsumer, IdempotencyService],
    exports: [IdempotencyService],
})
export class SyncModule {}