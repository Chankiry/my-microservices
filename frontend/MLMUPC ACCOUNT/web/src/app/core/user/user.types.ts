export interface User {
    id: number;
    username: string;
    name_kh: string;
    name_en: string;
    phone_number: string;
    email: string;
    avatar_uri: string;
    role_id: number;
    roles: Role[];
}

export interface Role {
    id: number;
    name_kh: string;
    name_en: string;
    slug: string;
    icon: string;
    is_default: boolean;
}
