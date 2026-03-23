import { HttpClient }   from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@ngneat/transloco';
import { Observable, catchError, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
    private _httpClient = inject(HttpClient);

    getTranslation(lang: string): Observable<Translation> {
        return this._httpClient
            .get<Translation>(`./i18n/${lang}.json`)
            .pipe(
                catchError(() => of({} as Translation))
            );
    }
}
