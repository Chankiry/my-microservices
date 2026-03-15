import { Module } from '@nestjs/common';
import { AuthService } from './service';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '../../../cache/cache.module';
import { JwtStrategy } from '@app/core/strategies/jwt.strategy';

@Module({
    imports: [CacheModule, ConfigModule],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
