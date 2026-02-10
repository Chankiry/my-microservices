import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { SendEmailDto } from './dto/send-email.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get(':userId')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user notifications' })
    @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
    async getNotifications(
        @Param('userId') userId: string,
        @Query('unreadOnly') unreadOnly = false,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        return this.notificationService.getNotifications(userId, {
            unreadOnly: unreadOnly === true,
            page: +page,
            limit: +limit,
        });
    }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a notification' })
    @ApiResponse({ status: 201, description: 'Notification created successfully' })
    async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationService.createNotification(createNotificationDto);
    }

    @Put(':id/read')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mark notification as read' })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    async markAsRead(@Param('id') id: string) {
        return this.notificationService.markAsRead(id);
    }

    @Post('email')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Send an email' })
    @ApiResponse({ status: 200, description: 'Email sent successfully' })
    async sendEmail(@Body() sendEmailDto: SendEmailDto) {
        return this.notificationService.sendEmail(sendEmailDto);
    }
}
