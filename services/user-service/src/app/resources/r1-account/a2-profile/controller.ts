import {
    Controller, Get, Patch, Post, Delete,
    Body, Param, Request, Headers,
    UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ProfileService }   from './service';
import {
    UpdateProfileDto, ChangePasswordDto,
    ChangeEmailDto, ChangePhoneDto, ConnectSystemDto,
    SsoNavigateDto, ValidateRedirectDto, RedirectLinkDto,
} from './dto';
import { JwtAuthGuard }     from '../../../core/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProfileController {

    constructor(private readonly profileService: ProfileService) {}

    // ─── Profile ──────────────────────────────────────────────────────────────

    @Get()
    async getProfile(@Request() req: any) {
        return this.profileService.getProfile(req.user.sub);
    }

    @Patch()
    async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
        return this.profileService.updateProfile(req.user.sub, dto);
    }

    @Patch('password')
    async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
        return this.profileService.changePassword(req.user.sub, dto);
    }

    @Patch('email')
    async changeEmail(@Request() req: any, @Body() dto: ChangeEmailDto) {
        return this.profileService.changeEmail(req.user.sub, dto);
    }

    @Patch('phone')
    async changePhone(@Request() req: any, @Body() dto: ChangePhoneDto) {
        return this.profileService.changePhone(req.user.sub, dto);
    }

    // ─── System connection ────────────────────────────────────────────────────

    @Get('systems/available')
    async getAvailableSystems(@Request() req: any) {
        return this.profileService.getAvailableSystems(req.user.sub);
    }

    @Post('systems/connect')
    @HttpCode(HttpStatus.CREATED)
    async connectSystem(@Request() req: any, @Body() dto: ConnectSystemDto) {
        return this.profileService.connectSystem(req.user.sub, dto);
    }

    @Delete('systems/:system_id/disconnect')
    @HttpCode(HttpStatus.OK)
    async disconnectSystem(
        @Request() req: any,
        @Param('system_id') system_id: string,
    ) {
        return this.profileService.disconnectSystem(req.user.sub, system_id);
    }


    // ─── SSO Navigate ─────────────────────────────────────────────────────────

    @Post('systems/sso-navigate')
    @HttpCode(HttpStatus.OK)
    async ssoNavigate(
        @Request() req: any,
        @Headers('authorization') authHeader: string,
        @Body() dto: SsoNavigateDto,
    ) {
        const access_token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.getSsoNavigateUrl(req.user.sub, dto.system_id, access_token);
    }


    // ─── Redirect Login (Phase 7) ─────────────────────────────────────────────

    @Post('redirect/validate')
    @HttpCode(HttpStatus.OK)
    async validateRedirect(
        @Request() req: any,
        @Headers('authorization') authHeader: string,
        @Body() dto: ValidateRedirectDto,
    ) {
        const access_token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.validateRedirectLogin(
            req.user.sub,
            dto.system_id,
            dto.redirect_uri,
            dto.action,
            access_token,
        );
    }


    @Post('redirect/link')
    @HttpCode(HttpStatus.OK)
    async redirectLink(
        @Request() req: any,
        @Body() dto: RedirectLinkDto,
    ) {
        return this.profileService.redirectLinkAccount(
            req.user.sub,
            dto.system_id,
            dto.redirect_uri,
            dto.username,
            dto.password,
        );
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Request() req: any,
        @Headers('authorization') authHeader: string,
    ) {
        const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.logout(req.user.sub, token);
    }
}