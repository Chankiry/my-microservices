import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefundPaymentDto {
    @ApiPropertyOptional({
        description: 'Refund amount (if partial refund)',
        example: 50.00,
    })
    @IsNumber()
    @Min(0.01)
    @IsOptional()
    amount?: number;

    @ApiPropertyOptional({
        description: 'Refund reason',
        example: 'Customer request',
    })
    @IsString()
    @IsOptional()
    reason?: string;
}
