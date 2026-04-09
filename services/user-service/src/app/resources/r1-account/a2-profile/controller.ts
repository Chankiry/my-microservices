import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Request, Headers,
    HttpCode, HttpStatus, UseGuards, Res,
} from '@nestjs/common';
import { ProfileService }        from './service';
import { JwtAuthGuard }          from '../../../core/guards/jwt-auth.guard';
import {
    UpdateProfileDto, ConnectSystemDto,
    ChangePasswordDto, ChangeEmailDto, ChangePhoneDto,
    SsoNavigateDto, ValidateRedirectDto, RedirectLinkDto,
    LinkInitiateDto, ServiceInitiatedConfirmDto,
    LinkConfirmDto,
} from './dto';
import { Response } from 'express';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProfileController {

    constructor(private readonly profileService: ProfileService) {}

    // ─── Read profile ─────────────────────────────────────────────────────────

    @Get('me')
    async getMe(@Res() res: Response, @Request() req: any) {
        return this.profileService.getMe(res, req.user.sub);
    }

    @Get()
    async getProfile(@Res() res: Response, @Request() req: any) {
        return this.profileService.getProfile(res, req.user.sub);
    }

    // ─── Update profile ───────────────────────────────────────────────────────

    @Patch()
    async updateProfile(
        @Res()      res: Response,
        @Request()  req: any,
        @Body()     body: UpdateProfileDto,
    ) {
        return this.profileService.updateProfile(res, req.user.sub, body);
    }

    @Patch('change-password')
    async changePassword(
        @Res()      res: Response,
        @Request()  req: any,
        @Body()     body: ChangePasswordDto,
    ) {
        return this.profileService.changePassword(res, req.user.sub, body);
    }

    @Patch('change-email')
    async changeEmail(
        @Res()      res: Response,
        @Request()  req: any,
        @Body()     body: ChangeEmailDto,
    ) {
        return this.profileService.changeEmail(res, req.user.sub, body);
    }

    @Patch('change-phone')
    async changePhone(
        @Res()      res: Response,
        @Request()  req: any,
        @Body()     body: ChangePhoneDto,
    ) {
        return this.profileService.changePhone(res, req.user.sub, body);
    }

    // ─── System connection (credential-based) ─────────────────────────────────

    @Get('systems/available')
    async getAvailableSystems(@Res() res: Response, @Request() req: any) {
        return this.profileService.getAvailableSystems(res, req.user.sub);
    }

    @Post('systems/connect')
    @HttpCode(HttpStatus.CREATED)
    async connectSystem(
        @Res()      res: Response,
        @Request()  req: any,
        @Body()     body: ConnectSystemDto,
    ) {
        return this.profileService.connectSystem(res, req.user.sub, body);
    }

    @Delete('systems/:system_id/disconnect')
    @HttpCode(HttpStatus.OK)
    async disconnectSystem(
        @Res()              res      : Response,
        @Request()          req      : any,
        @Param('system_id') system_id: string,
    ) {
        return this.profileService.disconnectSystem(res, req.user.sub, system_id);
    }

    // ─── System linking (redirect-based) ─────────────────────────────────────
    //
    // Flow A — Platform-initiated:
    //   1. User clicks "Link" on platform frontend
    //   2. POST /profile/systems/link-initiate → { code, redirect_url }
    //   3. Frontend opens redirect_url (system's link page)
    //   4. System calls POST /auth/link/service-confirm (server-to-server)
    //
    // Flow B — Service-initiated:
    //   1. System redirects user to platform frontend with params
    //   2. Frontend shows confirmation dialog
    //   3. User confirms → POST /profile/systems/link-service-confirm

    @Post('systems/link-initiate')
    @HttpCode(HttpStatus.OK)
    async linkInitiate(
        @Res()      res : Response,
        @Request()  req : any,
        @Body()     body: LinkInitiateDto,
    ) {
        return this.profileService.linkInitiate(res, req.user.sub, body);
    }

    @Get('systems/link-session/:code')
    async getLinkSession(
        @Res()          res : Response,
        @Request()      req : any,
        @Param('code')  code: string,
    ) {
        return this.profileService.getLinkSession(res, req.user.sub, code);
    }

    @Post('systems/link-confirm')
    @HttpCode(HttpStatus.OK)
    async linkConfirm(
        @Res()      res : Response,
        @Request()  req : any,
        @Body()     body: LinkConfirmDto,
    ) {
        return this.profileService.linkConfirm(res, req.user.sub, body);
    }

    @Post('systems/link-service-confirm')
    @HttpCode(HttpStatus.OK)
    async serviceInitiatedConfirm(
        @Res()      res: Response,
        @Request()  req: any,
        @Body()     body: ServiceInitiatedConfirmDto,
    ) {
        return this.profileService.serviceInitiatedConfirm(res, req.user.sub, body);
    }

    // ─── SSO Navigate ─────────────────────────────────────────────────────────

    @Post('systems/sso-navigate')
    @HttpCode(HttpStatus.OK)
    async ssoNavigate(
        @Res()                      res        : Response,
        @Request()                  req        : any,
        @Headers('authorization')   authHeader : string,
        @Body()                     body       : SsoNavigateDto,
    ) {
        const access_token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.getSsoNavigateUrl(res, req.user.sub, body.system_id, access_token);
    }

    // ─── Redirect login validation ────────────────────────────────────────────

    @Post('redirect/validate')
    @HttpCode(HttpStatus.OK)
    async validateRedirect(
        @Res()                      res       : Response,
        @Request()                  req       : any,
        @Headers('authorization')   authHeader: string,
        @Body()                     body      : ValidateRedirectDto,
    ) {
        const access_token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.validateRedirectLogin(
            res, req.user.sub, body.system_id, body.redirect_uri, body.action, access_token,
        );
    }

    @Post('redirect/link')
    @HttpCode(HttpStatus.OK)
    async redirectLink(
        @Res()      res : Response,
        @Request()  req : any,
        @Body()     body: RedirectLinkDto,
    ) {
        return this.profileService.redirectLinkAccount(
            res, req.user.sub, body.system_id, body.redirect_uri, body.username, body.password,
        );
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Res()                      res       : Response,
        @Request()                  req       : any,
        @Headers('authorization')   authHeader: string,
    ) {
        const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.logout(res, req.user.sub, token);
    }
}