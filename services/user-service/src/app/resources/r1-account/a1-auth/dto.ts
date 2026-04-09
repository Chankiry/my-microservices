import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
    @IsString() @MinLength(7) @MaxLength(20)
    phone!: string;

    @IsString() @MinLength(1)
    password!: string;
}

export class RefreshDto {
    @IsString()
    refresh_token!: string;
}

export class RegisterDto {
    @IsString() @MinLength(1) @MaxLength(100)
    first_name!: string;

    @IsString() @MinLength(1) @MaxLength(100)
    last_name!: string;

    @IsString() @MinLength(7) @MaxLength(20)
    phone!: string;

    @IsOptional() @IsEmail()
    email?: string | null;

    @IsString() @MinLength(8)
    password!: string;
}

// Phase 2 — Scoped token DTOs

export class ScopedTokenValidateDto {
    @IsString()
    token!: string;
}

export class ScopedTokenRefreshDto {
    @IsString()
    refresh_token!: string;
}

// ─── Phase 3 — Redirect-based linking DTOs ───────────────────────────────────

// Called by the external service backend (server-to-server) to confirm that
// a specific user completed the link on their side.
// POST /auth/link/service-confirm
// Headers: x-system-id, x-internal-secret

export class ServiceConfirmLinkDto {
    // The link_session code issued by the platform in Flow A.
    @IsString()
    code!: string;

    // The user's ID inside the external system.
    @IsString() @MinLength(1)
    external_id!: string;
}

// ─── Phase 3: Account link notification ──────────────────────────────────────
// Called server-to-server by an integrated service after the user has
// authenticated on their side.
//
// Required headers:
//   x-system-id:       the caller's system_id (e.g. 'plt')
//   x-internal-secret: shared INTERNAL_SERVICE_SECRET from env
 
export class LinkNotifyDto {
    @IsString()
    link_session_code!: string;
 
    @IsString() @MinLength(1) @MaxLength(100)
    external_id!: string;
}

export class SsoLinkDto {
    @IsString() @IsNotEmpty()
    platform_user_id: string;   // Account Platform user.id (from JWT sub claim)

    @IsString() @IsNotEmpty()
    system_id: string;          // e.g. 'plt'

    @IsString() @IsNotEmpty()
    external_id: string;        // PLT's user.id
}