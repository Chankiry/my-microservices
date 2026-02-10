import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
    // Create HTTP server
    const app = await NestFactory.create(AppModule);
    
    // Enable validation
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));

    // Enable CORS
    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:4200'],
        credentials: true,
    });

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('User Service API')
        .setDescription('User Service for Microservices Architecture')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Create gRPC microservice
    const grpcPort = process.env.GRPC_PORT || '50052';
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.GRPC,
        options: {
            package: 'user',
            protoPath: join(__dirname, '../../proto/user.proto'),
            url: `0.0.0.0:${grpcPort}`,
        },
    });

    // Create Kafka microservice
    const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.KAFKA,
        options: {
            client: {
                clientId: 'user-service',
                brokers: kafkaBrokers.split(','),
            },
            consumer: {
                groupId: 'user-service-consumer',
            },
        },
    });

    // Start microservices
    await app.startAllMicroservices();

    // Start HTTP server
    const httpPort = process.env.HTTP_PORT || 3002;
    await app.listen(httpPort);
    
    console.log(`User Service is running on:`);
    console.log(`  HTTP: http://localhost:${httpPort}`);
    console.log(`  gRPC: localhost:${grpcPort}`);
    console.log(`  Swagger: http://localhost:${httpPort}/api/docs`);
}

bootstrap();
