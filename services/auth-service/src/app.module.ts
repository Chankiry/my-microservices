import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { KafkaModule } from './kafka/kafka.module';
import { GrpcModule } from './grpc/grpc.module';

// Sequelize configuration
const sequelizeConfig = {
    dialect: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5455,
    username: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_DATABASE || 'auth_db',
    timezone: process.env.DB_TIMEZONE || 'Asia/Phnom_Penh',
    models: [__dirname + '/models/**/*.model.{ts,js}'],
    logging: false,
    autoLoadModels: true,
    synchronize: process.env.NODE_ENV === 'development',
};

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        SequelizeModule.forRoot(sequelizeConfig),
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: parseInt(process.env.JWT_EXPIRATION, 10) || 3600 },
        }),
        AuthModule,
        HealthModule,
        KafkaModule,
        GrpcModule,
        ConfigModule,
    ],
})
export class AppModule {}
