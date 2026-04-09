import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { env } from 'envs/env';
import { BehaviorSubject, catchError, Observable, of, switchMap, throwError } from 'rxjs';
import { List, PasswordReq, ProfileUpdate, ResponseProfile } from './profile.type';

@Injectable({
    providedIn: 'root',
})
export class ProfileService {

    private readonly baseUrl: string = env.API_BASE_URL; // Base URL from environment
    private readonly httpOptions = {
        headers: new HttpHeaders().set('Content-Type', 'application/json'),
    };

    constructor(private http: HttpClient) { }

    // Update profile endpoint
    profile(body: ProfileUpdate): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/account/profile/update/me`, body, this.httpOptions);
    }

    // Update password endpoint
    updatePassword(body: PasswordReq): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/account/profile/my-profile/change-password/me`, body, this.httpOptions);
    }

    list(params?: {
        page: number;
        page_size: number;
    }): Observable<List> {
        // Filter out null or undefined parameters
        const filteredParams: { [key: string]: any } = {};
        Object.keys(params || {}).forEach(key => {
            if (params![key] !== null && params![key] !== undefined) {
                filteredParams[key] = params![key];
            }
        });

        return this.http.get<List>(`${env.API_BASE_URL}/account/profile/logs`, { params: filteredParams }).pipe(
            switchMap((response: List) => of(response)),
            catchError((error: HttpErrorResponse) => {
                // Rethrow the error while maintaining the Observable<List> type
                return throwError(() => error);
            })
        );
    }
}
