import {
    Controller, Get, Patch, Post, Delete,
    Body, Param, Request, Headers,
    UseGuards, HttpCode, HttpStatus,
    Res,
} from '@nestjs/common';
import { ProfileService }   from './service';
import {
    UpdateProfileDto, ChangePasswordDto,
    ChangeEmailDto, ChangePhoneDto, ConnectSystemDto,
    SsoNavigateDto, ValidateRedirectDto, RedirectLinkDto,
} from './dto';
import { JwtAuthGuard }     from '../../../core/guards/jwt-auth.guard';
import { Response } from 'express';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProfileController {

    constructor(private readonly profileService: ProfileService) {}

    @Get('me')
    async getMe(
        @Res()      res: Response,
        @Request()  req: any
    ) {
        return this.profileService.getMe(res, req.user.sub);
    }

    // ─── Profile ──────────────────────────────────────────────────────────────

    @Get()
    async getProfile(
        @Res()      res: Response,
        @Request()  req: any
    ) {
        return this.profileService.getProfile(res, req.user.sub);
    }

    @Patch()
    async updateProfile(
        @Res()      res: Response,
        @Request()  req: any, @Body() 
        body: UpdateProfileDto
    ) {
        return this.profileService.updateProfile(res, req.user.sub, body);
    }

    @Patch('change-password')
    async changePassword(
        @Res()      res: Response,
        @Request()  req: any, 
        @Body()     body: ChangePasswordDto
    ) {
        return this.profileService.changePassword(res, req.user.sub, body);
    }

    @Patch('change-email')
    async changeEmail(
        @Res()      res: Response,
        @Request()  req: any, 
        @Body()     body: ChangeEmailDto
    ) {
        return this.profileService.changeEmail(res, req.user.sub, body);
    }

    @Patch('change-phone')
    async changePhone(
        @Res()      res: Response,
        @Request()  req: any,
        @Body()     body: ChangePhoneDto
    ) {
        return this.profileService.changePhone(res, req.user.sub, body);
    }

    // ─── System connection ────────────────────────────────────────────────────

    @Get('systems/available')
    async getAvailableSystems(
        @Res()      res: Response,
        @Request()  req: any
    ) {
        return this.profileService.getAvailableSystems(res, req.user.sub);
    }

    @Post('systems/connect')
    @HttpCode(HttpStatus.CREATED)
    async connectSystem(
        @Res()      res: Response,
        @Request()  req: any, 
        @Body()     body: ConnectSystemDto
    ) {
        return this.profileService.connectSystem(res, req.user.sub, body);
    }

    @Delete('systems/:system_id/disconnect')
    @HttpCode(HttpStatus.OK)
    async disconnectSystem(
        @Res()              res: Response,
        @Request()          req: any,
        @Param('system_id') system_id: string,
    ) {
        return this.profileService.disconnectSystem(res, req.user.sub, system_id);
    }


    // ─── SSO Navigate ─────────────────────────────────────────────────────────

    @Post('systems/sso-navigate')
    @HttpCode(HttpStatus.OK)
    async ssoNavigate(
        @Res()                      res: Response,
        @Request()                  req: any,
        @Headers('authorization')   authHeader: string,
        @Body()                     body: SsoNavigateDto,
    ) {
        const access_token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.getSsoNavigateUrl(res, req.user.sub, body.system_id, access_token);
    }


    // ─── Redirect Login (Phase 7) ─────────────────────────────────────────────

    @Post('redirect/validate')
    @HttpCode(HttpStatus.OK)
    async validateRedirect(
        @Res()                      res: Response,
        @Request()                  req: any,
        @Headers('authorization')   authHeader: string,
        @Body()                     body: ValidateRedirectDto,
    ) {
        const access_token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.validateRedirectLogin(
            res,
            req.user.sub,
            body.system_id,
            body.redirect_uri,
            body.action,
            access_token,
        );
    }


    @Post('redirect/link')
    @HttpCode(HttpStatus.OK)
    async redirectLink(
        @Res()      res: Response,
        @Request()  req: any,
        @Body()     body: RedirectLinkDto,
    ) {
        return this.profileService.redirectLinkAccount(
            res,
            req.user.sub,
            body.system_id,
            body.redirect_uri,
            body.username,
            body.password,
        );
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Res()                      res: Response,
        @Request()                  req: any,
        @Headers('authorization')   authHeader: string,
    ) {
        const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.logout(res, req.user.sub, token);
    }
}