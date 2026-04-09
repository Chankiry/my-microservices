import {
    Controller, Post, Get, Body, Param,
    Headers, HttpCode, HttpStatus,
    UseGuards, Request, Res,
    UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { AuthService }    from './service';
import { ProfileService } from '../a2-profile/service';
import {
    LoginDto, RefreshDto, RegisterDto,
    ScopedTokenValidateDto, ScopedTokenRefreshDto,
    ServiceConfirmLinkDto,
    SsoLinkDto,
} from './dto';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { Public }       from '../../../core/decorators/public.decorator';
import { Response }     from 'express';
import { ResponseUtil } from '@app/shared/interfaces/base.interface';
import { AUTH_MESSAGE } from '@app/shared/enums/message.enum';

@Controller()
export class AuthController {

    constructor(
        private readonly authService    : AuthService,
        private readonly profileService : ProfileService,
    ) {}

    // ─── Register ─────────────────────────────────────────────────────────────

    @Post('register')
    @HttpCode(HttpStatus.OK)
    async register(@Res() res: Response, @Body() body: RegisterDto) {
        return this.authService.register(res, body);
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.phone, dto.password);
    }

    // ─── Platform token refresh (Keycloak JWT) ────────────────────────────────

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refresh_token);
    }

    // ─── JWKS proxy ───────────────────────────────────────────────────────────

    @Get('jwks')
    async jwks() {
        return this.authService.getJwks();
    }

    // ─── Redirect code exchange ───────────────────────────────────────────────

    @Post('login/keycloak/callback')
    @HttpCode(HttpStatus.OK)
    async keycloakCallback(@Body('code') code: string) {
        if (!code) throw new UnauthorizedException('Code is required');
        return this.profileService.exchangeRedirectCode(code);
    }

    @Post('token/validate')
    @HttpCode(HttpStatus.OK)
    @Public()
    async validateScopedToken(
        @Res()                  res      : Response,
        @Body()                 body     : ScopedTokenValidateDto,
        @Headers('x-system-id') system_id: string,
    ) {
        if (!system_id) throw new BadRequestException('x-system-id header is required');
        const result = await this.authService.validateScopedToken(body.token, system_id);
        if (!result.valid) throw new UnauthorizedException(result.error ?? 'Invalid token');
        return ResponseUtil.success(res, { user_id: result.user_id, system_id: result.system_id });
    }

    @Post('token/refresh')
    @HttpCode(HttpStatus.OK)
    @Public()
    async refreshScopedToken(
        @Res()                  res      : Response,
        @Body()                 body     : ScopedTokenRefreshDto,
        @Headers('x-system-id') system_id: string,
    ) {
        if (!system_id) throw new BadRequestException('x-system-id header is required');
        const tokens = await this.authService.refreshScopedToken(body.refresh_token, system_id);
        return ResponseUtil.success(res, tokens, AUTH_MESSAGE.TOKEN_REFRESH_SUCCESS);
    }

    @Get('link/session/:code')
    @Public()
    async getLinkSession(
        @Res()          res : Response,
        @Param('code')  code: string,
    ) {
        const session = await this.authService.getLinkSession(code);
        return ResponseUtil.success(res, session);
    }

    @Post('link/service-confirm')
    @HttpCode(HttpStatus.OK)
    @Public()
    async serviceConfirmLink(
        @Res()                          res        : Response,
        @Request()                      req        : any,
        @Body()                         body       : ServiceConfirmLinkDto,
        @Headers('x-system-id')         system_id  : string,
        @Headers('x-internal-secret')   secret     : string,
    ) {
        if (!system_id) throw new BadRequestException('x-system-id header is required');
        if (!secret)    throw new BadRequestException('x-internal-secret header is required');

        const result = await this.authService.serviceConfirmLink(
            body.code, body.external_id, system_id, secret,
        );
        if(result) await this.profileService.linkConfirm(res, req.user.sub, body); 
        return ResponseUtil.success(res, result);
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    async logout(
        @Request()                  req          : any,
        @Headers('authorization')   authHeader   : string,
        @Body('refresh_token')      refresh_token?: string,
    ) {
        const access_token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.authService.logout(access_token, refresh_token);
    }

    @Post('sso-link')
    @HttpCode(HttpStatus.OK)
    @Public()
    async ssoLink(
        @Body()                        body          : SsoLinkDto,
        @Headers('x-system-id')        system_id     : string,
        @Headers('x-internal-secret')  secret        : string,
    ) {
        if (!system_id) {
            throw new BadRequestException('x-system-id header is required');
        }
        if (!secret || secret !== process.env.INTERNAL_SERVICE_SECRET) {
            throw new UnauthorizedException('Invalid internal service secret');
        }
        // system_id from header must match body.system_id
        if (system_id !== body.system_id) {
            throw new BadRequestException('system_id mismatch between header and body');
        }

        return this.authService.ssoCreateLink(
            body.platform_user_id,
            body.system_id,
            body.external_id,
        );
    }
    
}