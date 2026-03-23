import { Injectable }   from '@angular/core';
import { HttpClient }   from '@angular/common/http';
import { Observable }   from 'rxjs';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SystemInfo {
    id         : string;
    name       : string;
    logo       : string | null;
    description: string | null;
    is_active  : boolean;
    is_internal: boolean;
    allow_self_register: boolean;
    auth_callback_url  : string | null;
}

export interface SystemAccess {
    id                 : string;
    system_id          : string;
    account_type       : 'public' | 'managed' | 'internal';
    registration_status: 'pending' | 'active' | 'suspended' | 'rejected';
    system_roles       : string[];
    granted_at         : string | null;
    last_login_at      : string | null;
    system             : SystemInfo;
}

export interface UserProfile {
    id           : string;
    keycloak_id  : string;
    first_name   : string | null;
    last_name    : string | null;
    phone        : string;
    email        : string | null;
    avatar_uri   : string | null;
    is_active    : boolean;
    created_at   : string;
    system_access: SystemAccess[];
}

export interface ConnectPayload {
    system_id: string;
    username : string;
    password : string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ProfileResourceService {

    private readonly BASE = `http://localhost:8000/api/v1/account/profile`;

    constructor(private _http: HttpClient) {}

    getProfile(): Observable<UserProfile> {
        return this._http.get<UserProfile>(this.BASE);
    }

    updateProfile(payload: Partial<{ first_name: string; last_name: string; avatar?: string }>): Observable<UserProfile> {
        return this._http.patch<UserProfile>(this.BASE, payload);
    }

    changePassword(new_password: string): Observable<{ success: boolean }> {
        return this._http.patch<{ success: boolean }>(`${this.BASE}/password`, { new_password });
    }

    getAvailableSystems(): Observable<{ data: SystemInfo[] }> {
        return this._http.get<{ data: SystemInfo[] }>(`${this.BASE}/systems/available`);
    }

    connectSystem(payload: ConnectPayload): Observable<SystemAccess> {
        return this._http.post<SystemAccess>(`${this.BASE}/systems/connect`, payload);
    }

    disconnectSystem(system_id: string): Observable<{ success: boolean }> {
        return this._http.delete<{ success: boolean }>(
            `${this.BASE}/systems/${system_id}/disconnect`
        );
    }

    ssoNavigate(system_id: string): Observable<{ url: string }> {
        return this._http.post<{ url: string }>(`${this.BASE}/systems/sso-navigate`, { system_id });
    }

}
