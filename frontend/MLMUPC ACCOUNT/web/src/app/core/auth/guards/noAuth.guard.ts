import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { UserPayload } from 'helper/interfaces/payload.interface';
import { jwtDecode } from 'jwt-decode';

export const NoAuthGuard: CanActivateFn | CanActivateChildFn = (_route, state) => {
    console.log('=== NO AUTH GUARD ===', state.url);

    if (state.url.startsWith('/auth/callback')) {
        console.log('→ allowing callback');
        return of(true);
    }
    const router: Router = inject(Router);
    const authService    = inject(AuthService);

    // Always allow callback route — Keycloak redirects here with ?code=xxx
    // even if a stale token exists in localStorage
    if (state.url.startsWith('/auth/callback')) {
        return of(true);
    }

    const token = authService?.accessToken;
    if (token) {
        const tokenPayload: any = jwtDecode(token);
        if (tokenPayload) {
            return of(router.parseUrl(''));
        }
    }

    // Allow the access
    return of(true);
};
