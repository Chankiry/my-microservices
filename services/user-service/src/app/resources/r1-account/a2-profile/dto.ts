import {
    IsString, MinLength, MaxLength,
    IsOptional, IsEmail,
} from 'class-validator';

export class UpdateProfileDto {
    @IsString() @IsOptional() @MaxLength(100)
    first_name?: string;

    @IsString() @IsOptional() @MaxLength(100)
    last_name?: string;

    @IsString() @IsOptional() @MaxLength(255)
    avatar?: string;
}

export class ChangePasswordDto {
    @IsString() @MinLength(8)
    new_password!: string;
}

export class ChangeEmailDto {
    @IsString() @IsEmail()
    new_email!: string;
}

export class ChangePhoneDto {
    @IsString() @MinLength(7) @MaxLength(20)
    new_phone!: string;
}