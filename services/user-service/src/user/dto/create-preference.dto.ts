import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePreferenceDto {
    @ApiPropertyOptional({
        description: 'Preferred language',
        example: 'en',
        default: 'en',
    })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({
        description: 'Preferred theme',
        example: 'light',
        default: 'light',
    })
    @IsString()
    @IsOptional()
    theme?: string;

    @ApiPropertyOptional({
        description: 'Enable email notifications',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    emailNotifications?: boolean;

    @ApiPropertyOptional({
        description: 'Enable push notifications',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    pushNotifications?: boolean;

    @ApiPropertyOptional({
        description: 'Enable SMS notifications',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    smsNotifications?: boolean;

    @ApiPropertyOptional({
        description: 'User timezone',
        example: 'America/New_York',
    })
    @IsString()
    @IsOptional()
    timezone?: string;

    @ApiPropertyOptional({
        description: 'User preferred currency',
        example: 'USD',
    })
    @IsString()
    @IsOptional()
    currency?: string;
}
