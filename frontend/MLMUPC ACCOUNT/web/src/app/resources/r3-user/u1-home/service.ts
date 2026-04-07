// ================================================================================>> Main Library
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

// ================================================================================>> Third Party Library
import { forkJoin, map, Observable } from 'rxjs';

// ================================================================================>> Custom Library
// ===>> Env
import { env } from 'envs/env';
import { ConnectPayload, SystemAccess, SystemInfo, UserProfile } from 'app/resources/r1-account/profile/service';


@Injectable({ providedIn: 'root' })
export class UserHomeService {

    private readonly base_url = `${env.API_BASE_URL}/v1/account/profile`;

    constructor(private _http: HttpClient) {}

    getProfile(): Observable<any> {
        return this._http.get<any>(this.base_url);
    }


    updateProfile(payload: Partial<any>): Observable<UserProfile> {
        return this._http.patch<any>(this.base_url, payload);
    }

    changePassword(new_password: string): Observable<any> {
        return this._http.patch<any>(`${this.base_url}/password`, { new_password });
    }

    getAvailableSystems(): Observable<any> {
        return this._http.get<any>(`${this.base_url}/systems/available`);
    }

    connectSystem(payload: ConnectPayload): Observable<any> {
        return this._http.post<any>(`${this.base_url}/systems/connect`, payload);
    }

    disconnectSystem(system_id: string): Observable<any> {
        return this._http.delete<any>(
            `${this.base_url}/systems/${system_id}/disconnect`
        );
    }

    ssoNavigate(system_id: string): Observable<any> {
        return this._http.post<any>(`${this.base_url}/systems/sso-navigate`, { system_id });
    }

}

