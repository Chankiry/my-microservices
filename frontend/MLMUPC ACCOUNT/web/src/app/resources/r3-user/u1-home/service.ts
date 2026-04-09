import { Injectable }   from '@angular/core';
import { HttpClient }   from '@angular/common/http';
import { Observable }   from 'rxjs';
import { env }          from 'envs/env';
import {
    MeResponse, ProfileResponse,
    AvailableSystem, ConnectPayload,
    LinkSessionInfo,
} from './user-home.types';

@Injectable({ providedIn: 'root' })
export class UserHomeService {

    // FIX F1: was missing '/api' — all calls were returning 404
    private readonly base_url = `${env.API_BASE_URL}/v1/account/profile`;

    constructor(private _http: HttpClient) {}

    // ─── Profile ──────────────────────────────────────────────────────────────

    // Lightweight — user info + platform roles. Used by resolver and guards.
    getMe(): Observable<{ data: MeResponse }> {
        return this._http.get<{ data: MeResponse }>(`${this.base_url}/me`);
    }

    // Full profile — user info + all connected system accesses.
    getProfile(): Observable<{ data: ProfileResponse }> {
        return this._http.get<{ data: ProfileResponse }>(this.base_url);
    }

    updateProfile(payload: Partial<Pick<MeResponse, 'first_name' | 'last_name' | 'name_kh' | 'name_en'>>): Observable<any> {
        return this._http.patch<any>(this.base_url, payload);
    }

    changePassword(new_password: string): Observable<any> {
        return this._http.patch<any>(`${this.base_url}/change-password`, { new_password });
    }

    changeEmail(new_email: string): Observable<any> {
        return this._http.patch<any>(`${this.base_url}/change-email`, { new_email });
    }

    changePhone(new_phone: string): Observable<any> {
        return this._http.patch<any>(`${this.base_url}/change-phone`, { new_phone });
    }

    // ─── Systems ──────────────────────────────────────────────────────────────

    getAvailableSystems(): Observable<{ data: AvailableSystem[] }> {
        return this._http.get<{ data: AvailableSystem[] }>(`${this.base_url}/systems/available`);
    }

    // Credential-based connect (for systems with auth_callback_url)
    connectSystem(payload: ConnectPayload): Observable<any> {
        return this._http.post<any>(`${this.base_url}/systems/connect`, payload);
    }

    disconnectSystem(system_id: string): Observable<any> {
        return this._http.delete<any>(`${this.base_url}/systems/${system_id}/disconnect`);
    }

    // SSO navigate — returns { url } to open in new tab
    ssoNavigate(system_id: string): Observable<{ data: { url: string } }> {
        return this._http.post<{ data: { url: string } }>(
            `${this.base_url}/systems/sso-navigate`, { system_id }
        );
    }

    // ─── Redirect-based account linking (Phase 3) ─────────────────────────────

    // Step 1 — initiate: platform creates a link session and returns a redirect URL
    linkInitiate(system_id: string, redirect_path: string = '/user/home'): Observable<{ data: { redirect_url: string } }> {
        return this._http.post<{ data: { redirect_url: string } }>(
            `${this.base_url}/systems/link-initiate`,
            { system_id, redirect_path },
        );
    }

    // Step 2 — poll: frontend reads the session state to show the confirm UI
    getLinkSession(code: string): Observable<{ data: LinkSessionInfo }> {
        return this._http.get<{ data: LinkSessionInfo }>(
            `${this.base_url}/systems/link-session/${code}`
        );
    }

    // Step 3 — confirm: user clicks Confirm → platform creates the access record
    linkConfirm(code: string): Observable<{ data: { system_id: string; redirect_path: string } }> {
        return this._http.post<{ data: { system_id: string; redirect_path: string } }>(
            `${this.base_url}/systems/link-confirm`,
            { code },
        );
    }
}
