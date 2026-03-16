import {
    IsString,
    IsEmail,
    IsOptional,
    MinLength,
    MaxLength,
    IsArray,
    IsBoolean,
} from 'class-validator';

export class CreateUserDto {

    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @IsOptional()
    @MinLength(8)
    @MaxLength(100)
    password?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    firstName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    lastName?: string;

    @IsString()
    @IsOptional()
    keycloakId?: string;

    // Allowed when sync consumer creates a user from Keycloak event.
    // The ValidationPipe whitelist would strip this if omitted — keeping
    // it here means the field passes through instead of being silently dropped.
    @IsString()
    @IsOptional()
    passwordHash?: string | null;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    emailVerified?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    roles?: string[];
}

// Used by regular users updating their own profile.
// Does NOT include roles — role assignment is admin-only via AdminUpdateUserDto.
export class UpdateUserDto {

    @IsString()
    @IsOptional()
    @MinLength(3)
    @MaxLength(50)
    username?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    firstName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    lastName?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    emailVerified?: boolean;
}

// Used only by admin endpoints — extends UpdateUserDto with role management.
export class AdminUpdateUserDto extends UpdateUserDto {

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    roles?: string[];
}