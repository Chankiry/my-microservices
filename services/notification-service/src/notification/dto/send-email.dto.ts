import { IsEmail, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
    @ApiProperty({
        description: 'Recipient email address',
        example: 'user@example.com',
    })
    @IsEmail()
    to: string;

    @ApiProperty({
        description: 'Email subject',
        example: 'Welcome to Our Platform',
    })
    @IsString()
    subject: string;

    @ApiPropertyOptional({
        description: 'Email body (HTML)',
        example: '<h1>Welcome!</h1>',
    })
    @IsString()
    @IsOptional()
    body?: string;

    @ApiPropertyOptional({
        description: 'Template name',
        example: 'welcome',
    })
    @IsString()
    @IsOptional()
    template?: string;

    @ApiPropertyOptional({
        description: 'Template data',
        example: { name: 'John Doe' },
    })
    @IsObject()
    @IsOptional()
    templateData?: Record<string, any>;
}
