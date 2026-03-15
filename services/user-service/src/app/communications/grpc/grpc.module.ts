import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserGrpcService } from './user-grpc.service';
import { join } from 'path';
import { UserModule } from '../../resources/r2-user/module';
import { AuthModule } from '../../resources/r1-account/a1-auth/module';

@Module({
    imports: [
        UserModule,
        AuthModule,
        ClientsModule.registerAsync([
            {
                name: 'USER_PACKAGE',
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: 'user',
                        protoPath: join(__dirname, 'proto/user.proto'),
                        url: configService.get('GRPC_URL', '0.0.0.0:5001'),
                        loader: {
                            keepCase: true,
                            longs: String,
                            enums: String,
                            defaults: true,
                            oneofs: true,
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    controllers: [UserGrpcService],
    providers: [
        UserGrpcService,  // ← must be here first
    ],
    exports: [UserGrpcService],
})
export class GrpcModule {}