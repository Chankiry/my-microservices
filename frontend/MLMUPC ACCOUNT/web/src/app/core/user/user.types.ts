export interface PlatformRole {
    id     : string;
    slug   : string;
    name_kh: string;
    name_en: string;
    icon   : string | null;
    color  : string | null;
}

export interface User {
    id             : string;
    phone          : string;
    email          : string | null;
    first_name     : string | null;
    last_name      : string | null;
    avatar         : string | null;
    gender         : string | null;
    is_active      : boolean;
    created_at     : string;
    platform_roles : PlatformRole[];
}
