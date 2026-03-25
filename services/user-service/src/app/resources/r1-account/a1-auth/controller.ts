import {
    Controller, Post, Get, Body,
    Headers, HttpCode, HttpStatus,
    UseGuards, Request,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService }       from './service';
import { LoginDto, RefreshDto } from './dto';
import { JwtAuthGuard }      from '../../../core/guards/jwt-auth.guard';
import { ProfileService }    from '../a2-profile/service';

@Controller()
export class AuthController {

    constructor(
        private readonly authService    : AuthService,
        private readonly profileService : ProfileService,
    ) {}

    // ─── Public endpoints ─────────────────────────────────────────────────────

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.phone, dto.password);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refresh_token);
    }

    @Get('jwks')
    async jwks() {
        return this.authService.getJwks();
    }

    // ─── Redirect code exchange ───────────────────────────────────────────────
    // External system backends call this to exchange the one-time code
    // (received in their callback URL) for the actual token.
    //
    // POST /auth/login/keycloak/callback
    // Body: { code: "<one-time-code>" }
    // Returns: { access_token, user_id, system_id }

    @Post('login/keycloak/callback')
    @HttpCode(HttpStatus.OK)
    async keycloakCallback(@Body('code') code: string) {
        if (!code) {
            throw new UnauthorizedException('Code is required');
        }
        return this.profileService.exchangeRedirectCode(code);
    }

    // ─── Protected endpoint ───────────────────────────────────────────────────

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    async logout(
        @Request() req: any,
        @Headers('authorization') authHeader: string,
        @Body('refresh_token') refresh_token?: string,
    ) {
        const access_token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.authService.logout(access_token, refresh_token);
    }
}