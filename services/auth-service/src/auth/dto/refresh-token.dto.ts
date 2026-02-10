import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
    @ApiProperty({
        description: 'Refresh token obtained during login',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsString({ message: 'Refresh token must be a string' })
    @IsNotEmpty({ message: 'Refresh token is required' })
    refreshToken: string;
}
