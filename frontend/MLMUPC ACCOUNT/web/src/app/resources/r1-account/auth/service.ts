import { Injectable }       from '@angular/core';
import { HttpClient }       from '@angular/common/http';
import { Observable }       from 'rxjs';
import { tap }              from 'rxjs/operators';
import { AuthService as CoreAuthService } from 'app/core/auth/auth.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LoginPayload {
    phone   : string;
    password: string;
}

export interface TokenResponse {
    access_token : string;
    refresh_token: string;
    expires_in   : number;
    token_type   : string;
}

export interface RegisterPayload {
    first_name: string;
    last_name : string;
    phone     : string;
    email     : string;
    password  : string;
}

export interface RegisterResponse {
    message: string;
}

export interface RedirectParams {
    system_id   : string;
    redirect_uri: string;
    action      : 'login' | 'link';
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ResourceAuthService {

    private readonly AUTH_BASE    = `http://localhost:8000/api/v1/account/auth`;
    private readonly PROFILE_BASE = `http://localhost:8000/api/v1/account/profile`;

    // Pending redirect stored during login flow
    private _pendingRedirect: RedirectParams | null = null;

    constructor(
        private _http        : HttpClient,
        private _authService : CoreAuthService,
    ) {}

    // ─── Auth endpoints ───────────────────────────────────────────────────────

    login(payload: LoginPayload): Observable<TokenResponse> {
        return this._http.post<TokenResponse>(`${this.AUTH_BASE}/login`, payload).pipe(
            tap(res => {
                this._authService.accessToken  = res.access_token;
                this._authService.refreshToken = res.refresh_token;
            }),
        );
    }

    register(payload: RegisterPayload): Observable<RegisterResponse> {
        return this._http.post<RegisterResponse>(`${this.AUTH_BASE}/register`, payload);
    }

    refresh(refresh_token: string): Observable<TokenResponse> {
        return this._http.post<TokenResponse>(`${this.AUTH_BASE}/refresh`, { refresh_token }).pipe(
            tap(res => {
                this._authService.accessToken  = res.access_token;
                this._authService.refreshToken = res.refresh_token;
            }),
        );
    }

    logout(refresh_token?: string): Observable<{ success: boolean }> {
        return this._http.post<{ success: boolean }>(`${this.AUTH_BASE}/logout`, { refresh_token });
    }

    exchangeCode(code: string): Observable<TokenResponse> {
        return this._http.post<TokenResponse>(
            `${this.AUTH_BASE}/login/keycloak/callback`, { code }
        ).pipe(
            tap(res => {
                this._authService.accessToken  = res.access_token;
                this._authService.refreshToken = res.refresh_token;
            }),
        );
    }

    // ─── Redirect login helpers ───────────────────────────────────────────────

    readRedirectFromUrl(): RedirectParams | null {
        const hash   = window.location.hash;
        const qIndex = hash.indexOf('?');
        if (qIndex === -1) return null;

        const params      = new URLSearchParams(hash.substring(qIndex + 1));
        const redirect_uri = params.get('redirect_uri');
        const system_id   = params.get('system_id');
        const action      = params.get('action') as 'login' | 'link';

        if (!redirect_uri || !system_id || !action) return null;
        return { redirect_uri, system_id, action };
    }

    setPendingRedirect(params: RedirectParams): void {
        this._pendingRedirect = params;
    }

    getPendingRedirect(): RedirectParams | null {
        return this._pendingRedirect;
    }

    clearPendingRedirect(): void {
        this._pendingRedirect = null;
    }

    hasPendingRedirect(): boolean {
        return !!this._pendingRedirect;
    }

    validateRedirect(params: RedirectParams): Observable<{ redirect_url: string }> {
        return this._http.post<{ redirect_url: string }>(
            `${this.PROFILE_BASE}/redirect/validate`,
            {
                system_id   : params.system_id,
                redirect_uri: params.redirect_uri,
                action      : params.action,
            }
        );
    }

    redirectLink(params: {
        system_id   : string;
        redirect_uri: string;
        username    : string;
        password    : string;
    }): Observable<{ redirect_url: string }> {
        return this._http.post<{ redirect_url: string }>(
            `${this.PROFILE_BASE}/redirect/link`, params
        );
    }

}
