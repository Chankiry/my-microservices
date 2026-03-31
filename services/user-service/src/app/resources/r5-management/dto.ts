import {
    IsString, IsArray, IsOptional,
    IsIn, MaxLength, IsEmail,
    IsBoolean, IsUUID,
} from 'class-validator';

// ─── Access Management ────────────────────────────────────────────────────────

export class GrantAccessDto {
    @IsString()
    system_id!: string;

    @IsString()
    @IsIn(['public', 'managed', 'internal'])
    account_type!: 'public' | 'managed' | 'internal';
}

export class UpdateAccessDto {
    @IsString() @IsOptional()
    @IsIn(['active', 'suspended'])
    registration_status?: 'active' | 'suspended';
}

export class RejectAccessDto {
    @IsString() @IsOptional() @MaxLength(500)
    reason?: string;
}

// Called by external systems to notify user-service of a role change.
export class ExternalRoleChangeDto {
    @IsString()
    external_id!: string;

    @IsArray() @IsString({ each: true })
    role_slugs!: string[];  // slugs of the new full set of roles
}

// ─── User Role Management ─────────────────────────────────────────────────────

export class AssignUserRoleDto {
    @IsUUID()
    role_id!: string;  // SystemRole.id — must exist in system_roles table
}

// ─── Admin User Creation ──────────────────────────────────────────────────────

export class CreatePlatformUserDto {
    @IsString() @MaxLength(20)
    phone!: string;

    @IsEmail() @IsOptional()
    email?: string;

    @IsString() @IsOptional() @MaxLength(100)
    first_name?: string;

    @IsString() @IsOptional() @MaxLength(100)
    last_name?: string;

    @IsString() @MaxLength(100)
    password!: string;

    // Slug of the platform role to assign — defaults to 'user'
    @IsString() @IsOptional()
    @IsIn(['admin', 'user'])
    platform_role?: 'admin' | 'user';
}