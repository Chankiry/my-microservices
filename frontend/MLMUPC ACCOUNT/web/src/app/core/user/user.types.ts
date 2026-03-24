// Matches the user-service User model exactly — no remapping

export interface User {
    id          : string;
    phone       : string;
    email       : string | null;
    first_name  : string | null;
    last_name   : string | null;
    avatar      : string | null;
    gender      : string | null;
    is_active   : boolean;
    created_at  : string;
}

export interface Role {
    id        : number;
    name_kh   : string;
    name_en   : string;
    slug      : string;
    icon      : string;
    is_default: boolean;
}
