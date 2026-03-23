import {
    Controller, Post, Get, Body,
    Headers, HttpCode, HttpStatus,
    UseGuards, Request,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './service';
import { LoginDto, RefreshDto, RegisterDto } from './dto';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';

@Controller()
export class AuthController {

    constructor(private readonly authService: AuthService) {}

    // ─── Public endpoints ─────────────────────────────────────────────────────

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

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

    @Post('login/keycloak/callback')
    @HttpCode(HttpStatus.OK)
    async keycloakCallback(@Body('code') code: string) {
        return this.authService.exchangeCodeForToken(code);
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