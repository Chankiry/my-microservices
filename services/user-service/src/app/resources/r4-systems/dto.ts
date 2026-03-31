import {
    IsString, IsBoolean, IsOptional,
    IsIn, MaxLength, Matches,
} from 'class-validator';

// ─── System ───────────────────────────────────────────────────────────────────

export class CreateSystemDto {
    @IsString() @MaxLength(50)
    id!: string;   // e.g. 'plt', 'platform', 'gis'

    @IsString() @MaxLength(100)
    name!: string;

    @IsString() @IsOptional() @MaxLength(500)
    logo?: string;

    @IsString() @IsOptional()
    description?: string;

    @IsBoolean() @IsOptional()
    allow_self_register?: boolean;

    @IsBoolean() @IsOptional()
    require_approval?: boolean;

    @IsBoolean() @IsOptional()
    is_internal?: boolean;

    @IsString() @IsOptional() @MaxLength(100)
    keycloak_client_id?: string;

    @IsString() @IsOptional() @MaxLength(500)
    auth_callback_url?: string;

    @IsString() @IsOptional() @MaxLength(500)
    base_url?: string;

    @IsString() @IsOptional() @MaxLength(500)
    auth_callback_url2?: string;
}

export class UpdateSystemDto {
    @IsString() @IsOptional() @MaxLength(100)
    name?: string;

    @IsString() @IsOptional() @MaxLength(500)
    logo?: string;

    @IsString() @IsOptional()
    description?: string;

    @IsBoolean() @IsOptional()
    allow_self_register?: boolean;

    @IsBoolean() @IsOptional()
    require_approval?: boolean;

    @IsBoolean() @IsOptional()
    is_active?: boolean;

    @IsString() @IsOptional() @MaxLength(100)
    keycloak_client_id?: string;

    @IsString() @IsOptional() @MaxLength(500)
    auth_callback_url?: string;

    @IsString() @IsOptional() @MaxLength(500)
    base_url?: string;
}

// ─── System Role ─────────────────────────────────────────────────────────────

export class CreateSystemRoleDto {
    @IsString() @MaxLength(100)
    name_kh!: string;

    @IsString() @MaxLength(100)
    name_en!: string;

    // Unique within system — lowercase, hyphens allowed: 'admin', 'land-officer'
    @IsString() @MaxLength(50)
    @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
    slug!: string;

    @IsString() @IsOptional() @MaxLength(100)
    icon?: string;

    @IsString() @IsOptional() @MaxLength(20)
    color?: string;

    @IsString() @IsOptional()
    description?: string;

    // realm = Keycloak realm role (platform only)
    // client = Keycloak client role (external Keycloak systems)
    @IsIn(['realm', 'client'])
    role_type!: 'realm' | 'client';

    // Must match the exact name in Keycloak.
    // For realm: typically 'admin' or 'user'.
    // For client: whatever name the client role has.
    @IsString() @IsOptional() @MaxLength(100)
    keycloak_role_name?: string;

    @IsBoolean() @IsOptional()
    is_default?: boolean;
}

export class UpdateSystemRoleDto {
    @IsString() @IsOptional() @MaxLength(100) name_kh?: string;
    @IsString() @IsOptional() @MaxLength(100) name_en?: string;
    @IsString() @IsOptional() @MaxLength(100) icon?: string;
    @IsString() @IsOptional() @MaxLength(20)  color?: string;
    @IsString() @IsOptional()                 description?: string;
    @IsBoolean() @IsOptional()                is_active?: boolean;
    @IsBoolean() @IsOptional()                is_default?: boolean;
    @IsString() @IsOptional() @MaxLength(100) keycloak_role_name?: string;
}