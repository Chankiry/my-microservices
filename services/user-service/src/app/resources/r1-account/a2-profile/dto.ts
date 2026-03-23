import {
    IsString, IsEmail, IsOptional,
    MinLength, MaxLength, IsIn,
} from 'class-validator';

export class UpdateProfileDto {
    @IsString() @IsOptional() @MaxLength(100)
    first_name?: string;

    @IsString() @IsOptional() @MaxLength(100)
    last_name?: string;

    @IsString() @IsOptional() @MaxLength(500)
    avatar?: string;

    @IsString() @IsOptional() @IsIn(['male', 'female', 'other'])
    gender?: string;
}

export class ChangePasswordDto {
    @IsString() @MinLength(8)
    new_password!: string;
}

export class ChangeEmailDto {
    @IsEmail()
    new_email!: string;
}

export class ChangePhoneDto {
    @IsString() @MinLength(7) @MaxLength(20)
    new_phone!: string;
}

export class ConnectSystemDto {
    @IsString()
    system_id!: string;

    @IsString() @MinLength(1)
    username!: string;

    @IsString() @MinLength(1)
    password!: string;
}

export class SsoNavigateDto {
    @IsString()
    system_id!: string;
}

export class ValidateRedirectDto {
    @IsString()
    system_id!: string;

    @IsString()
    redirect_uri!: string;

    @IsString() @IsIn(['login', 'link'])
    action!: 'login' | 'link';
}

// Used for action=link — user provides their external system credentials
// to link accounts during redirect flow
export class RedirectLinkDto {
    @IsString()
    system_id!: string;

    @IsString()
    redirect_uri!: string;

    @IsString() @MinLength(1)
    username!: string;

    @IsString() @MinLength(1)
    password!: string;
}