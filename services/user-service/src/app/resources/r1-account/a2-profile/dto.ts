import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';

export class UpdateProfileDto {
    @IsString() @IsOptional() @MaxLength(100) first_name?: string;
    @IsString() @IsOptional() @MaxLength(100) last_name? : string;
    @IsString() @IsOptional() @MaxLength(500) avatar?    : string;
    @IsString() @IsOptional() @MaxLength(20)  gender?    : string;
}

export class ChangePasswordDto {
    @IsString() @MinLength(8) @MaxLength(100)
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