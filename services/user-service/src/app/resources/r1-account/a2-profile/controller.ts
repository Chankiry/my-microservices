import {
    Controller,
    Get,
    Patch,
    Post,
    Body,
    Request,
    Headers,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './service';
import { UpdateProfileDto, ChangePasswordDto, ChangeEmailDto } from './dto';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProfileController {

    constructor(private readonly profileService: ProfileService) {}

    @Get()
    async getProfile(@Request() req: any) {
        return this.profileService.getProfile(req.user.sub);
    }

    // Update business profile fields — avatar, phone, timezone, language, address.
    // Does NOT update firstName / lastName / email — those are identity fields
    // owned by Keycloak and synced back via Kafka events.
    @Patch()
    async updateProfile(
        @Request() req: any,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.profileService.updateProfile(req.user.sub, dto);
    }

    // Change password — proxied to Keycloak Admin API.
    // User-service never stores or touches the password hash.
    @Patch('change-password')
    async changePassword(
        @Request() req: any,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.profileService.changePassword(req.user.sub, dto);
    }

    // Change email — proxied to Keycloak Admin API.
    // The mirror column in user-service is updated asynchronously
    // when the USER_UPDATED Kafka event arrives from Keycloak.
    @Patch('change-email')
    async changeEmail(
        @Request() req: any,
        @Body() dto: ChangeEmailDto,
    ) {
        return this.profileService.changeEmail(req.user.sub, dto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Request() req: any,
        @Headers('authorization') authHeader: string,
    ) {
        // Extract the raw token so AuthService can hash and blacklist it
        const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
        return this.profileService.logout(req.user.sub, token);
    }
}