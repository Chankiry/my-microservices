import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { appRoutes } from './app.routes';
import { AppController } from './app.controller';
import { GrpcModule } from './communications/grpc/grpc.module';
import { KafkaModule } from './communications/kafka/kafka.module';
import { AuthModule } from './resources/r1-account/a1-auth/module';
import { ProfileModule } from './resources/r1-account/a2-profile/module';
import { UserModule } from './resources/r2-user/module';
import { PublicModule } from './resources/r3-public/module';
import { ConfigModule } from '../config/config.module';
import { SyncModule } from './communications/sync/sync.module';
import { CacheModule } from './infra/cache/cache.module';
import { CacheWarmingService } from './infra/cache/cache-warming.service';
import { CacheMetricsService } from './infra/cache/cache-metrics.service';
import { CacheInvalidationListener } from './infra/cache/cache-invalidation.listener';
import { KeycloakModule } from './communications/keycloak/keycloak.module';
import { OutboxModule } from './outbox/outbox.module';

@Module({
    imports: [
        // CONFIG MODULE
        ConfigModule

        // SCHEDULE MODULE
        , ScheduleModule.forRoot()

        // SYNCH MODULE
        , SyncModule

        // OUTBOX MODULE
        , OutboxModule

        // CACHE MODULE
        , CacheModule

        // KEYCLOAK MODULE
        , KeycloakModule

        // COMMUNICATION MODULES
        , GrpcModule
        , KafkaModule

        // Modules
        , AuthModule
        , ProfileModule
        , UserModule
        , PublicModule

        // ROUTER REGISTER
        , RouterModule.register(appRoutes)
    ],
    controllers: [
        AppController
    ],
    providers: [
        CacheWarmingService,
        CacheMetricsService,
        CacheInvalidationListener,
    ],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply()
            .exclude(
            ).forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
