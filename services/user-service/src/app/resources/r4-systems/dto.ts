import {
    IsString, IsOptional, IsBoolean,
    MinLength, MaxLength,
} from 'class-validator';

export class CreateSystemDto {
    @IsString() @MinLength(2) @MaxLength(50)
    id!: string;

    @IsString() @MinLength(1) @MaxLength(100)
    name!: string;

    @IsString() @IsOptional() @MaxLength(500)
    logo?: string;

    @IsString() @IsOptional()
    description?: string;

    @IsString() @IsOptional() @MaxLength(100)
    keycloak_client_id?: string;

    @IsString() @IsOptional() @MaxLength(500)
    auth_callback_url?: string;

    @IsString() @IsOptional() @MaxLength(500)
    base_url?: string;

    @IsBoolean() @IsOptional()
    allow_self_register?: boolean;

    @IsBoolean() @IsOptional()
    require_approval?: boolean;

    @IsBoolean() @IsOptional()
    is_internal?: boolean;
}

export class UpdateSystemDto {
    @IsString() @IsOptional() @MaxLength(100)
    name?: string;

    @IsString() @IsOptional() @MaxLength(500)
    logo?: string;

    @IsString() @IsOptional()
    description?: string;

    @IsString() @IsOptional() @MaxLength(100)
    keycloak_client_id?: string;

    @IsString() @IsOptional() @MaxLength(500)
    auth_callback_url?: string;

    @IsString() @IsOptional() @MaxLength(500)
    base_url?: string;

    @IsBoolean() @IsOptional()
    allow_self_register?: boolean;

    @IsBoolean() @IsOptional()
    require_approval?: boolean;

    @IsBoolean() @IsOptional()
    is_internal?: boolean;

    @IsBoolean() @IsOptional()
    is_active?: boolean;
}

export class CreateSystemRoleDto {
    @IsString() @MinLength(2) @MaxLength(100)
    role_name!: string;

    @IsString() @IsOptional() @MaxLength(255)
    description?: string;

    @IsBoolean() @IsOptional()
    is_default?: boolean;
}