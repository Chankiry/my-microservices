import { User } from "app/core/user/user.types";
import Pagination from "helper/interfaces/pagination.interface";


export interface ResponseProfile {
    user: User;
    token: string;
    message: {
        name_kh: string;
        name_en: string;
    };
}

export interface ProfileUpdate {
    name: string
    phone: string
    email: string
    avatar?: string
}

export interface PasswordReq {
    password                : string;
    new_password            : string;
    confirm_password        : string;
}
export interface List extends Pagination {
    data: Data[],
}

export interface Data {
    id: number;
    action: string;
    details: string;
    ip_address: string;
    browser: string;
    os: string;
    platform: string;
    timestamp: string; // ISO date string
}

