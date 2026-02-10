import { IsUUID, IsNumber, IsString, IsOptional, Min, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessPaymentDto {
    @ApiProperty({
        description: 'Order ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID()
    orderId: string;

    @ApiProperty({
        description: 'User ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'Payment amount',
        example: 99.99,
    })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiPropertyOptional({
        description: 'Currency code',
        example: 'USD',
        default: 'USD',
    })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiProperty({
        description: 'Payment method',
        example: 'card',
        enum: ['card', 'bank_transfer', 'paypal', 'crypto'],
    })
    @IsString()
    @IsIn(['card', 'bank_transfer', 'paypal', 'crypto'])
    paymentMethod: string;

    @ApiProperty({
        description: 'Payment token from payment provider',
        example: 'tok_visa',
    })
    @IsString()
    paymentToken: string;
}
