import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { Observable, catchError, throwError } from 'rxjs';

export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    let newReq = req.clone();

    if (
        authService.accessToken &&
        !AuthUtils.isTokenExpired(authService.accessToken)
    ) {
        newReq = req.clone({
            headers: req.headers.set(
                'Authorization',
                'Bearer ' + authService.accessToken
            ),
        });
    }

    return next(newReq).pipe(
        catchError((error) => {
            if (req.url.includes('/verify-otp')) {
                return throwError(error);
            }

            if (error instanceof HttpErrorResponse && error.status === 401) {
                console.log('=== 401 INTERCEPTED ===');
                console.log('URL:', req.url);
                console.log('Token:', authService.accessToken?.substring(0, 50));

                const token = authService.accessToken;
                if (token) {
                    try {
                        const parts = token.split('.');
                        if (parts.length === 3) {
                            const payload = JSON.parse(atob(parts[1]));
                            console.log('ISS:', payload?.iss);
                            console.log('Contains realms:', payload?.iss?.includes('realms'));
                        }
                    } catch(e) {
                        console.log('Decode error:', e);
                    }
                }
            }

            return throwError(error);
        })
    );
};
