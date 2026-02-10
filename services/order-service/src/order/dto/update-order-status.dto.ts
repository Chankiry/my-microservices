import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../models/order.model';

export class UpdateOrderStatusDto {
    @ApiProperty({
        description: 'Order status',
        enum: OrderStatus,
        example: OrderStatus.PROCESSING,
    })
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @ApiPropertyOptional({
        description: 'Status change reason',
        example: 'Payment received',
    })
    @IsString()
    @IsOptional()
    reason?: string;
}
