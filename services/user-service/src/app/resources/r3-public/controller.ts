import { Controller, Get, Post, Body } from '@nestjs/common';
import { PublicService } from './service';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Public } from '../../core/decorators/public.decorator';

class ForgotPasswordDto {
    @IsEmail()
    email!: string;
}

class ResetPasswordDto {
    @IsString()
    token!: string;

    @IsString()
    @MinLength(8)
    newPassword!: string;
}

class VerifyEmailDto {
    @IsString()
    token!: string;
}

@Controller()
export class PublicController {
    constructor(private readonly publicService: PublicService) {}

    @Get('health')
    @Public()
    async healthCheck() {
        return this.publicService.healthCheck();
    }

    @Get('info')
    @Public()
    async getPublicInfo() {
        return this.publicService.getPublicInfo();
    }

    @Post('forgot-password')
    @Public()
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.publicService.initiatePasswordReset(body.email);
    }

    @Post('reset-password')
    @Public()
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.publicService.resetPassword(body.token, body.newPassword);
    }

    @Post('verify-email')
    @Public()
    async verifyEmail(@Body() body: VerifyEmailDto) {
        return this.publicService.verifyEmail(body.token);
    }
}
