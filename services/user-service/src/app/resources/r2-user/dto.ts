import {
    IsString, IsEmail, IsOptional,
    MinLength, MaxLength, IsArray, IsBoolean,
    IsNotEmpty,
    Matches,
} from 'class-validator';

const CAMBODIA_PHONE_REGEX = /^(?:0|\+?855|855)?[1-9]\d{7,8}$/;

export class CreateUserDto {

    @IsString({ message: 'Phone must be a string' })
    @IsNotEmpty({ message: 'Phone number is required' })
    @MinLength(7, { message: 'Phone number is too short (min 7 characters)' })
    @MaxLength(20, { message: 'Phone number is too long (max 20 characters)' })
    // Optional but strongly recommended for Cambodia:
    @Matches(CAMBODIA_PHONE_REGEX, {
        message:
        'Invalid Cambodian phone number format. Use formats like: 0961234567, +855961234567, 012345678',
    })
    phone!: string;

    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Invalid email format' })
    @MinLength(5, { message: 'Email is too short' })
    @MaxLength(100, { message: 'Email is too long' })
    @IsOptional()  // ← Key point: make it truly optional
    email?: string | null = null;

    @IsString() @IsOptional() @MaxLength(100)
    first_name?: string;

    @IsString() @IsOptional() @MaxLength(100)
    last_name?: string;

    @IsString() @IsOptional()
    keycloak_id?: string;

    @IsBoolean() @IsOptional()
    is_active?: boolean;

    @IsBoolean() @IsOptional()
    email_verified?: boolean;

    @IsString() @IsOptional()
    creator_id?: string | null;
}

// Used by regular users updating their own profile — no roles, no status.
export class UpdateUserDto {
    @IsEmail() @IsOptional()
    email?: string | null;

    @IsString() @IsOptional() @MaxLength(100)
    first_name?: string;

    @IsString() @IsOptional() @MaxLength(100)
    last_name?: string;

    @IsBoolean() @IsOptional()
    is_active?: boolean;

    @IsBoolean() @IsOptional()
    email_verified?: boolean;
}

// Admin only — adds role management on top of UpdateUserDto
export class AdminUpdateUserDto extends UpdateUserDto {
    @IsArray() @IsString({ each: true }) @IsOptional()
    app_roles?: string[];
}