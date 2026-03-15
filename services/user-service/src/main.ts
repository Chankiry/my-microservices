import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as expressHandlebars from 'express-handlebars';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create HTTP application
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setBaseViewsDir(join(__dirname, '..', 'src'));
  const hbs = expressHandlebars.create({
      extname: '.html',
      layoutsDir: join(__dirname, '..', 'src'),
      defaultLayout: false,
  });
  app.engine('html', hbs.engine);
  app.setViewEngine('html');
  // Enable CORS
  // app.enableCors({
  //   origin: '*',
  //   // origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  //   credentials: true,
  // });
  
  app.enableCors({
      origin: '*',
      allowedHeaders: 'Authorization, Content-Type',
      methods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  });

  // Global validation pipe
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

  const gRPC_url = process.env.GRPC_PORT || '0.0.0.0:5001';
  
  // Connect gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, 'app/communications/grpc/proto/user.proto'),
      url: gRPC_url,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  // Start both HTTP and gRPC
  await app.startAllMicroservices();

  const httpPort = process.env.PORT || 3001;
  await app.listen(httpPort,'0.0.0.0');
  logger.log(`User Service HTTP server running on port: http://localhost:${httpPort}`);
  logger.log(`User Service gRPC server running on port: ${gRPC_url}`);
}

bootstrap();