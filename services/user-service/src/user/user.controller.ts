import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@ApiTags('User')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    // Profile endpoints
    @Get(':userId/profile')
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async getProfile(@Param('userId') userId: string) {
        return this.userService.getProfile(userId);
    }

    @Post(':userId/profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create user profile' })
    @ApiResponse({ status: 201, description: 'Profile created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async createProfile(
        @Param('userId') userId: string,
        @Body() createProfileDto: CreateProfileDto,
    ) {
        return this.userService.createProfile(userId, createProfileDto);
    }

    @Put(':userId/profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async updateProfile(
        @Param('userId') userId: string,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return this.userService.updateProfile(userId, updateProfileDto);
    }

    @Delete(':userId/profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete user profile' })
    @ApiResponse({ status: 200, description: 'Profile deleted successfully' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async deleteProfile(@Param('userId') userId: string) {
        return this.userService.deleteProfile(userId);
    }

    // Preference endpoints
    @Get(':userId/preferences')
    @ApiOperation({ summary: 'Get user preferences' })
    @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Preferences not found' })
    async getPreferences(@Param('userId') userId: string) {
        return this.userService.getPreferences(userId);
    }

    @Post(':userId/preferences')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create user preferences' })
    @ApiResponse({ status: 201, description: 'Preferences created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async createPreferences(
        @Param('userId') userId: string,
        @Body() createPreferenceDto: CreatePreferenceDto,
    ) {
        return this.userService.createPreferences(userId, createPreferenceDto);
    }

    @Put(':userId/preferences')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user preferences' })
    @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
    @ApiResponse({ status: 404, description: 'Preferences not found' })
    async updatePreferences(
        @Param('userId') userId: string,
        @Body() updatePreferenceDto: UpdatePreferenceDto,
    ) {
        return this.userService.updatePreferences(userId, updatePreferenceDto);
    }
}
