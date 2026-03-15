import { Controller, Get, Put, Body, Request, UseGuards, Post } from '@nestjs/common';
import { ProfileService } from './service';
import { UpdateUserDto } from '../../r2-user/dto';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProfileController {
    constructor(private readonly accountService: ProfileService) {}

    @Get()
    async getProfile(@Request() req: any) {
        return this.accountService.getProfile(req.user.sub);
    }

    @Put()
    async updateProfile(@Request() req: any, @Body() updateDto: UpdateUserDto) {
        return this.accountService.updateProfile(req.user.sub, updateDto);
    }

    @Post('change-password')
    async changePassword(
        @Request() req: any,
        @Body() body: { currentPassword: string; newPassword: string },
    ) {
        return this.accountService.changePassword(
            req.user.sub,
            body.currentPassword,
            body.newPassword,
        );
    }

    @Post('logout')
    async logout(@Request() req: any) {
        return this.accountService.logout(req.user.sub);
    }
}
