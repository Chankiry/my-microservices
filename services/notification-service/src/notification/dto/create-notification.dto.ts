import { IsUUID, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../models/notification.model';

export class CreateNotificationDto {
    @ApiProperty({
        description: 'User ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'Notification type',
        enum: NotificationType,
        example: NotificationType.PUSH,
    })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({
        description: 'Notification title',
        example: 'Order Confirmed',
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Notification message',
        example: 'Your order has been confirmed.',
    })
    @IsString()
    message: string;

    @ApiPropertyOptional({
        description: 'Additional data',
        example: { orderId: '123' },
    })
    @IsObject()
    @IsOptional()
    data?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'Link to related resource',
        example: '/orders/123',
    })
    @IsString()
    @IsOptional()
    link?: string;
}
