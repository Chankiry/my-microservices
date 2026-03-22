import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { env } from 'envs/env';
import { catchError, map, Observable, of, ReplaySubject, switchMap } from 'rxjs';
import { ResponseSignIn, ResponseSingUp, ResponseOTP } from './auth.types';
import { AuthUtils } from './auth.utils';

@Injectable({ providedIn: 'root' })
export class AuthService {

    private _httpClient = inject(HttpClient);
    private _authenticated: boolean = false;
    private _username: ReplaySubject<{ username: string }> = new ReplaySubject<{ username: string }>(1);
    private _token: ReplaySubject<{ token: string }> = new ReplaySubject<{ token: string }>();
    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------
    /**
     * Setter & getter for access token
     */
    set accessToken(access_token: string) {
        if (!access_token || access_token === 'undefined' || access_token === 'null') {
            localStorage.removeItem('accessToken');
        } else {
            localStorage.setItem('accessToken', access_token);
        }
    }

    get accessToken(): string {
        const token = localStorage.getItem('accessToken');

        if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
            localStorage.removeItem('accessToken');
            return '';
        }

        return token;
    }

    set refreshToken(access_token: string) {
        if (!access_token || access_token === 'undefined' || access_token === 'null') {
            localStorage.removeItem('refreshToken');
        } else {
            localStorage.setItem('refreshToken', access_token);
        }
    }

    get refreshToken(): string {
        const token = localStorage.getItem('refreshToken');

        if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
            localStorage.removeItem('refreshToken');
            return '';
        }

        return token;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign in
     *
     * @param credentials
    */
    // Method to sign in a user in the POS system
    signIn(credentials: { username: string; password: string }): Observable<ResponseSignIn> {
        // Set default platform to "Web" if not provided
        const { username, password } = credentials;

        const requestBody = {
            username,
            password,
        };

        return this._httpClient.post<ResponseSignIn>(`${env.API_BASE_URL}/auth/signin`, requestBody).pipe(
            switchMap((response: ResponseSignIn) => {
                // this.accessToken = response.access_token; // Store the access token
                return of(response); // Return the response as a new observable
            }),
        );
    }

    verifyOtp(credentials: { username: string; otp: string }): Observable<ResponseOTP> {

        const { username, otp } = credentials;

        const requestBody = {
            username,
            otp,
            platform: 'Web',
        };
        return this._httpClient.post<ResponseOTP>(`${env.API_BASE_URL}/auth/signin/verify-otp`, requestBody).pipe(
            switchMap((response: ResponseOTP) => {
                this.accessToken = response.access_token; // Store access token from the response
                return of(response); // Return a new observable with the response
            }),
        );
    }

    sendOtp(credentials: { username: string }): Observable<{ status: boolean; message: string }> {
        return this._httpClient
            .post<{ status: boolean; message: string }>(
                `${env.API_BASE_URL}/account/auth/send-otp`,
                credentials
            )
            .pipe(
                switchMap((response) => of(response))
            );
    }

    /**
     * Sign out
     */
    signOut(): Observable<boolean> {
        // Remove the access token from the local storage

        localStorage.removeItem('accessToken');
        // Return the observable
        return of(true);
    }

    // =========== QR CODE SECTION =========

    verified(token: string): void {
        // Store the access token in the local storage
        this.accessToken = token;

        // Set the authenticated flag to true
        this._authenticated = true;
    }

    /**
     * Check the authentication status
     */
    check(): Observable<boolean> {
        console.log('=== CHECK CALLED ===');
        console.log('_authenticated:', this._authenticated);
        console.log('accessToken:', this.accessToken?.substring(0, 30));

        if (this._authenticated) {
            console.log('→ returning true (authenticated)');
            return of(true);
        }

        if (!this.accessToken) {
            console.log('→ returning false (no token)');
            return of(false);
        }

        if (AuthUtils.isTokenExpired(this.accessToken)) {
            console.log('→ returning false (token expired)');
            return of(false);
        }

        console.log('→ returning true (token valid)');
        return of(true);
    }
}
