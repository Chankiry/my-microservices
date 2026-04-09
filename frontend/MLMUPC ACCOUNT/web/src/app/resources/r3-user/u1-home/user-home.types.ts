// Interfaces for user-home matching the actual backend response shapes.
// Backend source: profile.service.ts getMe() and getProfile()

// ─── /profile/me response ────────────────────────────────────────────────────

export interface PlatformRole {
    id     : string;
    slug   : string;
    name_kh: string;
    name_en: string;
    icon   : string | null;
    color  : string | null;
}

export interface MeResponse {
    id        : string;
    avatar    : string | null;
    cover     : string | null;
    first_name: string | null;
    last_name : string | null;
    name_kh   : string | null;
    name_en   : string | null;
    email     : string | null;
    phone     : string;
    roles     : PlatformRole[];
}

// ─── /profile response ───────────────────────────────────────────────────────
// system_accesses is a flat list — id IS the system_id.

export interface SystemAccessItem {
    id                 : string;             // = system_id
    name_kh            : string;
    name_en            : string;
    logo               : string | null;
    cover              : string | null;
    base_url           : string | null;
    registration_status: 'pending' | 'active' | 'suspended' | 'rejected';
    roles              : PlatformRole[];
}

export interface ProfileResponse extends MeResponse {
    system_accesses: SystemAccessItem[];
}

// ─── /profile/systems/available response ─────────────────────────────────────

export interface AvailableSystem {
    id                : string;
    name_kh           : string;
    name_en           : string;
    abbre             : string;
    logo              : string | null;
    cover             : string | null;
    base_url          : string | null;
    is_active         : boolean;
    require_approval  : boolean;
    allow_self_register: boolean;
    auth_callback_url : string | null;
    keycloak_client_id: string | null;
    link_entry_url    : string | null;
}

// ─── /profile/systems/link-session/:code response ────────────────────────────

export interface LinkSessionInfo {
    code      : string;
    step      : 'awaiting_service' | 'awaiting_user';
    system    : { id: string; name_kh: string; name_en: string; logo: string | null; };
    expires_at: number;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface ConnectPayload {
    system_id: string;
    username : string;
    password : string;
}
