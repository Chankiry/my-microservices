import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { KeycloakService } from './keycloak.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponse } from './entities/auth.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly keycloakService: KeycloakService,
    ) {}

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponse })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
        return this.authService.register(registerDto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with username and password' })
    @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponse })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
        return this.authService.login(loginDto);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthResponse })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
        return this.authService.refreshToken(refreshTokenDto.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200, description: 'Logout successful' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logout(@Req() req: Request): Promise<{ message: string }> {
        const token = req.headers.authorization?.split(' ')[1];
        await this.authService.logout(token);
        return { message: 'Logout successful' };
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getProfile(@Req() req: Request) {
        const userId = req.user['sub'];
        return this.authService.getProfile(userId);
    }

    @Public()
    @Get('keycloak/config')
    @ApiOperation({ summary: 'Get Keycloak configuration for frontend' })
    getKeycloakConfig() {
        return this.keycloakService.getPublicConfig();
    }
}
