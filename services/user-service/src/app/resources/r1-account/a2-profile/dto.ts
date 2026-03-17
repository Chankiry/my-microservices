import {
    IsString,
    IsOptional,
    IsEmail,
    MinLength,
    MaxLength,
    IsUrl,
} from 'class-validator';

export class UpdateProfileDto {

    // Proxied to Keycloak Admin API, synced back via Kafka USER_UPDATED event
    @IsString() @IsOptional() @MaxLength(100) firstName?: string;
    @IsString() @IsOptional() @MaxLength(100) lastName? : string;

    // Stored directly in user-service profile JSONB
    @IsString() @IsOptional() @MaxLength(500) avatar?: string;
    @IsString() @IsOptional() @MaxLength(30)  phone?  : string;
    @IsString() @IsOptional() @MaxLength(20)  gender? : string;
}

export class ChangePasswordDto {
    @IsString()
    @MinLength(6)
    @MaxLength(100)
    newPassword!: string;
}

export class ChangeEmailDto {
    @IsEmail()
    newEmail!: string;
}