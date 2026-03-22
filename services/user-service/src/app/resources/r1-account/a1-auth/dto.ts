import { IsString, MinLength, MaxLength } from 'class-validator';

// Platform login — phone is the Keycloak username
export class LoginDto {
    @IsString() @MinLength(7) @MaxLength(20)
    phone!: string;

    @IsString() @MinLength(1)
    password!: string;
}

// Refresh token exchange
export class RefreshDto {
    @IsString()
    refresh_token!: string;
}