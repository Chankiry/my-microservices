import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
    }));

    app.enableCors({
        origin: ['http://localhost:3000', 'http://localhost:4200'],
        credentials: true,
    });

    const config = new DocumentBuilder()
        .setTitle('Payment Service API')
        .setDescription('Payment Service for Microservices Architecture')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const grpcPort = process.env.GRPC_PORT || '50055';
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.GRPC,
        options: {
            package: 'payment',
            protoPath: join(__dirname, '../../proto/payment.proto'),
            url: `0.0.0.0:${grpcPort}`,
        },
    });

    const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.KAFKA,
        options: {
            client: {
                clientId: 'payment-service',
                brokers: kafkaBrokers.split(','),
            },
            consumer: {
                groupId: 'payment-service-consumer',
            },
        },
    });

    await app.startAllMicroservices();

    const httpPort = process.env.HTTP_PORT || 3005;
    await app.listen(httpPort);
    
    console.log(`Payment Service is running on:`);
    console.log(`  HTTP: http://localhost:${httpPort}`);
    console.log(`  gRPC: localhost:${grpcPort}`);
}

bootstrap();
