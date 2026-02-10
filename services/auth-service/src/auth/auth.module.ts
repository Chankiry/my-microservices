import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KeycloakService } from './keycloak.service';
import { User } from '../models/user.model';
import { JwtStrategy } from './guards/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
    imports: [
        SequelizeModule.forFeature([User]),
        HttpModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        KeycloakService,
        JwtStrategy,
        JwtAuthGuard,
    ],
    exports: [AuthService, KeycloakService],
})
export class AuthModule {}
