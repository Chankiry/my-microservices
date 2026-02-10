import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileDto {
    @ApiPropertyOptional({
        description: 'User avatar URL',
        example: 'https://example.com/avatar.jpg',
    })
    @IsString()
    @IsOptional()
    avatar?: string;

    @ApiPropertyOptional({
        description: 'User bio',
        example: 'Software developer passionate about microservices',
    })
    @IsString()
    @IsOptional()
    bio?: string;

    @ApiPropertyOptional({
        description: 'User phone number',
        example: '+1234567890',
    })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({
        description: 'User address',
        example: '123 Main St, New York, NY 10001',
    })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({
        description: 'User date of birth',
        example: '1990-01-01',
    })
    @IsDateString()
    @IsOptional()
    dateOfBirth?: string;

    @ApiPropertyOptional({
        description: 'User gender',
        example: 'male',
    })
    @IsString()
    @IsOptional()
    gender?: string;

    @ApiPropertyOptional({
        description: 'User country',
        example: 'USA',
    })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiPropertyOptional({
        description: 'User city',
        example: 'New York',
    })
    @IsString()
    @IsOptional()
    city?: string;
}
