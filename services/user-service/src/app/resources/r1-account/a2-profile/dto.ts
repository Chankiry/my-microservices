import {
    IsString, IsEmail, IsOptional,
    MinLength, MaxLength, IsIn,
} from 'class-validator';

export class UpdateProfileDto {
    @IsString() @IsOptional() @MaxLength(100)
    first_name?: string;

    @IsString() @IsOptional() @MaxLength(100)
    last_name?: string;

    @IsString() @IsOptional() @MaxLength(500)
    avatar?: string;

    @IsString() @IsOptional() @IsIn(['male', 'female', 'other'])
    gender?: string;
}

export class ChangePasswordDto {
    @IsString() @MinLength(8)
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

export class ConnectSystemDto {
    @IsString()
    system_id!: string;

    @IsString() @MinLength(1)
    username!: string;

    @IsString() @MinLength(1)
    password!: string;
}

export class SsoNavigateDto {
    @IsString()
    system_id!: string;
}

export class ValidateRedirectDto {
    @IsString()
    system_id!: string;

    @IsString()
    redirect_uri!: string;

    @IsString() @IsIn(['login', 'link'])
    action!: 'login' | 'link';
}

export class RedirectLinkDto {
    @IsString()
    system_id!: string;

    @IsString()
    redirect_uri!: string;

    @IsString() @MinLength(1)
    username!: string;

    @IsString() @MinLength(1)
    password!: string;
}

// ─── Phase 3: Redirect-based linking ─────────────────────────────────────────

// Flow A — Platform-initiated.
// User on platform clicks "Link" for a system.
// POST /profile/systems/link-initiate

export class LinkInitiateDto {
    @IsString()
    system_id!: string;
 
    // Frontend route to navigate to after the user confirms the link.
    // Defaults to '/user/home'.
    @IsString() @IsOptional() @MaxLength(200)
    redirect_path?: string;
}

// Flow B — Service-initiated confirmation.
// User on platform has been redirected from the external service.
// POST /profile/systems/link-service-confirm
// User must be authenticated (JwtAuthGuard).

export class ServiceInitiatedConfirmDto {
    @IsString()
    system_id!: string;

    // The user's ID inside the external system — supplied by the service
    // in the redirect URL params (?external_id=...).
    @IsString() @MinLength(1)
    external_id!: string;

    // Where to redirect the user after link is confirmed.
    @IsString()
    redirect_uri!: string;

    // Opaque value the initiating service included in its redirect —
    // echoed back so the service can match the callback to its session.
    @IsString() @IsOptional()
    state?: string;
}

export class LinkConfirmDto {
    @IsString()
    code!: string;
}