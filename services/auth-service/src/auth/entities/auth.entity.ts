import { ApiProperty } from '@nestjs/swagger';

export class UserData {
    @ApiProperty({
        description: 'User ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    id: string;

    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com',
    })
    email: string;

    @ApiProperty({
        description: 'User full name',
        example: 'John Doe',
    })
    name: string;
}

export class TokenData {
    @ApiProperty({
        description: 'JWT access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    accessToken: string;

    @ApiProperty({
        description: 'JWT refresh token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    refreshToken: string;

    @ApiProperty({
        description: 'Token expiration time in seconds',
        example: 3600,
    })
    expiresIn: number;
}

export class AuthResponse {
    @ApiProperty({
        description: 'Indicates if the operation was successful',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Response message',
        example: 'Login successful',
    })
    message: string;

    @ApiProperty({
        description: 'Response data containing user and token information',
    })
    data?: {
        user: UserData;
    } & TokenData;
}
