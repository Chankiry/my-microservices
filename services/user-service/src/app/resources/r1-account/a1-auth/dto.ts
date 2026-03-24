import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
    @IsString() @MinLength(7) @MaxLength(20)
    phone!: string;

    @IsString() @MinLength(1)
    password!: string;
}

export class RefreshDto {
    @IsString()
    refresh_token!: string;
}

export class RegisterDto {
    @IsString() @MinLength(1) @MaxLength(100)
    first_name!: string;

    @IsString() @MinLength(1) @MaxLength(100)
    last_name!: string;

    @IsString() @MinLength(7) @MaxLength(20)
    phone!: string;

    @IsOptional() @IsEmail()
    email?: string | null;

    @IsString() @MinLength(8)
    password!: string;
}