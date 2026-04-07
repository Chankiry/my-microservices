// ================================================================================>> Main Library
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

// ================================================================================>> Third Party Library
import { forkJoin, map, Observable } from 'rxjs';

// ================================================================================>> Custom Library
// ===>> Env
import { env } from 'envs/env';


@Injectable({ providedIn: 'root' })
export class AdminSystemService {

    private _httpOptions = {
        headers: new HttpHeaders().set('Content-Type', 'application/json'),
    };

    constructor(private _httpClient: HttpClient) {}

    statusData(params?: any): Observable<any>{
        let httpParams = new HttpParams();
        if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
        if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);

        return this._httpClient.get<any>(`${env.API_BASE_URL}/admin/homes`,
            {
                headers: this._httpOptions.headers,
                params: httpParams
            }
        )
    }

}

