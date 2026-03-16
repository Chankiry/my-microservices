import {
    IsString,
    IsOptional,
    IsEmail,
    MinLength,
    MaxLength,
    IsObject,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
    @IsString() @IsOptional() street?  : string;
    @IsString() @IsOptional() city?    : string;
    @IsString() @IsOptional() country? : string;
    @IsString() @IsOptional() postalCode?: string;
}

// What a user can update about themselves — business profile fields only.
// Identity fields (email, firstName, lastName) are owned by Keycloak
// and come back via Kafka events. They are not updated here.
export class UpdateProfileDto {
    @IsString()  @IsOptional() @MaxLength(500) avatar?  : string;
    @IsString()  @IsOptional() @MaxLength(30)  phone?   : string;
    @IsString()  @IsOptional() @MaxLength(60)  timezone?: string;
    @IsString()  @IsOptional() @MaxLength(10)  language?: string;

    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;
}

export class ChangePasswordDto {
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    newPassword!: string;
}

export class ChangeEmailDto {
    @IsEmail()
    newEmail!: string;
}