import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { appRoutes } from './app.routes';
import { AppController } from './app.controller';
import { GrpcModule } from './communications/grpc/grpc.module';
import { KafkaModule } from './communications/kafka/kafka.module';
import { KeycloakAdminService } from './communications/keycloak/keycloak-admin.service';
import { KeycloakSyncService } from './communications/keycloak/keycloak-sync.service';
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

@Module({
    imports: [
        // CONFIG MODULE
        ConfigModule

        // SYNCH MODULE
        , SyncModule

        // SCHEDULE MODULE
        , ScheduleModule.forRoot()

        // CACHE MODULE
        , CacheModule

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
        KeycloakAdminService,
        KeycloakSyncService,
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
