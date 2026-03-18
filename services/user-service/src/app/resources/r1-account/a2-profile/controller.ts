import {
    Controller, Get, Patch, Post,
    Body, Request, Headers,
    UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './service';
import { UpdateProfileDto, ChangePasswordDto, ChangeEmailDto, ChangePhoneDto } from './dto';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProfileController {

    constructor(private readonly profileService: ProfileService) {}

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