import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    const app = await NestFactory.create(AppModule);

    // CORS — reads allowed origins from env, no wildcard in any environment
    const allowedOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://localhost:4200'];

    app.enableCors({
        origin: allowedOrigins,
        allowedHeaders: ['Authorization', 'Content-Type'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
    });

    // Global validation — strips unknown fields, rejects bad payloads
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // gRPC microservice (runs alongside HTTP)
    const grpcUrl = process.env.GRPC_URL || '0.0.0.0:5001';

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.GRPC,
        options: {
            package: 'user',
            protoPath: join(__dirname, 'app/communications/grpc/proto/user.proto'),
            url: grpcUrl,
            loader: {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
            },
        },
    });

    await app.startAllMicroservices();

    const httpPort = process.env.PORT || 3001;
    await app.listen(httpPort, '0.0.0.0');

    logger.log(`HTTP  → http://localhost:${httpPort}`);
    logger.log(`gRPC  → ${grpcUrl}`);
}

bootstrap();