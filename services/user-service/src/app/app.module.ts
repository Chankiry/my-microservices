import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from 'src/config/config.module';
import { appRoutes } from './app.routes';
import { AppController } from './app.controller';
import { appConfig } from 'src/config/app.config';

@Module({
    imports: [
        // CONFIG MODULE
        ConfigModule,
        ScheduleModule.forRoot(),

        // ROUTER REGISTER
        RouterModule.register(appRoutes)
    ],
    controllers: [
        AppController
    ],
    providers: [],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply()
            .exclude(
            ).forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
