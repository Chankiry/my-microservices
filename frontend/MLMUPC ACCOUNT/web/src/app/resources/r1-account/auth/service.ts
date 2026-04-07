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

    register(payload: RegisterPayload): Observable<any> {
        return this._http.post<any>(`${this.AUTH_BASE}/register`, payload);
    }

    refresh(refresh_token: string): Observable<TokenResponse> {
        return this._http.post<TokenResponse>(`${this.AUTH_BASE}/refresh`, { refresh_token }).pipe(
            tap(res => {
                this._authService.accessToken  = res.access_token;
                this._authService.refreshToken = res.refresh_token;
            }),
        );
    }

    logout(refresh_token?: string): Observable<any> {
        return this._http.post<any>(`${this.AUTH_BASE}/logout`, { refresh_token });
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

    // NOTE: redirect params are read from ActivatedRoute in sign-in component.
    // This method kept for compatibility — returns null.
    readRedirectFromUrl(): RedirectParams | null {
        return null;
    }

    setPendingRedirect(params: RedirectParams): void {
        this._pendingRedirect = params;
    }

    // ─── GET /account/profile/me ─────────────────────────────────────────────
    // Lightweight call — returns user fields + roles[].
    // Used after login to determine navigation target.

    getMe(): Observable<any> {
        return this._http.get<any>(`${this.PROFILE_BASE}/me`);
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

    validateRedirect(params: RedirectParams): Observable<any> {
        return this._http.post<any>(
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
    }): Observable<any> {
        return this._http.post<any>(
            `${this.PROFILE_BASE}/redirect/link`, params
        );
    }

}
