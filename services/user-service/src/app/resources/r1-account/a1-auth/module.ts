import { Module } from '@nestjs/common';
import { AuthService } from './service';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from '@app/core/strategies/jwt.strategy';
import { CacheModule } from '@app/infra/cache/cache.module';

@Module({
    imports: [CacheModule, ConfigModule],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
